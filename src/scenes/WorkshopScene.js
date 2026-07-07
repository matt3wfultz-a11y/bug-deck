import GameState from '../systems/GameState.js';
import { registerSvgTextures, createBugContainer, destroyBugContainer, PART_COUNTS } from '../art/SvgParts.js';

// Pick-phase card geometry
const CARD_W   = 176;
const CARD_H   = 120;
const COLS     = 4;
const PER_PAGE = 12;           // COLS × 3 rows
const GAP      = 8;
const START_X  = 16;
const START_Y  = 68;
const COL_STEP = CARD_W + GAP;
const ROW_STEP = CARD_H + GAP;

const ARCH_COLOR = { Flying: '#ffdd44', Ground: '#cc9944', Water: '#66aaff' };

const PART_COST  = 25;                       // gold per changed part
const SLOTS      = ['body', 'head', 'legs']; // player-editable part slots

export default class WorkshopScene extends Phaser.Scene {
  constructor() {
    super('WorkshopScene');
  }

  preload() {
    registerSvgTextures(this);
  }

  create() {
    const { width } = this.scale;

    // ── Header ────────────────────────────────────────────────────────────────
    this.add.rectangle(width / 2, 0, width, 58, 0x0d0d1a).setOrigin(0.5, 0);
    this.add.rectangle(width / 2, 58, width, 2, 0x2a2a50).setOrigin(0.5, 0);
    this.add.text(width / 2, 16, 'WORKSHOP', {
      fontSize: '20px', color: '#ff9966', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this._subtitle = this.add.text(width / 2, 42, `Swap a bug's parts  —  ${PART_COST}g per part`, {
      fontSize: '12px', color: '#555577', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this._goldText = this.add.text(width - 14, 16, `Gold: ${GameState.currency}`, {
      fontSize: '13px', color: '#ffdd44', fontFamily: 'monospace',
    }).setOrigin(1, 0.5);

    this._page     = 0;
    this._pickObjs = [];
    this._editObjs = [];

    this._showPickPhase();
  }

  _refreshGold() {
    this._goldText.setText(`Gold: ${GameState.currency}`);
  }

  // ── Phase 1: pick a bug ─────────────────────────────────────────────────────

  _showPickPhase() {
    const { width, height } = this.scale;
    this._editObjs.forEach(o => o.destroy());
    this._editObjs = [];
    this._pickObjs.forEach(o => o.destroy());
    this._pickObjs = [];

    this._subtitle.setText(`Swap a bug's parts  —  ${PART_COST}g per part`);

    const farm = GameState.getFarm();

    if (farm.length === 0) {
      this._pickObjs.push(this.add.text(400, 250, 'No creatures on your farm.\nCapture some in battle first!', {
        fontSize: '16px', color: '#444455', fontFamily: 'monospace', align: 'center',
      }).setOrigin(0.5));
    }

    const totalPages = Math.max(1, Math.ceil(farm.length / PER_PAGE));
    this._page = Math.min(this._page, totalPages - 1);
    const slice = farm.slice(this._page * PER_PAGE, this._page * PER_PAGE + PER_PAGE);

    slice.forEach((entry, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx  = START_X + col * COL_STEP;
      const cy  = START_Y + row * ROW_STEP;
      this._buildPickCard(entry, cx, cy);
    });

    // Page nav
    if (totalPages > 1) {
      const navY = START_Y + 3 * ROW_STEP + 6;
      if (this._page > 0) {
        this._pickObjs.push(this._makeSmallBtn(width / 2 - 90, navY, '< PREV', () => {
          this._page--; this._showPickPhase();
        }));
      }
      if (this._page < totalPages - 1) {
        this._pickObjs.push(this._makeSmallBtn(width / 2 + 90, navY, 'NEXT >', () => {
          this._page++; this._showPickPhase();
        }));
      }
      this._pickObjs.push(this.add.text(width / 2, navY, `${this._page + 1} / ${totalPages}`, {
        fontSize: '12px', color: '#445566', fontFamily: 'monospace',
      }).setOrigin(0.5));
    }

    this._pickObjs.push(this._makeButton(width / 2, height - 44, 'BACK', '#88bbff', () => {
      this.scene.start('FarmScene');
    }));
  }

  _buildPickCard(entry, cx, cy) {
    const archColor = ARCH_COLOR[entry.archetype] || '#aaaaaa';

    const bg  = this.add.rectangle(cx + CARD_W / 2, cy + CARD_H / 2, CARD_W, CARD_H, 0x0d0d1a);
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x2a2a50, 1);
    gfx.strokeRect(cx, cy, CARD_W, CARD_H);

    const displayName = entry.name.length > 20 ? entry.name.slice(0, 19) + '…' : entry.name;
    const nameT = this.add.text(cx + CARD_W / 2, cy + 8, displayName, {
      fontSize: '13px', color: archColor, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    const archT = this.add.text(cx + CARD_W / 2, cy + 24, `[${entry.archetype}]`, {
      fontSize: '9px', color: '#444466', fontFamily: 'monospace',
    }).setOrigin(0.5, 0);

    const bug = createBugContainer(this, cx + CARD_W / 2, cy + 78, entry.parts, 0.24);

    const gen = entry.generation ?? 0;
    if (gen > 0) {
      this._pickObjs.push(this.add.text(cx + CARD_W - 6, cy + 8, `G${gen}`, {
        fontSize: '10px', color: '#886644', fontFamily: 'monospace',
      }).setOrigin(1, 0));
    }

    const hit = this.add
      .rectangle(cx + CARD_W / 2, cy + CARD_H / 2, CARD_W, CARD_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => bg.setFillStyle(0x1a1226));
    hit.on('pointerout',  () => bg.setFillStyle(0x0d0d1a));
    hit.on('pointerdown', () => this._showEditPhase(entry));

    this._pickObjs.push(bg, gfx, nameT, archT, bug, hit);
  }

  // ── Phase 2: edit parts ─────────────────────────────────────────────────────

  _showEditPhase(entry) {
    const { width, height } = this.scale;
    this._pickObjs.forEach(o => o.destroy());
    this._pickObjs = [];

    this._entry    = entry;
    this._original = { body: 1, head: 1, legs: 1, wings: 0, ...(entry.parts ?? {}) };
    this._parts    = { ...this._original };

    this._subtitle.setText(`Rebuilding ${entry.name}`);

    const archColor = ARCH_COLOR[entry.archetype] || '#aaaaaa';
    this._editObjs.push(this.add.text(width / 2, 78, entry.name, {
      fontSize: '20px', color: archColor, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5));
    this._editObjs.push(this.add.text(width / 2, 100, `[${entry.archetype}]`, {
      fontSize: '11px', color: '#444466', fontFamily: 'monospace',
    }).setOrigin(0.5));

    // Big live preview
    this._preview = createBugContainer(this, width / 2, 218, this._parts, 0.85);
    this._editObjs.push(this._preview);

    // Spare parts panel (what you've salvaged from sold/fallen bugs)
    this._editObjs.push(this.add.text(24, 140, 'SPARE PARTS', {
      fontSize: '11px', color: '#556688', fontFamily: 'monospace', fontStyle: 'bold',
    }));
    this._sparesText = this.add.text(24, 160, '', {
      fontSize: '11px', color: '#7788aa', fontFamily: 'monospace', lineSpacing: 6,
    });
    this._editObjs.push(this._sparesText);

    // Part selector rows
    this._slotTexts  = {};
    this._slotInfo   = {};
    this._slotArrows = {};
    SLOTS.forEach((slot, i) => {
      const ry = 352 + i * 40;

      this._editObjs.push(this.add.text(width / 2 - 150, ry, slot.toUpperCase(), {
        fontSize: '15px', color: '#8899aa', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0, 0.5));

      const left = this._makeArrow(width / 2 + 10, ry, '◀', () => this._cycle(slot, -1));
      this._editObjs.push(left);

      this._slotTexts[slot] = this.add.text(width / 2 + 70, ry, '', {
        fontSize: '15px', color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this._editObjs.push(this._slotTexts[slot]);

      const right = this._makeArrow(width / 2 + 130, ry, '▶', () => this._cycle(slot, +1));
      this._editObjs.push(right);
      this._slotArrows[slot] = [left, right];

      this._slotInfo[slot] = this.add.text(width / 2 + 168, ry, '', {
        fontSize: '11px', color: '#556677', fontFamily: 'monospace',
      }).setOrigin(0, 0.5);
      this._editObjs.push(this._slotInfo[slot]);
    });

    this._editObjs.push(this.add.text(width / 2, 352 + SLOTS.length * 40,
      `WINGS: ${this._parts.wings > 0 ? 'yes' : 'no'}  (set by archetype)`, {
      fontSize: '11px', color: '#444466', fontFamily: 'monospace',
    }).setOrigin(0.5));

    // Cost + status line
    this._costText = this.add.text(width / 2, 510, '', {
      fontSize: '14px', color: '#ffdd44', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this._editObjs.push(this._costText);

    // Buttons
    this._applyBtn = this._makeButton(width / 2 - 110, height - 44, 'APPLY', '#a8ff78', () => this._apply());
    this._editObjs.push(this._applyBtn);
    this._editObjs.push(this._makeButton(width / 2 + 110, height - 44, 'BACK', '#88bbff', () => {
      this._showPickPhase();
    }));

    this._refreshEdit();
  }

  /** Variants selectable for a slot: the part already on the bug, plus any spares in stock. */
  _selectable(slot) {
    const out = [];
    for (let v = 1; v <= PART_COUNTS[slot]; v++) {
      if (v === this._original[slot] || GameState.partCount(slot, v) > 0) out.push(v);
    }
    return out;
  }

  _cycle(slot, dir) {
    const max = PART_COUNTS[slot];
    let v = this._parts[slot];
    for (let i = 0; i < max; i++) {
      v += dir;
      if (v < 1)   v = max;
      if (v > max) v = 1;
      if (v === this._original[slot] || GameState.partCount(slot, v) > 0) break;
    }
    this._parts[slot] = v;
    this._refreshEdit();
  }

  _changedCount() {
    return SLOTS.filter(s => this._parts[s] !== this._original[s]).length;
  }

  _refreshEdit() {
    // Redraw preview
    const idx = this._editObjs.indexOf(this._preview);
    destroyBugContainer(this._preview);
    this._preview = createBugContainer(this, this.scale.width / 2, 218, this._parts, 0.85);
    if (idx !== -1) this._editObjs[idx] = this._preview;

    // Spare parts panel
    let totalSpares = 0;
    const lines = SLOTS.map(slot => {
      const owned = [];
      for (let v = 1; v <= PART_COUNTS[slot]; v++) {
        const n = GameState.partCount(slot, v);
        if (n > 0) { owned.push(`v${v}×${n}`); totalSpares += n; }
      }
      return `${slot.toUpperCase().padEnd(5)} ${owned.length ? owned.join('  ') : '—'}`;
    });
    this._sparesText.setText(lines.join('\n'));

    SLOTS.forEach(slot => {
      const v       = this._parts[slot];
      const changed = v !== this._original[slot];
      this._slotTexts[slot]
        .setText(`${v} / ${PART_COUNTS[slot]}${changed ? ' *' : ''}`)
        .setColor(changed ? '#ffdd44' : '#ffffff');

      this._slotInfo[slot]
        .setText(v === this._original[slot] ? '(on bug)' : `spare ×${GameState.partCount(slot, v)}`)
        .setColor(v === this._original[slot] ? '#556677' : '#88ff88');

      const canCycle = this._selectable(slot).length > 1;
      this._slotArrows[slot].forEach(a => a.setAlpha(canCycle ? 1 : 0.25));
    });

    const cost      = this._changedCount() * PART_COST;
    const canAfford = GameState.currency >= cost;
    if (cost === 0) {
      this._costText
        .setText(totalSpares > 0
          ? 'Cycle parts with the arrows — * marks changes'
          : 'No spare parts — sell bugs (or lose them in battle) to salvage parts')
        .setColor('#555577');
    } else {
      this._costText
        .setText(`Cost: ${cost}g   (you have ${GameState.currency}g)`)
        .setColor(canAfford ? '#ffdd44' : '#ff6b6b');
    }

    const canApply = cost > 0 && canAfford;
    this._applyBtn.setData('disabled', !canApply).setAlpha(canApply ? 1 : 0.35);
  }

  _apply() {
    const cost = this._changedCount() * PART_COST;
    if (!GameState.setFarmParts(this._entry.uid, this._parts, cost)) return;

    this._original = { ...this._parts };
    this._refreshGold();
    this._refreshEdit();
    this._costText.setText(`Rebuilt ${this._entry.name}!`).setColor('#a8ff78');
  }

  // ── Button helpers ──────────────────────────────────────────────────────────

  _makeButton(x, y, label, color, cb) {
    const btn = this.add.text(x, y, `[ ${label} ]`, {
      fontSize: '18px', color, fontFamily: 'monospace',
      backgroundColor: '#141428', padding: { x: 12, y: 7 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => { if (!btn.getData('disabled')) btn.setScale(1.06); });
    btn.on('pointerout',  () => btn.setScale(1));
    btn.on('pointerdown', () => { if (!btn.getData('disabled')) cb(); });
    return btn;
  }

  _makeArrow(x, y, glyph, cb) {
    const btn = this.add.text(x, y, glyph, {
      fontSize: '17px', color: '#cc88ff', fontFamily: 'monospace',
      backgroundColor: '#141428', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setScale(1.15));
    btn.on('pointerout',  () => btn.setScale(1));
    btn.on('pointerdown', cb);
    return btn;
  }

  _makeSmallBtn(x, y, label, cb) {
    const btn = this.add.text(x, y, label, {
      fontSize: '12px', color: '#445566', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setColor('#8899aa'));
    btn.on('pointerout',  () => btn.setColor('#445566'));
    btn.on('pointerdown', cb);
    return btn;
  }
}
