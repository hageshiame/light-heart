import SQLiteManager from './SQLiteManager';
import NetworkManager from './NetworkManager';

/**
 * GameManager: Main game orchestrator
 * Coordinates SQLiteManager (local) and NetworkManager (server)
 */
export class GameManager {
  private static instance: GameManager;
  private db = SQLiteManager;
  private network = NetworkManager;
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  /**
   * Initialize game
   */
  async initialize(wechatCode: string): Promise<void> {
    try {
      console.log('Initializing GameManager...');

      // Step 1: Initialize network (authenticate with server)
      await this.network.initialize(wechatCode);

      // Step 2: Initialize local database
      await this.db.init(this.network['sessionToken'] || '');

      // Step 3: Start periodic sync
      await this.network.startPeriodicSync(this.db);

      this.initialized = true;
      console.log('✓ GameManager initialized successfully');
    } catch (error) {
      console.error('GameManager initialization failed:', error);
      throw error;
    }
  }

  /**
   * Submit battle result
   */
  async submitBattleResult(battleResult: any): Promise<void> {
    if (!this.initialized) throw new Error('GameManager not initialized');

    try {
      // Step 1: Save to local database first
      const result = {
        id: `battle_${Date.now()}`,
        ...battleResult,
        timestamp: Date.now()
      };

      // TODO: Save to local database

      // Step 2: Send to server (Layer 1: Critical)
      await this.network.submitScore(result);

      console.log('✓ Battle result submitted');
    } catch (error) {
      console.error('Failed to submit battle result:', error);
      throw error;
    }
  }

  /**
   * Create rescue request
   */
  async createRescueRequest(failedMap: string, lostItems: any[]): Promise<string> {
    if (!this.initialized) throw new Error('GameManager not initialized');

    try {
      // Save to local database first
      // TODO: Save rescue request

      // Send to server (Layer 2: Important)
      const rescueUrl = await this.network.createRescueRequest(failedMap, lostItems);

      return rescueUrl;
    } catch (error) {
      console.error('Failed to create rescue request:', error);
      throw error;
    }
  }

  /**
   * Get network status
   */
  getNetworkStatus(): any {
    return this.network.getQueueStatus();
  }

  /**
   * Get database status
   */
  getDatabaseStatus(): { initialized: boolean } {
    return { initialized: this.initialized };
  }
}

export default GameManager.getInstance();
