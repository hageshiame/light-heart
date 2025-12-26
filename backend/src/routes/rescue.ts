import { Router, Request, Response } from 'express';

const router = Router();

// Mock in-memory rescue requests
const rescueRequests: { [key: string]: any } = {};

/**
 * POST /api/rescue/create-request
 * Layer 2: Important - Create a rescue request
 */
router.post('/create-request', (req: Request, res: Response) => {
  try {
    const { playerId, mapId, lostItems, totalValue } = req.body;

    if (!playerId || !mapId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMS',
        message: 'playerId and mapId are required'
      });
    }

    const requestId = `rescue_${Date.now()}`;
    const expiresAt = Date.now() + 86400000; // 24 hours

    rescueRequests[requestId] = {
      requestId,
      playerId,
      mapId,
      lostItems,
      totalValue,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt
    };

    // Generate share URL (mock)
    const rescueUrl = `https://game.example.com/rescue?id=${requestId}`;

    res.json({
      success: true,
      requestId,
      rescueUrl,
      expiresAt,
      message: 'Rescue request created'
    });
  } catch (error) {
    console.error('Create rescue request error:', error);
    res.status(500).json({
      success: false,
      error: 'CREATE_ERROR',
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/rescue/get-task
 * Get available rescue task
 */
router.get('/get-task', (req: Request, res: Response) => {
  try {
    const { requestId } = req.query;

    if (!requestId || typeof requestId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUEST_ID',
        message: 'requestId is required'
      });
    }

    const task = rescueRequests[requestId];

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Rescue request not found'
      });
    }

    if (Date.now() > task.expiresAt) {
      return res.status(410).json({
        success: false,
        error: 'EXPIRED',
        message: 'Rescue request has expired'
      });
    }

    res.json({
      success: true,
      data: {
        requestId: task.requestId,
        playerId: task.playerId,
        mapId: task.mapId,
        lostItems: task.lostItems,
        totalValue: task.totalValue,
        expiresAt: task.expiresAt
      }
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/rescue/complete-task
 * Complete rescue task (Layer 2: Important)
 */
router.post('/complete-task', (req: Request, res: Response) => {
  try {
    const { requestId, heroId, completedTime, signature } = req.body;

    if (!requestId || !heroId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMS',
        message: 'requestId and heroId are required'
      });
    }

    const task = rescueRequests[requestId];

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Rescue request not found'
      });
    }

    // TODO: Verify signature and complete task in database
    task.status = 'completed';
    task.heroId = heroId;
    task.completedAt = completedTime;

    // Award hero
    const heroReward = { gold: 500, exp: 200 };
    // Award original player (return 60% of items)
    const playerReward = task.lostItems.map((item: any) => ({
      ...item,
      count: Math.ceil(item.count * 0.6)
    }));

    res.json({
      success: true,
      message: 'Rescue task completed',
      heroReward,
      playerReward
    });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({
      success: false,
      error: 'COMPLETE_ERROR',
      message: 'Internal server error'
    });
  }
});

export default router;
