import GameState from '../systems/GameState.js';
import { items as itemData } from '../data/items.js';

// Node card geometry
const NODE_W   = 220;
const NODE_H   = 190;
const NODE_GAP = 16;
const NODE_Y   = 80;
// 3*220 + 2*16 = 692 → startX = (800-692)/2 = 54
const NODE_X0  = 54;

const ARCH_COLOR = { Flying: '#ffdd44', Ground: '#cc9944', Water: '#66aaff' };

export default class MapScene extends Phaser.Scene {
  constructor() {
    super('MapScene');
  }

  create() {
    const { width, height } = this.scale;
    const fightWins     = GameState.runFightWins ?? 0;
    this._fightWins     = fightWins;
    const handSize      = (GameState.selectedDeck || []).length;

    // ── Header ────────────────────────────────────────────────────────────────
    this.add.rectangle(width / 2, 0, width, 58, 0x0d0d1a).setOrigin(0.5, 0);
    this.add.rectangle(width / 2, 58, width, 2, 0x2a2a50).setOrigin(0.5, 0);
    this.add.text(width / 2, 14, 'BATTLE MAP', {
      fontSize: '20px', color: '#a8ff78', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width - 16, 14, `Round ${fightWins + 1}`, {
      fontSize: '16px', color: '#ffdd44', fontFamily: 'monospace',
    }).setOrigin(1, 0.5);
    const enemyLevel = fightWins + 1;
    const diffColor  = enemyLevel <= 3 ? '#88cc88' : enemyLevel <= 7 ? '#ffdd44' : '#ff6644';
    this.add.text(16, 14, `Enemy Lv.${enemyLevel}`, {
      fontSize: '13px', color: diffColor, fontFamily: 'monospace',
    }).setOrigin(0, 0.5);
    this.add.text(width / 2, 42, 'Choose your next encounter:', {
      fontSize: '12px', color: '#555577', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // ── Node cards ────────────────────────────────────────────────────────────
    this._buildNodeCard(0, 'Fight');
    this._buildNodeCard(1, 'Loot');
    this._buildNodeCard(2, 'Breeding');

    // ── Hand display ──────────────────────────────────────────────────────────
    this._buildHandDisplay();

    // ── Shop button ───────────────────────────────────────────────────────────
    const shopBtn = this.add.text(width / 2, 548, `[ SHOP ]  Gold: ${GameState.currency}`, {
      fontSize: '14px', color: '#ffdd44', fontFamily: 'monospace',
      backgroundColor: '#141408', padding: { x: 14, y: 7 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    shopBtn.on('pointerover', () => shopBtn.setColor('#ffffff'));
    shopBtn.on('pointerout',  () => shopBtn.setColor('#ffdd44'));
    shopBtn.on('pointerdown', () => this.scene.start('ShopScene'));

    // ── Abandon run ───────────────────────────────────────────────────────────
    this.add.text(16, 577, '[ ABANDON RUN ]', {
      fontSize: '11px', color: '#333355', fontFamily: 'monospace',
      backgroundColor: '#0a0a1a', padding: { x: 6, y: 4 },
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { GameState.clearRun(); this.scene.start('MenuScene'); });

    // ── Leave safely (only available after at least 1 win) ────────────────────
    if (fightWins > 0) {
      const deck      = GameState.selectedDeck || [];
      const survivors = deck.length;
      const leaveBtn  = this.add.text(width - 16, 577,
        `[ LEAVE SAFELY  \u2605 ${survivors} bug${survivors !== 1 ? 's' : ''} saved ]`, {
          fontSize: '13px', color: '#a8ff78', fontFamily: 'monospace',
          backgroundColor: '#0a1a0a', padding: { x: 8, y: 4 },
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
      leaveBtn.on('pointerover', () => leaveBtn.setScale(1.04));
      leaveBtn.on('pointerout',  () => leaveBtn.setScale(1));
      leaveBtn.on('pointerdown', () => {
        GameState.completedRuns = (GameState.completedRuns || 0) + 1;
        GameState.clearRun();
        this.scene.start('MenuScene');
      });
    }
  }

  _buildNodeCard(i, type) {
    const handSize  = (GameState.selectedDeck || []).length;
    const fightWins = this._fightWins ?? 0;
    const configs = {
      Fight: {
        label:       '\u2694  FIGHT',
        sublabel:    'Battle an enemy crew',
        tag:         `Enemy Lv.${fightWins + 1} \u2014 harder each round`,
        color:       '#ff9966',
        borderColor: 0x993322,
        bgColor:     0x120806,
        btnLabel:    '[ ENTER ]',
        enabled:     true,
      },
      Loot: {
        label:       '\u25c6  LOOT',
        sublabel:    'Find a random item',
        tag:         GameState.lootTaken ? 'Already looted this round' : 'Free \u2014 does not use a round',
        color:       '#ffdd44',
        borderColor: 0x887722,
        bgColor:     0x110f06,
        btnLabel:    GameState.lootTaken ? '[ TAKEN ]' : '[ TAKE ]',
        enabled:     !GameState.lootTaken,
      },
      Breeding: {
        label:       '\u2665  BREEDING',
        sublabel:    'Combine two hand creatures',
        tag:         handSize >= 2 ? 'Creates a hybrid offspring' : 'Need 2+ creatures in hand',
        color:       '#cc88ff',
        borderColor: 0x664488,
        bgColor:     0x0d0814,
        btnLabel:    handSize >= 2 ? '[ ENTER ]' : '[ NEED 2 ]',
        enabled:     handSize >= 2,
      },
    };

    const cfg = configs[type];
    const cx  = NODE_X0 + i * (NODE_W + NODE_GAP);
    const cy  = NODE_Y;

    this.add.rectangle(cx + NODE_W / 2, cy + NODE_H / 2, NODE_W, NODE_H, cfg.bgColor);
    const gfx = this.add.graphics();
    gfx.lineStyle(2, cfg.borderColor, 1);
    gfx.strokeRect(cx, cy, NODE_W, NODE_H);

    this.add.text(cx + NODE_W / 2, cy + 22, cfg.label, {
      fontSize: '22px', color: cfg.enabled ? cfg.color : '#333344',
      fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    this.add.text(cx + NODE_W / 2, cy + 60, cfg.sublabel, {
      fontSize: '13px', color: cfg.enabled ? '#aaaaaa' : '#333344',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);

    this.add.text(cx + NODE_W / 2, cy + 82, cfg.tag, {
      fontSize: '10px', color: cfg.enabled ? '#555566' : '#222233',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);

    const btn = this.add.text(cx + NODE_W / 2, cy + NODE_H - 28, cfg.btnLabel, {
      fontSize: '15px',
      color: cfg.enabled ? cfg.color : '#333344',
      fontFamily: 'monospace',
      backgroundColor: '#141428',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5);

    if (cfg.enabled) {
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setScale(1.06));
      btn.on('pointerout',  () => btn.setScale(1));
      btn.on('pointerdown', () => this._enterNode(type));
    }
  }

  _buildHandDisplay() {
    const { width } = this.scale;
    const deck = GameState.selectedDeck || [];

    this.add.rectangle(width / 2, 290, width, 2, 0x2a2a50).setOrigin(0.5);
    this.add.text(16, 296, 'YOUR HAND', {
      fontSize: '11px', color: '#333355', fontFamily: 'monospace',
    });

    const CARD_W   = 140;
    const CARD_H   = 100;
    const CARD_GAP = 8;
    const total    = Math.min(deck.length, 5);
    const cardY    = 314;

    if (total === 0) {
      this.add.text(width / 2, cardY + 40, 'No creatures in hand.', {
        fontSize: '14px', color: '#333355', fontFamily: 'monospace',
      }).setOrigin(0.5);
      return;
    }

    const startX = (width - (total * CARD_W + (total - 1) * CARD_GAP)) / 2;

    for (let i = 0; i < total; i++) {
      const entry = deck[i];
      const cx    = startX + i * (CARD_W + CARD_GAP);

      this.add.rectangle(cx + CARD_W / 2, cardY + CARD_H / 2, CARD_W, CARD_H, 0x0d0d1a);
      const gfx = this.add.graphics();
      gfx.lineStyle(1, 0x2a2a50, 1);
      gfx.strokeRect(cx, cardY, CARD_W, CARD_H);

      const displayName = entry.name.length > 14 ? entry.name.slice(0, 13) + '\u2026' : entry.name;
      const archColor   = ARCH_COLOR[entry.archetype] || '#aaaaaa';

      this.add.text(cx + CARD_W / 2, cardY + 7, displayName, {
        fontSize: '11px', color: archColor, fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5, 0);

      this.add.text(cx + CARD_W / 2, cardY + 22, `[${entry.archetype}]`, {
        fontSize: '9px', color: '#444466', fontFamily: 'monospace',
      }).setOrigin(0.5, 0);

      this.add.text(cx + CARD_W / 2, cardY + 36,
        `HP:${entry.baseHp}  ATK:${entry.baseAtk}  DEF:${entry.baseDef}`,
        { fontSize: '9px', color: '#888888', fontFamily: 'monospace' }
      ).setOrigin(0.5, 0);

      this.add.text(cx + CARD_W / 2, cardY + 50,
        `\u2726 ${entry.ability?.name || ''}`,
        { fontSize: '8px', color: '#554466', fontFamily: 'monospace' }
      ).setOrigin(0.5, 0);
    }
  }

  _enterNode(type) {
    if (type === 'Fight') {
      this.scene.start('BattleScene');
    } else if (type === 'Loot') {
      this._doLoot();
    } else if (type === 'Breeding') {
      this.scene.start('BreedingScene');
    }
  }

  _doLoot() {
    const { width, height } = this.scale;

    // Pick a random non-archetype-specific item
    const lootPool = itemData.filter(it => !it.archetype);
    const item     = lootPool[Math.floor(Math.random() * lootPool.length)];

    GameState.selectedItems = [...(GameState.selectedItems || []), item];
    GameState.lootTaken     = true;
    GameState.saveGame();

    // ── Loot overlay ──────────────────────────────────────────────────────────
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75)
      .setDepth(30).setInteractive(); // blocks clicks behind

    this.add.rectangle(width / 2, height / 2, 320, 160, 0x111122).setDepth(30.5);

    const panelGfx = this.add.graphics().setDepth(31);
    panelGfx.lineStyle(2, 0x887722, 1);
    panelGfx.strokeRect(width / 2 - 160, height / 2 - 80, 320, 160);

    this.add.text(width / 2, height / 2 - 54, 'LOOT FOUND!', {
      fontSize: '18px', color: '#ffdd44', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(32);

    this.add.text(width / 2, height / 2 - 20, item.name, {
      fontSize: '22px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(32);

    this.add.text(width / 2, height / 2 + 14, item.description, {
      fontSize: '14px', color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(32);

    const okBtn = this.add.text(width / 2, height / 2 + 52, '[ OK ]', {
      fontSize: '18px', color: '#ffdd44', fontFamily: 'monospace',
      backgroundColor: '#141428', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(32).setInteractive({ useHandCursor: true });

    okBtn.on('pointerover', () => okBtn.setScale(1.06));
    okBtn.on('pointerout',  () => okBtn.setScale(1));
    okBtn.on('pointerdown', () => this.scene.restart());
  }

  _showVictory() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a1a);

    this.add.text(width / 2, height / 2 - 90, 'VICTORY!', {
      fontSize: '52px', color: '#a8ff78', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 22, 'You conquered all 3 fights!', {
      fontSize: '18px', color: '#cccccc', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const deck  = GameState.selectedDeck  || [];
    const items = GameState.selectedItems || [];

    this.add.text(width / 2, height / 2 + 16,
      `${deck.length} creature${deck.length !== 1 ? 's' : ''} survived`,
      { fontSize: '14px', color: '#aaaaaa', fontFamily: 'monospace' }
    ).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 38,
      `${items.length} item${items.length !== 1 ? 's' : ''} remaining`,
      { fontSize: '14px', color: '#888888', fontFamily: 'monospace' }
    ).setOrigin(0.5);

    const btn = this.add.text(width / 2, height / 2 + 100, '[ RETURN TO MENU ]', {
      fontSize: '20px', color: '#a8ff78', fontFamily: 'monospace',
      backgroundColor: '#141428', padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setScale(1.05));
    btn.on('pointerout',  () => btn.setScale(1));
    btn.on('pointerdown', () => {
      GameState.completedRuns = (GameState.completedRuns || 0) + 1;
      GameState.clearRun();
      this.scene.start('MenuScene');
    });
  }
}
