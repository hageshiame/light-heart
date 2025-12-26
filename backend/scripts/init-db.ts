#!/usr/bin/env ts-node
/**
 * 🗄️ Database Initialization Script
 * 初始化 MySQL 数据库、创建表、建立索引、导入初始数据
 * 
 * 使用方法:
 *   npx ts-node scripts/init-db.ts
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'light_heart_game',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0
};

const SQL_SCHEMA_PATH = path.join(__dirname, '../src/db/schema.sql');
const INITIAL_DATA_PATH = path.join(__dirname, './init-data.sql');

async function initializeDatabase() {
  let connection;
  
  try {
    console.log('📋 Database Initialization Started');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔌 Connecting to MySQL at ${config.host}:${config.port}...`);

    // 创建初始连接（不指定数据库）
    const initialConnection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
    });

    // 1. 创建数据库
    console.log(`\n1️⃣ Creating database '${config.database}'...`);
    try {
      await initialConnection.execute(`CREATE DATABASE IF NOT EXISTS ${config.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log('✅ Database created successfully');
    } catch (err) {
      console.log('⚠️  Database already exists or creation skipped');
    }
    await initialConnection.end();

    // 2. 连接到目标数据库
    console.log(`\n2️⃣ Connecting to database '${config.database}'...`);
    connection = await mysql.createConnection(config);
    console.log('✅ Connected to target database');

    // 3. 读取和执行 schema.sql
    console.log('\n3️⃣ Executing schema.sql (creating tables and indexes)...');
    const schemaSQL = fs.readFileSync(SQL_SCHEMA_PATH, 'utf-8');
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));

    let successCount = 0;
    for (const statement of statements) {
      try {
        await connection.execute(statement);
        successCount++;
        if (statement.includes('CREATE TABLE') || statement.includes('ALTER TABLE')) {
          const tableName = statement.match(/CREATE TABLE\s+(\w+)|ALTER TABLE\s+(\w+)/)?.[1] || statement.match(/ALTER TABLE\s+(\w+)/)?.[1];
          if (tableName) {
            console.log(`   ✓ ${tableName}`);
          }
        }
      } catch (err: any) {
        if (!err.message.includes('already exists')) {
          console.warn(`   ⚠️  ${err.message.substring(0, 80)}`);
        }
      }
    }
    console.log(`✅ Schema executed (${successCount} statements)`);

    // 4. 初始化数据
    if (fs.existsSync(INITIAL_DATA_PATH)) {
      console.log('\n4️⃣ Inserting initial data...');
      const initialDataSQL = fs.readFileSync(INITIAL_DATA_PATH, 'utf-8');
      const dataStatements = initialDataSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('--'));

      let dataCount = 0;
      for (const statement of dataStatements) {
        try {
          const result = await connection.execute(statement);
          dataCount++;
        } catch (err) {
          console.warn(`   ⚠️  Insert failed: ${err}`);
        }
      }
      console.log(`✅ Initial data loaded (${dataCount} statements)`);
    } else {
      console.log('\n4️⃣ No initial data file found (skipped)');
    }

    // 5. 验证表结构
    console.log('\n5️⃣ Verifying table structure...');
    const [tables]: any = await connection.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
      [config.database]
    );

    const expectedTables = ['accounts', 'characters', 'equipment', 'battle_records', 'leaderboard_cache', 'rescue_requests', 'anticheat_reports'];
    const createdTables = tables.map((t: any) => t.TABLE_NAME);
    
    console.log(`   Expected tables: ${expectedTables.join(', ')}`);
    console.log(`   Created tables:  ${createdTables.join(', ')}`);

    const missingTables = expectedTables.filter(t => !createdTables.includes(t));
    if (missingTables.length > 0) {
      console.warn(`   ⚠️  Missing tables: ${missingTables.join(', ')}`);
    } else {
      console.log('✅ All expected tables created');
    }

    // 6. 显示数据库统计
    console.log('\n6️⃣ Database Statistics:');
    for (const tableName of createdTables) {
      try {
        const [result]: any = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
        const rowCount = result[0].count;
        console.log(`   ${tableName}: ${rowCount} rows`);
      } catch (err) {
        console.log(`   ${tableName}: (unable to query)`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Database initialization completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Error during database initialization:');
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行初始化
initializeDatabase();
