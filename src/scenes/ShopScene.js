import GameState from '../systems/GameState.js';
import { items as allItems } from '../data/items.js';

const SHOP_ITEM_IDS = ['jar', 'nectar_vial', 'venom_gland', 'chitin_shard'];
const items = allItems.filter(i => SHOP_ITEM_IDS.includes(i.id))
  .sort((a, b) => SHOP_ITEM_IDS.indexOf(a.id) - SHOP_ITEM_IDS.indexOf(b.id));

const ARCH_COLOR  = { Flying: '#ffdd44', Ground: '#cc9944', Water: '#66aaff' };
const ITEM_COLOR  = { heal: '#88ff88', atkBuff: '#ff9966', defBuff: '#66aaff' };

const CARD_W = 236;
const CARD_H = 76;
const GAP    = 8;
const COLS   = 3;
const START_X = (800 - COLS * CARD_W - (COLS - 1) * GAP) / 2;
const START_Y = 112;

export default class ShopScene extends Phaser.Scene {
  constructor() {
    super('ShopScene');
  }

  create() {
    const { width, height } = this.scale;

    // ── Header ────────────────────────────────────────────────────────────────
    this.add.rectangle(width / 2, 0, width, 58, 0x0d0d1a).setOrigin(0.5, 0);
    this.add.rectangle(width / 2, 58, width, 2, 0x2a2a50).setOrigin(0.5, 0);
    this.add.text(width / 2, 18, 'SHOP', {
      fontSize: '22px', color: '#ffdd44', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    this._goldText = this.add.text(width - 14, 18, `Gold: ${GameState.currency}`, {
      fontSize: '14px', color: '#ffdd44', fontFamily: 'monospace',
    }).setOrigin(1, 0.5);

    // ── Tabs ──────────────────────────────────────────────────────────────────
    this._tab = 'sell';
    this._tabBtns = {};
    [['sell', 'SELL BUGS'], ['buy', 'BUY ITEMS']].forEach(([tab, label], i) => {
      const tx  = width / 2 + (i - 0.5) * 190;
      const btn = this.add.text(tx, 80, label, {
        fontSize: '14px', color: '#aaaaaa', fontFamily: 'monospace',
        backgroundColor: '#111122', padding: { x: 20, y: 6 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => this._switchTab(tab));
      this._tabBtns[tab] = btn;
    });

    // ── Content area ──────────────────────────────────────────────────────────
    this._contentObjs = [];
    this._buildContent();

    // ── Back button ───────────────────────────────────────────────────────────
    const backTarget = GameState.selectedArchetype ? 'MapScene' : 'MenuScene';
    this.add.text(56, height - 24, '[ BACK ]', {
      fontSize: '15px', color: '#556677', fontFamily: 'monospace',
      backgroundColor: '#141428', padding: { x: 10, y: 7 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start(backTarget));

    this._refreshTabs();
  }

  // ── Tab helpers ───────────────────────────────────────────────────────────

  _switchTab(tab) {
    this._tab = tab;
    this._rebuildContent();
    this._refreshTabs();
  }

  _refreshTabs() {
    Object.entries(this._tabBtns).forEach(([tab, btn]) => {
      const active = tab === this._tab;
      btn.setColor(active ? '#ffffff' : '#666688');
      btn.setBackgroundColor(active ? '#222244' : '#111122');
    });
  }

  _rebuildContent() {
    this._contentObjs.forEach(o => o.destroy());
    this._contentObjs = [];
    this._buildContent();
  }

  _buildContent() {
    if (this._tab === 'sell') this._buildSell();
    else this._buildBuy();
  }

  // ── Sell tab ──────────────────────────────────────────────────────────────

  _buildSell() {
    const farm = GameState.getFarm().map(e => ({ ...e, _source: 'farm' }));
    const hand = (GameState.hand || []).map(e => ({ ...e, _source: 'hand' }));
    const all  = [...farm, ...hand];

    if (all.length === 0) {
      const t = this.add.text(400, 300, 'No bugs to sell.\nCapture some in battle first!', {
        fontSize: '16px', color: '#333355', fontFamily: 'monospace', align: 'center',
      }).setOrigin(0.5);
      this._contentObjs.push(t);
      return;
    }

    all.forEach((entry, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx  = START_X + col * (CARD_W + GAP);
      const cy  = START_Y + row * (CARD_H + GAP);
      this._buildSellCard(entry, cx, cy);
    });
  }

  _buildSellCard(entry, cx, cy) {
    const price     = GameState.sellPrice(entry);
    const archColor = ARCH_COLOR[entry.archetype] || '#aaaaaa';
    const fromHand  = entry._source === 'hand';

    const bg  = this.add.rectangle(cx + CARD_W / 2, cy + CARD_H / 2, CARD_W, CARD_H,
      fromHand ? 0x0d0d1a : 0x0d0d1a);
    const gfx = this.add.graphics();
    gfx.lineStyle(1, fromHand ? 0x334433 : 0x2a2a50, 1);
    gfx.strokeRect(cx, cy, CARD_W, CARD_H);

    const nameT  = this.add.text(cx + 8, cy + 7, entry.name, {
      fontSize: '12px', color: archColor, fontFamily: 'monospace', fontStyle: 'bold',
    });
    const sourceT = this.add.text(cx + CARD_W - 8, cy + 7,
      fromHand ? 'HAND' : 'FARM', {
      fontSize: '9px', color: fromHand ? '#88aa88' : '#556677', fontFamily: 'monospace',
    }).setOrigin(1, 0);
    const statT  = this.add.text(cx + 8, cy + 24,
      `HP:${entry.baseHp}  ATK:${entry.baseAtk}  DEF:${entry.baseDef}  SPD:${entry.baseSpd}`, {
      fontSize: '9px', color: '#888888', fontFamily: 'monospace',
    });
    const priceT = this.add.text(cx + 8, cy + 42, `Sell: ${price}g`, {
      fontSize: '10px', color: '#ffdd44', fontFamily: 'monospace',
    });

    const objs = [bg, gfx, nameT, sourceT, statT, priceT];

    const btn = this.add.text(cx + CARD_W - 8, cy + CARD_H / 2 + 6, '[ SELL ]', {
      fontSize: '11px', color: '#ff9944', fontFamily: 'monospace',
      backgroundColor: '#1a0800', padding: { x: 6, y: 4 },
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout',  () => btn.setColor('#ff9944'));
    btn.on('pointerdown', () => {
      if (fromHand) GameState.sellFromHand(entry.uid);
      else          GameState.sellCreature(entry.uid);
      this._goldText.setText(`Gold: ${GameState.currency}`);
      this._rebuildContent();
    });
    objs.push(btn);

    this._contentObjs.push(...objs);
  }

  // ── Buy tab ───────────────────────────────────────────────────────────────

  _buildBuy() {
    const BUY_H = 90;
    items.forEach((item, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx  = START_X + col * (CARD_W + GAP);
      const cy  = START_Y + row * (BUY_H + GAP);
      this._buildBuyCard(item, cx, cy, BUY_H);
    });
  }

  _buildBuyCard(item, cx, cy, h) {
    const jarCount  = item.id === 'jar' ? GameState.itemInventory.filter(i => i.id === 'jar').length : 0;
    const isJar     = item.id === 'jar';
    const owned     = isJar ? jarCount >= 5 : GameState.itemInventory.some(i => i.id === item.id);
    const canAfford = GameState.currency >= item.price;
    const canBuy    = !owned && canAfford;
    const archLabel = item.archetype ? `[${item.archetype}]` : '[Basic]';
    const archColor = item.archetype ? (ARCH_COLOR[item.archetype] || '#aaaaaa') : '#888888';
    const nameColor = owned ? '#66aa66' : (ITEM_COLOR[item.type] || '#dddddd');

    const bg  = this.add.rectangle(cx + CARD_W / 2, cy + h / 2, CARD_W, h,
      owned ? 0x0a140a : 0x0d0d1a);
    const gfx = this.add.graphics();
    gfx.lineStyle(1, owned ? 0x224422 : 0x2a2a50, 1);
    gfx.strokeRect(cx, cy, CARD_W, h);

    const archT = this.add.text(cx + 8, cy + 6, archLabel, {
      fontSize: '9px', color: archColor, fontFamily: 'monospace',
    });
    const nameT = this.add.text(cx + 8, cy + 20, item.name, {
      fontSize: '12px', color: nameColor, fontFamily: 'monospace', fontStyle: 'bold',
    });
    const descT = this.add.text(cx + 8, cy + 38, item.description, {
      fontSize: '10px', color: '#999999', fontFamily: 'monospace',
    });

    const objs = [bg, gfx, archT, nameT, descT];

    // Jar: show X/5 count; others: show OWNED or BUY
    if (isJar) {
      const countT = this.add.text(cx + CARD_W - 8, cy + 8, `${jarCount} / 5`, {
        fontSize: '11px', color: jarCount >= 5 ? '#66aa66' : '#ffdd44', fontFamily: 'monospace',
      }).setOrigin(1, 0);
      objs.push(countT);
    } else if (owned) {
      const ownedT = this.add.text(cx + CARD_W - 8, cy + h / 2, '✓ OWNED', {
        fontSize: '11px', color: '#66aa66', fontFamily: 'monospace',
      }).setOrigin(1, 0.5);
      objs.push(ownedT);
    }

    const priceT = this.add.text(cx + 8, cy + 58, `${item.price}g`, {
      fontSize: '11px', color: canAfford && !owned ? '#ffdd44' : '#664422',
      fontFamily: 'monospace', fontStyle: 'bold',
    });
    const btn = this.add.text(cx + CARD_W - 8, cy + h / 2 + 8, '[ BUY ]', {
      fontSize: '11px', color: canBuy ? '#a8ff78' : '#444444', fontFamily: 'monospace',
      backgroundColor: '#111428', padding: { x: 6, y: 4 },
    }).setOrigin(1, 0.5);

    if (canBuy) {
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setColor('#ffffff'));
      btn.on('pointerout',  () => btn.setColor('#a8ff78'));
      btn.on('pointerdown', () => {
        if (GameState.buyItem(item)) {
          this._goldText.setText(`Gold: ${GameState.currency}`);
          this._rebuildContent();
        }
      });
    }
    objs.push(priceT, btn);

    this._contentObjs.push(...objs);
  }
}
