import GameState from '../systems/GameState.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const { width, height } = this.scale;

    GameState.loadGame();

    // ── Title ─────────────────────────────────────────────────────────────────
    this.add.text(width / 2, 48, 'Bug Collector', {
      fontSize: '36px', color: '#a8ff78', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width / 2, 88, 'Deckbuilder', {
      fontSize: '20px', color: '#66bbff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // ── Currency display ──────────────────────────────────────────────────────
    this.add.text(width - 14, 14, `Gold: ${GameState.currency}`, {
      fontSize: '13px', color: '#ffdd44', fontFamily: 'monospace',
    }).setOrigin(1, 0);

    // ── Farm count ────────────────────────────────────────────────────────────
    const farmCount = GameState.getFarm().length;
    this.add.text(width / 2, 120, `Farm: ${farmCount} creature${farmCount !== 1 ? 's' : ''}`, {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);

    let nextY = 168;

    // ── Continue button (if run in progress) ──────────────────────────────────
    if (GameState.selectedArchetype) {
      this.add.text(width / 2, nextY, `Run in progress  [${GameState.selectedArchetype}]`, {
        fontSize: '13px', color: '#ffdd44', fontFamily: 'monospace',
      }).setOrigin(0.5);
      nextY += 28;

      this._makeButton(width / 2, nextY, 'CONTINUE RUN', '#ffdd44', () => {
        this.scene.start('DeckBuilderScene');
      });
      nextY += 60;
    }

    // ── Start button ──────────────────────────────────────────────────────────
    this._makeButton(width / 2, nextY, 'START', '#a8ff78', () => {
      this._startRun();
    });

    nextY += 70;

    // ── Divider ───────────────────────────────────────────────────────────────
    this.add.rectangle(width / 2, nextY, width - 80, 1, 0x2a2a50).setOrigin(0.5);
    nextY += 20;

    // ── Farm button ───────────────────────────────────────────────────────────
    this._makeButton(width / 2, nextY, 'FARM', '#88bbff', () => {
      this.scene.start('FarmScene');
    });

    nextY += 60;

    // ── Shop button ───────────────────────────────────────────────────────────
    this._makeButton(width / 2, nextY, 'SHOP', '#ffdd44', () => {
      this.scene.start('ShopScene');
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  _startRun() {
    GameState.clearRun();           // resets all run state & returns any stale hand creatures to farm
    this.scene.start('DeckBuilderScene');
  }

  _makeButton(x, y, label, color, cb) {
    const btn = this.add.text(x, y, `[ ${label} ]`, {
      fontSize: '18px', color, fontFamily: 'monospace',
      backgroundColor: '#141428', padding: { x: 12, y: 7 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout',  () => btn.setColor(color));
    btn.on('pointerdown', cb);
    return btn;
  }
}
