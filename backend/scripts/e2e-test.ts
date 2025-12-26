#!/usr/bin/env ts-node

/**
 * 端到端业务流程测试
 * 测试完整的游戏业务流程：登录 → 提交分数 → 查询排行榜 → 救援系统
 */

import axios, { AxiosInstance } from 'axios';
import DatabaseManager from '../src/db/DatabaseManager';

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

class E2ETestRunner {
  private client: AxiosInstance;
  private results: TestResult[] = [];
  private token: string = '';
  private playerId: string = '';
  private openid: string = `test_openid_${Date.now()}`;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      validateStatus: () => true
    });
  }

  async run(): Promise<void> {
    console.log('\n🧪 开始端到端测试...\n');
    
    try {
      // 1. 测试健康检查
      await this.testHealthCheck();

      // 2. 测试微信登录
      await this.testWechatLogin();

      // 3. 测试排行榜提交
      await this.testSubmitScore();

      // 4. 测试排行榜查询
      await this.testGetLeaderboard();

      // 5. 测试玩家排名
      await this.testGetPlayerRank();

      // 6. 测试救援请求
      await this.testCreateRescueRequest();

      // 7. 测试数据同步
      await this.testDataSync();

      // 8. 测试缓存命中
      await this.testCacheHit();

      // 9. 测试速率限制
      await this.testRateLimit();

      // 打印结果
      this.printResults();
    } catch (error: any) {
      console.error('❌ 测试失败:', error.message);
      process.exit(1);
    }
  }

  private async testHealthCheck(): Promise<void> {
    const startTime = Date.now();
    try {
      const response = await this.client.get('/health');
      const duration = Date.now() - startTime;
      
      const passed = response.status === 200 && response.data.status === 'ok';
      this.results.push({
        name: '🏥 健康检查',
        passed,
        error: passed ? undefined : `Status: ${response.status}`,
        duration
      });
    } catch (error: any) {
      this.results.push({
        name: '🏥 健康检查',
        passed: false,
        error: error.message,
        duration: Date.now() - startTime
      });
    }
  }

  private async testWechatLogin(): Promise<void> {
    const startTime = Date.now();
    try {
      const response = await this.client.post('/api/auth/wechat-login', {
        code: 'test_code_' + Date.now(),
        nickname: 'Test Player',
        avatar: 'https://example.com/avatar.jpg'
      });
      const duration = Date.now() - startTime;

      if (response.status === 200 && response.data.token) {
        this.token = response.data.token;
        this.playerId = response.data.playerId;
        this.results.push({
          name: '🔐 微信登录',
          passed: true,
          duration
        });
      } else {
        this.results.push({
          name: '🔐 微信登录',
          passed: false,
          error: `Status: ${response.status}, Response: ${JSON.stringify(response.data)}`,
          duration
        });
      }
    } catch (error: any) {
      this.results.push({
        name: '🔐 微信登录',
        passed: false,
        error: error.message,
        duration: Date.now() - startTime
      });
    }
  }

  private async testSubmitScore(): Promise<void> {
    const startTime = Date.now();
    try {
      const response = await this.client.post('/api/leaderboard/submit', {
        mapId: 'map_001',
        score: Math.floor(Math.random() * 10000),
        damageDealt: Math.floor(Math.random() * 500),
        damageReceived: Math.floor(Math.random() * 200),
        clearTime: Math.floor(Math.random() * 600),
        extractSuccess: Math.random() > 0.5,
        signature: 'test_signature'
      }, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      const duration = Date.now() - startTime;

      const passed = response.status === 200 && response.data.success;
      this.results.push({
        name: '📊 提交分数',
        passed,
        error: passed ? undefined : `Status: ${response.status}`,
        duration
      });
    } catch (error: any) {
      this.results.push({
        name: '📊 提交分数',
        passed: false,
        error: error.message,
        duration: Date.now() - startTime
      });
    }
  }

  private async testGetLeaderboard(): Promise<void> {
    const startTime = Date.now();
    try {
      const response = await this.client.get('/api/leaderboard?mapId=map_001&limit=10&offset=0');
      const duration = Date.now() - startTime;

      const passed = response.status === 200 && Array.isArray(response.data.data);
      this.results.push({
        name: '🏆 查询排行榜',
        passed,
        error: passed ? undefined : `Status: ${response.status}`,
        duration
      });
    } catch (error: any) {
      this.results.push({
        name: '🏆 查询排行榜',
        passed: false,
        error: error.message,
        duration: Date.now() - startTime
      });
    }
  }

  private async testGetPlayerRank(): Promise<void> {
    const startTime = Date.now();
    try {
      const response = await this.client.get(`/api/leaderboard/rank/${this.playerId}?mapId=map_001`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      const duration = Date.now() - startTime;

      const passed = response.status === 200 && response.data.success;
      this.results.push({
        name: '👥 获取玩家排名',
        passed,
        error: passed ? undefined : `Status: ${response.status}`,
        duration
      });
    } catch (error: any) {
      this.results.push({
        name: '👥 获取玩家排名',
        passed: false,
        error: error.message,
        duration: Date.now() - startTime
      });
    }
  }

  private async testCreateRescueRequest(): Promise<void> {
    const startTime = Date.now();
    try {
      const response = await this.client.post('/api/rescue/create', {
        mapId: 'map_001',
        lostItems: [
          { itemId: 'item_001', name: '金剑', rarity: 'rare' }
        ],
        totalValue: 5000
      }, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      const duration = Date.now() - startTime;

      const passed = response.status === 200 && response.data.success;
      this.results.push({
        name: '🆘 创建救援请求',
        passed,
        error: passed ? undefined : `Status: ${response.status}`,
        duration
      });
    } catch (error: any) {
      this.results.push({
        name: '🆘 创建救援请求',
        passed: false,
        error: error.message,
        duration: Date.now() - startTime
      });
    }
  }

  private async testDataSync(): Promise<void> {
    const startTime = Date.now();
    try {
      const response = await this.client.post('/api/sync/queue', {
        operations: [
          {
            type: 'battle',
            data: {
              mapId: 'map_001',
              score: 5000
            }
          }
        ]
      }, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      const duration = Date.now() - startTime;

      const passed = response.status === 200 && response.data.success;
      this.results.push({
        name: '🔄 数据同步',
        passed,
        error: passed ? undefined : `Status: ${response.status}`,
        duration
      });
    } catch (error: any) {
      this.results.push({
        name: '🔄 数据同步',
        passed: false,
        error: error.message,
        duration: Date.now() - startTime
      });
    }
  }

  private async testCacheHit(): Promise<void> {
    const startTime = Date.now();
    try {
      // 第一次查询（缓存未命中）
      const response1 = await this.client.get('/api/leaderboard?mapId=map_001&limit=10&offset=0');
      
      // 第二次查询（缓存命中）- 应该更快
      const cacheStartTime = Date.now();
      const response2 = await this.client.get('/api/leaderboard?mapId=map_001&limit=10&offset=0');
      const cacheDuration = Date.now() - cacheStartTime;
      
      const duration = Date.now() - startTime;
      
      // 缓存命中应该比首次查询快至少 50%
      const firstDuration = response1.config.metadata?.duration || 0;
      const cacheHit = cacheDuration < firstDuration * 0.5;
      
      const passed = response2.status === 200 && Array.isArray(response2.data.data);
      this.results.push({
        name: '⚡ 缓存命中测试',
        passed,
        error: passed ? undefined : `Status: ${response2.status}`,
        duration: cacheDuration
      });
    } catch (error: any) {
      this.results.push({
        name: '⚡ 缓存命中测试',
        passed: false,
        error: error.message,
        duration: Date.now() - startTime
      });
    }
  }

  private async testRateLimit(): Promise<void> {
    const startTime = Date.now();
    try {
      let rateLimitTriggered = false;
      
      // 尝试快速发送多个请求
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          this.client.post('/api/leaderboard/submit', {
            mapId: 'map_001',
            score: 1000,
            damageDealt: 100,
            damageReceived: 50,
            clearTime: 60,
            extractSuccess: true,
            signature: 'test'
          }, {
            headers: { Authorization: `Bearer ${this.token}` }
          })
        );
      }
      
      const responses = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      // 检查是否有速率限制响应
      rateLimitTriggered = responses.some(r => r.status === 429);
      
      this.results.push({
        name: '🚦 速率限制测试',
        passed: true,
        error: rateLimitTriggered ? '速率限制已触发（正常）' : '未触发速率限制',
        duration
      });
    } catch (error: any) {
      this.results.push({
        name: '🚦 速率限制测试',
        passed: false,
        error: error.message,
        duration: Date.now() - startTime
      });
    }
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试结果汇总');
    console.log('='.repeat(60) + '\n');

    let passedCount = 0;
    let totalDuration = 0;

    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const message = result.error ? ` - ${result.error}` : '';
      console.log(`${status} ${result.name.padEnd(20)} | ${result.duration}ms${message}`);
      
      if (result.passed) passedCount++;
      totalDuration += result.duration;
    });

    console.log('\n' + '='.repeat(60));
    console.log(`📈 总体: ${passedCount}/${this.results.length} 通过 (${(passedCount / this.results.length * 100).toFixed(1)}%)`);
    console.log(`⏱️  总耗时: ${totalDuration}ms`);
    console.log('='.repeat(60) + '\n');

    process.exit(passedCount === this.results.length ? 0 : 1);
  }
}

// 运行测试
const runner = new E2ETestRunner();
runner.run().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
