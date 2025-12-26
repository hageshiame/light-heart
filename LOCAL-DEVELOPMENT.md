# 🎮 Light Heart Game - Local Development Setup

**项目状态**: Phase 1 (本地开发框架完成)  
**更新日期**: 2025-12-26  
**架构**: 混合架构 (本地SQLite + 可选服务器)

---

## 📁 项目结构

```
light-heart/
├── backend/                    # Node.js后端服务
│   ├── src/
│   │   ├── app.ts             # Express应用主文件
│   │   └── routes/            # API路由
│   │       ├── auth.ts        # 认证接口
│   │       ├── leaderboard.ts # 排行榜接口
│   │       ├── rescue.ts      # 救援接口
│   │       └── sync.ts        # 数据同步接口
│   ├── tsconfig.json          # TypeScript配置
│   ├── package.json           # 依赖配置
│   ├── .env                   # 环境变量
│   └── dist/                  # 编译输出
│
├── frontend/                   # 前端应用 (WeChat Mini Program / Web)
│   ├── src/
│   │   ├── managers/          # 核心管理器
│   │   │   ├── GameManager.ts         # 游戏主管理器
│   │   │   ├── SQLiteManager.ts       # 本地数据库管理
│   │   │   └── NetworkManager.ts      # 网络通信管理
│   │   └── index.ts           # 前端入口
│   ├── tsconfig.json          # TypeScript配置
│   ├── package.json           # 依赖配置
│   └── dist/                  # 编译输出
│
├── design.md                  # 原始设计文档
├── implementation-guide.md    # 实现指南
├── TECHNICAL-DECISIONS.md     # 技术决策与架构
├── DAY1-COMPLETION-REPORT.md  # Day 1完成报告
└── LOCAL-DEVELOPMENT.md       # 本地开发指南 (当前文件)
```

---

## 🚀 快速开始

### 前置条件
- Node.js 16+ 
- npm 或 yarn
- 现代浏览器 (Chrome/Firefox/Safari)

### 启动后端服务

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 启动开发服务器 (PORT=3000)
npm run dev

# 输出: 
# 🚀 Server is running on http://localhost:3000
```

### 启动前端开发

```bash
# 新终端窗口，进入前端目录
cd frontend

# 安装依赖
npm install

# 启动Vite开发服务器 (PORT=3001)
npm run dev

# 输出:
#   VITE v5.x.x  ready in xxx ms
#   ➜  Local:   http://localhost:3001
```

### 测试API

```bash
# 检查后端健康状态
curl http://localhost:3000/health

# 输出:
# {"status":"ok","timestamp":"2025-12-26T02:10:09.781Z"}

# 测试登录接口
curl -X POST http://localhost:3000/api/auth/wechat-login \
  -H "Content-Type: application/json" \
  -d '{"code":"test_code_001"}'

# 输出:
# {
#   "success": true,
#   "sessionToken": "eyJhbGc...",
#   "playerId": "player_test_co",
#   "message": "Login successful"
# }
```

---

## 🏗️ 架构详解

### 1. 混合架构 (Hybrid Architecture)

```
┌─────────────────────────────────┐
│       前端 (WeChat Mini App)      │
├─────────────────────────────────┤
│  GameManager (协调)              │
│  ├─ SQLiteManager (本地)        │  ← 完全离线运行
│  └─ NetworkManager (网络)       │  ← 可选连接服务器
└─────────────────────────────────┘
          ↓ (HTTP)
┌─────────────────────────────────┐
│      后端 (Node.js)              │
├─────────────────────────────────┤
│  Express.js路由                  │
│  ├─ /api/auth                    │
│  ├─ /api/leaderboard             │
│  ├─ /api/rescue                  │
│  └─ /api/sync                    │
└─────────────────────────────────┘
```

### 2. 四层网络优先级分层

| Layer | 用途 | 超时 | 重试 | 例子 |
|-------|------|------|------|------|
| 1 | 关键数据 | 10秒 | 3次 | 排行榜提交、登录 |
| 2 | 重要数据 | 5秒 | 2次 | 救援请求、热更新 |
| 3 | 辅助数据 | 5秒 | 1次 | 数据同步(5分钟一次) |
| 4 | 统计数据 | 异步 | - | 异常上报(后台) |

### 3. 本地SQLiteManager特性

```typescript
// 特性:
✓ AES-256加密存储敏感数据
✓ SHA256完整性校验
✓ 5分钟自动备份
✓ 网络断线仍可游玩
✓ 自动恢复同步
```

---

## 📋 API端点列表

### 认证 (Auth)
```
POST /api/auth/wechat-login        # 微信授权登录
POST /api/auth/refresh-token       # 刷新会话令牌
```

### 排行榜 (Leaderboard - Layer 1)
```
POST /api/leaderboard/submit-score    # 提交战斗分数
GET  /api/leaderboard/get-rankings    # 获取排行榜
GET  /api/leaderboard/personal-history # 获取个人成绩
```

### 救援 (Rescue - Layer 2)
```
POST /api/rescue/create-request   # 发起救援请求
GET  /api/rescue/get-task         # 查询救援任务
POST /api/rescue/complete-task    # 完成救援任务
```

### 数据同步 (Sync - Layer 3)
```
POST /api/sync/batch-data    # 批量同步数据
GET  /api/sync/pull-latest   # 拉取增量更新
```

### 反作弊 (AntiCheat - Layer 4)
```
POST /api/sync/report-anomaly  # 上报异常行为
```

---

## 🧪 测试前端框架

### 在浏览器控制台测试

```javascript
// 初始化游戏
LightHeart.initializeGame('test_code_001')
  .then(({ game, database, network }) => {
    console.log('游戏初始化成功');
    console.log('网络状态:', game.getNetworkStatus());
  })

// 提交战斗结果
LightHeart.submitBattle({
  mapId: 'map_001',
  score: 2000,
  damageDealt: 150
})

// 创建救援请求
LightHeart.createRescue('map_001', [
  { id: 'item_1', value: 100, count: 5 }
])

// 查看网络队列
LightHeart.GameManager.getNetworkStatus()
```

---

## 🔧 开发工作流

### Day 2: 本地开发框架 ✅ (已完成)
- ✅ 后端Express.js骨架 + 4个路由
- ✅ 前端TypeScript管理器框架
- ✅ 本地测试验证

### Day 3: 数据库设计与规范

```bash
# 后端: MySQL DDL脚本
# 前端: SQLite表结构定义
```

### Day 4-5: 核心模块原型

```bash
# 实现具体API逻辑
# 实现SQLiteManager CRUD操作
# 实现NetworkManager重试机制
```

---

## 📝 环境配置

### 后端 (.env)

```ini
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# 可选: 连接真实MySQL (目前仅模拟)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password

JWT_SECRET=dev-secret-key
WECHAT_APPID=your_wechat_appid
```

### 前端

```typescript
// 在NetworkManager中配置API基础URL
private apiBaseUrl: string = 'http://localhost:3000';
```

---

## 📊 项目进度

| 阶段 | 任务 | 状态 | 产出 |
|------|------|------|------|
| Day 1 | 文档架构 | ✅ | TECHNICAL-DECISIONS.md |
| Day 2 | **本地框架** | ✅ | 后端+前端骨架 |
| Day 3 | 数据库设计 | ⏳ | DDL脚本 |
| Day 4-5 | 核心原型 | ⏳ | 完整API实现 |

---

## 🐛 常见问题

### Q: 后端启动报"找不到模块"
A: 运行 `npm install` 确保依赖已安装

### Q: 前端networkManager连接失败
A: 确认后端运行在 `http://localhost:3000`，检查CORS配置

### Q: 数据未持久化
A: 目前使用localStorage模拟，正式版需要使用SQLite驱动

### Q: 如何查看网络队列?
A: 浏览器控制台执行 `LightHeart.GameManager.getNetworkStatus()`

---

## 🚢 下一步

1. **完成Day 3**: 设计MySQL表结构和API业务逻辑
2. **完成Day 4-5**: 实现核心功能 + 单元测试
3. **本地验证**: 完整的登录→战斗→排行榜流程
4. **服务器部署**: 按需部署到真实服务器

---

## 📖 相关文档

- [TECHNICAL-DECISIONS.md](./TECHNICAL-DECISIONS.md) - 架构决策详解
- [implementation-guide.md](./implementation-guide.md) - 实现指南
- [DATA-SYNC-PROTOCOL.md](./DATA-SYNC-PROTOCOL.md) - 网络协议定义
- [DAY1-COMPLETION-REPORT.md](./DAY1-COMPLETION-REPORT.md) - Day 1完成报告

---

*最后更新: 2025-12-26 | Light Heart Development Team*
