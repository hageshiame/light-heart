/**
 * Rate Limiting Middleware
 * 防止 API 滥用，基于 IP 或玩家 ID 的限制
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

/**
 * 内存中的速率限制存储（生产环境应使用 Redis）
 */
class RateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  /**
   * 检查是否超过限制
   */
  check(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      // 创建新的记录
      this.store.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return true;
    }

    // 检查是否超过限制
    if (record.count < limit) {
      record.count++;
      return true;
    }

    return false;
  }

  /**
   * 获取剩余请求数
   */
  getRemaining(key: string, limit: number): number {
    const record = this.store.get(key);
    if (!record || Date.now() > record.resetTime) {
      return limit;
    }
    return Math.max(0, limit - record.count);
  }

  /**
   * 获取重置时间
   */
  getResetTime(key: string): number {
    const record = this.store.get(key);
    return record?.resetTime || Date.now();
  }

  /**
   * 清理过期记录（定期调用）
   */
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

const rateLimitStore = new RateLimitStore();

// 定期清理过期记录
setInterval(() => {
  rateLimitStore.cleanup();
}, 60 * 1000); // 每分钟清理一次

/**
 * 基于 IP 的速率限制中间件
 */
export function ipRateLimit(options: {
  windowMs?: number;   // 时间窗口（毫秒）
  max?: number;        // 最大请求数
} = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 默认 15 分钟
  const max = options.max || 100;                        // 默认 100 请求

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `ip:${ip}`;

    const allowed = rateLimitStore.check(key, max, windowMs);

    // 设置响应头
    const remaining = rateLimitStore.getRemaining(key, max);
    const resetTime = rateLimitStore.getResetTime(key);

    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());

    if (!allowed) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests from IP ${ip}. Please try again later.`,
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
      });
    }

    next();
  };
}

/**
 * 基于玩家 ID 的速率限制中间件
 */
export function playerRateLimit(options: {
  windowMs?: number;   // 时间窗口（毫秒）
  max?: number;        // 最大请求数
} = {}) {
  const windowMs = options.windowMs || 60 * 1000; // 默认 1 分钟
  const max = options.max || 30;                   // 默认 30 请求

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      // 未认证的请求使用 IP 限制
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const key = `ip:${ip}`;
      const allowed = rateLimitStore.check(key, max, windowMs);

      if (!allowed) {
        return res.status(429).json({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.'
        });
      }

      return next();
    }

    const playerId = req.user.playerId;
    const key = `player:${playerId}`;

    const allowed = rateLimitStore.check(key, max, windowMs);

    // 设置响应头
    const remaining = rateLimitStore.getRemaining(key, max);
    const resetTime = rateLimitStore.getResetTime(key);

    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());

    if (!allowed) {
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
      });
    }

    next();
  };
}

/**
 * 关键操作的速率限制（如提交分数、创建救援等）
 * 更严格的限制（每 5 分钟 10 次）
 */
export function criticalOperationRateLimit(options: {
  windowMs?: number;   // 时间窗口（毫秒）
  max?: number;        // 最大请求数
} = {}) {
  const windowMs = options.windowMs || 5 * 60 * 1000; // 默认 5 分钟
  const max = options.max || 10;                       // 默认 10 请求

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required for this operation'
      });
    }

    const playerId = req.user.playerId;
    const endpoint = req.path; // 使用端点路径作为键的一部分
    const key = `critical:${playerId}:${endpoint}`;

    const allowed = rateLimitStore.check(key, max, windowMs);

    // 设置响应头
    const remaining = rateLimitStore.getRemaining(key, max);
    const resetTime = rateLimitStore.getResetTime(key);

    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());

    if (!allowed) {
      return res.status(429).json({
        success: false,
        error: 'CRITICAL_OPERATION_LIMIT',
        message: `Too many ${endpoint} operations. Please try again later.`,
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
      });
    }

    next();
  };
}

/**
 * 获取当前限制状态（用于调试）
 */
export function getRateLimitStatus(key: string, limit: number): {
  key: string;
  remaining: number;
  resetTime: Date;
} {
  const remaining = rateLimitStore.getRemaining(key, limit);
  const resetTime = new Date(rateLimitStore.getResetTime(key));

  return {
    key,
    remaining,
    resetTime
  };
}

export default {
  ipRateLimit,
  playerRateLimit,
  criticalOperationRateLimit,
  getRateLimitStatus
};
