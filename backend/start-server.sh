#!/bin/bash

# 🎮 Light Heart Game Backend Startup Script

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Light Heart Game Backend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✓ Node.js version: $NODE_VERSION"

# 检查环境文件
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found, copying from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✓ Created .env file from .env.example"
        echo "📝 Please update .env with your configuration"
    else
        echo "❌ .env.example not found!"
        exit 1
    fi
fi

# 检查 node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# 显示配置信息
echo ""
echo "📋 Configuration:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PORT=$(grep '^PORT=' .env | cut -d '=' -f 2 || echo "3000")
NODE_ENV=$(grep '^NODE_ENV=' .env | cut -d '=' -f 2 || echo "development")
DB_HOST=$(grep '^DB_HOST=' .env | cut -d '=' -f 2 || echo "localhost")
DB_PORT=$(grep '^DB_PORT=' .env | cut -d '=' -f 2 || echo "3306")
DB_NAME=$(grep '^DB_NAME=' .env | cut -d '=' -f 2 || echo "light_heart_game")

echo "🌍 Environment: $NODE_ENV"
echo "🔌 Server Port: $PORT"
echo "💾 Database: $DB_HOST:$DB_PORT/$DB_NAME"

echo ""
echo "⚠️  Pre-startup Checks:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查数据库连接
echo "🔍 Checking MySQL connection to $DB_HOST:$DB_PORT..."
if timeout 2 bash -c "echo > /dev/tcp/$DB_HOST/$DB_PORT" 2>/dev/null; then
    echo "✓ MySQL is accessible"
else
    echo "⚠️  MySQL is not accessible at $DB_HOST:$DB_PORT"
    echo "   Make sure MySQL is running or update DB_HOST/DB_PORT in .env"
    echo "   The server will attempt to initialize connection on startup"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Starting Server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 选择运行命令
if [ "$NODE_ENV" = "development" ]; then
    echo "📝 Running in Development Mode (with hot reload)"
    echo ""
    npm run dev
else
    echo "🔨 Building TypeScript..."
    npm run build
    echo ""
    echo "▶️  Running compiled code..."
    node dist/index.js
fi
