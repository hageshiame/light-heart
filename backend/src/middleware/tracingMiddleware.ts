import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { loggingService } from '../services/LoggingService';

/**
 * 追踪上下文接口
 */
export interface TraceContext {
  traceId: string;           // 全局追踪 ID
  spanId: string;            // 当前 Span ID
  parentSpanId?: string;     // 父 Span ID
  userId?: string;           // 用户 ID
  startTime: number;         // 开始时间戳
  tags: Map<string, any>;    // 追踪标签
}

/**
 * 追踪数据存储（使用 AsyncLocalStorage 实现）
 */
class TraceContextStorage {
  private storage: Map<string, TraceContext> = new Map();
  
  set(traceId: string, context: TraceContext): void {
    this.storage.set(traceId, context);
  }

  get(traceId: string): TraceContext | undefined {
    return this.storage.get(traceId);
  }

  delete(traceId: string): void {
    this.storage.delete(traceId);
  }
}

const traceStorage = new TraceContextStorage();

/**
 * 链路追踪中间件
 * 
 * 为每个请求生成唯一的 traceId，记录请求的生命周期
 * 支持分布式追踪和性能分析
 */
export function tracingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // 生成或获取 traceId
    const traceId = req.headers['x-trace-id'] as string || uuidv4();
    const spanId = uuidv4();
    const parentSpanId = req.headers['x-span-id'] as string;

    // 创建追踪上下文
    const traceContext: TraceContext = {
      traceId,
      spanId,
      parentSpanId,
      userId: (req as any).userId,
      startTime: Date.now(),
      tags: new Map()
    };

    // 存储追踪上下文
    traceStorage.set(traceId, traceContext);

    // 添加追踪信息到响应头
    res.setHeader('x-trace-id', traceId);
    res.setHeader('x-span-id', spanId);

    // 捕获原始的 res.json 和 res.end
    const originalJson = res.json.bind(res);
    const originalEnd = res.end.bind(res);

    let responseBody: any = null;

    res.json = function(data: any) {
      responseBody = data;
      return originalJson(data);
    };

    res.end = function(...args: any[]) {
      const duration = Date.now() - traceContext.startTime;

      // 记录请求追踪信息
      loggingService.logRequest(
        req.method,
        req.path,
        res.statusCode,
        duration,
        traceContext.userId,
        {
          traceId,
          spanId,
          parentSpanId,
          query: req.query,
          body: req.body,
          responseBody,
          tags: Object.fromEntries(traceContext.tags),
          userAgent: req.get('user-agent'),
          remoteIp: req.ip,
          protocol: req.protocol
        }
      );

      // 清理追踪上下文
      traceStorage.delete(traceId);

      return originalEnd(...args);
    };

    // 将追踪上下文附加到请求对象
    (req as any).traceContext = traceContext;
    (req as any).traceId = traceId;
    (req as any).spanId = spanId;

    next();
  };
}

/**
 * 获取当前追踪上下文
 */
export function getTraceContext(traceId: string): TraceContext | undefined {
  return traceStorage.get(traceId);
}

/**
 * 添加追踪标签
 */
export function addTraceTag(traceId: string, key: string, value: any): void {
  const context = traceStorage.get(traceId);
  if (context) {
    context.tags.set(key, value);
  }
}

/**
 * 性能监控装饰器
 * 用于在函数执行时记录性能指标
 */
export function TraceOperation(operationName: string, threshold?: number) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const startTime = Date.now();
      const spanId = uuidv4();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        loggingService.logPerformance(operationName, duration, threshold, {
          spanId,
          method: propertyKey,
          success: true
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        loggingService.error(
          `Operation failed: ${operationName}`,
          error,
          {
            spanId,
            method: propertyKey,
            duration
          }
        );

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * 异步操作追踪
 */
export async function traceAsync<T>(
  operationName: string,
  fn: () => Promise<T>,
  threshold?: number
): Promise<T> {
  const startTime = Date.now();
  const spanId = uuidv4();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    loggingService.logPerformance(operationName, duration, threshold, {
      spanId,
      success: true
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    loggingService.error(
      `Async operation failed: ${operationName}`,
      error,
      {
        spanId,
        duration
      }
    );

    throw error;
  }
}

/**
 * 同步操作追踪
 */
export function traceSync<T>(
  operationName: string,
  fn: () => T,
  threshold?: number
): T {
  const startTime = Date.now();
  const spanId = uuidv4();

  try {
    const result = fn();
    const duration = Date.now() - startTime;

    loggingService.logPerformance(operationName, duration, threshold, {
      spanId,
      success: true
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    loggingService.error(
      `Sync operation failed: ${operationName}`,
      error,
      {
        spanId,
        duration
      }
    );

    throw error;
  }
}

/**
 * 错误追踪中间件
 * 捕获未处理的错误并记录追踪信息
 */
export function errorTracingMiddleware() {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    const traceId = res.getHeader('x-trace-id') as string || uuidv4();
    const spanId = res.getHeader('x-span-id') as string || uuidv4();

    loggingService.error(
      `Request failed: ${err.message}`,
      err,
      {
        traceId,
        spanId,
        method: req.method,
        path: req.path,
        userId: (req as any).userId,
        query: req.query,
        body: req.body
      }
    );

    // 记录异常信息
    if (err.message.includes('timeout')) {
      loggingService.logAnomaly(
        'REQUEST_TIMEOUT',
        'high',
        `Request ${req.method} ${req.path} timed out`,
        { traceId, spanId }
      );
    } else if (res.statusCode >= 500) {
      loggingService.logAnomaly(
        'SERVER_ERROR',
        'critical',
        `Server error: ${err.message}`,
        { traceId, spanId, statusCode: res.statusCode }
      );
    }

    // 返回错误响应
    res.status(res.statusCode || 500).json({
      success: false,
      error: err.message,
      traceId,
      spanId,
      timestamp: new Date().toISOString()
    });
  };
}

/**
 * 请求验证追踪
 */
export function validateAndTrace(
  validator: (req: Request) => boolean | string
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const traceId = (req as any).traceId || uuidv4();
    const spanId = (req as any).spanId || uuidv4();

    const validation = validator(req);
    
    if (validation !== true) {
      loggingService.logAnomaly(
        'VALIDATION_FAILED',
        'medium',
        validation as string,
        {
          traceId,
          spanId,
          method: req.method,
          path: req.path,
          body: req.body
        }
      );

      return res.status(400).json({
        success: false,
        error: validation,
        traceId,
        spanId
      });
    }

    next();
  };
}

export default tracingMiddleware;
