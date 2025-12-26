import { Router, Request, Response } from 'express';

const router = Router();

// Mock in-memory leaderboard for local development
const leaderboard: { playerId: string; score: number; timestamp: number }[] = [];

/**
 * POST /api/leaderboard/submit-score
 * Layer 1: Critical - Submit battle score
 */
router.post('/submit-score', (req: Request, res: Response) => {
  try {
    const { playerId, mapId, score, damageDealt, damageReceived, clearTime, extractSuccess, signature } = req.body;

    if (!playerId || score === undefined) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMS',
        message: 'playerId and score are required'
      });
    }

    // TODO: Verify signature and add to database
    const entry = { playerId, score, timestamp: Date.now() };
    leaderboard.push(entry);
    leaderboard.sort((a, b) => b.score - a.score);

    // Keep only top 100
    if (leaderboard.length > 100) {
      leaderboard.pop();
    }

    res.json({
      success: true,
      message: 'Score submitted successfully',
      rank: leaderboard.findIndex(e => e.playerId === playerId) + 1
    });
  } catch (error) {
    console.error('Submit score error:', error);
    res.status(500).json({
      success: false,
      error: 'SUBMIT_ERROR',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/leaderboard/get-rankings
 * Retrieve leaderboard rankings
 */
router.get('/get-rankings', (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const rankings = leaderboard.slice(offset, offset + limit).map((entry, index) => ({
      rank: offset + index + 1,
      playerId: entry.playerId,
      score: entry.score,
      timestamp: entry.timestamp
    }));

    res.json({
      success: true,
      data: rankings,
      total: leaderboard.length,
      limit,
      offset
    });
  } catch (error) {
    console.error('Get rankings error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/leaderboard/personal-history
 * Get player's score history
 */
router.get('/personal-history', (req: Request, res: Response) => {
  try {
    const { playerId } = req.query;

    if (!playerId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PLAYER_ID',
        message: 'playerId is required'
      });
    }

    // TODO: Fetch from database
    const playerScores = leaderboard.filter(e => e.playerId === playerId);

    res.json({
      success: true,
      data: playerScores,
      total: playerScores.length
    });
  } catch (error) {
    console.error('Get personal history error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Internal server error'
    });
  }
});

export default router;
