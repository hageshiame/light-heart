import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import BattleService from '../services/BattleService';
import AccountService from '../services/AccountService';
import DatabaseManager from '../db/DatabaseManager';

const router = Router();
const battleService = BattleService;
const accountService = AccountService;
const dbManager = DatabaseManager;

/**
 * POST /api/leaderboard/submit-score
 * Layer 1: Critical - Submit battle score with signature verification
 * Records player battle results and updates leaderboard cache
 */
router.post('/submit-score', async (req: Request, res: Response) => {
  try {
    if (!dbManager.isInitialized()) {
      await dbManager.initialize();
    }

    const {
      playerId,
      mapId,
      score,
      damageDealt,
      damageReceived,
      clearTime,
      extractSuccess,
      signature,
      clientTimestamp
    } = req.body;

    // Validate required fields
    if (!playerId || score === undefined || !mapId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMS',
        message: 'playerId, mapId, and score are required'
      });
    }

    // Verify score is reasonable (anti-cheat)
    if (score < 0 || score > 999999 || !Number.isInteger(score)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_SCORE',
        message: 'Score must be a non-negative integer'
      });
    }

    // Verify player exists
    const player = await accountService.getAccountById(playerId);
    if (!player) {
      return res.status(404).json({
        success: false,
        error: 'PLAYER_NOT_FOUND',
        message: 'Player account does not exist'
      });
    }

    // Verify signature (anti-cheat)
    if (signature) {
      const expectedSignature = crypto
        .createHash('sha256')
        .update(`${playerId}${mapId}${score}${clientTimestamp}${process.env.SIGN_KEY || 'dev-key'}`)
        .digest('hex');
      if (signature !== expectedSignature) {
        console.warn(`[ANTICHEAT] Invalid signature for player ${playerId}`);
        return res.status(403).json({
          success: false,
          error: 'INVALID_SIGNATURE',
          message: 'Score signature verification failed'
        });
      }
    }

    // Submit battle score
    const battleRecord = await battleService.submitBattleScore({
      playerId,
      mapId,
      score,
      damageDealt: damageDealt || 0,
      damageReceived: damageReceived || 0,
      clearTime: clearTime || 0,
      extractSuccess: extractSuccess || false
    });

    // Get player rank
    const rank = await battleService.getPlayerRank(playerId, mapId);

    // Award experience and gold
    const expGain = Math.floor(score / 10);
    const goldGain = Math.floor(score / 5);
    await accountService.addExp(playerId, expGain);
    await accountService.addGold(playerId, goldGain);

    res.json({
      success: true,
      battleId: battleRecord.id,
      rank,
      rewards: {
        exp: expGain,
        gold: goldGain
      },
      message: 'Score submitted successfully'
    });
  } catch (error) {
    console.error('Submit score error:', error);
    res.status(500).json({
      success: false,
      error: 'SUBMIT_ERROR',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/leaderboard/get-rankings
 * Retrieve global leaderboard rankings with pagination
 */
router.get('/get-rankings', async (req: Request, res: Response) => {
  try {
    if (!dbManager.isInitialized()) {
      await dbManager.initialize();
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const mapId = req.query.mapId as string | undefined;

    // Get leaderboard entries
    const rankings = await battleService.getLeaderboard(mapId, limit, offset);

    res.json({
      success: true,
      data: rankings.map((entry, index) => ({
        rank: offset + index + 1,
        playerId: entry.playerId,
        score: entry.score,
        mapId: entry.mapId,
        timestamp: entry.timestamp
      })),
      limit,
      offset,
      message: 'Rankings retrieved successfully'
    });
  } catch (error) {
    console.error('Get rankings error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/leaderboard/personal-history
 * Get player's battle history with pagination
 */
router.get('/personal-history', async (req: Request, res: Response) => {
  try {
    if (!dbManager.isInitialized()) {
      await dbManager.initialize();
    }

    const playerId = req.query.playerId as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    if (!playerId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PLAYER_ID',
        message: 'playerId is required'
      });
    }

    const battleHistory = await battleService.getPlayerBattleHistory(playerId, limit, offset);

    // Calculate stats
    const totalBattles = await battleService.getTotalBattlesCount(playerId);
    const averageScore = await battleService.getAverageScore(playerId);

    res.json({
      success: true,
      data: battleHistory,
      stats: {
        totalBattles,
        averageScore
      },
      limit,
      offset,
      message: 'Battle history retrieved successfully'
    });
  } catch (error) {
    console.error('Get personal history error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/leaderboard/player-rank
 * Get player's rank on specific map
 */
router.get('/player-rank', async (req: Request, res: Response) => {
  try {
    if (!dbManager.isInitialized()) {
      await dbManager.initialize();
    }

    const playerId = req.query.playerId as string;
    const mapId = req.query.mapId as string | undefined;

    if (!playerId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PLAYER_ID',
        message: 'playerId is required'
      });
    }

    const rank = await battleService.getPlayerRank(playerId, mapId);
    const bestScore = await battleService.getPlayerBestScore(playerId, mapId || 'global');

    res.json({
      success: true,
      data: {
        playerId,
        rank,
        bestScore
      },
      message: 'Player rank retrieved successfully'
    });
  } catch (error) {
    console.error('Get player rank error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;
