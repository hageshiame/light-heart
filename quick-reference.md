# 光遇-搜打撤 微信小游戏：快速参考指南

> **文档用途**: 快速查找技术规范、配置参数、代码示例，用于日常开发决策

---

## 快速导航

| 类别 | 关键指标 | 参考值 | 优先级 |
|------|--------|-------|--------|
| **性能** | FPS | 30-45 | P0 |
| **性能** | 内存(iOS) | < 1.2GB | P0 |
| **性能** | 首屏加载 | < 3s | P0 |
| **美术** | Spine骨骼数 | < 60 | P1 |
| **美术** | 同屏粒子数 | < 500 | P1 |
| **网络** | API响应时间 | < 500ms | P1 |
| **渲染** | DrawCall数 | < 80 | P1 |

---

## 1. 美术资源规范速查

### 1.1 颜色参考表

```
设计色系:
  主色调(强调)    #F4D03F 金色    RGB(244,208,63)
  辅助色(友好)    #87CEEB 天蓝    RGB(135,206,235)
  警告色(危险)    #E74C3C 红色    RGB(231,76,60)
  文本色(深灰)    #34495E          RGB(52,73,94)
  背景色(浅灰)    #ECF0F1          RGB(236,240,241)

光遇光影色:
  逆光(暖)       #FFB347 暖橙
  环境光(冷)     #87CEEB 天蓝
  高光(白)       #FFF0E6 温白
  阴影(深)       #0A0E27 深蓝
```

### 1.2 字体规范

```
标题:     36px Bold      (Pixiv手书体 或 思源黑体)
正文:     20px Regular   (系统默认 或 Arial)
辅文:     16px Regular   (灰色 #7F8C8D)
行高:     1.5 × 字号
字距:     0.05em
```

### 1.3 Spine导出清单

```
✓ 使用 Spine 4.1+ Binary 导出
✓ 纹理尺寸: 2048×2048 (最大4096×4096)
✓ ASTC 6×6 压缩
✓ 骨骼数: < 55根
✓ 路径: assets/resources/characters/{id}/
  - skeleton.skel
  - skeleton.atlas
  - skeleton.png
```

---

## 2. 核心数值速查表

### 2.1 伤害计算

```
公式:
EffectiveDamage = ((BaseATK × SkillMultiplier) / (TargetDEF + 100)) 
                × ElementModifier 
                × (1 + RandomVariance)
                × CritMultiplier

参数范围:
  BaseATK:          10-1000+
  SkillMultiplier:  0.8-2.5
  TargetDEF:        5-500+
  ElementModifier:  0.8 / 1.0 / 1.2
  RandomVariance:   0.8-1.2
  CritMultiplier:   1.5x (如果暴击)

快速计算示例:
  玩家ATK=100, 敌人DEF=50, 无属性修正:
  伤害 = 100 / 150 ≈ 67 DPS
```

### 2.2 经验等级表

```
等级 1-10:   Level × 100 经验
等级 11-20:  Level × 150 + (Level-10)² × 50
等级 21-30:  Level × 200 + (Level-20)³ × 10

总经验累计:
  Lv10: 5,500
  Lv20: 32,500
  Lv30: ~180,000
```

### 2.3 掉落概率表

```
普通物品:   60%
稀有物品:   25%
史诗物品:   12%
传奇物品:   3%

奖励倍数:
  普通战斗:  1.0x
  成功撤离:  1.5x
  完美撤离:  2.0x
  失败撤离:  0.8x
```

---

## 3. 性能指标监控

### 3.1 FPS 检查命令

```bash
# iOS 性能监控
adb logcat | grep "FPS"

# Cocos Creator 内置监控
cc.debug.setDisplayStats(true);

# 目标值
  低端机:   20-30 FPS
  中端机:   30-45 FPS
  高端机:   45+ FPS
```

### 3.2 内存占用监控

```typescript
// 代码示例
if (cc.sys.platform === cc.sys.WECHAT_GAME) {
  const memInfo = wx.getSystemInfoSync().memoryLimit;
  console.log("内存限制:", memInfo / (1024 * 1024), "MB");
  
  // 目标: < 1.2GB
  if (memInfo > 1200 * 1024 * 1024) {
    console.warn("即将内存溢出");
    this.triggerGC();
  }
}
```

### 3.3 关键性能告警

| 指标 | 告警值 | 严重级别 | 应对 |
|------|-------|--------|------|
| FPS < 20 | 3s | 🔴 紧急 | 立即降质 |
| 内存 > 1.3GB | 实时 | 🔴 紧急 | 触发GC |
| API > 1000ms | 实时 | 🟡 警告 | 检查网络 |
| 崩溃率 > 2% | 日汇总 | 🟡 警告 | 紧急修复 |

---

## 4. 配置文件参考

### 4.1 game.json (微信配置)

```json
{
  "networkTimeout": 30000,
  "iOSHighPerformance": true,
  
  "subpackages": [
    {
      "name": "map_forest",
      "root": "assets/resources/scenes/forest"
    },
    {
      "name": "characters",
      "root": "assets/resources/characters"
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

### 4.2 物品配置示例 (JSON)

```json
{
  "loot_chest_rarity_1": {
    "items": [
      { "itemId": "potion_hp", "weight": 40, "count": [1, 3] },
      { "itemId": "gold_coin", "weight": 50, "count": [10, 30] }
    ],
    "exp": 50,
    "lootCertificate": { "points": 5 }
  }
}
```

### 4.3 技能配置示例

```yaml
skill_normal_attack:
  id: "normal_attack"
  name: "普通攻击"
  type: "physical"
  cooldown: 0
  energyCost: 0
  
  formula:
    base: 100
    scaling: { atk: 0.8 }
  
  accuracy: 1.0
  critRate: 0.15
  critDamage: 1.5
  
  animationName: "attack_punch"
  damageFrameIndex: 8
```

---

## 5. 常用代码片段

### 5.1 对象池实现

```typescript
class ObjectPool<T> {
  private pool: T[] = [];
  private prefab: cc.Prefab;
  
  get(): T {
    return this.pool.length > 0 ? this.pool.pop()! : cc.instantiate(this.prefab);
  }
  
  recycle(obj: T): void {
    this.pool.push(obj);
  }
}
```

### 5.2 日志打印

```typescript
class Logger {
  static info(tag: string, msg: string, data?: any) {
    console.log(`[${tag}] ${msg}`, data);
  }
  
  static error(tag: string, msg: string, err?: Error) {
    console.error(`[${tag}] ❌ ${msg}`, err);
    this.reportToServer("error", tag, msg, err);
  }
}

// 使用
Logger.info("BattleSystem", "Battle started", { playerId });
Logger.error("NetworkManager", "Failed to load", networkError);
```

### 5.3 异步资源加载

```typescript
async loadCharacter(characterId: string) {
  try {
    const skeleton = await cc.loader.loadRes(
      `characters/${characterId}/skeleton`,
      sp.SkeletonData
    );
    return skeleton;
  } catch (error) {
    Logger.error("ResourceManager", "Failed to load character", error);
    throw error;
  }
}
```

---

## 6. UI组件规范

### 6.1 按钮标准

```
尺寸:       120×50px
圆角:       8px
边框:       2px #F4D03F
背景:       渐变(深灰→深灰)
文字:       20px 白色 Bold
悬停效果:   缩放1.05x, 音效
按下效果:   缩放0.95x, 背景变深
禁用状态:   透明度0.5
```

### 6.2 进度条标准

```
高度:       8px
圆角:       4px
背景:       #ECF0F1
填充:       渐变 #87CEEB → #F4D03F
动画:       线性填充, 无过冲
```

---

## 7. 打包发布清单

### 7.1 发布前检查

```bash
□ 代码无console.log
□ 所有错误已处理
□ 资源已压缩 (ASTC)
□ 分包已配置
□ iOSHighPerformance = true
□ 无内存泄漏
□ FPS > 30
□ CDN已部署
□ 微信审核完成
```

### 7.2 构建命令

```bash
# 构建微信小游戏
cc build --platform wechatgame --project-path=. --build-path=dist

# 本地预览
cc preview --platform wechatgame

# 性能分析
npm run profile
```

---

## 8. 常见问题速查

| 问题 | 症状 | 解决方案 |
|------|------|--------|
| Spine卡顿 | FPS<30 | 降低骨骼数量 / 使用贴图动画 |
| 内存溢出 | 应用闪退 | 启用对象池 / 及时释放资源 |
| 包体过大 | 超过8MB | 启用分包 / 压缩纹理 |
| API超时 | 网络请求失败 | 增加超时时间 / 重试机制 |
| 撤离失败 | 玩家困惑 | 优化UI提示和音效反馈 |

---

## 9. 季节内容检查表

### 9.1 新赛季上线

```
[ ] 新地图美术完成
[ ] 新角色模型导出
[ ] 新技能数值平衡
[ ] 排行榜重置逻辑
[ ] 赛季公告编写
[ ] CDN资源预热
[ ] 服务器扩容验证
[ ] 公测反馈收集
```

---

## 10. 联系方式 & 文档链接

### 技术文档
- **详细设计文档**: `implementation-guide.md`
- **原始需求文档**: `design.md`
- **此快速参考**: `quick-reference.md`

### 推荐资源
- Cocos Creator 3.8 官方文档: https://docs.cocos.com/creator/3.8/
- Spine 官方文档: http://esotericsoftware.com/spine-user-guide/
- 微信小游戏文档: https://developers.weixin.qq.com/miniprogram/

---

**最后更新**: 2025年12月25日  
**维护者**: 游戏开发团队  
**版本**: 1.0.0 Production Ready
