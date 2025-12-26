import CryptoJS from 'crypto-js';

/**
 * NetworkManager: Hybrid Architecture Network Communication
 * Implements 4-layer priority sync strategy with offline support
 */

interface SyncTask {
  method: string;
  path: string;
  payload?: any;
  priority: 'critical' | 'important' | 'auxiliary';
  retryCount?: number;
  timestamp?: number;
}

export class NetworkManager {
  private static instance: NetworkManager;
  private sessionToken: string | null = null;
  private playerId: string | null = null;
  private syncQueue: SyncTask[] = [];
  private offline: boolean = false;
  private encryptionKey: string = '';
  private apiBaseUrl: string = 'http://localhost:3000';

  private constructor() {
    this.initializeNetworkListeners();
  }

  static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  /**
   * Initialize network listeners
   */
  private initializeNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.onNetworkRestored());
      window.addEventListener('offline', () => this.setOfflineMode(true));
    }
  }

  /**
   * Initialize: WeChat login
   */
  async initialize(code: string): Promise<void> {
    try {
      const response = await this.request(
        'POST',
        '/api/auth/wechat-login',
        { code, encryptedData: 'xxx', iv: 'xxx' },
        'critical'
      );

      this.sessionToken = response.sessionToken;
      this.playerId = response.playerId;
      this.encryptionKey = this.deriveKeyFromToken(this.sessionToken);

      console.log(`✓ NetworkManager initialized for player ${this.playerId}`);
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  /**
   * === Layer 1: Critical Data (Immediate, <2s) ===
   * Submit battle score to leaderboard
   */
  async submitScore(battleResult: any): Promise<void> {
    const payload = {
      playerId: this.playerId,
      mapId: battleResult.mapId,
      score: battleResult.score,
      damageDealt: battleResult.damageDealt,
      damageReceived: battleResult.damageReceived,
      clearTime: battleResult.duration,
      extractSuccess: battleResult.extractSuccess,
      clientTimestamp: Date.now(),
      signature: this.sign(battleResult)
    };

    try {
      const response = await this.request(
        'POST',
        '/api/leaderboard/submit-score',
        payload,
        'critical'
      );

      if (!response.success) {
        throw new Error(response.error);
      }

      console.log(`✓ Score submitted: ${payload.score} points, Rank: ${response.rank}`);
    } catch (error) {
      console.warn('Score submission failed, queued for retry:', error);
      this.queueForRetry({
        method: 'POST',
        path: '/api/leaderboard/submit-score',
        payload,
        priority: 'critical'
      });
    }
  }

  /**
   * === Layer 2: Important Data (Near-real-time, <30s) ===
   * Create rescue request
   */
  async createRescueRequest(failedMap: string, lostItems: any[]): Promise<string> {
    try {
      const response = await this.request(
        'POST',
        '/api/rescue/create-request',
        {
          playerId: this.playerId,
          mapId: failedMap,
          failedTime: Date.now(),
          lostItems,
          totalValue: lostItems.reduce((sum, item) => sum + item.value * item.count, 0)
        },
        'important'
      );

      console.log(`✓ Rescue request created: ${response.requestId}`);
      return response.rescueUrl;
    } catch (error) {
      console.error('Rescue request failed:', error);
      return '';
    }
  }

  /**
   * Complete rescue task
   */
  async completeRescueTask(requestId: string): Promise<boolean> {
    try {
      const response = await this.request(
        'POST',
        '/api/rescue/complete-task',
        {
          requestId,
          heroId: this.playerId,
          completedTime: Date.now(),
          signature: this.sign({ requestId })
        },
        'important'
      );

      console.log(`✓ Rescue task completed: ${requestId}`);
      return response.success;
    } catch (error) {
      console.error('Complete rescue failed:', error);
      return false;
    }
  }

  /**
   * === Layer 3: Auxiliary Data (Periodic, <5min) ===
   * Batch sync data (characters, equipment, achievements)
   */
  async startPeriodicSync(db: any): Promise<void> {
    setInterval(async () => {
      if (this.offline) return;

      try {
        const data = {
          characters: await db.queryAllCharacters?.() || [],
          equipment: [],
          achievements: [],
          timestamp: Date.now()
        };

        await this.request(
          'POST',
          '/api/sync/batch-data',
          { playerId: this.playerId, data },
          'auxiliary'
        );

        console.log('✓ Periodic sync completed');
      } catch (error) {
        console.warn('Periodic sync failed, will retry later:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * === Layer 4: Statistic Data (Background Async, <30min) ===
   * Report anomaly
   */
  async reportAnomaly(anomalyType: string, details?: any): Promise<void> {
    // Fire-and-forget, doesn't block game
    setImmediate(async () => {
      try {
        await this.request(
          'POST',
          '/api/sync/report-anomaly',
          {
            playerId: this.playerId,
            anomalyType,
            details,
            timestamp: Date.now()
          },
          'auxiliary'
        );
      } catch (error) {
        console.warn('Anomaly report failed (ignored)');
      }
    });
  }

  /**
   * Core network request method
   */
  private async request(
    method: string,
    path: string,
    body?: any,
    priority: 'critical' | 'important' | 'auxiliary' = 'important'
  ): Promise<any> {
    const timeout = priority === 'critical' ? 10000 : 5000;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${this.apiBaseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.sessionToken || ''}`
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal as any
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          await this.refreshToken();
          return this.request(method, path, body, priority);
        }
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      this.handleNetworkError(error);
      throw error;
    }
  }

  /**
   * Handle network errors
   */
  private handleNetworkError(error: any): void {
    if (error.name === 'AbortError') {
      console.warn('Request timeout');
      this.offline = true;
    } else {
      console.warn('Network error:', error.message);
      this.offline = true;
    }
  }

  /**
   * Queue task for retry
   */
  private queueForRetry(task: SyncTask): void {
    task.timestamp = Date.now();
    this.syncQueue.push(task);
    console.log(`Task queued for retry: ${task.path} (queue size: ${this.syncQueue.length})`);
  }

  /**
   * Set offline mode
   */
  setOfflineMode(offline: boolean): void {
    this.offline = offline;
    console.log(offline ? '⚠️  Offline mode enabled' : '✓ Online mode enabled');
  }

  /**
   * Network restored - process retry queue
   */
  onNetworkRestored(): void {
    this.offline = false;
    console.log('✓ Network restored, processing retry queue...');
    this.processRetryQueue();
  }

  /**
   * Process retry queue
   */
  private async processRetryQueue(): Promise<void> {
    while (this.syncQueue.length > 0) {
      const task = this.syncQueue.shift();
      if (!task) break;

      try {
        await this.request(task.method, task.path, task.payload, task.priority);
        console.log(`✓ Retried: ${task.path}`);
      } catch (error) {
        task.retryCount = (task.retryCount || 0) + 1;
        const maxRetries = task.priority === 'critical' ? 3 : 2;

        if (task.retryCount < maxRetries) {
          // Exponential backoff
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, task.retryCount) * 1000)
          );
          this.syncQueue.push(task);
        } else {
          console.warn(`Task failed after ${task.retryCount} retries: ${task.path}`);
        }
      }
    }
  }

  /**
   * Sign data using HMAC
   */
  private sign(data: any): string {
    const dataStr = JSON.stringify(data);
    return CryptoJS.HmacSHA256(dataStr, this.encryptionKey).toString();
  }

  /**
   * Derive key from session token
   */
  private deriveKeyFromToken(sessionToken: string): string {
    return CryptoJS.SHA256(sessionToken).toString();
  }

  /**
   * Refresh token
   */
  private async refreshToken(): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.sessionToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        this.sessionToken = data.sessionToken;
        this.encryptionKey = this.deriveKeyFromToken(this.sessionToken);
        console.log('✓ Token refreshed');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
  }

  /**
   * Get queue status (for debugging)
   */
  getQueueStatus(): { size: number; offline: boolean; sessionToken: boolean } {
    return {
      size: this.syncQueue.length,
      offline: this.offline,
      sessionToken: !!this.sessionToken
    };
  }
}

export default NetworkManager.getInstance();
