import Creature     from '../entities/Creature.js';
import BattleSystem  from '../systems/BattleSystem.js';
import GameState     from '../systems/GameState.js';
import { creatures as creatureData } from '../data/creatures.js';

const BAR_W          = 200;
const BAR_H          = 12;
const ALL_ARCHETYPES = ['Flying', 'Ground', 'Water'];

// ── Hand card constants ────────────────────────────────────────────────────
const HC_W      = 147;   // hand card width
const HC_H      = 158;   // hand card height
const HC_GAP    = 8;
// 5 cards: 5*147 + 4*8 = 767 → startX = (800-767)/2 = 16
const HC_X0     = 16;
const HC_Y      = 352;   // top of hand cards
const HC_BAR_W  = 131;   // HP bar width inside card (HC_W - 16)
const HC_BAR_H  = 5;

const ARCH_COLOR = { Flying: '#ffdd44', Ground: '#cc9944', Water: '#66aaff' };

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
  }

  create() {
    const { width, height } = this.scale;

    const archetype = GameState.selectedArchetype || 'Flying';
    const enemyArch = ALL_ARCHETYPES[Math.floor(Math.random() * ALL_ARCHETYPES.length)];

    // ── Build player deck (from DeckBuilderScene selection, or fallback) ──────
    const buildFallback = arch => {
      const pool = creatureData.filter(c => c.archetype === arch);
      return Array.from({ length: 5 }, () =>
        new Creature(pool[Math.floor(Math.random() * pool.length)], 1)
      );
    };

    const deckData   = GameState.selectedDeck;
    const playerDeck = deckData.length > 0
      ? deckData.map(d => new Creature(d, 1))
      : buildFallback(archetype);

    const enemyPool = creatureData.filter(c => c.archetype === enemyArch);
    const enemyDeck = Array.from({ length: 5 }, () =>
      new Creature(enemyPool[Math.floor(Math.random() * enemyPool.length)], 1)
    );

    const playerItems = [...(GameState.selectedItems || [])];

    this.battleSystem      = new BattleSystem(playerDeck, enemyDeck, playerItems);
    this._actionInProgress = false;
    this._deployPhase      = false;

    // Track the full roster (fixed order, used for hand display + deploy)
    this._deckRoster       = [...playerDeck];
    this._activeCreature   = playerDeck[0];   // reference to currently deployed creature

    // ── Static chrome ────────────────────────────────────────────────────────
    this.add.rectangle(width / 2, 0, width, 58, 0x0d0d1a).setOrigin(0.5, 0);
    this.add.rectangle(width / 2, 58, width, 2, 0x2a2a50).setOrigin(0.5, 0);
    this.add.rectangle(width / 2, 258, width, 2, 0x2a2a50).setOrigin(0.5, 0);
    this.add.text(width / 2, 16, 'BATTLE', {
      fontSize: '20px', color: '#ff6b6b', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    // ── Deck counters ────────────────────────────────────────────────────────
    this._playerDeckText = this.add.text(16, 38, '', {
      fontSize: '13px', color: '#88bbff', fontFamily: 'monospace',
    });
    this._enemyDeckText = this.add.text(width - 16, 38, '', {
      fontSize: '13px', color: '#ff8888', fontFamily: 'monospace',
    }).setOrigin(1, 0);

    // ── Sprite home positions ────────────────────────────────────────────────
    this._playerHomeX = 155;
    this._enemyHomeX  = 645;

    // ── Player panel (left) ──────────────────────────────────────────────────
    this._playerSprite = this.add.rectangle(this._playerHomeX, 160, 64, 64, 0x33aa55);

    this._playerName = this.add.text(16, 68, '', {
      fontSize: '17px', color: '#a8ff78', fontFamily: 'monospace', fontStyle: 'bold',
    });
    this.add.rectangle(16, 100, BAR_W, BAR_H, 0x2a2a2a).setOrigin(0, 0.5);
    this._playerHpFill = this.add.rectangle(16, 100, BAR_W, BAR_H, 0x44ff44).setOrigin(0, 0.5);
    this._playerHpText = this.add.text(16, 108, '', {
      fontSize: '11px', color: '#aaffaa', fontFamily: 'monospace',
    });
    this._playerStats = this.add.text(16, 122, '', {
      fontSize: '12px', color: '#cccccc', fontFamily: 'monospace',
    });

    // ── Enemy panel (right) ──────────────────────────────────────────────────
    this._enemySprite = this.add.rectangle(this._enemyHomeX, 160, 64, 64, 0xaa3333);

    this._enemyName = this.add.text(width - 16, 68, '', {
      fontSize: '17px', color: '#ff8888', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(1, 0);
    this.add.rectangle(width - 16 - BAR_W, 100, BAR_W, BAR_H, 0x2a2a2a).setOrigin(0, 0.5);
    this._enemyHpFill = this.add.rectangle(width - 16 - BAR_W, 100, BAR_W, BAR_H, 0xff4444).setOrigin(0, 0.5);
    this._enemyHpText = this.add.text(width - 16, 108, '', {
      fontSize: '11px', color: '#ffaaaa', fontFamily: 'monospace',
    }).setOrigin(1, 0);
    this._enemyStats = this.add.text(width - 16, 122, '', {
      fontSize: '12px', color: '#cccccc', fontFamily: 'monospace',
    }).setOrigin(1, 0);

    // ── Battle log ───────────────────────────────────────────────────────────
    this.add.rectangle(width / 2, 210, width - 32, 68, 0x080814).setOrigin(0.5);
    this._logText = this.add.text(width / 2, 210, '', {
      fontSize: '12px', color: '#dddddd', fontFamily: 'monospace',
      wordWrap: { width: width - 56 }, align: 'center',
    }).setOrigin(0.5);

    // ── Turn indicator ───────────────────────────────────────────────────────
    this._turnText = this.add.text(width / 2, 256, '', {
      fontSize: '13px', color: '#ffdd44', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // ── Action buttons ───────────────────────────────────────────────────────
    const btnY    = 296;
    const btnDefs = [
      { key: 'ATK',  label: '[ ATK ]',  x: width / 2 - 150, color: '#ff9966' },
      { key: 'DEF',  label: '[ DEF ]',  x: width / 2,       color: '#66aaff' },
      { key: 'ITEM', label: '[ ITEM ]', x: width / 2 + 150, color: '#ffdd44' },
    ];
    this._buttons = {};
    btnDefs.forEach(({ key, label, x, color }) => {
      const btn = this.add.text(x, btnY, label, {
        fontSize: '20px', color, fontFamily: 'monospace',
        backgroundColor: '#141428', padding: { x: 10, y: 6 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => { if (!btn.getData('disabled')) btn.setScale(1.08); });
      btn.on('pointerout',  () => btn.setScale(1));
      btn.on('pointerdown', () => { if (!btn.getData('disabled')) this._onAction(key); });
      this._buttons[key] = btn;
    });

    this._itemLabel = this.add.text(width / 2 + 150, 330, '', {
      fontSize: '10px', color: '#999999', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // ── Deploy banner ────────────────────────────────────────────────────────
    this._deployBanner = this.add.text(width / 2, HC_Y - 18, '\u25bc Choose your next creature \u25bc', {
      fontSize: '13px', color: '#ffdd44', fontFamily: 'monospace',
    }).setOrigin(0.5).setVisible(false);

    // ── Status overlay ────────────────────────────────────────────────────────
    this._statusText = this.add.text(width / 2, height / 2, '', {
      fontSize: '38px', color: '#ffffff', fontFamily: 'monospace',
      backgroundColor: '#000000', padding: { x: 28, y: 14 },
    }).setOrigin(0.5).setDepth(20).setVisible(false);

    // ── Hand UI ───────────────────────────────────────────────────────────────
    this._buildHandUI();

    this._refreshUI();
  }

  // ── Hand UI ───────────────────────────────────────────────────────────────

  _buildHandUI() {
    this._handCards = [];

    for (let i = 0; i < this._deckRoster.length; i++) {
      const cx = HC_X0 + i * (HC_W + HC_GAP);
      const cy = HC_Y;

      const bg = this.add.rectangle(cx + HC_W / 2, cy + HC_H / 2, HC_W, HC_H, 0x0d0d1a);

      const border = this.add.graphics();

      const nameText = this.add.text(cx + HC_W / 2, cy + 6, '', {
        fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5, 0);

      const archText = this.add.text(cx + HC_W / 2, cy + 20, '', {
        fontSize: '9px', color: '#444466', fontFamily: 'monospace',
      }).setOrigin(0.5, 0);

      const hpBarBg = this.add.rectangle(cx + 8, cy + 33, HC_BAR_W, HC_BAR_H, 0x2a2a2a).setOrigin(0, 0.5);
      const hpBarFill = this.add.rectangle(cx + 8, cy + 33, HC_BAR_W, HC_BAR_H, 0x44ff44).setOrigin(0, 0.5);

      const hpText = this.add.text(cx + HC_W / 2, cy + 40, '', {
        fontSize: '9px', color: '#aaffaa', fontFamily: 'monospace',
      }).setOrigin(0.5, 0);

      const statsText = this.add.text(cx + HC_W / 2, cy + 54, '', {
        fontSize: '9px', color: '#cccccc', fontFamily: 'monospace',
      }).setOrigin(0.5, 0);

      const abilText = this.add.text(cx + HC_W / 2, cy + 68, '', {
        fontSize: '8px', color: '#554466', fontFamily: 'monospace',
        wordWrap: { width: HC_W - 8 },
      }).setOrigin(0.5, 0);

      const statusText = this.add.text(cx + HC_W / 2, cy + HC_H - 24, '', {
        fontSize: '10px', fontFamily: 'monospace',
      }).setOrigin(0.5, 0);

      // Invisible hit area — always created, interactivity managed via _deployPhase check
      const hit = this.add
        .rectangle(cx + HC_W / 2, cy + HC_H / 2, HC_W, HC_H, 0x000000, 0)
        .setInteractive({ useHandCursor: true });

      const idx = i; // capture for closure
      hit.on('pointerover', () => {
        if (this._deployPhase && this._deckRoster[idx]?.isAlive()) {
          bg.setFillStyle(0x1a1a3a);
        }
      });
      hit.on('pointerout', () => {
        if (!this._deployPhase) bg.setFillStyle(0x0d0d1a);
        else this._refreshHandCard(idx);
      });
      hit.on('pointerdown', () => {
        if (this._deployPhase && this._deckRoster[idx]?.isAlive()) {
          this._deployCreature(idx);
        }
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
    const canDeploy = this._deployPhase && alive && !isActive;
    const stats     = creature.getStats();

    // Background
    const bgFill = isDead ? 0x080808 : (isActive ? 0x0a0a22 : 0x0d0d1a);
    card.bg.setFillStyle(bgFill);

    // Border
    card.border.clear();
    let borderColor = 0x1a1a3a, borderW = 1;
    if (isActive)    { borderColor = 0x4466bb; borderW = 2; }
    else if (canDeploy) { borderColor = 0xffdd44; borderW = 2; }
    else if (isDead) { borderColor = 0x220000; }
    card.border.lineStyle(borderW, borderColor, 1);
    card.border.strokeRect(card.cx, card.cy, HC_W, HC_H);

    // Name
    const archColor = ARCH_COLOR[creature.archetype] || '#aaaaaa';
    const alpha     = isDead ? 0.35 : 1;
    const displayName = creature.name.length > 16
      ? creature.name.slice(0, 15) + '\u2026'
      : creature.name;
    card.nameText.setText(displayName).setColor(archColor).setAlpha(alpha);
    card.archText.setText(`[${creature.archetype}]`).setAlpha(isDead ? 0.25 : 0.7);

    // HP bar
    const ratio = Math.max(0, creature.currentHP / stats.hp);
    card.hpBarFill.setSize(Math.max(2, Math.floor(HC_BAR_W * ratio)), HC_BAR_H);
    const tint = isDead ? 0x333333 : (ratio > 0.5 ? 0x44ff44 : ratio > 0.25 ? 0xffdd44 : 0xff3333);
    card.hpBarFill.setFillStyle(tint);
    card.hpText
      .setText(isDead ? 'FAINTED' : `${Math.max(0, creature.currentHP)}/${stats.hp}`)
      .setColor(isDead ? '#441111' : '#aaffaa')
      .setAlpha(alpha);

    // Stats
    card.statsText
      .setText(`ATK:${stats.atk}  DEF:${stats.def}  SPD:${stats.spd}`)
      .setAlpha(alpha);

    // Ability
    card.abilText
      .setText(`\u2726 ${creature.ability.name}`)
      .setAlpha(isDead ? 0.2 : 0.6);

    // Status badge
    if (isActive)       card.statusText.setText('\u25b2 ACTIVE').setColor('#5588cc');
    else if (isDead)    card.statusText.setText('\u2715 FAINTED').setColor('#442222');
    else if (canDeploy) card.statusText.setText('\u25ba DEPLOY').setColor('#ffdd44');
    else                card.statusText.setText('');
  }

  _refreshHandUI() {
    for (let i = 0; i < this._handCards.length; i++) {
      this._refreshHandCard(i);
    }
  }

  // ── UI helpers ────────────────────────────────────────────────────────────

  _refreshUI() {
    const sys    = this.battleSystem;
    const player = sys.playerHand.find(c => c.isAlive());
    const enemy  = sys.enemyHand.find(c => c.isAlive());

    this._playerDeckText.setText(`You: ${sys.playerHand.filter(c => c.isAlive()).length}/${this._deckRoster.length}`);
    this._enemyDeckText.setText(`Enemy: ${sys.enemyHand.filter(c => c.isAlive()).length}/5`);

    this._turnText.setText(sys.turn === 'player' ? '> Your Turn' : '... Enemy Turn');

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
      this._enemySprite.setVisible(false);
    }

    const log = sys.battleLog;
    this._logText.setText(log.length > 0 ? log.slice(-2).join('\n') : '...');

    const hasItem = sys.playerItems.length > 0;
    const itemCount = sys.playerItems.length;
    this._itemLabel.setText(
      itemCount > 0
        ? `${sys.playerItems[0].name}${itemCount > 1 ? ` (${itemCount})` : ''}`
        : '(empty)'
    );

    const canAct = sys.turn === 'player' && !sys.isOver() && !this._deployPhase;
    Object.entries(this._buttons).forEach(([key, btn]) => {
      const disabled = !canAct || (key === 'ITEM' && !hasItem);
      btn.setData('disabled', disabled);
      btn.setAlpha(disabled ? 0.35 : 1);
    });

    this._refreshHandUI();
  }

  _setHpBar(fill, label, current, max) {
    const ratio = Math.max(0, Math.min(1, current / max));
    fill.setSize(Math.max(2, Math.floor(BAR_W * ratio)), BAR_H);
    const tint  = ratio > 0.5 ? 0x44ff44 : ratio > 0.25 ? 0xffdd44 : 0xff3333;
    fill.setFillStyle(tint);
    label.setText(`${Math.max(0, current)}/${max}`);
  }

  _lockButtons() {
    Object.values(this._buttons).forEach(b => {
      b.setData('disabled', true);
      b.setAlpha(0.35);
    });
  }

  // ── Deploy mechanic ───────────────────────────────────────────────────────

  _enterDeployPhase() {
    this._deployPhase = true;
    this._deployBanner.setVisible(true);
    this._playerSprite.setVisible(false);
    this._refreshHandUI();
  }

  _deployCreature(rosterIdx) {
    const sys     = this.battleSystem;
    const chosen  = this._deckRoster[rosterIdx];
    if (!chosen || !chosen.isAlive()) return;

    sys.deployCreature(chosen);
    this._activeCreature = chosen;
    this._deployPhase    = false;
    this._deployBanner.setVisible(false);
    this._playerSprite.setVisible(true);

    sys.nextTurn();
    this._actionInProgress = false;
    this._refreshUI();
  }

  // ── Action flow ───────────────────────────────────────────────────────────

  _onAction(action) {
    const sys = this.battleSystem;
    if (sys.isOver()) return;
    if (this._actionInProgress) return;
    this._actionInProgress = true;

    this._lockButtons();

    this.tweens.killTweensOf(this._playerSprite);
    this.tweens.killTweensOf(this._enemySprite);
    this._playerSprite.x = this._playerHomeX;
    this._enemySprite.x  = this._enemyHomeX;

    const enemyWasAlive = sys.enemyHand[0]?.isAlive() ?? false;

    sys.playerAction(action, 0);

    const dx        = action === 'ATK' ? 22 : action === 'ITEM' ? 0 : -14;
    const enemyDied = enemyWasAlive && !(sys.enemyHand[0]?.isAlive() ?? false);

    this.tweens.add({
      targets:  this._playerSprite,
      x:        this._playerHomeX + dx,
      duration: 110,
      yoyo:     true,
      ease:     'Quad.easeOut',
      onComplete: () => {
        this._playerSprite.x = this._playerHomeX;
        this._refreshUI();

        const afterPlayerAction = () => {
          if (sys.isOver()) { this._actionInProgress = false; this._endBattle(); return; }

          this.time.delayedCall(360, () => {
            const playerWasAlive = sys.playerHand[0]?.isAlive() ?? false;
            sys.enemyTurn();
            const playerDied = playerWasAlive && !(sys.playerHand[0]?.isAlive() ?? false);

            this.tweens.add({
              targets:  this._enemySprite,
              x:        this._enemyHomeX - 22,
              duration: 110,
              yoyo:     true,
              ease:     'Quad.easeOut',
              onComplete: () => {
                this._enemySprite.x = this._enemyHomeX;
                this._refreshUI();

                const afterEnemyAction = () => {
                  if (sys.isOver()) { this._actionInProgress = false; this._endBattle(); return; }

                  if (playerDied) {
                    // Stay in actionInProgress = true until player deploys
                    this._enterDeployPhase();
                    return;
                  }

                  sys.nextTurn();
                  this._actionInProgress = false;
                  this._refreshUI();
                };

                if (playerDied) {
                  this._fadeSprite(this._playerSprite, afterEnemyAction);
                } else {
                  afterEnemyAction();
                }
              },
            });
          });
        };

        if (enemyDied) {
          this._fadeSprite(this._enemySprite, afterPlayerAction);
        } else {
          afterPlayerAction();
        }
      },
    });
  }

  _fadeSprite(sprite, cb) {
    this.tweens.add({
      targets:  sprite,
      alpha:    0,
      duration: 280,
      onComplete: () => {
        sprite.setAlpha(1);
        cb();
      },
    });
  }

  _endBattle() {
    this._lockButtons();
    this._statusText.setVisible(true);

    if (this.battleSystem.playerWon()) {
      this._statusText.setText('Victory!').setColor('#a8ff78');
      this.time.delayedCall(1400, () => {
        const capturable = this.battleSystem.getCapturableCreature();
        this.scene.start('CaptureScene', { capturable });
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
