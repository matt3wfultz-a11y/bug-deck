import Creature from './entities/Creature.js';
import BattleSystem from './systems/BattleSystem.js';
import GameState from './systems/GameState.js';
import MenuScene from './scenes/MenuScene.js';
import BattleScene from './scenes/BattleScene.js';
import CaptureScene from './scenes/CaptureScene.js';
import FarmScene from './scenes/FarmScene.js';

// Expose to window for console testing
window.Creature = Creature;
window.BattleSystem = BattleSystem;
window.GameState = GameState;

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1a1a2e',
  parent: document.body,
  scene: [MenuScene, BattleScene, CaptureScene, FarmScene],
};

window.main = function () {
  return new Phaser.Game(config);
};

window.main();

import MenuScene    from './scenes/MenuScene.js';
import BattleScene  from './scenes/BattleScene.js';
import CaptureScene from './scenes/CaptureScene.js';
import FarmScene    from './scenes/FarmScene.js';

const config = {
  type:            Phaser.AUTO,
  width:           800,
  height:          600,
  backgroundColor: '#1a1a2e',
  parent:          document.body,
  scene:           [MenuScene, BattleScene, CaptureScene, FarmScene],
};

window.main = function () {
  return new Phaser.Game(config);
};

window.main();
