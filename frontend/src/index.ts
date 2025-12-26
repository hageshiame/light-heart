import GameManager from './managers/GameManager';
import SQLiteManager from './managers/SQLiteManager';
import NetworkManager from './managers/NetworkManager';

/**
 * Light Heart Game - Frontend Entry Point
 * 
 * This is the main entry point for the Light Heart game frontend.
 * It demonstrates the hybrid architecture with local SQLite and network sync.
 */

export async function initializeGame(wechatCode: string) {
  try {
    console.log('🎮 Starting Light Heart Game...');
    
    // Initialize the game manager (which initializes network + database)
    await GameManager.initialize(wechatCode);
    
    console.log('✓ Game initialized successfully');
    console.log('Network Status:', GameManager.getNetworkStatus());
    console.log('Database Status:', GameManager.getDatabaseStatus());
    
    return {
      game: GameManager,
      database: SQLiteManager,
      network: NetworkManager
    };
  } catch (error) {
    console.error('❌ Game initialization failed:', error);
    throw error;
  }
}

/**
 * Example: Submit a battle result
 */
export async function submitBattle(battleData: any) {
  try {
    await GameManager.submitBattleResult({
      mapId: 'map_001',
      score: 1500,
      damageDealt: 100,
      damageReceived: 20,
      duration: 60,
      extractSuccess: true,
      ...battleData
    });
  } catch (error) {
    console.error('Failed to submit battle:', error);
  }
}

/**
 * Example: Create a rescue request
 */
export async function createRescue(failedMap: string, lostItems: any[]) {
  try {
    const rescueUrl = await GameManager.createRescueRequest(failedMap, lostItems);
    console.log('Rescue URL:', rescueUrl);
    return rescueUrl;
  } catch (error) {
    console.error('Failed to create rescue:', error);
  }
}

// Export for use in browser console and other modules
if (typeof window !== 'undefined') {
  (window as any).LightHeart = {
    initializeGame,
    submitBattle,
    createRescue,
    GameManager,
    SQLiteManager,
    NetworkManager
  };
}

export { GameManager, SQLiteManager, NetworkManager };
