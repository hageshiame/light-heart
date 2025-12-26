/**
 * Type Definitions for Light Heart Game
 * 
 * This file contains all TypeScript interfaces and types
 * used throughout the frontend and backend.
 */

// ============================================================
// Account & Authentication
// ============================================================

export interface Account {
  id: string;
  wechat_openid: string;
  wechat_nickname?: string;
  wechat_avatar_url?: string;
  level: number;
  exp: number;
  gold: number;
  created_at: Date;
  last_login?: Date;
  last_sync?: Date;
}

export interface LoginRequest {
  code: string;
  encryptedData?: string;
  iv?: string;
}

export interface LoginResponse {
  success: boolean;
  sessionToken: string;
  playerId: string;
  message?: string;
  error?: string;
}

export interface TokenPayload {
  playerId: string;
  timestamp: number;
}

// ============================================================
// Character & Equipment
// ============================================================

export interface Character {
  id: string;
  player_id: string;
  character_id: string;
  name: string;
  level: number;
  exp: number;
  health: number;
  max_health: number;
  attack_power: number;
  defense: number;
  speed: number;
  skill_points: number;
  created_at: Date;
  updated_at: Date;
}

export interface Equipment {
  id: string;
  player_id: string;
  equipment_id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  attack_bonus: number;
  defense_bonus: number;
  speed_bonus: number;
  health_bonus: number;
  quantity: number;
  created_at: Date;
}

// ============================================================
// Battle & Combat
// ============================================================

export interface BattleResult {
  mapId: string;
  characterId: string;
  score: number;
  damageDealt: number;
  damageReceived: number;
  duration: number;
  extractSuccess: boolean;
  lostItems?: Item[];
  rewards?: BattleReward;
  signature?: string;
  clientTimestamp?: number;
}

export interface BattleRecord {
  id: string;
  player_id: string;
  map_id: string;
  character_id?: string;
  score: number;
  damage_dealt: number;
  damage_received: number;
  clear_time: number;
  extract_success: boolean;
  lost_items?: Item[];
  rewards?: BattleReward;
  signature?: string;
  client_timestamp?: number;
  created_at: Date;
}

export interface BattleReward {
  gold: number;
  exp: number;
  items?: Item[];
}

export interface Item {
  id: string;
  name: string;
  value: number;
  count: number;
}

// ============================================================
// Leaderboard
// ============================================================

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  nickname: string;
  score: number;
  mapId: string;
  timestamp: number;
}

export interface LeaderboardResponse {
  success: boolean;
  data: LeaderboardEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface SubmitScoreRequest {
  playerId: string;
  mapId: string;
  score: number;
  damageDealt: number;
  damageReceived: number;
  clearTime: number;
  extractSuccess: boolean;
  signature: string;
  clientTimestamp: number;
}

export interface SubmitScoreResponse {
  success: boolean;
  rank: number;
  message: string;
}

// ============================================================
// Rescue System
// ============================================================

export interface RescueRequest {
  id: string;
  requester_id: string;
  rescuer_id?: string;
  map_id: string;
  lost_items: Item[];
  total_value: number;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  reward_gold: number;
  reward_exp: number;
  created_at: Date;
  expires_at: Date;
  completed_at?: Date;
}

export interface CreateRescueRequest {
  playerId: string;
  mapId: string;
  failedTime: number;
  lostItems: Item[];
  totalValue: number;
}

export interface CreateRescueResponse {
  success: boolean;
  requestId: string;
  rescueUrl: string;
  expiresAt: number;
  message: string;
}

export interface CompleteRescueRequest {
  requestId: string;
  heroId: string;
  completedTime: number;
  signature: string;
}

export interface CompleteRescueResponse {
  success: boolean;
  message: string;
  heroReward: { gold: number; exp: number };
  playerReward: Item[];
}

// ============================================================
// Data Synchronization
// ============================================================

export interface SyncData {
  characters: Character[];
  equipment: Equipment[];
  achievements: Achievement[];
  timestamp: number;
}

export interface SyncPayload {
  playerId: string;
  data: SyncData;
}

export interface SyncResponse {
  success: boolean;
  message: string;
  syncedAt: number;
  nextSyncTime: number;
}

export interface IncrementalUpdate {
  characters: Character[];
  equipment: Equipment[];
  achievements: Achievement[];
  leaderboard: LeaderboardEntry[];
  lastUpdate: number;
}

// ============================================================
// Anti-Cheat
// ============================================================

export interface AnomalyReport {
  playerId: string;
  anomalyType: 'score_anomaly' | 'speed_hack' | 'memory_tamper' | 'signature_mismatch' | 'other';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  details?: Record<string, any>;
  timestamp: number;
}

export interface AnomalyReportResponse {
  success: boolean;
  message: string;
  reportedAt: number;
}

// ============================================================
// Achievements
// ============================================================

export interface Achievement {
  id: string;
  achievement_id: string;
  name: string;
  description: string;
  unlocked_at?: number;
  progress: number;
}

// ============================================================
// Network & Sync Queue
// ============================================================

export interface SyncTask {
  method: string;
  path: string;
  payload?: any;
  priority: 'critical' | 'important' | 'auxiliary';
  retryCount?: number;
  timestamp?: number;
}

export interface NetworkStatus {
  size: number;
  offline: boolean;
  sessionToken: boolean;
}

// ============================================================
// Error Handling
// ============================================================

export interface ApiError {
  success: false;
  error: string;
  message: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  [key: string]: any;
}

// ============================================================
// Local Storage Models (SQLite)
// ============================================================

export interface LocalCharacter extends Character {
  encrypted?: boolean;
}

export interface LocalEquipment extends Equipment {
  encrypted?: boolean;
}

export interface LocalBattleRecord extends BattleRecord {
  synced?: boolean;
  sync_failed?: boolean;
}

export interface LocalAchievement extends Achievement {
  synced?: boolean;
}

// ============================================================
// Configuration
// ============================================================

export interface GameConfig {
  apiBaseUrl: string;
  wsUrl?: string;
  cryptoKey: string;
  syncInterval: number;
  backupInterval: number;
  requestTimeout: {
    critical: number;
    important: number;
    auxiliary: number;
  };
  retryPolicy: {
    critical: number[];
    important: number[];
    auxiliary: number[];
  };
}

export interface ServerConfig {
  port: number;
  nodeEnv: 'development' | 'staging' | 'production';
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
  jwt: {
    secret: string;
    expire: string;
  };
  cors: {
    origin: string[];
  };
}

// ============================================================
// Enums
// ============================================================

export enum RarityLevel {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

export enum AnomalyType {
  SCORE_ANOMALY = 'score_anomaly',
  SPEED_HACK = 'speed_hack',
  MEMORY_TAMPER = 'memory_tamper',
  SIGNATURE_MISMATCH = 'signature_mismatch',
  OTHER = 'other'
}

export enum SyncPriority {
  CRITICAL = 'critical',
  IMPORTANT = 'important',
  AUXILIARY = 'auxiliary'
}

export enum RescueStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

// ============================================================
// Export Type Unions
// ============================================================

export type Entity = Account | Character | Equipment | Achievement;
export type BattleEntity = BattleRecord | BattleReward;
export type RescueEntity = RescueRequest | RescueStatus;
