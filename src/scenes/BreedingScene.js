import GameState from '../systems/GameState.js';

// Card geometry (matches FarmScene)
const CARD_W   = 176;
const CARD_H   = 130;
const COLS     = 4;
const GAP      = 8;
const START_X  = 16;
const START_Y  = 72;
const COL_STEP = CARD_W + GAP;  // 184
const ROW_STEP = CARD_H + GAP;  // 138

const ARCH_COLOR = { Flying: '#ffdd44', Ground: '#cc9944', Water: '#66aaff' };

export default class BreedingScene extends Phaser.Scene {
  constructor() {
    super('BreedingScene');
  }

  create() {
    const { width, height } = this.scale;

    // ── Header ────────────────────────────────────────────────────────────────
    this.add.rectangle(width / 2, 0, width, 58, 0x0d0d1a).setOrigin(0.5, 0);
    this.add.rectangle(width / 2, 58, width, 2, 0x2a2a50).setOrigin(0.5, 0);
    this.add.text(width / 2, 16, 'BREEDING', {
      fontSize: '22px', color: '#cc88ff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width / 2, 42, 'Select 2 hand creatures to combine', {
      fontSize: '12px', color: '#555577', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // ── State ─────────────────────────────────────────────────────────────────
    this._hand     = GameState.selectedDeck;
    this._selected = new Set();
    this._cards    = [];

    // ── Status / hint text ────────────────────────────────────────────────────
    this._statusText = this.add.text(width / 2, height - 84, '', {
      fontSize: '14px', color: '#a8ff78', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this._hintText = this.add.text(width / 2, height - 84, '', {
      fontSize: '12px', color: '#555566', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // ── Buttons ───────────────────────────────────────────────────────────────
    this._breedBtn = this._makeButton(width / 2 - 100, height - 46, 'BREED', '#cc88ff', () => this._doBreed());
    this._makeButton(width / 2 + 100, height - 46, 'BACK', '#88bbff', () => this.scene.start('MapScene'));

    this._buildGrid();
    this._refresh();
  }

  // ── Grid ─────────────────────────────────────────────────────────────────

  _clearGrid() {
    this._cards.forEach(o => o.destroy());
    this._cards = [];
  }

  _buildGrid() {
    this._clearGrid();

    if (this._hand.length < 2) {
      const msg = this._hand.length === 0
        ? 'No creatures in hand.'
        : 'Need at least 2 hand creatures to breed.';
      const t = this.add.text(400, 260, msg, {
        fontSize: '16px', color: '#444455', fontFamily: 'monospace', align: 'center',
      }).setOrigin(0.5);
      this._cards.push(t);
      return;
    }

    this._hand.forEach((creature, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx  = START_X + col * COL_STEP;
      const cy  = START_Y + row * ROW_STEP;
      this._buildCard(creature, i, cx, cy);
    });
  }

  _buildCard(creature, idx, cx, cy) {
    const selected  = this._selected.has(idx);
    const archColor = ARCH_COLOR[creature.archetype] || '#aaaaaa';
    const borderCol = selected ? 0xbb66ff : 0x2a2a50;
    const borderW   = selected ? 2 : 1;
    const bgFill    = selected ? 0x1a0a2a : 0x0d0d1a;

    const bg = this.add.rectangle(cx + CARD_W / 2, cy + CARD_H / 2, CARD_W, CARD_H, bgFill);

    const gfx = this.add.graphics();
    gfx.lineStyle(borderW, borderCol, 1);
    gfx.strokeRect(cx, cy, CARD_W, CARD_H);

    // Name
    const displayName = creature.name.length > 20
      ? creature.name.slice(0, 19) + '\u2026'
      : creature.name;
    const nameText = this.add.text(cx + CARD_W / 2, cy + 8, displayName, {
      fontSize: '13px', color: archColor, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // Archetype tag
    const archText = this.add.text(cx + CARD_W / 2, cy + 25, `[${creature.archetype}]`, {
      fontSize: '10px', color: '#444466', fontFamily: 'monospace',
    }).setOrigin(0.5, 0);

    // Stats
    const statsText = this.add.text(cx + CARD_W / 2, cy + 41,
      `HP:${creature.baseHp}  ATK:${creature.baseAtk}  DEF:${creature.baseDef}`,
      { fontSize: '10px', color: '#cccccc', fontFamily: 'monospace' }
    ).setOrigin(0.5, 0);

    // Ability
    const abilText = this.add.text(cx + CARD_W / 2, cy + 57,
      `\u2726 ${creature.ability?.name || ''}`,
      { fontSize: '9px', color: '#665577', fontFamily: 'monospace' }
    ).setOrigin(0.5, 0);

    // Generation badge
    const gen = creature.generation ?? 0;
    if (gen > 0) {
      const genT = this.add.text(cx + CARD_W - 6, cy + 8, `G${gen}`, {
        fontSize: '10px', color: '#886644', fontFamily: 'monospace',
      }).setOrigin(1, 0);
      this._cards.push(genT);
    }

    // Selection checkmark
    if (selected) {
      const chk = this.add.text(cx + 6, cy + 8, '\u2713', {
        fontSize: '14px', color: '#cc88ff', fontFamily: 'monospace',
      }).setOrigin(0, 0);
      this._cards.push(chk);
    }

    // Invisible hit area
    const hit = this.add
      .rectangle(cx + CARD_W / 2, cy + CARD_H / 2, CARD_W, CARD_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerover', () => { if (!selected) bg.setFillStyle(0x15082a); });
    hit.on('pointerout',  () => { if (!selected) bg.setFillStyle(0x0d0d1a); });
    hit.on('pointerdown', () => this._toggleSelect(idx));

    this._cards.push(bg, gfx, nameText, archText, statsText, abilText, hit);
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  _toggleSelect(idx) {
    if (this._selected.has(idx)) {
      this._selected.delete(idx);
    } else if (this._selected.size < 2) {
      this._selected.add(idx);
    }
    this._buildGrid();
    this._refresh();
  }

  _refresh() {
    const canBreed = this._selected.size === 2 && this._hand.length >= 2;
    this._breedBtn.setData('disabled', !canBreed).setAlpha(canBreed ? 1 : 0.35);

    const remaining = 2 - this._selected.size;
    if (this._hand.length < 2) {
      this._hintText.setText('Not enough creatures to breed.');
    } else if (remaining > 0) {
      this._hintText.setText(`Select ${remaining} more creature${remaining > 1 ? 's' : ''}`);
    } else {
      this._hintText.setText('Ready to breed! Click [ BREED ]');
    }
  }

  // ── Breeding ──────────────────────────────────────────────────────────────

  _doBreed() {
    if (this._selected.size !== 2) return;
    const [idx1, idx2] = [...this._selected];

    this._breedBtn.setAlpha(0.35).setData('disabled', true);
    this._hintText.setText('Breeding...');

    this.time.delayedCall(700, () => {
      const offspring = GameState.breedFromHand(idx1, idx2);
      if (offspring) {
        this._hand     = GameState.selectedDeck;
        this._selected = new Set();
        this._buildGrid();
        this._hintText.setText('');
        this._statusText.setText(`New creature: ${offspring.name}!`);
        this._refresh();

        // Auto-return to map after a moment
        this.time.delayedCall(2000, () => this.scene.start('MapScene'));
      }
    });
  }

  // ── Button helper ─────────────────────────────────────────────────────────

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
}
