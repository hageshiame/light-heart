import { Router, Request, Response } from 'express';
import { socialService } from '../services/SocialService';
import { loggingService } from '../services/LoggingService';

const router = Router();

/**
 * 排行榜相关路由
 */

// 获取全球排行榜
router.get('/leaderboard/global', (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const offset = parseInt(req.query.offset as string) || 0;

    const leaderboard = socialService.getGlobalLeaderboard(limit, offset);

    loggingService.logBusiness('LEADERBOARD_QUERY', (req as any).userId || 'anonymous', 'global_leaderboard', 'success', {
      limit,
      offset,
      entryCount: leaderboard.length
    });

    res.json({
      success: true,
      data: leaderboard,
      pagination: { limit, offset, total: 10000 }
    });
  } catch (error) {
    loggingService.error('Failed to fetch global leaderboard', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

// 获取周排行榜
router.get('/leaderboard/weekly', (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
    const leaderboard = socialService.getWeeklyLeaderboard(limit);

    res.json({
      success: true,
      data: leaderboard,
      period: 'week',
      timestamp: Date.now()
    });
  } catch (error) {
    loggingService.error('Failed to fetch weekly leaderboard', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

// 获取日排行榜
router.get('/leaderboard/daily', (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
    const leaderboard = socialService.getDailyLeaderboard(limit);

    res.json({
      success: true,
      data: leaderboard,
      period: 'day',
      timestamp: Date.now()
    });
  } catch (error) {
    loggingService.error('Failed to fetch daily leaderboard', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

// 获取好友排行榜
router.get('/leaderboard/friends', (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const leaderboard = socialService.getFriendsLeaderboard(userId);

    res.json({
      success: true,
      data: leaderboard,
      type: 'friends',
      count: leaderboard.length
    });
  } catch (error) {
    loggingService.error('Failed to fetch friends leaderboard', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

// 获取玩家排名
router.get('/leaderboard/my-rank', (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const position = socialService.getPlayerLeaderboardPosition(userId);

    loggingService.logBusiness('LEADERBOARD_RANK', userId, 'get_my_rank', 'success', {
      rank: position?.rank
    });

    res.json({
      success: true,
      data: position
    });
  } catch (error) {
    loggingService.error('Failed to fetch player rank', error);
    res.status(500).json({ success: false, error: 'Failed to fetch rank' });
  }
});

/**
 * 成就相关路由
 */

// 获取所有成就
router.get('/achievements', (req: Request, res: Response) => {
  try {
    const achievements = socialService.getAllAchievements();

    res.json({
      success: true,
      data: achievements,
      count: achievements.length
    });
  } catch (error) {
    loggingService.error('Failed to fetch achievements', error);
    res.status(500).json({ success: false, error: 'Failed to fetch achievements' });
  }
});

// 获取玩家成就
router.get('/achievements/my-achievements', (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const achievements = socialService.getPlayerAchievements(userId);
    const progress = socialService.getAchievementProgress(userId);

    loggingService.logBusiness('ACHIEVEMENTS_QUERY', userId, 'get_my_achievements', 'success', {
      achievementCount: achievements.length,
      progress
    });

    res.json({
      success: true,
      data: {
        achievements,
        progress,
        total: socialService.getAllAchievements().length
      }
    });
  } catch (error) {
    loggingService.error('Failed to fetch player achievements', error);
    res.status(500).json({ success: false, error: 'Failed to fetch achievements' });
  }
});

/**
 * 称号相关路由
 */

// 获取所有称号
router.get('/titles', (req: Request, res: Response) => {
  try {
    const titles = socialService.getAllTitles();

    res.json({
      success: true,
      data: titles,
      count: titles.length
    });
  } catch (error) {
    loggingService.error('Failed to fetch titles', error);
    res.status(500).json({ success: false, error: 'Failed to fetch titles' });
  }
});

// 获取玩家称号
router.get('/titles/my-titles', (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const titles = socialService.getPlayerTitles(userId);

    res.json({
      success: true,
      data: titles,
      count: titles.length
    });
  } catch (error) {
    loggingService.error('Failed to fetch player titles', error);
    res.status(500).json({ success: false, error: 'Failed to fetch titles' });
  }
});

/**
 * 好友相关路由
 */

// 获取好友列表
router.get('/friends', (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const friends = socialService.getFriendList(userId);

    loggingService.logBusiness('FRIEND_LIST', userId, 'get_friends', 'success', {
      friendCount: friends.length
    });

    res.json({
      success: true,
      data: friends,
      count: friends.length
    });
  } catch (error) {
    loggingService.error('Failed to fetch friends', error);
    res.status(500).json({ success: false, error: 'Failed to fetch friends' });
  }
});

// 添加好友
router.post('/friends/add', (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ success: false, error: 'friendId is required' });
    }

    const success = socialService.addFriend(userId, friendId);

    loggingService.logBusiness('FRIEND_ADD', userId, `add_friend:${friendId}`, success ? 'success' : 'failure');

    res.json({
      success,
      message: success ? 'Friend added successfully' : 'Failed to add friend'
    });
  } catch (error) {
    loggingService.error('Failed to add friend', error);
    res.status(500).json({ success: false, error: 'Failed to add friend' });
  }
});

// 移除好友
router.post('/friends/remove', (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ success: false, error: 'friendId is required' });
    }

    const success = socialService.removeFriend(userId, friendId);

    loggingService.logBusiness('FRIEND_REMOVE', userId, `remove_friend:${friendId}`, success ? 'success' : 'failure');

    res.json({
      success,
      message: success ? 'Friend removed successfully' : 'Failed to remove friend'
    });
  } catch (error) {
    loggingService.error('Failed to remove friend', error);
    res.status(500).json({ success: false, error: 'Failed to remove friend' });
  }
});

/**
 * 社交统计相关路由
 */

// 获取玩家社交统计
router.get('/stats', (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const stats = socialService.getPlayerSocialStats(userId);

    loggingService.logBusiness('SOCIAL_STATS', userId, 'get_stats', 'success');

    res.json({
      success: true,
      data: stats,
      timestamp: Date.now()
    });
  } catch (error) {
    loggingService.error('Failed to fetch social stats', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// 获取全服统计
router.get('/stats/server', (req: Request, res: Response) => {
  try {
    const stats = socialService.getServerStats();

    res.json({
      success: true,
      data: stats,
      timestamp: Date.now()
    });
  } catch (error) {
    loggingService.error('Failed to fetch server stats', error);
    res.status(500).json({ success: false, error: 'Failed to fetch server stats' });
  }
});

/**
 * 玩家档案
 */

// 获取玩家档案
router.get('/profile/:playerId', (req: Request, res: Response) => {
  try {
    const { playerId } = req.params;
    
    const profile = {
      playerId,
      nickname: 'Player Name',
      level: Math.floor(Math.random() * 50) + 1,
      rank: socialService.getPlayerRank(playerId),
      achievements: socialService.getPlayerAchievements(playerId),
      titles: socialService.getPlayerTitles(playerId),
      friendCount: socialService.getFriendCount(playerId),
      stats: socialService.getPlayerSocialStats(playerId)
    };

    loggingService.debug('Profile view', { viewedPlayerId: playerId, viewerPlayerId: (req as any).userId });

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    loggingService.error('Failed to fetch profile', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

export default router;
