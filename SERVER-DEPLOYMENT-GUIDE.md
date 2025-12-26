# 4核8G服务器部署完整指南

> **目标**: 从零到一完成阿里云轻量服务器的全部配置  
> **时间**: 2-3小时  
> **难度**: 中等 (有Linux基础即可)

---

## 快速检查清单

在开始前，确保你有：
- [ ] 阿里云账户 + 支付宝或信用卡
- [ ] SSH客户端 (Mac/Linux用terminal, Windows用PuTTY)
- [ ] Git (用于代码部署)

---

## 第一步：购买阿里云轻量服务器 (30分钟)

### 1.1 登录阿里云

访问: https://www.aliyun.com/ → 登录/注册 → 进入控制台

### 1.2 购买轻量应用服务器

```
路径: 产品 → 轻量应用服务器 → 立即购买

配置选择:
  地域: 中国大陆 (推荐选离用户最近的区域)
  镜像: Ubuntu 20.04 LTS
  CPU: 4核
  内存: 8GB
  系统盘: 100GB SSD (足够)
  带宽: 5Mbps (可升级)
  
购买时长: 按年 (更便宜)
成本: 约 50元/月 = 600元/年
```

### 1.3 获取重要信息

购买后，在"我的资源"页面找到你的服务器，记录:
- ✅ **公网IP地址** (例: 47.92.XX.XX)
- ✅ **root密码** (妥善保管)
- ✅ **服务器ID** (用于标识)

**验证**: 尝试通过SSH连接
```bash
ssh root@47.92.XX.XX
# 输入root密码
# 应该看到 Ubuntu 20.04 的欢迎信息
```

---

## 第二步：服务器基础配置 (1小时)

### 2.1 连接到服务器

```bash
# Mac/Linux 用户
ssh root@YOUR_SERVER_IP

# Windows用户 (Git Bash或PuTTY)
ssh root@YOUR_SERVER_IP
```

### 2.2 系统更新与安全加固

```bash
# 更新系统包列表
sudo apt update && sudo apt upgrade -y

# 安装必要工具
sudo apt install -y curl wget git vim htop

# 创建普通用户 (避免总是用root)
sudo adduser deploy
# 按提示输入密码和用户信息

# 为新用户添加sudo权限
sudo usermod -aG sudo deploy

# 配置SSH密钥登录 (可选，但推荐提高安全性)
su deploy
mkdir -p ~/.ssh
# 在本地生成: ssh-keygen -t rsa -b 4096
# 将公钥内容粘贴到 ~/.ssh/authorized_keys
```

### 2.3 防火墙配置

```bash
# 启用UFW防火墙
sudo ufw enable

# 允许SSH (端口22) - 非常重要，否则会被锁定
sudo ufw allow 22/tcp

# 允许HTTP和HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 验证规则
sudo ufw status
```

---

## 第三步：环境配置 (1.5小时)

### 3.1 安装Node.js 16+

```bash
# 添加NodeSource仓库
curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -

# 安装Node.js和npm
sudo apt install -y nodejs

# 验证安装
node -v    # 应显示 v16.X.X
npm -v     # 应显示 8.X.X

# 升级npm (可选)
sudo npm install -g npm@latest
```

### 3.2 安装MySQL 5.7

```bash
# 安装MySQL服务器
sudo apt install -y mysql-server

# 初始化 (输入root密码)
sudo mysql_secure_installation
# 选择: Y 对所有提示 (除了改密码可以N)

# 启动MySQL
sudo systemctl start mysql
sudo systemctl enable mysql  # 开机自启

# 验证
mysql -u root -p
# 输入密码，看到 mysql> 提示符
exit
```

### 3.3 安装Redis

```bash
# 安装Redis
sudo apt install -y redis-server

# 启动Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server  # 开机自启

# 验证
redis-cli ping
# 应该显示 PONG
```

### 3.4 安装Nginx (反向代理)

```bash
# 安装Nginx
sudo apt install -y nginx

# 启动Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 验证
curl http://localhost
# 应该看到 Nginx欢迎页面
```

---

## 第四步：应用配置 (1小时)

### 4.1 创建项目目录

```bash
# 创建应用目录
sudo mkdir -p /var/www/game-server
sudo chown -R deploy:deploy /var/www/game-server

# 切换用户
su deploy
cd /var/www/game-server
```

### 4.2 初始化Express.js项目

```bash
# 创建项目
npm init -y

# 安装依赖
npm install express cors body-parser dotenv
npm install --save-dev ts-node typescript @types/node @types/express

# 创建TypeScript配置
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
EOF

# 创建src目录
mkdir -p src
```

### 4.3 创建基础Express应用

```bash
# 创建主应用文件
cat > src/app.ts << 'EOF'
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();

// 中间件
app.use(cors());
app.use(bodyParser.json());

// 测试路由
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// API示例路由
app.post('/api/auth/wechat-login', (req, res) => {
  res.json({
    success: true,
    data: {
      sessionToken: 'test-token-xxx',
      playerId: 'player-001',
      expiresAt: Date.now() + 3600000
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
EOF

# 创建环境配置文件
cat > .env << 'EOF'
PORT=3000
NODE_ENV=production
DATABASE_URL=mysql://root:your_password@localhost:3306/game
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-here
EOF
```

### 4.4 构建和测试

```bash
# 编译TypeScript
npx tsc

# 测试运行
node dist/app.js
# 看到 "🚀 Server running on port 3000"

# 在另一个终端测试
curl http://localhost:3000/health
# 应该返回 JSON: {"status":"ok","timestamp":"2025-12-26T..."}

# 停止服务 (Ctrl+C)
```

---

## 第五步：数据库初始化 (30分钟)

### 5.1 创建MySQL数据库

```bash
# 连接到MySQL
mysql -u root -p

# 执行以下SQL命令
```

```sql
-- 创建数据库
CREATE DATABASE game DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 切换到新数据库
USE game;

-- 创建玩家账户表
CREATE TABLE accounts (
  id VARCHAR(36) PRIMARY KEY,
  wechat_openid VARCHAR(255) UNIQUE NOT NULL,
  nickname VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  INDEX idx_openid (wechat_openid)
);

-- 创建排行榜分数表
CREATE TABLE scores (
  id VARCHAR(36) PRIMARY KEY,
  player_id VARCHAR(36) NOT NULL,
  map_id VARCHAR(50) NOT NULL,
  score INT NOT NULL,
  damage_dealt INT,
  damage_received INT,
  clear_time INT,
  extract_success BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES accounts(id),
  INDEX idx_player_score (player_id, score DESC),
  INDEX idx_map_score (map_id, score DESC)
);

-- 创建救援请求表
CREATE TABLE rescue_requests (
  id VARCHAR(36) PRIMARY KEY,
  requester_id VARCHAR(36) NOT NULL,
  map_id VARCHAR(50),
  lost_items JSON,
  total_value INT,
  status ENUM('pending', 'completed', 'expired') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES accounts(id)
);

-- 退出
EXIT;
```

### 5.2 验证数据库

```bash
# 连接并验证
mysql -u root -p game

# 在mysql提示符下
SHOW TABLES;
# 应该显示: accounts, scores, rescue_requests

# 查看表结构
DESC accounts;

EXIT;
```

---

## 第六步：Nginx反向代理配置 (30分钟)

### 6.1 创建Nginx配置文件

```bash
# 编辑Nginx配置
sudo nano /etc/nginx/sites-available/game-api

# 粘贴以下内容:
```

```nginx
server {
    listen 80;
    server_name game.example.com;  # 改为你的域名或IP
    
    # 重定向HTTP到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name game.example.com;  # 改为你的域名或IP
    
    # SSL证书 (先用自签名，后续替换为Let's Encrypt)
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # 日志
    access_log /var/log/nginx/game-api.access.log;
    error_log /var/log/nginx/game-api.error.log;
    
    # 代理到Node.js应用
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 6.2 启用配置

```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/game-api /etc/nginx/sites-enabled/

# 测试Nginx配置
sudo nginx -t
# 应该显示: "successful" 或 "ok"

# 重启Nginx
sudo systemctl reload nginx
```

### 6.3 配置HTTPS (Let's Encrypt)

```bash
# 安装Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取免费SSL证书
sudo certbot --nginx -d game.example.com
# 按提示输入邮箱和同意条款

# 验证证书
sudo certbot certificates

# 自动更新设置
sudo systemctl enable certbot.timer
```

---

## 第七步：进程管理 (PM2)

### 7.1 安装PM2

```bash
# 全局安装PM2
sudo npm install -g pm2

# 初始化PM2
pm2 startup
# 按输出提示执行命令使其开机自启
```

### 7.2 创建PM2配置

```bash
# 创建ecosystem.config.js
cat > /var/www/game-server/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'game-api',
      script: './dist/app.js',
      instances: 'max',  // 使用全部CPU核心
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
      watch: false
    }
  ]
};
EOF

# 启动应用
pm2 start ecosystem.config.js

# 保存配置 (开机自启)
pm2 save

# 查看运行状态
pm2 status
```

---

## 第八步：监控和日志 (1小时)

### 8.1 配置日志收集

```bash
# 创建日志目录
mkdir -p /var/www/game-server/logs

# 配置PM2日志
pm2 logs game-api

# 查看日志
tail -f /var/www/game-server/logs/out.log
```

### 8.2 安装监控工具 (可选)

```bash
# 安装Prometheus监控
sudo apt install -y prometheus

# 启动Prometheus
sudo systemctl start prometheus
sudo systemctl enable prometheus

# 访问: http://localhost:9090
```

---

## 第九步：性能优化

### 9.1 MySQL优化

```bash
# 编辑MySQL配置
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# 添加以下参数:
```

```ini
[mysqld]
# 连接池
max_connections = 500

# InnoDB缓存
innodb_buffer_pool_size = 4G
innodb_log_file_size = 512M

# 查询缓存
query_cache_size = 256M
query_cache_type = 1

# 慢查询日志
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
```

```bash
# 重启MySQL
sudo systemctl restart mysql
```

### 9.2 Redis优化

```bash
# 编辑Redis配置
sudo nano /etc/redis/redis.conf

# 关键参数:
```

```
maxmemory 2gb
maxmemory-policy allkeys-lru
appendonly yes
appendfsync everysec
```

```bash
# 重启Redis
sudo systemctl restart redis-server
```

---

## 第十步：安全加固

### 10.1 SSH安全

```bash
# 编辑SSH配置
sudo nano /etc/ssh/sshd_config

# 修改以下项:
```

```
Port 22
PermitRootLogin no          # 禁止root登录
PasswordAuthentication no   # 仅允许密钥登录
PermitEmptyPasswords no
```

```bash
# 重启SSH
sudo systemctl restart ssh
```

### 10.2 定期备份

```bash
# 创建备份脚本
cat > /usr/local/bin/backup-game-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/game"
mkdir -p $BACKUP_DIR

# 备份MySQL
mysqldump -u root -p$MYSQL_PASSWORD game > $BACKUP_DIR/game-$(date +%Y%m%d).sql

# 保留最近7天的备份
find $BACKUP_DIR -name "game-*.sql" -mtime +7 -delete
EOF

# 加入cron计划任务 (每天凌晨2点执行)
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-game-db.sh") | crontab -
```

---

## 验证清单 ✅

启动完成后，逐一验证:

```bash
# 1. SSH连接
ssh root@YOUR_SERVER_IP
# ✅ 能连接

# 2. Node.js
node -v && npm -v
# ✅ 显示版本号

# 3. MySQL
mysql -u root -p -e "SHOW DATABASES;"
# ✅ 显示game数据库

# 4. Redis
redis-cli ping
# ✅ 显示PONG

# 5. Nginx
sudo systemctl status nginx
# ✅ 显示active(running)

# 6. Node应用
pm2 status
# ✅ 显示game-api running

# 7. API测试
curl https://game.example.com/health
# ✅ 返回JSON: {"status":"ok","timestamp":"..."}

# 8. 数据库连接
mysql -u root -p game -e "SELECT COUNT(*) FROM accounts;"
# ✅ 返回0 (空表)
```

---

## 常见问题排查

| 问题 | 解决方案 |
|------|--------|
| SSH连接超时 | 检查防火墙: `sudo ufw status` |
| 22端口被占用 | 改SSH端口: `sudo nano /etc/ssh/sshd_config` |
| MySQL连接失败 | 检查MySQL运行: `sudo systemctl status mysql` |
| Nginx 502错误 | 检查Node应用: `pm2 logs game-api` |
| 磁盘空间满 | 清理日志: `sudo journalctl --vacuum=50M` |
| 内存不足 | 查看用量: `free -h` + 增加swap |

---

## 生产环境部署 (Day 2)

当Week 1完成后，使用此脚本进行完整部署:

```bash
#!/bin/bash
set -e

# 拉取最新代码
cd /var/www/game-server
git pull origin main

# 重新安装依赖
npm install

# 编译TypeScript
npm run build

# 数据库迁移 (如有)
npm run migrate

# 重启应用
pm2 restart game-api

echo "✅ 部署完成"
```

---

**部署者**: 后端开发人员  
**时间**: 2-3小时  
**下一步**: Day 2开始编码工作
