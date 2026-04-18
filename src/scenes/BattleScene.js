import Creature        from '../entities/Creature.js';
import BattleSystem, { ADVANTAGE } from '../systems/BattleSystem.js';
import BattleQueue      from '../systems/BattleQueue.js';
import GameState        from '../systems/GameState.js';
import { creatures as creatureData } from '../data/creatures.js';

const BAR_W          = 200;
const BAR_H          = 12;
const ALL_ARCHETYPES = ['Flying', 'Ground', 'Water'];

const HC_W      = 147;
const HC_H      = 155;
const HC_GAP    = 8;
const HC_X0     = 16;
const HC_Y      = 372;
const HC_BAR_W  = 131;
const HC_BAR_H  = 5;

const ARCH_COLOR   = { Flying: '#ffdd44', Ground: '#cc9944', Water: '#66aaff' };
const DEFEND_RATIO = 0.5; // incoming damage multiplier when defending

const DOT_SIZE = 9;
const DOT_GAP  = 4;
const DOT_Y    = 152;

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
  }

  create() {
    const { width, height } = this.scale;

    const archetype   = GameState.selectedArchetype || 'Flying';
    const enemyArch   = ALL_ARCHETYPES[Math.floor(Math.random() * ALL_ARCHETYPES.length)];
    const currentRound = (GameState.runFightWins ?? 0) + 1;
    const enemyLevel   = currentRound;

    const buildFallback = arch => {
      const pool = creatureData.filter(c => c.archetype === arch);
      return Array.from({ length: 5 }, () =>
        new Creature(pool[Math.floor(Math.random() * pool.length)], 1)
      );
    };

    const deckData   = GameState.selectedDeck;
    const playerDeck = deckData.length > 0
      ? deckData.map(d => { const c = new Creature(d, 1); c._farmUid = d.uid || null; return c; })
      : buildFallback(archetype);

    const enemyPool    = creatureData.filter(c => c.archetype === enemyArch);
    const scaleFactor  = 1 + (currentRound - 1) * 0.20; // +20% per round
    const enemyDeck = Array.from({ length: 5 }, () => {
      const tmpl = enemyPool[Math.floor(Math.random() * enemyPool.length)];
      const scaled = {
        ...tmpl,
        baseHp:  Math.round(tmpl.baseHp  * scaleFactor),
        baseAtk: Math.round(tmpl.baseAtk * scaleFactor),
        baseDef: Math.round(tmpl.baseDef * scaleFactor),
        baseSpd: Math.round(tmpl.baseSpd * scaleFactor),
      };
      return new Creature(scaled, 1);
    });
    this._currentRound = currentRound;

    const playerItems = [...(GameState.selectedItems || [])];

    this.battleSystem    = new BattleSystem(playerDeck, enemyDeck, playerItems);
    this._deckRoster     = [...playerDeck];
    this._activeCreature = playerDeck[0];

    this._deployPhase     = false;
    this._swapSelectPhase = false;
    this._resolving       = false;

    this._playerQueue = new BattleQueue(this._activeCreature);
    this._enemyQueue  = new BattleQueue(this.battleSystem.enemyHand[0]);

    // ── Static chrome ─────────────────────────────────────────────────────────
    this.add.rectangle(width / 2, 0, width, 58, 0x0d0d1a).setOrigin(0.5, 0);
    this.add.rectangle(width / 2, 58, width, 2, 0x2a2a50).setOrigin(0.5, 0);
    this.add.rectangle(width / 2, 258, width, 2, 0x2a2a50).setOrigin(0.5, 0);
    this.add.text(width / 2, 16, 'BATTLE', {
      fontSize: '20px', color: '#ff6b6b', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width - 14, 16, `Round ${currentRound}`, {
      fontSize: '13px', color: '#ffdd44', fontFamily: 'monospace',
    }).setOrigin(1, 0.5);

    // ── Deck counters ──────────────────────────────────────────────────────────
    this._playerDeckText = this.add.text(16, 38, '', {
      fontSize: '13px', color: '#88bbff', fontFamily: 'monospace',
    });
    this._enemyDeckText = this.add.text(width - 16, 38, '', {
      fontSize: '13px', color: '#ff8888', fontFamily: 'monospace',
    }).setOrigin(1, 0);

    // ── Sprite home positions ──────────────────────────────────────────────────
    this._playerHomeX = 155;
    this._enemyHomeX  = 645;

    // ── Player panel ──────────────────────────────────────────────────────────
    this._playerSprite = this.add.rectangle(this._playerHomeX, 155, 64, 64, 0x33aa55);
    this._playerName   = this.add.text(16, 68, '', {
      fontSize: '17px', color: '#a8ff78', fontFamily: 'monospace', fontStyle: 'bold',
    });
    this.add.rectangle(16, 96, BAR_W, BAR_H, 0x2a2a2a).setOrigin(0, 0.5);
    this._playerHpFill = this.add.rectangle(16, 96, BAR_W, BAR_H, 0x44ff44).setOrigin(0, 0.5);
    this._playerHpText = this.add.text(16, 103, '', {
      fontSize: '11px', color: '#aaffaa', fontFamily: 'monospace',
    });
    this._playerStats  = this.add.text(16, 116, '', {
      fontSize: '12px', color: '#cccccc', fontFamily: 'monospace',
    });
    this._playerAdvText = this.add.text(16, 130, '', {
      fontSize: '10px', fontFamily: 'monospace',
    });

    // Player stamina dots
    this.add.text(16, DOT_Y - 12, 'STAMINA', {
      fontSize: '8px', color: '#334433', fontFamily: 'monospace',
    });
    this._playerDotObjs = [];
    for (let i = 0; i < 4; i++) {
      const dot = this.add.rectangle(
        16 + i * (DOT_SIZE + DOT_GAP) + DOT_SIZE / 2,
        DOT_Y + DOT_SIZE / 2,
        DOT_SIZE, DOT_SIZE, 0x222244
      );
      this._playerDotObjs.push(dot);
    }

    // ── Enemy panel ───────────────────────────────────────────────────────────
    this._enemySprite = this.add.rectangle(this._enemyHomeX, 155, 64, 64, 0xaa3333);
    this._enemyName   = this.add.text(width - 16, 68, '', {
      fontSize: '17px', color: '#ff8888', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(1, 0);
    this.add.rectangle(width - 16 - BAR_W, 96, BAR_W, BAR_H, 0x2a2a2a).setOrigin(0, 0.5);
    this._enemyHpFill = this.add.rectangle(width - 16 - BAR_W, 96, BAR_W, BAR_H, 0xff4444).setOrigin(0, 0.5);
    this._enemyHpText = this.add.text(width - 16, 103, '', {
      fontSize: '11px', color: '#ffaaaa', fontFamily: 'monospace',
    }).setOrigin(1, 0);
    this._enemyStats  = this.add.text(width - 16, 116, '', {
      fontSize: '12px', color: '#cccccc', fontFamily: 'monospace',
    }).setOrigin(1, 0);
    this._enemyAdvText = this.add.text(width - 16, 130, '', {
      fontSize: '10px', fontFamily: 'monospace',
    }).setOrigin(1, 0);

    // Enemy stamina dots (right-aligned)
    this.add.text(width - 16, DOT_Y - 12, 'STAMINA', {
      fontSize: '8px', color: '#443333', fontFamily: 'monospace',
    }).setOrigin(1, 0);
    this._enemyDotObjs = [];
    for (let i = 0; i < 4; i++) {
      const dot = this.add.rectangle(
        width - 16 - (3 - i) * (DOT_SIZE + DOT_GAP) - DOT_SIZE / 2,
        DOT_Y + DOT_SIZE / 2,
        DOT_SIZE, DOT_SIZE, 0x222244
      );
      this._enemyDotObjs.push(dot);
    }

    // ── Battle log ────────────────────────────────────────────────────────────
    this.add.rectangle(width / 2, 210, width - 32, 68, 0x080814).setOrigin(0.5);
    this._logText = this.add.text(width / 2, 210, '', {
      fontSize: '12px', color: '#dddddd', fontFamily: 'monospace',
      wordWrap: { width: width - 56 }, align: 'center',
    }).setOrigin(0.5);

    // ── Phase + queue display ─────────────────────────────────────────────────
    this._phaseText = this.add.text(width / 2, 252, '', {
      fontSize: '12px', color: '#ffdd44', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this._queueText = this.add.text(width / 2, 268, '', {
      fontSize: '10px', color: '#7799bb', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // ── Action buttons ────────────────────────────────────────────────────────
    const btnY    = 302;
    const btnDefs = [
      { key: 'ATK',     label: '[ATK]',    x: width / 2 - 278, color: '#ff9966' },
      { key: 'DEFEND',  label: '[DEF]',    x: width / 2 - 178, color: '#66aaff' },
      { key: 'SPECIAL', label: '[SPEC!]',  x: width / 2 - 70,  color: '#ff44cc' },
      { key: 'ITEM',    label: '[ITEM]',   x: width / 2 + 40,  color: '#ffdd44' },
      { key: 'SWAP',    label: '[SWAP]',   x: width / 2 + 148, color: '#cc88ff' },
    ];
    this._buttons = {};
    btnDefs.forEach(({ key, label, x, color }) => {
      const btn = this.add.text(x, btnY, label, {
        fontSize: '17px', color, fontFamily: 'monospace',
        backgroundColor: '#141428', padding: { x: 8, y: 5 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => { if (!btn.getData('disabled')) btn.setScale(1.08); });
      btn.on('pointerout',  () => btn.setScale(1));
      btn.on('pointerdown', () => { if (!btn.getData('disabled')) this._queueAction(key); });
      this._buttons[key] = btn;
    });

    // END TURN button
    this._endTurnBtn = this.add.text(width / 2 + 256, btnY, '[END]', {
      fontSize: '17px', color: '#a8ff78', fontFamily: 'monospace',
      backgroundColor: '#141428', padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this._endTurnBtn.on('pointerover', () => { if (!this._endTurnBtn.getData('disabled')) this._endTurnBtn.setScale(1.08); });
    this._endTurnBtn.on('pointerout',  () => this._endTurnBtn.setScale(1));
    this._endTurnBtn.on('pointerdown', () => { if (!this._endTurnBtn.getData('disabled')) this._onEndTurn(); });

    this._itemLabel = this.add.text(width / 2 + 40, 330, '', {
      fontSize: '9px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this._specialLabel = this.add.text(width / 2 - 70, 330, '', {
      fontSize: '9px', color: '#aa2288', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // ── Deploy / swap banner ──────────────────────────────────────────────────
    this._deployBanner = this.add.text(width / 2, HC_Y - 20, '', {
      fontSize: '13px', color: '#ffdd44', fontFamily: 'monospace',
    }).setOrigin(0.5).setVisible(false);

    // ── Victory / defeat overlay ──────────────────────────────────────────────
    this._statusText = this.add.text(width / 2, height / 2, '', {
      fontSize: '38px', color: '#ffffff', fontFamily: 'monospace',
      backgroundColor: '#000000', padding: { x: 28, y: 14 },
    }).setOrigin(0.5).setDepth(20).setVisible(false);

    // ── Hand UI ───────────────────────────────────────────────────────────────
    this._buildHandUI();
    this._startTurn();
  }

  // ── Turn lifecycle ────────────────────────────────────────────────────────

  _startTurn() {
    const activePlayer = this.battleSystem.playerHand[0];
    const activeEnemy  = this.battleSystem.enemyHand[0];

    this._playerQueue = new BattleQueue(activePlayer);
    this._enemyQueue  = new BattleQueue(activeEnemy);
    this._resolving   = false;

    this._phaseText.setText('> Queue your actions, then [ END ]');
    this._queueText.setText('');
    this._refreshStaminaDots();
    this._refreshUI();
    this._setQueueButtons(true);
  }

  // ── Action queueing ───────────────────────────────────────────────────────

  _queueAction(key) {
    if (this._resolving || this.battleSystem.isOver()) return;

    if (key === 'SWAP') {
      if (this._deckRoster.filter(c => c.isAlive()).length <= 1) return;
      this._swapSelectPhase = true;
      this._setQueueButtons(false);
      this._deployBanner.setText('\u25bc Choose creature to swap in \u25bc').setVisible(true);
      this._refreshHandUI();
      return;
    }

    if (key === 'ITEM') {
      this._openItemQueueMenu();
      return;
    }

    if (key === 'SPECIAL') {
      this._openSpecialMenu();
      return;
    }

    const ok = this._playerQueue.queueAction(key);
    if (!ok) return;

    this._refreshStaminaDots();
    this._updateQueueText();
    this._setQueueButtons(true);
  }

  _queueSwap(rosterIdx) {
    const chosen = this._deckRoster[rosterIdx];
    if (!chosen || !chosen.isAlive() || chosen === this._activeCreature) return;

    this._playerQueue.queueAction('SWAP', rosterIdx);
    this._swapSelectPhase = false;
    this._deployBanner.setVisible(false);
    this._updateQueueText();
    this._onEndTurn();
  }

  _onEndTurn() {
    if (this._resolving || this.battleSystem.isOver()) return;

    this._resolving       = true;
    this._swapSelectPhase = false;
    this._deployBanner.setVisible(false);
    this._setQueueButtons(false);
    this._phaseText.setText('... Resolving');

    this._generateEnemyQueue();
    this.time.delayedCall(200, () => this._startResolution());
  }

  _generateEnemyQueue() {
    const enemy  = this.battleSystem.enemyHand[0];
    const player = this.battleSystem.playerHand[0];
    if (!enemy?.isAlive() || !player?.isAlive()) return;

    const eRatio = enemy.currentHP / enemy.getStats().hp;
    const max    = this._enemyQueue.maxStamina;

    const hasAdvantage  = ADVANTAGE[enemy.archetype] === player.archetype;
    const round         = this._currentRound ?? 1;
    // Enemies defend less and use Specials more as rounds increase
    const defendThresh  = Math.max(0.15, 0.4 - round * 0.025);
    const specialChance = Math.min(0.85, 0.35 + round * 0.05);

    for (let i = 0; i < max; i++) {
      if (!this._enemyQueue.canAfford()) break;
      if (eRatio < defendThresh && i === 0) {
        this._enemyQueue.queueAction('DEFEND');
      } else if (this._enemyQueue.canAfford(2) && Math.random() < specialChance) {
        this._enemyQueue.queueAction('SPECIAL', null, 2);
      } else {
        this._enemyQueue.queueAction('ATK');
      }
    }

    this._refreshStaminaDots();
  }

  // ── Resolution — paired simultaneous slots ────────────────────────────────

  _startResolution() {
    const pActions = this._playerQueue.get();
    const eActions = this._enemyQueue.get();

    // Pair up by slot index; extras (e.g. Flying's slot 4) have null on the other side
    const maxSlots = Math.max(pActions.length, eActions.length);
    const pairs = [];
    for (let i = 0; i < maxSlots; i++) {
      pairs.push({ p: pActions[i] || null, e: eActions[i] || null });
    }

    this._resolvePairs(pairs, 0);
  }

  _resolvePairs(pairs, idx) {
    if (idx >= pairs.length) {
      this._postResolution();
      return;
    }

    const { p, e } = pairs[idx];
    const next = () => this.time.delayedCall(300, () => this._resolvePairs(pairs, idx + 1));
    this._resolvePair(p, e, next);
  }

  _resolvePair(pAct, eAct, onComplete) {
    const sys    = this.battleSystem;
    let   player = sys.playerHand[0];
    const enemy  = sys.enemyHand[0];

    // Skip entirely if both creatures are dead
    if (!player?.isAlive() && !enemy?.isAlive()) { onComplete(); return; }

    // ── SWAP: execute first, then remaining action is e vs new creature ───────
    if (pAct?.type === 'SWAP') {
      const chosen = this._deckRoster[pAct.payload];
      if (chosen?.isAlive() && chosen !== this._activeCreature) {
        sys.swapCreature(chosen);
        this._activeCreature = chosen;
        sys._log(`Swapped to ${chosen.name}!`);
        this._refreshUI();
      }
      // Resolve only enemy's slot action (against new creature, no player attack)
      this._resolvePair(null, eAct, onComplete);
      return;
    }

    // ── Compute damage for both sides simultaneously ───────────────────────────
    player = sys.playerHand[0]; // refresh after possible swap
    const pIsAtk     = pAct?.type === 'ATK'     && player?.isAlive() && enemy?.isAlive();
    const pIsSpecial = pAct?.type === 'SPECIAL'  && player?.isAlive() && enemy?.isAlive();
    const pIsDef     = pAct?.type === 'DEFEND'  && player?.isAlive();
    const pIsItem    = pAct?.type === 'ITEM'    && player?.isAlive();
    const eIsAtk     = eAct?.type === 'ATK'     && enemy?.isAlive()  && player?.isAlive();
    const eIsSpecial = eAct?.type === 'SPECIAL'  && enemy?.isAlive()  && player?.isAlive();
    const eIsDef     = eAct?.type === 'DEFEND'  && enemy?.isAlive();

    let playerDmg = 0; // damage dealt TO enemy
    let enemyDmg  = 0; // damage dealt TO player

    if (pIsAtk) {
      const aStats = player.getStats();
      const dStats = enemy.getStats();
      const adv    = ADVANTAGE[player.archetype] === enemy.archetype ? 1.5 : 1;
      playerDmg = Math.max(1, Math.ceil((aStats.atk - dStats.def) * adv));
      if (eIsDef) playerDmg = Math.max(1, Math.ceil(playerDmg * DEFEND_RATIO));
    }

    if (pIsSpecial) {
      playerDmg = sys._calcSpecialDmg(player, enemy);
      if (eIsDef) playerDmg = Math.max(1, Math.ceil(playerDmg * DEFEND_RATIO));
    }

    if (eIsAtk) {
      const aStats = enemy.getStats();
      const dStats = player.getStats();
      const adv    = ADVANTAGE[enemy.archetype] === player.archetype ? 1.5 : 1;
      enemyDmg = Math.max(1, Math.ceil((aStats.atk - dStats.def) * adv));
      if (pIsDef) enemyDmg = Math.max(1, Math.ceil(enemyDmg * DEFEND_RATIO));
    }

    if (eIsSpecial) {
      enemyDmg = sys._calcSpecialDmg(enemy, player);
      if (pIsDef) enemyDmg = Math.max(1, Math.ceil(enemyDmg * DEFEND_RATIO));
    }

    // ── Apply damage simultaneously ───────────────────────────────────────────
    if (playerDmg > 0) enemy.takeDamage(playerDmg);
    if (enemyDmg  > 0) player.takeDamage(enemyDmg);

    // ── Apply item ────────────────────────────────────────────────────────────
    if (pIsItem && sys.playerItems.length > 0) {
      const itemIdx = pAct.payload;
      if (itemIdx !== null && itemIdx < sys.playerItems.length) {
        const [sel] = sys.playerItems.splice(itemIdx, 1);
        sys.playerItems.unshift(sel);
      }
      sys.playerAction('ITEM', 0);
    }

    // ── Log ───────────────────────────────────────────────────────────────────
    const advTagP  = (pIsAtk    && ADVANTAGE[player.archetype] === enemy.archetype)  ? ' [ADV]'   : '';
    const superTagP = (pIsSpecial && ADVANTAGE[player.archetype] === enemy.archetype)  ? ' [SUPER]' : '';
    const advTagE  = (eIsAtk    && ADVANTAGE[enemy.archetype]  === player.archetype) ? ' [ADV]'   : '';
    const superTagE = (eIsSpecial && ADVANTAGE[enemy.archetype]  === player.archetype) ? ' [SUPER]' : '';

    if (pIsAtk)     sys._log(`${player.name} hits ${enemy.name} for ${playerDmg}${eIsDef ? ' [DEF]' : ''}${advTagP}.`);
    if (pIsSpecial) sys._log(`${player.name} uses ${player.special?.name ?? 'Special'}! ${playerDmg} dmg${eIsDef ? ' [DEF]' : ''}${superTagP}.`);
    if (eIsAtk)     sys._log(`${enemy.name} hits ${player.name} for ${enemyDmg}${pIsDef ? ' [DEF]' : ''}${advTagE}.`);
    if (eIsSpecial) sys._log(`${enemy.name} uses ${enemy.special?.name ?? 'Special'}! ${enemyDmg} dmg${pIsDef ? ' [DEF]' : ''}${superTagE}.`);
    if (pIsDef && !eIsAtk && !eIsSpecial) sys._log(`${player.name} defends.`);
    if (eIsDef && !pIsAtk && !pIsSpecial) sys._log(`${enemy.name} defends.`);

    // ── Animate both at the same time ─────────────────────────────────────────
    const needsPlayerAnim = pIsAtk || pIsSpecial;
    const needsEnemyAnim  = eIsAtk || eIsSpecial;

    if (!needsPlayerAnim && !needsEnemyAnim) {
      this._refreshUI();
      onComplete();
      return;
    }

    let pending = (needsPlayerAnim ? 1 : 0) + (needsEnemyAnim ? 1 : 0);
    const animDone = () => {
      pending--;
      if (pending === 0) {
        this._refreshUI();
        this._handleFades(player, enemy, onComplete);
      }
    };

    if (needsPlayerAnim) {
      this.tweens.add({
        targets: this._playerSprite, x: this._playerHomeX + 22,
        duration: 110, yoyo: true, ease: 'Quad.easeOut',
        onComplete: () => { this._playerSprite.x = this._playerHomeX; animDone(); },
      });
    }

    if (needsEnemyAnim) {
      this.tweens.add({
        targets: this._enemySprite, x: this._enemyHomeX - 22,
        duration: 110, yoyo: true, ease: 'Quad.easeOut',
        onComplete: () => { this._enemySprite.x = this._enemyHomeX; animDone(); },
      });
    }
  }

  // Fade sprites for any creatures that died in the last pair, then continue
  _handleFades(player, enemy, onComplete) {
    let pending = 0;
    const fadeDone = () => { pending--; if (pending === 0) onComplete(); };

    if (enemy  && !enemy.isAlive())  { pending++; this._fadeSprite(this._enemySprite,  fadeDone); }
    if (player && !player.isAlive()) { pending++; this._fadeSprite(this._playerSprite, fadeDone); }
    if (pending === 0) onComplete();
  }

  _postResolution() {
    const sys = this.battleSystem;
    sys.nextTurn(); // cull dead, reset turn tracker
    this._refreshUI();
    this._refreshStaminaDots();

    if (sys.isOver()) {
      this._endBattle();
      return;
    }

    if (!this._activeCreature.isAlive()) {
      this._enterDeployPhase();
      return;
    }

    if (sys.playerHand[0]?.isAlive()) {
      this._activeCreature = sys.playerHand[0];
    }

    this.time.delayedCall(400, () => this._startTurn());
  }

  // ── Stamina dots ──────────────────────────────────────────────────────────

  _refreshStaminaDots() {
    const pDots = this._playerQueue.getStaminaDots();
    const eDots = this._enemyQueue.getStaminaDots();
    const pMax  = this._playerQueue.maxStamina;
    const eMax  = this._enemyQueue.maxStamina;

    for (let i = 0; i < this._playerDotObjs.length; i++) {
      if (i < pMax) {
        this._playerDotObjs[i].setFillStyle(pDots[i] ? 0x44ff88 : 0x223322).setVisible(true);
      } else {
        this._playerDotObjs[i].setVisible(false);
      }
    }

    for (let i = 0; i < this._enemyDotObjs.length; i++) {
      if (i < eMax) {
        this._enemyDotObjs[i].setFillStyle(eDots[i] ? 0xff5566 : 0x332222).setVisible(true);
      } else {
        this._enemyDotObjs[i].setVisible(false);
      }
    }
  }

  _updateQueueText() {
    const q = this._playerQueue.get();
    if (q.length === 0) { this._queueText.setText(''); return; }
    const labels = { ATK: 'ATK', DEFEND: 'DEF', SPECIAL: 'SP!', ITEM: 'ITEM', SWAP: 'SWAP' };
    this._queueText.setText('Queue: ' + q.map(a => labels[a.type] || a.type).join(' \u203a '));
  }

  // ── Button state ──────────────────────────────────────────────────────────

  _setQueueButtons(enabled) {
    const sys           = this.battleSystem;
    const afford1       = enabled && this._playerQueue.canAfford(1);
    const afford2       = enabled && this._playerQueue.canAfford(2);
    const hasItem       = sys.playerItems.length > 0;
    const canSwap       = this._deckRoster.filter(c => c.isAlive()).length > 1;

    Object.entries(this._buttons).forEach(([key, btn]) => {
      let dis = false;
      if (key === 'SPECIAL') dis = !afford2;
      else if (!afford1)     dis = true;
      else if (key === 'ITEM' && !hasItem) dis = true;
      else if (key === 'SWAP' && !canSwap) dis = true;
      btn.setData('disabled', dis).setAlpha(dis ? 0.35 : 1);
    });

    this._endTurnBtn.setData('disabled', !enabled).setAlpha(enabled ? 1 : 0.35);
  }

  // ── Item queue overlay ────────────────────────────────────────────────────

  _openItemQueueMenu() {
    const { width, height } = this.scale;
    const sys = this.battleSystem;

    const objs      = [];
    const closeMenu = () => objs.forEach(o => o.destroy());

    const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.72)
      .setDepth(50).setInteractive();
    objs.push(backdrop);
    backdrop.on('pointerdown', () => { closeMenu(); this._setQueueButtons(true); });

    const PANEL_W = 340;
    const ITEM_H  = 54;
    const PAD_TOP = 46;
    const PAD_BOT = 14;
    const panelH  = PAD_TOP + sys.playerItems.length * ITEM_H + PAD_BOT;
    const panelY  = height / 2 - panelH / 2;

    objs.push(this.add.rectangle(width / 2, height / 2, PANEL_W, panelH, 0x111122).setDepth(51));

    const gfx = this.add.graphics().setDepth(51);
    gfx.lineStyle(2, 0x664488, 1);
    gfx.strokeRect(width / 2 - PANEL_W / 2, panelY, PANEL_W, panelH);
    objs.push(gfx);

    objs.push(this.add.text(width / 2, panelY + 14, 'QUEUE ITEM', {
      fontSize: '16px', color: '#cc88ff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(52));

    objs.push(this.add.text(width / 2, panelY + panelH - 10, 'Click outside to cancel', {
      fontSize: '10px', color: '#333344', fontFamily: 'monospace',
    }).setOrigin(0.5, 1).setDepth(52));

    sys.playerItems.forEach((item, i) => {
      const iy = panelY + PAD_TOP + i * ITEM_H;
      const iW = PANEL_W - 20;

      const itemBg = this.add.rectangle(width / 2, iy + (ITEM_H - 6) / 2, iW, ITEM_H - 6, 0x1a1133).setDepth(52);
      objs.push(itemBg);

      objs.push(this.add.text(width / 2 - iW / 2 + 6, iy + 6, item.name, {
        fontSize: '13px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0, 0).setDepth(53));

      const typeColor = item.type === 'heal' ? '#44ff88' : item.type === 'atkBuff' ? '#ff9966' : '#66aaff';
      objs.push(this.add.text(width / 2 - iW / 2 + 6, iy + 24, item.description, {
        fontSize: '11px', color: typeColor, fontFamily: 'monospace',
      }).setOrigin(0, 0).setDepth(53));

      const hit = this.add.rectangle(width / 2, iy + (ITEM_H - 6) / 2, iW, ITEM_H - 6, 0x000000, 0)
        .setDepth(54).setInteractive({ useHandCursor: true });
      objs.push(hit);

      hit.on('pointerover', () => itemBg.setFillStyle(0x2a1a44));
      hit.on('pointerout',  () => itemBg.setFillStyle(0x1a1133));
      hit.on('pointerdown', () => {
        closeMenu();
        const ok = this._playerQueue.queueAction('ITEM', i);
        if (ok) { this._refreshStaminaDots(); this._updateQueueText(); }
        this._setQueueButtons(true);
      });
    });
  }

  // ── Special attack menu ───────────────────────────────────────────────────

  _openSpecialMenu() {
    const { width, height } = this.scale;
    const creature = this.battleSystem.playerHand[0];
    if (!creature) return;
    // Fall back to creatureData lookup if Creature constructor ran without the special field
    const sp = creature.special
      ?? creatureData.find(c => c.id === creature.id)?.special
      ?? null;
    if (!sp) return;

    const objs      = [];
    const closeMenu = () => objs.forEach(o => o.destroy());

    const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.72)
      .setDepth(50).setInteractive();
    objs.push(backdrop);
    backdrop.on('pointerdown', () => { closeMenu(); this._setQueueButtons(true); });

    const PANEL_W = 340;
    const ITEM_H  = 62;
    const PAD_TOP = 46;
    const PAD_BOT = 14;
    const panelH  = PAD_TOP + ITEM_H + PAD_BOT;
    const panelY  = height / 2 - panelH / 2;

    objs.push(this.add.rectangle(width / 2, height / 2, PANEL_W, panelH, 0x110d1a).setDepth(51));

    const gfx = this.add.graphics().setDepth(51);
    gfx.lineStyle(2, 0xcc22aa, 1);
    gfx.strokeRect(width / 2 - PANEL_W / 2, panelY, PANEL_W, panelH);
    objs.push(gfx);

    objs.push(this.add.text(width / 2, panelY + 14, 'SPECIAL ATTACK  [2 stamina]', {
      fontSize: '14px', color: '#ff44cc', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(52));

    objs.push(this.add.text(width / 2, panelY + panelH - 10, 'Click outside to cancel', {
      fontSize: '10px', color: '#332233', fontFamily: 'monospace',
    }).setOrigin(0.5, 1).setDepth(52));

    const iW    = PANEL_W - 20;
    const iy    = panelY + PAD_TOP;
    const itemBg = this.add.rectangle(width / 2, iy + (ITEM_H - 6) / 2, iW, ITEM_H - 6, 0x1a0d22).setDepth(52);
    objs.push(itemBg);

    const elementColors = { Wind: '#aaddff', Lightning: '#ffff44', Earth: '#cc9944', Tide: '#44aaff' };
    const elColor = elementColors[sp.element] || '#ff44cc';

    objs.push(this.add.text(width / 2 - iW / 2 + 6, iy + 5, sp.name, {
      fontSize: '14px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0, 0).setDepth(53));

    objs.push(this.add.text(width / 2 - iW / 2 + 6, iy + 22, `[${sp.element}]  ${sp.desc}`, {
      fontSize: '10px', color: elColor, fontFamily: 'monospace',
      wordWrap: { width: iW - 12 },
    }).setOrigin(0, 0).setDepth(53));

    const hit = this.add.rectangle(width / 2, iy + (ITEM_H - 6) / 2, iW, ITEM_H - 6, 0x000000, 0)
      .setDepth(54).setInteractive({ useHandCursor: true });
    objs.push(hit);

    hit.on('pointerover', () => itemBg.setFillStyle(0x2a1a3a));
    hit.on('pointerout',  () => itemBg.setFillStyle(0x1a0d22));
    hit.on('pointerdown', () => {
      closeMenu();
      const ok = this._playerQueue.queueAction('SPECIAL', null, 2);
      if (ok) { this._refreshStaminaDots(); this._updateQueueText(); }
      this._setQueueButtons(true);
    });
  }

  // ── Deploy mechanic ───────────────────────────────────────────────────────

  _enterDeployPhase() {
    this._deployPhase = true;
    this._deployBanner.setText('\u25bc Choose your next creature \u25bc').setVisible(true);
    this._playerSprite.setVisible(false);
    this._setQueueButtons(false);
    this._refreshHandUI();
  }

  _deployCreature(rosterIdx) {
    const sys    = this.battleSystem;
    const chosen = this._deckRoster[rosterIdx];
    if (!chosen || !chosen.isAlive()) return;

    const idx = sys.playerHand.indexOf(chosen);
    if (idx > 0) {
      sys.playerHand.splice(idx, 1);
      sys.playerHand.unshift(chosen);
    }

    this._activeCreature = chosen;
    this._deployPhase    = false;
    this._deployBanner.setVisible(false);
    this._playerSprite.setVisible(true);
    sys._log(`${chosen.name} deployed!`);
    this._refreshUI();

    this.time.delayedCall(200, () => this._startTurn());
  }

  // ── Hand UI ───────────────────────────────────────────────────────────────

  _buildHandUI() {
    this._handCards = [];

    for (let i = 0; i < this._deckRoster.length; i++) {
      const cx = HC_X0 + i * (HC_W + HC_GAP);
      const cy = HC_Y;

      const bg       = this.add.rectangle(cx + HC_W / 2, cy + HC_H / 2, HC_W, HC_H, 0x0d0d1a);
      const border   = this.add.graphics();
      const nameText = this.add.text(cx + HC_W / 2, cy + 6, '', {
        fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      const archText = this.add.text(cx + HC_W / 2, cy + 20, '', {
        fontSize: '9px', color: '#444466', fontFamily: 'monospace',
      }).setOrigin(0.5, 0);
      const hpBarBg   = this.add.rectangle(cx + 8, cy + 33, HC_BAR_W, HC_BAR_H, 0x2a2a2a).setOrigin(0, 0.5);
      const hpBarFill = this.add.rectangle(cx + 8, cy + 33, HC_BAR_W, HC_BAR_H, 0x44ff44).setOrigin(0, 0.5);
      const hpText    = this.add.text(cx + HC_W / 2, cy + 40, '', {
        fontSize: '9px', color: '#aaffaa', fontFamily: 'monospace',
      }).setOrigin(0.5, 0);
      const statsText = this.add.text(cx + HC_W / 2, cy + 54, '', {
        fontSize: '9px', color: '#cccccc', fontFamily: 'monospace',
      }).setOrigin(0.5, 0);
      const abilText  = this.add.text(cx + HC_W / 2, cy + 68, '', {
        fontSize: '8px', color: '#554466', fontFamily: 'monospace',
        wordWrap: { width: HC_W - 8 },
      }).setOrigin(0.5, 0);
      const statusText = this.add.text(cx + HC_W / 2, cy + HC_H - 22, '', {
        fontSize: '10px', fontFamily: 'monospace',
      }).setOrigin(0.5, 0);

      const hit = this.add
        .rectangle(cx + HC_W / 2, cy + HC_H / 2, HC_W, HC_H, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      const ii = i;
      hit.on('pointerover', () => {
        const c = this._deckRoster[ii];
        if (this._deployPhase     && c?.isAlive()) bg.setFillStyle(0x1a1a3a);
        if (this._swapSelectPhase && c?.isAlive() && c !== this._activeCreature) bg.setFillStyle(0x2a1a3a);
      });
      hit.on('pointerout', () => {
        if (!this._deployPhase && !this._swapSelectPhase) bg.setFillStyle(0x0d0d1a);
        else this._refreshHandCard(ii);
      });
      hit.on('pointerdown', () => {
        const c = this._deckRoster[ii];
        if (this._deployPhase     && c?.isAlive()) this._deployCreature(ii);
        else if (this._swapSelectPhase && c?.isAlive() && c !== this._activeCreature) this._queueSwap(ii);
      });

      this._handCards.push({ cx, cy, bg, border, nameText, archText,
        hpBarBg, hpBarFill, hpText, statsText, abilText, statusText, hit });
    }
  }

  _refreshHandCard(i) {
    const card     = this._handCards[i];
    const creature = this._deckRoster[i];
    if (!card || !creature) return;

    const alive     = creature.isAlive();
    const isActive  = creature === this._activeCreature && alive;
    const isDead    = !alive;
    const canDeploy = this._deployPhase     && alive && !isActive;
    const canSwap   = this._swapSelectPhase && alive && !isActive;
    const stats     = creature.getStats();

    card.bg.setFillStyle(isDead ? 0x080808 : isActive ? 0x0a0a22 : 0x0d0d1a);

    card.border.clear();
    let borderColor = 0x1a1a3a, borderW = 1;
    if (isActive)       { borderColor = 0x4466bb; borderW = 2; }
    else if (canDeploy) { borderColor = 0xffdd44; borderW = 2; }
    else if (canSwap)   { borderColor = 0xcc88ff; borderW = 2; }
    else if (isDead)    { borderColor = 0x220000; }
    card.border.lineStyle(borderW, borderColor, 1);
    card.border.strokeRect(card.cx, card.cy, HC_W, HC_H);

    const archColor   = ARCH_COLOR[creature.archetype] || '#aaaaaa';
    const alpha       = isDead ? 0.35 : 1;
    const displayName = creature.name.length > 16 ? creature.name.slice(0, 15) + '\u2026' : creature.name;
    card.nameText.setText(displayName).setColor(archColor).setAlpha(alpha);

    const activeEnemy = this.battleSystem.enemyHand.find(c => c.isAlive());
    let archLabel = `[${creature.archetype}]`, archColor2 = '#444466';
    if (!isDead && activeEnemy) {
      if (ADVANTAGE[creature.archetype] === activeEnemy.archetype)        { archLabel = `[${creature.archetype}] \u2191`; archColor2 = '#66cc66'; }
      else if (ADVANTAGE[activeEnemy.archetype] === creature.archetype)   { archLabel = `[${creature.archetype}] \u2193`; archColor2 = '#cc5555'; }
    }
    card.archText.setText(archLabel).setColor(archColor2).setAlpha(isDead ? 0.25 : 0.85);

    const ratio = Math.max(0, creature.currentHP / stats.hp);
    card.hpBarFill.setSize(Math.max(2, Math.floor(HC_BAR_W * ratio)), HC_BAR_H);
    card.hpBarFill.setFillStyle(isDead ? 0x333333 : ratio > 0.5 ? 0x44ff44 : ratio > 0.25 ? 0xffdd44 : 0xff3333);
    card.hpText
      .setText(isDead ? 'FAINTED' : `${Math.max(0, creature.currentHP)}/${stats.hp}`)
      .setColor(isDead ? '#441111' : '#aaffaa').setAlpha(alpha);

    card.statsText.setText(`ATK:${stats.atk}  DEF:${stats.def}  SPD:${stats.spd}`).setAlpha(alpha);
    card.abilText.setText(`\u2726 ${creature.ability.name}`).setAlpha(isDead ? 0.2 : 0.6);

    if (isActive)       card.statusText.setText('\u25b2 ACTIVE').setColor('#5588cc');
    else if (isDead)    card.statusText.setText('\u2715 FAINTED').setColor('#442222');
    else if (canDeploy) card.statusText.setText('\u25ba DEPLOY').setColor('#ffdd44');
    else if (canSwap)   card.statusText.setText('\u21c4 SWAP IN').setColor('#cc88ff');
    else                card.statusText.setText('');
  }

  _refreshHandUI() {
    for (let i = 0; i < this._handCards.length; i++) this._refreshHandCard(i);
  }

  // ── UI helpers ────────────────────────────────────────────────────────────

  _refreshUI() {
    const sys    = this.battleSystem;
    const player = sys.playerHand.find(c => c.isAlive());
    const enemy  = sys.enemyHand.find(c => c.isAlive());

    this._playerDeckText.setText(`You: ${sys.playerHand.filter(c => c.isAlive()).length}/${this._deckRoster.length}`);
    this._enemyDeckText.setText(`Enemy: ${sys.enemyHand.filter(c => c.isAlive()).length}/5`);

    if (player) {
      const ps = player.getStats();
      this._playerName.setText(player.name);
      this._playerStats.setText(`ATK ${ps.atk}  DEF ${ps.def}  SPD ${ps.spd}`);
      this._setHpBar(this._playerHpFill, this._playerHpText, player.currentHP, ps.hp);
      this._playerSprite.setVisible(true);
    } else {
      this._playerName.setText('\u2014');
      this._playerStats.setText('');
      this._playerHpText.setText('');
      this._playerAdvText.setText('');
      this._playerSprite.setVisible(false);
    }

    if (enemy) {
      const es = enemy.getStats();
      this._enemyName.setText(enemy.name);
      this._enemyStats.setText(`ATK ${es.atk}  DEF ${es.def}  SPD ${es.spd}`);
      this._setHpBar(this._enemyHpFill, this._enemyHpText, enemy.currentHP, es.hp);
      this._enemySprite.setVisible(true);
    } else {
      this._enemyName.setText('\u2014');
      this._enemyStats.setText('');
      this._enemyHpText.setText('');
      this._enemyAdvText.setText('');
      this._enemySprite.setVisible(false);
    }

    if (player && enemy) {
      const pAdv = this._advantageLabel(player.archetype, enemy.archetype);
      const eAdv = this._advantageLabel(enemy.archetype, player.archetype);
      this._playerAdvText.setText(pAdv.text).setColor(pAdv.color);
      this._enemyAdvText.setText(eAdv.text).setColor(eAdv.color);
    }

    const log = sys.battleLog;
    this._logText.setText(log.length > 0 ? log.slice(-2).join('\n') : '...');

    const itemCount = sys.playerItems.length;
    this._itemLabel.setText(
      itemCount > 0
        ? `${sys.playerItems[0].name}${itemCount > 1 ? ` (${itemCount})` : ''}`
        : '(empty)'
    );

    const activePlayer = sys.playerHand.find(c => c.isAlive());
    const spName = activePlayer
      ? (activePlayer.special?.name ?? creatureData.find(c => c.id === activePlayer.id)?.special?.name ?? '')
      : '';
    this._specialLabel.setText(spName);

    this._refreshHandUI();
  }

  _setHpBar(fill, label, current, max) {
    const ratio = Math.max(0, Math.min(1, current / max));
    fill.setSize(Math.max(2, Math.floor(BAR_W * ratio)), BAR_H);
    fill.setFillStyle(ratio > 0.5 ? 0x44ff44 : ratio > 0.25 ? 0xffdd44 : 0xff3333);
    label.setText(`${Math.max(0, current)}/${max}`);
  }

  _advantageLabel(myArch, theirArch) {
    if (ADVANTAGE[myArch] === theirArch)  return { text: `\u2191 ADV (beats ${theirArch})`,  color: '#88ff88' };
    if (ADVANTAGE[theirArch] === myArch)  return { text: `\u2193 WEAK (to ${theirArch})`,    color: '#ff8888' };
    return { text: '\u2014 EVEN', color: '#888888' };
  }

  _fadeSprite(sprite, cb) {
    this.tweens.add({
      targets: sprite, alpha: 0, duration: 280,
      onComplete: () => { sprite.setAlpha(1); cb(); },
    });
  }

  // ── End battle ────────────────────────────────────────────────────────────

  _endBattle() {
    this._setQueueButtons(false);
    this._endTurnBtn.setData('disabled', true).setAlpha(0.35);
    this._statusText.setVisible(true);

    GameState.selectedDeck = GameState.selectedDeck.filter((_, i) =>
      this._deckRoster[i]?.isAlive()
    );

    const deadUids = this._deckRoster
      .filter(c => !c.isAlive() && c._farmUid)
      .map(c => c._farmUid);
    if (deadUids.length > 0) {
      GameState.removeDeadRunCreatures(deadUids);
    } else {
      GameState.saveGame();
    }

    if (this.battleSystem.playerWon()) {
      this._statusText.setText('Victory!').setColor('#a8ff78');
      this.time.delayedCall(1400, () => {
        const capturable = this.battleSystem.getCapturableCreature();
        this.scene.start('CaptureScene', { capturable, returnToMap: true });
      });
    } else {
      this._statusText.setText('Defeated!').setColor('#ff6b6b');
      this.time.delayedCall(1400, () => {
        GameState.clearRun();
        this.scene.start('MenuScene');
      });
    }
  }
}
