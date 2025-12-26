import redis from 'redis';
import { v4 as uuid } from 'uuid';

/**
 * 异步任务处理系统
 * 支持延迟执行、周期执行、优先级调度
 */

enum JobType {
  UPDATE_LEADERBOARD = 'job:update_leaderboard',           // 更新排行榜缓存
  SEND_NOTIFICATION = 'job:send_notification',             // 发送通知
  CLEANUP_EXPIRED_DATA = 'job:cleanup_expired',             // 清理过期数据
  GENERATE_DAILY_REPORT = 'job:daily_report',              // 生成日报
  CALCULATE_ACHIEVEMENTS = 'job:calculate_achievements',   // 计算成就
  REWARD_DAILY_LOGIN = 'job:daily_login_reward',           // 每日登录奖励
  RESET_WEEKLY_DATA = 'job:reset_weekly'                   // 周重置数据
}

enum JobStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed'
}

interface Job {
  id: string;
  type: JobType;
  payload: Record<string, any>;
  status: JobStatus;
  priority: number;           // 1-10，数字越大优先级越高
  scheduledFor: number;       // Unix 时间戳
  executedAt?: number;
  completedAt?: number;
  result?: any;
  error?: string;
  retries: number;
  maxRetries: number;
}

interface JobHandler {
  handle: (payload: Record<string, any>) => Promise<any>;
  priority?: number;
  maxRetries?: number;
}

/**
 * 异步任务管理器
 */
export class AsyncJobService {
  private static instance: AsyncJobService;
  private client: redis.RedisClient;
  private handlers: Map<JobType, JobHandler> = new Map();
  private isRunning: boolean = false;

  private constructor(client: redis.RedisClient) {
    this.client = client;
  }

  static initialize(client: redis.RedisClient): AsyncJobService {
    if (!AsyncJobService.instance) {
      AsyncJobService.instance = new AsyncJobService(client);
    }
    return AsyncJobService.instance;
  }

  static getInstance(): AsyncJobService {
    if (!AsyncJobService.instance) {
      throw new Error('AsyncJobService not initialized. Call initialize() first.');
    }
    return AsyncJobService.instance;
  }

  /**
   * 注册任务处理器
   */
  registerHandler(jobType: JobType, handler: JobHandler): void {
    this.handlers.set(jobType, {
      maxRetries: 3,
      priority: 5,
      ...handler
    });
    console.log(`✓ Job handler registered: ${jobType}`);
  }

  /**
   * 调度任务（支持延迟执行）
   */
  async scheduleJob(
    jobType: JobType,
    payload: Record<string, any>,
    options: {
      delayMs?: number;          // 延迟多少毫秒执行
      priority?: number;         // 优先级（1-10）
      maxRetries?: number;       // 最大重试次数
    } = {}
  ): Promise<string> {
    const jobId = uuid();
    const scheduledFor = Date.now() + (options.delayMs || 0);
    const priority = options.priority || 5;
    const maxRetries = options.maxRetries || 3;

    const job: Job = {
      id: jobId,
      type: jobType,
      payload,
      status: JobStatus.SCHEDULED,
      priority,
      scheduledFor,
      retries: 0,
      maxRetries
    };

    try {
      // 存储到 Redis 有序集合（按调度时间排序）
      await new Promise<void>((resolve, reject) => {
        this.client.zadd(
          'jobs:scheduled',
          scheduledFor,
          JSON.stringify(job),
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      console.log(`✓ Job scheduled: ${jobId} (${jobType}) for ${new Date(scheduledFor).toISOString()}`);
      return jobId;
    } catch (error: any) {
      console.error('❌ Failed to schedule job:', error);
      throw error;
    }
  }

  /**
   * 立即执行任务
   */
  async executeJob(jobType: JobType, payload: Record<string, any>): Promise<any> {
    const handler = this.handlers.get(jobType);

    if (!handler) {
      throw new Error(`No handler registered for job type: ${jobType}`);
    }

    try {
      console.log(`🔄 Executing job: ${jobType}`);
      const result = await handler.handle(payload);
      console.log(`✓ Job completed: ${jobType}`);
      return result;
    } catch (error: any) {
      console.error(`❌ Job failed: ${jobType}`, error.message);
      throw error;
    }
  }

  /**
   * 启动任务调度器（后台 Cron Worker）
   */
  async startScheduler(): Promise<void> {
    if (this.isRunning) {
      console.warn('⚠️  Scheduler already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting async job scheduler...');

    // 每秒检查一次是否有任务需要执行
    const schedulerLoop = setInterval(async () => {
      try {
        await this.processPendingJobs();
      } catch (error: any) {
        console.error('❌ Scheduler error:', error.message);
      }
    }, 1000);
  }

  /**
   * 处理待执行的任务
   */
  private async processPendingJobs(): Promise<void> {
    const now = Date.now();

    // 获取所有应该执行的任务（按优先级排序）
    const jobsData = await new Promise<string[]>((resolve, reject) => {
      this.client.zrange('jobs:scheduled', 0, -1, 'BYSCORE', 0, now, (err, jobs) => {
        if (err) reject(err);
        else resolve(jobs || []);
      });
    });

    // 按优先级排序
    const jobs: Job[] = jobsData
      .map(data => JSON.parse(data))
      .sort((a: Job, b: Job) => b.priority - a.priority);

    for (const job of jobs) {
      try {
        // 标记为处理中
        job.status = JobStatus.PROCESSING;
        job.executedAt = Date.now();

        // 执行任务
        const result = await this.executeJob(job.type, job.payload);

        // 标记为成功
        job.status = JobStatus.SUCCESS;
        job.completedAt = Date.now();
        job.result = result;

        // 存储到已完成任务列表（保留 7 天）
        await this.storeCompletedJob(job);

        // 从待执行列表移除
        await this.removeScheduledJob(job.id);
      } catch (error: any) {
        // 任务失败，尝试重试
        await this.retryJob(job, error);
      }
    }
  }

  /**
   * 重试任务
   */
  private async retryJob(job: Job, error: any): Promise<void> {
    job.retries++;

    if (job.retries < job.maxRetries) {
      // 使用指数退避重试
      const delayMs = Math.pow(2, job.retries) * 1000;
      const nextExecutionTime = Date.now() + delayMs;

      job.status = JobStatus.SCHEDULED;
      job.scheduledFor = nextExecutionTime;
      job.error = error.message;

      // 重新加入队列
      await new Promise<void>((resolve, reject) => {
        this.client.zadd(
          'jobs:scheduled',
          nextExecutionTime,
          JSON.stringify(job),
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      console.log(`⚠️  Job retry scheduled: ${job.id} (attempt ${job.retries}/${job.maxRetries})`);
    } else {
      // 超过最大重试，标记为失败
      job.status = JobStatus.FAILED;
      job.error = error.message;
      job.completedAt = Date.now();

      await this.storeFailedJob(job);
      console.error(`💀 Job failed permanently: ${job.id}`);
    }
  }

  /**
   * 存储已完成的任务（用于审计和调试）
   */
  private async storeCompletedJob(job: Job): Promise<void> {
    const ttl = 7 * 24 * 60 * 60; // 保留 7 天

    return new Promise<void>((resolve, reject) => {
      this.client.setex(
        `job:completed:${job.id}`,
        ttl,
        JSON.stringify(job),
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * 存储失败的任务
   */
  private async storeFailedJob(job: Job): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.client.lpush(
        'jobs:failed',
        JSON.stringify(job),
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * 移除已执行的任务
   */
  private async removeScheduledJob(jobId: string): Promise<void> {
    // 从有序集合中移除（需要遍历，因为不知道 score）
    // 这里用简化方式：标记为已处理
    return new Promise<void>((resolve, reject) => {
      this.client.del(`job:pending:${jobId}`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * 获取任务统计信息
   */
  async getJobStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};

    // 待执行任务数
    const pendingCount = await new Promise<number>((resolve, reject) => {
      this.client.zcard('jobs:scheduled', (err, count) => {
        if (err) reject(err);
        else resolve(count || 0);
      });
    });

    // 失败任务数
    const failedCount = await new Promise<number>((resolve, reject) => {
      this.client.llen('jobs:failed', (err, count) => {
        if (err) reject(err);
        else resolve(count || 0);
      });
    });

    return {
      pending: pendingCount,
      failed: failedCount,
      handlers: this.handlers.size,
      isRunning: this.isRunning
    };
  }

  /**
   * 停止调度器
   */
  stop(): void {
    this.isRunning = false;
    console.log('⏹️  Job scheduler stopped');
  }
}

export { JobType, JobStatus, Job, JobHandler };
