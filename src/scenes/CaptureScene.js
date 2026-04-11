import GameState from '../systems/GameState.js';
import { creatures } from '../data/creatures.js';
import { archetypes } from '../data/archetypes.js';

export default class CaptureScene extends Phaser.Scene {
  constructor() {
    super('CaptureScene');
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, 36, 'Choose Your Archetype', {
      fontSize: '26px', color: '#a8ff78', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const unlocked = GameState.unlockedArchetypes;
    let col = 0;

    Object.values(archetypes).forEach(arch => {
      const x = 200 + col * 200;
      const y = 180;
      const locked = !unlocked.includes(arch.name);
      const color  = locked ? '#666666' : '#ffffff';

      this.add.text(x, y, arch.name, {
        fontSize: '20px', color, fontFamily: 'monospace',
      }).setOrigin(0.5);

      this.add.text(x, y + 30, `SPD ${arch.spd >= 0 ? '+' : ''}${arch.spd}  DEF ${arch.def >= 0 ? '+' : ''}${arch.def}`, {
        fontSize: '14px', color: '#aaaaaa', fontFamily: 'monospace',
      }).setOrigin(0.5);

      if (!locked) {
        const btn = this.add.text(x, y + 70, '[ Select ]', {
          fontSize: '16px', color: '#a8ff78', fontFamily: 'monospace',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn.on('pointerdown', () => this._selectArchetype(arch.name));
      } else {
        this.add.text(x, y + 70, '[ Locked ]', {
          fontSize: '16px', color: '#555555', fontFamily: 'monospace',
        }).setOrigin(0.5);
      }

      col++;
    });

    // Show starter creatures for selected archetype
    this._creatureListY = 320;
    this._creatureTexts = [];

    this.add.text(width / 2, height - 60, '[ Back to Menu ]', {
      fontSize: '18px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('MenuScene'));
  }

  _selectArchetype(archetypeName) {
    GameState.selectedArchetype = archetypeName;

    // Give player the 4 creatures of that archetype as their starting farm/deck
    const starters = creatures.filter(c => c.archetype === archetypeName).map(c => c.id);
    GameState.farm        = [...starters];
    GameState.currentDeck = [...starters];
    GameState.currentHP   = {};
    starters.forEach(id => {
      const c = creatures.find(cr => cr.id === id);
      if (c) GameState.currentHP[id] = c.baseHp;
    });

    GameState.saveGame();
    this.scene.start('BattleScene');
  }
}
