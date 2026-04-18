import GameState from '../systems/GameState.js';
import { creatures as creatureData } from '../data/creatures.js';

const MAX_DECK  = 5;
const CARD_W    = 186;
const CARD_H    = 82;
const COLS      = 4;
const GRID_GAP  = 8;
const GRID_X    = 16;
const GRID_Y    = 98;

const SLOT_W    = 140;
const SLOT_H    = 68;
const SLOT_GAP  = 8;
// 5 slots: 5*140 + 4*8 = 732 → startX = (800-732)/2 = 34
const TRAY_X    = 34;
const TRAY_Y    = 372;

const ARCH_COLOR = { Flying: '#ffdd44', Ground: '#cc9944', Water: '#66aaff' };

const ITEM_SLOT_W   = 180;
const ITEM_SLOT_H   = 46;
const ITEM_SLOT_GAP = 8;
// 3 * 180 + 2 * 8 = 556 → startX = (800-556)/2 = 122
const ITEM_X0       = 122;
const ITEM_Y        = 490;

const BASIC_ITEMS = [
  { id: 'nectar_vial',  name: 'Nectar Vial',  type: 'heal',    value: 30, percent: true, description: 'Heal 30% HP'  },
  { id: 'venom_gland',  name: 'Venom Gland',  type: 'atkBuff', value: 1,                 description: 'ATK +1'       },
  { id: 'chitin_shard', name: 'Chitin Shard', type: 'defBuff', value: 1,                 description: 'DEF +1'       },
];
const ITEM_COLOR = { heal: '#88ff88', atkBuff: '#ff9966', defBuff: '#66aaff' };
const ITEM_BG    = { heal: 0x091509,  atkBuff: 0x150909,  defBuff: 0x090915 };

export default class DeckBuilderScene extends Phaser.Scene {
  constructor() {
    super('DeckBuilderScene');
  }

  create() {
    const { width } = this.scale;

    this._tab      = GameState.selectedArchetype || 'Flying';
    this._deck     = [];   // array of creature plain-data objects (max 5)
    this._gridObjs = [];

    // ── Header ────────────────────────────────────────────────────────────────
    this.add.rectangle(width / 2, 0, width, 58, 0x0d0d1a).setOrigin(0.5, 0);
    this.add.rectangle(width / 2, 58, width, 2, 0x2a2a50).setOrigin(0.5, 0);
    this.add.text(width / 2, 14, 'BUILD YOUR DECK', {
      fontSize: '20px', color: '#a8ff78', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this._countText = this.add.text(width / 2, 42, '0 / 5 selected', {
      fontSize: '12px', color: '#555577', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // ── Filter tabs ───────────────────────────────────────────────────────────
    const TABS    = ['Flying', 'Ground', 'Water', 'Farm'];
    const tabW    = 136;
    const tabGap  = 12;
    const tabsTot = TABS.length * tabW + (TABS.length - 1) * tabGap;
    const tabX0   = (width - tabsTot) / 2;

    this._tabBtns = {};
    TABS.forEach((tab, i) => {
      const tx  = tabX0 + i * (tabW + tabGap) + tabW / 2;
      const btn = this.add.text(tx, 72, tab, {
        fontSize: '14px', color: '#aaaaaa', fontFamily: 'monospace',
        backgroundColor: '#111122', padding: { x: 18, y: 5 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => this._switchTab(tab));
      this._tabBtns[tab] = btn;
    });

    // ── Deck tray ─────────────────────────────────────────────────────────────
    this.add.rectangle(width / 2, TRAY_Y + SLOT_H / 2 + 12, width, SLOT_H + 28, 0x080814).setOrigin(0.5);
    this.add.text(width / 2, TRAY_Y - 14, 'YOUR DECK  (click a slot to remove)', {
      fontSize: '10px', color: '#333355', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this._slotObjs = [];
    for (let i = 0; i < MAX_DECK; i++) {
      const sx = TRAY_X + i * (SLOT_W + SLOT_GAP);
      const sy = TRAY_Y;

      const bg    = this.add.rectangle(sx + SLOT_W / 2, sy + SLOT_H / 2, SLOT_W, SLOT_H, 0x080810);
      const gfx   = this.add.graphics();
      gfx.lineStyle(1, 0x222244, 1);
      gfx.strokeRect(sx, sy, SLOT_W, SLOT_H);
      const nameT = this.add.text(sx + SLOT_W / 2, sy + 10, '', {
        fontSize: '11px', color: '#a8ff78', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      const statT = this.add.text(sx + SLOT_W / 2, sy + 28, '', {
        fontSize: '9px', color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5, 0);
      const archT = this.add.text(sx + SLOT_W / 2, sy + 42, '', {
        fontSize: '9px', color: '#555577', fontFamily: 'monospace',
      }).setOrigin(0.5, 0);

      const hit = this.add
        .rectangle(sx + SLOT_W / 2, sy + SLOT_H / 2, SLOT_W, SLOT_H, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this._removeFromDeck(i));

      this._slotObjs.push({ bg, gfx, nameT, statT, archT, hit });
    }

    // ── Item tray ──────────────────────────────────────────────────────────────
    this.add.rectangle(width / 2, ITEM_Y + ITEM_SLOT_H / 2 + 12, width, ITEM_SLOT_H + 30, 0x0c0c1e).setOrigin(0.5);
    this.add.text(width / 2, ITEM_Y - 14, 'ITEMS  (click to cycle: empty \u2192 Heal \u2192 ATK+ \u2192 DEF+)', {
      fontSize: '10px', color: '#6666aa', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this._items     = [null, null, null];
    this._itemSlotObjs = [];
    for (let i = 0; i < 3; i++) {
      const sx = ITEM_X0 + i * (ITEM_SLOT_W + ITEM_SLOT_GAP);
      const sy = ITEM_Y;

      const bg   = this.add.rectangle(sx + ITEM_SLOT_W / 2, sy + ITEM_SLOT_H / 2, ITEM_SLOT_W, ITEM_SLOT_H, 0x111128);
      const gfx  = this.add.graphics();
      gfx.lineStyle(1, 0x3a3a66, 1);
      gfx.strokeRect(sx, sy, ITEM_SLOT_W, ITEM_SLOT_H);
      const nameT = this.add.text(sx + ITEM_SLOT_W / 2, sy + 8, '', {
        fontSize: '11px', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      const descT = this.add.text(sx + ITEM_SLOT_W / 2, sy + 25, '', {
        fontSize: '9px', color: '#aaaacc', fontFamily: 'monospace',
      }).setOrigin(0.5, 0);
      const hintT = this.add.text(sx + ITEM_SLOT_W / 2, sy + 36, '\u21bb click to cycle', {
        fontSize: '8px', color: '#555588', fontFamily: 'monospace',
      }).setOrigin(0.5, 0);

      const hit = this.add
        .rectangle(sx + ITEM_SLOT_W / 2, sy + ITEM_SLOT_H / 2, ITEM_SLOT_W, ITEM_SLOT_H, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      const slotIdx = i;
      hit.on('pointerover', () => bg.setFillStyle(0x0f0f1e));
      hit.on('pointerout',  () => this._refreshItemSlot(slotIdx));
      hit.on('pointerdown', () => this._cycleItem(slotIdx));

      this._itemSlotObjs.push({ bg, gfx, nameT, descT, hintT, hit });
    }
    this._refreshItemTray();

    // ── Buttons ───────────────────────────────────────────────────────────────
    this._startBtn = this.add.text(width / 2, 563, '[ START RUN ]', {
      fontSize: '22px', color: '#a8ff78', fontFamily: 'monospace',
      backgroundColor: '#141428', padding: { x: 18, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this._startBtn.on('pointerover', () => { if (!this._startBtn.getData('disabled')) this._startBtn.setScale(1.05); });
    this._startBtn.on('pointerout',  () => this._startBtn.setScale(1));
    this._startBtn.on('pointerdown', () => { if (!this._startBtn.getData('disabled')) this._goToBattle(); });

    this.add.text(72, 563, '[ BACK ]', {
      fontSize: '15px', color: '#556677', fontFamily: 'monospace',
      backgroundColor: '#141428', padding: { x: 10, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('MenuScene'));

    this._buildGrid();
    this._refreshTabs();
    this._refreshTray();
    this._refreshStartBtn();
  }

  // ── Pool helpers ──────────────────────────────────────────────────────────

  _getPool() {
    if (this._tab === 'Farm') return GameState.getFarm();
    return creatureData
      .filter(c => c.archetype === this._tab)
      .map(c => ({
        id: c.id, name: c.name, archetype: c.archetype, ability: c.ability,
        baseHp: c.baseHp, baseAtk: c.baseAtk, baseDef: c.baseDef, baseSpd: c.baseSpd,
      }));
  }

  // ── Tab ───────────────────────────────────────────────────────────────────

  _switchTab(tab) {
    this._tab = tab;
    this._clearGrid();
    this._buildGrid();
    this._refreshTabs();
  }

  _refreshTabs() {
    Object.entries(this._tabBtns).forEach(([tab, btn]) => {
      const active = tab === this._tab;
      btn.setColor(active ? '#ffffff' : '#666688');
      btn.setBackgroundColor(active ? '#222244' : '#111122');
    });
  }

  // ── Grid ─────────────────────────────────────────────────────────────────

  _clearGrid() {
    this._gridObjs.forEach(o => o.destroy());
    this._gridObjs = [];
  }

  _buildGrid() {
    const pool = this._getPool();

    if (pool.length === 0) {
      const msg = this._tab === 'Farm'
        ? 'No farm creatures yet.\nWin battles and capture some!'
        : 'No creatures available.';
      const t = this.add.text(400, 228, msg, {
        fontSize: '16px', color: '#333355', fontFamily: 'monospace', align: 'center',
      }).setOrigin(0.5);
      this._gridObjs.push(t);
      return;
    }

    pool.slice(0, COLS * 3).forEach((creature, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx  = GRID_X + col * (CARD_W + GRID_GAP);
      const cy  = GRID_Y + row * (CARD_H + GRID_GAP);
      this._buildCard(creature, cx, cy);
    });
  }

  _buildCard(creature, cx, cy) {
    const alreadyPicked = creature.uid && this._deck.some(d => d.uid === creature.uid);
    const archColor     = alreadyPicked ? '#444455' : (ARCH_COLOR[creature.archetype] || '#aaaaaa');
    const alpha         = alreadyPicked ? 0.38 : 1;

    const bg = this.add.rectangle(cx + CARD_W / 2, cy + CARD_H / 2, CARD_W, CARD_H,
      alreadyPicked ? 0x080810 : 0x0d0d1a);
    const gfx = this.add.graphics();
    gfx.lineStyle(1, alreadyPicked ? 0x1a1a2a : 0x2a2a50, 1);
    gfx.strokeRect(cx, cy, CARD_W, CARD_H);

    const nameT = this.add.text(cx + CARD_W / 2, cy + 7, creature.name, {
      fontSize: '13px', color: archColor, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setAlpha(alpha);

    const statsT = this.add.text(cx + CARD_W / 2, cy + 26,
      `HP:${creature.baseHp}  ATK:${creature.baseAtk}  DEF:${creature.baseDef}  SPD:${creature.baseSpd}`,
      { fontSize: '10px', color: '#cccccc', fontFamily: 'monospace' }
    ).setOrigin(0.5, 0).setAlpha(alpha);

    const abilT = this.add.text(cx + CARD_W / 2, cy + 43,
      alreadyPicked ? '✓ IN DECK' : `\u2726 ${creature.ability.name}`,
      { fontSize: '9px', color: alreadyPicked ? '#336633' : '#665577', fontFamily: 'monospace' }
    ).setOrigin(0.5, 0).setAlpha(alreadyPicked ? 0.7 : 1);

    if (!alreadyPicked) {
      const hit = this.add
        .rectangle(cx + CARD_W / 2, cy + CARD_H / 2, CARD_W, CARD_H, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => bg.setFillStyle(0x111133));
      hit.on('pointerout',  () => bg.setFillStyle(0x0d0d1a));
      hit.on('pointerdown', () => this._addToDeck(creature));
      this._gridObjs.push(hit);
    }

    this._gridObjs.push(bg, gfx, nameT, statsT, abilT);
  }

  // ── Deck management ───────────────────────────────────────────────────────

  _addToDeck(creature) {
    if (this._deck.length >= MAX_DECK) return;
    // Farm creatures (have uid) can only be picked once
    if (creature.uid && this._deck.some(d => d.uid === creature.uid)) return;
    this._deck.push(creature);
    this._refreshTray();
    this._refreshStartBtn();
    this._countText.setText(`${this._deck.length} / ${MAX_DECK} selected`);
    // Redraw grid so the selected card dims
    if (creature.uid) { this._clearGrid(); this._buildGrid(); }
  }

  _removeFromDeck(slotIdx) {
    if (slotIdx >= this._deck.length) return;
    const removed = this._deck.splice(slotIdx, 1)[0];
    this._refreshTray();
    this._refreshStartBtn();
    this._countText.setText(`${this._deck.length} / ${MAX_DECK} selected`);
    // Redraw grid so the card becomes selectable again
    if (removed?.uid) { this._clearGrid(); this._buildGrid(); }
  }

  _refreshTray() {
    this._slotObjs.forEach(({ bg, nameT, statT, archT }, i) => {
      const c = this._deck[i];
      if (c) {
        bg.setFillStyle(0x111122);
        const displayName = c.name.length > 14 ? c.name.slice(0, 13) + '\u2026' : c.name;
        nameT.setText(displayName);
        statT.setText(`HP:${c.baseHp}  ATK:${c.baseAtk}  DEF:${c.baseDef}`);
        archT.setText(`[${c.archetype}]`);
        archT.setColor(ARCH_COLOR[c.archetype] || '#888888');
      } else {
        bg.setFillStyle(0x080810);
        nameT.setText('\u2014 empty \u2014');
        nameT.setColor('#333355');
        statT.setText('');
        archT.setText('');
      }
    });
  }

  _refreshStartBtn() {
    const ok = this._deck.length > 0;
    this._startBtn.setData('disabled', !ok);
    this._startBtn.setAlpha(ok ? 1 : 0.4);
  }

  // ── Item management ───────────────────────────────────────────────────────

  _cycleItem(slotIdx) {
    const cur = this._items[slotIdx];
    if (cur === null) {
      this._items[slotIdx] = BASIC_ITEMS[0];
    } else {
      const idx = BASIC_ITEMS.findIndex(it => it.id === cur.id);
      this._items[slotIdx] = idx < BASIC_ITEMS.length - 1 ? BASIC_ITEMS[idx + 1] : null;
    }
    this._refreshItemTray();
  }

  _refreshItemTray() {
    for (let i = 0; i < 3; i++) this._refreshItemSlot(i);
  }

  _refreshItemSlot(slotIdx) {
    const { bg, nameT, descT } = this._itemSlotObjs[slotIdx];
    const item = this._items[slotIdx];
    if (item) {
      bg.setFillStyle(ITEM_BG[item.type] || 0x0d0d1a);
      nameT.setText(item.name).setColor(ITEM_COLOR[item.type] || '#aaaaaa');
      descT.setText(item.description);
    } else {
      bg.setFillStyle(0x111128);
      nameT.setText('\u2014 empty \u2014').setColor('#555588');
      descT.setText('');
    }
  }

  _goToBattle() {
    // Farm creatures leave the farm for this run; survivors return via clearRun()
    const farmPicks = this._deck.filter(d => d.uid);
    GameState.deployFromFarm(farmPicks);
    GameState.selectedDeck      = [...this._deck];
    GameState.selectedItems     = this._items.filter(Boolean);
    GameState.selectedArchetype = this._tab !== 'Farm' ? this._tab : (this._deck[0]?.archetype ?? 'Flying');
    GameState.runFightWins      = 0;
    GameState.saveGame();
    this.scene.start('MapScene');
  }
}
