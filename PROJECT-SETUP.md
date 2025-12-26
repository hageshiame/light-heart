# 项目启动完整指南

> 从零开始搭建「光遇美术风格融合搜打撤」微信小游戏的完整步骤

---

## 快速开始 (5分钟)

```bash
# 1. 克隆项目
git clone https://github.com/yourteam/light-heart.git
cd light-heart

# 2. 安装依赖
npm install

# 3. 启动Cocos Creator编辑器
cd /Applications/CocosCreator/
open Cocos\ Creator.app

# 在Cocos Creator中打开项目文件夹: /Users/windwheel/Documents/gitrepo/light-heart

# 4. 预览游戏
# 菜单 → Project → Build Publisher → 选择微信小游戏 → Build

# 5. 使用微信开发者工具测试
# 打开微信开发者工具 → 预览 → 选择上一步生成的dist文件夹
```

---

## 环境要求

### 硬件要求
```
推荐配置:
  CPU:    Intel i5+ / Apple M1+
  RAM:    8GB+
  SSD:    256GB+ (开发环境占用约10GB)
  屏幕:    1920×1080+ (编辑器窗口大)

最低配置:
  CPU:    Intel i3 / Apple M1
  RAM:    4GB
  屏幕:    1440×900
```

### 软件要求

```bash
# macOS
  Node.js:           v16+ (推荐v18 LTS)
  Cocos Creator:     v3.8.0+ (官方下载)
  Git:               2.30+
  Spine Professional: 4.1+ (可选，用于美术)

# Windows 10/11
  Visual Studio Code: 必须
  其他同上

# 验证环境
node --version           # v16.x.x 或更高
npm --version            # 8.x.x 或更高
git --version            # 2.30+ 或更高
```

### IDE推荐

```yaml
代码编辑:
  VS Code + 扩展:
    - Cocos Creator Coding Helper
    - TypeScript Vue Plugin
    - Prettier
    - ESLint

美术编辑:
  Spine Professional (专业版)
  PS / Clip Studio Paint (立绘制作)
```

---

## 一步步搭建项目

### 步骤1: 初始化项目结构

```bash
# 使用Cocos Creator官方模板
cocos create light-heart --template 3d --language typescript

cd light-heart

# 项目结构应为:
# light-heart/
# ├── assets/
# │   ├── resources/
# │   │   ├── characters/
# │   │   ├── scenes/
# │   │   ├── configs/
# │   │   └── ...
# ├── src/
# │   └── (发布版本)
# ├── package.json
# ├── tsconfig.json
# └── game.json
```

### 步骤2: 配置TypeScript与编译

```bash
# 初始化tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true,
    "outDir": "./lib"
  },
  "include": ["assets/scripts/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

# 安装编译工具
npm install --save-dev typescript tsc-watch
```

### 步骤3: 配置游戏参数

编辑 `game.json`:

```json
{
  "networkTimeout": 30000,
  "iOSHighPerformance": true,
  "openDataContext": {
    "enable": true
  },
  
  "subpackages": [
    {
      "name": "characters",
      "root": "assets/resources/characters",
      "compress": "zip"
    },
    {
      "name": "scenes",
      "root": "assets/resources/scenes",
      "compress": "zip"
    },
    {
      "name": "configs",
      "root": "assets/resources/configs",
      "compress": "zip"
    }
  ],
  
  "plugins": {
    "spine": {
      "version": "4.1.0",
      "provider": "wx999999"
    }
  }
}
```

### 步骤4: 安装Spine插件

```bash
# 在 Cocos Creator 中:
# 菜单 → Extensions → Extension Manager
# 搜索 "spine" → 点击 "install" (版本4.1.0)

# 或手动安装:
cd extensions
git clone https://github.com/cocos-creator/engine-spine.git spine --depth=1
```

### 步骤5: 创建核心目录结构

```bash
mkdir -p assets/scripts/{managers,systems,ui,entities,utils}
mkdir -p assets/resources/{characters,scenes,configs,sounds,images,effects}

# 初始化各目录的index.ts
touch assets/scripts/managers/index.ts
touch assets/scripts/systems/index.ts
# ... 等等
```

### 步骤6: 创建入口脚本

```bash
cat > assets/scripts/GameManager.ts << 'EOF'
import { _decorator, Component, Node } from "cc";

const { ccclass, property } = _decorator;

@ccclass("GameManager")
export class GameManager extends Component {
  static instance: GameManager;

  onLoad() {
    GameManager.instance = this;
    cc.game.addPersistRootNode(this.node);
  }

  start() {
    console.log("[GameManager] Game started!");
    // 初始化各个系统
    this.initSystems();
  }

  private initSystems(): void {
    // TODO: 初始化玩家数据、配置系统等
  }
}
EOF
```

---

## 开发工作流

### 日常开发循环

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 创建特性分支
git checkout -b feature/new-feature

# 3. 编辑代码和资源
# - 在Cocos Creator中编辑场景
# - 在VS Code中编写脚本

# 4. 实时预览 (Cocos Creator 内置)
# 使用Play按钮预览

# 5. 提交代码
git add .
git commit -m "feat: 实现新系统"
git push origin feature/new-feature

# 6. 创建Pull Request，等待审核

# 7. 合并到main
git checkout main
git pull
git merge feature/new-feature
```

### 构建微信小游戏

```bash
# 方法1: Cocos Creator UI
# 菜单 → Project → Build Publisher
# 平台选择: 微信小游戏
# 点击 Build → 等待生成

# 方法2: 命令行
npm run build:wechat

# 输出在:
# dist/wechat-game/
#   ├── game.js
#   ├── game.json
#   ├── project.config.json
#   └── ...
```

### 测试流程

```bash
# 单元测试
npm run test

# 性能检查
npm run profile

# 集成测试
npm run test:integration

# 微信开发者工具本地测试
# 打开微信开发者工具
# 选择项目文件夹: dist/wechat-game/
# 点击"预览"或"真机调试"
```

---

## 资源导入指南

### 导入Spine骨骼动画

```
步骤:
1. 在Spine Professional中导出:
   - File → Export → PNG Sequence
   - 同时导出 skeleton.json

2. 使用Spine Optimizer优化:
   - File → Optimize... → 精度设置为0.01

3. 在Cocos Creator中:
   - 将文件放入: assets/resources/characters/{character_id}/
   - 自动识别为Spine骨骼数据
   
4. 创建预制体:
   - 新建Spine节点
   - 设置SkeletonData属性
   - 保存为prefab

路径约定:
  assets/resources/characters/hero_001/
  ├── skeleton.skel (二进制)
  ├── skeleton.atlas (纹理映射)
  └── skeleton.png (纹理集)
```

### 导入图片资源

```yaml
图片规范:
  UI图标:    512×512px, PNG格式
  背景图:    2048×2048px, 启用mipmaps
  纹理:      必须ASTC压缩格式
  
  导入设置:
    Format: ASTC (6×6)
    Mipmap: 启用
    Compress: 启用
    Max Size: 2048
```

### 导入音频

```yaml
音效规范:
  格式:      MP3 或 WAV
  比特率:    128kbps (音效) / 192kbps (背景音乐)
  采样率:    44100Hz
  
  路径:      assets/resources/sounds/
  结构:
    ├── effects/
    │   ├── punch.mp3
    │   └── explosion.mp3
    └── music/
        └── background.mp3
```

---

## 配置文件详解

### assets/resources/configs/balance.json

```json
{
  "game_version": "1.0.0",
  
  "difficulty_multiplier": {
    "easy": 0.8,
    "normal": 1.0,
    "hard": 1.2,
    "nightmare": 1.5
  },
  
  "enemy_spawn": {
    "min_level": 1,
    "max_level": 30,
    "count_per_map": [3, 5],
    "level_scaling": 1.05
  },
  
  "combat": {
    "base_atk": 50,
    "base_def": 20,
    "base_hp": 100,
    "crit_rate": 0.15,
    "crit_damage": 1.5
  },
  
  "economy": {
    "exp_per_kill": 50,
    "gold_per_kill": 100,
    "extraction_multiplier": 1.5
  }
}
```

---

## 常见问题排查

### Q1: 项目打开后黑屏

**症状**: Cocos Creator打开项目后编辑器一片黑色

**解决**:
```bash
# 清除缓存
rm -rf Library/
rm -rf .cocos-creator/

# 重新打开项目
# Cocos Creator → 文件 → 打开项目 → 选择项目目录
```

### Q2: Spine插件无法加载

**症状**: 报错 "sp.SkeletonData is undefined"

**解决**:
```bash
# 确认插件已安装
# Cocos Creator → 扩展 → 扩展管理器 → 搜索"spine"

# 或手动安装:
cd extensions
git clone https://github.com/cocos-creator/engine-spine.git spine

# 重启Cocos Creator
```

### Q3: 构建失败，提示内存不足

**症状**: "Build failed: out of memory"

**解决**:
```bash
# 增加Node.js堆内存
export NODE_OPTIONS="--max-old-space-size=4096"

# 然后重新构建
npm run build:wechat
```

### Q4: 微信开发者工具无法预览

**症状**: 选择dist文件夹后无反应

**解决**:
```bash
# 确保生成了完整的dist目录
ls -la dist/wechat-game/
# 应该看到: game.js, game.json, project.config.json

# 检查game.json格式
cat dist/wechat-game/game.json | jq .

# 更新微信开发者工具到最新版本
```

---

## 持续集成/持续部署 (CI/CD)

### GitHub Actions 配置

```yaml
# .github/workflows/build.yml
name: Build and Deploy

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: macos-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Install Node.js
      uses: actions/setup-node@v3
      with:
        node-version: 18
        cache: 'npm'
    
    - name: Install dependencies
      run: npm install
    
    - name: Run linter
      run: npm run lint
    
    - name: Run tests
      run: npm run test
    
    - name: Build WeChat game
      run: npm run build:wechat
    
    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      with:
        name: wechat-game-build
        path: dist/wechat-game/
```

---

## 第一个里程碑: M1 (概念验证)

### 目标 (Week 1-4)

```
✓ Cocos Creator项目可编译运行
✓ Spine角色模型导入并动画播放
✓ 基础搜寻UI完成
✓ 回合制战斗原型可玩
✓ 撤离倒计时逻辑完成
✓ FPS稳定 > 40 (中端设备)
✓ 内存占用 < 200MB
```

### 任务分解

```bash
Week 1:
  [ ] Day 1-2: 项目初始化 + Spine集成
  [ ] Day 3-4: GameManager + 基础场景搭建
  [ ] Day 5: 第一个角色模型导入与动画

Week 2:
  [ ] 搜寻系统原型 (地图、宝箱交互)
  [ ] 搜寻UI绘制
  
Week 3:
  [ ] 战斗系统原型 (伤害计算、技能)
  [ ] 战斗UI绘制
  
Week 4:
  [ ] 撤离系统完成
  [ ] 性能测试与优化
  [ ] Demo构建与提交
```

### 完成标志

```bash
# 可以独立运行以下命令
npm run build:wechat
cd dist/wechat-game
# 用微信开发者工具打开，能流畅玩耍一局游戏
```

---

## 文档导航

```
light-heart/
├── README.md                     (项目概述)
├── design.md                     (原始设计文档)
├── implementation-guide.md       (详细实现指南 ⭐ 推荐阅读)
├── quick-reference.md            (快速查询表)
├── TECHNICAL-DECISIONS.md        (技术决策记录)
├── PROJECT-SETUP.md              (本文件)
├── CONTRIBUTING.md               (贡献指南)
└── docs/
    ├── API.md                    (API文档)
    ├── PERFORMANCE.md            (性能优化指南)
    └── DEPLOYMENT.md             (部署指南)
```

---

## 帮助与支持

### 获取帮助

```
技术问题:
  1. 查看 quick-reference.md
  2. 搜索 GitHub Issues
  3. 提出新Issue，描述问题与复现步骤
  
美术问题:
  1. 查看 implementation-guide.md 第1章
  2. 参考 Spine官方文档: http://esotericsoftware.com
  3. 在美术讨论组提问

性能问题:
  1. 运行 npm run profile
  2. 阅读 docs/PERFORMANCE.md
  3. 创建性能Issue，附上profiling数据
```

### 团队沟通

```
同步会议:
  每周二 10:00 技术站会 (30分钟)
  每周五 14:00 设计评审 (1小时)

异步讨论:
  GitHub Discussions (设计决策)
  Slack #light-heart-dev (日常问题)
  Email (正式文档)
```

---

## 检查清单: 项目已准备好开发?

```
开发环境:
  [ ] Node.js v16+ 已安装
  [ ] Cocos Creator 3.8 已安装
  [ ] Git 已配置
  [ ] VS Code + 扩展已安装

项目结构:
  [ ] assets/ 目录完整
  [ ] game.json 正确配置
  [ ] package.json 依赖已安装
  [ ] tsconfig.json 已生成

Spine集成:
  [ ] 插件已安装
  [ ] 示例角色已导入
  [ ] 骨骼动画可播放

第一次构建:
  [ ] npm run build:wechat 成功
  [ ] dist/wechat-game/ 生成
  [ ] 微信开发者工具可预览

✅ 所有项目已完成? 开始开发!
```

---

**最后更新**: 2025年12月25日  
**下一步**: 阅读 `implementation-guide.md` 了解详细的技术规范
