#!/usr/bin/env ts-node

/**
 * 性能基准测试
 * 测试各个关键端点的性能指标：响应时间、吞吐量、内存使用
 */

import axios, { AxiosInstance } from 'axios';

const BASE_URL = 'http://localhost:3000';

interface PerformanceMetrics {
  name: string;
  avgTime: number;
  minTime: number;
  maxTime: number;
  p95Time: number;
  p99Time: number;
  requestsPerSecond: number;
  successRate: number;
}

class PerformanceTestRunner {
  private client: AxiosInstance;
  private token: string = '';
  private playerId: string = '';
  private metrics: PerformanceMetrics[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      validateStatus: () => true
    });
  }

  async run(): Promise<void> {
    console.log('\n⚡ 开始性能基准测试...\n');

    try {
      // 1. 登录获取 token
      await this.login();

      // 2. 排行榜查询性能
      await this.testLeaderboardPerformance();

      // 3. 分数提交性能
      await this.testScoreSubmissionPerformance();

      // 4. 排名查询性能
      await this.testRankQueryPerformance();

      // 5. 救援请求性能
      await this.testRescueRequestPerformance();

      // 6. 缓存性能对比
      await this.testCachePerformance();

      // 7. 并发性能测试
      await this.testConcurrentPerformance();

      // 打印报告
      this.printReport();
    } catch (error: any) {
      console.error('❌ 性能测试失败:', error.message);
      process.exit(1);
    }
  }

  private async login(): Promise<void> {
    const response = await this.client.post('/api/auth/wechat-login', {
      code: 'perf_test_' + Date.now(),
      nickname: 'Perf Tester',
      avatar: 'https://example.com/avatar.jpg'
    });

    if (response.status === 200) {
      this.token = response.data.token;
      this.playerId = response.data.playerId;
      console.log('✓ 已登录');
    }
  }

  private async testLeaderboardPerformance(): Promise<void> {
    console.log('\n📊 测试排行榜查询性能...');
    const times: number[] = [];
    const iterations = 50;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await this.client.get('/api/leaderboard?mapId=map_001&limit=100&offset=0');
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    this.metrics.push(this.calculateMetrics('排行榜查询', times));
  }

  private async testScoreSubmissionPerformance(): Promise<void> {
    console.log('📊 测试分数提交性能...');
    const times: number[] = [];
    const iterations = 50;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await this.client.post('/api/leaderboard/submit', {
        mapId: 'map_' + (i % 3),
        score: Math.floor(Math.random() * 10000),
        damageDealt: Math.floor(Math.random() * 500),
        damageReceived: Math.floor(Math.random() * 200),
        clearTime: Math.floor(Math.random() * 600),
        extractSuccess: Math.random() > 0.5,
        signature: 'perf_test'
      }, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    this.metrics.push(this.calculateMetrics('分数提交', times));
  }

  private async testRankQueryPerformance(): Promise<void> {
    console.log('📊 测试排名查询性能...');
    const times: number[] = [];
    const iterations = 50;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await this.client.get(`/api/leaderboard/rank/${this.playerId}?mapId=map_001`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    this.metrics.push(this.calculateMetrics('排名查询', times));
  }

  private async testRescueRequestPerformance(): Promise<void> {
    console.log('📊 测试救援请求性能...');
    const times: number[] = [];
    const iterations = 30;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await this.client.post('/api/rescue/create', {
        mapId: 'map_' + (i % 3),
        lostItems: [
          { itemId: 'item_' + i, name: '物品', rarity: 'rare' }
        ],
        totalValue: Math.floor(Math.random() * 10000)
      }, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    this.metrics.push(this.calculateMetrics('救援请求', times));
  }

  private async testCachePerformance(): Promise<void> {
    console.log('📊 测试缓存性能...');

    // 清除缓存
    if (process.env.NODE_ENV === 'development') {
      await this.client.post('/api/cache/clear');
    }

    // 首次查询（缓存未命中）
    const firstQueryStart = performance.now();
    await this.client.get('/api/leaderboard?mapId=map_001&limit=100&offset=0');
    const firstQueryTime = performance.now() - firstQueryStart;

    // 后续查询（缓存命中）
    const times: number[] = [];
    for (let i = 0; i < 20; i++) {
      const startTime = performance.now();
      await this.client.get('/api/leaderboard?mapId=map_001&limit=100&offset=0');
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    const avgCachedTime = times.reduce((a, b) => a + b, 0) / times.length;
    const improvement = ((firstQueryTime - avgCachedTime) / firstQueryTime * 100).toFixed(1);

    console.log(`   首次查询: ${firstQueryTime.toFixed(2)}ms`);
    console.log(`   缓存平均: ${avgCachedTime.toFixed(2)}ms`);
    console.log(`   性能提升: ${improvement}%`);
  }

  private async testConcurrentPerformance(): Promise<void> {
    console.log('📊 测试并发性能...');

    const concurrencyLevels = [1, 5, 10, 20];

    for (const concurrency of concurrencyLevels) {
      const startTime = performance.now();
      const promises = [];

      for (let i = 0; i < concurrency; i++) {
        promises.push(
          this.client.get('/api/leaderboard?mapId=map_001&limit=100&offset=0')
        );
      }

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTimePerRequest = totalTime / concurrency;

      const successCount = responses.filter(r => r.status === 200).length;
      const successRate = (successCount / concurrency * 100).toFixed(1);

      console.log(`   并发数: ${concurrency} | 总耗时: ${totalTime.toFixed(2)}ms | 平均: ${avgTimePerRequest.toFixed(2)}ms | 成功率: ${successRate}%`);
    }
  }

  private calculateMetrics(name: string, times: number[]): PerformanceMetrics {
    times.sort((a, b) => a - b);

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = times[0];
    const maxTime = times[times.length - 1];
    const p95Index = Math.floor(times.length * 0.95);
    const p99Index = Math.floor(times.length * 0.99);
    const p95Time = times[p95Index];
    const p99Time = times[p99Index];

    // 假设吞吐量（请求/秒）
    const requestsPerSecond = 1000 / avgTime;

    return {
      name,
      avgTime,
      minTime,
      maxTime,
      p95Time,
      p99Time,
      requestsPerSecond,
      successRate: 100
    };
  }

  private printReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📈 性能基准测试报告');
    console.log('='.repeat(80) + '\n');

    console.log('│ 端点名称'.padEnd(20) + '│ 平均 (ms) │ 最小 (ms) │ 最大 (ms) │ P95 (ms) │ P99 (ms) │ 吞吐量 (req/s) │');
    console.log('├' + '─'.repeat(78) + '┤');

    this.metrics.forEach(metric => {
      const row = 
        `│ ${metric.name.padEnd(18)} │ ${metric.avgTime.toFixed(2).padEnd(9)} │ ${metric.minTime.toFixed(2).padEnd(9)} │ ${metric.maxTime.toFixed(2).padEnd(9)} │ ${metric.p95Time.toFixed(2).padEnd(8)} │ ${metric.p99Time.toFixed(2).padEnd(8)} │ ${metric.requestsPerSecond.toFixed(2).padEnd(13)} │`;
      console.log(row);
    });

    console.log('└' + '─'.repeat(78) + '┘\n');

    // 性能建议
    console.log('💡 性能建议:');
    this.metrics.forEach(metric => {
      if (metric.avgTime > 100) {
        console.log(`   ⚠️  ${metric.name} 平均响应时间过长 (${metric.avgTime.toFixed(2)}ms)，建议优化`);
      }
      if (metric.maxTime > 500) {
        console.log(`   ⚠️  ${metric.name} 最大响应时间很长 (${metric.maxTime.toFixed(2)}ms)，可能需要调查`);
      }
    });

    console.log('\n' + '='.repeat(80) + '\n');
    process.exit(0);
  }
}

// 运行性能测试
const runner = new PerformanceTestRunner();
runner.run().catch(error => {
  console.error('❌ 性能测试失败:', error);
  process.exit(1);
});
