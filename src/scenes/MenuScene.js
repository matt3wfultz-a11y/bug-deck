import GameState     from '../systems/GameState.js';
import { creatures } from '../data/creatures.js';
import { archetypes } from '../data/archetypes.js';

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

    // ── Archetype selection ───────────────────────────────────────────────────
    this.add.text(width / 2, nextY, '— Choose Your Archetype —', {
      fontSize: '15px', color: '#555566', fontFamily: 'monospace',
    }).setOrigin(0.5);
    nextY += 32;

    const archList  = Object.values(archetypes);
    const spacing   = 220;
    const startX    = width / 2 - spacing * (archList.length - 1) / 2;

    archList.forEach((arch, i) => {
      const x = startX + i * spacing;

      this.add.text(x, nextY, arch.name, {
        fontSize: '18px', color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5);

      const spdStr = `SPD ${arch.spd >= 0 ? '+' : ''}${arch.spd}`;
      const defStr = `DEF ${arch.def >= 0 ? '+' : ''}${arch.def}`;
      this.add.text(x, nextY + 26, `${spdStr}  ${defStr}`, {
        fontSize: '13px', color: '#777777', fontFamily: 'monospace',
      }).setOrigin(0.5);

      this._makeButton(x, nextY + 66, 'START', '#a8ff78', () => {
        this._startRun(arch.name);
      });
    });

    nextY += 130;

    // ── Divider ───────────────────────────────────────────────────────────────
    this.add.rectangle(width / 2, nextY, width - 80, 1, 0x2a2a50).setOrigin(0.5);
    nextY += 20;

    // ── Farm button ───────────────────────────────────────────────────────────
    this._makeButton(width / 2, nextY, 'FARM', '#88bbff', () => {
      this.scene.start('FarmScene');
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  _startRun(archetypeName) {
    GameState.selectedArchetype = archetypeName;

    const starters = creatures.filter(c => c.archetype === archetypeName).map(c => c.id);
    GameState.currentDeck = [...starters];
    GameState.currentHP   = {};
    starters.forEach(id => {
      const c = creatures.find(cr => cr.id === id);
      if (c) GameState.currentHP[id] = c.baseHp;
    });

    GameState.saveGame();
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
