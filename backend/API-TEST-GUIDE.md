# 🎮 Light Heart Game API 测试指南

## 快速开始

### 1. 启动服务器

```bash
cd backend
npm install
npm run dev
```

服务器运行在 `http://localhost:3000`

### 2. 获取认证令牌

所有需要认证的 API 都需要在请求头中添加 Bearer Token。

#### 登录获取 Token

```bash
curl -X POST http://localhost:3000/api/auth/wechat-login \
  -H "Content-Type: application/json" \
  -d '{
    "code": "test_code_001",
    "nickname": "TestPlayer",
    "avatar": "https://example.com/avatar.png"
  }'
```

**响应示例：**
```json
{
  "success": true,
  "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "playerId": "acc_xxxxx",
  "account": {
    "id": "acc_xxxxx",
    "level": 1,
    "exp": 0,
    "gold": 0
  },
  "message": "Login successful"
}
```

**保存 sessionToken 供后续请求使用**

---

## API 端点测试

### 📍 认证服务 (Authentication)

#### 1. 微信登录

```bash
curl -X POST http://localhost:3000/api/auth/wechat-login \
  -H "Content-Type: application/json" \
  -d '{
    "code": "test_code_001"
  }'
```

**参数说明：**
- `code`: 微信授权码（必填）
- `nickname`: 玩家昵称（可选）
- `avatar`: 头像 URL（可选）

**预期状态码：** 200
**关键验证：**
- ✓ 返回有效的 JWT Token
- ✓ 包含 playerId
- ✓ 账户初始等级为 1

---

#### 2. 刷新 Token

```bash
curl -X POST http://localhost:3000/api/auth/refresh-token \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json"
```

**预期状态码：** 200
**关键验证：**
- ✓ 返回新的 JWT Token
- ✓ 新 Token 能用于认证

---

#### 3. 获取账户信息

```bash
curl -X GET http://localhost:3000/api/auth/get-account \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

**预期状态码：** 200
**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": "acc_xxxxx",
    "wechatOpenid": "openid_xxxxx",
    "level": 1,
    "exp": 0,
    "gold": 0,
    "lastLogin": "2025-12-26T10:00:00Z",
    "lastSync": "2025-12-26T10:00:00Z",
    "createdAt": "2025-12-26T10:00:00Z"
  }
}
```

---

### 🏆 排行榜系统 (Leaderboard)

#### 1. 提交分数（Layer 1: 关键）

```bash
curl -X POST http://localhost:3000/api/leaderboard/submit-score \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "acc_xxxxx",
    "mapId": "map_001",
    "score": 5000,
    "damageDealt": 1200,
    "damageReceived": 300,
    "clearTime": 120,
    "extractSuccess": true,
    "clientTimestamp": 1703651200000
  }'
```

**参数说明：**
- `playerId`: 玩家 ID（必填）
- `mapId`: 地图 ID（必填）
- `score`: 分数（必填，0-999999）
- `damageDealt`: 造成伤害（可选）
- `damageReceived`: 受到伤害（可选）
- `clearTime`: 通关用时（可选）
- `extractSuccess`: 是否成功撤离（可选）
- `clientTimestamp`: 客户端时间戳（可选，用于防作弊）

**预期状态码：** 200
**关键验证：**
- ✓ 返回 battleId
- ✓ 返回玩家排名（rank）
- ✓ 返回经验和金币奖励
- ✗ 拒绝无效分数（<0 或 >999999）
- ✗ 拒绝不存在的玩家

**反作弊验证：**
```javascript
// 客户端计算签名
const signature = sha256(
  `${playerId}${mapId}${score}${clientTimestamp}${SIGN_KEY}`
);
```

---

#### 2. 获取排行榜

```bash
curl -X GET "http://localhost:3000/api/leaderboard/get-rankings?limit=100&offset=0&mapId=map_001" \
  -H "Content-Type: application/json"
```

**查询参数：**
- `limit`: 返回数量（默认 100，最大 100）
- `offset`: 偏移量（默认 0）
- `mapId`: 地图 ID（可选，不指定则返回全局排行）

**预期状态码：** 200
**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "playerId": "acc_xxxxx",
      "score": 10000,
      "mapId": "map_001",
      "timestamp": 1703651200000
    }
  ],
  "limit": 100,
  "offset": 0
}
```

---

#### 3. 获取玩家战斗历史

```bash
curl -X GET "http://localhost:3000/api/leaderboard/personal-history?playerId=acc_xxxxx&limit=50&offset=0"
```

**预期状态码：** 200
**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": "battle_xxxxx",
      "playerId": "acc_xxxxx",
      "mapId": "map_001",
      "score": 5000,
      "timestamp": 1703651200000
    }
  ],
  "stats": {
    "totalBattles": 10,
    "averageScore": 4500
  },
  "limit": 50,
  "offset": 0
}
```

---

#### 4. 获取玩家排名

```bash
curl -X GET "http://localhost:3000/api/leaderboard/player-rank?playerId=acc_xxxxx&mapId=map_001"
```

**预期状态码：** 200
**响应示例：**
```json
{
  "success": true,
  "data": {
    "playerId": "acc_xxxxx",
    "rank": 5,
    "bestScore": 8000
  }
}
```

---

### 🆘 救援系统 (Rescue)

#### 1. 创建救援请求（Layer 2: 重要）

```bash
curl -X POST http://localhost:3000/api/rescue/create-request \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "acc_xxxxx",
    "mapId": "map_001",
    "lostItems": [
      {"id": "item_1", "name": "Gold Sword", "rarity": "rare", "count": 1}
    ],
    "totalValue": 2000
  }'
```

**参数说明：**
- `playerId`: 发起救援的玩家（必填）
- `mapId`: 发生地点地图（必填）
- `lostItems`: 丢失的物品数组（可选）
- `totalValue`: 物品总价值（可选）

**预期状态码：** 200
**响应示例：**
```json
{
  "success": true,
  "requestId": "rescue_xxxxx",
  "rescueUrl": "https://game.example.com/rescue?id=rescue_xxxxx",
  "expiresAt": "2025-12-27T10:00:00Z",
  "message": "Rescue request created successfully"
}
```

---

#### 2. 获取救援任务

```bash
curl -X GET "http://localhost:3000/api/rescue/get-task?requestId=rescue_xxxxx"
```

**预期状态码：** 200 或 410（过期）
**响应示例：**
```json
{
  "success": true,
  "data": {
    "requestId": "rescue_xxxxx",
    "playerId": "acc_xxxxx",
    "mapId": "map_001",
    "lostItems": [...],
    "totalValue": 2000,
    "expiresAt": "2025-12-27T10:00:00Z",
    "status": "pending"
  }
}
```

---

#### 3. 完成救援任务

```bash
curl -X POST http://localhost:3000/api/rescue/complete-task \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "rescue_xxxxx",
    "rescuerId": "acc_yyyyy",
    "completedTime": 1703651200000
  }'
```

**参数说明：**
- `requestId`: 救援请求 ID（必填）
- `rescuerId`: 救援者玩家 ID（必填）
- `completedTime`: 完成时间戳（可选）

**预期状态码：** 200
**响应示例：**
```json
{
  "success": true,
  "message": "Rescue task completed",
  "rescuerReward": {
    "gold": 500,
    "exp": 200
  },
  "recoveredItems": [
    {"id": "item_1", "name": "Gold Sword", "count": 1}
  ]
}
```

**奖励规则：**
- 救援者：500 金币 + 200 经验
- 原玩家：恢复 60% 的丢失物品

---

#### 4. 获取待救援列表

```bash
curl -X GET "http://localhost:3000/api/rescue/pending-list?limit=20&offset=0"
```

**预期状态码：** 200
**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "requestId": "rescue_xxxxx",
      "playerId": "acc_xxxxx",
      "mapId": "map_001",
      "totalValue": 2000,
      "createdAt": "2025-12-26T10:00:00Z",
      "expiresAt": "2025-12-27T10:00:00Z"
    }
  ],
  "limit": 20,
  "offset": 0
}
```

---

#### 5. 获取救援统计

```bash
curl -X GET "http://localhost:3000/api/rescue/stats?playerId=acc_xxxxx"
```

**预期状态码：** 200
**响应示例：**
```json
{
  "success": true,
  "data": {
    "playerId": "acc_xxxxx",
    "totalRequested": 5,
    "totalCompleted": 3,
    "totalRescued": 8
  }
}
```

---

### 🔄 数据同步 (Sync)

#### 1. 批量同步数据（Layer 3: 辅助）

```bash
curl -X POST http://localhost:3000/api/sync/batch-data \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "acc_xxxxx",
    "data": {
      "characters": [...],
      "equipment": [...],
      "achievements": [...]
    },
    "timestamp": 1703651200000
  }'
```

**预期状态码：** 200
**响应示例：**
```json
{
  "success": true,
  "message": "Batch data synced successfully",
  "syncedAt": 1703651200000,
  "nextSyncTime": 1703651500000
}
```

---

#### 2. 拉取最新更新

```bash
curl -X GET "http://localhost:3000/api/sync/pull-latest?playerId=acc_xxxxx&since=1703650000000"
```

**查询参数：**
- `playerId`: 玩家 ID（必填）
- `since`: 上次更新时间戳（可选）

**预期状态码：** 200
**响应示例：**
```json
{
  "success": true,
  "data": {
    "characters": [],
    "equipment": [],
    "achievements": [],
    "leaderboardUpdates": [],
    "lastUpdate": 1703651200000
  }
}
```

---

#### 3. 重试失败操作

```bash
curl -X POST http://localhost:3000/api/sync/retry-queue \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "acc_xxxxx",
    "failedOps": [
      {"id": "op_1", "retryCount": 1},
      {"id": "op_2", "retryCount": 0}
    ]
  }'
```

**预期状态码：** 200
**响应示例：**
```json
{
  "success": true,
  "data": [
    {"operationId": "op_1", "status": "pending", "retryCount": 1}
  ],
  "message": "Processed 2 retry operations"
}
```

---

### ⚠️ 反作弊上报 (Anti-Cheat)

#### 1. 上报异常行为（Layer 4: 异步）

```bash
curl -X POST http://localhost:3000/api/sync/report-anomaly \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "acc_xxxxx",
    "anomalyType": "SCORE_SPIKE",
    "details": {
      "previousScore": 5000,
      "currentScore": 1000000,
      "timeElapsed": 5
    },
    "clientTimestamp": 1703651200000
  }'
```

**有效的异常类型：**
- `SCORE_SPIKE`: 分数不合理飙升
- `SPEED_HACK`: 可疑的速度/时间异常
- `DATA_CORRUPTION`: 本地数据完整性问题
- `NETWORK_ANOMALY`: 异常网络模式
- `MEMORY_ANOMALY`: 内存操纵检测
- `SIGNATURE_MISMATCH`: 签名验证失败

**预期状态码：** 200
**响应示例：**
```json
{
  "success": true,
  "message": "Anomaly reported",
  "reportedAt": 1703651200000
}
```

**特点：**
- 异步处理（立即返回，不阻塞游戏）
- 即使上报失败也不影响游戏

---

#### 2. 上报客户端错误

```bash
curl -X POST http://localhost:3000/api/sync/report-error \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "acc_xxxxx",
    "errorType": "DATABASE_ERROR",
    "errorMessage": "Failed to write local database",
    "stackTrace": "...",
    "clientTimestamp": 1703651200000
  }'
```

**预期状态码：** 200

---

## 错误处理测试

### 1. 缺少必填参数

```bash
curl -X POST http://localhost:3000/api/leaderboard/submit-score \
  -H "Content-Type: application/json" \
  -d '{"score": 5000}'
```

**预期响应：** 400 Bad Request
```json
{
  "success": false,
  "error": "MISSING_PARAMS",
  "message": "playerId, mapId, and score are required"
}
```

---

### 2. 无效的 Token

```bash
curl -X GET http://localhost:3000/api/auth/get-account \
  -H "Authorization: Bearer invalid_token"
```

**预期响应：** 401 Unauthorized
```json
{
  "success": false,
  "error": "INVALID_TOKEN",
  "message": "Token verification failed"
}
```

---

### 3. 不存在的玩家

```bash
curl -X POST http://localhost:3000/api/leaderboard/submit-score \
  -H "Content-Type: application/json" \
  -d '{
    "playerId": "nonexistent_player",
    "mapId": "map_001",
    "score": 5000
  }'
```

**预期响应：** 404 Not Found
```json
{
  "success": false,
  "error": "PLAYER_NOT_FOUND",
  "message": "Player account does not exist"
}
```

---

### 4. 过期的救援请求

```bash
curl -X GET "http://localhost:3000/api/rescue/get-task?requestId=expired_request"
```

**预期响应：** 410 Gone
```json
{
  "success": false,
  "error": "EXPIRED",
  "message": "Rescue request has expired"
}
```

---

## 批量测试脚本

### 完整流程测试（Bash）

```bash
#!/bin/bash

# 1. 登录
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/wechat-login \
  -H "Content-Type: application/json" \
  -d '{"code": "test_code_001"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.sessionToken')
PLAYER_ID=$(echo $LOGIN_RESPONSE | jq -r '.playerId')

echo "✓ Login successful"
echo "  Player ID: $PLAYER_ID"
echo "  Token: ${TOKEN:0:50}..."

# 2. 获取账户信息
curl -s -X GET http://localhost:3000/api/auth/get-account \
  -H "Authorization: Bearer $TOKEN" | jq '.data'

# 3. 提交分数
SCORE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/leaderboard/submit-score \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"$PLAYER_ID\",
    \"mapId\": \"map_001\",
    \"score\": 5000
  }")

BATTLE_ID=$(echo $SCORE_RESPONSE | jq -r '.battleId')
RANK=$(echo $SCORE_RESPONSE | jq -r '.rank')

echo "✓ Score submitted"
echo "  Battle ID: $BATTLE_ID"
echo "  Rank: $RANK"

# 4. 获取排行榜
curl -s -X GET "http://localhost:3000/api/leaderboard/get-rankings?limit=10" | jq '.data[0:3]'

# 5. 创建救援请求
RESCUE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/rescue/create-request \
  -H "Content-Type: application/json" \
  -d "{
    \"playerId\": \"$PLAYER_ID\",
    \"mapId\": \"map_001\",
    \"totalValue\": 2000
  }")

RESCUE_ID=$(echo $RESCUE_RESPONSE | jq -r '.requestId')
echo "✓ Rescue request created: $RESCUE_ID"

# 6. 获取救援任务
curl -s -X GET "http://localhost:3000/api/rescue/get-task?requestId=$RESCUE_ID" | jq '.data'

echo "✓ All tests completed successfully!"
```

---

## 性能基准 (Baseline)

**期望的响应时间：**
- 登录：< 200ms
- 提交分数：< 100ms
- 查询排行榜：< 150ms
- 创建救援：< 100ms
- 拉取更新：< 200ms

---

## 常见问题

**Q: 为什么登录后无法使用其他 API？**
A: 确保在请求头中正确添加了 Bearer Token：
```bash
-H "Authorization: Bearer YOUR_TOKEN"
```

**Q: 分数验证失败？**
A: 检查分数是否在有效范围内（0-999999），且为整数。

**Q: 救援请求立即过期？**
A: 救援请求有 24 小时有效期，检查本地时间是否正确。

---

## 监控与调试

### 查看服务器日志

```bash
npm run dev
```

日志会显示所有请求和异常，格式为：
```
[2025-12-26T10:00:00.000Z] POST /api/auth/wechat-login
[AntiCheat] Anomaly from acc_xxxxx: { type: 'SCORE_SPIKE', ... }
✓ New account created: acc_xxxxx
```

---

## 下一步

- ✅ 所有基础 API 端点已完成
- ⏳ 待实现：数据库持久化层
- ⏳ 待实现：反作弊算法优化
- ⏳ 待实现：前端集成测试
