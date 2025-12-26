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
import tracingMiddleware, { errorTracingMiddleware } from './middleware/tracingMiddleware';
import { loggingService } from './services/LoggingService';
import { metricsService } from './services/MetricsService';

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

// 链路追踪中间件（最先）
app.use(tracingMiddleware());

// 速率限制（全局）
app.use(ipRateLimit({
  windowMs: 15 * 60 * 1000,  // 15 分钟
  max: 100                    // 100 请求
}));

// 日志统计端点
app.get('/api/logging/stats', (req, res) => {
  const stats = loggingService.getLogStats();
  res.json({ success: true, logging: stats });
});

// 日志清理端点（仅管理员）
app.post('/api/logging/cleanup', (req, res) => {
  const daysRetain = req.body.daysRetain || 30;
  const result = loggingService.cleanupOldLogs(daysRetain);
  res.json({ success: true, result });
});

// 性能指标端点（Prometheus 格式）
app.get('/api/metrics/prometheus', (req, res) => {
  const prometheusMetrics = metricsService.exportPrometheus();
  res.set('Content-Type', 'text/plain');
  res.send(prometheusMetrics);
});

// 性能指标端点（JSON 格式）
app.get('/api/metrics/json', (req, res) => {
  const allMetrics = metricsService.getAllMetrics();
  res.json({ success: true, metrics: allMetrics });
});

// 重置性能指标（仅开发环境）
if (process.env.NODE_ENV === 'development') {
  app.post('/api/metrics/reset', (req, res) => {
    metricsService.reset();
    loggingService.info('Metrics reset by user', { userId: (req as any).userId });
    res.json({ success: true, message: '性能指标已重置' });
  });
}

// 缓存统计端点（仅用于监控）
app.get('/api/cache/stats', async (req, res) => {
  const stats = await CacheStrategy.getStats();
  res.json({ success: true, cache: stats });
});

// 缓存清除端点（仅开发环境）
if (process.env.NODE_ENV === 'development') {
  app.post('/api/cache/clear', async (req, res) => {
    await CacheStrategy.clearAll();
    loggingService.info('Cache cleared by user', { userId: (req as any).userId });
    res.json({ success: true, message: '缓存已清除' });
  });
}

// 健康检查（无需认证）
app.get('/health', (req, res) => {
  const traceId = res.getHeader('x-trace-id');
  loggingService.debug('Health check', { traceId });
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    traceId
  });
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
    path: req.path,
    traceId: res.getHeader('x-trace-id')
  });
});

// 链路追踪错误处理中间件（在通用错误处理之前）
app.use(errorTracingMiddleware());

// 错误处理中间件（必须在所有其他中间件之后）
app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // 记录服务启动事件
  loggingService.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
  
  // 预热缓存
  if (RedisManager.isConnected()) {
    await CacheStrategy.warmupCache();
    loggingService.info('Cache warmed up successfully');
  }
});

export default app;
export { loggingService, metricsService };
