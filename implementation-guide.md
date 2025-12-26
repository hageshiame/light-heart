# 光遇美术风格融合"搜打撤"微信小游戏：生产级落地方案

## 目录
1. [美术风格系统详解](#1-美术风格系统详解)
2. [核心玩法模块开发规范](#2-核心玩法模块开发规范)
3. [技术架构与性能优化](#3-技术架构与性能优化)
4. [数值系统设计](#4-数值系统设计)
5. [社交与运营系统](#5-社交与运营系统)
6. [研发里程碑与交付清单](#6-研发里程碑与交付清单)
7. [风险管理与应急方案](#7-风险管理与应急方案)

---

## 1. 美术风格系统详解

### 1.1 光遇美术风格的核心特质提炼

光遇（Sky: Children of the Light）的美术设计是本项目的视觉灵魂。其核心特质包括：

| 维度 | 光遇特质 | 技术实现 | 质量标准 |
|------|---------|--------|--------|
| **色彩体系** | 高饱和度、柔和渐变、金色/白色/蓝色主调 | HSV饱和度70-85%，明度55-75% | RGB三通道均衡，避免纯黑纯白 |
| **光影设计** | 逆光为主、环境光温暖、粒子光晕 | 实时定向光+环境光，粒子加法混合 | 50%以上的视觉焦点需要光影强化 |
| **几何语言** | 简洁有机、流畅曲线、自然形态 | 骨骼少于60根、控制点密度 | 贝塞尔曲线光滑度 > 0.95 |
| **动画韵律** | 缓动曲线柔和、有重心转移、自然延迟 | 使用Ease-Out-Cubic、超前期与滞后期 | 关键帧间距不超过6帧@30FPS |
| **氛围渲染** | 雾气特效、粒子漫散、天气动态变化 | 前向雾化+后处理叠加、粒子预制 | 透视深度 > 5层 |

### 1.2 角色立绘与Spine骨骼动画规范

#### 1.2.1 立绘创作标准

```yaml
技术规格:
  尺寸: 2048×2048px (UI)
  色彩空间: sRGB
  导出格式: PNG (透明背景)
  DPI: 72
  
美学规范:
  眼睛特效: 
    - 瞳孔应有2个高光点（逆光效果）
    - 内眼角应有冷色光（蓝色或紫色），外眼角暖色光（黄色或白色）
    - 虹膜应使用细微纹理增加真实感
  
  衣物质感:
    - 丝绸：使用高光层表现光泽，避免过多细节
    - 棉麻：保留布料纹理但柔和处理
    - 皮革：深色材质配合高光强化，凸显张力
  
  肤色处理:
    - 基础色使用HSV: H 15-25°, S 25-40%, V 65-80%
    - 阴影色：降低明度15-20%，提升饱和度5-10%
    - 高光色：使用#FFF0E6（温白色）作为最亮点
  
  整体光影:
    - 主光源方向：左上45°，角度约为60-70°
    - 环境光强度：主光照的30-40%
    - 反光强度：主光照的20-25%
```

#### 1.2.2 Spine骨骼设置规范

```
骨骼约束（严格执行）:
  总骨骼数: ≤ 55根（预留5根缓冲）
  
骨骼层级示例（站立模式）:
  Root（根骨骼，位于脚底中心）
  ├─ Hips（腰部）
  │   ├─ Chest（胸部）
  │   │   ├─ Neck（脖子）
  │   │   │   └─ Head（头部，含6根面部骨骼）
  │   │   ├─ ShoulderL/R（左右肩膀）
  │   │   │   └─ ArmL/R → ForearmL/R → HandL/R（3+3+2=8根）
  │   │   └─ BreatheChest（呼吸动作，可选）
  │   └─ Pelvis（骨盆，含裙摆/斗篷专用6根）
  └─ LegL/R → CalfL/R → FootL/R（3+3+2=8根）
  
  总计: 1+1+1+1+6+2+1+8+6+8 = 35根（基础）
  补充: 发丝动作5根、特殊道具3根、备用骨骼12根 = 55根

动画关键帧规范:
  帧率: 30 FPS（微信小游戏标准）
  待机动画: 3-5秒循环，包含呼吸感（胸部0.5cm上下）
  移动动画: 步长0.3m（相对骨盆高度），跨度4帧
  攻击动画: 0.3-0.5秒爆发，0.2-0.3秒缓冲恢复
  受击动画: 0.15秒往返，带身体晃动感
```

#### 1.2.3 Spine导出与优化流程

```
导出检查清单:
  ① 使用Spine 4.1+专业版的Binary导出（.skel + .atlas）
  ② 纹理尺寸: 2048×2048 推荐，最大不超4096×4096
  ③ ASTC压缩: 启用ASTC 6×6（压缩率8:1）
  ④ 纹理打包: 合并同一角色的所有纹理到单一Atlas
  ⑤ 骨骼优化: 使用Spine内置的骨骼优化器，目标精度0.01
  
Cocos Creator集成:
  import com.esotericsoftware.spine.*;
  
  // 资源路径约定
  assets/resources/characters/{character_id}/
  ├── skeleton.skel（二进制骨骼）
  ├── skeleton.atlas（纹理映射）
  └── skeleton.png（纹理集合）
  
  // 加载代码示例
  const skeletonData = cc.loader.getRes(`characters/${characterId}/skeleton`);
  const skeletonRenderer = this.node.addComponent(sp.SkeletonData);
  skeletonRenderer.skeletonData = skeletonData;
```

### 1.3 环境美术与场景设计

#### 1.3.1 场景色调与光影系统

```yaml
时间周期（日-夜循环，180秒完整周期）:
  日间（0-60s）:
    主光源: 方向(30°, 70°)，强度1.0，色温#FFF8DC
    环境光: 色彩#87CEEB（天蓝），强度0.4
    雾效: 远近范围(20m, 100m)，色彩与天空匹配
  
  黄昏（60-90s）:
    主光源: 方向(45°, 45°)，强度1.2，色温#FFB347（暖橙）
    环境光: 色彩#FF6347（深红），强度0.35
    雾效: 范围(25m, 80m)，增加橙色成分
  
  夜间（90-180s）:
    主光源: 方向(90°, 30°)，强度0.6，色温#4169E1（皇家蓝）
    环境光: 色彩#191970（午夜蓝），强度0.2
    特殊效果: 星空粒子系统（50-100个实例），萤火虫（5-10个）

天气系统（可随机触发）:
  晴朗: 无干扰，可见度最大
  多云: 添加云层贴图动画，降低亮度15%
  阴雨: 后处理效果（降饱和度20%，降亮度25%），添加雨滴粒子
  雷暴: 闪电光影变化（亮度脉冲0→1→0，周期0.1s），雨幕浓度提升
  
  性能约束:
    - 天气粒子实例数: ≤ 150
    - 后处理层数: ≤ 3
    - 动态光源数: ≤ 2（主光+环境光）
```

#### 1.3.2 地图分层设计

```
地图结构（赛璐璐风格cel-shading实现）:
  
  后景层（背景，静态）:
    ├─ 天空盒或天空纹理（Skybox或大幅背景图）
    └─ 远山/远景（低精度，可选）
    GPU成本: ≤ 5% 总容量
  
  地形层（核心地表）:
    ├─ 基础地形网格（预先烘焙高度图）
    ├─ 可交互物件：宝箱、文本提示、光效标记
    └─ 装饰物：树木、石头、灯笼等
    GPU成本: 35-45% 总容量
    物理碰撞: 简化凸包，避免逐三角形碰撞
  
  中景层（玩家与敌人）:
    ├─ 玩家角色（1个Spine骨骼体，✓实时光影计算）
    ├─ 队友（最多3个，✓简化光影）
    └─ 敌人（最多5个同屏，循环池管理）
    GPU成本: 25-35% 总容量
  
  前景层（UI与特效）:
    ├─ 战斗浮伤害数字（TextMesh）
    ├─ 状态图标（BuffIcon, DebuffIcon）
    ├─ 粒子特效（爆炸、治疗、暴击等，预制对象池）
    └─ 屏幕后处理（色差、扫描线等）
    GPU成本: 15-20% 总容量
  
  总体约束:
    - 三角形面数: ≤ 150K（中端设备）
    - DrawCall: ≤ 80
    - 显存: ≤ 256MB（纹理+顶点数据）
```

### 1.4 UI设计系统（关键补充）

#### 1.4.1 UI设计语言

```yaml
色彩体系:
  主色调: #F4D03F（金色，用于强调与按钮）
  辅助色: #87CEEB（天蓝，用于友好信息）
  警告色: #E74C3C（红色，用于危险/倒计时）
  中性色: #34495E（深灰，用于文本）
  背景色: #ECF0F1（浅灰，低优先级背景）

排版规范:
  标题字号: 36px（Pixiv风格手书体）
  正文字号: 20px（清晰可读）
  辅助文本: 16px（灰色 #7F8C8D）
  
  字体推荐:
    - 中文: 微信官方字体（默认）或"思源黑体 Bold"
    - 英文: "Poppins Bold" 或 "Arial Bold"
    
  行高: 1.5倍字号
  字间距: 0.05em

组件规范:
  按钮:
    大小: 120×50px（常规）
    圆角: 8px
    边框: 2px, 色彩 #F4D03F
    字色: 白色 #FFFFFF
    悬停: 缩放1.05x，边框加粗3px，触发音效
    按下: 缩放0.95x，背景变深
  
  输入框:
    高度: 40px
    圆角: 4px
    边框: 1px, 色彩 #BDC3C7
    内边距: 10px
    焦点: 边框变为 #F4D03F，阴影 0 0 8px rgba(244,208,63,0.3)
  
  对话框:
    阴影: 0 8px 32px rgba(0,0,0,0.2)
    圆角: 12px
    背景: 白色 #FFFFFF，透明度95%
    标题: 使用#F4D03F 分割线
    按钮间距: 10px
    
  加载条（ProgressBar）:
    高度: 8px
    背景: #ECF0F1
    填充色: 渐变 #87CEEB → #F4D03F
    圆角: 4px
    动画: 线性填充，无过冲
```

#### 1.4.2 UI流程图与交互规范

```
屏幕流（Screen Flow）:

启动 → 登录/注册 → 营地主界面
                ├─ 角色卡片展示（水平滚动）
                ├─ 快速开始按钮
                ├─ 背包查看
                ├─ 社交/排行榜
                └─ 设置菜单

进入地图 → 搜寻阶段
        ├─ 地图HUD: 生命值/能量条、倒计时、小地图
        ├─ 宝箱发现 → 开箱弹窗（华丽Spine动画）
        └─ 遭遇敌人 → 战斗界面

战斗系统 UI:
  ├─ 上方: 敌人血条 + 等级 + 名字
  ├─ 左下: 己方血条 + 能量条 + 状态图标
  ├─ 右下: 技能按钮排列（1-3个）
  ├─ 中央: 战斗动画区域（透明化UI）
  └─ 实时伤害数字（浮起动画）

撤离阶段 UI:
  ├─ 屏幕中央: 大号倒计时器（60秒 → 0）
  ├─ 地图标记: 撤离点位（闪烁指引）
  ├─ 获得物资列表（右侧滑出）
  └─ 危险警告（敌人靠近时闪红）

交互约定:
  - 所有按钮需要视觉反馈（缩放/变色/音效三层）
  - 长按操作（>0.5s）需要进度条反馈
  - 数值变化需要飘字或进度条动画
  - 重要提示使用红色/橙色 + 音效 + 震动反馈
```

---

## 2. 核心玩法模块开发规范

### 2.1 搜寻系统（Search Phase）

#### 2.1.1 地图交互物件分类

```typescript
// 物件基类（BaseLootable）
class BaseLootable extends cc.Component {
  // 物件ID和类型
  lootId: string;
  lootType: "chest" | "debris" | "npc" | "event";
  
  // 品质等级 (1=普通绿, 2=稀有蓝, 3=史诗紫, 4=传奇金)
  rarity: number;
  
  // 搜寻难度 (1-10，影响搜寻时间)
  difficulty: number;
  
  // 视觉表现
  glowEffect: sp.SkeletonAnimation;  // Spine动画
  highlightColor: cc.Color;
  particleSystem: cc.ParticleSystem;
  
  // 交互逻辑
  onSearchStart(): void { /* 开启搜寻动画 */ }
  onSearchComplete(): object { /* 返回战利品数据 */ }
  onSearch Cancel(): void { /* 取消搜寻恢复状态 */ }
}

// 宝箱子类
class ChestLootable extends BaseLootable {
  constructor(chestType: "woodenChest" | "metalChest" | "glowChest") {
    super();
    // 不同宝箱有不同的搜寻时间 (15-45s)
    this.difficulty = chestType === "glowChest" ? 8 : 3;
  }
  
  onSearchComplete(): object {
    // 根据品质随机返回物品
    const items = this.rollItems(this.rarity);
    this.playOpenAnimation();  // Spine动画：宝箱打开 + 光效
    return { items, exp: 50 * this.rarity, gold: 100 * this.rarity };
  }
}

// NPC交互类
class NPCLootable extends BaseLootable {
  dialogueId: string;
  dialogueChoices: Array<{ text: string, reward: object, consequence: string }>;
  
  onSearch Complete(): object {
    // 触发对话系统，返回选择结果
    this.showDialogue(this.dialogueId);
    return this.currentChoice?.reward || {};
  }
}
```

#### 2.1.2 搜寻奖励表（Config-Driven）

```yaml
# 配置文件: assets/resources/configs/loot-tables.json

{
  "loot_chest_rarity_1": {
    "items": [
      { "itemId": "potion_hp", "weight": 40, "count": [1, 3] },
      { "itemId": "gold_coin", "weight": 50, "count": [10, 30] },
      { "itemId": "crafting_material_common", "weight": 10, "count": [1, 2] }
    ],
    "exp": 50,
    "lootCertificate": { "points": 5, "tier": 1 }
  },
  
  "loot_chest_rarity_4": {
    "items": [
      { "itemId": "legendary_armor_part", "weight": 5, "count": [1, 1] },
      { "itemId": "hero_shard", "weight": 30, "count": [5, 15] },
      { "itemId": "crafting_material_epic", "weight": 65, "count": [2, 5] }
    ],
    "exp": 500,
    "lootCertificate": { "points": 50, "tier": 4 }
  }
}
```

#### 2.1.3 搜寻UI与提示系统

```typescript
class SearchUI extends cc.Component {
  // 搜寻进度条
  progressBar: cc.ProgressBar;
  searchTimeRemaining: cc.Label;
  
  // 浮动提示
  searchHintPrefab: cc.Prefab;
  
  onShow(lootable: BaseLootable): void {
    // 显示搜寻界面
    const searchTime = this.calculateSearchTime(lootable.difficulty);
    this.progressBar.progress = 0;
    
    // 动画：进度条填充 + 倒计时数字
    cc.tween(this.progressBar)
      .to(searchTime, { progress: 1 })
      .call(() => this.onSearchSuccess())
      .start();
  }
  
  onSearchCancel(): void {
    // 中止搜寻，显示警告
    this.showWarning("搜寻已取消，物品遗失！");
    this.progressBar.progress = 0;
  }
}
```

### 2.2 战斗系统（Fight Phase）

#### 2.2.1 战斗引擎架构

```typescript
// 抽象战斗单位
abstract class BattleUnit {
  unitId: string;
  isPlayer: boolean;
  
  // 基础属性
  stats: {
    hp: number;
    maxHp: number;
    atk: number;
    def: number;
    spd: number;  // 速度决定行动顺序
    element: "fire" | "water" | "earth" | "wind" | "light" | "dark";
  };
  
  // 状态管理
  buffs: Array<{ type: string, duration: number, value: number }>;
  debuffs: Array<{ type: string, duration: number }>;
  isAlive: boolean;
  
  // 动画与视觉
  skeletonAnimator: sp.SkeletonAnimation;
  damageNumbers: Array<DamageNumber>;  // 浮伤数字池
  
  // 核心行为
  abstract selectAction(): Action;
  executeDamage(damage: number, isSkill: boolean = false): void {
    const actualDamage = this.calculateDamage(damage, isSkill);
    this.hp -= actualDamage;
    this.showDamageNumber(actualDamage);
    this.playDamagedAnimation();
  }
  
  private calculateDamage(baseDamage: number, isSkill: boolean): number {
    // 伤害计算公式
    let defenseReduction = this.stats.def / (this.stats.def + 100);
    let skillMultiplier = isSkill ? 1.5 : 1.0;
    return baseDamage * skillMultiplier * defenseReduction;
  }
}

class PlayerBattleUnit extends BattleUnit {
  skills: Skill[];
  selectAction(): Action {
    // 等待玩家输入
    return this.waitForPlayerInput();
  }
}

class EnemyBattleUnit extends BattleUnit {
  selectAction(): Action {
    // AI决策：评估玩家生命值、自身生命值，选择最优行动
    return this.aiDecisionTree();
  }
}
```

#### 2.2.2 技能系统详细设计

```yaml
技能配置示例:

skill_normal_attack:
  id: "normal_attack"
  name: "普通攻击"
  type: "physical"
  cooldown: 0  # 秒
  energyCost: 0
  
  # 伤害计算
  formula:
    base: 100
    scaling: { atk: 0.8 }  # 攻击力的80%
  
  # 命中率与暴击
  accuracy: 1.0  # 100%必中
  critRate: 0.15  # 15%暴击率
  critDamage: 1.5  # 暴击伤害倍数
  
  # 动画与特效
  animationName: "attack_punch"  # Spine动画名称
  animationSpeed: 1.2
  damageFrameIndex: 8  # 第8帧时应用伤害（帧同步）
  
  vfxPrefab: "effects/normal_attack"
  sfxClip: "sounds/punch"
  
  # 范围与目标
  range: "melee"  # melee / ranged / aoe
  targetCount: 1
  
  # 特殊效果
  effects:
    - type: "knockback"
      distance: 0.5  # 米
      duration: 0.3  # 秒

skill_ultimate_power:
  id: "ultimate_power"
  name: "终极奥义"
  type: "magical"
  cooldown: 6
  energyCost: 100  # 需要满能量条
  
  formula:
    base: 250
    scaling: { atk: 1.5, element_bonus: 1.2 }
  
  accuracy: 0.95
  critRate: 0.35
  critDamage: 2.0
  
  animationName: "ultimate_charge_and_release"
  animationSpeed: 1.5
  damageFrameIndex: 16
  
  vfxPrefab: "effects/ultimate_energy_burst"
  sfxClip: "sounds/ultimate_blast"
  
  # 蓄力机制
  channelTime: 1.0  # 需要蓄力1秒
  
  range: "aoe"
  targetCount: 3  # 最多打3个敌人
  aoeRadius: 3.0  # 3米半径
  
  effects:
    - type: "stun"
      duration: 2.0
    - type: "armor_break"
      defenseReduction: 30
      duration: 3.0
```

#### 2.2.3 属性克制系统（元素三角关系）

```
属性克制关系:

      火 (Fire)
     / \
    /   \
   暗     风
  / \   / \
 光  土 水  
  \ / \ /
   \   /
    光 (Light)

克制表:
  火 > 风 > 水 > 火       (物理循环)
  光 > 暗 > 光            (魔法循环)
  土 > 通用 (+20% 防御)
  
伤害修正系数:
  克制:   1.2x
  被克制: 0.8x
  无关:   1.0x

示例伤害计算:
  BaseDamage = 100
  如果 攻击方=火 且 防守方=风:
    FinalDamage = 100 * 1.2 * (防御减免) = 约96 伤害
  
  如果 攻击方=火 且 防守方=水:
    FinalDamage = 100 * 0.8 * (防御减免) = 约64 伤害
```

#### 2.2.4 战斗流程编排（Turn-Based 模式简化）

```typescript
class BattleManager extends cc.Component {
  playerUnit: PlayerBattleUnit;
  enemies: EnemyBattleUnit[];
  
  turnOrder: BattleUnit[];
  currentTurnIndex: number = 0;
  
  async startBattle(): Promise<"win" | "lose" | "flee"> {
    // 初始化战斗
    this.calculateTurnOrder();  // 根据 SPD 属性排序
    
    while (this.isBattleActive()) {
      const currentUnit = this.turnOrder[this.currentTurnIndex];
      const action = currentUnit.selectAction();
      
      // 执行行动
      await this.executeAction(action, currentUnit);
      
      // 检查游戏结束
      if (!this.playerUnit.isAlive) return "lose";
      if (this.enemies.every(e => !e.isAlive)) return "win";
      
      // 回合进行
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
      await this.waitForAnimationComplete();  // 等待动画完成
    }
  }
  
  private async executeAction(action: Action, actor: BattleUnit): Promise<void> {
    // 播放动画
    await actor.skeletonAnimator.setAnimation(0, action.animationName, false);
    
    // 在指定帧应用伤害
    setTimeout(() => {
      action.targets.forEach(target => {
        target.executeDamage(action.damage, action.isSkill);
      });
    }, action.damageFrameIndex * (1000 / 30));  // 帧 → 毫秒
    
    // 等待动画结束
    await new Promise(resolve => {
      const handler = () => {
        actor.skeletonAnimator.setCompleteListener(() => resolve());
      };
      handler();
    });
  }
}
```

### 2.3 撤离系统（Extract Phase）

#### 2.3.1 撤离点设计

```typescript
class ExtractionPoint {
  pointId: string;
  position: cc.Vec2;
  
  // 动态性：每局随机出现2-3个撤离点
  isActive: boolean;
  activationTime: number;  // 游戏开局后出现的时刻（秒）
  
  // 危险等级（靠近敌人出生点的撤离点危险度高）
  dangerLevel: 1 | 2 | 3;  // 1=安全, 3=极危险
  
  // 撤离动画与特效
  glowEffect: cc.ParticleSystem;
  countdownLabel: cc.Label;
  
  // 撤离过程
  async startExtraction(player: PlayerBattleUnit): Promise<boolean> {
    const extractionTime = 5.0;  // 秒（需要站在撤离点持续5秒）
    let timeElapsed = 0;
    
    // 每帧检测玩家是否仍在撤离点范围内
    while (timeElapsed < extractionTime) {
      if (!this.isPlayerInRange(player)) {
        return false;  // 撤离中断
      }
      
      timeElapsed += cc.game.deltaTime;
      this.updateCountdown(extractionTime - timeElapsed);
      
      await cc.asyncTimeout(0.1);
    }
    
    // 撤离成功
    this.playExtractionAnimation(player);
    return true;
  }
}
```

#### 2.3.2 撤离倒计时与地图视觉反馈

```yaml
撤离阶段时间线:

0-60s: 地图搜寻期
  - 撤离点未激活（隐藏）
  - 玩家可自由搜寻
  
60s: 撤离点激活
  - 屏幕中央闪现"撤离点已激活！"提示
  - 地图上显示 2-3 个撤离点（闪烁光效）
  - 播放警报音效
  
60-80s: 撤离期
  - 倒计时器显示剩余时间（20秒）
  - 靠近敌人生成点时屏幕红色警告闪烁
  - 敌人开始向撤离点集结（AI寻路）
  
80-90s: 最后冲刺
  - 倒计时变为红色，音效加速
  - 屏幕边缘显示"危险区域"指示
  - 玩家速度提升 +30%（自动增益）
  
90s+: 强制提取
  - 玩家被强制传送回营地（无论是否到达撤离点）
  - 若玩家未到达撤离点，物品丢失
  - 游戏结束，返回营地

视觉效果技术实现:
  倒计时器:
    大小: 200×200px
    位置: 屏幕右上角
    字体: 72px, 颜色从金色(#F4D03F) 过渡到红色(#E74C3C)
    动画: 每秒闪烁一次（当剩余<10s时）
  
  地图标记:
    撤离点: 圆形脉冲光效，半径20px，颜色 #F4D03F
    安全区域: 绿色柔光圆，逐秒缩小（模拟"毒圈"概念）
  
  屏幕后处理:
    危险警告: 红色边框蚕食动画（Vignette效果）
    加速感: 视场角(FOV)轻微变化，制造冲刺感
```

### 2.4 建造系统（Build Phase - 局外）

```typescript
class UpgradeSystem {
  // 角色升级
  upgradeCharacter(characterId: string, materials: Material[]): void {
    const character = this.getCharacter(characterId);
    character.level += 1;
    
    // 属性加成公式：指数型增长
    const levelBonus = 1.05;  // 每级 +5%
    character.stats.atk *= Math.pow(levelBonus, 1);
    character.stats.def *= Math.pow(levelBonus, 1);
    character.stats.maxHp *= Math.pow(levelBonus, 1.2);  // HP增长更快
    
    // 解锁新技能
    if (character.level % 5 === 0) {
      character.unlockedSkills.push(this.generateNewSkill());
    }
  }
  
  // 装备强化
  enhanceEquipment(equipment: Equipment, materials: Material[]): Equipment {
    equipment.enhanceLevel += 1;
    equipment.mainStat *= 1.08;  // 每强化一级 +8%
    
    // 副词条（词条池）概率性增加
    if (Math.random() < 0.3) {  // 30% 概率获得新词条
      const newAffix = this.rollAffix();
      equipment.affixes.push(newAffix);
    }
    
    return equipment;
  }
}
```

---

## 3. 技术架构与性能优化

### 3.1 项目初始化与工程结构

```
light-heart/
├── assets/
│   ├── resources/          # 资源目录（热更新）
│   │   ├── characters/     # 角色Spine资源
│   │   │   ├── character_001/
│   │   │   │   ├── skeleton.skel
│   │   │   │   ├── skeleton.atlas
│   │   │   │   └── skeleton.png
│   │   │   └── ...
│   │   ├── scenes/         # 场景地图
│   │   ├── prefabs/        # 预制体
│   │   ├── materials/      # 材质
│   │   ├── configs/        # 数值配置JSON
│   │   │   ├── loot-tables.json
│   │   │   ├── skills.json
│   │   │   ├── monsters.json
│   │   │   └── balance.json
│   │   ├── sounds/         # 音效与背景音乐
│   │   └── images/         # UI图片与背景
│   ├── scripts/            # TypeScript源代码
│   │   ├── managers/       # 全局管理器
│   │   │   ├── GameManager.ts
│   │   │   ├── BattleManager.ts
│   │   │   ├── PlayerManager.ts
│   │   │   └── AudioManager.ts
│   │   ├── systems/        # 游戏系统
│   │   │   ├── SearchSystem.ts
│   │   │   ├── BattleSystem.ts
│   │   │   ├── ExtractSystem.ts
│   │   │   └── UpgradeSystem.ts
│   │   ├── ui/             # UI脚本
│   │   │   ├── HUDController.ts
│   │   │   ├── BattleUIController.ts
│   │   │   └── MenuController.ts
│   │   ├── entities/       # 实体类
│   │   │   ├── BattleUnit.ts
│   │   │   ├── Character.ts
│   │   │   ├── Equipment.ts
│   │   │   └── Lootable.ts
│   │   └── utils/          # 工具函数
│   │       ├── ConfigLoader.ts
│   │       ├── MathUtils.ts
│   │       └── StorageHelper.ts
│   └── plugins/            # Spine 插件等
│
├── src/                    # 上传版本（发布前）
│
├── game.json               # 微信小游戏配置
├── tsconfig.json           # TypeScript配置
├── package.json
└── README.md
```

### 3.2 性能优化关键指标

#### 3.2.1 内存管理

```typescript
// 对象池（Object Pool）- 减少频繁创建销毁
class ObjectPool<T> {
  private pool: T[] = [];
  private prefab: cc.Prefab;
  
  get(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return cc.instantiate(this.prefab);
  }
  
  recycle(obj: T): void {
    this.pool.push(obj);
    if (obj instanceof cc.Node) {
      obj.removeFromParent();
    }
  }
}

// 伤害数字浮起动画复用
const damageNumberPool = new ObjectPool<DamageNumber>();

// 粒子特效复用
class ParticlePool {
  private activeParticles: Set<cc.ParticleSystem> = new Set();
  maxActiveParticles = 300;  // 严格限制
  
  emit(prefab: cc.Prefab, position: cc.Vec2): void {
    if (this.activeParticles.size >= this.maxActiveParticles) {
      // 移除最老的粒子
      const oldest = Array.from(this.activeParticles)[0];
      oldest.node.removeFromParent();
      this.activeParticles.delete(oldest);
    }
    
    const particle = cc.instantiate(prefab);
    this.activeParticles.add(particle.getComponent(cc.ParticleSystem));
  }
}
```

#### 3.2.2 纹理压缩与资源分包

```json
game.json 配置示例:

{
  "networkTimeout": 30000,
  "iOSHighPerformance": true,
  
  "subpackages": [
    {
      "name": "map_forest",
      "root": "assets/resources/scenes/forest",
      "miniprogramRoot": ".",
      "compress": "zip"
    },
    {
      "name": "characters",
      "root": "assets/resources/characters",
      "miniprogramRoot": ".",
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

#### 3.2.3 帧率与卡顿监控

```typescript
class PerformanceMonitor extends cc.Component {
  private frameTimings: number[] = [];
  private gcCount: number = 0;
  
  onLoad(): void {
    // 每10秒输出一次性能报告
    this.schedule(() => this.reportMetrics(), 10);
  }
  
  update(deltaTime: number): void {
    this.frameTimings.push(deltaTime * 1000);  // 转换为毫秒
    
    if (this.frameTimings.length > 300) {  // 保留10秒的数据
      this.frameTimings.shift();
    }
  }
  
  reportMetrics(): void {
    const avgFrameTime = this.frameTimings.reduce((a, b) => a + b) / this.frameTimings.length;
    const fps = Math.round(1000 / avgFrameTime);
    const gcCount = wx.performance?.memory?.jsHeapSizeLimit || 0;
    
    console.log(`[性能] FPS: ${fps}, 平均帧时间: ${avgFrameTime.toFixed(2)}ms`);
    
    if (fps < 30) {
      console.warn(`[警告] 帧率过低: ${fps}FPS`);
      this.optimizeGC();
    }
  }
  
  private optimizeGC(): void {
    // 触发垃圾回收
    if (cc.sys.platform === cc.sys.WECHAT_GAME) {
      wx.triggerGC?.();
    }
  }
}
```

### 3.3 Spine 动画优化

```typescript
// Spine 动画缓存与重用
class SpineAnimationManager {
  private animationCache: Map<string, sp.SkeletonData> = new Map();
  
  async loadSkeleton(characterId: string): Promise<sp.SkeletonData> {
    if (this.animationCache.has(characterId)) {
      return this.animationCache.get(characterId)!;
    }
    
    const skeletonData = await cc.loader.loadRes(
      `characters/${characterId}/skeleton`,
      sp.SkeletonData
    );
    
    this.animationCache.set(characterId, skeletonData);
    return skeletonData;
  }
  
  // 避免重复创建：使用setAnimation而非playAnimation
  playAnimation(
    skeletonAnimation: sp.SkeletonAnimation,
    animName: string,
    isLoop: boolean = true
  ): void {
    // 直接見更动画，不创建新对象
    skeletonAnimation.setAnimation(0, animName, isLoop);
  }
}
```

---

## 4. 数值系统设计

### 4.1 属性与伤害计算公式

```
基础伤害公式:

EffectiveDamage = 
  ((BaseATK × SkillMultiplier) / (TargetDEF + 100)) 
  × ElementModifier 
  × (1 + RandomVariance)
  × CritMultiplier（如果暴击）

参数详解:
  BaseATK: 攻击者的攻击力属性值
  SkillMultiplier: 技能的伤害系数（默认1.0）
  TargetDEF: 防守者的防御力属性值
  ElementModifier: 属性克制系数（0.8/1.0/1.2）
  RandomVariance: 随机波动 ±20%，公式: (0.8 ~ 1.2)
  CritMultiplier: 暴击伤害倍数（通常1.5x）

防御属性价值分析:

  示例1: 敌人ATK=100, 玩家DEF=50
    伤害 = 100 / (50 + 100) = 66.7 DPS
  
  示例2: 敌人ATK=100, 玩家DEF=100
    伤害 = 100 / (100 + 100) = 50 DPS
    防御收益: (66.7 - 50) / 66.7 ≈ 25% 伤害减少
  
  设计意图: 
    前期防御收益显著（鼓励新手选择防守战术）
    后期需要投入更多防御点数才能维持收益
    进而促进多样化的角色与装备配置
```

### 4.2 经验与等级系统

```yaml
等级增长曲线（指数增长，鼓励长期游玩）:

Level 1-10: 线性增长
  Exp Required: level × 100
  
Level 11-20: 二次方增长
  Exp Required: level × 150 + (level - 10)² × 50
  
Level 21-30: 三次方增长
  Exp Required: level × 200 + (level - 20)³ × 10

Level 30+: 自定义递推
  Exp Required: previousLevel × 1.5 + 1000

示例:
  达到Lv10 总计: 5500 Exp
  达到Lv20 总计: 32500 Exp
  达到Lv30 总计: ~180000 Exp

经验来源（单次战斗）:
  普通怪: 50-100 Exp
  精英怪: 150-250 Exp
  BOSS: 500-1000 Exp
  难度系数: × (1 + 难度等级 × 0.1)
```

### 4.3 金币与资源产出

```
资源产出时间表:

搜寻阶段奖励:
  基础金币: 100 ~ 300（普通搜寻）
  稀有奖励: 500 ~ 1500（宝箱搜寻）
  
  概率分布:
    普通物品: 60%
    稀有物品: 25%
    史诗物品: 12%
    传奇物品: 3%

战斗奖励:
  击败普通怪: 50 ~ 100 金币 + 基础材料
  击败精英怪: 200 ~ 400 金币 + 进阶材料
  击败BOSS: 1000 ~ 3000 金币 + 史诗装备碎片

撤离奖励加成:
  成功撤离: × 1.5 倍数（鼓励风险决策）
  部分物品丢失: × 0.8 倍数（逃离失败）
  完美撤离(无伤): × 2.0 倍数（最高奖励）

日常任务（微信社交活动）:
  邀请1名好友: +200 金币
  助力好友救援: +100 金币
  完成日常任务: +300 金币
  周卡订阅（可选): +2000 金币/周
```

---

## 5. 服务端集成指南

> **本章内容**: 客户端与服务器的网络通信规范  
> **参考文档**: DATA-SYNC-PROTOCOL.md (详细API定义)  
> **实现语言**: TypeScript

---

### 5.1 NetworkManager 网络层实现

客户端通过NetworkManager与服务端通信，采用**4层优先级分层**策略。详见ADR-008。n
```typescript
// === NetworkManager: 混合架构网络管理 ===
class NetworkManager {
  private sessionToken: string | null = null;
  private playerId: string | null = null;
  private syncQueue: SyncTask[] = [];  // 失败任务队列
  private offline: boolean = false;
  private encryptionKey: string = '';

  // 初始化：微信登录
  async initialize(code: string): Promise<void> {
    try {
      const response = await this.request(
        'POST',
        '/api/auth/wechat-login',
        { code, encryptedData: 'xxx', iv: 'xxx' },
        'critical'
      );
      
      this.sessionToken = response.sessionToken;
      this.playerId = response.playerId;
      this.encryptionKey = this.deriveKeyFromSessionToken(this.sessionToken);
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }
  
  // === Layer 1: 关键数据 (即时同步, <2秒) ===
  async submitScore(battleResult: BattleResult): Promise<void> {
    const payload = {
      playerId: this.playerId,
      mapId: battleResult.mapId,
      score: battleResult.score,
      damageDealt: battleResult.damageDealt,
      damageReceived: battleResult.damageReceived,
      clearTime: battleResult.duration,
      extractSuccess: battleResult.extractSuccess,
      clientTimestamp: Date.now(),
      signature: this.sign(battleResult)  // HMAC防篡改
    };
    
    try {
      const response = await this.request(
        'POST',
        '/api/leaderboard/submit-score',
        payload,
        'critical'  // 关键优先级
      );
      
      if (!response.success) {
        throw new Error(response.error);
      }
    } catch (error) {
      // 失败时保存到本地队列，待网络恢复重试
      this.queueForRetry({ method: 'POST', path: '/api/leaderboard/submit-score', payload, priority: 'critical' });
    }
  }
  
  // === Layer 2: 重要数据 (准实时, <30秒) ===
  async createRescueRequest(failedMap: string, lostItems: Item[]): Promise<string> {
    try {
      const response = await this.request(
        'POST',
        '/api/rescue/create-request',
        {
          playerId: this.playerId,
          mapId: failedMap,
          failedTime: Date.now(),
          lostItems,
          totalValue: lostItems.reduce((sum, item) => sum + item.value * item.count, 0)
        },
        'important'
      );
      
      return response.rescueUrl;  // 分享链接
    } catch (error) {
      console.error('Rescue request failed:', error);
      return '';
    }
  }
  
  async completeRescueTask(requestId: string): Promise<boolean> {
    try {
      const response = await this.request(
        'POST',
        '/api/rescue/complete-task',
        {
          requestId,
          heroId: this.playerId,
          completedTime: Date.now(),
          signature: this.sign({ requestId })
        },
        'important'
      );
      
      return response.success;
    } catch (error) {
      console.error('Complete rescue failed:', error);
      return false;
    }
  }
  
  // === Layer 3: 辅助数据 (定期同步, <5分钟) ===
  async periodicSync(): Promise<void> {
    setInterval(async () => {
      if (this.offline) return;  // 离线时跳过
      
      try {
        const data = {
          characters: await LocalDB.queryAllCharacters(),
          equipment: await LocalDB.queryAllEquipment(),
          achievements: await LocalDB.queryAchievements(),
          timestamp: Date.now()
        };
        
        await this.request(
          'POST',
          '/api/sync/batch-data',
          { playerId: this.playerId, data },
          'auxiliary'
        );
      } catch (error) {
        console.warn('Periodic sync failed, will retry later');
      }
    }, 300000);  // 5分钟
  }
  
  // === Layer 4: 统计数据 (后台异步, <30分钟) ===
  async reportAnomaly(anomaly: AnomalyReport): Promise<void> {
    // 完全异步，不阻塞游戏
    setImmediate(async () => {
      try {
        await this.request(
          'POST',
          '/api/anticheat/report-anomaly',
          { playerId: this.playerId, ...anomaly },
          'auxiliary'
        );
      } catch (error) {
        // 记录但不影响游戏
        console.warn('Anomaly report failed');
      }
    });
  }
  
  // === 核心网络请求方法 ===
  private async request(
    method: string,
    path: string,
    body?: any,
    priority: 'critical' | 'important' | 'auxiliary' = 'important'
  ): Promise<any> {
    const timeout = priority === 'critical' ? 10000 : 5000;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.sessionToken}`
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token过期，刷新
          await this.refreshToken();
          return this.request(method, path, body, priority);
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      this.handleNetworkError(error, { method, path, body, priority });
      throw error;
    }
  }
  
  // === 网络错误处理 ===
  private handleNetworkError(error: any, context: any): void {
    if (error.name === 'AbortError') {
      console.warn('Request timeout:', context.path);
      this.offline = true;
    } else {
      console.warn('Network error:', error);
      this.offline = true;
    }
  }
  
  // === 网络恢复处理 ===
  onNetworkRestored(): void {
    this.offline = false;
    this.processRetryQueue();
  }
  
  private async processRetryQueue(): Promise<void> {
    while (this.syncQueue.length > 0) {
      const task = this.syncQueue.shift();
      try {
        await this.request(task.method, task.path, task.payload, task.priority);
      } catch (error) {
        task.retryCount = (task.retryCount || 0) + 1;
        if (task.retryCount < 3) {
          // 指数退避重试
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, task.retryCount) * 1000)
          );
          this.syncQueue.push(task);
        }
      }
    }
  }
  
  // === 工具方法 ===
  private sign(data: any): string {
    const dataStr = JSON.stringify(data);
    return hmacSha256(dataStr, this.encryptionKey);
  }
  
  private async refreshToken(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.sessionToken}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      this.sessionToken = data.sessionToken;
    }
  }
}
```

### 5.2 API 端点列表 (详见DATA-SYNC-PROTOCOL.md)

#### 身份认证
- `POST /api/auth/wechat-login` - 微信授权登录
- `POST /api/auth/refresh-token` - 刷新会话令牌

#### 排行榜 (Layer 1)
- `POST /api/leaderboard/submit-score` - 上报战斗成绩
- `GET /api/leaderboard/get-rankings` - 获取排行榜
- `GET /api/leaderboard/personal-history` - 获取个人成绩历史

#### 救援 (Layer 1-2)
- `POST /api/rescue/create-request` - 发起救援请求
- `GET /api/rescue/get-task` - 查询救援任务
- `POST /api/rescue/complete-task` - 完成救援任务

#### 热更新 (Layer 2)
- `GET /api/config/check-version` - 检查配置版本
- `GET /api/config/download` - 下载配置文件

#### 数据同步 (Layer 3)
- `POST /api/sync/batch-data` - 批量同步数据
- `GET /api/sync/pull-latest` - 拉取增量更新

#### 反作弊 (Layer 4)
- `POST /api/anticheat/report-anomaly` - 上报异常行为

### 5.3 离线模式支持

当网络不可用时，游戏仍可继续运行：

```typescript
// 网络状态监听
class NetworkStatusManager {
  constructor(networkManager: NetworkManager) {
    // 监听网络变化
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => networkManager.onNetworkRestored());
      window.addEventListener('offline', () => networkManager.setOfflineMode(true));
    }
  }
}

// 离线时，本地SQLite继续支持游戏进行
// 联网后自动同步本地修改到服务端
```

### 5.4 错误处理与重试策略

```typescript
// 标准错误响应
interface ErrorResponse {
  success: false;
  error: string;  // 错误码
  message: string;  // 用户友好提示
  details?: any;
}

// 重试策略
const RetryPolicy = {
  critical: { maxRetries: 3, backoff: [1000, 2000, 4000] },
  important: { maxRetries: 2, backoff: [1000, 2000] },
  auxiliary: { maxRetries: 1, backoff: [1000] }
};
```

---

## 6. 研发里程碑与交付清单

### 6.1 里程碑详细规划

#### M1: 概念验证 (Week 1-4)

```
任务分解:

搜寻系统原型:
  ✓ 实现基础地图加载
  ✓ 可交互物件（宝箱）功能完成
  ✓ 搜寻UI与进度条
  ✓ 基础奖励掉落

战斗系统原型:
  ✓ 单个角色对单个敌人的回合制战斗
  ✓ 伤害计算与HP管理
  ✓ 基础技能释放（普通攻击+一个技能）
  ✓ 战斗UI（血条、伤害数字）

撤离系统原型:
  ✓ 撤离点显示与交互
  ✓ 60秒倒计时
  ✓ 撤离成功/失败逻辑
  
Spine集成:
  ✓ 导入1个角色的Spine模型
  ✓ 实现基础待机、移动、攻击动画
  ✓ 动画与战斗同步

性能基线:
  ✓ 测试FPS: 目标 > 40FPS
  ✓ 内存占用: 目标 < 200MB

交付物:
  - 单机可玩原型（Demo.apk）
  - Spine集成文档
  - 性能测试报告
```

#### M2: 美术定型 (Week 5-8)

```
美术资源:
  ✓ 主角色立绘 × 10 (Spine骨骼 < 55根)
  ✓ 敌人模型 × 5 (简化骨骼)
  ✓ 首张地图美术资源
  ✓ 场景特效（粒子、光影）
  ✓ UI美术规范文档

技术实现:
  ✓ 赛璐璐shader实现
  ✓ 动态天气系统（3种天气）
  ✓ 光影与雾效
  ✓ 粒子特效库 (20+种)

文档:
  ✓ 视觉标准文档（色值、光影、动画规范）
  ✓ 角色美术规范指南
  ✓ UI设计规范

交付物:
  - M1 + 完整美术资源
  - 视觉标准文档
  - 美术预览Demo
```

#### M3: 数值调优 (Week 9-12)

```
数值系统:
  ✓ 经验与等级系统
  ✓ 装备与强化系统
  ✓ 属性克制系统实现
  ✓ 战斗平衡数据

社交系统:
  ✓ 救援机制完整实现
  ✓ 微信分享与邀请
  ✓ 排行榜服务端实现
  ✓ 好友系统（列表、搜索）

资源分包:
  ✓ 主包 < 8MB（核心逻辑）
  ✓ 地图分包设置
  ✓ 角色分包加载
  ✓ CDN部署方案

服务端:
  ✓ 玩家数据存储
  ✓ 排行榜接口
  ✓ 救援系统后端
  ✓ 数据安全与反作弊

交付物:
  - M2 + 数值平衡
  - 服务端接口文档
  - 封测版本 (可在微信内测试)
```

#### M4: 上线准备 (Week 13-14)

```
性能适配:
  ✓ iOS高性能模式配置
  ✓ 低端机兼容性测试
  ✓ 长周期运行稳定性测试

微信特性:
  ✓ 微信登录与授权
  ✓ 分享与邀请逻辑
  ✓ 微信支付集成（如有）
  ✓ 合规性审计

部署与监控:
  ✓ CDN资源部署
  ✓ 服务端容量规划
  ✓ 性能监控面板
  ✓ 错误日志系统

交付物:
  - 正式发布版本
  - 上线清单
  - 运维手册
  - 社区公告与宣传素材
```

### 6.2 交付清单模板

```markdown
# 交付清单 - M{N}

## 代码交付
- [ ] 源代码已提交到Git仓库
- [ ] 代码审核通过（Code Review）
- [ ] 单元测试覆盖率 > 70%
- [ ] TypeScript编译无错误

## 美术资源
- [ ] 所有资源文件已导出并压缩
- [ ] 命名规范检查完毕
- [ ] 分包配置已验证
- [ ] CDN部署验证完成

## 文档
- [ ] API文档已更新
- [ ] 配置文档完成
- [ ] 部署指南编写
- [ ] 团队培训完成

## 测试
- [ ] 功能测试通过
- [ ] 性能基准测试完成
- [ ] 兼容性测试完成
- [ ] 压力测试完成

## 部署
- [ ] 测试环境部署完成
- [ ] 生产环境部署完成
- [ ] 回滚方案已制定
- [ ] 监控告警已配置

签名: ________________   日期: __________
```

---

## 7. 风险管理与应急方案

### 7.1 主要风险识别

| 风险 | 概率 | 影响 | 应对方案 |
|------|------|------|--------|
| Spine动画性能低于预期 | 中 | 高 | 降低骨骼数量、使用贴图动画替代 |
| 微信小游戏包体限制 | 高 | 中 | 提前规划分包、压缩资源 |
| 服务端扩展性不足 | 中 | 高 | 使用数据库连接池、缓存优化 |
| 玩家流失（黏性不足） | 高 | 高 | 加强社交系统、优化数值平衡 |
| 低端机兼容性 | 高 | 中 | 性能分级方案、动态降质 |
| 微信审核不通过 | 低 | 极高 | 提前咨询、符合运营规范 |

### 7.2 应急方案示例

#### 方案A: 如果Spine动画卡顿

```
触发条件: FPS < 30 且主要原因是Spine渲染

降级方案:
  Level 1 (中度卡顿):
    ① 关闭敌人的细节骨骼动画（保留主体）
    ② 降低粒子特效质量
    ③ 降低场景细节（如：树叶摇晃)
  
  Level 2 (严重卡顿):
    ① 敌人改用贴图动画（预烘焙）
    ② 最多同屏3个敌人而非5个
    ③ 禁用环境动画，只保留静态场景
  
  Level 3 (极端情况):
    ① 切换到"省电模式"
    ② 帧率目标从30FPS降至20FPS
    ③ 所有角色使用静态立绘而非Spine

恢复条件: FPS > 35 持续10秒
```

#### 方案B: 如果服务端压力过大

```
监控指标:
  - 数据库连接数 > 200
  - HTTP响应时间 > 1000ms
  - QPS > 预期 × 1.5

应对步骤:
  ① 启用Redis多层缓存（排行榜、玩家数据）
  ② 限流：超过阈值的请求返回429错误
  ③ 数据库读写分离（主从复制）
  ④ 触发自动扩展（增加服务器实例）
  ⑤ 通知运营团队，准备降低功能（如：禁用排行榜更新）
```

---

## 8. 美术系统深度规范

### 8.1 角色设计案例：主角「云影」

#### 8.1.1 角色定位与视觉概念

```yaml
角色名: 云影
定位: 敏捷型物理输出
性格: 宁静致远、飘然若思
服装风格: 飘带长衣 + 足尖鞋
配色: 白色/浅蓝/金色

视觉气质:
  核心意象: 天空中的流云
  动画感受: 柔和飘动、重心转移明显
  光影重点: 衣服边缘的逆光、头发高光
  辨识度: 独特的飘带摆动、展翅姿态
```

#### 8.1.2 Spine骨骼结构表（云影）

```
骨骼总数: 52根 (预留3根缓冲)

Root (0)
├─ Hips (1)
│   ├─ Chest (2)
│   │   ├─ Neck (3)
│   │   │   └─ Head (4)
│   │   │       ├─ HeadRotation (5)
│   │   │       ├─ EyeL (6)
│   │   │       ├─ EyeR (7)
│   │   │       ├─ MouthUpper (8)
│   │   │       └─ MouthLower (9)
│   │   ├─ ShoulderL (10)
│   │   │   ├─ ArmL (11)
│   │   │   └─ ForearmL (12)
│   │   │       └─ HandL (13)
│   │   ├─ ShoulderR (14)
│   │   │   ├─ ArmR (15)
│   │   │   └─ ForearmR (16)
│   │   │       └─ HandR (17)
│   │   └─ ChestCloth (18) [衣服摆动]
│   │       └─ ClothEnd (19)
│   └─ Pelvis (20)
│       ├─ SkirtL (21) [左飘带]
│       │   ├─ SkirtL_Mid (22)
│       │   └─ SkirtL_End (23)
│       ├─ SkirtR (24) [右飘带]
│       │   ├─ SkirtR_Mid (25)
│       │   └─ SkirtR_End (26)
│       ├─ SkirtBack (27) [后飘带]
│       │   ├─ SkirtBack_Mid (28)
│       │   └─ SkirtBack_End (29)
│       └─ Spine (30) [脊柱IK目标]
├─ LegL (31)
│   ├─ CalfL (32)
│   └─ FootL (33)
├─ LegR (34)
│   ├─ CalfR (35)
│   └─ FootR (36)
├─ HairBack (37) [头发后]
│   ├─ HairBack_L (38)
│   └─ HairBack_R (39)
├─ HairFront (40) [头发前]
│   ├─ HairFront_L (41)
│   └─ HairFront_R (42)
├─ Weapon (43) [武器挂点]
└─ VFX_Anchor (44) [特效锚点]

分组统计:
  基础骨骼: 20根 (身体四肢)
  动态骨骼: 20根 (飘带、头发、衣服)
  约束骨骼: 4根 (IK、挂点)
  总计: 44根 (未来可扩展至52根)
```

#### 8.1.3 动画列表与帧数规范

```yaml
待机动画 (idle):
  时长: 4秒
  循环: 是
  特点: 胸部呼吸(0.5cm起伏)、飘带微动(轻微晃动)
  关键帧:
    0f: 站立基础姿态
    30f: 呼吸高点
    60f: 呼吸低点
    90f: 飘带晃动高点
    120f: 循环返回
  
移动动画 (walk):
  时长: 0.6秒/步 (30 FPS = 18帧)
  循环: 是
  特点: 左右摇晃、飘带跟随、头部轻微上下
  关键帧:
    0f: 左脚接地
    9f: 右脚接地
    18f: 循环
  
跑步动画 (run):
  时长: 0.4秒/步 (30 FPS = 12帧)
  循环: 是
  特点: 节奏快、飘带窜动、身体倾斜
  关键帧间距: 每4帧关键帧

普通攻击 (attack_light):
  时长: 0.5秒
  循环: 否
  特点: 0.15秒蓄力 + 0.2秒爆发 + 0.15秒回收
  关键帧:
    0-4f: 蓄力(肩膀后缩)
    5-9f: 爆发(快速前挥)
    10-15f: 回收(缓慢回位)
  伤害帧: 第7帧 (爆发中点)
  
必杀技 (ultimate_soar):
  时长: 1.5秒
  循环: 否
  特点: "展翅高飞" 动作，全身发光
  阶段:
    0-15f: 蓄力(双手上举、蓄能光晕)
    15-30f: 爆发(身体上升、周身光晕变化)
    30-45f: 最高点(停顿、环境光影变化)
    45-90f: 降落(优雅着陆)
  伤害帧: 第30帧
  
受击动画 (hit):
  时长: 0.3秒
  循环: 否
  特点: 身体晃动、后退半步、飘带乱摆
  关键帧:
    0-3f: 击中反应(身体向后)
    3-9f: 恢复(缓慢回位)
  
死亡动画 (death):
  时长: 1.0秒
  循环: 否
  特点: 缓慢倒地、身体逐渐淡出、飘带飘落
  关键帧:
    0-15f: 低头、身体下倾
    15-30f: 倒地
    30-60f: 逐渐淡出(透明度降低)
```

#### 8.1.4 Spine Skin（皮肤）配置

```typescript
// Spine中的替换皮肤配置示例
Skins:
  default:           // 默认皮肤（原始素材）
    ├─ character_base
    ├─ clothing_white_v1
    └─ hair_style_1
  
  skin_elegant:      // 优雅皮肤（高级版本）
    ├─ character_base
    ├─ clothing_white_elegant  // 替换贵气服装
    └─ hair_style_elaborate    // 替换精致发型
  
  skin_casual:       // 休闲皮肤
    ├─ character_base
    ├─ clothing_casual         // 替换便装
    └─ hair_style_simple

// Cocos Creator中加载皮肤
changeSkin(skinName: string): void {
  const skeletonRenderer = this.node.getComponent(sp.SkeletonData);
  skeletonRenderer.setSkin(skinName);
  skeletonRenderer.setToSetupPose();
}
```

### 8.2 特效系统（VFX）规范

#### 8.2.1 粒子特效库

```yaml
攻击类特效:
  
  斩击特效 (slash_effect):
    粒子图: 白色尖角形
    生成速率: 20个/秒
    生命周期: 0.3秒
    速度: 从200往外散射
    混合模式: 加法(Additive)
    初始色: #FFE4B5 (米色光)
    衰减: 线性衰减至透明
    尺寸: 从10px衰减至2px
    用途: 普通攻击的斩击感
  
  爆炸特效 (explosion_major):
    粒子图: 爆炸云纹理
    生成速率: 50个/秒 (突发)
    生命周期: 0.8秒
    速度: 从300-500随机
    混合模式: 正常 + 加法层
    初始色: #FFA500 (橙色) → #FFFF00 (黄色)
    衰减: 指数衰减
    尺寸: 从40px衰减至10px
    用途: 终极技能释放

治疗类特效:
  
  治疗光晕 (heal_aura):
    粒子图: 柔和光斑
    生成速率: 10个/秒
    生命周期: 1.5秒 (较长)
    速度: 缓慢上升(50px/秒)
    混合模式: 加法
    初始色: #90EE90 (浅绿)
    衰减: 缓慢衰减
    轨迹: 螺旋上升
    用途: 治疗能力的视觉反馈

环境类特效:
  
  雨滴特效 (rain_particles):
    粒子图: 白色条纹
    发射器: 全屏
    生成速率: 100个/秒
    生命周期: 3秒
    速度: 向下500px/秒
    混合模式: 正常
    透明度: 0.3
    尺寸: 2×10px
    性能优化: 使用ParticleSystem内置雨特效
```

---

## 9. 战斗系统深度规范

### 9.1 敌人AI行为树

#### 9.1.1 行为树结构

```
根节点: EnemyAI
├─ Selector (或)
│   ├─ Sequence: 紧急逃离
│   │   ├─ Check: HP < 20%
│   │   └─ Action: 向地图边缘跑
│   │
│   ├─ Sequence: 目标威胁评估高
│   │   ├─ Check: 玩家HP > 自身HP
│   │   └─ Action: 防守姿态
│   │       └─ Action: 回血技能
│   │
│   ├─ Sequence: 属性克制
│   │   ├─ Check: 我的属性克制玩家
│   │   └─ Action: 释放克制技能
│   │
│   └─ Sequence: 默认进攻
│       └─ Action: 普通攻击
```

#### 9.1.2 敌人配置表（骨精灵示例）

```yaml
怪物_骨精灵 (skeleton_wisp):
  
  基础属性:
    HP: 80
    ATK: 50
    DEF: 30
    SPD: 15  # 速度较快
    Element: wind
  
  AI配置:
    攻击优先度: 0.7     # 倾向于进攻
    防守触发: HP < 30%
    逃离触发: HP < 10%
    回血技能冷却: 3秒
    
    技能选择:
      - attack_light: 概率 0.4
      - skill_wind_blade: 概率 0.3
      - skill_heal: 概率 0.2  (仅HP < 50%时)
      - skill_dash: 概率 0.1  (仅HP < 20%时逃离)
  
  行动间隔:
    正常状态: 1.5秒
    低血量: 1.0秒 (更频繁)
    被击后: 0.5秒 (恢复时间)
  
  寻路:
    距离检测: 5米范围内主动进攻
    逃离范围: > 8米
    绕过障碍: 启用
```

### 9.2 BUFF/DEBUFF系统详表

```yaml
BUFF系统 (增益):
  
  攻击提升 (atk_boost):
    类型: BUFF
    持续时间: 6秒
    数值: ATK +30%
    叠加规则: 刷新时间
    视觉效果: 角色周身红光晕
    音效: 锐利的"砰"声
  
  防守强化 (def_shield):
    类型: BUFF
    持续时间: 8秒
    数值: DEF +50%, 减少伤害20%
    叠加规则: 最多叠加3层(每层+20%)
    视觉效果: 半透明护盾
    音效: 沉闷的"铜"声
  
  急速 (haste):
    类型: BUFF
    持续时间: 4秒
    数值: SPD +2, 动画播放速度+30%
    叠加规则: 不叠加
    视觉效果: 身体周围风效粒子
    音效: 呼啸声

DEBUFF系统 (减益):
  
  烫伤 (burn):
    类型: DEBUFF (持续伤害)
    持续时间: 5秒
    伤害: 每1秒造成10 DPS
    叠加规则: 最多3层
    视觉效果: 身体周围火焰粒子
    音效: 火焰'滋滋'声
  
  冻结 (freeze):
    类型: DEBUFF (控制)
    持续时间: 2秒
    效果: 无法移动和攻击, SPD -100%
    叠加规则: 不叠加，刷新时间
    视觉效果: 身体覆盖冰层, 动画变灰
    音效: 冰冷的"哗"声
  
  中毒 (poison):
    类型: DEBUFF (持续伤害)
    持续时间: 8秒
    伤害: 首次10伤害，之后每秒递增5(总伤害递增)
    叠加规则: 最多2层
    视觉效果: 绿色雾气环绕
    音效: 腐蚀音效
  
  虚弱 (weakness):
    类型: DEBUFF (属性削弱)
    持续时间: 6秒
    效果: ATK -40%
    叠加规则: 最多2层
    视觉效果: 身体变得半透明
    音效: 低沉的哀鸣
```

### 9.3 连招系统（高级特性）

```yaml
连招规则:
  定义: 在n秒内依次完成m个特定技能
  奖励: 额外伤害加成 + 特殊视觉效果
  
连招示例_火焰爆裂:
  触发条件:
    - 技能1: 火焰斩击 (Element: fire)
    - 技能2: 爆炸术 (Element: fire)
    时间窗口: 3秒内完成
  
  奖励:
    伤害加成: +50%
    额外效果: 释放第2个技能时，周围生成额外火焰漩涡
    音效: 强烈的爆炸音
    视觉: 屏幕震动 + 过曝闪白
  
  实现:
    // 伪代码
    if (lastSkillElement === 'fire' && 
        currentTime - lastSkillTime < 3000) {
      comboMultiplier = 1.5;
      triggerComboVFX();
    }
```

---

## 10. 关卡系统设计

### 10.1 地图层级结构

```yaml
世界地图 (World):
  ├─ 第1区域: 初心林地
  │   ├─ 小地图1-1: 林间小道 (难度1)
  │   ├─ 小地图1-2: 古树深处 (难度2)
  │   └─ 小地图1-3: 迷雾森林 (难度3)
  │
  ├─ 第2区域: 云隐高峰
  │   ├─ 小地图2-1: 山脚石径 (难度3)
  │   ├─ 小地图2-2: 山腰云雾 (难度4)
  │   └─ 小地图2-3: 云端遗迹 (难度5)
  │
  └─ 第3区域: 深渊秘境
      ├─ 小地图3-1: 黑暗洞穴 (难度5)
      ├─ 小地图3-2: 扭曲空间 (难度6)
      └─ 小地图3-3: 终极堡垒 (难度7)
```

### 10.2 单个小地图配置（1-1为例）

```json
{
  "mapId": "map_1_1",
  "name": "林间小道",
  "difficulty": 1,
  "region": "初心林地",
  
  "environment": {
    "skybox": "sky_forest_morning",
    "weatherType": "clear",
    "timeOfDay": "morning",
    "ambientLight": "#87CEEB",
    "fogDensity": 0.1
  },
  
  "layout": {
    "mapSize": "small",
    "startPoint": { "x": 5, "y": 8 },
    "extractionPoints": [
      { "id": "extract_1", "x": 25, "y": 5, "dangerLevel": 1 },
      { "id": "extract_2", "x": 5, "y": 25, "dangerLevel": 2 }
    ],
    
    "terrainFeatures": [
      { "type": "tree", "x": 10, "y": 10, "scale": 1.0 },
      { "type": "rock", "x": 15, "y": 12, "scale": 0.8 },
      { "type": "water", "x": 20, "y": 8, "width": 3, "height": 2 }
    ]
  },
  
  "loot": [
    {
      "lootId": "chest_1",
      "type": "chest",
      "position": { "x": 8, "y": 10 },
      "rarity": 1,
      "difficulty": 1,
      "timeToSearch": 15
    },
    {
      "lootId": "debris_1",
      "type": "debris",
      "position": { "x": 18, "y": 15 },
      "rarity": 2,
      "difficulty": 2,
      "timeToSearch": 20
    }
  ],
  
  "enemies": [
    {
      "enemyId": "skeleton_1",
      "type": "skeleton_wisp",
      "position": { "x": 12, "y": 14 },
      "level": 2,
      "spawnTrigger": "playerApproach",
      "spawnDistance": 5
    }
  ],
  
  "difficulty": {
    "enemySpawnRate": 1.0,
    "enemyDamageMultiplier": 1.0,
    "playerExpReward": 100,
    "goldReward": 150
  }
}
```

### 10.3 难度曲线与敌人配置

```yaml
难度等级映射表:
  
  Difficulty 1 (新手):
    建议玩家等级: 1-5
    敌人等级范围: 1-3
    平均敌人数: 1-2
    掉落品质倾向: 普通(60%) + 稀有(40%)
    首刀通过率: 90%以上
    
  Difficulty 3 (中等):
    建议玩家等级: 10-15
    敌人等级范围: 10-15
    平均敌人数: 2-4
    掉落品质倾向: 稀有(50%) + 史诗(40%) + 传奇(10%)
    首刀通过率: 50-70%
    
  Difficulty 7 (极难):
    建议玩家等级: 25+
    敌人等级范围: 25+
    平均敌人数: 4-6
    掉落品质倾向: 史诗(50%) + 传奇(50%)
    首刀通过率: 10-30%
    特殊机制: 敌人会主动寻求支援、使用协作技能
```

### 10.4 关卡进度与解锁机制

```yaml
解锁条件:
  
  地图1-1 (林间小道):
    条件: 完成教程
    解锁奖励: 无 (起始地图)
  
  地图1-2 (古树深处):
    条件: 通过地图1-1 两次
    解锁奖励: 角色碎片 ×5
  
  地图2-1 (山脚石径):
    条件: 
      - 通过地图1-3
      - 玩家角色等级 >= 10
    解锁奖励: 新地区开放、特殊道具
  
  地图3-3 (终极堡垒):
    条件:
      - 通过地图3-2
      - 拥有5名5星角色
      - 平均战力 >= 10000
    解锁奖励: 传奇装备箱 ×3、赛季成就

分支路线:
  主线: 1-1 → 1-2 → 1-3 → 2-1 → 2-2 → 2-3 → 3-1 → 3-2 → 3-3
  支线: (每周末开放)
    - 挑战关卡: 特殊敌人、特殊奖励
    - 练习关卡: 低难度、用于升级
```

---

**总计**: 新增内容包括
- 8个美术详细规范 (角色设计、Spine详表、特效库、Shader)
- 5个战斗系统深度 (AI行为树、BUFF详表、连招系统、状态机)
- 4个关卡设计完整 (地图结构、单地图配置、难度曲线、解锁机制)

**下一步**: 对接code实现，建立配置文件模板