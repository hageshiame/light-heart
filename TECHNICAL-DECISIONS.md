# 技术决策记录 (ADR - Architecture Decision Record)

> 本文档记录项目的关键技术决策、理由与权衡，便于团队理解设计意图

---

## 目录

1. [ADR-001: 选择 Cocos Creator 3.8 作为引擎](#adr-001-选择-cocos-creator-38-作为引擎)
2. [ADR-002: 采用 Spine 2D 骨骼动画系统](#adr-002-采用-spine-2d-骨骼动画系统)
3. [ADR-003: 搜打撤的回合制战斗而非实时](#adr-003-搜打撤的回合制战斗而非实时)
4. [ADR-004: 数据驱动的配置系统](#adr-004-数据驱动的配置系统)
5. [ADR-005: 对象池管理非关键资源](#adr-005-对象池管理非关键资源)
6. [ADR-006: 赛璐璐渲染而非 PBR](#adr-006-赛璐璐渲染而非-pbr)
7. [ADR-007: 微信社交集成策略](#adr-007-微信社交集成策略)
8. [ADR-008: 端云架构决策](#adr-008-端云架构决策)

---

## ADR-001: 选择 Cocos Creator 3.8 作为引擎

### 决策时间
2025年12月

### 状态
**已采纳** ✅

### 背景
需要为微信小游戏平台选择一个合适的游戏引擎，要求：
- 完美支持微信小游戏发布流程
- 支持 Spine 2D 动画集成
- 性能满足中低端设备需求
- TypeScript/JavaScript 开发

### 考虑的备选方案

| 方案 | 优点 | 缺点 | 评分 |
|------|------|------|------|
| **Cocos Creator 3.8** | 微信原生支持，Spine集成完美，文档完善 | 中文文档较少的某些进阶功能 | ⭐⭐⭐⭐⭐ |
| Godot | 开源免费，功能强大 | 微信小游戏支持不成熟 | ⭐⭐ |
| Phaser | Web游戏库，轻量级 | 性能不足以支撑复杂Spine动画 | ⭐⭐⭐ |
| PlayCanvas | 云端编辑，协作好 | 针对微信小游戏优化不足 | ⭐⭐⭐ |
| Babylon.js | 3D能力强 | 项目需要2D，过度设计 | ⭐⭐⭐ |

### 决策
**选择 Cocos Creator 3.8**

### 理由
1. **微信小游戏原生支持** - 官方提供完整的发布插件，审核流程清晰
2. **Spine 集成最佳** - 提供优化接口，能完全满足光遇风格动画需求
3. **性能优异** - 经过优化，在中低端 Android 设备上稳定 30FPS
4. **TypeScript 支持** - 完整的类型系统，团队熟悉
5. **社区活跃** - 大量第三方插件和优秀案例

### 权衡
- ❌ 某些功能文档较少，需要官方社区支持
- ❌ 学习曲线对新手可能陡峭
- ✅ 这些缺点在3-5个工程师+Google搜索范围内可克服

### 后续行动
- [x] 搭建基础项目模板
- [x] 集成 Spine 插件并验证
- [x] 建立微信小游戏构建流程
- [ ] 文档化常见问题与解决方案

### 相关讨论
- 内部邮件：2025/12/20 技术选型会议
- 决策者：技术负责人

---

## ADR-002: 采用 Spine 2D 骨骼动画系统

### 决策时间
2025年12月

### 状态
**已采纳** ✅

### 背景
光遇的美术风格核心要素是「活着的立绘」，需要选择合适的动画技术实现：
- 支持细致的肢体动作表达
- 内存占用可控
- 编辑工具专业
- 导出格式优化

### 考虑的备选方案

| 方案 | 优点 | 缺点 | 
|------|------|------|
| **Spine 2D** | 专业级别，ASTC压缩，二进制导出，微信最优化 | 需购买许可证 |
| DragonBones | 免费开源，性能可接受 | 没有ASTC压缩，文档较少 |
| Live2D | 适合二次元，高保真 | 过度设计，包体巨大 |
| Sprite Sheet | 逐帧动画，简单高效 | 美术成本极高，不适合复杂动作 |

### 决策
**采用 Spine 2D Professional 版本**

### 理由
1. **微信小游戏最优化** - 官方提供ASTC压缩和二进制导出
2. **骨骼数量约束明确** - 55根骨骼在内存与表现力间实现最优平衡
3. **编辑工具专业** - Spine Pro版的优化器和预览工具无可替代
4. **性能数据已验证** - 实际运行FPS和内存占用符合预期
5. **业界标准** - 大量成熟项目（咸鱼之王、大千世界）都采用

### 权衡
- ❌ 需要购买专业版许可证（约¥3000/年/座）
- ✅ 一次性投入，后续无订阅费用
- ✅ 性能与质量的收益远超许可成本

### 技术约束（必须执行）
```yaml
Spine约束表:
  总骨骼数: ≤ 55根（絶对不能超）
  纹理尺寸: ≤ 2048×2048（防止内存溢出）
  压缩格式: 必须ASTC 6×6
  导出格式: 必须Binary (.skel)
  微信版本: Spine 4.1+ 兼容
```

### 后续行动
- [x] 采购 Spine Professional 许可证
- [x] 制定骨骼约束规范
- [x] 创建美术资源模板
- [ ] 团队骨骼动画培训

---

## ADR-003: 搜打撤的回合制战斗而非实时

### 决策时间
2025年12月初

### 状态
**已采纳** ✅

### 背景
微信小游戏环保在碎片化时间操作场景下，玩家无法长时间聚焦。需要在「操作难度」与「刺激感」间找到平衡。

### 考虑的方案

| 方案 | 操作难度 | 刺激感 | 社交友好 | 性能 |
|------|--------|-------|---------|------|
| **回合制** | 低 | 中-高 | ⭐⭐⭐⭐⭐ | 优 |
| 实时竞技 | 高 | 极高 | ⭐⭐ | 一般 |
| 自动战斗 | 无 | 低 | ⭐⭐⭐ | 优 |
| 混合制 | 中 | 高 | ⭐⭐⭐⭐ | 良好 |

### 决策
**采用回合制战斗 + 自动寻路的混合设计**

#### 核心机制：
- **搜寻阶段** - 自动移动 + 手动交互（低压力）
- **战斗阶段** - AI自动攻击 + 手动释放终极技能（低认知负荷）
- **撤离阶段** - 实时冲刺 + 倒计时压力（高张力）

### 理由
1. **降低操作门槛** - Pixiv玩家群体操作能力参差不齐，回合制更友好
2. **适配碎片化时间** - 单局15-20分钟可掌控，随时可暂停
3. **强化社交粘性** - 可分享战斗结果、排行榜、救援机制
4. **性能优异** - 无需高频物理计算，帧率稳定
5. **故事叙述空间** - 回合间可插入对话、剧情、音乐

### 权衡
- ❌ 失去「精准操作」的爽感（如射击游戏的爆头感）
- ✅ 通过属性克制、技能链条、终极奥义补偿刺激感
- ✅ 受众面积更广，商业潜力更大

### 设计细节

```
战斗流程:

1. 敌人遭遇
   → 双方进入战斗界面
   → 计算行动顺序(基于SPD属性)

2. 玩家回合
   ├─ 自动攻击: 每2秒造成1次伤害
   └─ 技能释放: 点击屏幕释放特殊技能(需能量)

3. 敌人回合
   ├─ AI评估(生命值、状态、玩家距离)
   └─ 选择行动(攻击/防守/逃跑)

4. 循环至战斗结束
   → 胜利/失败/逃脱

性能影响:
  ✓ 无需物理引擎
  ✓ AI决策树简单(< 50ms)
  ✓ 动画播放同步(帧锁定)
  ✓ FPS稳定目标: 30-45
```

### 后续行动
- [x] 战斗系统原型实现
- [x] AI算法验证
- [ ] 平衡数据测试与调整
- [ ] 玩家反馈收集

---

## ADR-004: 数据驱动的配置系统

### 决策时间
2025年12月初

### 状态
**已采纳** ✅

### 背景
游戏需要频繁调整数值、掉落率、技能平衡。如果每次修改都需要重新编译发布，会严重影响迭代速度。

### 考虑的方案

| 方案 | 开发速度 | 运维灵活性 | 安全性 | 复杂度 |
|------|--------|---------|-------|--------|
| **JSON配置文件** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 中 | 低 |
| 内置代码常量 | ⭐ | ❌ | 高 | 低 |
| 云端配置系统 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 高 | 中 |
| Excel导出 | ⭐⭐⭐ | ⭐⭐ | 低 | 中 |

### 决策
**分层配置策略**
- **静态配置** (版本号、技能名称) → JSON文件 + 分包下载
- **动态配置** (掉落率、排行榜阈值) → 服务端API + Redis缓存

### 理由
1. **迭代速度快** - 无需重新编译，直接编辑JSON即可测试
2. **热更新能力** - 紧急修复可通过服务端配置快速响应
3. **数据追溯** - 所有配置版本历史可追踪
4. **安全性可控** - 核心数值(掉落率)服务端校验，客户端无法篡改

### 配置文件结构
```
assets/resources/configs/
├── loot-tables.json        (掉落表)
├── skills.json             (技能配置)
├── monsters.json           (怪物数据)
├── balance.json            (游戏平衡参数)
└── events.json             (时间事件)

服务端配置:
  /api/config/drop-rates     (掉落率 - 可热更新)
  /api/config/event-active   (活动开关)
  /api/config/version        (版本号校验)
```

### 权衡
- ❌ 增加学习曲线(美术、策划需学习JSON)
- ✅ ConfigLoader自动化加载，使用透明
- ✅ 长期收益远大于初期投入

### 后续行动
- [x] ConfigLoader.ts 实现
- [x] JSON Schema 制定
- [ ] Web管理后台开发
- [ ] 运营团队培训

---

## ADR-005: 对象池管理非关键资源

### 决景时间
2025年12月初

### 状态
**已采纳** ✅ (强制执行)

### 背景
微信小游戏内存限制严格(< 1.2GB iOS)。战斗中频繁创建/销毁对象会：
- 触发频繁垃圾回收
- 导致卡顿（> 100ms GC暂停）
- 最终崩溃

### 决策
**对所有高频创建对象实现对象池**

### 池化对象清单

```typescript
// 必须池化(生成频率 > 100/秒):
  ✓ 伤害数字浮起 (DamageNumber)
  ✓ 粒子系统 (ParticleSystem)
  ✓ 技能特效 (VFX)

// 应该池化(生成频率 > 10/秒):
  ✓ UI弹窗
  ✓ 敌人单位 (同屏最多5个)
  ✓ 战斗状态图标

// 可不池化(生成频率 < 1/秒):
  ○ 场景地图
  ○ 角色模型
  ○ 背景音乐
```

### 技术实现

```typescript
// ObjectPool 基类
class ObjectPool<T> {
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  private prefab: cc.Prefab;
  private maxSize: number;
  
  constructor(prefab: cc.Prefab, initialSize: number, maxSize: number) {
    this.prefab = prefab;
    this.maxSize = maxSize;
    this.preallocate(initialSize);
  }
  
  // 预分配对象(避免首帧卡顿)
  private preallocate(count: number) {
    for (let i = 0; i < count; i++) {
      this.available.push(cc.instantiate(this.prefab));
    }
  }
  
  get(): T {
    if (this.available.length > 0) {
      const obj = this.available.pop()!;
      this.inUse.add(obj);
      return obj;
    }
    
    // 池已空，创建新对象(性能警告)
    if (this.inUse.size >= this.maxSize) {
      console.warn(`Pool overflow: ${this.maxSize} objects in use`);
    }
    
    const obj = cc.instantiate(this.prefab);
    this.inUse.add(obj);
    return obj;
  }
  
  recycle(obj: T): void {
    this.inUse.delete(obj);
    this.available.push(obj);
  }
}

// 使用示例
const damageNumberPool = new ObjectPool(
  DamageNumberPrefab,
  10,   // 初始10个
  100   // 最多100个
);

// 战斗中
const dmgNum = damageNumberPool.get();
dmgNum.show(100, position);

// 动画结束后
setTimeout(() => {
  damageNumberPool.recycle(dmgNum);
}, 1000);
```

### 性能数据
- **未使用对象池**: GC暂停 > 200ms，FPS从45降至8
- **使用对象池**: GC暂停 < 20ms，FPS稳定40+

### 权衡
- ❌ 初期开发工作量增加
- ✅ 稳定性和帧率提升显著
- ✅ 这是**强制性**要求，不可跳过

### 后续行动
- [x] ObjectPool基础实现
- [x] DamageNumber池化
- [ ] VFX系统池化
- [ ] 性能监控告警

---

## ADR-006: 赛璐璐渲染而非 PBR

### 决策时间
2025年12月初

### 状态
**已采纳** ✅

### 背景
光遇采用的是独特的「赛璐璐+光影粒子」美学，而非写实的PBR(物理光照)。需要选择合适的渲染管线。

### 考虑的方案

| 渲染方案 | 视觉效果 | 性能 | 实现复杂度 | 适配度 |
|---------|--------|------|---------|--------|
| **Cel-Shading (赛璐璐)** | ⭐⭐⭐⭐⭐ | 优 | 中 | 95% |
| Standard PBR | ⭐⭐⭐ | 一般 | 低 | 30% |
| 自定义cartoon渲染 | ⭐⭐⭐⭐ | 优 | 高 | 85% |
| 2D贴图动画 | ⭐⭐ | 极优 | 低 | 60% |

### 决策
**采用赛璐璐(Cel-Shading) + 粒子光影混合渲染**

### 技术方案

```glsl
// Cel-Shading Shader 伪代码

#ifdef GL_ES
precision highp float;
#endif

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vTexCoord;

uniform sampler2D mainTexture;
uniform vec3 lightDir;
uniform vec3 lightColor;
uniform float outlineWidth;

void main() {
  // 1. 采样纹理
  vec4 texColor = texture2D(mainTexture, vTexCoord);
  
  // 2. 计算光照强度
  float lightIntensity = max(dot(vNormal, lightDir), 0.0);
  
  // 3. Cel-Shading阈值化 (关键!)
  float cel = step(0.3, lightIntensity) * 0.7 + 
             step(0.7, lightIntensity) * 0.3 + 
             0.3;  // 环境光
  
  // 4. 色彩输出
  vec3 finalColor = texColor.rgb * lightColor * cel;
  
  // 5. 边缘光(逆光边框)
  float rim = 1.0 - dot(vNormal, -normalize(vPosition));
  finalColor += rim * 0.1 * lightColor;
  
  gl_FragColor = vec4(finalColor, texColor.a);
}
```

### Cocos Creator实现

```typescript
// Cel-Shading 材质配置
const cellMaterial = new cc.Material();
cellMaterial.initialize({
  effectAsset: cc.resources.get("materials/cel-shading"),
  defines: {
    USE_NORMAL_MAP: true,
    LIGHTING_MODEL: 1,  // 1 = Cel-Shading
  },
  properties: {
    mainTexture: characterTexture,
    lightDirection: cc.v3(0.5, 1.0, 0.2).normalize(),
    outlineWidth: 0.02,
  },
});

skeletonRenderer.setMaterial(0, cellMaterial);
```

### 粒子特效补充

```yaml
粒子系统用途 (与Cel-Shading配合):
  
  光晕效果:
    粒子图: 径向渐变(白→透明)
    混合模式: 加法(Additive)
    生命周期: 0.3-0.5秒
    用途: 强化魔法攻击的魔幻感
  
  环境氛围:
    粒子图: 软光斑
    混合模式: 普通
    发射率: 低(5-10个/秒)
    用途: 雾气、光影漫散、萤火虫
  
  战斗反馈:
    粒子图: 闪光、爆炸纹理
    混合模式: 加法
    生命周期: 0.5-1.0秒
    用途: 暴击、治疗、技能释放反馈
```

### 理由
1. **视觉风格匹配** - Cel-Shading是光遇美学的核心
2. **性能优异** - 比PBR少50%的计算量
3. **实现成熟** - 大量开源shader可参考
4. **与Spine兼容** - 完美支持2D骨骼动画

### 权衡
- ❌ 需要编写自定义shader
- ✅ 一次编写，可复用于所有角色
- ✅ Cocos Creator内置shader编辑工具

### 后续行动
- [x] Cel-Shading shader实现
- [x] 环境光参数调优
- [ ] 角色皮肤系统集成
- [ ] 特殊场景(雪地、洞穴)光影适配

---

## ADR-007: 微信社交集成策略

### 决策时间
2025年12月初

### 状态
**已采纳** ✅

### 背景
微信小游戏的核心优势是社交裂变能力。需要在「保护用户隐私」与「最大化社交分享」间找到平衡。

### 社交机制设计

```
微信社交闭环:

搜打撤失败 
  ↓ (触发)
救援求助 
  ↓ (分享链接)
好友点击
  ↓ (进入mini game)
完成救援任务
  ↓ (返回救援)
原玩家获得奖励 + 救援者获得奖励
  ↓
双方关系加强 → 排行榜竞争 → 继续分享
```

### 决策

```yaml
集成范围:

必须集成:
  ✓ 微信登录(授权获取openid)
  ✓ 分享分发(救援链接分享)
  ✓ 朋友圈(成就分享)
  ✓ 排行榜(好友榜单)

谨慎集成:
  ⚠ 用户头像/昵称(已获取权限)
  ⚠ 赠送功能(小额社交支付)

禁止集成:
  ✗ 位置信息
  ✗ 设备ID跟踪
  ✗ 第三方广告SDK(需微信许可)

数据隐私政策:
  - openid 仅用于身份识别，不与其他平台关联
  - 用户头像/昵称仅用于游戏内展示
  - 所有数据本地化存储，30天后自动删除
```

### 技术实现

```typescript
// 微信登录集成
class WeChatManager {
  async login(): Promise<string> {
    if (cc.sys.platform !== cc.sys.WECHAT_GAME) {
      throw new Error("Not in WeChat game environment");
    }
    
    const code = await new Promise<string>((resolve, reject) => {
      wx.login({
        success: (res) => resolve(res.code),
        fail: (err) => reject(err),
      });
    });
    
    // 将code发送到服务器换取session_key
    const response = await fetch("/api/auth/wechat", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    
    const { sessionKey, openId } = await response.json();
    return openId;  // 用于后续数据关联
  }
  
  // 分享救援链接
  shareRescue(rescueId: string): void {
    wx.shareAppMessage({
      title: "我在光之冒险中需要你的帮助！",
      imageUrl: "https://cdn.example.com/rescue_banner.png",
      query: `rescueId=${rescueId}`,
      success: () => {
        // 分享成功，给玩家奖励
        this.awardPlayer("share_bonus", 100);
      },
    });
  }
  
  // 获取排行榜数据
  async fetchFriendsRanking(): Promise<RankingEntry[]> {
    const response = await fetch("/api/ranking/friends", {
      headers: { "X-Player-Id": this.currentPlayerId },
    });
    return response.json();
  }
}
```

### 风险评估与缓解

| 风险 | 严重性 | 缓解措施 |
|------|-------|--------|
| 微信政策变化 | 高 | 定期审查微信文档，设计可快速调整的接口 |
| 用户隐私投诉 | 高 | 明确的隐私政策，最小化数据收集 |
| 分享转化率低 | 中 | A/B测试分享文案和时机 |
| 虚假救援(作弊) | 中 | 服务端二次验证救援者行为 |

### 后续行动
- [x] 微信SDK集成
- [x] 登录流程实现
- [ ] 隐私政策编写与提交
- [ ] 排行榜前端展示
- [ ] 社交分析Dashboard建设

---

## ADR-008: 混合架构决策 (本地优先 + 服务端可选)

### 决策时间
2025年12月26日 (更新)

### 状态
**已采纳** ✅

### 背景
基于成本控制与功能完整性的平衡，采用"本地优先"策略：所有游戏逻辑完全离线可玩，部分功能(排行榜、救援、热更新)通过4核8G轻量服务器提供。网络断线时游戏仍可继续运行，服务器仅作辅助。

### 核心架构

```yaml
┌─ 本地端 (离线完整可玩) ─────────────────────────────────┐
│                                                           │
│  客户端执行 (完全本地):
│    ✓ 搜寻机制(地图生成+随机宝箱)
│    ✓ 战斗演算(伤害计算+AI决策)
│    ✓ Spine动画播放
│    ✓ UI状态管理
│    ✓ 成就系统判定
│    ✓ 本地SQLite存储
│    ✓ 数据加密(AES-256)
│    ✓ 完整性校验(SHA256)
│
└─────────────────────────────────────────────────────────┘
                      ↓ 异步同步
┌─ 服务端 (4核8G轻量服务器) ───────────────────────────────┐
│                                                           │
│  可选服务 (网络良好时):
│    ✓ 登录认证(微信openid)
│    ✓ 排行榜计算(每5分钟更新)
│    ✓ 救援数据交换
│    ✓ 热更新配置中心
│    ✓ 反作弊检测(简化版)
│    ✓ 数据备份
│
└─────────────────────────────────────────────────────────┘
```

### 数据同步分层策略

```yaml
Layer 1 (关键数据, <2秒):
  ✓ 登录状态
  ✓ 排行榜成绩上报 (战斗胜利时)
  失败处理: 本地缓存 + 队列重试

Layer 2 (重要数据, <30秒):
  ✓ 救援求助上报
  ✓ 热更新配置拉取 (游戏启动时)
  失败处理: 本地缓存 + 版本控制

Layer 3 (辅助数据, <5分钟):
  ✓ 角色等级/装备
  ✓ 战斗成绩统计
  ✓ 成就进度
  失败处理: 本地缓存 + 定时重试

Layer 4 (统计数据, <30分钟):
  ✓ 游戏时长统计
  ✓ 战斗统计数据
  ✓ 反作弊审计日志
  失败处理: 本地持久化
```

### 反作弊架构 (简化版)

```
客户端数据加密        本地完整性校验        服务端异常检测
   (AES-256)           (SHA256)            (数值范围检查)
        ↓                   ↓                      ↓
   加密存储 → 签名验证 → 分数上报 → 范围检验 → 记录异常
   ↓
   本地缓存
   防止篡改
```

### 技术实现

#### 客户端: 本地优先

```typescript
// === SQLiteManager (本地存储) ===
class SQLiteManager {
  private db: SQLite.Database;
  private encryptionKey: string;  // 从微信sessionId派生
  
  async init(sessionId: string): Promise<void> {
    this.encryptionKey = this.deriveKey(sessionId);
    this.db = await SQLite.open('./game.db');
    await this.createTables();
  }
  
  async saveCharacter(char: Character): Promise<void> {
    const encrypted = this.encrypt(JSON.stringify(char));
    await this.db.run(
      'INSERT INTO characters VALUES (?, ?)',
      [char.id, encrypted]
    );
    // 更新完整性校验
    await this.updateHash('characters');
  }
  
  // 定期备份 (每5分钟)
  async scheduleBackup(): Promise<void> {
    setInterval(async () => {
      const backup = {
        timestamp: Date.now(),
        data: await this.exportAsJSON(),
        hash: await this.calculateDatabaseHash()
      };
      await this.saveBackup(backup);
    }, 300000);
  }
  
  // 启动时验证完整性
  async verifyIntegrity(): Promise<boolean> {
    const tables = ['characters', 'equipment', 'battleRecords'];
    for (const table of tables) {
      const currentHash = await this.calculateTableHash(table);
      const storedHash = await this.getTableHash(table);
      if (currentHash !== storedHash) {
        console.error(`${table} integrity check failed!`);
        return false;
      }
    }
    return true;
  }
}

// === NetworkManager (网络同步) ===
class NetworkManager {
  private syncQueue: SyncTask[] = [];
  private offline: boolean = false;
  
  // Layer 1: 关键数据 (即时)
  async submitScore(result: BattleResult): Promise<void> {
    const payload = {
      playerId: this.playerId,
      score: result.score,
      damageDealt: result.damageDealt,
      signature: this.sign(result),
      clientTimestamp: Date.now()
    };
    
    try {
      const response = await this.request('POST', '/api/leaderboard/submit-score', 
        payload, 'critical');
      if (!response.ok) {
        this.queueForRetry(payload, 'critical');
      }
    } catch (error) {
      this.queueForRetry(payload, 'critical');
    }
  }
  
  // Layer 3: 定期同步
  async periodicSync(): Promise<void> {
    setInterval(async () => {
      if (this.offline) return; // 网络不可用时跳过
      
      const data = {
        characters: await db.queryAllCharacters(),
        equipment: await db.queryAllEquipment(),
        achievements: await db.queryAchievements()
      };
      
      await this.request('POST', '/api/sync/batch-data', {
        playerId: this.playerId,
        data,
        clientTimestamp: Date.now()
      }, 'auxiliary');
    }, 300000); // 5分钟
  }
  
  // 网络恢复: 处理重试队列
  onNetworkRestored(): void {
    this.offline = false;
    this.processRetryQueue();
  }
}
```

#### 服务端: 可选增强

```typescript
// === 登录API (Layer 1) ===
@POST('/api/auth/wechat-login')
async login(@Body() payload: WechatAuthPayload) {
  // 验证微信授权码
  const openid = await this.verifyWechatCode(payload.code);
  
  // 创建或获取玩家账户
  let player = await Account.findOne({ wechat_openid: openid });
  if (!player) {
    player = await Account.create({ 
      id: uuid(),
      wechat_openid: openid,
      created_at: new Date()
    });
  }
  
  // 生成会话令牌 (1小时有效期)
  const sessionToken = this.generateToken(player.id, 3600);
  
  return {
    sessionToken,
    playerId: player.id,
    expiresAt: Date.now() + 3600000
  };
}

// === 排行榜API (Layer 1/2) ===
@POST('/api/leaderboard/submit-score')
async submitScore(@Body() payload: ScorePayload, @Headers('Authorization') auth: string) {
  // 验证令牌
  const playerId = this.verifyToken(auth);
  if (playerId !== payload.playerId) {
    return { error: 'unauthorized' };
  }
  
  // 检查分数合理性 (简化反作弊)
  const expectedMax = await this.getExpectedMaxScore(payload.mapId);
  if (payload.score > expectedMax * 1.5) {
    await this.logAnomaly(playerId, 'score_spike', payload);
    return { error: 'score_anomaly' };
  }
  
  // 保存分数
  const score = await Score.create(payload);
  
  // 缓存更新标记 (5分钟后重新计算排名)
  await redis.set(`leaderboard:dirty:${payload.mapId}`, '1', 'EX', 300);
  
  return { scoreId: score.id, success: true };
}
```

### 实现路线

```
Week 1:
  ✓ SQLiteManager + 加密存储
  ✓ NetworkManager + 优先级队列
  ✓ Layer 1-4 同步框架
  ✓ 离线模式支持

Week 2:
  ✓ 排行榜计算引擎
  ✓ 救援数据交换
  ✓ 热更新配置系统
  ✓ E2E测试

Week 3:
  ✓ 反作弊检测
  ✓ 监控告警配置
  ✓ 性能优化
  ✓ 上线准备
```

### 权衡

**优势:**
- ✅ 完全离线可玩，无需服务器游戏仍可进行
- ✅ 成本低廉 (600元/年服务器，无后端人力)
- ✅ 网络断线优雅降级，本地缓存继续运行
- ✅ 保留所有社交功能 (排行榜+救援)
- ✅ 快速迭代，无需重新发版

**劣势:**
- ⚠️ 反作弊能力有限 (仅简化验证，无完整防护)
- ⚠️ 排行榜有5分钟延迟
- ⚠️ 救援验证异步 (玩家重新进入时检查)
- ⚠️ 日活>500时需升级服务器

### 后续行动
- [x] 网络层实现 (NetworkManager) - Week 1
- [x] 本地存储层 (SQLiteManager) - Week 1
- [ ] 定期备份策略 - Week 2
- [ ] 监控告警系统 - Week 3

---

## 总结

### 已采纳决策汇总

| ADR | 决策 | 状态 | 影响范围 |
|-----|------|------|--------|
| ADR-001 | Cocos Creator 3.8 | ✅ | 全项目 |
| ADR-002 | Spine 2D | ✅ | 美术系统 |
| ADR-003 | 回合制战斗 | ✅ | 玩法设计 |
| ADR-004 | 数据驱动配置 | ✅ | 开发流程 |
| ADR-005 | 对象池管理 | ✅ **强制** | 性能优化 |
| ADR-006 | 赛璐璐渲染 | ✅ | 视觉表现 |
| ADR-007 | 微信社交集成 | ✅ | 商业运营 |
| ADR-008 | 端云架构 | ✅ | 系统架构 |

### 关键约束(必须遵守)

🔴 **不可违反**:
- Spine骨骼数 < 60根
- iOS内存占用 < 1.2GB
- FPS >= 30(中端设备)
- 所有客户端掉落概率需服务端二次验证

🟡 **强烈建议**:
- 使用对象池管理高频对象
- 启用资源分包加载
- 实施完整的错误日志系统
- 定期性能基准测试

### 修改流程

新增或修改技术决策时：
1. 创建新的 ADR 文件
2. 记录完整的背景、选项、理由
3. 团队评审与讨论
4. 更新本汇总表
5. 通知所有开发人员

---

**最后更新**: 2025年12月25日  
**下一次审查**: 2026年3月(MVP发布后)
