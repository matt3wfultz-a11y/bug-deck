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
    this.hand                = [];        // creatures captured mid-run (returned to farm at run end)
    this.selectedDeck        = [];        // creature data objects chosen in DeckBuilderScene
    this.selectedItems       = [];        // item objects chosen in DeckBuilderScene (max 3)
    this.currentDeck         = [];        // array of creature ids in active deck
    this.unlockedArchetypes  = ['Flying'];
    this.currency            = 0;
    this.itemInventory       = [];        // items purchased from shop (permanent unlocks)
    this.completedRuns       = 0;
    this.runFightWins        = 0;         // fight wins in current run (0-3)
    this.lootTaken           = false;     // true once loot taken this round
    this.currentHP           = {};        // { [creatureId]: number }
  }

  clearRun() {
    // Surviving hand creatures (captured mid-run) go back to farm
    for (const entry of this.hand) {
      if (this.farm.length < 20) this.farm.push(entry);
    }
    this.hand              = [];
    this.selectedArchetype = null;
    this.selectedDeck      = [];
    this.selectedItems     = [];
    this.currentDeck       = [];
    this.currentHP         = {};
    this.runFightWins      = 0;
    this.lootTaken         = false;
    this.saveGame();
  }

  _makeUid() {
    return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
  }

  /** Add a captured Creature to the persistent farm (stores plain data object). */
  addToFarm(creature) {
    if (this.farm.length >= 20) return false;
    const stats = creature.getStats();
    this.farm.push({
      uid:        this._makeUid(),
      id:         creature.id,
      name:       creature.name,
      archetype:  creature.archetype,
      ability:    creature.ability,
      special:    creature.special ?? null,
      baseHp:     stats.hp,
      baseAtk:    stats.atk,
      baseDef:    stats.def,
      baseSpd:    stats.spd,
      generation: 0,
    });
    this.saveGame();
  }

  /**
   * Add a captured Creature to the active run's hand.
   * Also appends to selectedDeck so it's available in future battles this run.
   * Surviving hand creatures are returned to farm by clearRun().
   */
  addToHand(creature) {
    const stats = creature.getStats();
    const entry = {
      uid:        this._makeUid(),
      id:         creature.id,
      name:       creature.name,
      archetype:  creature.archetype,
      ability:    creature.ability,
      special:    creature.special ?? null,
      baseHp:     stats.hp,
      baseAtk:    stats.atk,
      baseDef:    stats.def,
      baseSpd:    stats.spd,
      generation: 0,
    };
    this.hand.push(entry);
    this.selectedDeck.push(entry);
    this.saveGame();
  }

  /**
   * Move farm creatures into hand for the active run.
   * Called from DeckBuilderScene when the player starts a battle.
   * Creatures are removed from farm and tracked in hand; clearRun() returns survivors.
   */
  deployFromFarm(entries) {
    for (const entry of entries) {
      const fi = this.farm.findIndex(e => e.uid === entry.uid);
      if (fi !== -1) {
        const [removed] = this.farm.splice(fi, 1);
        this.hand.push(removed);
      }
    }
    this.saveGame();
  }

  /**
   * Permanently remove creatures from farm and hand by uid.
   * Called when player creatures die in battle.
   */
  removeDeadRunCreatures(uids) {
    for (const uid of uids) {
      const fi = this.farm.findIndex(e => e.uid === uid);
      if (fi !== -1) this.farm.splice(fi, 1);
      const hi = this.hand.findIndex(e => e.uid === uid);
      if (hi !== -1) this.hand.splice(hi, 1);
    }
    this.saveGame();
  }

  /** @returns {object[]} Array of farm creature data objects. */
  getFarm() {
    return this.farm;
  }

  /** Compute sell price for a farm creature entry. */
  sellPrice(entry) {
    const base = entry.baseHp + entry.baseAtk * 3 + entry.baseDef * 2 + entry.baseSpd * 2;
    return Math.floor(base * (1 + (entry.generation ?? 0) * 0.5));
  }

  /** Remove a farm creature by uid and credit the player. Returns gold earned (0 if not found). */
  sellCreature(uid) {
    const idx = this.farm.findIndex(e => e.uid === uid);
    if (idx === -1) return 0;
    const price = this.sellPrice(this.farm[idx]);
    this.farm.splice(idx, 1);
    this.currency += price;
    this.saveGame();
    return price;
  }

  /** Purchase an item. Jars stack up to 5; all others are one-per-id. */
  buyItem(item) {
    if (this.currency < item.price) return false;
    if (item.id === 'jar') {
      if (this.itemInventory.filter(i => i.id === 'jar').length >= 5) return false;
    } else {
      if (this.itemInventory.some(i => i.id === item.id)) return false;
    }
    this.currency -= item.price;
    this.itemInventory.push({ ...item });
    this.saveGame();
    return true;
  }

  /** Remove a hand creature by uid and credit the player. Returns gold earned (0 if not found). */
  sellFromHand(uid) {
    const hi = this.hand.findIndex(e => e.uid === uid);
    if (hi === -1) return 0;
    const price = this.sellPrice(this.hand[hi]);
    this.hand.splice(hi, 1);
    const di = this.selectedDeck.findIndex(e => e.uid === uid);
    if (di !== -1) this.selectedDeck.splice(di, 1);
    this.currency += price;
    this.saveGame();
    return price;
  }

  /**
   * Breed two hand creatures (by index in selectedDeck) during an active run.
   * Parents are consumed from selectedDeck + hand; offspring added to both.
   * @returns {object} The offspring's plain data entry, or null on failure.
   */
  breedFromHand(idx1, idx2) {
    const e1 = this.selectedDeck[idx1];
    const e2 = this.selectedDeck[idx2];
    if (!e1 || !e2) return null;

    const toCreature = e => new Creature({
      id: e.id, name: e.name, archetype: e.archetype, ability: e.ability,
      baseHp: e.baseHp, baseAtk: e.baseAtk, baseDef: e.baseDef, baseSpd: e.baseSpd,
    }, 1);

    const generation     = Math.max(e1.generation ?? 0, e2.generation ?? 0) + 1;
    const offspring      = Creature.breed(toCreature(e1), toCreature(e2), generation);
    const offspringStats = offspring.getStats();

    const entry = {
      uid:        this._makeUid(),
      id:         offspring.id,
      name:       offspring.name,
      archetype:  offspring.archetype,
      ability:    offspring.ability,
      special:    offspring.special,
      baseHp:     offspringStats.hp,
      baseAtk:    offspringStats.atk,
      baseDef:    offspringStats.def,
      baseSpd:    offspringStats.spd,
      generation,
    };

    // Remove parents from selectedDeck (higher index first)
    const uid1 = e1.uid;
    const uid2 = e2.uid;
    this.selectedDeck.splice(Math.max(idx1, idx2), 1);
    this.selectedDeck.splice(Math.min(idx1, idx2), 1);

    // Remove parents from hand by uid
    this.hand = this.hand.filter(e => e.uid !== uid1 && e.uid !== uid2);

    // Add offspring to both
    this.selectedDeck.push(entry);
    this.hand.push(entry);

    this.saveGame();
    console.log('[BreedFromHand]', entry);
    return entry;
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

    const generation     = Math.max(e1.generation ?? 0, e2.generation ?? 0) + 1;
    const offspring      = Creature.breed(toCreature(e1), toCreature(e2), generation);
    const offspringStats = offspring.getStats();

    const entry = {
      uid:       this._makeUid(),
      id:        offspring.id,
      name:      offspring.name,
      archetype: offspring.archetype,
      ability:   offspring.ability,
      special:   offspring.special,
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
      hand:               this.hand,
      selectedDeck:       this.selectedDeck,
      selectedItems:      this.selectedItems,
      currentDeck:        this.currentDeck,
      unlockedArchetypes: this.unlockedArchetypes,
      currency:           this.currency,
      itemInventory:      this.itemInventory,
      completedRuns:      this.completedRuns,
      runFightWins:       this.runFightWins,
      lootTaken:          this.lootTaken,
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
        if (typeof entry === 'string') {
          const c = creatureData.find(cr => cr.id === entry);
          if (!c) return null;
          entry = {
            id: c.id, name: c.name, archetype: c.archetype, ability: c.ability,
            baseHp: c.baseHp, baseAtk: c.baseAtk, baseDef: c.baseDef, baseSpd: c.baseSpd,
            generation: 0,
          };
        }
        // Backfill uid and special for entries from older saves
        if (!entry.uid) entry.uid = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
        if (!entry.special) entry.special = creatureData.find(cr => cr.id === entry.id)?.special ?? null;
        return entry;
      }).filter(Boolean);
      this.hand               = (data.hand ?? []).map(entry => {
        if (!entry.uid) entry.uid = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
        if (!entry.special) entry.special = creatureData.find(cr => cr.id === entry.id)?.special ?? null;
        return entry;
      });
      this.selectedDeck       = data.selectedDeck       ?? [];
      this.selectedItems      = data.selectedItems      ?? [];
      this.currentDeck        = data.currentDeck        ?? [];
      this.unlockedArchetypes = data.unlockedArchetypes ?? ['Flying'];
      this.currency           = data.currency           ?? 0;
      this.itemInventory      = data.itemInventory      ?? [];
      this.completedRuns      = data.completedRuns      ?? 0;
      this.runFightWins       = data.runFightWins       ?? 0;
      this.lootTaken          = data.lootTaken          ?? false;
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