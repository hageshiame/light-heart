import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import leaderboardRouter from './routes/leaderboard';
import rescueRouter from './routes/rescue';
import syncRouter from './routes/sync';
import { authMiddleware, optionalAuthMiddleware, errorHandler } from './middleware/auth';
import { ipRateLimit, playerRateLimit } from './middleware/rate-limit';
import RedisManager from './db/RedisManager';
import CacheStrategy from './db/CacheStrategy';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// 初始化 Redis
(async () => {
  await RedisManager.connect();
  if (RedisManager.isConnected()) {
    console.log('✓ Redis 缓存已启用');
  } else {
    console.log('⚠️  Redis 未连接，系统将继续运行但不使用 Redis 缓存');
  }
})();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));

// 速率限制（全局）
app.use(ipRateLimit({
  windowMs: 15 * 60 * 1000,  // 15 分钟
  max: 100                    // 100 请求
}));

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 缓存统计端点（仅用于监控）
app.get('/api/cache/stats', async (req, res) => {
  const stats = await CacheStrategy.getStats();
  res.json({ success: true, cache: stats });
});

// 缓存清除端点（仅开发环境）
if (process.env.NODE_ENV === 'development') {
  app.post('/api/cache/clear', async (req, res) => {
    await CacheStrategy.clearAll();
    res.json({ success: true, message: '缓存已清除' });
  });
}

// 健康检查（无需认证）
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 认证路由（无需认证）
app.use('/api/auth', authRouter);

// 排行榜路由（某些端点需要认证）
app.use('/api/leaderboard', leaderboardRouter);

// 救援路由（需要认证）
app.use('/api/rescue', authMiddleware, playerRateLimit(), rescueRouter);

// 数据同步路由（需要认证）
app.use('/api/sync', authMiddleware, playerRateLimit(), syncRouter);

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: 'Endpoint not found',
    path: req.path
  });
});

// 错误处理中间件（必须在所有其他中间件之后）
app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // 预热缓存
  if (RedisManager.isConnected()) {
    await CacheStrategy.warmupCache();
  }
});

