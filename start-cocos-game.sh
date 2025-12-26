#!/bin/bash

# Light Heart Game - Cocos Creator 快速启动脚本
# 用途：一键启动后端服务和 Cocos Creator 编辑器
# 用法：./start-cocos-game.sh

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎮 Light Heart Game - Cocos Creator Setup${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 步骤 1：检查 Node.js
echo -e "${YELLOW}[1/4] 检查 Node.js 环境...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js 未安装，请访问 https://nodejs.org 安装${NC}"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"

# 步骤 2：检查 Cocos Creator
echo -e "${YELLOW}[2/4] 检查 Cocos Creator 安装...${NC}"
COCOS_PATH="/Applications/Cocos Creator 3.8.app"
if [ ! -d "$COCOS_PATH" ]; then
    echo -e "${RED}❌ Cocos Creator 3.8 未安装${NC}"
    echo "请从 https://www.cocos.com/download 下载安装"
    exit 1
fi
echo -e "${GREEN}✓ Cocos Creator 3.8 已安装${NC}"

# 步骤 3：启动后端服务
echo -e "${YELLOW}[3/4] 启动后端服务...${NC}"
cd "$PROJECT_ROOT/backend"

if [ ! -d "node_modules" ]; then
    echo "📦 安装后端依赖..."
    npm install > /dev/null 2>&1
fi

# 在后台启动后端服务
npm run dev &
BACKEND_PID=$!
echo -e "${GREEN}✓ 后端服务已启动 (PID: $BACKEND_PID)${NC}"

# 等待后端启动完毕
echo "⏳ 等待后端服务就绪..."
sleep 3

# 检查后端是否在线
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 后端服务 http://localhost:3000 正在运行${NC}"
else
    echo -e "${YELLOW}⚠️  后端服务可能未完全启动，请检查终端输出${NC}"
fi

# 步骤 4：启动 Cocos Creator
echo -e "${YELLOW}[4/4] 启动 Cocos Creator 编辑器...${NC}"
echo "📂 项目路径: $PROJECT_ROOT"
echo ""

# 启动 Cocos Creator
open "$COCOS_PATH" --args --project "$PROJECT_ROOT"

echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}✓ 启动完成！${NC}"
echo ""
echo -e "${BLUE}📋 下一步操作：${NC}"
echo "1. 在 Cocos Creator 编辑器中等待项目加载"
echo "2. 创建 Assets 目录和场景（参考 COCOS-CREATOR-SETUP.md）"
echo "3. 点击编辑器右上角的绿色 ▶ 按钮运行游戏"
echo ""
echo -e "${BLUE}📝 后端服务信息：${NC}"
echo "- URL: http://localhost:3000"
echo "- 健康检查: curl http://localhost:3000/health"
echo "- 停止服务: kill $BACKEND_PID"
echo ""
echo -e "${BLUE}📖 参考文档：${NC}"
echo "- 完整配置指南: COCOS-CREATOR-SETUP.md"
echo "- 技术决策: TECHNICAL-DECISIONS.md"
echo ""

# 保持脚本运行
echo -e "${YELLOW}按 Ctrl+C 停止后端服务${NC}"
wait $BACKEND_PID
