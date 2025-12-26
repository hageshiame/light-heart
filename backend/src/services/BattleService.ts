import { v4 as uuid } from 'uuid';
import DatabaseManager from '../db/DatabaseManager';
import CacheStrategy from '../db/CacheStrategy';
import { BattleRecord, SubmitScoreRequest, LeaderboardEntry } from '../types/index';

/**
 * Battle & Leaderboard Service
 * Handles battle record storage and leaderboard ranking
 */
class BattleService {
  /**
   * Submit battle score (Layer 1: Critical)
   */
  async submitBattleScore(scoreRequest: SubmitScoreRequest): Promise<BattleRecord> {
    const battleId = uuid();

    const sql = `
      INSERT INTO battle_records (
        id, player_id, map_id, score, damage_dealt, damage_received,
        clear_time, extract_success, signature, client_timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const values = [
      battleId,
      scoreRequest.playerId,
      scoreRequest.mapId,
      scoreRequest.score,
      scoreRequest.damageDealt,
      scoreRequest.damageReceived,
      scoreRequest.clearTime,
      scoreRequest.extractSuccess ? 1 : 0,
      scoreRequest.signature,
      scoreRequest.clientTimestamp
    ];

    await DatabaseManager.insert(sql, values);

    // Update leaderboard cache
    await this.updateLeaderboardCache(scoreRequest.playerId, scoreRequest.mapId, scoreRequest.score);

    return this.getBattleRecord(battleId) as Promise<BattleRecord>;
  }

  /**
   * Get battle record by ID
   */
  async getBattleRecord(battleId: string): Promise<BattleRecord | null> {
    const sql = `
      SELECT id, player_id, map_id, character_id, score, damage_dealt, damage_received,
             clear_time, extract_success, lost_items, rewards, signature, client_timestamp, created_at
      FROM battle_records
      WHERE id = ?
    `;

    return DatabaseManager.queryOne<BattleRecord>(sql, [battleId]);
  }

  /**
   * Get player's battle history (with cache)
   */
  async getPlayerBattleHistory(playerId: string, limit: number = 20, offset: number = 0): Promise<BattleRecord[]> {
    // 尝试从缓存获取
    const cacheKey = `battle-history-${playerId}-${limit}-${offset}`;
    const cachedData = await CacheStrategy.getBattleHistory<BattleRecord[]>(playerId, limit, offset);
    if (cachedData) {
      console.log(`✓ 缓存命中: ${cacheKey}`);
      return cachedData;
    }

    const sql = `
      SELECT id, player_id, map_id, character_id, score, damage_dealt, damage_received,
             clear_time, extract_success, created_at
      FROM battle_records
      WHERE player_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const records = await DatabaseManager.query<BattleRecord>(sql, [playerId, limit, offset]);
    
    // 写入缓存
    await CacheStrategy.setBattleHistory(playerId, records, limit, offset);
    return records;
  }

  /**
   * Get leaderboard rankings by map (with cache)
   */
  async getLeaderboard(mapId?: string, limit: number = 100, offset: number = 0): Promise<LeaderboardEntry[]> {
    // 尝试从缓存获取
    if (mapId) {
      const cachedLeaderboard = await CacheStrategy.getLeaderboard<LeaderboardEntry[]>(mapId);
      if (cachedLeaderboard) {
        console.log(`✓ 缓存命中: leaderboard:${mapId}`);
        return cachedLeaderboard.slice(offset, offset + limit);
      }
    }

    let sql = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY br.score DESC) as rank,
        a.id as playerId,
        a.wechat_nickname as nickname,
        br.score,
        br.map_id as mapId,
        br.created_at as timestamp
      FROM battle_records br
      JOIN accounts a ON br.player_id = a.id
    `;

    const values: any[] = [];

    if (mapId) {
      sql += ` WHERE br.map_id = ?`;
      values.push(mapId);
    }

    sql += ` ORDER BY br.score DESC LIMIT ? OFFSET ?`;
    values.push(limit, offset);

    const leaderboard = await DatabaseManager.query<LeaderboardEntry>(sql, values);
    
    // 写入缓存（仅缓存完整排行榜）
    if (mapId && offset === 0) {
      const fullLeaderboardSql = sql.replace('LIMIT ? OFFSET ?', '');
      const fullLeaderboard = await DatabaseManager.query<LeaderboardEntry>(fullLeaderboardSql, values.slice(0, -2));
      await CacheStrategy.setLeaderboard(mapId, fullLeaderboard);
    }
    
    return leaderboard;
  }

  /**
   * Get player's rank on leaderboard (with cache)
   */
  async getPlayerRank(playerId: string, mapId?: string): Promise<number> {
    // 尝试从缓存获取
    if (mapId) {
      const cachedRank = await CacheStrategy.getPlayerRank<number>(playerId, mapId);
      if (cachedRank !== null) {
        console.log(`✓ 缓存命中: player:rank:${playerId}:map:${mapId}`);
        return cachedRank;
      }
    }

    let sql = `
      SELECT COUNT(*) + 1 as rank
      FROM battle_records br1
      WHERE br1.score > (
        SELECT MAX(br2.score)
        FROM battle_records br2
        WHERE br2.player_id = ?
      )
    `;

    const values = [playerId];

    if (mapId) {
      sql = sql.replace('WHERE br1.score >', `WHERE br1.map_id = ? AND br1.score >`);
      values.unshift(mapId);
    }

    const result = await DatabaseManager.queryOne<{ rank: number }>(sql, values);
    const rank = result?.rank || 1;
    
    // 写入缓存
    if (mapId) {
      await CacheStrategy.setPlayerRank(playerId, mapId, rank);
    }
    
    return rank;
  }

  /**
   * Update leaderboard cache (database + Redis)
   */
  private async updateLeaderboardCache(
    playerId: string,
    mapId: string,
    score: number
  ): Promise<void> {
    // 更新数据库缓存表
    const exists = await DatabaseManager.queryOne<{ id: string }>(
      'SELECT id FROM leaderboard_cache WHERE player_id = ? AND map_id = ?',
      [playerId, mapId]
    );

    if (exists) {
      const sql = `
        UPDATE leaderboard_cache
        SET score = GREATEST(score, ?), updated_at = NOW()
        WHERE player_id = ? AND map_id = ?
      `;
      await DatabaseManager.update(sql, [score, playerId, mapId]);
    } else {
      const cacheId = uuid();
      const sql = `
        INSERT INTO leaderboard_cache (id, player_id, map_id, score, cached_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
      `;
      await DatabaseManager.insert(sql, [cacheId, playerId, mapId, score]);
    }
    
    // 清除 Redis 排行榜缓存
    await CacheStrategy.invalidateLeaderboard(mapId);
    // 清除玩家排名缓存
    await CacheStrategy.invalidatePlayerRank(playerId, mapId);
    // 清除战斗历史缓存
    await CacheStrategy.invalidateBattleHistory(playerId);
  }

  /**
   * Get player's best score on specific map
   */
  async getPlayerBestScore(playerId: string, mapId: string): Promise<number> {
    const sql = `
      SELECT MAX(score) as best_score
      FROM battle_records
      WHERE player_id = ? AND map_id = ?
    `;

    const result = await DatabaseManager.queryOne<{ best_score: number }>(sql, [playerId, mapId]);
    return result?.best_score || 0;
  }

  /**
   * Get total battles count
   */
  async getTotalBattlesCount(playerId: string): Promise<number> {
    const sql = `
      SELECT COUNT(*) as total
      FROM battle_records
      WHERE player_id = ?
    `;

    const result = await DatabaseManager.queryOne<{ total: number }>(sql, [playerId]);
    return result?.total || 0;
  }

  /**
   * Get average score
   */
  async getAverageScore(playerId: string): Promise<number> {
    const sql = `
      SELECT AVG(score) as avg_score
      FROM battle_records
      WHERE player_id = ?
    `;

    const result = await DatabaseManager.queryOne<{ avg_score: number }>(sql, [playerId]);
    return Math.round(result?.avg_score || 0);
  }
}

export default new BattleService();
