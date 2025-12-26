import { v4 as uuid } from 'uuid';
import DatabaseManager from '../db/DatabaseManager';
import { RescueRequest, CreateRescueRequest, CompleteRescueRequest } from '../types/index';
import AccountService from './AccountService';

/**
 * Rescue System Service
 * Handles rescue request creation, management, and completion
 */
class RescueService {
  /**
   * Create rescue request (Layer 2: Important)
   */
  async createRescueRequest(rescueData: CreateRescueRequest): Promise<RescueRequest> {
    const rescueId = uuid();
    const expiresAt = new Date(rescueData.failedTime + 86400000); // 24 hours

    const sql = `
      INSERT INTO rescue_requests (
        id, requester_id, map_id, lost_items, total_value, status, 
        reward_gold, reward_exp, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
    `;

    const values = [
      rescueId,
      rescueData.playerId,
      rescueData.mapId,
      JSON.stringify(rescueData.lostItems),
      rescueData.totalValue,
      'pending',
      500, // reward_gold
      200, // reward_exp
      expiresAt
    ];

    await DatabaseManager.insert(sql, values);

    return this.getRescueRequest(rescueId) as Promise<RescueRequest>;
  }

  /**
   * Get rescue request by ID
   */
  async getRescueRequest(rescueId: string): Promise<RescueRequest | null> {
    const sql = `
      SELECT id, requester_id, rescuer_id, map_id, lost_items, total_value, status,
             reward_gold, reward_exp, created_at, expires_at, completed_at
      FROM rescue_requests
      WHERE id = ?
    `;

    const result = await DatabaseManager.queryOne<any>(sql, [rescueId]);
    
    if (result && typeof result.lost_items === 'string') {
      result.lost_items = JSON.parse(result.lost_items);
    }

    return result as RescueRequest | null;
  }

  /**
   * Get pending rescue requests (for open world)
   */
  async getPendingRescues(limit: number = 20, offset: number = 0): Promise<RescueRequest[]> {
    const sql = `
      SELECT id, requester_id, rescuer_id, map_id, lost_items, total_value, status,
             reward_gold, reward_exp, created_at, expires_at, completed_at
      FROM rescue_requests
      WHERE status = 'pending' AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const results = await DatabaseManager.query<any>(sql, [limit, offset]);
    
    return results.map(r => ({
      ...r,
      lost_items: typeof r.lost_items === 'string' ? JSON.parse(r.lost_items) : r.lost_items
    })) as RescueRequest[];
  }

  /**
   * Complete rescue request
   */
  async completeRescue(completeData: CompleteRescueRequest): Promise<RescueRequest> {
    const rescue = await this.getRescueRequest(completeData.requestId);
    
    if (!rescue) {
      throw new Error('Rescue request not found');
    }

    if (rescue.status !== 'pending') {
      throw new Error('Rescue request is not pending');
    }

    // Check expiration
    const expiresAt = new Date(rescue.expires_at).getTime();
    if (Date.now() > expiresAt) {
      // Mark as expired
      await this.updateRescueStatus(completeData.requestId, 'expired');
      throw new Error('Rescue request has expired');
    }

    // Update rescue status
    const sql = `
      UPDATE rescue_requests
      SET rescuer_id = ?, status = 'completed', completed_at = NOW()
      WHERE id = ?
    `;

    await DatabaseManager.update(sql, [completeData.heroId, completeData.requestId]);

    // Award rescuer
    await AccountService.addGold(completeData.heroId, rescue.reward_gold);
    await AccountService.addExp(completeData.heroId, rescue.reward_exp);

    return this.getRescueRequest(completeData.requestId) as Promise<RescueRequest>;
  }

  /**
   * Cancel rescue request
   */
  async cancelRescue(rescueId: string, playerId: string): Promise<void> {
    const rescue = await this.getRescueRequest(rescueId);
    
    if (!rescue) {
      throw new Error('Rescue request not found');
    }

    if (rescue.requester_id !== playerId) {
      throw new Error('Unauthorized');
    }

    if (rescue.status !== 'pending') {
      throw new Error('Cannot cancel non-pending request');
    }

    await this.updateRescueStatus(rescueId, 'cancelled');
  }

  /**
   * Update rescue status
   */
  private async updateRescueStatus(
    rescueId: string,
    status: 'pending' | 'completed' | 'expired' | 'cancelled'
  ): Promise<void> {
    const sql = `
      UPDATE rescue_requests
      SET status = ?
      WHERE id = ?
    `;

    await DatabaseManager.update(sql, [status, rescueId]);
  }

  /**
   * Get player's rescue requests
   */
  async getPlayerRescueRequests(
    playerId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<RescueRequest[]> {
    const sql = `
      SELECT id, requester_id, rescuer_id, map_id, lost_items, total_value, status,
             reward_gold, reward_exp, created_at, expires_at, completed_at
      FROM rescue_requests
      WHERE requester_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const results = await DatabaseManager.query<any>(sql, [playerId, limit, offset]);
    
    return results.map(r => ({
      ...r,
      lost_items: typeof r.lost_items === 'string' ? JSON.parse(r.lost_items) : r.lost_items
    })) as RescueRequest[];
  }

  /**
   * Get rescue requests completed by rescuer
   */
  async getRescuerCompletedRescues(
    rescuerId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<RescueRequest[]> {
    const sql = `
      SELECT id, requester_id, rescuer_id, map_id, lost_items, total_value, status,
             reward_gold, reward_exp, created_at, expires_at, completed_at
      FROM rescue_requests
      WHERE rescuer_id = ? AND status = 'completed'
      ORDER BY completed_at DESC
      LIMIT ? OFFSET ?
    `;

    const results = await DatabaseManager.query<any>(sql, [rescuerId, limit, offset]);
    
    return results.map(r => ({
      ...r,
      lost_items: typeof r.lost_items === 'string' ? JSON.parse(r.lost_items) : r.lost_items
    })) as RescueRequest[];
  }

  /**
   * Get rescue statistics
   */
  async getRescueStats(playerId: string): Promise<{
    total_requested: number;
    total_completed: number;
    total_rescued: number;
  }> {
    const requestedSql = `SELECT COUNT(*) as count FROM rescue_requests WHERE requester_id = ?`;
    const completedSql = `SELECT COUNT(*) as count FROM rescue_requests WHERE requester_id = ? AND status = 'completed'`;
    const rescuedSql = `SELECT COUNT(*) as count FROM rescue_requests WHERE rescuer_id = ? AND status = 'completed'`;

    const [requested, completed, rescued] = await Promise.all([
      DatabaseManager.queryOne<{ count: number }>(requestedSql, [playerId]),
      DatabaseManager.queryOne<{ count: number }>(completedSql, [playerId]),
      DatabaseManager.queryOne<{ count: number }>(rescuedSql, [playerId])
    ]);

    return {
      total_requested: requested?.count || 0,
      total_completed: completed?.count || 0,
      total_rescued: rescued?.count || 0
    };
  }
}

export default new RescueService();
