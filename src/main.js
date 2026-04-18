import Creature     from './entities/Creature.js';
import BattleSystem  from './systems/BattleSystem.js';
import GameState     from './systems/GameState.js';
import MenuScene         from './scenes/MenuScene.js';
import DeckBuilderScene  from './scenes/DeckBuilderScene.js';
import MapScene          from './scenes/MapScene.js';
import BattleScene       from './scenes/BattleScene.js';
import CaptureScene      from './scenes/CaptureScene.js';
import FarmScene         from './scenes/FarmScene.js';
import BreedingScene     from './scenes/BreedingScene.js';
import { creatures } from './data/creatures.js';

// Expose to window for console testing
window.Creature     = Creature;
window.BattleSystem = BattleSystem;
window.GameState    = GameState;
window.creatures    = creatures;

const config = {
  type:            Phaser.AUTO,
  width:           800,
  height:          600,
  backgroundColor: '#1a1a2e',
  parent:          document.body,
  scene:           [MenuScene, DeckBuilderScene, MapScene, BattleScene, CaptureScene, FarmScene, BreedingScene],
};

window.main = function () {
  return new Phaser.Game(config);
};

window.main();
