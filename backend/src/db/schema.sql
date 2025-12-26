-- ============================================================
-- Light Heart Game - MySQL Database Schema
-- ============================================================
-- Created: 2025-12-26
-- Version: 1.0
-- Database: light_heart_game
-- ============================================================

-- Drop existing tables (for clean migration)
DROP TABLE IF EXISTS anticheat_reports;
DROP TABLE IF EXISTS battle_records;
DROP TABLE IF EXISTS rescue_requests;
DROP TABLE IF EXISTS leaderboard_cache;
DROP TABLE IF EXISTS equipment;
DROP TABLE IF EXISTS characters;
DROP TABLE IF EXISTS accounts;

-- ============================================================
-- Table 1: accounts (用户账户表)
-- ============================================================
CREATE TABLE accounts (
  id VARCHAR(36) PRIMARY KEY COMMENT '玩家ID (UUID)',
  wechat_openid VARCHAR(255) UNIQUE NOT NULL COMMENT '微信OpenID',
  wechat_nickname VARCHAR(255) COMMENT '微信昵称',
  wechat_avatar_url TEXT COMMENT '微信头像',
  level INT DEFAULT 1 COMMENT '玩家等级',
  exp INT DEFAULT 0 COMMENT '当前经验值',
  gold INT DEFAULT 0 COMMENT '金币余额',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  last_login TIMESTAMP NULL COMMENT '最后登录时间',
  last_sync TIMESTAMP NULL COMMENT '最后同步时间',
  deleted_at TIMESTAMP NULL COMMENT '软删除时间',
  
  INDEX idx_openid (wechat_openid),
  INDEX idx_created_at (created_at),
  INDEX idx_level (level DESC),
  INDEX idx_last_login (last_login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='玩家账户表';

-- ============================================================
-- Table 2: characters (角色数据表)
-- ============================================================
CREATE TABLE characters (
  id VARCHAR(36) PRIMARY KEY COMMENT '角色ID (UUID)',
  player_id VARCHAR(36) NOT NULL COMMENT '玩家ID',
  character_id VARCHAR(50) NOT NULL COMMENT '角色类型ID (char_001, char_002, ...)',
  name VARCHAR(100) NOT NULL COMMENT '角色名称',
  level INT DEFAULT 1 COMMENT '角色等级',
  exp INT DEFAULT 0 COMMENT '角色经验值',
  health INT DEFAULT 100 COMMENT '当前生命值',
  max_health INT DEFAULT 100 COMMENT '最大生命值',
  attack_power INT DEFAULT 10 COMMENT '攻击力',
  defense INT DEFAULT 5 COMMENT '防御力',
  speed INT DEFAULT 8 COMMENT '速度',
  skill_points INT DEFAULT 0 COMMENT '技能点',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '获得时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  FOREIGN KEY (player_id) REFERENCES accounts(id) ON DELETE CASCADE,
  INDEX idx_player_id (player_id),
  INDEX idx_character_id (character_id),
  INDEX idx_level (level DESC),
  UNIQUE KEY unique_player_char (player_id, character_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='玩家角色表';

-- ============================================================
-- Table 3: equipment (装备表)
-- ============================================================
CREATE TABLE equipment (
  id VARCHAR(36) PRIMARY KEY COMMENT '装备ID (UUID)',
  player_id VARCHAR(36) NOT NULL COMMENT '玩家ID',
  equipment_id VARCHAR(50) NOT NULL COMMENT '装备类型ID',
  name VARCHAR(100) NOT NULL COMMENT '装备名称',
  rarity ENUM('common', 'uncommon', 'rare', 'epic', 'legendary') DEFAULT 'common' COMMENT '稀有度',
  attack_bonus INT DEFAULT 0 COMMENT '攻击加成',
  defense_bonus INT DEFAULT 0 COMMENT '防御加成',
  speed_bonus INT DEFAULT 0 COMMENT '速度加成',
  health_bonus INT DEFAULT 0 COMMENT '生命加成',
  quantity INT DEFAULT 1 COMMENT '数量',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '获得时间',
  
  FOREIGN KEY (player_id) REFERENCES accounts(id) ON DELETE CASCADE,
  INDEX idx_player_id (player_id),
  INDEX idx_equipment_id (equipment_id),
  INDEX idx_rarity (rarity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='玩家装备表';

-- ============================================================
-- Table 4: battle_records (战斗记录表)
-- ============================================================
CREATE TABLE battle_records (
  id VARCHAR(36) PRIMARY KEY COMMENT '战斗记录ID (UUID)',
  player_id VARCHAR(36) NOT NULL COMMENT '玩家ID',
  map_id VARCHAR(50) NOT NULL COMMENT '地图ID',
  character_id VARCHAR(36) COMMENT '使用的角色ID',
  score INT NOT NULL COMMENT '获得分数',
  damage_dealt INT DEFAULT 0 COMMENT '造成伤害',
  damage_received INT DEFAULT 0 COMMENT '受到伤害',
  clear_time INT DEFAULT 0 COMMENT '通关耗时 (秒)',
  extract_success BOOLEAN DEFAULT FALSE COMMENT '是否成功撤离',
  lost_items JSON COMMENT '失落的物品 (JSON数组)',
  rewards JSON COMMENT '奖励 (JSON)',
  signature VARCHAR(255) COMMENT 'HMAC签名',
  client_timestamp BIGINT COMMENT '客户端时间戳',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '服务器创建时间',
  
  FOREIGN KEY (player_id) REFERENCES accounts(id) ON DELETE CASCADE,
  INDEX idx_player_id (player_id),
  INDEX idx_map_id (map_id),
  INDEX idx_score (score DESC),
  INDEX idx_created_at (created_at),
  INDEX idx_player_score (player_id, score DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='战斗记录表 (Layer 1: Critical)';

-- ============================================================
-- Table 5: leaderboard_cache (排行榜缓存表)
-- ============================================================
CREATE TABLE leaderboard_cache (
  id VARCHAR(36) PRIMARY KEY COMMENT '排行榜记录ID',
  player_id VARCHAR(36) NOT NULL COMMENT '玩家ID',
  rank INT COMMENT '当前排名',
  score INT NOT NULL COMMENT '最高分数',
  map_id VARCHAR(50) COMMENT '地图ID',
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '缓存时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  FOREIGN KEY (player_id) REFERENCES accounts(id) ON DELETE CASCADE,
  INDEX idx_rank (rank),
  INDEX idx_score (score DESC),
  INDEX idx_player_id (player_id),
  UNIQUE KEY unique_player_map (player_id, map_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='排行榜缓存表 (由Redis同步)';

-- ============================================================
-- Table 6: rescue_requests (救援请求表)
-- ============================================================
CREATE TABLE rescue_requests (
  id VARCHAR(36) PRIMARY KEY COMMENT '救援ID (UUID)',
  requester_id VARCHAR(36) NOT NULL COMMENT '求救玩家ID',
  rescuer_id VARCHAR(36) COMMENT '救援玩家ID',
  map_id VARCHAR(50) COMMENT '失败地图ID',
  lost_items JSON NOT NULL COMMENT '失落物品 (JSON数组)',
  total_value INT NOT NULL COMMENT '物品总价值',
  status ENUM('pending', 'completed', 'expired', 'cancelled') DEFAULT 'pending' COMMENT '状态',
  reward_gold INT DEFAULT 500 COMMENT '救援奖励金币',
  reward_exp INT DEFAULT 200 COMMENT '救援奖励经验',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  expires_at TIMESTAMP COMMENT '过期时间 (24小时)',
  completed_at TIMESTAMP NULL COMMENT '完成时间',
  
  FOREIGN KEY (requester_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (rescuer_id) REFERENCES accounts(id) ON DELETE SET NULL,
  INDEX idx_requester_id (requester_id),
  INDEX idx_rescuer_id (rescuer_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='救援请求表 (Layer 2: Important)';

-- ============================================================
-- Table 7: anticheat_reports (反作弊上报表)
-- ============================================================
CREATE TABLE anticheat_reports (
  id VARCHAR(36) PRIMARY KEY COMMENT '上报ID (UUID)',
  player_id VARCHAR(36) NOT NULL COMMENT '玩家ID',
  anomaly_type ENUM('score_anomaly', 'speed_hack', 'memory_tamper', 'signature_mismatch', 'other') 
    DEFAULT 'other' COMMENT '异常类型',
  severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low' COMMENT '严重级别',
  details JSON COMMENT '详细信息 (JSON)',
  action_taken VARCHAR(255) COMMENT '采取的行动',
  reviewed BOOLEAN DEFAULT FALSE COMMENT '是否已审核',
  reviewed_at TIMESTAMP NULL COMMENT '审核时间',
  reviewed_by VARCHAR(100) COMMENT '审核员',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  FOREIGN KEY (player_id) REFERENCES accounts(id) ON DELETE CASCADE,
  INDEX idx_player_id (player_id),
  INDEX idx_anomaly_type (anomaly_type),
  INDEX idx_severity (severity),
  INDEX idx_created_at (created_at),
  INDEX idx_reviewed (reviewed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='反作弊上报表 (Layer 4: Async)';

-- ============================================================
-- Indexes for Performance Optimization
-- ============================================================

-- Battle records optimization
ALTER TABLE battle_records ADD FULLTEXT INDEX ft_map_id (map_id);

-- Accounts optimization
ALTER TABLE accounts ADD INDEX idx_deleted_at (deleted_at);

-- Equipment optimization
ALTER TABLE equipment ADD INDEX idx_created_at (created_at);

-- ============================================================
-- Initial Data (Demo)
-- ============================================================

-- Sample account
INSERT INTO accounts (id, wechat_openid, wechat_nickname, level, gold)
VALUES ('player_demo_001', 'oYrBc5A0GxlJMI_PnPQUwqA', 'Demo Player', 1, 0);

-- Sample characters
INSERT INTO characters (id, player_id, character_id, name, level, exp, health, max_health, attack_power, defense, speed)
VALUES 
  ('char_instance_001', 'player_demo_001', 'char_001', '云影', 1, 0, 100, 100, 10, 5, 8),
  ('char_instance_002', 'player_demo_001', 'char_002', '梦炎', 1, 0, 80, 80, 15, 3, 6);

-- ============================================================
-- End of Schema
-- ============================================================
