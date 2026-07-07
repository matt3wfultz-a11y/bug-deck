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
import ShopScene         from './scenes/ShopScene.js';
import WorkshopScene     from './scenes/WorkshopScene.js';
import { creatures } from './data/creatures.js';
import { fetchSvgData } from './art/SvgParts.js';

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
  scene:           [MenuScene, DeckBuilderScene, MapScene, BattleScene, CaptureScene, FarmScene, BreedingScene, ShopScene, WorkshopScene],
};

window.main = function () {
  return new Phaser.Game(config);
};

// Fetch all SVG part data before starting Phaser so registerSvgTextures() works synchronously
(async () => {
  try {
    await fetchSvgData();
  } catch (e) {
    console.warn('SvgParts: could not fetch SVG assets, bug sprites will use fallback rectangles.', e);
  }
  window.main();
})();
