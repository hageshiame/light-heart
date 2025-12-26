# Week 2 Day 9: 本地完整系统验证指南

本文档提供完整的本地验证步骤，确保 Week 2 的全部功能可以在本地正常运行。

## 📋 前置检查清单

### 环境要求
- ✅ Node.js 16+ 已安装
- ✅ MySQL 5.7+ 已安装并运行
- ✅ Redis 5.0+ 已安装（可选，但强烈推荐用于缓存测试）
- ✅ 后端项目依赖已安装（`npm install`）

### 数据库初始化

1. **初始化 MySQL 数据库**

   方案 A：使用 TypeScript 脚本（推荐）
   ```bash
   cd backend
   npm run init-db
   ```

   方案 B：使用 SQL 脚本（直接在 MySQL 客户端执行）
   ```bash
   mysql -u root -p < scripts/quick-init.sql
   ```

   方案 C：使用 GUI 工具（MySQL Workbench）
   - 打开 `scripts/quick-init.sql`
   - 执行脚本

2. **验证数据库创建**

   ```bash
   # 进入 MySQL
   mysql -u root -p
   
   # 查看数据库
   SHOW DATABASES;
   
   # 使用 light_heart_game 数据库
   USE light_heart_game;
   
   # 查看所有表
   SHOW TABLES;
   
   # 验证表数量：应该看到 7 个表
   # - accounts
   # - characters
   # - equipment
   # - battle_records
   # - leaderboard_cache
   # - rescue_requests
   # - anticheat_reports
   ```

3. **验证索引和约束**

   ```sql
   -- 查看 accounts 表的索引
   SHOW INDEX FROM accounts;
   
   -- 查看 battle_records 表的索引
   SHOW INDEX FROM battle_records;
   
   -- 查看外键约束
   SELECT CONSTRAINT_NAME, TABLE_NAME, REFERENCED_TABLE_NAME
   FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
   WHERE REFERENCED_TABLE_NAME IS NOT NULL;
   ```

## 🚀 启动完整系统

### Step 1: 配置环境变量

编辑 `.env` 文件，确保以下配置正确：

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=        # 根据您的 MySQL 密码配置
DB_NAME=light_heart_game

# Redis Configuration（可选）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_change_this_in_production

# API Configuration
CORS_ORIGIN=http://localhost:3001,http://127.0.0.1:3001
```

### Step 2: 启动 MySQL

```bash
# macOS (使用 Homebrew)
brew services start mysql

# Linux
sudo systemctl start mysql

# Windows
net start MySQL80
```

### Step 3: 启动 Redis（可选但推荐）

```bash
# macOS (使用 Homebrew)
brew services start redis

# Linux
sudo systemctl start redis-server

# 或者直接运行
redis-server
```

### Step 4: 启动后端服务

```bash
cd backend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

**预期输出：**
```
🚀 Server is running on http://localhost:3000
📝 Environment: development
✓ Redis 缓存已启用
✓ 缓存预热完成
```

## ✅ 功能验证

### 1. 健康检查

```bash
curl http://localhost:3000/health
```

**预期响应：**
```json
{
  "status": "ok",
  "timestamp": "2025-12-26T10:00:00.000Z"
}
```

### 2. 微信登录

```bash
curl -X POST http://localhost:3000/api/auth/wechat-login \
  -H "Content-Type: application/json" \
  -d '{
    "code": "test_code_001",
    "nickname": "Test Player",
    "avatar": "https://example.com/avatar.jpg"
  }'
```

**预期响应：**
```json
{
  "success": true,
  "playerId": "uuid-xxx",
  "token": "eyJhbGc...",
  "user": {
    "playerId": "uuid-xxx",
    "nickname": "Test Player",
    "level": 1,
    "exp": 0,
    "gold": 0
  }
}
```

### 3. 排行榜提交

```bash
TOKEN="<从登录响应中获取的 token>"

curl -X POST http://localhost:3000/api/leaderboard/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "mapId": "map_001",
    "score": 8500,
    "damageDealt": 450,
    "damageReceived": 150,
    "clearTime": 120,
    "extractSuccess": true,
    "signature": "test_signature_001"
  }'
```

**预期响应：**
```json
{
  "success": true,
  "battleId": "uuid-xxx",
  "score": 8500,
  "timestamp": "2025-12-26T10:00:00.000Z"
}
```

### 4. 查询排行榜

```bash
curl http://localhost:3000/api/leaderboard?mapId=map_001&limit=10&offset=0
```

**预期响应：**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "playerId": "uuid-xxx",
      "nickname": "Test Player",
      "score": 8500,
      "mapId": "map_001",
      "timestamp": "2025-12-26T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

### 5. 获取玩家排名

```bash
TOKEN="<从登录响应中获取的 token>"
PLAYER_ID="<玩家 ID>"

curl http://localhost:3000/api/leaderboard/rank/$PLAYER_ID?mapId=map_001 \
  -H "Authorization: Bearer $TOKEN"
```

**预期响应：**
```json
{
  "success": true,
  "playerId": "uuid-xxx",
  "rank": 1,
  "mapId": "map_001"
}
```

### 6. 救援系统

```bash
TOKEN="<从登录响应中获取的 token>"

# 创建救援请求
curl -X POST http://localhost:3000/api/rescue/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "mapId": "map_001",
    "lostItems": [
      {"itemId": "item_001", "name": "金剑", "rarity": "rare"}
    ],
    "totalValue": 5000
  }'
```

**预期响应：**
```json
{
  "success": true,
  "rescueId": "uuid-xxx",
  "status": "pending",
  "expiresAt": "2025-12-27T10:00:00.000Z"
}
```

### 7. 数据同步

```bash
TOKEN="<从登录响应中获取的 token>"

curl -X POST http://localhost:3000/api/sync/queue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "operations": [
      {
        "type": "battle",
        "data": {
          "mapId": "map_001",
          "score": 5000
        }
      }
    ]
  }'
```

## 🧪 运行自动化测试

### 端到端测试

```bash
cd backend

# 确保服务器正在运行
npm run e2e-test
```

**预期输出：**
```
🧪 开始端到端测试...

============================================================
📊 测试结果汇总
============================================================

✅ 🏥 健康检查        | 15ms
✅ 🔐 微信登录         | 45ms
✅ 📊 提交分数        | 30ms
✅ 🏆 查询排行榜      | 20ms
✅ 👥 获取玩家排名    | 18ms
✅ 🆘 创建救援请求    | 25ms
✅ 🔄 数据同步        | 22ms
✅ ⚡ 缓存命中测试    | 8ms
✅ 🚦 速率限制测试    | 50ms

============================================================
📈 总体: 9/9 通过 (100%)
⏱️  总耗时: 233ms
============================================================
```

### 性能基准测试

```bash
cd backend

npm run performance-test
```

**预期输出：**
```
⚡ 开始性能基准测试...

════════════════════════════════════════════════════════════════════════════════
📈 性能基准测试报告
════════════════════════════════════════════════════════════════════════════════

│ 端点名称│ 平均 (ms) │ 最小 (ms) │ 最大 (ms) │ P95 (ms) │ P99 (ms) │ 吞吐量 (req/s) │
├────────────────────────────────────────────────────────────────────────────────┤
│ 排行榜查询│ 25.5      │ 12.3      │ 85.4      │ 52.1     │ 78.3     │ 39.2          │
│ 分数提交  │ 32.1      │ 18.2      │ 95.3      │ 65.4     │ 88.2     │ 31.2          │
│ 排名查询  │ 18.3      │ 8.5       │ 62.1      │ 38.2     │ 55.3     │ 54.6          │
│ 救援请求  │ 35.2      │ 20.1      │ 105.3     │ 72.1     │ 98.5     │ 28.4          │

📈 缓存性能优化: 75% 提升（首次: 45ms -> 缓存: 12ms）

💡 性能建议:
   ✓ 所有端点平均响应时间 < 50ms
   ✓ 缓存效果显著，建议继续优化
```

## 🔍 故障排除

### 问题 1: MySQL 连接失败

**症状：** `Error: PROTOCOL_CONNECTION_LOST`

**解决方案：**
```bash
# 1. 检查 MySQL 是否运行
mysql -u root -p

# 2. 检查 .env 中的数据库配置
cat backend/.env | grep DB_

# 3. 验证密码是否正确
# 如果没有密码，确保 DB_PASSWORD= 为空
```

### 问题 2: Redis 连接失败

**症状：** `⚠️  Redis 未连接，系统将继续运行但不使用 Redis 缓存`

**解决方案：**
```bash
# 1. 启动 Redis
redis-server

# 2. 验证 Redis 连接
redis-cli ping
# 预期输出：PONG

# 3. 检查 .env 中的 Redis 配置
cat backend/.env | grep REDIS_
```

### 问题 3: 端口已被占用

**症状：** `Error: listen EADDRINUSE: address already in use :::3000`

**解决方案：**
```bash
# 1. 查找占用端口的进程
lsof -i :3000

# 2. 杀死进程
kill -9 <PID>

# 或者修改 .env 中的 PORT
PORT=3001
```

### 问题 4: JWT Token 过期

**症状：** `401 UNAUTHORIZED: Token has expired`

**解决方案：**
- 需要重新登录获取新 Token
- 或实现 Token 刷新端点（已在 `/api/auth/refresh` 实现）

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Authorization: Bearer $TOKEN"
```

## 📊 监控和调试

### 查看缓存统计

```bash
curl http://localhost:3000/api/cache/stats
```

**响应示例：**
```json
{
  "success": true,
  "cache": {
    "connected": true,
    "memory_used": "2.5M",
    "memory_peak": "3.2M",
    "clients": 1,
    "commands": 1254
  }
}
```

### 清除缓存（开发环境）

```bash
curl -X POST http://localhost:3000/api/cache/clear
```

### 数据库查询日志

查看 `backend/logs/` 目录中的查询日志（如果启用）

## 🎯 验收标准

所有以下条件都应满足才能认为系统已完全通过 Week 2 验收：

### 数据库层 (Day 6)
- ✅ 7 个核心表完全创建
- ✅ 20+ 个索引已建立
- ✅ 6 个外键约束正确配置
- ✅ 软删除字段 (deleted_at) 存在
- ✅ 初始数据导入成功

### 认证与安全 (Day 7)
- ✅ JWT Token 生成和验证正常
- ✅ Token 刷新功能可用
- ✅ IP 级速率限制生效（15分钟100请求）
- ✅ 玩家级速率限制生效（1分钟30请求）
- ✅ 关键操作限制生效（5分钟10请求）
- ✅ 所有受保护端点都需要认证

### 缓存与性能 (Day 8)
- ✅ Redis 连接成功（或有适当降级处理）
- ✅ 排行榜缓存 (5分钟 TTL) 有效
- ✅ 玩家数据缓存 (10分钟 TTL) 有效
- ✅ 缓存命中提速 50% 以上
- ✅ 所有端点平均响应时间 < 100ms

### 系统集成 (Day 9)
- ✅ 端到端测试 100% 通过
- ✅ 性能基准测试达到预期
- ✅ 本地系统完整运行
- ✅ 所有错误处理正常

## 📝 记录问题和改进

在验证过程中发现的任何问题，请记录在 `/WEEK2-VALIDATION-LOG.md`

## ✨ 总结

完成本验证指南后，Week 2 的完整功能应该可以在本地完全运行。

**预期成果：**
- 完整的数据库持久化层
- 完善的认证和安全机制
- 高效的缓存系统
- 性能达到预期标准
- 所有业务流程可以正常工作
