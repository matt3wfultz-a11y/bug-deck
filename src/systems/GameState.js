import Creature from '../entities/Creature.js';
import { creatures as creatureData } from '../data/creatures.js';

const SAVE_KEY = 'bugDeck_save';

class GameState {
  constructor() {
    this.reset();
  }

  // ── Public state ──────────────────────────────────────────────────────────

  reset() {
    this.selectedArchetype   = null;
    this.farm                = [];        // array of plain creature data objects
    this.selectedDeck        = [];        // creature data objects chosen in DeckBuilderScene
    this.selectedItems       = [];        // item objects chosen in DeckBuilderScene (max 3)
    this.currentDeck         = [];        // array of creature ids in active deck
    this.unlockedArchetypes  = ['Flying'];
    this.currency            = 0;
    this.completedRuns       = 0;
    this.currentHP           = {};        // { [creatureId]: number }
  }

  clearRun() {
    this.selectedArchetype = null;
    this.currentDeck       = [];
    this.currentHP         = {};
  }

  /** Add a captured Creature to the persistent farm (stores plain data object). */
  addToFarm(creature) {
    const stats = creature.getStats();
    this.farm.push({
      id:        creature.id,
      name:      creature.name,
      archetype: creature.archetype,
      ability:   creature.ability,
      baseHp:    stats.hp,
      baseAtk:   stats.atk,
      baseDef:   stats.def,
      baseSpd:   stats.spd,
      generation: 0,
    });
    this.saveGame();
  }

  /** @returns {object[]} Array of farm creature data objects. */
  getFarm() {
    return this.farm;
  }

  /**
   * Breed two farm creatures by index.
   * Uses Creature.breed for stat averaging + variance.
   * Parents are consumed (removed from farm).
   * @returns {object} The offspring's plain data entry, or null on failure.
   */
  breed(idx1, idx2) {
    const e1 = this.farm[idx1];
    const e2 = this.farm[idx2];
    if (!e1 || !e2) return null;

    const toCreature = e => new Creature({
      id: e.id, name: e.name, archetype: e.archetype, ability: e.ability,
      baseHp: e.baseHp, baseAtk: e.baseAtk, baseDef: e.baseDef, baseSpd: e.baseSpd,
    }, 1);

    const offspring      = Creature.breed(toCreature(e1), toCreature(e2));
    const offspringStats = offspring.getStats();
    const generation     = Math.max(e1.generation ?? 0, e2.generation ?? 0) + 1;

    const entry = {
      id:        offspring.id,
      name:      offspring.name,
      archetype: offspring.archetype,
      ability:   offspring.ability,
      baseHp:    offspringStats.hp,
      baseAtk:   offspringStats.atk,
      baseDef:   offspringStats.def,
      baseSpd:   offspringStats.spd,
      generation,
    };

    // Remove parents (higher index first to avoid shift)
    this.farm.splice(Math.max(idx1, idx2), 1);
    this.farm.splice(Math.min(idx1, idx2), 1);

    this.farm.push(entry);
    this.saveGame();
    console.log('[Breed]', entry);
    return entry;
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  saveGame() {
    const payload = {
      selectedArchetype:  this.selectedArchetype,
      farm:               this.farm,
      currentDeck:        this.currentDeck,
      unlockedArchetypes: this.unlockedArchetypes,
      currency:           this.currency,
      completedRuns:      this.completedRuns,
      currentHP:          this.currentHP,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('GameState.saveGame failed:', e);
    }
  }

  loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      this.selectedArchetype  = data.selectedArchetype  ?? null;
      // Migrate old format: farm was stored as string IDs; now stored as data objects
      this.farm = (data.farm ?? []).map(entry => {
        if (typeof entry !== 'string') return entry;   // already a proper object
        const c = creatureData.find(cr => cr.id === entry);
        if (!c) return null;
        return {
          id: c.id, name: c.name, archetype: c.archetype, ability: c.ability,
          baseHp: c.baseHp, baseAtk: c.baseAtk, baseDef: c.baseDef, baseSpd: c.baseSpd,
          generation: 0,
        };
      }).filter(Boolean);
      this.currentDeck        = data.currentDeck        ?? [];
      this.unlockedArchetypes = data.unlockedArchetypes ?? ['Flying'];
      this.currency           = data.currency           ?? 0;
      this.completedRuns      = data.completedRuns      ?? 0;
      this.currentHP          = data.currentHP          ?? {};
      return true;
    } catch (e) {
      console.warn('GameState.loadGame failed:', e);
      return false;
    }
  }
}

// Singleton export
export default new GameState();