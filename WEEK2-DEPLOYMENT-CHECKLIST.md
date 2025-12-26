# Week 2 部署检查清单

**版本：** 1.0  
**最后更新：** 2025-12-26  
**负责人：** 开发团队  

---

## 📋 部署前检查

### 代码准备

- [ ] 所有代码已提交到 Git
  - 检查：`git log` 查看最新提交
  - 确保没有未提交的改动：`git status`

- [ ] 代码审查已完成
  - 所有 PR 已合并
  - 没有待办的代码审查意见

- [ ] 依赖版本已锁定
  ```bash
  npm list --depth=0
  ```
  验证所有关键包的版本：
  - ✅ express: ^5.2.1
  - ✅ mysql2: ^3.16.0
  - ✅ redis: ^5.10.0
  - ✅ jsonwebtoken: ^9.0.3
  - ✅ typescript: ^5.9.3

### 环境配置

- [ ] 生产环境 .env 文件已配置
  ```env
  NODE_ENV=production
  PORT=3000
  DB_HOST=<production-host>
  DB_PORT=3306
  DB_USER=<production-user>
  DB_PASSWORD=<secure-password>
  DB_NAME=light_heart_game
  REDIS_HOST=<redis-host>
  REDIS_PORT=6379
  JWT_SECRET=<strong-secret-key>
  CORS_ORIGIN=<production-domain>
  ```

- [ ] JWT_SECRET 已更改（不使用默认值）
  - 生成强密钥：`openssl rand -base64 32`
  - 密钥长度 ≥ 32 字符

- [ ] 数据库密码已加密存储
  - 不使用 root 账户
  - 创建专用数据库用户
  - 权限最小化原则

- [ ] CORS 配置正确
  - 只允许授权的域名
  - 不使用通配符 '*'（除非必要）

### 代码质量

- [ ] 编译检查无错误
  ```bash
  npm run build
  ```

- [ ] TypeScript 类型检查无警告
  ```bash
  npx tsc --noEmit
  ```

- [ ] 没有 console.log 调试语句遗留

- [ ] 没有硬编码的 TODO/FIXME
  ```bash
  grep -r "TODO\|FIXME\|HACK" src/
  ```

- [ ] 密钥、密码未出现在代码中
  ```bash
  grep -r "password\|secret\|key" src/ | grep -v "process.env"
  ```

---

## 🗄️ 数据库准备

### 数据库服务

- [ ] MySQL 服务已启动并在线
  ```bash
  mysql -u root -p -e "SELECT VERSION();"
  ```

- [ ] Redis 服务已启动（如果使用缓存）
  ```bash
  redis-cli ping  # 预期输出：PONG
  ```

- [ ] 数据库备份已完成
  ```bash
  mysqldump -u root -p light_heart_game > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

### 数据库结构

- [ ] 所有 7 张表已创建
  ```sql
  USE light_heart_game;
  SHOW TABLES;  # 应该显示 7 个表
  ```

- [ ] 所有索引已建立
  ```sql
  -- 检查每个表的索引
  SHOW INDEX FROM accounts;
  SHOW INDEX FROM battle_records;
  -- ... 其他表
  ```

- [ ] 外键约束已配置
  ```sql
  SELECT CONSTRAINT_NAME, TABLE_NAME, REFERENCED_TABLE_NAME
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE REFERENCED_TABLE_NAME IS NOT NULL
  AND TABLE_SCHEMA = 'light_heart_game';
  ```

- [ ] 初始数据已导入
  ```sql
  SELECT COUNT(*) FROM accounts;        -- 应该 > 0
  SELECT COUNT(*) FROM battle_records;  -- 应该 > 0
  ```

### 数据库用户

- [ ] 专用数据库用户已创建
  ```sql
  CREATE USER 'lightheart'@'localhost' IDENTIFIED BY '<strong-password>';
  GRANT SELECT, INSERT, UPDATE, DELETE ON light_heart_game.* TO 'lightheart'@'localhost';
  ```

- [ ] 用户权限最小化
  - 不使用 root 账户
  - 只授予必要的权限
  - 不授予 DROP、CREATE 权限

- [ ] 远程连接已禁用（本地部署）
  - 或限制连接来源 IP

### 数据库备份

- [ ] 备份策略已制定
  - [ ] 日备份计划
  - [ ] 周备份计划
  - [ ] 月备份计划

- [ ] 备份脚本已创建
  ```bash
  # /usr/local/bin/backup-mysql.sh
  #!/bin/bash
  BACKUP_DIR="/data/backups"
  TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
  mysqldump -u lightheart -p"$MYSQL_PASSWORD" \
    light_heart_game > "$BACKUP_DIR/backup_$TIMESTAMP.sql"
  ```

- [ ] 备份测试已进行（恢复测试）

---

## 🔐 安全检查

### 认证和授权

- [ ] JWT Token 配置正确
  - 过期时间设置合理（生产：1天）
  - 使用强密钥

- [ ] 所有需要保护的端点都有认证
  ```bash
  curl http://localhost:3000/api/leaderboard/submit \
    -H "Content-Type: application/json" \
    -d '{"mapId":"map_001","score":1000}'
  # 预期：401 Unauthorized
  ```

- [ ] Token 刷新机制已测试
  ```bash
  curl -X POST http://localhost:3000/api/auth/refresh \
    -H "Authorization: Bearer $TOKEN"
  ```

### 速率限制

- [ ] IP 速率限制已启用并测试
  ```bash
  for i in {1..105}; do
    curl http://localhost:3000/api/leaderboard
  done
  # 预期：第 101+ 请求返回 429
  ```

- [ ] 玩家速率限制已配置
  - 1 分钟 30 请求

- [ ] 关键操作限制已配置
  - 5 分钟 10 次关键操作

### SQL 注入防护

- [ ] 所有查询使用参数化
  ```typescript
  // ✅ 正确
  const sql = 'SELECT * FROM users WHERE id = ?';
  await db.query(sql, [userId]);
  
  // ❌ 错误
  const sql = `SELECT * FROM users WHERE id = ${userId}`;
  ```

- [ ] 输入验证已实现
  - 类型检查
  - 长度检查
  - 范围检查

### CORS 配置

- [ ] CORS 已正确配置
  ```typescript
  app.use(cors({
    origin: ['https://yourdomain.com'],  // 生产域名
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  ```

- [ ] 只允许必要的来源
- [ ] 不使用 '*' 通配符

### 日志和监控

- [ ] 敏感数据不输出到日志
  ```bash
  grep -r "password\|token\|secret" src/ | grep "console\|logger"
  ```

- [ ] 错误日志已配置
- [ ] 访问日志已配置

---

## ⚡ 性能检查

### 缓存配置

- [ ] Redis 连接正常
  ```bash
  redis-cli ping
  redis-cli info server
  ```

- [ ] 缓存策略已验证
  ```bash
  curl http://localhost:3000/api/cache/stats
  # 检查连接状态和内存使用
  ```

- [ ] 缓存失效机制已测试
  - 分数提交后排行榜缓存清除
  - 玩家数据修改后缓存清除

### 数据库连接池

- [ ] 连接池参数已配置
  - waitForConnections: true
  - connectionLimit: 10
  - queueLimit: 0

- [ ] 连接池使用正常
  ```bash
  # 在应用日志中检查连接状态
  ```

### 查询优化

- [ ] 所有慢查询已优化（< 100ms）
  ```sql
  -- 启用慢查询日志
  SET GLOBAL slow_query_log = 'ON';
  SET GLOBAL long_query_time = 0.1;
  ```

- [ ] 索引使用正确
  ```sql
  EXPLAIN SELECT * FROM battle_records WHERE player_id = '...';
  # 检查 "Using index" 或 "Using where"
  ```

---

## 🧪 测试清单

### 功能测试

- [ ] 健康检查端点正常
  ```bash
  curl http://localhost:3000/health
  ```

- [ ] 登录流程正常
  ```bash
  curl -X POST http://localhost:3000/api/auth/wechat-login \
    -H "Content-Type: application/json" \
    -d '{"code":"test","nickname":"Test"}'
  ```

- [ ] 所有 Layer 1 端点通过
  - [ ] 分数提交
  - [ ] 排行榜查询
  - [ ] 排名计算

- [ ] 所有 Layer 2 端点通过
  - [ ] 救援创建
  - [ ] 救援完成

- [ ] 所有 Layer 3 端点通过
  - [ ] 数据同步
  - [ ] 角色数据同步

- [ ] 所有 Layer 4 端点通过
  - [ ] 异常上报

### 集成测试

- [ ] 端到端测试脚本运行通过
  ```bash
  npm run e2e-test
  # 预期：9/9 通过
  ```

- [ ] 性能基准测试达标
  ```bash
  npm run performance-test
  # 预期：所有端点平均响应时间 < 100ms
  ```

### 压力测试

- [ ] 并发数 10 下性能正常
- [ ] 并发数 50 下性能可接受
- [ ] 没有内存泄漏（运行 1 小时后）

---

## 📡 网络配置

### 防火墙

- [ ] 只开放必要的端口
  - 3000: 后端 API
  - 3306: MySQL（仅限内部）
  - 6379: Redis（仅限内部）

- [ ] 生产环境使用 HTTPS
  - [ ] SSL 证书已申请
  - [ ] 证书在反向代理配置中

### 反向代理

- [ ] Nginx/Apache 已配置
  ```nginx
  server {
    listen 443 ssl;
    server_name api.yourdomain.com;
    
    ssl_certificate /path/to/cert.crt;
    ssl_certificate_key /path/to/key.key;
    
    location / {
      proxy_pass http://localhost:3000;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
  }
  ```

- [ ] 反向代理性能正常
  - 响应时间正常
  - 连接状态正常

### DNS

- [ ] DNS 记录已配置
  ```bash
  nslookup api.yourdomain.com
  ```

- [ ] DNS 缓存合理（TTL 设置）

---

## 📊 监控和告警

### 日志收集

- [ ] 应用日志已配置
  - 日志级别：info（生产）
  - 日志位置：/var/log/lightheart/

- [ ] 日志轮转已配置
  ```bash
  # logrotate 配置
  /var/log/lightheart/*.log {
    daily
    rotate 7
    compress
    missingok
  }
  ```

### 监控指标

- [ ] CPU 使用率监控已配置
- [ ] 内存使用率监控已配置
- [ ] 磁盘空间监控已配置
- [ ] 网络 I/O 监控已配置

### 告警规则

- [ ] CPU > 80% 告警
- [ ] 内存 > 90% 告警
- [ ] 磁盘 > 85% 告警
- [ ] API 响应时间 > 500ms 告警
- [ ] 错误率 > 1% 告警

### 健康检查

- [ ] 心跳检查已配置
  ```bash
  */5 * * * * curl http://localhost:3000/health
  ```

- [ ] 数据库连接检查
- [ ] Redis 连接检查

---

## 🚀 部署流程

### 预部署

- [ ] 备份当前运行环境
- [ ] 准备回滚脚本
- [ ] 通知相关人员
- [ ] 安排值班人员

### 部署步骤

1. **停止服务**
   ```bash
   pm2 stop lightheart
   ```

2. **备份代码**
   ```bash
   cp -r /app/lightheart /app/lightheart.backup.$(date +%Y%m%d_%H%M%S)
   ```

3. **更新代码**
   ```bash
   cd /app/lightheart
   git fetch origin
   git checkout <release-tag>
   ```

4. **安装依赖**
   ```bash
   npm install --production
   ```

5. **编译代码**
   ```bash
   npm run build
   ```

6. **数据库迁移（如需要）**
   ```bash
   npm run migrate
   ```

7. **启动服务**
   ```bash
   pm2 start ecosystem.config.js
   ```

8. **验证服务**
   ```bash
   curl http://localhost:3000/health
   ```

### 部署验证

- [ ] 服务启动成功
- [ ] 健康检查通过
- [ ] 核心功能正常
- [ ] 日志无错误

### 部署后

- [ ] 观察监控数据 30 分钟
- [ ] 观察日志是否有异常
- [ ] 进行冒烟测试
- [ ] 通知用户上线完成

---

## 🔄 回滚计划

### 快速回滚

```bash
# 1. 停止当前服务
pm2 stop lightheart

# 2. 恢复备份代码
rm -rf /app/lightheart
cp -r /app/lightheart.backup.YYYYMMDD_HHMMSS /app/lightheart

# 3. 重启服务
pm2 start ecosystem.config.js

# 4. 验证
curl http://localhost:3000/health
```

### 数据库回滚

```bash
# 1. 备份当前数据
mysqldump -u lightheart -p light_heart_game > backup_current.sql

# 2. 恢复备份
mysql -u lightheart -p light_heart_game < backup_pre_deploy.sql

# 3. 重启应用
pm2 restart lightheart
```

---

## 📝 部署记录表

| 部署日期 | 版本 | 部署人员 | 状态 | 备注 |
|---------|------|---------|------|------|
|          |      |         |      |      |
|          |      |         |      |      |
|          |      |         |      |      |

---

## ✅ 最终确认

- [ ] 所有检查项已完成
- [ ] 所有测试已通过
- [ ] 所有文档已准备
- [ ] 团队已确认部署准备就绪

**部署负责人：** _______________  
**部署日期：** _______________  
**部署结果：** ☐ 成功  ☐ 失败  ☐ 部分成功  

**备注：**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## 📞 应急联系

- **技术负责人：** 
- **运维负责人：** 
- **数据库管理员：** 
- **24/7 值班电话：** 

**应急流程：**
1. 发现问题 → 立即通知值班人员
2. 评估影响范围
3. 执行回滚或修复
4. 验证系统恢复
5. 汇总事件报告

---

**文档版本：** 1.0  
**最后更新：** 2025-12-26  
**下次审查日期：** 2025-12-31
