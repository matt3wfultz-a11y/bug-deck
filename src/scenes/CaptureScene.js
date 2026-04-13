import GameState from '../systems/GameState.js';

export default class CaptureScene extends Phaser.Scene {
  constructor() {
    super('CaptureScene');
  }

  init(data) {
    // Receive the capturable Creature instance from BattleScene (may be null)
    this._capturable = data?.capturable ?? null;
  }

  create() {
    const { width, height } = this.scale;

    // ── Header ────────────────────────────────────────────────────────────────
    this.add.rectangle(width / 2, 0, width, 58, 0x0d0d1a).setOrigin(0.5, 0);
    this.add.rectangle(width / 2, 58, width, 2, 0x2a2a50).setOrigin(0.5, 0);
    this.add.text(width / 2, 16, 'CAPTURE', {
      fontSize: '22px', color: '#a8ff78', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, 42, 'A wild creature is weakened...', {
      fontSize: '13px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const creature = this._capturable;

    if (!creature) {
      // ── No capture available ───────────────────────────────────────────────
      this.add.text(width / 2, height / 2 - 40, 'No creature to capture.', {
        fontSize: '20px', color: '#aaaaaa', fontFamily: 'monospace',
      }).setOrigin(0.5);

      this._makeButton(width / 2, height / 2 + 30, 'CONTINUE', '#ffffff', () => {
        this.scene.start('MenuScene');
      });
    } else {
      // ── Creature card ─────────────────────────────────────────────────────
      const cardX  = width / 2 - 160;
      const cardY  = 90;
      const cardW  = 320;
      const cardH  = 220;

      this.add.rectangle(width / 2, cardY + cardH / 2, cardW, cardH, 0x111122).setOrigin(0.5);
      this.add.rectangle(width / 2, cardY + cardH / 2, cardW, cardH, 0x2a2a50)
        .setOrigin(0.5).setFillStyle(0x111122).setStrokeStyle(1, 0x4444aa);

      // Creature sprite placeholder
      this.add.rectangle(width / 2, cardY + 56, 60, 60, 0x33aa55);

      const stats = creature.getStats();

      this.add.text(width / 2, cardY + 12, creature.name, {
        fontSize: '22px', color: '#a8ff78', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5);

      this.add.text(width / 2, cardY + 96, `[${creature.archetype}]`, {
        fontSize: '13px', color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);

      // Stats row
      this.add.text(width / 2, cardY + 120,
        `HP ${creature.currentHP}/${stats.hp}   ATK ${stats.atk}   DEF ${stats.def}   SPD ${stats.spd}`,
        { fontSize: '14px', color: '#cccccc', fontFamily: 'monospace' }
      ).setOrigin(0.5);

      // Ability
      this.add.text(width / 2, cardY + 148,
        `✦ ${creature.ability.name}: ${creature.ability.desc}`,
        {
          fontSize: '12px', color: '#aaaaaa', fontFamily: 'monospace',
          wordWrap: { width: cardW - 24 }, align: 'center',
        }
      ).setOrigin(0.5);

      // ── Buttons ───────────────────────────────────────────────────────────
      this._makeButton(width / 2 - 110, height - 130, 'CAPTURE', '#a8ff78', () => {
        GameState.addToFarm(creature);
        this.scene.start('MenuScene');
      });

      this._makeButton(width / 2 + 110, height - 130, 'RELEASE', '#ff8888', () => {
        this.scene.start('MenuScene');
      });

      this.add.text(width / 2, height - 88,
        'CAPTURE adds it to your farm   |   RELEASE lets it go',
        { fontSize: '12px', color: '#555566', fontFamily: 'monospace' }
      ).setOrigin(0.5);
    }
  }

  _makeButton(x, y, label, color, cb) {
    const btn = this.add.text(x, y, `[ ${label} ]`, {
      fontSize: '20px', color, fontFamily: 'monospace',
      backgroundColor: '#141428', padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setScale(1.06));
    btn.on('pointerout',  () => btn.setScale(1));
    btn.on('pointerdown', cb);
    return btn;
  }
}
