/**
 * 社交服务
 * 
 * 提供排行榜、成就、称号、好友等社交功能
 */

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  nickname: string;
  score: number;
  level: number;
  battleCount: number;
  winRate: number;
  lastScoreTime: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  rewardGold: number;
  rewardExp: number;
  category: 'battle' | 'score' | 'level' | 'social' | 'special';
  unlockedAt?: number;
  progress: number;
}

export interface Title {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  requirement: Achievement | string;
  obtainedAt?: number;
}

export interface Friend {
  playerId: string;
  nickname: string;
  level: number;
  lastActive: number;
  friendSince: number;
}

/**
 * 社交服务类
 */
export class SocialService {
  
  private static instance: SocialService;
  
  // 排行榜数据（模拟存储）
  private leaderboardData: Map<string, any> = new Map();
  
  // 成就数据
  private achievements: Map<string, Achievement> = new Map();
  
  // 称号数据
  private titles: Map<string, Title> = new Map();
  
  // 好友关系
  private friendships: Map<string, Set<string>> = new Map();

  private constructor() {
    this.initializeAchievements();
    this.initializeTitles();
  }

  static getInstance(): SocialService {
    if (!SocialService.instance) {
      SocialService.instance = new SocialService();
    }
    return SocialService.instance;
  }

  /**
   * 初始化成就列表
   */
  private initializeAchievements(): void {
    const achievementsList: Achievement[] = [
      {
        id: 'ach_001',
        name: '初出茅庐',
        description: '完成第一场战斗',
        icon: 'icon_beginner',
        requirement: 1,
        rewardGold: 100,
        rewardExp: 50,
        category: 'battle',
        progress: 0
      },
      {
        id: 'ach_002',
        name: '战斗之王',
        description: '赢得 100 场战斗',
        icon: 'icon_warrior',
        requirement: 100,
        rewardGold: 1000,
        rewardExp: 500,
        category: 'battle',
        progress: 0
      },
      {
        id: 'ach_003',
        name: '分数大师',
        description: '获得 10,000 分',
        icon: 'icon_master',
        requirement: 10000,
        rewardGold: 2000,
        rewardExp: 1000,
        category: 'score',
        progress: 0
      },
      {
        id: 'ach_004',
        name: '传奇玩家',
        description: '达到 50 级',
        icon: 'icon_legend',
        requirement: 50,
        rewardGold: 5000,
        rewardExp: 2000,
        category: 'level',
        progress: 0
      },
      {
        id: 'ach_005',
        name: '社交蝴蝶',
        description: '添加 10 个好友',
        icon: 'icon_social',
        requirement: 10,
        rewardGold: 500,
        rewardExp: 300,
        category: 'social',
        progress: 0
      },
      {
        id: 'ach_006',
        name: '救援英雄',
        description: '成功进行 50 次救援',
        icon: 'icon_hero',
        requirement: 50,
        rewardGold: 1500,
        rewardExp: 800,
        category: 'special',
        progress: 0
      },
      {
        id: 'ach_007',
        name: '完美胜率',
        description: '保持 10 场连胜',
        icon: 'icon_perfect',
        requirement: 10,
        rewardGold: 800,
        rewardExp: 600,
        category: 'battle',
        progress: 0
      },
      {
        id: 'ach_008',
        name: '富豪玩家',
        description: '拥有 100,000 金币',
        icon: 'icon_rich',
        requirement: 100000,
        rewardGold: 3000,
        rewardExp: 1000,
        category: 'special',
        progress: 0
      },
      {
        id: 'ach_009',
        name: '排行榜冠军',
        description: '登上排行榜第一名',
        icon: 'icon_champion',
        requirement: 1,
        rewardGold: 10000,
        rewardExp: 5000,
        category: 'score',
        progress: 0
      },
      {
        id: 'ach_010',
        name: '探险家',
        description: '探索所有地图',
        icon: 'icon_explorer',
        requirement: 5,
        rewardGold: 1000,
        rewardExp: 700,
        category: 'special',
        progress: 0
      }
    ];

    achievementsList.forEach(ach => {
      this.achievements.set(ach.id, ach);
    });
  }

  /**
   * 初始化称号列表
   */
  private initializeTitles(): void {
    const titlesList: Title[] = [
      {
        id: 'title_001',
        name: '初心者',
        description: '刚踏入这个世界',
        rarity: 'common',
        requirement: 'ach_001'
      },
      {
        id: 'title_002',
        name: '勇士',
        description: '战斗中的胜者',
        rarity: 'uncommon',
        requirement: 'ach_002'
      },
      {
        id: 'title_003',
        name: '传奇',
        description: '游戏中的传说',
        rarity: 'epic',
        requirement: 'ach_004'
      },
      {
        id: 'title_004',
        name: '救世主',
        description: '无数人的英雄',
        rarity: 'epic',
        requirement: 'ach_006'
      },
      {
        id: 'title_005',
        name: '神射手',
        description: '无敌的战士',
        rarity: 'legendary',
        requirement: 'ach_009'
      }
    ];

    titlesList.forEach(title => {
      this.titles.set(title.id, title);
    });
  }

  // ============= 排行榜功能 =============

  /**
   * 获取全局排行榜（按分数）
   */
  getGlobalLeaderboard(limit: number = 100, offset: number = 0): LeaderboardEntry[] {
    // 这里应该从数据库获取，现在返回模拟数据
    const mockData: LeaderboardEntry[] = [];
    for (let i = 0; i < limit; i++) {
      mockData.push({
        rank: offset + i + 1,
        playerId: `player_${offset + i}`,
        nickname: `Player ${offset + i}`,
        score: 10000 - (offset + i) * 100,
        level: Math.floor(Math.random() * 50) + 1,
        battleCount: Math.floor(Math.random() * 500) + 1,
        winRate: Math.random() * 100,
        lastScoreTime: Date.now() - Math.random() * 86400000
      });
    }
    return mockData;
  }

  /**
   * 获取周排行榜
   */
  getWeeklyLeaderboard(limit: number = 50): LeaderboardEntry[] {
    return this.getGlobalLeaderboard(limit);
  }

  /**
   * 获取日排行榜
   */
  getDailyLeaderboard(limit: number = 50): LeaderboardEntry[] {
    return this.getGlobalLeaderboard(limit);
  }

  /**
   * 获取好友排行榜
   */
  getFriendsLeaderboard(playerId: string): LeaderboardEntry[] {
    const friends = this.friendships.get(playerId) || new Set();
    return this.getGlobalLeaderboard(friends.size);
  }

  /**
   * 获取玩家排名
   */
  getPlayerRank(playerId: string): number {
    // 这里应该从数据库计算排名
    return Math.floor(Math.random() * 10000) + 1;
  }

  /**
   * 获取玩家排行榜位置详情
   */
  getPlayerLeaderboardPosition(playerId: string): LeaderboardEntry | null {
    const rank = this.getPlayerRank(playerId);
    if (rank > 0) {
      return {
        rank,
        playerId,
        nickname: 'Player Name',
        score: Math.floor(Math.random() * 100000),
        level: Math.floor(Math.random() * 50) + 1,
        battleCount: Math.floor(Math.random() * 500),
        winRate: Math.random() * 100,
        lastScoreTime: Date.now()
      };
    }
    return null;
  }

  // ============= 成就功能 =============

  /**
   * 获取所有成就
   */
  getAllAchievements(): Achievement[] {
    return Array.from(this.achievements.values());
  }

  /**
   * 获取玩家已解锁的成就
   */
  getPlayerAchievements(playerId: string): Achievement[] {
    // 这里应该从数据库获取玩家解锁的成就
    return Array.from(this.achievements.values()).filter(ach => ach.unlockedAt !== undefined);
  }

  /**
   * 解锁成就
   */
  unlockAchievement(playerId: string, achievementId: string): boolean {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) {
      return false;
    }

    // 标记成就为已解锁
    achievement.unlockedAt = Date.now();
    
    // 这里应该保存到数据库
    return true;
  }

  /**
   * 更新成就进度
   */
  updateAchievementProgress(playerId: string, achievementId: string, progress: number): void {
    const achievement = this.achievements.get(achievementId);
    if (achievement) {
      achievement.progress = Math.min(progress, achievement.requirement);

      // 检查是否应该解锁成就
      if (achievement.progress >= achievement.requirement && !achievement.unlockedAt) {
        this.unlockAchievement(playerId, achievementId);
      }
    }
  }

  /**
   * 获取成就完成百分比
   */
  getAchievementProgress(playerId: string): number {
    const allAchievements = this.getAllAchievements();
    const unlockedCount = allAchievements.filter(a => a.unlockedAt).length;
    return (unlockedCount / allAchievements.length) * 100;
  }

  // ============= 称号功能 =============

  /**
   * 获取所有可获得的称号
   */
  getAllTitles(): Title[] {
    return Array.from(this.titles.values());
  }

  /**
   * 获取玩家已获得的称号
   */
  getPlayerTitles(playerId: string): Title[] {
    return Array.from(this.titles.values()).filter(t => t.obtainedAt !== undefined);
  }

  /**
   * 授予称号
   */
  awardTitle(playerId: string, titleId: string): boolean {
    const title = this.titles.get(titleId);
    if (!title) {
      return false;
    }

    title.obtainedAt = Date.now();
    return true;
  }

  /**
   * 设置使用的称号
   */
  setActiveTitle(playerId: string, titleId: string): boolean {
    const title = this.titles.get(titleId);
    if (!title || !title.obtainedAt) {
      return false;
    }

    // 保存到数据库
    return true;
  }

  // ============= 好友功能 =============

  /**
   * 获取玩家的好友列表
   */
  getFriendList(playerId: string): Friend[] {
    const friendIds = this.friendships.get(playerId) || new Set();
    const friends: Friend[] = [];

    friendIds.forEach(friendId => {
      friends.push({
        playerId: friendId,
        nickname: `Friend ${friendId}`,
        level: Math.floor(Math.random() * 50) + 1,
        lastActive: Date.now() - Math.random() * 86400000,
        friendSince: Date.now() - Math.random() * 2592000000
      });
    });

    return friends;
  }

  /**
   * 添加好友
   */
  addFriend(playerId: string, friendId: string): boolean {
    if (!this.friendships.has(playerId)) {
      this.friendships.set(playerId, new Set());
    }
    this.friendships.get(playerId)!.add(friendId);

    // 双向关系
    if (!this.friendships.has(friendId)) {
      this.friendships.set(friendId, new Set());
    }
    this.friendships.get(friendId)!.add(playerId);

    return true;
  }

  /**
   * 移除好友
   */
  removeFriend(playerId: string, friendId: string): boolean {
    this.friendships.get(playerId)?.delete(friendId);
    this.friendships.get(friendId)?.delete(playerId);
    return true;
  }

  /**
   * 检查是否是好友
   */
  isFriend(playerId: string, friendId: string): boolean {
    return this.friendships.get(playerId)?.has(friendId) || false;
  }

  /**
   * 获取好友数量
   */
  getFriendCount(playerId: string): number {
    return this.friendships.get(playerId)?.size || 0;
  }

  // ============= 统计功能 =============

  /**
   * 获取玩家社交统计
   */
  getPlayerSocialStats(playerId: string): {
    rank: number;
    score: number;
    level: number;
    achievementCount: number;
    achievementProgress: number;
    titleCount: number;
    friendCount: number;
  } {
    return {
      rank: this.getPlayerRank(playerId),
      score: Math.floor(Math.random() * 100000),
      level: Math.floor(Math.random() * 50) + 1,
      achievementCount: this.getPlayerAchievements(playerId).length,
      achievementProgress: this.getAchievementProgress(playerId),
      titleCount: this.getPlayerTitles(playerId).length,
      friendCount: this.getFriendCount(playerId)
    };
  }

  /**
   * 获取全服统计
   */
  getServerStats(): {
    totalPlayers: number;
    averageLevel: number;
    totalBattles: number;
    totalScoreSubmitted: number;
    highestScore: number;
  } {
    return {
      totalPlayers: Math.floor(Math.random() * 100000) + 1000,
      averageLevel: Math.floor(Math.random() * 30) + 10,
      totalBattles: Math.floor(Math.random() * 10000000),
      totalScoreSubmitted: Math.floor(Math.random() * 1000000000),
      highestScore: 999999
    };
  }
}

export const socialService = SocialService.getInstance();
