import GameState from '../systems/GameState.js';

const CARD_W   = 176;
const CARD_H   = 110;
const COLS     = 4;
const PER_PAGE = 12;           // COLS × 3 rows
const GAP      = 8;
const START_X  = 16;
const START_Y  = 68;
const COL_STEP = CARD_W + GAP; // 184
const ROW_STEP = CARD_H + GAP; // 118

const ARCH_COLOR = { Flying: '#ffdd44', Ground: '#cc9944', Water: '#66aaff' };

export default class FarmScene extends Phaser.Scene {
  constructor() {
    super('FarmScene');
  }

  create() {
    const { width, height } = this.scale;

    // ── Header ────────────────────────────────────────────────────────────────
    this.add.rectangle(width / 2, 0, width, 58, 0x0d0d1a).setOrigin(0.5, 0);
    this.add.rectangle(width / 2, 58, width, 2, 0x2a2a50).setOrigin(0.5, 0);
    this.add.text(width / 2, 16, 'YOUR FARM', {
      fontSize: '20px', color: '#78c8ff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Type breakdown subtitle
    const farm        = GameState.getFarm();
    const breakdown   = ['Flying', 'Ground', 'Water']
      .map(a => ({ a, n: farm.filter(c => c.archetype === a).length }))
      .filter(({ n }) => n > 0)
      .map(({ a, n }) => `${a}:${n}`)
      .join('  ');
    this.add.text(width / 2, 42,
      farm.length > 0 ? `${farm.length} creature${farm.length !== 1 ? 's' : ''}  ${breakdown}` : '',
      { fontSize: '12px', color: '#555577', fontFamily: 'monospace' }
    ).setOrigin(0.5);

    // ── State ─────────────────────────────────────────────────────────────────
    this._farm        = farm;
    this._selected    = new Set();
    this._page        = 0;
    this._cardObjects = [];

    // ── Page nav (hidden until needed) ───────────────────────────────────────
    this._prevBtn = this._makePageBtn(width / 2 - 90, 432, '< PREV', () => this._changePage(-1));
    this._nextBtn = this._makePageBtn(width / 2 + 90, 432, 'NEXT >', () => this._changePage(+1));
    this._pageLabel = this.add.text(width / 2, 432, '', {
      fontSize: '12px', color: '#445566', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // ── Status / animation text ───────────────────────────────────────────────
    this._statusText = this.add.text(width / 2, 453, '', {
      fontSize: '13px', color: '#a8ff78', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // ── Hint ─────────────────────────────────────────────────────────────────
    this._hintText = this.add.text(width / 2, 453, 'Click 2 creatures to select for breeding', {
      fontSize: '12px', color: '#333355', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // ── Buttons ───────────────────────────────────────────────────────────────
    this._breedBtn = this._makeButton(width / 2 - 110, 482, 'BREED', '#a8ff78', () => this._doBreed());
    this._makeButton(width / 2 + 110, 482, 'BACK', '#88bbff', () => this.scene.start('MenuScene'));

    this._buildGrid();
    this._updateBreedBtn();
  }

  // ── Grid management ───────────────────────────────────────────────────────

  _clearGrid() {
    this._cardObjects.forEach(o => o.destroy());
    this._cardObjects = [];
  }

  _buildGrid() {
    if (this._farm.length === 0) {
      const t = this.add.text(400, 250, 'No creatures yet.\nWin battles to capture!', {
        fontSize: '18px', color: '#444455', fontFamily: 'monospace', align: 'center',
      }).setOrigin(0.5);
      this._cardObjects.push(t);
      this._updatePageNav();
      return;
    }

    const start = this._page * PER_PAGE;
    const slice = this._farm.slice(start, start + PER_PAGE);

    slice.forEach((creature, i) => {
      const col     = i % COLS;
      const row     = Math.floor(i / COLS);
      const cx      = START_X + col * COL_STEP;
      const cy      = START_Y + row * ROW_STEP;
      const farmIdx = start + i;
      this._buildCard(creature, farmIdx, cx, cy);
    });

    this._updatePageNav();
  }

  _buildCard(creature, farmIdx, cx, cy) {
    const selected   = this._selected.has(farmIdx);
    const archColor  = ARCH_COLOR[creature.archetype] || '#aaaaaa';
    const borderCol  = selected ? 0x88ffaa : 0x2a2a50;
    const borderW    = selected ? 2 : 1;

    // Background fill
    const bg = this.add.rectangle(cx + CARD_W / 2, cy + CARD_H / 2, CARD_W, CARD_H, 0x0d0d1a);

    // Border
    const gfx = this.add.graphics();
    gfx.lineStyle(borderW, borderCol, 1);
    gfx.strokeRect(cx, cy, CARD_W, CARD_H);

    // Name (truncate if long)
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
    const statsText = this.add.text(cx + CARD_W / 2, cy + 40,
      `HP:${creature.baseHp}  ATK:${creature.baseAtk}  DEF:${creature.baseDef}  SPD:${creature.baseSpd}`,
      { fontSize: '11px', color: '#cccccc', fontFamily: 'monospace' }
    ).setOrigin(0.5, 0);

    // Ability name
    const abilText = this.add.text(cx + CARD_W / 2, cy + 57,
      `\u2726 ${creature.ability.name}`,
      { fontSize: '10px', color: '#665577', fontFamily: 'monospace' }
    ).setOrigin(0.5, 0);

    // Generation badge (only for bred creatures)
    const gen = creature.generation ?? 0;
    if (gen > 0) {
      this.add.text(cx + CARD_W - 6, cy + 8, `G${gen}`, {
        fontSize: '10px', color: '#886644', fontFamily: 'monospace',
      }).setOrigin(1, 0);
    }

    // Selection checkmark
    if (selected) {
      const chk = this.add.text(cx + 6, cy + 8, '\u2713', {
        fontSize: '13px', color: '#88ffaa', fontFamily: 'monospace',
      }).setOrigin(0, 0);
      this._cardObjects.push(chk);
    }

    // Invisible hit area
    const hit = this.add
      .rectangle(cx + CARD_W / 2, cy + CARD_H / 2, CARD_W, CARD_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerover', () => { if (!selected) bg.setFillStyle(0x111133); });
    hit.on('pointerout',  () => { if (!selected) bg.setFillStyle(0x0d0d1a); });
    hit.on('pointerdown', () => this._toggleSelect(farmIdx));

    this._cardObjects.push(bg, gfx, nameText, archText, statsText, abilText, hit);
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  _toggleSelect(farmIdx) {
    if (this._selected.has(farmIdx)) {
      this._selected.delete(farmIdx);
    } else if (this._selected.size < 2) {
      this._selected.add(farmIdx);
    }
    this._clearGrid();
    this._buildGrid();
    this._updateBreedBtn();
  }

  _updateBreedBtn() {
    const canBreed = this._selected.size === 2;
    this._breedBtn.setData('disabled', !canBreed);
    this._breedBtn.setAlpha(canBreed ? 1 : 0.35);
    this._hintText.setVisible(!canBreed && this._farm.length >= 2);
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  _changePage(dir) {
    const maxPage = Math.max(0, Math.ceil(this._farm.length / PER_PAGE) - 1);
    this._page = Math.max(0, Math.min(maxPage, this._page + dir));
    this._selected.clear();
    this._clearGrid();
    this._buildGrid();
    this._updateBreedBtn();
  }

  _updatePageNav() {
    const totalPages = Math.max(1, Math.ceil(this._farm.length / PER_PAGE));
    const showNav    = totalPages > 1;
    this._prevBtn.setVisible(showNav && this._page > 0);
    this._nextBtn.setVisible(showNav && this._page < totalPages - 1);
    this._pageLabel.setText(showNav ? `${this._page + 1} / ${totalPages}` : '');
  }

  // ── Breeding ──────────────────────────────────────────────────────────────

  _doBreed() {
    if (this._selected.size !== 2) return;
    const [idx1, idx2] = [...this._selected];

    this._breedBtn.setAlpha(0.35).setData('disabled', true);
    this._hintText.setVisible(false);
    this._statusText.setText('Breeding...');

    this.time.delayedCall(700, () => {
      const offspring = GameState.breed(idx1, idx2);
      if (offspring) {
        this._farm = GameState.getFarm();
        this._selected.clear();
        // Jump to last page so new offspring is visible
        this._page = Math.max(0, Math.ceil(this._farm.length / PER_PAGE) - 1);
        this._clearGrid();
        this._buildGrid();
        this._statusText.setText(`New: ${offspring.name}!`);
        this._updateBreedBtn();
        this.time.delayedCall(2200, () => this._statusText.setText(''));
      }
    });
  }

  // ── Button helpers ────────────────────────────────────────────────────────

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

  _makePageBtn(x, y, label, cb) {
    const btn = this.add.text(x, y, label, {
      fontSize: '12px', color: '#445566', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setColor('#8899aa'));
    btn.on('pointerout',  () => btn.setColor('#445566'));
    btn.on('pointerdown', cb);
    return btn;
  }
}
