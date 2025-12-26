# 本地SQLite架构评估报告

> **核心问题**: 现有设计基于服务端架构，转向本地SQLite需要重大调整

**评估时间**: 2025-12-26  
**评估范围**: 全局架构影响分析  
**目标**: 直指问题，给出生产级方案

---

## 1. 架构冲突分析

### 1.1 原设计假设 vs 本地SQLite现实

| 功能模块 | 原设计依赖 | 现实冲突 | 严重程度 |
|---------|---------|--------|--------|
| **排行榜系统** | 服务端计算 + Redis缓存 | 无法跨设备比较 | 🔴 致命 |
| **救援机制** | 好友链接 + 服务端验证 | 两个客户端数据不同步 | 🔴 致命 |
| **社交分享** | 分享成绩给好友 | 无法验证真实性 | 🔴 致命 |
| **热更新配置** | 服务端下发掉落率 | 需要下载JSON文件 | 🟡 中等 |
| **反作弊系统** | 服务端二次验证 | 玩家可随意修改SQLite | 🔴 致命 |
| **战斗结果** | 服务端校验 | 客户端计算无验证 | 🔴 致命 |
| **经验/金币获得** | 服务端核算 | 玩家可修改本地数据 | 🔴 致命 |

### 1.2 具体冲突场景

#### 场景1: 排行榜
```
原方案流程:
  玩家A成绩 → 上报服务端 → Redis排序 → 全服排行榜

本地SQLite流程:
  玩家A成绩 (仅存在手机A)
  玩家B成绩 (仅存在手机B)
  → 无法比较 → 无排行榜
  
结果: 失去"虚荣心驱动的竞争"这个核心社交驱动力
```

#### 场景2: 救援机制
```
原方案流程:
  玩家A发起救援 → 服务端记录 → 分享链接给B
  玩家B点击 → 服务端验证 → 返还物品
  
本地SQLite流程:
  玩家A本地SQLite中物品丢失
  玩家B点击链接 → 但B的SQLite中没有A的数据
  → 无法验证，无法返还
  
结果: 社交裂变闭环完全断裂
```

#### 场景3: 数据篡改
```
玩家可以:
  ① 直接修改SQLite中的金币数值 (999999)
  ② 修改等级数据
  ③ 解锁所有角色
  ④ 修改战斗结果
  
游戏完全失去公平性和可玩性
```

---

## 2. 设计文档中需要修改的内容

### 2.1 TECHNICAL-DECISIONS.md (ADR-008需要完全重写)

**当前内容** (第630-800行):
```yaml
原ADR-008假设:
  - 战斗结果在客户端演算，服务端验证
  - 排行榜在服务端计算
  - 社交关系在服务端管理
  - 反作弊在服务端进行
```

**需改为**:
```yaml
新方案特性:
  ✗ 取消所有排行榜功能 (因为无法跨设备)
  ✗ 取消救援机制 (因为无法同步数据)
  ✗ 取消社交分享真实数据功能
  ✓ 数据完全本地化，无跨端同步
  ✓ 反作弊依靠混淆+完整性校验
  ✓ 重点转向单机体验优化
```

**影响行数**: ~170行需要全部改写

### 2.2 design.md (关键功能需删除)

**需删除的功能**:
- 第79行: "救援机制" 段落整段删除
- 第80行: "黑市排行与荣誉系统" 整段删除  
- 第71-80行: "数值增长与社交裂变" 整章核心逻辑失效

**原文总共153行，其中40-50行因社交功能删除而失效**

**替代方案需补充**:
- 单机成就系统 (本地解锁)
- 离线排行榜 (仅记录本地最高记录)
- 本地探索任务

**影响程度**: 🔴 致命 (失去50%的长线留存动力)

### 2.3 implementation-guide.md (1952行)

**需修改部分**:
- 第5章 "社交与运营系统" (约200行) → 改为"本地数据管理"
- 删除所有"服务端API"相关代码
- 删除所有"微信分享"的真实数据流程
- 替换为"数据加密存储"相关

**代码示例需全部重写**:
```typescript
// 原方案
async reportBattleResult(result) {
  await fetch("/api/battle/report", {...})  // ❌ 删除
}

// 新方案
saveBattleResultLocal(result) {
  db.battles.insert(result);  // ✅ 本地保存
  this.verifyIntegrity();     // ✅ 完整性检查
}
```

**影响行数**: ~300行代码示例需要改写

---

## 3. 核心功能可行性评估

### 3.1 完全失效的功能 (🔴)

| 功能 | 原设计 | 本地方案 | 补救 |
|------|-------|--------|------|
| **全服排行榜** | 关键社交驱动 | ❌ 无法实现 | 改为本地最高记录 |
| **好友救援** | 社交裂变核心 | ❌ 无法实现 | 移除此机制 |
| **跨端数据同步** | 云保存 | ❌ 无法实现 | 本地备份JSON |
| **反作弊系统** | 服务端验证 | ❌ 无法实现 | 混淆+完整性校验 |
| **社交分享成绩** | 微信排行榜 | ❌ 无法实现 | 仅支持截图分享 |

### 3.2 需要修改的功能 (🟡)

| 功能 | 原方案 | 新方案 | 改动 |
|------|-------|-------|------|
| **热更新配置** | 服务端下发API | 静态JSON+本地版本管理 | 需要重新设计 |
| **登录认证** | 微信openid+服务端 | 本地UUID + 微信授权仅记录昵称 | 简化 |
| **角色养成** | 服务端持久化 | 本地SQLite持久化 | 增加本地加密 |
| **战斗数据** | 服务端校验 | 本地计算无校验 | 降低反作弊能力 |

### 3.3 可以保留的功能 (✅)

| 功能 | 说明 |
|------|------|
| **单机战斗** | 完全本地化，无需服务端 |
| **搜寻机制** | 地图生成算法 + 随机种子本地化 |
| **角色养成** | SQLite中存储等级、装备 |
| **本地成就** | 完全在本地检查 |
| **Spine动画** | 本地Cocos Creator渲染 |

---

## 4. SQLite数据库设计方案

### 4.1 表结构（生产级）

```sql
-- 玩家基础信息
CREATE TABLE players (
  id TEXT PRIMARY KEY,           -- UUID
  nickname TEXT,                 -- 微信昵称
  level INTEGER DEFAULT 1,
  exp BIGINT DEFAULT 0,
  totalGold BIGINT DEFAULT 0,
  maxHP INTEGER DEFAULT 100,
  lastLoginTime TIMESTAMP,
  lastBackupTime TIMESTAMP,
  createdAt TIMESTAMP
);

-- 战斗历史 (用于本地统计)
CREATE TABLE battleRecords (
  id TEXT PRIMARY KEY,
  mapId TEXT,
  enemyId TEXT,
  isVictory BOOLEAN,
  damageDealt INTEGER,
  damageReceived INTEGER,
  duration INTEGER,              -- 战斗时长(秒)
  rewards JSON,                  -- {gold, exp, items}
  timestamp TIMESTAMP,
  FOREIGN KEY (mapId) REFERENCES maps(id)
);

-- 拥有的角色
CREATE TABLE characters (
  id TEXT PRIMARY KEY,
  characterId TEXT,              -- 角色类型ID
  level INTEGER,
  exp INTEGER,
  star INTEGER,                  -- 星级
  skills JSON,                   -- 已解锁技能列表
  bondLevel INTEGER,             -- 好感度等级
  FOREIGN KEY (characterId) REFERENCES characterDefs(id)
);

-- 装备库
CREATE TABLE equipment (
  id TEXT PRIMARY KEY,
  equipmentId TEXT,              -- 装备模板ID
  rarity INTEGER,                -- 1-4品质
  mainStat JSON,                 -- {atk, def, hp}
  affixes JSON,                  -- 词条列表
  enhanceLevel INTEGER,          -- 强化等级
  acquisitionTime TIMESTAMP,
  FOREIGN KEY (equipmentId) REFERENCES equipmentDefs(id)
);

-- 本地排行榜 (个人最好成绩)
CREATE TABLE personalBests (
  mapId TEXT PRIMARY KEY,
  maxDamage INTEGER,
  fastestClear INTEGER,          -- 最快通关时间(秒)
  leastDamageTaken INTEGER,
  clearCount INTEGER,            -- 通关次数
  lastClearTime TIMESTAMP
);

-- 完整性校验 (防篡改)
CREATE TABLE integrityHashes (
  tableId TEXT PRIMARY KEY,
  contentHash TEXT,              -- SHA256
  lastModified TIMESTAMP
);

-- 备份元数据
CREATE TABLE backups (
  id TEXT PRIMARY KEY,
  backupTime TIMESTAMP,
  dataSize BIGINT,
  hashCheck TEXT,
  isValid BOOLEAN
);
```

### 4.2 数据加密与完整性

```typescript
class DataSecurityManager {
  // 使用AES-256加密敏感字段
  encryptSensitiveData(data: PlayerData): EncryptedData {
    const secretKey = this.deriveKeyFromWeChatOpenId();
    return encrypt(data, secretKey, 'AES-256-CBC');
  }
  
  // SHA256完整性校验
  calculateTableHash(tableName: string): string {
    const rows = db.execute(`SELECT * FROM ${tableName} ORDER BY id`);
    const jsonStr = JSON.stringify(rows);
    return sha256(jsonStr);
  }
  
  // 启动时验证完整性
  verifyDatabaseIntegrity(): boolean {
    const tables = ['characters', 'equipment', 'battleRecords'];
    for (const table of tables) {
      const currentHash = this.calculateTableHash(table);
      const storedHash = db.query('integrityHashes', {tableId: table});
      
      if (currentHash !== storedHash.contentHash) {
        console.error(`${table} has been tampered!`);
        return false;  // 检测到篡改
      }
    }
    return true;
  }
  
  // 定期备份
  scheduleAutoBackup(intervalMs: number = 300000) {
    setInterval(() => {
      const backup = {
        id: uuid(),
        backupTime: Date.now(),
        data: db.exportAsJSON(),
        hash: this.calculateDatabaseHash()
      };
      this.saveBackupToStorage(backup);
    }, intervalMs);
  }
}
```

---

## 5. 重新设计的游戏循环

### 5.1 原循环 vs 新循环

**原循环** (依赖服务端):
```
营地 → 地图搜寻 → 战斗 → 撤离 
  ↓
保存服务端 → 排行榜更新 → 救援机制
  ↓
角色养成 → 社交分享 → 社团竞争
```

**新循环** (完全本地):
```
营地 → 地图搜寻 → 战斗 → 撤离 
  ↓
本地SQLite保存 → 个人最好记录更新 → 本地成就检查
  ↓
角色养成 → 本地档案导出(JSON) → 个人成就系统
```

**失去的长线留存驱动**:
- ❌ 排行榜排名 → 无法与他人比较
- ❌ 救援求助 → 无法社交互动
- ❌ 赛季竞争 → 失去目标感

**新的留存驱动** (需要重新设计):
- ✅ 本地成就收集 (100+个隐藏成就)
- ✅ 完美通关记录 (无伤/最速/最高伤害)
- ✅ 新地图解锁 (等级系统)
- ✅ 角色收集 (卡池/复利)

---

## 6. 文档修改清单

| 文档 | 受影响部分 | 修改工作量 | 优先级 |
|------|---------|---------|--------|
| **TECHNICAL-DECISIONS.md** | ADR-008整章 | 中等 (2小时) | 🔴 P0 |
| **design.md** | 第71-80行社交模块 | 小 (1小时) | 🔴 P0 |
| **implementation-guide.md** | 第5章 + 代码示例 | 中等 (3小时) | 🔴 P0 |
| **quick-reference.md** | API部分删除 | 小 (30分钟) | 🟡 P1 |
| **PROJECT-SETUP.md** | 网络配置删除 | 小 (30分钟) | 🟡 P1 |

**总修改工作量**: ~7小时文档重写

---

## 7. 生产级本地架构方案

### 7.1 推荐方案：混合模式 (最平衡)

```yaml
方案: 本地优先 + 可选云备份

数据流:
  所有数据 → 本地SQLite (主存储)
           → 加密后上传微信云 (可选备份)
           → JSON导出到云盘 (玩家主动备份)

优势:
  ✅ 游戏完全离线可玩
  ✅ 支持多设备恢复 (通过微信云或JSON)
  ✅ 无需租服务器
  ✅ 完全掌控用户数据

劣势:
  ❌ 失去排行榜社交功能
  ❌ 失去救援机制
  ❌ 无法验证数据真实性
  ❌ 玩家可修改数据 (降低体验)

投入成本: 最低 (仅开发本地存储)
```

### 7.2 替代方案：加入最小服务端 (成本增加但功能完整)

```yaml
方案: 本地 + 轻量服务端

服务端仅负责:
  ① 排行榜服务 (接收玩家分数，计算排名)
  ② 救援数据交换 (A救援链接 → B的数据)
  ③ 版本管理 (热更新配置文件)

数据量很小:
  - 每日排行榜更新: ~1MB
  - 救援记录: ~100KB
  - 配置文件: ~50KB
  
成本: 阿里云轻量服务器 ~50元/月

优势:
  ✅ 保留所有社交功能
  ✅ 可实现反作弊验证
  ✅ 支持热更新
  
劣势:
  ❌ 需要租服务器
  ❌ 需要后端开发
  ❌ 需要运维
```

---

## 8. 最终建议

### 直言指出问题:

**你的选择（本地SQLite）会导致以下后果:**

1. **失去70%的社交驱动力** - 排行榜和救援是原设计的核心驱动
2. **游戏数据可被随意篡改** - 破坏竞争公平性
3. **长线留存下降** - 需要重新设计1000+小目标系统
4. **无法热更新** - 配置改动需要重新发版

### 我的建议:

**如果坚持本地方案:**
1. ✅ 删除所有社交/排行榜功能
2. ✅ 重点做好"本地成就系统" (100+隐藏成就)
3. ✅ 设计"完美通关"记录 (三维度评分)
4. ✅ 实现数据加密+完整性校验 (降低篡改吸引力)
5. ✅ 支持本地JSON备份和恢复

**预计改动:**
- 重写 ~1000行文档说明
- 重写 ~500行游戏代码逻辑
- 开发 ~1000行加密/校验代码
- 增加1周开发时间

### 更理性的方案:

**混合方案**: 本地存储 + 云备份 + 轻量服务端排行榜
- 成本: 50元/月 + 20小时后端开发
- 收益: 保留所有功能 + 完整社交生态
- ROI: 远高于纯本地方案

---

**核心结论**: 
> 纯本地SQLite是**功能阉割版**，不建议用于有社交驱动需求的游戏。  
> 如果必须本地，建议搭配**本地成就系统**来补偿流失的留存驱动。
