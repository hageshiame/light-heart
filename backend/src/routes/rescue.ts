import { Router, Request, Response } from 'express';
import RescueService from '../services/RescueService';
import AccountService from '../services/AccountService';
import DatabaseManager from '../db/DatabaseManager';

const router = Router();
const rescueService = RescueService;
const accountService = AccountService;
const dbManager = DatabaseManager;

/**
 * POST /api/rescue/create-request
 * Layer 2: Important - Create a rescue request
 * Player posts rescue request when battle fails and items are lost
 */
router.post('/create-request', async (req: Request, res: Response) => {
  try {
    if (!dbManager.isInitialized()) {
      await dbManager.initialize();
    }

    const { playerId, mapId, lostItems, totalValue } = req.body;

    if (!playerId || !mapId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMS',
        message: 'playerId and mapId are required'
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

    // Create rescue request
    const rescueRequest = await rescueService.createRescueRequest({
      playerId,
      mapId,
      lostItems: lostItems || [],
      totalValue: totalValue || 0
    });

    // Generate shareable rescue URL
    const rescueUrl = `https://game.example.com/rescue?id=${rescueRequest.id}`;

    res.json({
      success: true,
      requestId: rescueRequest.id,
      rescueUrl,
      expiresAt: rescueRequest.expires_at,
      message: 'Rescue request created successfully'
    });
  } catch (error) {
    console.error('Create rescue request error:', error);
    res.status(500).json({
      success: false,
      error: 'CREATE_ERROR',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/rescue/get-task
 * Get rescue task details
 */
router.get('/get-task', async (req: Request, res: Response) => {
  try {
    if (!dbManager.isInitialized()) {
      await dbManager.initialize();
    }

    const requestId = req.query.requestId as string;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUEST_ID',
        message: 'requestId is required'
      });
    }

    const rescueRequest = await rescueService.getRescueRequest(requestId);

    if (!rescueRequest) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: 'Rescue request not found'
      });
    }

    // Check if expired
    if (Date.now() > new Date(rescueRequest.expires_at).getTime()) {
      return res.status(410).json({
        success: false,
        error: 'EXPIRED',
        message: 'Rescue request has expired'
      });
    }

    res.json({
      success: true,
      data: {
        requestId: rescueRequest.id,
        playerId: rescueRequest.requester_id,
        mapId: rescueRequest.map_id,
        lostItems: JSON.parse(rescueRequest.lost_items || '[]'),
        totalValue: rescueRequest.total_value,
        expiresAt: rescueRequest.expires_at,
        status: rescueRequest.status
      },
      message: 'Rescue task retrieved'
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/rescue/complete-task
 * Complete rescue task and award rewards (Layer 2: Important)
 */
router.post('/complete-task', async (req: Request, res: Response) => {
  try {
    if (!dbManager.isInitialized()) {
      await dbManager.initialize();
    }

    const { requestId, rescuerId, completedTime, signature } = req.body;

    if (!requestId || !rescuerId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMS',
        message: 'requestId and rescuerId are required'
      });
    }

    // Verify rescuer exists
    const rescuer = await accountService.getAccountById(rescuerId);
    if (!rescuer) {
      return res.status(404).json({
        success: false,
        error: 'RESCUER_NOT_FOUND',
        message: 'Rescuer account does not exist'
      });
    }

    // Complete rescue
    const completedRescue = await rescueService.completeRescue({
      rescueId: requestId,
      rescuerId,
      completedTime: completedTime || Date.now()
    });

    // Award rescuer
    const rescuerReward = { gold: 500, exp: 200 };
    await accountService.addGold(rescuerId, rescuerReward.gold);
    await accountService.addExp(rescuerId, rescuerReward.exp);

    // Return items to original player (60% recovery)
    const originalPlayer = await accountService.getAccountById(completedRescue.requester_id);
    if (originalPlayer) {
      const lostItems = JSON.parse(completedRescue.lost_items || '[]');
      const recoveredItems = lostItems.map((item: any) => ({
        ...item,
        count: Math.ceil(item.count * 0.6)
      }));

      res.json({
        success: true,
        message: 'Rescue task completed',
        rescuerReward,
        recoveredItems,
        originalPlayerGetsBack: recoveredItems
      });
    } else {
      res.json({
        success: true,
        message: 'Rescue task completed',
        rescuerReward
      });
    }
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({
      success: false,
      error: 'COMPLETE_ERROR',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/rescue/pending-list
 * Get list of pending rescue requests for rescue matching
 */
router.get('/pending-list', async (req: Request, res: Response) => {
  try {
    if (!dbManager.isInitialized()) {
      await dbManager.initialize();
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    const pendingRescues = await rescueService.getPendingRescues(limit, offset);

    res.json({
      success: true,
      data: pendingRescues.map(r => ({
        requestId: r.id,
        playerId: r.requester_id,
        mapId: r.map_id,
        totalValue: r.total_value,
        createdAt: r.created_at,
        expiresAt: r.expires_at
      })),
      limit,
      offset,
      message: 'Pending rescues retrieved'
    });
  } catch (error) {
    console.error('Get pending list error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/rescue/stats
 * Get player's rescue statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    if (!dbManager.isInitialized()) {
      await dbManager.initialize();
    }

    const playerId = req.query.playerId as string;

    if (!playerId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PLAYER_ID',
        message: 'playerId is required'
      });
    }

    const stats = await rescueService.getRescueStats(playerId);

    res.json({
      success: true,
      data: {
        playerId,
        totalRequested: stats.total_requested,
        totalCompleted: stats.total_completed,
        totalRescued: stats.total_rescued
      },
      message: 'Rescue stats retrieved'
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'FETCH_ERROR',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;
