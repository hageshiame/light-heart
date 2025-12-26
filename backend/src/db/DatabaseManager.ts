import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

/**
 * MySQL Database Connection Pool Manager
 * Handles connection creation, pooling, and lifecycle
 */
class DatabaseManager {
  private static instance: DatabaseManager;
  private pool: mysql.Pool | null = null;
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize database connection pool
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Database already initialized');
      return;
    }

    try {
      const config = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'light_heart_game',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelayMs: 30000,
      };

      this.pool = mysql.createPool(config);

      // Test connection
      const connection = await this.pool.getConnection();
      const result = await connection.query('SELECT 1');
      connection.release();

      this.initialized = true;
      console.log('✓ Database connection pool initialized');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Get connection from pool
   */
  async getConnection(): Promise<mysql.PoolConnection> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    return this.pool.getConnection();
  }

  /**
   * Execute query with automatic connection release
   */
  async query<T = any>(sql: string, values?: any[]): Promise<T[]> {
    const connection = await this.getConnection();
    try {
      const [results] = await connection.execute(sql, values);
      return results as T[];
    } finally {
      connection.release();
    }
  }

  /**
   * Execute query returning first row
   */
  async queryOne<T = any>(sql: string, values?: any[]): Promise<T | null> {
    const results = await this.query<T>(sql, values);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Insert and return affected rows
   */
  async insert(sql: string, values?: any[]): Promise<number> {
    const connection = await this.getConnection();
    try {
      const [result] = await connection.execute(sql, values);
      return (result as any).affectedRows;
    } finally {
      connection.release();
    }
  }

  /**
   * Update and return affected rows
   */
  async update(sql: string, values?: any[]): Promise<number> {
    return this.insert(sql, values);
  }

  /**
   * Delete and return affected rows
   */
  async delete(sql: string, values?: any[]): Promise<number> {
    return this.insert(sql, values);
  }

  /**
   * Transaction management
   */
  async transaction<T>(
    callback: (connection: mysql.PoolConnection) => Promise<T>
  ): Promise<T> {
    const connection = await this.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Close pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.initialized = false;
      console.log('Database connection pool closed');
    }
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

export default DatabaseManager.getInstance();
