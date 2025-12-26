import redis from 'redis';

/**
 * Redis 缓存管理器
 * 处理排行榜、玩家数据、会话缓存等
 */
export class RedisManager {
  private static instance: RedisManager;
  private client: redis.RedisClient | null = null;
  private connected: boolean = false;

  private constructor() {}

  static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  /**
   * 初始化 Redis 连接
   */
  async connect(): Promise<void> {
    if (this.connected && this.client) {
      console.log('✓ Redis already connected');
      return;
    }

    try {
      const redisPort = parseInt(process.env.REDIS_PORT || '6379');
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPassword = process.env.REDIS_PASSWORD || undefined;

      this.client = redis.createClient({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        retryStrategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            return new Error('Redis 连接被拒绝');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Redis 重试超时');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      // 连接事件处理
      this.client.on('connect', () => {
        this.connected = true;
        console.log('🟢 Redis connected successfully');
      });

      this.client.on('error', (err: any) => {
        console.error('❌ Redis error:', err.message);
        this.connected = false;
      });

      this.client.on('close', () => {
        console.log('🔴 Redis disconnected');
        this.connected = false;
      });

      // 等待连接完成
      await new Promise<void>((resolve, reject) => {
        if (!this.client) {
          reject(new Error('Redis client not initialized'));
          return;
        }
        
        const timeout = setTimeout(() => {
          reject(new Error('Redis connection timeout'));
        }, 5000);

        this.client!.once('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.client!.once('error', (err: any) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
    } catch (error: any) {
      console.error('⚠️  Redis 连接失败，将使用内存缓存:', error.message);
      this.connected = false;
      // 不抛出异常，允许系统继续运行
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await new Promise<void>((resolve) => {
        this.client!.quit(() => {
          this.connected = false;
          resolve();
        });
      });
    }
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.connected || !this.client) {
      return null;
    }

    try {
      return await new Promise((resolve, reject) => {
        this.client!.get(key, (err, data) => {
          if (err) reject(err);
          if (!data) {
            resolve(null);
          } else {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(data as T);
            }
          }
        });
      });
    } catch (error: any) {
      console.error(`❌ Redis get error for key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  async set<T>(key: string, value: T, expirationMs: number = 0): Promise<void> {
    if (!this.connected || !this.client) {
      return;
    }

    try {
      const jsonValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      if (expirationMs > 0) {
        const expirationSeconds = Math.ceil(expirationMs / 1000);
        await new Promise<void>((resolve, reject) => {
          this.client!.setex(key, expirationSeconds, jsonValue, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } else {
        await new Promise<void>((resolve, reject) => {
          this.client!.set(key, jsonValue, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    } catch (error: any) {
      console.error(`❌ Redis set error for key ${key}:`, error.message);
    }
  }

  /**
   * 删除缓存值
   */
  async delete(key: string): Promise<void> {
    if (!this.connected || !this.client) {
      return;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        this.client!.del(key, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (error: any) {
      console.error(`❌ Redis delete error for key ${key}:`, error.message);
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    if (!this.connected || !this.client) {
      return false;
    }

    try {
      return await new Promise((resolve, reject) => {
        this.client!.exists(key, (err, exists) => {
          if (err) reject(err);
          else resolve(exists === 1);
        });
      });
    } catch (error: any) {
      console.error(`❌ Redis exists error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * 获取过期时间（秒）
   */
  async ttl(key: string): Promise<number> {
    if (!this.connected || !this.client) {
      return -1;
    }

    try {
      return await new Promise((resolve, reject) => {
        this.client!.ttl(key, (err, ttl) => {
          if (err) reject(err);
          else resolve(ttl);
        });
      });
    } catch (error: any) {
      console.error(`❌ Redis ttl error for key ${key}:`, error.message);
      return -1;
    }
  }

  /**
   * 清空所有缓存
   */
  async flushAll(): Promise<void> {
    if (!this.connected || !this.client) {
      return;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        this.client!.flushall((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (error: any) {
      console.error('❌ Redis flushAll error:', error.message);
    }
  }

  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * 获取连接统计信息
   */
  async getStats(): Promise<Record<string, any>> {
    if (!this.connected || !this.client) {
      return { connected: false };
    }

    try {
      const info = await new Promise<string>((resolve, reject) => {
        this.client!.info((err, info) => {
          if (err) reject(err);
          else resolve(info);
        });
      });

      // 解析 Redis info 响应
      const stats: Record<string, any> = { connected: true };
      info.split('\r\n').forEach((line: string) => {
        if (line && !line.startsWith('#')) {
          const [key, value] = line.split(':');
          if (key && value) {
            stats[key] = isNaN(Number(value)) ? value : Number(value);
          }
        }
      });
      return stats;
    } catch (error: any) {
      console.error('❌ Redis getStats error:', error.message);
      return { connected: false };
    }
  }
}

export default RedisManager.getInstance();
