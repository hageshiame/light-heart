/**
 * JWT Authentication Middleware
 * 路由保护、Token 验证、权限检查
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * 扩展 Express Request 类型以包含用户信息
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    playerId: string;
    openid: string;
    level: number;
    iat: number;
    exp: number;
  };
  token?: string;
}

/**
 * JWT 认证中间件
 * 验证请求头中的 Bearer Token 并解析用户信息
 */
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'MISSING_TOKEN',
        message: 'Authorization header with Bearer token is required'
      });
    }

    const token = authHeader.substring(7);
    req.token = token;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      req.user = decoded as any;
      next();
    } catch (jwtError: any) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'TOKEN_EXPIRED',
          message: 'Token has expired. Please refresh your token.',
          expiredAt: jwtError.expiredAt
        });
      }

      return res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Token verification failed',
        details: jwtError.message
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'AUTH_ERROR',
      message: 'Authentication error occurred'
    });
  }
}

/**
 * 可选的认证中间件（不存在则跳过）
 */
export function optionalAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      req.token = token;

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
        req.user = decoded as any;
      } catch (jwtError) {
        // 忽略错误，继续处理为未认证请求
        console.warn('Optional auth failed:', jwtError);
      }
    }

    next();
  } catch (error) {
    next();
  }
}

/**
 * 角色检查中间件（示例）
 * 检查玩家是否达到指定等级
 */
export function requireLevel(minLevel: number) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }

    if (req.user.level < minLevel) {
      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_LEVEL',
        message: `Minimum level ${minLevel} required (your level: ${req.user.level})`
      });
    }

    next();
  };
}

/**
 * 所有者验证中间件
 * 检查请求的玩家 ID 是否与认证用户一致
 */
export function verifyOwnership(paramName: string = 'playerId') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }

    const targetPlayerId = req.params[paramName] || req.body[paramName];

    if (!targetPlayerId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PLAYER_ID',
        message: `Missing ${paramName} in request`
      });
    }

    if (req.user.playerId !== targetPlayerId) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to access this resource'
      });
    }

    next();
  };
}

/**
 * 错误处理中间件
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err);

  // JWT 相关错误
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'TOKEN_EXPIRED',
      message: 'Token has expired'
    });
  }

  // 数据库错误
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      error: 'CONFLICT',
      message: 'Resource already exists'
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_REFERENCE',
      message: 'Referenced resource does not exist'
    });
  }

  // 默认错误
  res.status(err.status || 500).json({
    success: false,
    error: err.code || 'INTERNAL_ERROR',
    message: err.message || 'Internal server error'
  });
}

export default {
  authMiddleware,
  optionalAuthMiddleware,
  requireLevel,
  verifyOwnership,
  errorHandler
};
