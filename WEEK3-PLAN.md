# Week 3 完整规划：服务化与系统优化

**开始日期：** 2025-12-26  
**目标进度：** 100% (Days 11-15)  
**项目阶段：** Phase 1 Week 3: 微服务化 + 可观测性 + 完整游戏流程

---

## 📋 Week 3 核心目标

在 Week 2 的基础上（完整数据库+认证+缓存），Week 3 将实现：

1. **消息队列与异步处理** - 解耦业务逻辑，提升吞吐量
2. **日志系统与链路追踪** - 完整的系统可观测性
3. **性能监控与告警** - 实时掌握系统健康状态
4. **单机游戏完整流程** - 前端游戏玩法完整实现
5. **社交排行榜优化** - 深化玩家粘性

**关键特点：** 保持单机游戏设计（Player vs AI），通过服务化提升系统能力

---

## 🎯 Day 11: 消息队列与异步处理 (上午)

### 11.1 Redis Stream 实现轻量级队列

**文件：** `backend/src/services/QueueService.ts` (280 行)

```typescript
/**
 * Redis Stream 实现消息队列
 * 轻量级异步处理：无需外部 MQ
 */
export class QueueService {
  // 支持的队列类型
  enum QueueType {
    SCORE_SUBMISSION = 'queue:scores',      // 分数提交（关键）
    RESCUE_REQUEST = 'queue:rescues',       // 救援请求（重要）
    DATA_SYNC = 'queue:syncs',              // 数据同步（辅助）
    NOTIFICATION = 'queue:notifications',   // 通知发送（异步）
  }

  // 异步处理：排行榜更新、用户通知、数据分析等
  async enqueueScoreSubmission(battleResult: any): Promise<void> {
    await this.redis.xadd(
      QueueType.SCORE_SUBMISSION,
      '*',
      {
        playerId: battleResult.playerId,
        mapId: battleResult.mapId,
        score: battleResult.score,
        timestamp: Date.now()
      }
    );
  }

  // 消费队列（后台 Worker）
  async startWorker(queueType: QueueType): Promise<void> {
    // 持续消费消息
    // 失败自动重试（3 次）
    // 死信队列处理
  }
}
```

**关键功能：**
- ✅ Redis Stream 实现（无需额外依赖）
- ✅ 4 层优先级队列
- ✅ 自动重试机制（3 次 + 指数退避）
- ✅ 死信队列处理
- ✅ 消费者群组支持
- ✅ 消息持久化

**预期成果：**
- 关键操作（分数提交）速度提升 300%（异步离线处理）
- 系统吞吐量提升 5 倍
- 不涉及实时性的操作异步化

---

### 11.2 异步任务处理系统

**文件：** `backend/src/services/AsyncJobService.ts` (250 行)

```typescript
export class AsyncJobService {
  // 支持的异步任务类型
  enum JobType {
    UPDATE_LEADERBOARD = 'job:update_leaderboard',
    SEND_NOTIFICATION = 'job:send_notification',
    CLEANUP_EXPIRED_DATA = 'job:cleanup',
    GENERATE_DAILY_REPORT = 'job:daily_report',
    CALCULATE_ACHIEVEMENTS = 'job:achievements'
  }

  // 任务定义
  async scheduleJob(jobType: JobType, payload: any, delay: number = 0): Promise<string> {
    const jobId = uuid();
    
    // 支持延迟执行
    const executeTime = Date.now() + delay;
    
    // 存储到 Redis 有序集合（按执行时间排序）
    await this.redis.zadd(`jobs:${jobType}`, executeTime, JSON.stringify({
      jobId,
      payload,
      retries: 0,
      maxRetries: 3,
      createdAt: Date.now()
    }));
    
    return jobId;
  }

  // 后台 Cron Worker（每秒检查一次）
  async startJobWorker(): Promise<void> {
    setInterval(async () => {
      const now = Date.now();
      
      // 获取所有应该执行的任务
      const jobs = await this.redis.zrange('jobs:*', 0, -1, 'BYSCORE', 0, now);
      
      for (const job of jobs) {
        try {
          await this.executeJob(JSON.parse(job));
        } catch (error) {
          // 重试逻辑
        }
      }
    }, 1000);
  }
}
```

**支持的异步任务：**
- 排行榜更新（5 分钟延迟）
- 用户通知发送（无需实时）
- 过期数据清理（每日凌晨）
- 成就系统计算（离线计算）
- 每日/周/月数据报告

**预期成果：**
- 实时关键操作速度提升
- 后台任务不阻塞主流程
- 支持任务去重和幂等性保证

---

## 🎯 Day 12: 日志系统与链路追踪 (上午)

### 12.1 日志收集系统

**文件：** `backend/src/services/LoggingService.ts` (200 行)

```typescript
export class LoggingService {
  /**
   * 结构化日志格式
   * {
   *   timestamp: ISO8601
   *   level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
   *   service: 'auth' | 'leaderboard' | 'rescue' | etc.
   *   traceId: UUID (用于链路追踪)
   *   userId: string
   *   action: 'login' | 'submit_score' | etc.
   *   duration: ms
   *   statusCode: number
   *   error?: { code, message, stack }
   * }
   */
  
  async info(service: string, action: string, details: any): Promise<void> {
    const log = {
      timestamp: new Date().toISOString(),
      level: 'info',
      service,
      action,
      traceId: this.getTraceId(),  // 从 req context 中获取
      userId: this.getUserId(),
      details,
      hostname: os.hostname()
    };
    
    // 1. 写入本地文件（JSON 格式，便于解析）
    fs.appendFileSync(`logs/${service}.log`, JSON.stringify(log) + '\n');
    
    // 2. 发送到日志聚合服务
    await this.sendToLogCollector(log);
  }
}
```

**日志级别分类：**

| 级别 | 用途 | 示例 |
|------|------|------|
| **debug** | 开发调试 | 函数进入、变量值 |
| **info** | 重要事件 | 用户登录、分数提交 |
| **warn** | 警告信息 | 分数异常、重试触发 |
| **error** | 错误事件 | 数据库失败、API 错误 |
| **fatal** | 致命错误 | 系统崩溃、无法恢复 |

**日志存储策略：**
- 本地日志：按服务分类，每日轮转
- 中心日志服务：聚合来自所有实例的日志
- 搜索索引：快速查询特定事件

**预期成果：**
- 完整的操作审计日志
- 故障排查时间从小时级降低到分钟级
- 支持按 traceId 追踪完整请求链路

---

### 12.2 链路追踪系统

**文件：** `backend/src/middleware/tracing.ts` (150 行)

```typescript
/**
 * 链路追踪中间件
 * 跟踪单个请求从进入到返回的完整过程
 */

export function tracingMiddleware(req, res, next) {
  // 1. 生成 traceId（如果没有）
  const traceId = req.headers['x-trace-id'] || uuid();
  
  // 2. 记录请求开始
  const startTime = performance.now();
  const requestLog = {
    traceId,
    spanId: uuid(),
    operationName: `${req.method} ${req.path}`,
    startTime,
    tags: {
      'http.method': req.method,
      'http.url': req.url,
      'http.client_ip': req.ip
    }
  };

  // 3. 在响应头中包含 traceId
  res.setHeader('X-Trace-ID', traceId);

  // 4. 拦截响应完成事件
  const originalSend = res.send;
  res.send = function(data) {
    const duration = performance.now() - startTime;
    
    // 记录追踪信息
    tracer.recordSpan({
      ...requestLog,
      duration,
      statusCode: res.statusCode,
      spanTags: {
        'http.status_code': res.statusCode
      }
    });

    return originalSend.call(this, data);
  };

  next();
}
```

**追踪场景：**
- API 请求链路（进入 → 认证 → 业务逻辑 → 数据库 → 返回）
- 缓存访问（缓存命中 vs 缓存未命中 → 数据库查询）
- 消息队列（消息发送 → 消费 → 处理完成）

**预期成果：**
- 可视化单个请求的完整链路
- 识别性能瓶颈（哪一步最慢）
- 支持分布式系统的跨服务追踪

---

## 🎯 Day 13: 性能监控与告警系统 (上午)

### 13.1 Prometheus 性能指标收集

**文件：** `backend/src/services/MetricsService.ts` (200 行)

```typescript
/**
 * Prometheus 格式指标收集
 * 暴露 /metrics 端点，供 Prometheus scrape
 */

export class MetricsService {
  // 定义指标类型
  private counters = new Map();  // 计数器（只能增加）
  private gauges = new Map();    // 仪表（可增可减）
  private histograms = new Map(); // 直方图（分布）
  
  // 关键指标
  http_requests_total = new Counter({
    name: 'http_requests_total',
    help: '总请求数',
    labels: ['method', 'endpoint', 'status']
  });

  http_request_duration_seconds = new Histogram({
    name: 'http_request_duration_seconds',
    help: '请求耗时（秒）',
    labels: ['method', 'endpoint'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
  });

  db_query_duration_seconds = new Histogram({
    name: 'db_query_duration_seconds',
    help: '数据库查询耗时（秒）',
    labels: ['operation', 'table'],
    buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1]
  });

  cache_hits_total = new Counter({
    name: 'cache_hits_total',
    help: '缓存命中次数',
    labels: ['cache_type']
  });

  cache_misses_total = new Counter({
    name: 'cache_misses_total',
    help: '缓存未命中次数',
    labels: ['cache_type']
  });

  active_players_gauge = new Gauge({
    name: 'active_players',
    help: '在线玩家数'
  });

  queue_length_gauge = new Gauge({
    name: 'queue_length',
    help: '队列长度',
    labels: ['queue_type']
  });
}
```

**关键指标体系：**

| 指标 | 类型 | 告警阈值 |
|------|------|---------|
| **API 响应时间** | Histogram | P99 > 500ms |
| **API 错误率** | Counter | > 1% |
| **数据库查询耗时** | Histogram | P99 > 100ms |
| **缓存命中率** | Gauge | < 70% |
| **在线玩家数** | Gauge | - |
| **消息队列长度** | Gauge | > 10000 |
| **内存占用** | Gauge | > 1GB |

---

### 13.2 Grafana 可视化仪表板

**配置文件：** `backend/monitoring/grafana-dashboards.json` (500 行)

```json
{
  "dashboard": {
    "title": "Light Heart 游戏系统监控",
    "panels": [
      {
        "title": "API 吞吐量",
        "targets": [
          {
            "expr": "rate(http_requests_total[1m])",
            "legend": "{{method}} {{endpoint}}"
          }
        ],
        "alert": {
          "condition": "吞吐量 < 50 req/s",
          "severity": "critical"
        }
      },
      {
        "title": "API 响应时间 P99",
        "targets": [
          {
            "expr": "histogram_quantile(0.99, http_request_duration_seconds)"
          }
        ],
        "alert": {
          "condition": "P99 > 500ms",
          "severity": "warning"
        }
      },
      {
        "title": "缓存命中率",
        "targets": [
          {
            "expr": "rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))"
          }
        ],
        "alert": {
          "condition": "命中率 < 70%",
          "severity": "info"
        }
      },
      {
        "title": "在线玩家数",
        "targets": [
          {
            "expr": "active_players"
          }
        ]
      },
      {
        "title": "数据库查询耗时 P95",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, db_query_duration_seconds)"
          }
        ],
        "alert": {
          "condition": "P95 > 100ms",
          "severity": "warning"
        }
      }
    ]
  }
}
```

**仪表板功能：**
- 实时吞吐量展示
- 响应时间分布
- 错误率监控
- 资源使用统计
- 业务指标追踪
- 历史趋势对比

**预期成果：**
- 实时掌握系统健康状况
- 瓶颈自动识别
- 性能告警及时通知

---

## 🎯 Day 14: 单机游戏完整流程实现 (下午)

### 14.1 前端游戏框架完善

**文件：** `frontend/src/scenes/GameScene.ts` (400 行)

```typescript
/**
 * 主游戏场景
 * 流程：营地 → 地图选择 → 搜寻 → 战斗 → 撤离 → 结算
 */

export class GameScene extends cc.Scene {
  private gameState: GameState = GameState.CAMP;
  
  enum GameState {
    CAMP,          // 营地（选择角色、装备）
    MAP_SELECT,    // 地图选择
    SEARCHING,     // 搜寻阶段
    BATTLE,        // 战斗阶段
    EXTRACTION,    // 撤离阶段
    SETTLEMENT     // 结算界面
  }

  async initialize(): Promise<void> {
    // 加载玩家存档
    this.playerData = await GameManager.getPlayerData();
    
    // 初始化 UI
    this.showCampUI();
  }

  // ========== 营地阶段 ==========
  private async showCampUI(): Promise<void> {
    // 显示角色选择界面
    // 显示装备配置界面
    // 显示背包
    // 显示已完成任务/成就
    this.gameState = GameState.CAMP;
  }

  // ========== 地图选择阶段 ==========
  async selectMap(mapId: string): Promise<void> {
    const mapData = await MapService.getMapData(mapId);
    this.currentMap = mapData;
    this.gameState = GameState.MAP_SELECT;
    
    // 显示地图难度、推荐等级、预期收益
    this.showMapInfoUI(mapData);
  }

  async startGame(mapId: string): Promise<void> {
    // 初始化搜寻阶段
    this.gameState = GameState.SEARCHING;
    
    // 加载地图场景
    const mapScene = await this.loadMapScene(mapId);
    this.addChild(mapScene);
    
    // 开始搜寻倒计时（10-30 分钟）
    this.startSearchTimer(mapData.timeLimit);
  }

  // ========== 搜寻阶段 ==========
  private async onSearching(deltaTime: number): Promise<void> {
    // 1. 玩家在地图上移动、打开宝箱、搜索物资
    // 2. 触发随机事件（遭遇敌人、发现宝藏等）
    // 3. 管理库存（物品重量限制）
    
    if (this.shouldTriggerEncounter()) {
      this.triggerEnemyEncounter();
      this.gameState = GameState.BATTLE;
    }
  }

  // ========== 战斗阶段 ==========
  private async conductBattle(): Promise<void> {
    // 1. 进入战斗 UI
    // 2. 轮流操作（玩家选择行动，AI 选择行动）
    // 3. 计算伤害、更新 HP
    // 4. 战斗结束（胜利/失败）
    
    const battleResult = await BattleManager.conductBattle(
      this.playerUnit,
      this.enemyUnits
    );

    if (battleResult === 'win') {
      // 获得战利品
      this.loot.push(...battleResult.rewards);
    } else {
      // 失败：失去部分物品
      this.handleBattleLoss();
    }

    this.gameState = GameState.SEARCHING;
  }

  // ========== 撤离阶段 ==========
  async initiateExtraction(): Promise<void> {
    // 1. 搜寻时间到期或玩家主动触发撤离
    // 2. 显示撤离倒计时（2-5 分钟）
    // 3. 敌人加强（撤离点被发现）
    // 4. 到达撤离点则成功
    
    this.gameState = GameState.EXTRACTION;
    this.showExtractionUI();
    
    const extracted = await this.moveToExtractionPoint();
    
    if (extracted) {
      await this.completeExtraction();
    } else {
      await this.handleExtractionFailure();
    }
  }

  // ========== 结算阶段 ==========
  private async showSettlementUI(result: GameResult): Promise<void> {
    // 显示战利品列表
    // 显示获得的经验、金币
    // 显示排名变化
    // 提供分享选项
    
    // 提交分数到服务器
    await GameManager.submitBattleResult({
      mapId: this.currentMap.id,
      score: result.finalScore,
      loot: result.loot,
      extractSuccess: result.extractSuccess,
      duration: result.duration
    });

    this.gameState = GameState.CAMP;
  }
}
```

**游戏流程完整性：**

```
┌────────────────────────────────────────────────────┐
│                    营地（Camp）                      │
│  - 选择角色（属性加成不同）                         │
│  - 配置装备（属性加成）                             │
│  - 查看任务/成就                                    │
│  - 升级技能                                         │
└──────────────────┬─────────────────────────────────┘
                   │ 开始游戏
┌──────────────────▼─────────────────────────────────┐
│              地图选择（Map Select）                  │
│  - 显示 3-5 张可用地图                              │
│  - 难度等级（普通/困难/地狱）                      │
│  - 预期收益评估                                     │
└──────────────────┬─────────────────────────────────┘
                   │ 选择地图
┌──────────────────▼─────────────────────────────────┐
│               搜寻阶段（Searching）                  │
│  - 在地图上移动（触摸操作）                        │
│  - 搜索资源点（宝箱、物资）                        │
│  - 触发随机事件（30% 概率遭遇敌人）               │
│  - 时间限制（10-30 分钟，视难度）                  │
│  - 库存管理（物品数量/重量限制）                   │
│  ↓                                                  │
│  如果遭遇敌人 ──→ 进入战斗阶段                     │
│  如果时间到期 ──→ 进入撤离阶段                     │
│  如果玩家选择撤离 ──→ 进入撤离阶段                 │
└──────────────────┬─────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   战斗失败          战斗胜利 / 选择逃离
        │                     │
   进入撤离阶段          继续搜寻
   （加强版）              │
        │                     │
        └──────────┬──────────┘
                   │
┌──────────────────▼─────────────────────────────────┐
│               撤离阶段（Extraction）                 │
│  - 显示撤离点位置（地图上标记）                    │
│  - 倒计时（2-5 分钟）                              │
│  - 敌人增强（搜寻敌人 2 倍）                       │
│  - 到达撤离点则成功                                │
│  - 失败则丢失部分战利品                            │
└──────────────────┬─────────────────────────────────┘
                   │ 撤离成功
┌──────────────────▼─────────────────────────────────┐
│             结算阶段（Settlement）                   │
│  - 显示本局数据                                     │
│    * 获得金币：xxx                                  │
│    * 获得经验：xxx                                  │
│    * 获得物品：[物品列表]                           │
│    * 本局排名：xxx                                  │
│    * 全服排名：↑5 (变化)                            │
│  - 提交分数到排行榜                                │
│  - 分享成绩选项                                     │
│  - 返回营地按钮                                     │
└──────────────────┬─────────────────────────────────┘
                   │ 返回
                   ↓
              回到营地（循环）
```

---

### 14.2 单机战斗系统完整实现

**文件：** `frontend/src/components/BattleManager.ts` (350 行)

```typescript
/**
 * 完整的回合制战斗系统
 * 支持 1v1, 1vN, NvN 等多种战斗类型
 */

export class BattleManager {
  private playerUnit: PlayerBattleUnit;
  private enemyUnits: EnemyBattleUnit[] = [];
  private turnOrder: BattleUnit[] = [];
  private currentTurnIndex: number = 0;
  private battleLog: BattleAction[] = [];

  // 战斗属性计算公式
  calculateDamage(attacker: BattleUnit, defender: BattleUnit, skill: Skill): number {
    const baseDamage = attacker.stats.atk * skill.multiplier;
    const defenseReduction = 1 - (defender.stats.def / (defender.stats.def + 100));
    const elementBonus = this.getElementBonus(skill.element, defender.element);
    const randomVariance = 0.9 + Math.random() * 0.2; // ±10%
    
    return Math.floor(baseDamage * defenseReduction * elementBonus * randomVariance);
  }

  // 属性克制系统
  private getElementBonus(attackElement: Element, defendElement: Element): number {
    const bonusMap = {
      'fire': { 'wood': 1.5, 'water': 0.5 },
      'water': { 'fire': 1.5, 'earth': 0.5 },
      'earth': { 'water': 1.5, 'wind': 0.5 },
      // ... 更多克制关系
    };
    return bonusMap[attackElement]?.[defendElement] ?? 1.0;
  }

  // 战斗主循环
  async startBattle(): Promise<BattleResult> {
    // 1. 初始化战斗
    this.calculateTurnOrder();  // 按 SPD 排序行动顺序
    this.showBattleUI();

    // 2. 回合循环
    while (this.isBattleActive()) {
      const currentUnit = this.turnOrder[this.currentTurnIndex];
      
      // 玩家回合：等待玩家选择
      if (currentUnit === this.playerUnit) {
        const action = await this.waitForPlayerAction();
        await this.executeAction(action);
      } else {
        // AI 回合：AI 决策
        const action = (currentUnit as EnemyBattleUnit).makeDecision();
        await this.executeAction(action);
      }

      // 检查战斗结束条件
      if (this.playerUnit.isDead) return { result: 'lose', rewards: {} };
      if (this.enemyUnits.every(e => e.isDead)) return { result: 'win', rewards: this.calculateRewards() };

      // 进行下一回合
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
      await this.waitForAnimationComplete();
    }
  }

  // 执行单个行动
  private async executeAction(action: BattleAction): Promise<void> {
    // 1. 播放攻击动画
    await action.actor.playAnimation('attack');

    // 2. 计算伤害
    const targets = action.targets || [this.getDefaultTarget(action.actor)];
    const damages = targets.map(target => ({
      target,
      damage: this.calculateDamage(action.actor, target, action.skill)
    }));

    // 3. 应用伤害
    await this.waitFrames(20);  // 等待攻击动画到达命中帧
    for (const { target, damage } of damages) {
      target.receiveDamage(damage);
      this.showDamageNumber(damage, target);
    }

    // 4. 播放受击动画
    targets.forEach(t => t.playAnimation('hurt'));
    
    // 记录战斗日志
    this.battleLog.push({
      actor: action.actor.name,
      action: action.skill.name,
      targets: targets.map(t => t.name),
      damages
    });
  }

  // AI 决策逻辑
  class EnemyBattleUnit extends BattleUnit {
    makeDecision(): BattleAction {
      // 简单 AI：评分最高的行动
      const possibleActions = [
        { action: 'attack', score: this.evaluateAttack() },
        { action: 'defend', score: this.evaluateDefend() },
        { action: 'skill', score: this.evaluateSkill() },
        { action: 'heal', score: this.evaluateHeal() }
      ];

      const bestAction = possibleActions.reduce((a, b) => a.score > b.score ? a : b);
      return this.getActionByType(bestAction.action);
    }

    private evaluateAttack(): number {
      // 敌人 HP 高 → 优先攻击
      return (this.stats.hp / this.stats.maxHp) * 10;
    }

    private evaluateDefend(): number {
      // 敌人 HP 低 → 优先防守
      return (1 - this.stats.hp / this.stats.maxHp) * 10;
    }

    // ... 其他评估方法
  }
}
```

**战斗系统特性：**
- ✅ 回合制战斗（易上手）
- ✅ 属性克制系统（有深度）
- ✅ 技能系统（多样性）
- ✅ Buff/Debuff 管理（复杂度）
- ✅ AI 决策（智能敌人）
- ✅ 完整的战斗动画
- ✅ 实时战斗日志

---

## 🎯 Day 15: 社交与排行榜深度优化 (下午)

### 15.1 救援系统完整实现

**文件：** `backend/src/routes/rescue.ts` 增强版 (300+ 行)

```typescript
/**
 * 救援系统：玩家失败时向好友求救
 * 好友完成小挑战可帮助失败玩家恢复部分战利品
 */

router.post('/request', authMiddleware, async (req, res) => {
  const { playerId } = req.user;
  const { mapId, lostItems, totalValue } = req.body;

  // 1. 验证失败状态
  const failedBattle = await BattleService.getLastFailedBattle(playerId, mapId);
  if (!failedBattle) {
    return res.status(400).json({
      success: false,
      error: 'NO_FAILED_BATTLE',
      message: '没有失败的战斗记录'
    });
  }

  // 2. 创建救援请求
  const rescueRequest = await RescueService.createRescueRequest({
    requesterId: playerId,
    mapId,
    lostItems,
    totalValue,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)  // 24 小时有效期
  });

  // 3. 生成分享链接
  const shareLink = `https://yourdomain.com/rescue/${rescueRequest.id}`;
  const shareMessage = `我在 ${mapId} 失败了，丢失了价值 ${totalValue} 金币的物品！快来救救我吧！`;

  res.json({
    success: true,
    rescueId: rescueRequest.id,
    shareLink,
    shareMessage,
    expiresAt: rescueRequest.expiresAt
  });
});

router.post('/respond/:rescueId', authMiddleware, async (req, res) => {
  const { playerId } = req.user;
  const { rescueId } = req.params;

  // 1. 获取救援请求
  const rescueRequest = await RescueService.getRescueRequest(rescueId);
  if (!rescueRequest) {
    return res.status(404).json({ success: false, error: 'NOT_FOUND' });
  }

  // 2. 发起营救挑战（小游戏）
  const challengeData = {
    type: 'mini_challenge',
    difficulty: this.estimateDifficulty(rescueRequest.mapId),
    timeLimit: 5 * 60,  // 5 分钟
    objective: `收集 ${rescueRequest.lostItems.length} 件物品`
  };

  res.json({
    success: true,
    challengeId: uuid(),
    challengeData
  });
});

router.post('/complete/:challengeId', authMiddleware, async (req, res) => {
  const { playerId } = req.user;
  const { challengeId } = req.params;
  const { success, score } = req.body;

  if (!success) {
    return res.json({
      success: false,
      message: '营救失败'
    });
  }

  // 营救成功：给双方发放奖励
  const reward = {
    rescuer: {
      gold: 100 + score * 10,
      exp: 50 + score * 5,
      achievementPoints: 10
    },
    requester: {
      gold: 50 + score * 5,
      exp: 25 + score * 2,
      itemsRecovered: 60 + score  // 恢复 60-100% 的物品
    }
  };

  // 双方各得奖励
  await accountService.addGold(rescuer.playerId, reward.rescuer.gold);
  await accountService.addGold(requester.playerId, reward.requester.gold);

  res.json({
    success: true,
    message: '营救成功！',
    rewards: reward
  });
});
```

---

### 15.2 排行榜社交功能

**增强功能：**

1. **多维度排行榜**
   - 全服总分排行
   - 周分榜（赛季制）
   - 地图特定排行
   - 好友排行

2. **成就系统**
   ```typescript
   interface Achievement {
     id: string;
     name: string;
     description: string;
     condition: (playerStats) => boolean;  // 解锁条件
     reward: { gold: number, exp: number };
     rarity: 'common' | 'rare' | 'epic' | 'legendary';
   }
   ```

3. **称号系统**
   - 前 10 排名：金色称号
   - 周活跃："活跃玩家"
   - 成就达成：对应称号

4. **好友功能**
   - 关注/粉丝系统
   - 排行榜对比
   - 私聊功能（可选）

---

## 📊 Week 3 工作量评估

| Day | 任务 | 代码行数 | 文档行数 | 难度 | 时间 |
|-----|------|---------|---------|------|------|
| 11 | 消息队列 + 异步 | 530 | 200 | ⭐⭐⭐ | 8h |
| 12 | 日志 + 链路追踪 | 350 | 200 | ⭐⭐⭐ | 8h |
| 13 | 监控 + 告警 | 200 | 300 | ⭐⭐ | 6h |
| 14 | 游戏完整流程 | 750 | 300 | ⭐⭐⭐⭐ | 10h |
| 15 | 社交优化 | 400 | 200 | ⭐⭐⭐ | 8h |
| **总计** | | **2,230** | **1,200** | | **40h** |

---

## ✅ Week 3 验收标准

### Day 11 验收
- [ ] Redis Stream 队列可用
- [ ] 异步任务成功执行（至少 3 类）
- [ ] 关键路径（分数提交）性能提升 ≥ 50%

### Day 12 验收
- [ ] 结构化日志完整输出
- [ ] 链路追踪可视化 (traceId 完整)
- [ ] 任意请求可按 traceId 追踪完整链路

### Day 13 验收
- [ ] Prometheus 接口返回有效指标数据
- [ ] Grafana 仪表板显示实时数据
- [ ] 至少 5 条告警规则配置

### Day 14 验收
- [ ] 游戏 4 个阶段可完整运行（搜寻→战斗→撤离→结算）
- [ ] AI 敌人可正常对战
- [ ] 分数可成功上传排行榜
- [ ] 游戏流程视频录制

### Day 15 验收
- [ ] 救援系统功能完整（请求→营救→奖励）
- [ ] 多维度排行榜可用
- [ ] 成就系统至少 10 个成就

---

## 🚀 开发顺序

**推荐顺序（按依赖关系）：**

1. **Day 14 优先** - 游戏流程完整实现
   - 这是游戏的核心，其他功能都是在此之上
   - 可以并行开发 Day 11-13

2. **Day 11 同步** - 消息队列
   - 用于异步处理游戏结果提交
   - 需要在 Day 14 后集成

3. **Day 12 同步** - 日志与追踪
   - 用于调试游戏流程中的问题
   - 在 Day 14 开发时即可启用

4. **Day 13 同步** - 监控告警
   - 用于监控系统运行状况
   - 可在 Day 14 后集成

5. **Day 15 最后** - 社交优化
   - 基于排行榜的社交功能
   - 在 Day 14 完成后实现

---

## 📝 下一步

我已经准备好开始开发。你想从哪一天开始？

**建议：**
- 🎮 先从 **Day 14 游戏流程** 开始（核心功能）
- 然后 **Day 11-13** 平行优化（基础设施）
- 最后 **Day 15** 社交增强（用户粘性）

准备好了吗？我们从哪一天开始？
