/**
 * 性能指标服务
 * 
 * 使用 Prometheus 进行性能指标收集和暴露
 * 支持 Counter, Gauge, Histogram, Summary 等指标类型
 */

export interface MetricConfig {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  labels?: string[];
  buckets?: number[];
}

export interface MetricValue {
  name: string;
  value: number;
  labels?: Record<string, string | number>;
  timestamp?: number;
}

/**
 * 指标存储（模拟 Prometheus）
 */
class MetricStorage {
  private metrics: Map<string, any[]> = new Map();

  set(metricName: string, value: MetricValue): void {
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }
    this.metrics.get(metricName)!.push({
      ...value,
      timestamp: value.timestamp || Date.now()
    });
  }

  get(metricName: string): any[] | undefined {
    return this.metrics.get(metricName);
  }

  all(): Record<string, any[]> {
    return Object.fromEntries(this.metrics);
  }

  clear(): void {
    this.metrics.clear();
  }

  size(): number {
    return this.metrics.size;
  }
}

/**
 * 性能指标服务
 */
export class MetricsService {
  
  private static instance: MetricsService;
  private storage: MetricStorage = new MetricStorage();
  private metrics: Map<string, MetricConfig> = new Map();

  // ============= HTTP 相关指标 =============
  private httpRequestTotal: Map<string, number> = new Map();
  private httpRequestDuration: number[] = [];
  private httpErrorTotal: Map<string, number> = new Map();

  // ============= 数据库相关指标 =============
  private dbQueryTotal: Map<string, number> = new Map();
  private dbQueryDuration: number[] = [];
  private dbConnectionPoolSize: number = 0;

  // ============= 缓存相关指标 =============
  private cacheHitTotal: number = 0;
  private cacheMissTotal: number = 0;
  private cacheOperationDuration: number[] = [];

  // ============= 业务相关指标 =============
  private gameScoreTotal: Map<string, number> = new Map();
  private playerOnlineCount: number = 0;
  private battleResultTotal: Map<string, number> = new Map();

  // ============= 系统相关指标 =============
  private processMemoryUsage: number = 0;
  private processCpuUsage: number = 0;
  private serverUptimeSeconds: number = 0;

  private startTime: number = Date.now();

  private constructor() {
    this.initializeMetrics();
    this.startMetricsCollection();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  /**
   * 初始化指标定义
   */
  private initializeMetrics(): void {
    // HTTP 请求指标
    this.registerMetric({
      name: 'http_request_total',
      help: 'HTTP 请求总数',
      type: 'counter',
      labels: ['method', 'path', 'status']
    });

    this.registerMetric({
      name: 'http_request_duration_seconds',
      help: 'HTTP 请求耗时（秒）',
      type: 'histogram',
      labels: ['method', 'path'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });

    this.registerMetric({
      name: 'http_errors_total',
      help: 'HTTP 错误总数',
      type: 'counter',
      labels: ['status', 'error_type']
    });

    // 数据库指标
    this.registerMetric({
      name: 'db_query_total',
      help: '数据库查询总数',
      type: 'counter',
      labels: ['operation', 'table']
    });

    this.registerMetric({
      name: 'db_query_duration_seconds',
      help: '数据库查询耗时（秒）',
      type: 'histogram',
      labels: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
    });

    // 缓存指标
    this.registerMetric({
      name: 'cache_hits_total',
      help: '缓存命中总数',
      type: 'counter'
    });

    this.registerMetric({
      name: 'cache_misses_total',
      help: '缓存未命中总数',
      type: 'counter'
    });

    this.registerMetric({
      name: 'cache_hit_ratio',
      help: '缓存命中率',
      type: 'gauge'
    });

    // 游戏业务指标
    this.registerMetric({
      name: 'game_battles_total',
      help: '游戏战斗总数',
      type: 'counter',
      labels: ['result']
    });

    this.registerMetric({
      name: 'game_player_online',
      help: '在线玩家数',
      type: 'gauge'
    });

    this.registerMetric({
      name: 'game_score_submitted_total',
      help: '提交分数总数',
      type: 'counter'
    });

    // 系统指标
    this.registerMetric({
      name: 'process_memory_bytes',
      help: '进程内存使用（字节）',
      type: 'gauge'
    });

    this.registerMetric({
      name: 'process_uptime_seconds',
      help: '进程运行时间（秒）',
      type: 'gauge'
    });
  }

  /**
   * 注册指标
   */
  private registerMetric(config: MetricConfig): void {
    this.metrics.set(config.name, config);
  }

  /**
   * 启动定期指标收集
   */
  private startMetricsCollection(): void {
    // 每 30 秒更新一次系统指标
    setInterval(() => {
      this.updateSystemMetrics();
    }, 30 * 1000);
  }

  /**
   * 更新系统指标
   */
  private updateSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    this.processMemoryUsage = memUsage.heapUsed;
    this.serverUptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
  }

  // ============= HTTP 请求指标 =============

  recordHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number
  ): void {
    // 记录请求总数
    const requestKey = `${method}_${path}_${statusCode}`;
    this.httpRequestTotal.set(requestKey, (this.httpRequestTotal.get(requestKey) || 0) + 1);

    // 记录请求耗时
    this.httpRequestDuration.push(duration);

    // 记录错误
    if (statusCode >= 400) {
      const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
      const errorKey = `${statusCode}_${errorType}`;
      this.httpErrorTotal.set(errorKey, (this.httpErrorTotal.get(errorKey) || 0) + 1);
    }

    // 存储指标
    this.storage.set('http_request_total', {
      name: 'http_request_total',
      value: 1,
      labels: { method, path, status: statusCode.toString() }
    });

    this.storage.set('http_request_duration_seconds', {
      name: 'http_request_duration_seconds',
      value: duration / 1000,
      labels: { method, path }
    });
  }

  getHttpMetrics(): {
    totalRequests: number;
    avgDuration: number;
    errorCount: number;
    errorRate: number;
  } {
    const totalRequests = Array.from(this.httpRequestTotal.values()).reduce((a, b) => a + b, 0);
    const avgDuration = this.httpRequestDuration.length > 0
      ? this.httpRequestDuration.reduce((a, b) => a + b, 0) / this.httpRequestDuration.length
      : 0;
    const errorCount = Array.from(this.httpErrorTotal.values()).reduce((a, b) => a + b, 0);
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

    return {
      totalRequests,
      avgDuration,
      errorCount,
      errorRate
    };
  }

  // ============= 数据库指标 =============

  recordDatabaseQuery(
    operation: string,
    table: string,
    duration: number,
    success: boolean
  ): void {
    const queryKey = `${operation}_${table}`;
    this.dbQueryTotal.set(queryKey, (this.dbQueryTotal.get(queryKey) || 0) + 1);
    
    if (success) {
      this.dbQueryDuration.push(duration);
    }

    this.storage.set('db_query_total', {
      name: 'db_query_total',
      value: 1,
      labels: { operation, table }
    });

    if (success) {
      this.storage.set('db_query_duration_seconds', {
        name: 'db_query_duration_seconds',
        value: duration / 1000,
        labels: { operation, table }
      });
    }
  }

  getDatabaseMetrics(): {
    totalQueries: number;
    avgDuration: number;
    slowQueryCount: number;
  } {
    const totalQueries = Array.from(this.dbQueryTotal.values()).reduce((a, b) => a + b, 0);
    const avgDuration = this.dbQueryDuration.length > 0
      ? this.dbQueryDuration.reduce((a, b) => a + b, 0) / this.dbQueryDuration.length
      : 0;
    const slowQueryCount = this.dbQueryDuration.filter(d => d > 100).length;

    return {
      totalQueries,
      avgDuration,
      slowQueryCount
    };
  }

  // ============= 缓存指标 =============

  recordCacheHit(duration: number): void {
    this.cacheHitTotal++;
    this.cacheOperationDuration.push(duration);

    this.storage.set('cache_hits_total', {
      name: 'cache_hits_total',
      value: 1
    });
  }

  recordCacheMiss(duration: number): void {
    this.cacheMissTotal++;
    this.cacheOperationDuration.push(duration);

    this.storage.set('cache_misses_total', {
      name: 'cache_misses_total',
      value: 1
    });
  }

  getCacheMetrics(): {
    hits: number;
    misses: number;
    hitRatio: number;
    avgDuration: number;
  } {
    const total = this.cacheHitTotal + this.cacheMissTotal;
    const hitRatio = total > 0 ? (this.cacheHitTotal / total) * 100 : 0;
    const avgDuration = this.cacheOperationDuration.length > 0
      ? this.cacheOperationDuration.reduce((a, b) => a + b, 0) / this.cacheOperationDuration.length
      : 0;

    return {
      hits: this.cacheHitTotal,
      misses: this.cacheMissTotal,
      hitRatio,
      avgDuration
    };
  }

  // ============= 游戏业务指标 =============

  recordGameBattle(playerId: string, result: 'win' | 'lose'): void {
    const key = `battle_${result}`;
    this.battleResultTotal.set(key, (this.battleResultTotal.get(key) || 0) + 1);

    this.storage.set('game_battles_total', {
      name: 'game_battles_total',
      value: 1,
      labels: { result }
    });
  }

  recordScoreSubmission(playerId: string, score: number): void {
    this.gameScoreTotal.set(playerId, (this.gameScoreTotal.get(playerId) || 0) + score);

    this.storage.set('game_score_submitted_total', {
      name: 'game_score_submitted_total',
      value: 1
    });
  }

  updatePlayerOnlineCount(count: number): void {
    this.playerOnlineCount = count;

    this.storage.set('game_player_online', {
      name: 'game_player_online',
      value: count
    });
  }

  getGameMetrics(): {
    totalBattles: number;
    winRate: number;
    onlinePlayers: number;
    totalScoreSubmitted: number;
  } {
    const totalBattles = Array.from(this.battleResultTotal.values()).reduce((a, b) => a + b, 0);
    const winCount = this.battleResultTotal.get('battle_win') || 0;
    const winRate = totalBattles > 0 ? (winCount / totalBattles) * 100 : 0;
    const totalScoreSubmitted = Array.from(this.gameScoreTotal.values()).reduce((a, b) => a + b, 0);

    return {
      totalBattles,
      winRate,
      onlinePlayers: this.playerOnlineCount,
      totalScoreSubmitted
    };
  }

  // ============= 系统指标 =============

  getSystemMetrics(): {
    memoryMB: number;
    upTimeSeconds: number;
    nodeVersion: string;
  } {
    return {
      memoryMB: Math.round(this.processMemoryUsage / 1024 / 1024),
      upTimeSeconds: this.serverUptimeSeconds,
      nodeVersion: process.version
    };
  }

  // ============= Prometheus 格式输出 =============

  /**
   * 导出 Prometheus 格式的指标
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    // HTTP 请求指标
    lines.push('# HELP http_request_total HTTP 请求总数');
    lines.push('# TYPE http_request_total counter');
    this.httpRequestTotal.forEach((value, key) => {
      const [method, path, status] = key.split('_');
      lines.push(`http_request_total{method="${method}",path="${path}",status="${status}"} ${value}`);
    });

    // HTTP 请求耗时
    lines.push('# HELP http_request_duration_seconds HTTP 请求耗时');
    lines.push('# TYPE http_request_duration_seconds histogram');
    if (this.httpRequestDuration.length > 0) {
      const avgDuration = this.httpRequestDuration.reduce((a, b) => a + b, 0) / this.httpRequestDuration.length;
      lines.push(`http_request_duration_seconds_sum ${this.httpRequestDuration.reduce((a, b) => a + b, 0) / 1000}`);
      lines.push(`http_request_duration_seconds_count ${this.httpRequestDuration.length}`);
    }

    // HTTP 错误
    lines.push('# HELP http_errors_total HTTP 错误总数');
    lines.push('# TYPE http_errors_total counter');
    this.httpErrorTotal.forEach((value, key) => {
      lines.push(`http_errors_total{error="${key}"} ${value}`);
    });

    // 缓存指标
    lines.push('# HELP cache_hits_total 缓存命中总数');
    lines.push('# TYPE cache_hits_total counter');
    lines.push(`cache_hits_total ${this.cacheHitTotal}`);

    lines.push('# HELP cache_misses_total 缓存未命中总数');
    lines.push('# TYPE cache_misses_total counter');
    lines.push(`cache_misses_total ${this.cacheMissTotal}`);

    const total = this.cacheHitTotal + this.cacheMissTotal;
    const hitRatio = total > 0 ? (this.cacheHitTotal / total) * 100 : 0;
    lines.push('# HELP cache_hit_ratio 缓存命中率');
    lines.push('# TYPE cache_hit_ratio gauge');
    lines.push(`cache_hit_ratio ${hitRatio}`);

    // 游戏指标
    lines.push('# HELP game_battles_total 游戏战斗总数');
    lines.push('# TYPE game_battles_total counter');
    this.battleResultTotal.forEach((value, key) => {
      const result = key.split('_')[1];
      lines.push(`game_battles_total{result="${result}"} ${value}`);
    });

    lines.push('# HELP game_player_online 在线玩家数');
    lines.push('# TYPE game_player_online gauge');
    lines.push(`game_player_online ${this.playerOnlineCount}`);

    // 系统指标
    lines.push('# HELP process_memory_bytes 进程内存使用');
    lines.push('# TYPE process_memory_bytes gauge');
    lines.push(`process_memory_bytes ${this.processMemoryUsage}`);

    lines.push('# HELP process_uptime_seconds 进程运行时间');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds ${this.serverUptimeSeconds}`);

    return lines.join('\n');
  }

  /**
   * 获取所有指标（JSON 格式）
   */
  getAllMetrics(): Record<string, any> {
    return {
      http: this.getHttpMetrics(),
      database: this.getDatabaseMetrics(),
      cache: this.getCacheMetrics(),
      game: this.getGameMetrics(),
      system: this.getSystemMetrics(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 重置指标
   */
  reset(): void {
    this.httpRequestTotal.clear();
    this.httpRequestDuration = [];
    this.httpErrorTotal.clear();
    this.dbQueryTotal.clear();
    this.dbQueryDuration = [];
    this.cacheHitTotal = 0;
    this.cacheMissTotal = 0;
    this.cacheOperationDuration = [];
    this.gameScoreTotal.clear();
    this.battleResultTotal.clear();
    this.storage.clear();
  }
}

export const metricsService = MetricsService.getInstance();
