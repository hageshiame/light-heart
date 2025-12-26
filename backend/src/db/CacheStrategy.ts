import RedisManager from './RedisManager';

/**
 * 缓存策略管理器
 * 统一管理排行榜、玩家数据、排名等缓存
 */

export interface CacheConfig {
  leaderboardTTL: number;      // 排行榜缓存过期时间（ms）
  playerDataTTL: number;       // 玩家数据缓存过期时间（ms）
  playerRankTTL: number;       // 玩家排名缓存过期时间（ms）
  battleHistoryTTL: number;    // 战斗历史缓存过期时间（ms）
}

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  leaderboardTTL: 5 * 60 * 1000,      // 5 分钟
  playerDataTTL: 10 * 60 * 1000,      // 10 分钟
  playerRankTTL: 5 * 60 * 1000,       // 5 分钟
  battleHistoryTTL: 15 * 60 * 1000,   // 15 分钟
};

export class CacheStrategy {
  private static instance: CacheStrategy;
  private config: CacheConfig;

  private constructor(config: CacheConfig = DEFAULT_CACHE_CONFIG) {
    this.config = config;
  }

  static getInstance(config?: CacheConfig): CacheStrategy {
    if (!CacheStrategy.instance) {
      CacheStrategy.instance = new CacheStrategy(config);
    }
    return CacheStrategy.instance;
  }

  /**
   * 更新缓存配置
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // ==================== 排行榜缓存 ====================

  /**
   * 获取排行榜缓存键
   */
  getLeaderboardKey(mapId: string): string {
    return `leaderboard:map:${mapId}`;
  }

  /**
   * 获取排行榜缓存
   */
  async getLeaderboard<T>(mapId: string): Promise<T | null> {
    const key = this.getLeaderboardKey(mapId);
    return RedisManager.get<T>(key);
  }

  /**
   * 设置排行榜缓存
   */
  async setLeaderboard<T>(mapId: string, data: T): Promise<void> {
    const key = this.getLeaderboardKey(mapId);
    await RedisManager.set(key, data, this.config.leaderboardTTL);
  }

  /**
   * 清除排行榜缓存
   */
  async invalidateLeaderboard(mapId?: string): Promise<void> {
    if (mapId) {
      await RedisManager.delete(this.getLeaderboardKey(mapId));
    } else {
      // 清除所有排行榜缓存
      // 注：实际实现中可能需要使用 Redis 的 SCAN 命令
      console.log('⚠️  invalidateLeaderboard: 清除所有排行榜缓存需要额外的 Redis 命令支持');
    }
  }

  // ==================== 玩家数据缓存 ====================

  /**
   * 获取玩家数据缓存键
   */
  getPlayerDataKey(playerId: string): string {
    return `player:data:${playerId}`;
  }

  /**
   * 获取玩家数据缓存
   */
  async getPlayerData<T>(playerId: string): Promise<T | null> {
    const key = this.getPlayerDataKey(playerId);
    return RedisManager.get<T>(key);
  }

  /**
   * 设置玩家数据缓存
   */
  async setPlayerData<T>(playerId: string, data: T): Promise<void> {
    const key = this.getPlayerDataKey(playerId);
    await RedisManager.set(key, data, this.config.playerDataTTL);
  }

  /**
   * 清除玩家数据缓存
   */
  async invalidatePlayerData(playerId: string): Promise<void> {
    const key = this.getPlayerDataKey(playerId);
    await RedisManager.delete(key);
  }

  // ==================== 玩家排名缓存 ====================

  /**
   * 获取玩家排名缓存键
   */
  getPlayerRankKey(playerId: string, mapId: string): string {
    return `player:rank:${playerId}:map:${mapId}`;
  }

  /**
   * 获取玩家排名缓存
   */
  async getPlayerRank<T>(playerId: string, mapId: string): Promise<T | null> {
    const key = this.getPlayerRankKey(playerId, mapId);
    return RedisManager.get<T>(key);
  }

  /**
   * 设置玩家排名缓存
   */
  async setPlayerRank<T>(playerId: string, mapId: string, rank: T): Promise<void> {
    const key = this.getPlayerRankKey(playerId, mapId);
    await RedisManager.set(key, rank, this.config.playerRankTTL);
  }

  /**
   * 清除玩家排名缓存
   */
  async invalidatePlayerRank(playerId: string, mapId?: string): Promise<void> {
    if (mapId) {
      const key = this.getPlayerRankKey(playerId, mapId);
      await RedisManager.delete(key);
    } else {
      // 清除该玩家所有地图的排名缓存
      console.log(`⚠️  invalidatePlayerRank: 清除玩家 ${playerId} 所有排名缓存`);
    }
  }

  // ==================== 战斗历史缓存 ====================

  /**
   * 获取战斗历史缓存键
   */
  getBattleHistoryKey(playerId: string, limit: number = 10, offset: number = 0): string {
    return `battle:history:${playerId}:limit:${limit}:offset:${offset}`;
  }

  /**
   * 获取战斗历史缓存
   */
  async getBattleHistory<T>(playerId: string, limit: number = 10, offset: number = 0): Promise<T | null> {
    const key = this.getBattleHistoryKey(playerId, limit, offset);
    return RedisManager.get<T>(key);
  }

  /**
   * 设置战斗历史缓存
   */
  async setBattleHistory<T>(playerId: string, data: T, limit: number = 10, offset: number = 0): Promise<void> {
    const key = this.getBattleHistoryKey(playerId, limit, offset);
    await RedisManager.set(key, data, this.config.battleHistoryTTL);
  }

  /**
   * 清除玩家所有战斗历史缓存
   */
  async invalidateBattleHistory(playerId: string): Promise<void> {
    // 注：实际实现需要跟踪所有可能的分页组合
    console.log(`⚠️  invalidateBattleHistory: 清除玩家 ${playerId} 所有战斗历史缓存`);
  }

  // ==================== 会话缓存 ====================

  /**
   * 获取会话缓存键
   */
  getSessionKey(playerId: string): string {
    return `session:${playerId}`;
  }

  /**
   * 获取会话数据
   */
  async getSession<T>(playerId: string): Promise<T | null> {
    const key = this.getSessionKey(playerId);
    return RedisManager.get<T>(key);
  }

  /**
   * 设置会话数据
   */
  async setSession<T>(playerId: string, data: T, expirationMs?: number): Promise<void> {
    const key = this.getSessionKey(playerId);
    const ttl = expirationMs || 24 * 60 * 60 * 1000; // 默认 24 小时
    await RedisManager.set(key, data, ttl);
  }

  /**
   * 清除会话数据
   */
  async invalidateSession(playerId: string): Promise<void> {
    const key = this.getSessionKey(playerId);
    await RedisManager.delete(key);
  }

  // ==================== 缓存工具 ====================

  /**
   * 预热缓存（启动时调用）
   */
  async warmupCache(): Promise<void> {
    console.log('🔄 预热缓存中...');
    // 这里可以添加预加载常用数据的逻辑
    console.log('✓ 缓存预热完成');
  }

  /**
   * 清空所有缓存
   */
  async clearAll(): Promise<void> {
    console.log('🗑️  清除所有缓存...');
    await RedisManager.flushAll();
    console.log('✓ 缓存已清除');
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<Record<string, any>> {
    const stats = await RedisManager.getStats();
    return {
      connected: stats.connected,
      memory_used: stats.used_memory_human || 'N/A',
      memory_peak: stats.used_memory_peak_human || 'N/A',
      clients: stats.connected_clients || 0,
      commands: stats.total_commands_processed || 0,
    };
  }
}

export default CacheStrategy.getInstance();
