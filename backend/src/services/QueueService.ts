import redis from 'redis';
import { v4 as uuid } from 'uuid';

/**
 * Redis Stream 队列服务
 * 轻量级异步处理，无需外部消息队列依赖
 */

enum QueueType {
  SCORE_SUBMISSION = 'queue:scores',        // 分数提交（关键）
  RESCUE_REQUEST = 'queue:rescues',         // 救援请求（重要）
  DATA_SYNC = 'queue:syncs',                // 数据同步（辅助）
  NOTIFICATION = 'queue:notifications',     // 通知发送（异步）
  CLEANUP = 'queue:cleanup'                 // 清理任务（后台）
}

enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  RETRYING = 'retrying'
}

interface QueueMessage {
  id: string;
  type: QueueType;
  payload: Record<string, any>;
  status: JobStatus;
  retries: number;
  maxRetries: number;
  createdAt: number;
  processedAt?: number;
  error?: string;
}

interface ConsumerConfig {
  queueType: QueueType;
  batchSize?: number;
  processingFn: (message: QueueMessage) => Promise<void>;
}

/**
 * 队列服务主类
 */
export class QueueService {
  private static instance: QueueService;
  private client: redis.RedisClient;
  private consumers: Map<QueueType, ConsumerConfig> = new Map();
  private isRunning: boolean = false;

  private constructor(client: redis.RedisClient) {
    this.client = client;
  }

  static initialize(client: redis.RedisClient): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService(client);
    }
    return QueueService.instance;
  }

  static getInstance(): QueueService {
    if (!QueueService.instance) {
      throw new Error('QueueService not initialized. Call initialize() first.');
    }
    return QueueService.instance;
  }

  /**
   * 向队列添加消息
   */
  async enqueue(queueType: QueueType, payload: Record<string, any>, delayMs: number = 0): Promise<string> {
    const messageId = uuid();
    const message: QueueMessage = {
      id: messageId,
      type: queueType,
      payload,
      status: JobStatus.PENDING,
      retries: 0,
      maxRetries: 3,
      createdAt: Date.now()
    };

    try {
      // 存储到 Redis Stream
      await new Promise<void>((resolve, reject) => {
        this.client.xadd(
          queueType,
          '*',
          {
            id: messageId,
            payload: JSON.stringify(payload),
            status: JobStatus.PENDING,
            retries: '0',
            maxRetries: '3',
            createdAt: Date.now().toString(),
            delayMs: delayMs.toString()
          },
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      console.log(`✓ Message enqueued: ${messageId} to ${queueType}`);
      return messageId;
    } catch (error: any) {
      console.error(`❌ Failed to enqueue message:`, error);
      throw error;
    }
  }

  /**
   * 注册消费者
   */
  registerConsumer(config: ConsumerConfig): void {
    this.consumers.set(config.queueType, {
      ...config,
      batchSize: config.batchSize || 10
    });

    console.log(`✓ Consumer registered for ${config.queueType}`);
  }

  /**
   * 启动所有消费者
   */
  async startConsumers(): Promise<void> {
    if (this.isRunning) {
      console.warn('⚠️  Consumers already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting queue consumers...');

    // 为每个注册的消费者启动处理循环
    for (const [queueType, config] of this.consumers) {
      this.startConsumer(queueType, config);
    }
  }

  /**
   * 启动单个消费者
   */
  private startConsumer(queueType: QueueType, config: ConsumerConfig): void {
    // 使用消费者组实现至少一次交付保证
    const groupName = `group:${queueType}`;
    const consumerName = `consumer:${uuid()}`;

    // 每秒检查一次新消息
    const processingLoop = setInterval(async () => {
      try {
        // 获取待处理消息
        const messages = await this.readMessages(queueType, groupName, consumerName, config.batchSize || 10);

        for (const msg of messages) {
          try {
            const parsed = this.parseMessage(msg);
            
            // 执行消费逻辑
            await config.processingFn(parsed);
            
            // 确认消息（从待处理列表移除）
            await this.acknowledgeMessage(queueType, groupName, msg.id);
            
            console.log(`✓ Message processed: ${msg.id}`);
          } catch (error: any) {
            // 处理失败，尝试重试
            await this.retryMessage(queueType, msg, error);
          }
        }
      } catch (error: any) {
        console.error(`❌ Consumer error for ${queueType}:`, error.message);
      }
    }, 1000);  // 每秒轮询一次
  }

  /**
   * 读取消息
   */
  private async readMessages(
    queueType: QueueType,
    groupName: string,
    consumerName: string,
    batchSize: number
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      // 使用 XREADGROUP 读取消费者组中的消息
      this.client.xreadgroup(
        'GROUP',
        groupName,
        consumerName,
        'STREAMS',
        queueType,
        '>',  // 只读取新消息
        'COUNT',
        batchSize.toString(),
        (err, messages) => {
          if (err) reject(err);
          else resolve(messages?.[0]?.[1] || []);
        }
      );
    });
  }

  /**
   * 确认消息处理完成
   */
  private async acknowledgeMessage(queueType: QueueType, groupName: string, messageId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.xack(queueType, groupName, messageId, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * 重试消息
   */
  private async retryMessage(queueType: QueueType, message: any, error: any): Promise<void> {
    const parsed = this.parseMessage(message);
    
    if (parsed.retries < parsed.maxRetries) {
      // 重新入队，增加重试计数
      const delayMs = Math.pow(2, parsed.retries) * 1000;  // 指数退避：1s, 2s, 4s
      
      parsed.retries++;
      parsed.status = JobStatus.RETRYING;
      parsed.error = error.message;

      await this.enqueue(queueType, parsed.payload, delayMs);
      console.log(`⚠️  Message retried: ${message.id} (attempt ${parsed.retries}/${parsed.maxRetries})`);
    } else {
      // 超过最大重试次数，进入死信队列
      await this.moveToDeadLetterQueue(queueType, parsed, error);
      console.error(`💀 Message moved to DLQ: ${message.id} after ${parsed.maxRetries} retries`);
    }
  }

  /**
   * 死信队列
   */
  private async moveToDeadLetterQueue(queueType: QueueType, message: QueueMessage, error: any): Promise<void> {
    const dlqKey = `dlq:${queueType}`;
    
    return new Promise((resolve, reject) => {
      this.client.lpush(
        dlqKey,
        JSON.stringify({
          ...message,
          status: JobStatus.FAILED,
          error: error.message,
          failedAt: Date.now()
        }),
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * 解析消息
   */
  private parseMessage(redisMessage: any): QueueMessage {
    const [id, data] = redisMessage;
    
    return {
      id,
      type: data.type as QueueType,
      payload: JSON.parse(data.payload),
      status: data.status as JobStatus,
      retries: parseInt(data.retries),
      maxRetries: parseInt(data.maxRetries),
      createdAt: parseInt(data.createdAt),
      error: data.error
    };
  }

  /**
   * 获取队列统计信息
   */
  async getQueueStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};

    for (const queueType of Object.values(QueueType)) {
      const length = await new Promise<number>((resolve, reject) => {
        this.client.xlen(queueType, (err, len) => {
          if (err) reject(err);
          else resolve(len || 0);
        });
      });

      const dlqLength = await new Promise<number>((resolve, reject) => {
        this.client.llen(`dlq:${queueType}`, (err, len) => {
          if (err) reject(err);
          else resolve(len || 0);
        });
      });

      stats[queueType] = {
        length,
        dlqLength,
        activeConsumers: this.consumers.has(queueType) ? 1 : 0
      };
    }

    return stats;
  }

  /**
   * 清空队列（开发用）
   */
  async clearQueue(queueType?: QueueType): Promise<void> {
    if (queueType) {
      return new Promise((resolve, reject) => {
        this.client.del(queueType, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // 清空所有队列
    for (const type of Object.values(QueueType)) {
      await new Promise<void>((resolve, reject) => {
        this.client.del(type, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  /**
   * 停止消费者
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('⏹️  Queue consumers stopped');
  }
}

export { QueueType, JobStatus, QueueMessage, ConsumerConfig };
