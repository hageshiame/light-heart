import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import AccountService from '../services/AccountService';
import DatabaseManager from '../db/DatabaseManager';

const router = Router();
const accountService = AccountService;
const dbManager = DatabaseManager;

/**
 * POST /api/auth/wechat-login
 * WeChat Mini Program authorization login (Layer 1: Critical)
 * Handles user account creation/lookup and JWT token generation
 */
router.post('/wechat-login', async (req: Request, res: Response) => {
  try {
    // Ensure database is initialized
    if (!dbManager.isInitialized()) {
      await dbManager.initialize();
    }

    const { code, encryptedData, iv, nickname, avatar } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_CODE',
        message: 'WeChat code is required'
      });
    }

    // TODO: In production, exchange code for session key with WeChat API
    // Generate stable openid from code for local development
    const wechatOpenid = crypto.createHash('sha256')
      .update(code)
      .digest('hex')
      .substring(0, 28);

    // Try to get existing account
    let account = await accountService.getAccountByOpenID(wechatOpenid);

    if (!account) {
      // Create new account
      account = await accountService.createAccountFromWeChat(wechatOpenid, nickname, avatar);
      console.log(`✓ New account created: ${account.id}`);
    } else {
      // Update last login timestamp
      await accountService.updateLastLogin(account.id);
      console.log(`✓ Account logged in: ${account.id}`);
    }

    // Generate JWT token
    const sessionToken = jwt.sign(
      {
        playerId: account.id,
        openid: account.wechat_openid,
        level: account.level,
        timestamp: Date.now()
      },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: process.env.JWT_EXPIRE || '7d' } as any
    );

    res.json({
      success: true,
      sessionToken,
      playerId: account.id,
      account: {
        id: account.id,
        level: account.level,
        exp: account.exp,
        gold: account.gold
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'LOGIN_ERROR',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/auth/refresh-token
 * Refresh expired session token without re-authentication
 * Allows player to get new token if current is near expiration
 */
router.post('/refresh-token', async (req: Request, res: Response) => {
  try {
    if (!dbManager.isInitialized()) {
      await dbManager.initialize();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'MISSING_TOKEN',
        message: 'Authorization header with Bearer token is required'
      });
    }

    const token = authHeader.substring(7);

    try {
      // Verify token even if expired (with ignoreExpiration for expired tokens)
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'dev-secret',
        { ignoreExpiration: true } as any
      ) as any;

      // Verify player still exists
      const player = await accountService.getAccountById(decoded.playerId);
      if (!player) {
        return res.status(404).json({
          success: false,
          error: 'PLAYER_NOT_FOUND',
          message: 'Player account no longer exists'
        });
      }

      // Generate new token
      const newToken = jwt.sign(
        {
          playerId: player.id,
          openid: player.wechat_openid,
          level: player.level,
          timestamp: Date.now()
        },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: process.env.JWT_EXPIRE || '7d' } as any
      );

      res.json({
        success: true,
        sessionToken: newToken,
        expiresIn: '7d',
        message: 'Token refreshed successfully'
      });
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Token verification failed. Please login again.'
      });
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'REFRESH_ERROR',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/auth/get-account
 * Get current player's account info (requires authentication)
 */
router.get('/get-account', async (req: Request, res: Response) => {
  try {
    if (!dbManager.isInitialized()) {
      await dbManager.initialize();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'MISSING_TOKEN',
        message: 'Authorization required'
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
      const player = await accountService.getAccountById(decoded.playerId);

      if (!player) {
        return res.status(404).json({
          success: false,
          error: 'PLAYER_NOT_FOUND',
          message: 'Player not found'
        });
      }

      res.json({
        success: true,
        data: {
          id: player.id,
          wechatOpenid: player.wechat_openid,
          level: player.level,
          exp: player.exp,
          gold: player.gold,
          lastLogin: player.last_login,
          lastSync: player.last_sync,
          createdAt: player.created_at
        },
        message: 'Account retrieved'
      });
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Token verification failed'
      });
    }
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;
