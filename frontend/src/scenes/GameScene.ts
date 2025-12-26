import { _decorator, Component, Node, Camera, Canvas, Label, Button, ProgressBar, Prefab, instantiate, Vec3, Color, Animation } from 'cc';
import GameManager from '../managers/GameManager';
import { GameState, GameResult, MapData, BattleResult } from '../types/index';

const { ccclass, property } = _decorator;

/**
 * 主游戏场景
 * 流程：营地 → 地图选择 → 搜寻 → 战斗 → 撤离 → 结算
 */
@ccclass('GameScene')
export class GameScene extends Component {
  
  // ============= 游戏状态 =============
  private gameState: GameState = GameState.CAMP;
  private playerData: any = null;
  private currentMap: MapData | null = null;
  private gameSessionData: any = {};

  // ============= UI 组件引用 =============
  @property(Node) campUINode: Node | null = null;
  @property(Node) mapSelectUINode: Node | null = null;
  @property(Node) searchingUINode: Node | null = null;
  @property(Node) battleUINode: Node | null = null;
  @property(Node) extractionUINode: Node | null = null;
  @property(Node) settlementUINode: Node | null = null;

  // ============= 游戏资源 =============
  @property(Prefab) mapScenePrefab: Prefab | null = null;
  @property(Prefab) characterPrefab: Prefab | null = null;
  @property(Prefab) enemyPrefab: Prefab | null = null;

  // ============= 内部状态 =============
  private mapInstance: Node | null = null;
  private searchTimer: number = 0;
  private searchTimeLimit: number = 0;
  private collectedLoot: any[] = [];
  private encounteredEnemies: any[] = [];
  private isInBattle: boolean = false;

  async onLoad(): Promise<void> {
    console.log('🎮 GameScene 初始化中...');
    
    try {
      // 1. 初始化游戏管理器
      await GameManager.initialize(this.getWechatCode());
      
      // 2. 加载玩家数据
      this.playerData = await GameManager.getPlayerData();
      
      // 3. 初始化 UI
      this.initializeUI();
      
      // 4. 显示营地界面
      this.showCampUI();
      
      console.log('✓ GameScene 初始化完成');
    } catch (error) {
      console.error('❌ GameScene 初始化失败:', error);
      this.showErrorDialog('游戏初始化失败，请重试');
    }
  }

  // ============= 生命周期 =============
  
  update(deltaTime: number): void {
    if (this.gameState === GameState.SEARCHING) {
      this.updateSearching(deltaTime);
    }
  }

  // ============= 营地阶段 (Camp) =============

  private showCampUI(): void {
    console.log('📍 进入营地');
    this.gameState = GameState.CAMP;
    
    // 隐藏其他 UI
    this.hideAllUI();
    
    // 显示营地 UI
    if (this.campUINode) {
      this.campUINode.active = true;
      
      // 更新玩家信息显示
      this.updateCampDisplay();
      
      // 设置按钮监听
      const startButton = this.campUINode.getComponentInChildren(Button);
      if (startButton) {
        startButton.node.on('click', () => this.onStartGameClick());
      }
    }
  }

  private updateCampDisplay(): void {
    if (!this.campUINode || !this.playerData) return;

    // 显示玩家等级、金币、经验
    const levelLabel = this.campUINode.getChildByName('LevelLabel');
    const goldLabel = this.campUINode.getChildByName('GoldLabel');
    const expLabel = this.campUINode.getChildByName('ExpLabel');

    if (levelLabel) levelLabel.getComponent(Label)!.string = `Lv. ${this.playerData.level}`;
    if (goldLabel) goldLabel.getComponent(Label)!.string = `金币: ${this.playerData.gold}`;
    if (expLabel) expLabel.getComponent(Label)!.string = `经验: ${this.playerData.exp}`;
  }

  private onStartGameClick(): void {
    this.showMapSelectUI();
  }

  // ============= 地图选择阶段 (Map Select) =============

  private showMapSelectUI(): void {
    console.log('📍 进入地图选择');
    this.gameState = GameState.MAP_SELECT;
    
    this.hideAllUI();
    
    if (this.mapSelectUINode) {
      this.mapSelectUINode.active = true;
      
      // 显示 3-5 张地图选项
      this.displayAvailableMaps();
    }
  }

  private displayAvailableMaps(): void {
    // 获取可用地图列表
    const maps = [
      { id: 'map_001', name: '初心之林', difficulty: '普通', timeLimit: 10 * 60, enemies: 2 },
      { id: 'map_002', name: '雾隐沼泽', difficulty: '困难', timeLimit: 15 * 60, enemies: 3 },
      { id: 'map_003', name: '龙鳞峡谷', difficulty: '地狱', timeLimit: 20 * 60, enemies: 5 }
    ];

    // 为每个地图创建按钮
    if (this.mapSelectUINode) {
      const mapButtonsContainer = this.mapSelectUINode.getChildByName('MapButtons');
      if (mapButtonsContainer) {
        maps.forEach((map, index) => {
          const mapButton = mapButtonsContainer.children[index];
          if (mapButton) {
            // 更新地图信息显示
            const nameLabel = mapButton.getChildByName('NameLabel');
            const difficultyLabel = mapButton.getChildByName('DifficultyLabel');
            
            if (nameLabel) nameLabel.getComponent(Label)!.string = map.name;
            if (difficultyLabel) difficultyLabel.getComponent(Label)!.string = map.difficulty;

            // 设置点击事件
            const btn = mapButton.getComponent(Button);
            if (btn) {
              btn.node.on('click', () => this.selectMap(map));
            }
          }
        });
      }
    }
  }

  private async selectMap(map: MapData): Promise<void> {
    console.log(`🗺️  选择地图: ${map.name}`);
    this.currentMap = map;
    
    // 显示地图详情
    this.showMapInfoUI(map);
  }

  private showMapInfoUI(map: MapData): void {
    // 显示地图信息、推荐等级、预期收益
    // 用户确认后开始游戏
    const confirmButton = this.mapSelectUINode?.getChildByName('ConfirmButton');
    if (confirmButton) {
      confirmButton.getComponent(Button)?.node.on('click', () => {
        this.startGame(map);
      });
    }
  }

  private async startGame(map: MapData): Promise<void> {
    console.log('🎮 游戏开始');
    
    this.currentMap = map;
    this.searchTimeLimit = map.timeLimit;
    this.searchTimer = 0;
    this.collectedLoot = [];
    this.gameSessionData = {
      mapId: map.id,
      startTime: Date.now(),
      loot: [],
      battlesWon: 0,
      battlesLost: 0,
      damageDealt: 0,
      damageReceived: 0
    };

    // 隐藏选择界面
    this.hideAllUI();
    
    // 加载地图场景
    await this.loadMapScene(map);
    
    // 显示搜寻 UI
    this.showSearchingUI();
  }

  // ============= 搜寻阶段 (Searching) =============

  private async loadMapScene(map: MapData): Promise<void> {
    if (this.mapScenePrefab) {
      if (this.mapInstance) {
        this.mapInstance.destroy();
      }
      
      this.mapInstance = instantiate(this.mapScenePrefab);
      this.node.addChild(this.mapInstance);
      
      console.log(`✓ 地图 ${map.name} 已加载`);
    }
  }

  private showSearchingUI(): void {
    console.log('📍 进入搜寻阶段');
    this.gameState = GameState.SEARCHING;
    
    if (this.searchingUINode) {
      this.searchingUINode.active = true;
      
      // 初始化搜寻 UI（计时器、库存、地图等）
      this.updateSearchingUI();
    }
  }

  private updateSearching(deltaTime: number): void {
    this.searchTimer += deltaTime;

    // 更新搜寻 UI
    this.updateSearchingUI();

    // 检查搜寻时间是否到期
    if (this.searchTimer >= this.searchTimeLimit) {
      console.log('⏰ 搜寻时间到期，进入撤离阶段');
      this.initiateExtraction();
      return;
    }

    // 50% 概率每 5 秒触发一次敌人遭遇（难度调整）
    if (Math.random() < 0.05 && !this.isInBattle) {
      this.triggerEnemyEncounter();
    }
  }

  private updateSearchingUI(): void {
    if (!this.searchingUINode) return;

    const timeLabel = this.searchingUINode.getChildByName('TimeLabel');
    const remainingTime = this.searchTimeLimit - this.searchTimer;
    const minutes = Math.floor(remainingTime / 60);
    const seconds = Math.floor(remainingTime % 60);

    if (timeLabel) {
      timeLabel.getComponent(Label)!.string = `时间: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // 更新库存显示
    const lootLabel = this.searchingUINode.getChildByName('LootLabel');
    if (lootLabel) {
      lootLabel.getComponent(Label)!.string = `物品: ${this.collectedLoot.length}`;
    }

    // 显示撤离按钮（让玩家可以主动撤离）
    const extractButton = this.searchingUINode.getChildByName('ExtractButton');
    if (extractButton && !extractButton.getComponent(Button)?.target) {
      extractButton.getComponent(Button)?.node.on('click', () => {
        this.initiateExtraction();
      });
    }
  }

  private triggerEnemyEncounter(): void {
    console.log('⚔️  触发敌人遭遇');
    this.isInBattle = true;

    // 生成敌人
    const enemy = {
      id: `enemy_${Date.now()}`,
      name: '入侵者',
      level: Math.max(1, this.playerData.level - 2 + Math.floor(Math.random() * 4)),
      hp: 50 + Math.random() * 50,
      maxHp: 50 + Math.random() * 50,
      atk: 10 + Math.random() * 10,
      def: 5 + Math.random() * 5,
      spd: 5 + Math.random() * 5
    };

    this.encounteredEnemies = [enemy];

    // 进入战斗阶段
    this.startBattle(enemy);
  }

  // ============= 战斗阶段 (Battle) =============

  private async startBattle(enemy: any): Promise<void> {
    console.log('⚔️  进入战斗阶段');
    this.gameState = GameState.BATTLE;

    // 隐藏搜寻 UI，显示战斗 UI
    if (this.searchingUINode) this.searchingUINode.active = false;
    if (this.battleUINode) this.battleUINode.active = true;

    // 初始化战斗
    const battleManager = this.node.addComponent(BattleManager);
    const battleResult = await battleManager.conductBattle(this.playerData, enemy);

    // 处理战斗结果
    if (battleResult.winner === 'player') {
      console.log('✓ 战斗胜利！');
      this.gameSessionData.battlesWon++;
      this.gameSessionData.damageDealt += battleResult.damageDealt;
      this.gameSessionData.damageReceived += battleResult.damageReceived;
      
      // 获得战利品
      this.collectedLoot.push(...(battleResult.rewards || []));
    } else {
      console.log('✗ 战斗失败！');
      this.gameSessionData.battlesLost++;
      this.gameSessionData.damageReceived += battleResult.damageReceived;
      
      // 失败：失去部分物品
      this.handleBattleLoss();
    }

    // 移除战斗管理器
    battleManager.destroy();

    // 返回搜寻阶段
    this.gameState = GameState.SEARCHING;
    this.isInBattle = false;
    
    if (this.battleUINode) this.battleUINode.active = false;
    if (this.searchingUINode) this.searchingUINode.active = true;
  }

  private handleBattleLoss(): void {
    // 失败时失去 30% 的物品
    const lostCount = Math.ceil(this.collectedLoot.length * 0.3);
    this.collectedLoot = this.collectedLoot.slice(0, this.collectedLoot.length - lostCount);
    
    console.log(`⚠️  失去 ${lostCount} 件物品`);
  }

  // ============= 撤离阶段 (Extraction) =============

  private async initiateExtraction(): Promise<void> {
    console.log('🏃 进入撤离阶段');
    this.gameState = GameState.EXTRACTION;

    // 隐藏搜寻 UI
    if (this.searchingUINode) this.searchingUINode.active = false;

    // 显示撤离 UI
    if (this.extractionUINode) {
      this.extractionUINode.active = true;
      
      // 显示撤离倒计时（2-5 分钟）
      const extractionTime = 3 * 60;  // 3 分钟
      let remainingTime = extractionTime;

      const countdownLabel = this.extractionUINode.getChildByName('CountdownLabel');
      
      const countdownLoop = setInterval(() => {
        remainingTime--;
        
        if (countdownLabel) {
          const minutes = Math.floor(remainingTime / 60);
          const seconds = Math.floor(remainingTime % 60);
          countdownLabel.getComponent(Label)!.string = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        // 撤离成功
        if (remainingTime <= 0) {
          clearInterval(countdownLoop);
          this.completeExtraction();
        }
      }, 1000);

      // 增加敌人难度（撤离时敌人加强）
      if (Math.random() < 0.5) {
        setTimeout(() => {
          console.log('⚠️  发现更强的敌人！');
          this.triggerEnemyEncounter();
        }, 1000);
      }
    }
  }

  private async completeExtraction(): Promise<void> {
    console.log('✓ 成功撤离！');
    
    // 计算本局分数
    const score = this.calculateScore();
    
    // 显示结算界面
    await this.showSettlementUI({
      success: true,
      score,
      loot: this.collectedLoot,
      extractSuccess: true,
      duration: this.searchTimer,
      damageDealt: this.gameSessionData.damageDealt,
      damageReceived: this.gameSessionData.damageReceived
    });
  }

  private calculateScore(): number {
    // 分数计算公式
    const lootValue = this.collectedLoot.reduce((sum, item) => sum + (item.value || 0), 0);
    const timeBonus = Math.max(0, (this.searchTimeLimit - this.searchTimer) / 10);
    const battleBonus = this.gameSessionData.battlesWon * 100;
    const difficultyMultiplier = this.currentMap?.difficulty === '普通' ? 1 : this.currentMap?.difficulty === '困难' ? 1.5 : 2;

    return Math.floor((lootValue + timeBonus + battleBonus) * difficultyMultiplier);
  }

  // ============= 结算阶段 (Settlement) =============

  private async showSettlementUI(result: GameResult): Promise<void> {
    console.log('📍 进入结算阶段');
    this.gameState = GameState.SETTLEMENT;

    // 隐藏撤离 UI
    if (this.extractionUINode) this.extractionUINode.active = false;

    // 显示结算 UI
    if (this.settlementUINode) {
      this.settlementUINode.active = true;

      // 显示战利品列表
      const lootLabel = this.settlementUINode.getChildByName('LootLabel');
      if (lootLabel) {
        const lootText = this.collectedLoot.map(item => `${item.name} x${item.count || 1}`).join('\n');
        lootLabel.getComponent(Label)!.string = `战利品:\n${lootText}`;
      }

      // 显示分数
      const scoreLabel = this.settlementUINode.getChildByName('ScoreLabel');
      if (scoreLabel) {
        scoreLabel.getComponent(Label)!.string = `分数: ${result.score}`;
      }

      // 显示排名变化
      const rankLabel = this.settlementUINode.getChildByName('RankLabel');
      if (rankLabel) {
        rankLabel.getComponent(Label)!.string = `排名: 提升中...`;
      }

      // 提交分数到服务器
      await this.submitScore(result);

      // 设置返回营地按钮
      const returnButton = this.settlementUINode.getChildByName('ReturnButton');
      if (returnButton) {
        returnButton.getComponent(Button)?.node.on('click', () => {
          this.returnToCamp();
        });
      }
    }
  }

  private async submitScore(result: GameResult): Promise<void> {
    try {
      await GameManager.submitBattleResult({
        mapId: this.currentMap?.id || 'unknown',
        score: result.score,
        loot: this.collectedLoot,
        extractSuccess: result.extractSuccess,
        duration: result.duration,
        damageDealt: result.damageDealt,
        damageReceived: result.damageReceived
      });

      console.log('✓ 分数已提交');
    } catch (error) {
      console.error('❌ 分数提交失败:', error);
    }
  }

  private returnToCamp(): void {
    console.log('🏠 返回营地');
    
    // 清空游戏数据
    this.gameState = GameState.CAMP;
    this.currentMap = null;
    this.collectedLoot = [];
    this.encounteredEnemies = [];
    
    // 销毁地图场景
    if (this.mapInstance) {
      this.mapInstance.destroy();
      this.mapInstance = null;
    }

    // 隐藏所有 UI
    this.hideAllUI();
    
    // 重新加载玩家数据
    this.updateCampDisplay();
    
    // 显示营地 UI
    this.showCampUI();
  }

  // ============= 工具方法 =============

  private initializeUI(): void {
    // 初始化所有 UI 节点的隐藏状态
    this.hideAllUI();
  }

  private hideAllUI(): void {
    if (this.campUINode) this.campUINode.active = false;
    if (this.mapSelectUINode) this.mapSelectUINode.active = false;
    if (this.searchingUINode) this.searchingUINode.active = false;
    if (this.battleUINode) this.battleUINode.active = false;
    if (this.extractionUINode) this.extractionUINode.active = false;
    if (this.settlementUINode) this.settlementUINode.active = false;
  }

  private getWechatCode(): string {
    // 从 URL 参数或本地存储获取微信登录 code
    return new URLSearchParams(window.location.search).get('code') || 'test_code_001';
  }

  private showErrorDialog(message: string): void {
    console.error(message);
    // 显示错误对话框
    alert(message);
  }
}

/**
 * 战斗管理器
 * 处理单个战斗的完整流程
 */
@ccclass('BattleManager')
class BattleManager extends Component {
  
  private playerUnit: any;
  private enemyUnit: any;
  private turnOrder: any[] = [];
  private currentTurnIndex: number = 0;

  async conductBattle(player: any, enemy: any): Promise<BattleResult> {
    console.log('⚔️  战斗开始');
    
    this.playerUnit = {
      ...player,
      hp: player.hp || 100,
      maxHp: player.maxHp || 100,
      isDead: false
    };

    this.enemyUnit = {
      ...enemy,
      isDead: false
    };

    // 计算行动顺序（按速度）
    this.calculateTurnOrder();

    // 战斗主循环
    let battleLog = [];
    while (!this.isBattleOver()) {
      const currentUnit = this.turnOrder[this.currentTurnIndex];
      
      // 执行行动
      const action = currentUnit.id === this.playerUnit.id 
        ? this.getPlayerAction() 
        : this.getEnemyAction();

      // 计算伤害
      const damage = this.calculateDamage(currentUnit, action.target, action.skill);
      action.target.hp -= damage;
      
      if (action.target.hp <= 0) {
        action.target.isDead = true;
      }

      battleLog.push({
        actor: currentUnit.name,
        action: action.skill,
        damage,
        targetHp: action.target.hp
      });

      // 进行下一回合
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;

      // 暂停 1 秒以显示动画
      await this.sleep(1000);
    }

    // 确定战斗结果
    const winner = this.playerUnit.isDead ? 'enemy' : 'player';
    console.log(`战斗结束: ${winner === 'player' ? '玩家胜利' : '敌人胜利'}`);

    return {
      winner,
      damageDealt: this.calculateTotalDamage(battleLog, this.playerUnit.id),
      damageReceived: this.calculateTotalDamage(battleLog, this.enemyUnit.id),
      rewards: winner === 'player' ? this.generateRewards() : []
    };
  }

  private calculateTurnOrder(): void {
    this.turnOrder = [this.playerUnit, this.enemyUnit].sort((a, b) => b.spd - a.spd);
  }

  private isBattleOver(): boolean {
    return this.playerUnit.isDead || this.enemyUnit.isDead;
  }

  private getPlayerAction(): any {
    // 简化版：玩家总是使用普通攻击
    return {
      actor: this.playerUnit,
      target: this.enemyUnit,
      skill: 'attack',
      damage: this.playerUnit.atk * (0.8 + Math.random() * 0.4)
    };
  }

  private getEnemyAction(): any {
    // AI 决策：随机选择行动
    const actions = ['attack', 'defend', 'skill'];
    const selectedAction = actions[Math.floor(Math.random() * actions.length)];

    return {
      actor: this.enemyUnit,
      target: this.playerUnit,
      skill: selectedAction,
      damage: this.enemyUnit.atk * (0.8 + Math.random() * 0.4)
    };
  }

  private calculateDamage(attacker: any, defender: any, skill: string): number {
    let baseDamage = attacker.atk;
    
    if (skill === 'skill') {
      baseDamage *= 1.5;  // 技能伤害更高
    }

    // 防御减伤
    const defenseReduction = 1 - (defender.def / (defender.def + 100));
    const randomVariance = 0.9 + Math.random() * 0.2;

    return Math.floor(baseDamage * defenseReduction * randomVariance);
  }

  private calculateTotalDamage(battleLog: any[], unitId: string): number {
    return battleLog
      .filter(log => log.actor === unitId)
      .reduce((sum, log) => sum + log.damage, 0);
  }

  private generateRewards(): any[] {
    // 随机生成战利品
    const items = [
      { id: 'item_001', name: '金币', value: 100 + Math.random() * 200, count: 1 },
      { id: 'item_002', name: '铜币', value: 10 + Math.random() * 50, count: Math.floor(1 + Math.random() * 5) }
    ];

    return items.filter(() => Math.random() > 0.3);  // 30% 概率不掉落
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default GameScene;
