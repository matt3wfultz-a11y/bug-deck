import GameState from '../systems/GameState.js';
import { creatures } from '../data/creatures.js';

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, 40, 'Battle Scene', {
      fontSize: '28px', color: '#ff6b6b', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const deckNames = GameState.currentDeck.map(id => {
      const c = creatures.find(cr => cr.id === id);
      return c ? c.name : id;
    });

    this.add.text(width / 2, 100, `Deck: ${deckNames.join(', ') || '(empty)'}`, {
      fontSize: '16px', color: '#cccccc', fontFamily: 'monospace', wordWrap: { width: 700 },
    }).setOrigin(0.5);

    this.add.text(width / 2, height - 60, '[ Back to Menu ]', {
      fontSize: '20px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('MenuScene'));
  }
}
