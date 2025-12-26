import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();

/**
 * POST /api/auth/wechat-login
 * WeChat Mini Program authorization login
 */
router.post('/wechat-login', async (req: Request, res: Response) => {
  try {
    const { code, encryptedData, iv } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_CODE',
        message: 'WeChat code is required'
      });
    }

    // TODO: Exchange code for session key with WeChat API
    // For now, use code as mock playerId
    const playerId = `player_${code.substring(0, 8)}`;
    const sessionToken = jwt.sign(
      { playerId, timestamp: Date.now() },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: process.env.JWT_EXPIRE || '7d' } as any
    );

    res.json({
      success: true,
      sessionToken,
      playerId,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'LOGIN_ERROR',
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/auth/refresh-token
 * Refresh expired session token
 */
router.post('/refresh-token', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'MISSING_TOKEN',
        message: 'Authorization header required'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      // Verify token (even if expired, jwt.verify with ignoreExpiration would help)
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
      const newToken = jwt.sign(
        { playerId: decoded.playerId, timestamp: Date.now() },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: process.env.JWT_EXPIRE || '7d' } as any
      );

      res.json({
        success: true,
        sessionToken: newToken,
        message: 'Token refreshed'
      });
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Token verification failed'
      });
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'REFRESH_ERROR',
      message: 'Internal server error'
    });
  }
});

export default router;
