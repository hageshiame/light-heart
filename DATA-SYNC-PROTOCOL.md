# 数据同步协议 v1.0

> **规范性**：生产级网络协议定义  
> **目标受众**：前端与后端开发者  
> **实现语言**：TypeScript + Node.js

---

## 协议概览

### 通信模式
- **基础**: HTTP/HTTPS REST API
- **端口**: 443 (HTTPS)
- **超时**: 5秒 (个别关键请求10秒)
- **重试**: 指数退避 (1s, 2s, 4s)

### 优先级分层

```
优先级 | 延迟容限 | 存储方式 | 失败处理
-------|--------|--------|-------
Layer 1 | <2秒 | 实时发送 | 队列重试
Layer 2 | <30秒 | 缓冲30秒后发送 | 本地缓存
Layer 3 | <5分钟 | 定时发送 | 本地缓存
Layer 4 | <30分钟 | 离线积累 | 本地持久化
```

---

## API 端点定义

### 1. 身份认证 (Auth)

#### 1.1 微信登录
```
POST /api/auth/wechat-login
Content-Type: application/json

请求:
{
  "code": "string",              // 微信授权码
  "encryptedData": "string",     // 加密用户数据
  "iv": "string"                 // 初始化向量
}

响应 (200):
{
  "success": true,
  "data": {
    "sessionToken": "string",    // 会话令牌 (1小时有效期)
    "playerId": "uuid",          // 玩家ID
    "nickname": "string",        // 微信昵称
    "avatarUrl": "string"        // 头像URL
  }
}

错误 (401):
{
  "success": false,
  "error": "invalid_code"
}
```

#### 1.2 令牌刷新
```
POST /api/auth/refresh-token
Authorization: Bearer {sessionToken}

响应 (200):
{
  "success": true,
  "data": {
    "sessionToken": "string",    // 新的会话令牌
    "expiresAt": 1735107600      // Unix时间戳
  }
}
```

---

### 2. 排行榜系统 (Leaderboard)

#### 2.1 上报玩家成绩 (Layer 1 - 关键)
```
POST /api/leaderboard/submit-score
Authorization: Bearer {sessionToken}
Content-Type: application/json

请求:
{
  "playerId": "uuid",
  "mapId": "map_1_1",
  "score": 12500,                // 本场收获的金币/积分
  "damageDealt": 450,
  "damageReceived": 80,
  "clearTime": 125,              // 秒
  "enemyCount": 3,
  "extractSuccess": true,        // 是否成功撤离
  "clientTimestamp": 1735107234,
  "signature": "string"          // 前端签名(防篡改)
}

响应 (200):
{
  "success": true,
  "data": {
    "scoreId": "uuid",
    "currentRank": 42,            // 当前排名
    "totalScore": 125000,         // 总积分
    "rewards": {
      "gold": 1000,
      "exp": 250
    }
  }
}

错误 (400):
{
  "success": false,
  "error": "score_anomaly",      // 分数异常(超过预期值150%)
  "reason": "Damage value exceeds expected range"
}
```

#### 2.2 获取排行榜
```
GET /api/leaderboard/get-rankings?type=daily&limit=100
Authorization: Bearer {sessionToken}

查询参数:
  type: 'daily' | 'weekly' | 'monthly' | 'alltime'
  limit: 10-1000 (默认100)
  offset: 分页偏移 (默认0)

响应 (200):
{
  "success": true,
  "data": {
    "list": [
      {
        "rank": 1,
        "playerId": "uuid",
        "nickname": "风轮",
        "totalScore": 250000,
        "mapsClear": 45,
        "lastUpdateTime": 1735107234
      },
      // ... 最多100条记录
    ],
    "playerRank": {
      "currentRank": 42,
      "totalScore": 125000
    },
    "lastUpdatedAt": 1735107000  // 排行榜最后更新时间
  }
}
```

#### 2.3 获取玩家个人成绩历史
```
GET /api/leaderboard/personal-history?limit=50
Authorization: Bearer {sessionToken}

响应 (200):
{
  "success": true,
  "data": {
    "records": [
      {
        "scoreId": "uuid",
        "mapId": "map_1_1",
        "score": 12500,
        "damageDealt": 450,
        "clearTime": 125,
        "timestamp": 1735107234,
        "rank": 42
      }
    ],
    "stats": {
      "totalMapsCleared": 145,
      "totalScore": 125000,
      "bestScore": 25000,
      "averageScore": 862,
      "winRate": 0.85
    }
  }
}
```

---

### 3. 救援系统 (Rescue)

#### 3.1 上报救援请求 (Layer 1)
```
POST /api/rescue/create-request
Authorization: Bearer {sessionToken}
Content-Type: application/json

请求:
{
  "playerId": "uuid",
  "mapId": "map_1_1",
  "failedTime": 1735107234,
  "lostItems": [
    {
      "itemId": "equip_001",
      "rarity": 3,
      "value": 5000
    }
  ],
  "totalValue": 15000            // 丢失物品总价值
}

响应 (200):
{
  "success": true,
  "data": {
    "requestId": "uuid",
    "rescueUrl": "https://game.com/?rescue=abc123",  // 分享链接
    "expiresAt": 1735193634      // 24小时后过期
  }
}
```

#### 3.2 查询救援任务 (Layer 2)
```
GET /api/rescue/get-task?requestId=xyz
Authorization: Bearer {sessionToken}

响应 (200):
{
  "success": true,
  "data": {
    "requestId": "xyz",
    "requesterNickname": "求助者A",
    "mapId": "map_1_1",
    "difficulty": 2,
    "lostItems": [...],
    "reward": {
      "gold": 500,
      "exp": 100
    },
    "status": "pending"           // pending | completed | expired
  }
}
```

#### 3.3 完成救援任务 (Layer 1)
```
POST /api/rescue/complete-task
Authorization: Bearer {sessionToken}
Content-Type: application/json

请求:
{
  "requestId": "xyz",
  "heroId": "uuid",              // 救援者ID
  "completedTime": 1735107534,
  "signature": "string"
}

响应 (200):
{
  "success": true,
  "data": {
    "taskId": "uuid",
    "requesterRewarded": true,   // 求助者是否已获奖励
    "heroRewarded": true         // 救援者是否已获奖励
  }
}
```

---

### 4. 热更新配置 (HotUpdate)

#### 4.1 检查配置版本
```
GET /api/config/check-version
Authorization: Bearer {sessionToken}

查询参数:
  configType: 'monsters' | 'equipment' | 'dropRates' | 'all'
  currentVersion: '1.0.2'

响应 (200):
{
  "success": true,
  "data": {
    "configs": [
      {
        "type": "monsters",
        "currentVersion": "1.0.3",
        "needsUpdate": true,
        "downloadUrl": "https://cdn.game.com/config/monsters_1.0.3.json",
        "fileSize": 1024000,
        "checksum": "sha256_hash"
      }
    ],
    "checkTime": 1735107234
  }
}
```

#### 4.2 下载配置文件
```
GET /api/config/download?type=monsters&version=1.0.3
Authorization: Bearer {sessionToken}

响应 (200):
Content-Type: application/json

{
  "version": "1.0.3",
  "lastModified": 1735107000,
  "data": {
    "monsters": [
      {
        "id": "skeleton_1",
        "name": "骨精灵",
        "level": 5,
        "hp": 80,
        "atk": 50,
        "def": 30,
        "dropRates": {
          "gold": 0.8,
          "exp": 1.0,
          "rarity1": 0.5,
          "rarity2": 0.2
        }
      }
    ]
  }
}
```

---

### 5. 数据同步 (DataSync)

#### 5.1 批量同步用户数据 (Layer 3)
```
POST /api/sync/batch-data
Authorization: Bearer {sessionToken}
Content-Type: application/json

请求:
{
  "playerId": "uuid",
  "clientTimestamp": 1735107234,
  "data": {
    "characters": [
      {
        "characterId": "char_001",
        "level": 10,
        "exp": 5000,
        "star": 3
      }
    ],
    "equipment": [
      {
        "equipmentId": "equip_001",
        "enhanceLevel": 5,
        "affixes": [...]
      }
    ],
    "achievements": [
      {
        "achievementId": "ach_001",
        "unlockedAt": 1735100000,
        "progress": 100
      }
    ]
  }
}

响应 (200):
{
  "success": true,
  "data": {
    "synced": true,
    "serverTimestamp": 1735107250,
    "conflicts": []  // 如果有冲突数据
  }
}
```

#### 5.2 拉取服务端最新数据 (Layer 3)
```
GET /api/sync/pull-latest?sinceTimestamp=1735107000
Authorization: Bearer {sessionToken}

响应 (200):
{
  "success": true,
  "data": {
    "serverTimestamp": 1735107250,
    "updates": {
      "characters": [...],      // 有更新的数据
      "leaderboardRank": 42
    },
    "conflicts": [
      {
        "type": "character",
        "clientValue": 12,
        "serverValue": 10,
        "resolution": "server_wins"  // 服务端版本为准
      }
    ]
  }
}
```

---

### 6. 反作弊 (AntiCheat)

#### 6.1 异常行为上报 (Layer 4)
```
POST /api/anticheat/report-anomaly
Authorization: Bearer {sessionToken}
Content-Type: application/json

请求:
{
  "playerId": "uuid",
  "anomalyType": "score_spike",  // 分数异常
  "severity": "high",
  "details": {
    "expectedScore": 10000,
    "actualScore": 150000,
    "ratio": 15.0,
    "timestamp": 1735107234
  }
}

响应 (200):
{
  "success": true,
  "data": {
    "reported": true,
    "caseId": "uuid"
  }
}
```

---

## 错误码定义

| 代码 | 含义 | HTTP状态 |
|------|------|--------|
| `ok` | 成功 | 200 |
| `invalid_code` | 微信授权码失效 | 401 |
| `token_expired` | 会话令牌过期 | 401 |
| `unauthorized` | 无权限 | 403 |
| `score_anomaly` | 分数异常 | 400 |
| `not_found` | 资源不存在 | 404 |
| `server_error` | 服务器错误 | 500 |

---

## 客户端实现示例

### NetworkManager (完整实现)

```typescript
class NetworkManager {
  private sessionToken: string | null = null;
  private syncQueue: SyncTask[] = [];
  private offline: boolean = false;

  // === 初始化 ===
  async initialize(code: string): Promise<void> {
    try {
      const response = await this.request('POST', '/api/auth/wechat-login', {
        code,
        encryptedData: 'xxx',
        iv: 'xxx'
      }, 'critical');

      this.sessionToken = response.data.sessionToken;
      this.playerId = response.data.playerId;
    } catch (error) {
      console.error('Auth failed:', error);
      throw error;
    }
  }

  // === 核心请求方法 ===
  async request(
    method: string,
    path: string,
    body?: any,
    priority: 'critical' | 'important' | 'auxiliary' = 'important'
  ): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.sessionToken}`
        },
        body: body ? JSON.stringify(body) : undefined,
        timeout: priority === 'critical' ? 10000 : 5000
      });

      if (!response.ok) {
        if (response.status === 401) {
          await this.refreshToken();
          return this.request(method, path, body, priority);
        }
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      this.handleNetworkError(error, { method, path, body, priority });
      
      if (priority === 'critical') {
        this.queueForRetry({ method, path, body, priority });
      }
      
      throw error;
    }
  }

  // === 排行榜 (Layer 1) ===
  async submitScore(battleResult: BattleResult): Promise<void> {
    const payload = {
      playerId: this.playerId,
      mapId: battleResult.mapId,
      score: battleResult.score,
      damageDealt: battleResult.damageDealt,
      damageReceived: battleResult.damageReceived,
      clearTime: battleResult.duration,
      extractSuccess: battleResult.extractSuccess,
      clientTimestamp: Date.now(),
      signature: this.generateSignature(battleResult)
    };

    try {
      await this.request('POST', '/api/leaderboard/submit-score', payload, 'critical');
    } catch (error) {
      console.warn('Score submission failed, will retry later:', error);
    }
  }

  // === 救援 (Layer 1) ===
  async createRescueRequest(failedMap: string, lostItems: Item[]): Promise<string> {
    const response = await this.request('POST', '/api/rescue/create-request', {
      playerId: this.playerId,
      mapId: failedMap,
      failedTime: Date.now(),
      lostItems,
      totalValue: lostItems.reduce((sum, item) => sum + item.value, 0)
    }, 'critical');

    return response.data.rescueUrl;
  }

  // === 配置 (Layer 2) ===
  async checkConfigVersion(): Promise<ConfigUpdate[]> {
    const response = await this.request('GET', '/api/config/check-version', null, 'important');
    return response.data.configs;
  }

  // === 同步 (Layer 3) ===
  async batchSync(data: SyncData): Promise<void> {
    // 5分钟一次，或游戏暂停时
    await this.request('POST', '/api/sync/batch-data', {
      playerId: this.playerId,
      clientTimestamp: Date.now(),
      data
    }, 'auxiliary');
  }

  // === 网络错误处理 ===
  private handleNetworkError(error: Error, task: any): void {
    this.offline = true;
    console.warn('Network error:', error);
  }

  // === 重连队列 ===
  private queueForRetry(task: any): void {
    this.syncQueue.push({
      ...task,
      retryCount: 0,
      queuedAt: Date.now()
    });
  }

  // === 网络恢复 ===
  onNetworkRestored(): void {
    this.offline = false;
    this.processRetryQueue();
  }

  private async processRetryQueue(): Promise<void> {
    while (this.syncQueue.length > 0) {
      const task = this.syncQueue.shift();
      try {
        await this.request(task.method, task.path, task.body, task.priority);
      } catch (error) {
        task.retryCount++;
        if (task.retryCount < 3) {
          // 指数退避重试
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, task.retryCount) * 1000)
          );
          this.queueForRetry(task);
        }
      }
    }
  }

  // === 签名生成 (防篡改) ===
  private generateSignature(data: any): string {
    const secret = this.sessionToken;
    const dataStr = JSON.stringify(data);
    return hmacSha256(dataStr, secret);
  }
}
```

---

## 性能约束

### 请求频率限制 (Rate Limiting)

```
Layer 1 (关键):
  - submitScore: 最多 1次/10秒
  - createRescueRequest: 最多 1次/5秒

Layer 2 (重要):
  - checkConfigVersion: 最多 1次/1小时

Layer 3 (辅助):
  - batchSync: 最多 1次/5分钟

Layer 4 (统计):
  - reportAnomaly: 最多 100次/小时
```

### 超时与重试

```
关键请求 (critical):
  超时: 10秒
  重试: 最多3次 (指数退避: 1s, 2s, 4s)
  失败处理: 本地缓存，应用退出时仍保留

重要请求 (important):
  超时: 5秒
  重试: 最多2次 (指数退避: 1s, 2s)
  失败处理: 本地缓存，下次游戏启动时重试

辅助请求 (auxiliary):
  超时: 5秒
  重试: 最多1次
  失败处理: 丢弃 (不影响游戏进行)
```

---

## 服务端实现要求

### 数据库表设计

```sql
-- 玩家账户
CREATE TABLE accounts (
  id VARCHAR(36) PRIMARY KEY,
  wechat_openid VARCHAR(255) UNIQUE NOT NULL,
  nickname VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- 排行榜分数
CREATE TABLE scores (
  id VARCHAR(36) PRIMARY KEY,
  player_id VARCHAR(36) NOT NULL,
  map_id VARCHAR(50) NOT NULL,
  score INT NOT NULL,
  damage_dealt INT,
  damage_received INT,
  clear_time INT,
  extract_success BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES accounts(id),
  INDEX idx_player_score (player_id, score DESC),
  INDEX idx_map_score (map_id, score DESC)
);

-- 排行榜缓存 (Redis)
CACHE KEY: leaderboard:daily
CACHE KEY: leaderboard:player:{playerId}:rank
TTL: 5分钟

-- 救援请求
CREATE TABLE rescue_requests (
  id VARCHAR(36) PRIMARY KEY,
  requester_id VARCHAR(36) NOT NULL,
  map_id VARCHAR(50),
  lost_items JSON,
  total_value INT,
  status ENUM('pending', 'completed', 'expired'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES accounts(id)
);

-- 救援完成记录
CREATE TABLE rescue_completions (
  id VARCHAR(36) PRIMARY KEY,
  request_id VARCHAR(36) NOT NULL,
  hero_id VARCHAR(36) NOT NULL,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES rescue_requests(id),
  FOREIGN KEY (hero_id) REFERENCES accounts(id)
);
```

---

**版本控制**: v1.0 (2025-12-26)  
**最后更新**: 2025-12-26
