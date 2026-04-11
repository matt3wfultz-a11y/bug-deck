import GameState from '../systems/GameState.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 3, 'Bug Collector Deckbuilder', {
      fontSize: '32px', color: '#a8ff78', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const loaded = GameState.loadGame();

    if (loaded) {
      this._makeButton(width / 2, height / 2, 'Continue Run', () => {
        this.scene.start('BattleScene');
      });
      this._makeButton(width / 2, height / 2 + 60, 'New Run', () => {
        GameState.clearRun();
        GameState.saveGame();
        this.scene.start('CaptureScene');
      });
    } else {
      this._makeButton(width / 2, height / 2, 'Start Game', () => {
        this.scene.start('CaptureScene');
      });
    }

    this._makeButton(width / 2, height / 2 + 130, 'Farm', () => {
      this.scene.start('FarmScene');
    });
  }

  _makeButton(x, y, label, callback) {
    const txt = this.add.text(x, y, `[ ${label} ]`, {
      fontSize: '22px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    txt.on('pointerover',  () => txt.setColor('#a8ff78'));
    txt.on('pointerout',   () => txt.setColor('#ffffff'));
    txt.on('pointerdown',  callback);
  }
}
