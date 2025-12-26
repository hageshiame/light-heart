-- ============================================================
-- Light Heart Game - SQLite Local Database Schema
-- ============================================================
-- Created: 2025-12-26
-- Platform: WeChat Mini Program (Local Storage Simulation)
-- ============================================================

-- ============================================================
-- Table 1: local_characters (本地角色数据)
-- ============================================================
CREATE TABLE IF NOT EXISTS local_characters (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  name TEXT,
  level INTEGER DEFAULT 1,
  exp INTEGER DEFAULT 0,
  health INTEGER,
  max_health INTEGER,
  attack_power INTEGER,
  defense INTEGER,
  speed INTEGER,
  skill_points INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER
);

-- ============================================================
-- Table 2: local_equipment (本地装备数据)
-- ============================================================
CREATE TABLE IF NOT EXISTS local_equipment (
  id TEXT PRIMARY KEY,
  equipment_id TEXT NOT NULL,
  name TEXT,
  rarity TEXT DEFAULT 'common',
  attack_bonus INTEGER DEFAULT 0,
  defense_bonus INTEGER DEFAULT 0,
  speed_bonus INTEGER DEFAULT 0,
  health_bonus INTEGER DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  created_at INTEGER
);

-- ============================================================
-- Table 3: local_achievements (本地成就数据)
-- ============================================================
CREATE TABLE IF NOT EXISTS local_achievements (
  id TEXT PRIMARY KEY,
  achievement_id TEXT NOT NULL,
  name TEXT,
  description TEXT,
  unlocked_at INTEGER NULL,
  progress INTEGER DEFAULT 0
);

-- ============================================================
-- Table 4: local_battle_records (本地战斗记录)
-- ============================================================
CREATE TABLE IF NOT EXISTS local_battle_records (
  id TEXT PRIMARY KEY,
  map_id TEXT,
  character_id TEXT,
  score INTEGER,
  damage_dealt INTEGER DEFAULT 0,
  damage_received INTEGER DEFAULT 0,
  clear_time INTEGER DEFAULT 0,
  extract_success BOOLEAN DEFAULT 0,
  lost_items TEXT,
  created_at INTEGER
);

-- ============================================================
-- Table 5: sync_queue (同步队列 - 失败任务持久化)
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  method TEXT,
  path TEXT,
  payload TEXT,
  priority TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_local_characters_character_id ON local_characters(character_id);
CREATE INDEX IF NOT EXISTS idx_local_equipment_rarity ON local_equipment(rarity);
CREATE INDEX IF NOT EXISTS idx_local_achievements_unlocked ON local_achievements(unlocked_at);
CREATE INDEX IF NOT EXISTS idx_local_battle_records_map ON local_battle_records(map_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON sync_queue(priority);

-- ============================================================
-- End of Local Schema
-- ============================================================
