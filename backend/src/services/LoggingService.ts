import * as fs from 'fs';
import * as path from 'path';
import winston from 'winston';
import 'winston-daily-rotate-file';

/**
 * 日志服务
 * 
 * 提供结构化日志记录、日志聚合、日志分析功能
 * 支持多个 Transport（文件、控制台、远程）
 */
export class LoggingService {
  
  private static instance: LoggingService;
  private logger: winston.Logger;
  private logDir: string = path.join(process.cwd(), 'logs');

  private constructor() {
    this.ensureLogDir();
    this.initializeLogger();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDir(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * 初始化 Winston Logger
   */
  private initializeLogger(): void {
    const isDevelopment = process.env.NODE_ENV !== 'production';

    const transports: winston.transport[] = [];

    // 控制台输出（开发环境）
    if (isDevelopment) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
              return `${timestamp} [${level}] ${message} ${metaStr}`;
            })
          )
        })
      );
    }

    // 错误日志文件（每日轮转）
    transports.push(
      new (require('winston-daily-rotate-file'))({
        filename: path.join(this.logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxDays: '14d',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      })
    );

    // 应用日志文件（每日轮转）
    transports.push(
      new (require('winston-daily-rotate-file'))({
        filename: path.join(this.logDir, 'app-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxDays: '7d',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.json()
        )
      })
    );

    // 请求日志文件（每日轮转）
    transports.push(
      new (require('winston-daily-rotate-file'))({
        filename: path.join(this.logDir, 'request-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '50m',
        maxDays: '3d',
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.json()
        )
      })
    );

    // 性能日志文件（每日轮转）
    transports.push(
      new (require('winston-daily-rotate-file'))({
        filename: path.join(this.logDir, 'performance-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '30m',
        maxDays: '7d',
        level: 'debug',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.json()
        )
      })
    );

    this.logger = winston.createLogger({
      level: isDevelopment ? 'debug' : 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports
    });
  }

  /**
   * 记录一般信息
   */
  info(message: string, meta?: any): void {
    this.logger.info(message, meta || {});
  }

  /**
   * 记录警告信息
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta || {});
  }

  /**
   * 记录错误信息
   */
  error(message: string, error?: Error | any, meta?: any): void {
    if (error instanceof Error) {
      this.logger.error(message, {
        error: error.message,
        stack: error.stack,
        ...meta
      });
    } else {
      this.logger.error(message, { error, ...meta });
    }
  }

  /**
   * 记录调试信息
   */
  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta || {});
  }

  /**
   * 记录请求日志
   */
  logRequest(
    method: string,
    path: string,
    statusCode: number,
    responseTime: number,
    userId?: string,
    meta?: any
  ): void {
    this.logger.info('HTTP_REQUEST', {
      method,
      path,
      statusCode,
      responseTime,
      userId,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  /**
   * 记录 API 调用
   */
  logAPI(
    apiName: string,
    method: string,
    endpoint: string,
    statusCode: number,
    responseTime: number,
    userId?: string,
    request?: any,
    response?: any
  ): void {
    this.logger.info('API_CALL', {
      apiName,
      method,
      endpoint,
      statusCode,
      responseTime,
      userId,
      requestSize: JSON.stringify(request).length,
      responseSize: JSON.stringify(response).length,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录数据库操作
   */
  logDatabase(
    operation: string,
    table: string,
    duration: number,
    success: boolean,
    error?: string,
    meta?: any
  ): void {
    this.logger.debug('DATABASE_OPERATION', {
      operation,
      table,
      duration,
      success,
      error,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  /**
   * 记录缓存操作
   */
  logCache(
    operation: string,
    key: string,
    hit: boolean,
    duration: number,
    meta?: any
  ): void {
    this.logger.debug('CACHE_OPERATION', {
      operation,
      key,
      hit,
      duration,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  /**
   * 记录认证事件
   */
  logAuth(
    event: 'login' | 'logout' | 'token_refresh' | 'auth_failed',
    userId: string,
    success: boolean,
    meta?: any
  ): void {
    this.logger.info('AUTH_EVENT', {
      event,
      userId,
      success,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  /**
   * 记录业务事件
   */
  logBusiness(
    eventType: string,
    userId: string,
    action: string,
    result: 'success' | 'failure',
    meta?: any
  ): void {
    this.logger.info('BUSINESS_EVENT', {
      eventType,
      userId,
      action,
      result,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  /**
   * 记录性能监控
   */
  logPerformance(
    operation: string,
    duration: number,
    threshold?: number,
    meta?: any
  ): void {
    const level = threshold && duration > threshold ? 'warn' : 'debug';
    this.logger[level]('PERFORMANCE_METRIC', {
      operation,
      duration,
      exceeded: threshold ? duration > threshold : false,
      threshold,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  /**
   * 记录异常检测
   */
  logAnomaly(
    anomalyType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    meta?: any
  ): void {
    const levelMap = {
      low: 'info',
      medium: 'warn',
      high: 'error',
      critical: 'error'
    };

    this.logger[levelMap[severity]]('ANOMALY_DETECTED', {
      anomalyType,
      severity,
      description,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  /**
   * 记录队列操作
   */
  logQueue(
    queueName: string,
    operation: string,
    messageId: string,
    duration: number,
    success: boolean,
    error?: string,
    meta?: any
  ): void {
    this.logger.debug('QUEUE_OPERATION', {
      queueName,
      operation,
      messageId,
      duration,
      success,
      error,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  /**
   * 记录游戏事件
   */
  logGameEvent(
    eventType: string,
    playerId: string,
    action: string,
    result: 'success' | 'failure',
    data?: any,
    meta?: any
  ): void {
    this.logger.info('GAME_EVENT', {
      eventType,
      playerId,
      action,
      result,
      data,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  /**
   * 获取日志统计信息
   */
  getLogStats(): { directory: string; diskUsage: number; fileCount: number } {
    let diskUsage = 0;
    let fileCount = 0;

    if (fs.existsSync(this.logDir)) {
      const files = fs.readdirSync(this.logDir);
      fileCount = files.length;

      files.forEach(file => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        diskUsage += stats.size;
      });
    }

    return {
      directory: this.logDir,
      diskUsage: Math.round(diskUsage / 1024 / 1024 * 100) / 100, // MB
      fileCount
    };
  }

  /**
   * 清理过期日志
   */
  cleanupOldLogs(daysRetain: number = 30): { deleted: number; freedSpace: number } {
    let deleted = 0;
    let freedSpace = 0;

    if (!fs.existsSync(this.logDir)) {
      return { deleted, freedSpace };
    }

    const files = fs.readdirSync(this.logDir);
    const now = Date.now();
    const daysMs = daysRetain * 24 * 60 * 60 * 1000;

    files.forEach(file => {
      const filePath = path.join(this.logDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > daysMs) {
        try {
          freedSpace += stats.size;
          fs.unlinkSync(filePath);
          deleted++;
        } catch (err) {
          this.error('Failed to delete log file', err, { file });
        }
      }
    });

    return {
      deleted,
      freedSpace: Math.round(freedSpace / 1024 / 1024 * 100) / 100 // MB
    };
  }
}

// 导出单例实例，供全局使用
export const loggingService = LoggingService.getInstance();
