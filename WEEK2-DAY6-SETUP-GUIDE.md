# 🗄️ Week 2 Day 6: 数据库持久化层初始化指南

## 📋 当前状态

✅ **已完成：**
- Service 层持久化代码（AccountService, BattleService, RescueService）
- 数据库初始化脚本（init-db.ts）
- 快速初始化 SQL 脚本（quick-init.sql）
- 初始测试数据（init-data.sql）

---

## 🔧 数据库初始化步骤

### 方式 1：直接使用 MySQL 命令行（推荐）

```bash
cd backend

# 方式 1a：使用交互密码输入
mysql -u root -p < scripts/quick-init.sql

# 方式 1b：直接指定密码（如果 MySQL 无密码）
mysql -u root < scripts/quick-init.sql
```

### 方式 2：使用 MySQL Workbench 或 GUI 工具

1. 打开 MySQL Workbench
2. 选择 `File` → `Open SQL Script`
3. 选择 `backend/scripts/quick-init.sql`
4. 执行脚本（Ctrl+Shift+Enter 或点击执行按钮）

### 方式 3：使用 TypeScript 初始化脚本

```bash
cd backend

# 首先安装依赖（如果还未安装）
npm install

# 然后运行初始化脚本
npx ts-node scripts/init-db.ts
```

---

## ✅ 初始化验证

初始化完成后，执行以下命令验证：

```bash
# 检查数据库是否创建
mysql -u root -e "SHOW DATABASES;" | grep light_heart_game

# 检查表是否创建
mysql -u root light_heart_game -e "SHOW TABLES;"

# 显示所有表的行数统计
mysql -u root light_heart_game -e "SELECT
  'accounts' as table_name, COUNT(*) as row_count FROM accounts
UNION ALL
SELECT 'characters', COUNT(*) FROM characters
UNION ALL
SELECT 'equipment', COUNT(*) FROM equipment
UNION ALL
SELECT 'battle_records', COUNT(*) FROM battle_records
UNION ALL
SELECT 'leaderboard_cache', COUNT(*) FROM leaderboard_cache
UNION ALL
SELECT 'rescue_requests', COUNT(*) FROM rescue_requests
UNION ALL
SELECT 'anticheat_reports', COUNT(*) FROM anticheat_reports;"
```

---

## 📊 数据库架构

### 核心表（7张）

| 表名 | 用途 | 行数 | 关键字段 |
|------|------|------|---------|
| `accounts` | 用户账户 | 0 | id, wechat_openid, level, exp, gold |
| `characters` | 角色数据 | 0 | player_id, character_id, level, health |
| `equipment` | 装备系统 | 0 | player_id, equipment_id, rarity, bonuses |
| `battle_records` | 战斗记录 (Layer 1) | 0 | player_id, map_id, score, signature |
| `leaderboard_cache` | 排行榜缓存 | 0 | player_id, score, map_id, rank |
| `rescue_requests` | 救援系统 (Layer 2) | 0 | requester_id, rescuer_id, status, expires_at |
| `anticheat_reports` | 反作弊上报 (Layer 4) | 0 | player_id, anomaly_type, severity |

### 索引统计

- **总索引数**：20+ 个
- **主键**：7 个（每表 1 个）
- **外键约束**：6 个（级联删除）
- **唯一索引**：2 个（accounts.wechat_openid, characters unique_player_char）
- **全文索引**：1 个（battle_records.ft_map_id）

---

## 🔗 外键关系

```
┌─────────────────────────────────────────────────┐
│              accounts (中心表)                   │
│   id (PK) | wechat_openid | level | exp | gold  │
└────────────┬──────────────────────────────────────┘
             │
    ┌────────┼────────┬───────────┬─────────────┐
    │        │        │           │             │
    ▼        ▼        ▼           ▼             ▼
 characters equipment battle_records rescue_requests anticheat_reports
    (6 个)    (7 个)    (3 个)         (6 个)         (5 个)
  外键      外键       外键 (2个)      外键 (2个)     外键
```

---

## 🚀 Service 层持久化实现

### AccountService（136 行，已完善）
✅ 已实现所有方法：
- `createAccountFromWeChat()` - 创建新账户
- `getAccountById()` / `getAccountByOpenID()` - 查询账户
- `updateLastLogin()` / `updateLastSync()` - 时间戳更新
- `addGold()` / `addExp()` - 资源增加
- `deleteAccount()` - 软删除
- `exists()` - 存在性检查

### BattleService（205 行，已完善）
✅ 已实现所有方法：
- `submitBattleScore()` - 提交分数 + 缓存更新
- `getBattleRecord()` - 查询记录
- `getPlayerBattleHistory()` - 个人历史
- `getLeaderboard()` - 排行榜查询（带 ROW_NUMBER 排名）
- `getPlayerRank()` - 排名计算
- `getPlayerBestScore()` / `getTotalBattlesCount()` / `getAverageScore()` - 统计

### RescueService（235 行，已完善）
✅ 已实现所有方法：
- `createRescueRequest()` - 创建救援
- `getRescueRequest()` - 查询救援
- `completeRescue()` - 完成救援 + 奖励发放
- `cancelRescue()` - 取消救援
- `getPendingRescues()` - 待救援列表
- `getPlayerRescueRequests()` / `getRescuerCompletedRescues()` - 个人救援
- `getRescueStats()` - 救援统计

---

## 🧪 本地测试命令

初始化完成后，可在本地运行以下测试：

```bash
cd backend

# 1. 测试数据库连接
npm run test:db

# 2. 测试 API 端点（确保服务器运行中）
npm run dev &  # 后台启动服务器

# 3. 测试登录和账户创建
curl -X POST http://localhost:3000/api/auth/wechat-login \
  -H "Content-Type: application/json" \
  -d '{"code": "test_code_001"}'

# 4. 提交分数测试
curl -X POST http://localhost:3000/api/leaderboard/submit-score \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "player_id_here",
    "mapId": "map_01_forest",
    "score": 5000
  }'
```

---

## ⚠️ 常见问题

**Q: MySQL 连接失败？**  
A: 检查 `.env` 中的数据库配置（host, port, user, password, database）

**Q: 外键约束错误？**  
A: 确保按顺序初始化（accounts 最先），快速初始化脚本已处理顺序

**Q: JSON 字段不支持？**  
A: MySQL 5.7+ 支持 JSON，检查 MySQL 版本 (`mysql --version`)

**Q: 软删除验证？**  
A: 所有查询都包含 `WHERE deleted_at IS NULL`，确保软删除生效

---

## 📝 下一步

✅ **Day 6 完成项：**
1. ✅ 数据库初始化脚本
2. ✅ Service 层完整实现
3. ⏳ 事务与约束验证（Day 6 剩余）

⏳ **Day 7 计划：**
- JWT 认证中间件
- 速率限制实现

⏳ **Day 8 计划：**
- Redis 缓存集成
- 性能优化

---

**生成时间：** 2025-12-26  
**状态：** ⏳ 等待数据库初始化
