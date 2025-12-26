import CryptoJS from 'crypto-js';

/**
 * SQLiteManager: Local SQLite Database Management
 * Handles encryption, integrity checking, and CRUD operations
 * Works on WeChat Mini Program environment with native SQLite support
 */
export class SQLiteManager {
  private static instance: SQLiteManager;
  private encryptionKey: string = '';
  private dbName: string = 'light_heart.db';
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): SQLiteManager {
    if (!SQLiteManager.instance) {
      SQLiteManager.instance = new SQLiteManager();
    }
    return SQLiteManager.instance;
  }

  /**
   * Initialize SQLiteManager with session ID
   * Derives encryption key from session token
   */
  async init(sessionToken: string): Promise<void> {
    try {
      this.encryptionKey = this.deriveKeyFromToken(sessionToken);
      
      // TODO: Initialize native SQLite connection on WeChat Mini Program
      // For now, use localStorage simulation for local development
      await this.createTables();
      
      // Schedule periodic backup
      this.scheduleBackup();
      
      // Verify database integrity
      const isValid = await this.verifyIntegrity();
      if (!isValid) {
        console.warn('Database integrity check failed, attempting recovery...');
        await this.recoverFromBackup();
      }
      
      this.initialized = true;
      console.log('✓ SQLiteManager initialized');
    } catch (error) {
      console.error('Failed to initialize SQLiteManager:', error);
      throw error;
    }
  }

  /**
   * Save character to local database (encrypted)
   */
  async saveCharacter(character: any): Promise<void> {
    if (!this.initialized) throw new Error('SQLiteManager not initialized');
    
    try {
      const encrypted = this.encrypt(JSON.stringify(character));
      
      // TODO: Insert into SQLite
      // For now, use localStorage
      localStorage.setItem(`char_${character.id}`, encrypted);
      
      // Update table hash for integrity check
      await this.updateTableHash('characters');
      
      console.log(`✓ Character ${character.id} saved`);
    } catch (error) {
      console.error('Failed to save character:', error);
      throw error;
    }
  }

  /**
   * Query character from local database
   */
  async queryCharacter(characterId: string): Promise<any> {
    if (!this.initialized) throw new Error('SQLiteManager not initialized');
    
    try {
      const encrypted = localStorage.getItem(`char_${characterId}`);
      if (!encrypted) return null;
      
      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to query character:', error);
      return null;
    }
  }

  /**
   * Query all characters
   */
  async queryAllCharacters(): Promise<any[]> {
    const characters: any[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('char_')) {
        const encrypted = localStorage.getItem(key);
        if (encrypted) {
          try {
            const decrypted = this.decrypt(encrypted);
            characters.push(JSON.parse(decrypted));
          } catch (e) {
            console.warn(`Failed to decrypt ${key}`);
          }
        }
      }
    }
    return characters;
  }

  /**
   * Periodic backup (every 5 minutes)
   */
  private scheduleBackup(): void {
    setInterval(async () => {
      try {
        const backup = {
          timestamp: Date.now(),
          data: {
            characters: await this.queryAllCharacters(),
            // Add more tables as needed
          },
          hash: await this.calculateDatabaseHash()
        };
        
        localStorage.setItem('backup_latest', JSON.stringify(backup));
        console.log(`✓ Backup created at ${new Date().toISOString()}`);
      } catch (error) {
        console.warn('Backup failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Verify database integrity
   */
  async verifyIntegrity(): Promise<boolean> {
    try {
      const tables = ['characters', 'equipment', 'achievements'];
      
      for (const table of tables) {
        const currentHash = await this.calculateTableHash(table);
        const storedHash = localStorage.getItem(`hash_${table}`);
        
        if (storedHash && currentHash !== storedHash) {
          console.warn(`${table} integrity check failed!`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Integrity check error:', error);
      return false;
    }
  }

  /**
   * Recover from latest backup
   */
  async recoverFromBackup(): Promise<void> {
    try {
      const backupStr = localStorage.getItem('backup_latest');
      if (!backupStr) {
        console.warn('No backup available for recovery');
        return;
      }
      
      const backup = JSON.parse(backupStr);
      const { characters } = backup.data;
      
      // Restore characters
      for (const char of characters) {
        await this.saveCharacter(char);
      }
      
      console.log('✓ Database recovered from backup');
    } catch (error) {
      console.error('Recovery failed:', error);
    }
  }

  /**
   * Encryption using AES-256
   */
  private encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
  }

  /**
   * Decryption using AES-256
   */
  private decrypt(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Derive encryption key from session token
   */
  private deriveKeyFromToken(sessionToken: string): string {
    return CryptoJS.SHA256(sessionToken).toString();
  }

  /**
   * Calculate hash of a table
   */
  private async calculateTableHash(table: string): Promise<string> {
    const data = localStorage.getItem(`table_${table}`) || '';
    return CryptoJS.SHA256(data).toString();
  }

  /**
   * Update table hash for integrity check
   */
  private async updateTableHash(table: string): Promise<void> {
    const data = localStorage.getItem(`table_${table}`) || '';
    const hash = CryptoJS.SHA256(data).toString();
    localStorage.setItem(`hash_${table}`, hash);
  }

  /**
   * Calculate database hash
   */
  private async calculateDatabaseHash(): Promise<string> {
    const allData: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.startsWith('backup_') && !key.startsWith('hash_')) {
        allData.push(localStorage.getItem(key) || '');
      }
    }
    return CryptoJS.SHA256(allData.join('')).toString();
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    // TODO: Create SQLite tables
    // For now, just initialize localStorage markers
    const tables = ['characters', 'equipment', 'achievements', 'battleRecords'];
    for (const table of tables) {
      if (!localStorage.getItem(`table_${table}`)) {
        localStorage.setItem(`table_${table}`, '');
      }
    }
  }

  /**
   * Clear all data (for testing)
   */
  async clearAll(): Promise<void> {
    localStorage.clear();
    this.initialized = false;
  }
}

export default SQLiteManager.getInstance();
