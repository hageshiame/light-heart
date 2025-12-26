-- ============================================================
-- Light Heart Game - Initial Data Script
-- 初始游戏数据：角色模板、装备模板、地图配置
-- ============================================================

-- 注意：这个脚本在生产环境可选
-- 在生产环境中，初始数据应该通过 API 动态生成

-- ============================================================
-- 禁用外键检查（便于导入）
-- ============================================================
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 清空现有测试数据（可选）
-- ============================================================
-- TRUNCATE TABLE accounts;
-- TRUNCATE TABLE characters;
-- TRUNCATE TABLE equipment;
-- TRUNCATE TABLE battle_records;
-- TRUNCATE TABLE rescue_requests;

-- ============================================================
-- 测试账户数据（用于本地开发）
-- ============================================================

INSERT INTO accounts (
  id, wechat_openid, wechat_nickname, wechat_avatar_url, 
  level, exp, gold, created_at, last_login, last_sync
) VALUES
(
  'test_player_001', 'openid_test_001', 'TestPlayer1', 
  'https://example.com/avatar1.png', 1, 0, 0, NOW(), NOW(), NOW()
),
(
  'test_player_002', 'openid_test_002', 'TestPlayer2',
  'https://example.com/avatar2.png', 5, 1000, 5000, NOW(), NOW(), NOW()
),
(
  'test_player_003', 'openid_test_003', 'TopPlayer',
  'https://example.com/avatar3.png', 20, 50000, 100000, NOW(), NOW(), NOW()
)
ON DUPLICATE KEY UPDATE 
  level = VALUES(level),
  exp = VALUES(exp),
  gold = VALUES(gold);

-- ============================================================
-- 测试角色数据
-- ============================================================

INSERT INTO characters (
  id, player_id, character_id, name, level, exp, health, max_health,
  attack_power, defense, speed, skill_points, created_at
) VALUES
-- 玩家 001 的角色
(
  'char_001_player001', 'test_player_001', 'char_type_001', '剑士', 
  1, 0, 100, 100, 15, 8, 10, 0, NOW()
),
-- 玩家 002 的角色
(
  'char_002_player002', 'test_player_002', 'char_type_002', '法师',
  5, 500, 80, 80, 25, 5, 12, 0, NOW()
),
(
  'char_003_player002', 'test_player_002', 'char_type_001', '剑士',
  5, 500, 100, 100, 20, 10, 10, 0, NOW()
),
-- 玩家 003 的角色
(
  'char_004_player003', 'test_player_003', 'char_type_003', '刺客',
  20, 10000, 70, 70, 30, 4, 20, 0, NOW()
),
(
  'char_005_player003', 'test_player_003', 'char_type_002', '法师',
  18, 8000, 75, 75, 28, 6, 15, 0, NOW()
)
ON DUPLICATE KEY UPDATE 
  level = VALUES(level),
  exp = VALUES(exp);

-- ============================================================
-- 测试装备数据
-- ============================================================

INSERT INTO equipment (
  id, player_id, equipment_id, name, rarity, 
  attack_bonus, defense_bonus, speed_bonus, health_bonus, quantity, created_at
) VALUES
-- 玩家 001 的装备
(
  'equip_001_p001', 'test_player_001', 'sword_001', '铁剑',
  'common', 5, 0, 0, 0, 1, NOW()
),
(
  'equip_002_p001', 'test_player_001', 'shield_001', '木盾',
  'common', 0, 3, 0, 0, 1, NOW()
),
-- 玩家 002 的装备
(
  'equip_003_p002', 'test_player_002', 'staff_001', '法杖',
  'rare', 15, 5, 2, 0, 1, NOW()
),
(
  'equip_004_p002', 'test_player_002', 'robe_001', '魔法袍',
  'uncommon', 0, 8, 3, 10, 1, NOW()
),
-- 玩家 003 的装备（高稀有度）
(
  'equip_005_p003', 'test_player_003', 'legendary_sword', '传奇剑',
  'legendary', 50, 20, 5, 0, 1, NOW()
),
(
  'equip_006_p003', 'test_player_003', 'epic_armor', '史诗铠甲',
  'epic', 10, 40, 0, 30, 1, NOW()
),
(
  'equip_007_p003', 'test_player_003', 'gold_coin', '金币',
  'common', 0, 0, 0, 0, 1000, NOW()
)
ON DUPLICATE KEY UPDATE 
  quantity = VALUES(quantity);

-- ============================================================
-- 测试战斗记录
-- ============================================================

INSERT INTO battle_records (
  id, player_id, map_id, character_id, score, 
  damage_dealt, damage_received, clear_time, extract_success, created_at
) VALUES
(
  'battle_001', 'test_player_002', 'map_01_forest', 'char_002_player002',
  3500, 450, 120, 180, TRUE, DATE_SUB(NOW(), INTERVAL 2 DAY)
),
(
  'battle_002', 'test_player_002', 'map_02_dungeon', 'char_003_player002',
  2800, 350, 200, 220, TRUE, DATE_SUB(NOW(), INTERVAL 1 DAY)
),
(
  'battle_003', 'test_player_003', 'map_01_forest', 'char_004_player003',
  8500, 1200, 50, 120, TRUE, DATE_SUB(NOW(), INTERVAL 12 HOUR)
),
(
  'battle_004', 'test_player_003', 'map_02_dungeon', 'char_005_player003',
  7200, 950, 80, 150, TRUE, DATE_SUB(NOW(), INTERVAL 6 HOUR)
),
(
  'battle_005', 'test_player_003', 'map_03_castle', 'char_004_player003',
  9500, 1500, 30, 100, TRUE, NOW()
)
ON DUPLICATE KEY UPDATE 
  score = VALUES(score);

-- ============================================================
-- 排行榜缓存数据
-- ============================================================

INSERT INTO leaderboard_cache (
  id, player_id, rank, score, map_id, cached_at
) VALUES
(
  'lb_001_p003_global', 'test_player_003', 1, 9500, NULL, NOW()
),
(
  'lb_002_p002_global', 'test_player_002', 2, 3500, NULL, NOW()
),
(
  'lb_003_p001_global', 'test_player_001', 3, 0, NULL, NOW()
),
(
  'lb_004_p003_forest', 'test_player_003', 1, 8500, 'map_01_forest', NOW()
),
(
  'lb_005_p002_forest', 'test_player_002', 2, 3500, 'map_01_forest', NOW()
)
ON DUPLICATE KEY UPDATE 
  rank = VALUES(rank),
  score = VALUES(score);

-- ============================================================
-- 救援请求数据
-- ============================================================

INSERT INTO rescue_requests (
  id, requester_id, rescuer_id, map_id, lost_items, total_value,
  status, reward_gold, reward_exp, created_at, expires_at, completed_at
) VALUES
(
  'rescue_001', 'test_player_001', 'test_player_002', 'map_01_forest',
  '[{"id": "item_1", "name": "金币", "count": 500}]', 500,
  'completed', 500, 200, DATE_SUB(NOW(), INTERVAL 1 DAY), 
  DATE_ADD(DATE_SUB(NOW(), INTERVAL 1 DAY), INTERVAL 24 HOUR), NOW()
),
(
  'rescue_002', 'test_player_002', NULL, 'map_02_dungeon',
  '[{"id": "item_2", "name": "剑", "count": 1}]', 2000,
  'pending', 500, 200, NOW(),
  DATE_ADD(NOW(), INTERVAL 24 HOUR), NULL
)
ON DUPLICATE KEY UPDATE 
  status = VALUES(status),
  completed_at = VALUES(completed_at);

-- ============================================================
-- 启用外键检查
-- ============================================================
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 最终统计
-- ============================================================
-- 显示导入结果
SELECT 'Database initialization completed!' AS message;
SELECT 
  (SELECT COUNT(*) FROM accounts) as total_accounts,
  (SELECT COUNT(*) FROM characters) as total_characters,
  (SELECT COUNT(*) FROM equipment) as total_equipment,
  (SELECT COUNT(*) FROM battle_records) as total_battles,
  (SELECT COUNT(*) FROM rescue_requests) as total_rescues;
