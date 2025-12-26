/**
 * Backend Type Definitions
 */

export * from '../../types/index';

export interface ServerConfig {
  port: number;
  nodeEnv: 'development' | 'staging' | 'production';
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
  jwt: {
    secret: string;
    expire: string;
  };
  cors: {
    origin: string[];
  };
}

export interface DatabasePool {
  query<T = any>(sql: string, values?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, values?: any[]): Promise<T | null>;
  insert(sql: string, values?: any[]): Promise<number>;
  update(sql: string, values?: any[]): Promise<number>;
  delete(sql: string, values?: any[]): Promise<number>;
}
