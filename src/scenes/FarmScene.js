import GameState from '../systems/GameState.js';
import { creatures } from '../data/creatures.js';

export default class FarmScene extends Phaser.Scene {
  constructor() {
    super('FarmScene');
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, 36, 'Farm', {
      fontSize: '28px', color: '#78c8ff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(20, 80, `Currency: ${GameState.currency}  |  Completed Runs: ${GameState.completedRuns}`, {
      fontSize: '16px', color: '#cccccc', fontFamily: 'monospace',
    });

    const farmIds = GameState.farm;

    if (farmIds.length === 0) {
      this.add.text(width / 2, height / 2, 'No creatures yet. Start a run to capture some!', {
        fontSize: '16px', color: '#888888', fontFamily: 'monospace', wordWrap: { width: 600 },
      }).setOrigin(0.5);
    } else {
      let row = 0;
      farmIds.forEach(id => {
        const c = creatures.find(cr => cr.id === id);
        if (!c) return;
        const hp  = GameState.currentHP[id] ?? c.baseHp;
        const y   = 130 + row * 52;
        const col = `[${c.archetype[0]}]`;

        this.add.text(30, y,
          `${col} ${c.name.padEnd(18)} HP:${String(hp).padStart(3)}/${c.baseHp}  ATK:${c.baseAtk}  DEF:${c.baseDef}  SPD:${c.baseSpd}`,
          { fontSize: '15px', color: '#ffffff', fontFamily: 'monospace' }
        );

        this.add.text(30, y + 18, `  ✦ ${c.ability.name}: ${c.ability.desc}`, {
          fontSize: '12px', color: '#aaaaaa', fontFamily: 'monospace', wordWrap: { width: 740 },
        });

        row++;
      });
    }

    this.add.text(width / 2, height - 60, '[ Back to Menu ]', {
      fontSize: '18px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('MenuScene'));
  }
}
