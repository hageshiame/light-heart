import { v4 as uuid } from 'uuid';
import DatabaseManager from '../db/DatabaseManager';
import CacheStrategy from '../db/CacheStrategy';
import { Account, LoginRequest, LoginResponse } from '../types/index';
import jwt from 'jsonwebtoken';

/**
 * Account Service
 * Handles user account operations: creation, login, profile updates
 */
class AccountService {
  /**
   * Create new account from WeChat login
   */
  async createAccountFromWeChat(
    wechat_openid: string,
    wechat_nickname?: string,
    wechat_avatar_url?: string
  ): Promise<Account> {
    const playerId = uuid();
    
    const sql = `
      INSERT INTO accounts (id, wechat_openid, wechat_nickname, wechat_avatar_url, level, gold, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;

    const values = [playerId, wechat_openid, wechat_nickname || '', wechat_avatar_url || '', 1, 0];
    
    await DatabaseManager.insert(sql, values);

    return this.getAccountById(playerId) as Promise<Account>;
  }

  /**
   * Get account by ID (with cache)
   */
  async getAccountById(playerId: string): Promise<Account | null> {
    // 尝试从缓存获取
    const cachedAccount = await CacheStrategy.getPlayerData<Account>(playerId);
    if (cachedAccount) {
      console.log(`✓ 缓存命中: player:data:${playerId}`);
      return cachedAccount;
    }

    const sql = `
      SELECT id, wechat_openid, wechat_nickname, wechat_avatar_url, level, exp, gold, 
             created_at, last_login, last_sync
      FROM accounts
      WHERE id = ? AND deleted_at IS NULL
    `;

    const account = await DatabaseManager.queryOne<Account>(sql, [playerId]);
    
    // 写入缓存
    if (account) {
      await CacheStrategy.setPlayerData(playerId, account);
    }
    
    return account;
  }

  /**
   * Get account by WeChat OpenID
   */
  async getAccountByOpenID(wechat_openid: string): Promise<Account | null> {
    const sql = `
      SELECT id, wechat_openid, wechat_nickname, wechat_avatar_url, level, exp, gold,
             created_at, last_login, last_sync
      FROM accounts
      WHERE wechat_openid = ? AND deleted_at IS NULL
    `;

    return DatabaseManager.queryOne<Account>(sql, [wechat_openid]);
  }

  /**
   * Update last login time
   */
  async updateLastLogin(playerId: string): Promise<void> {
    const sql = `
      UPDATE accounts
      SET last_login = NOW()
      WHERE id = ?
    `;

    await DatabaseManager.update(sql, [playerId]);
    
    // 清除缓存
    await CacheStrategy.invalidatePlayerData(playerId);
  }

  /**
   * Update last sync time
   */
  async updateLastSync(playerId: string): Promise<void> {
    const sql = `
      UPDATE accounts
      SET last_sync = NOW()
      WHERE id = ?
    `;

    await DatabaseManager.update(sql, [playerId]);
    
    // 清除缓存
    await CacheStrategy.invalidatePlayerData(playerId);
  }

  /**
   * Add gold to account
   */
  async addGold(playerId: string, amount: number): Promise<void> {
    const sql = `
      UPDATE accounts
      SET gold = gold + ?
      WHERE id = ?
    `;

    await DatabaseManager.update(sql, [amount, playerId]);
    
    // 清除缓存
    await CacheStrategy.invalidatePlayerData(playerId);
  }

  /**
   * Add experience to account
   */
  async addExp(playerId: string, amount: number): Promise<void> {
    const sql = `
      UPDATE accounts
      SET exp = exp + ?
      WHERE id = ?
    `;

    await DatabaseManager.update(sql, [amount, playerId]);
    
    // 清除缓存
    await CacheStrategy.invalidatePlayerData(playerId);
  }

  /**
   * Soft delete account
   */
  async deleteAccount(playerId: string): Promise<void> {
    const sql = `
      UPDATE accounts
      SET deleted_at = NOW()
      WHERE id = ?
    `;

    await DatabaseManager.update(sql, [playerId]);
  }

  /**
   * Check if account exists
   */
  async exists(playerId: string): Promise<boolean> {
    const account = await this.getAccountById(playerId);
    return account !== null;
  }
}

export default new AccountService();
