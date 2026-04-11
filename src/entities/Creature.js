import { creatures as creatureData } from '../data/creatures.js';

export default class Creature {
  /**
   * @param {object} creatureData  - Raw data object from creatures.js
   * @param {number} level         - Creature level (1+)
   * @param {string[]|null} parentIds - IDs of parent creatures if bred
   */
  constructor(data, level = 1, parentIds = null) {
    this.id        = data.id;
    this.name      = data.name;
    this.archetype = data.archetype;
    this.ability   = data.ability;
    this.level     = level;
    this.parentIds = parentIds;

    // Base stats stored for scaling
    this._baseHp  = data.baseHp;
    this._baseAtk = data.baseAtk;
    this._baseDef = data.baseDef;
    this._baseSpd = data.baseSpd;

    this.currentHP = this.getStats().hp;
  }

  /**
   * Returns scaled stats at current level.
   * Each level above 1 adds +5% to each stat (floored).
   */
  getStats() {
    const scale = 1 + 0.05 * (this.level - 1);
    return {
      hp:  Math.floor(this._baseHp  * scale),
      atk: Math.floor(this._baseAtk * scale),
      def: Math.floor(this._baseDef * scale),
      spd: Math.floor(this._baseSpd * scale),
    };
  }

  takeDamage(dmg) {
    this.currentHP -= Math.max(1, dmg);
  }

  isAlive() {
    return this.currentHP > 0;
  }

  /** Restore HP to full (scaled) max. */
  reset() {
    this.currentHP = this.getStats().hp;
  }

  /**
   * Breed two Creature instances to produce an offspring.
   * - Stats: average of parents ±10% random variance (floored, min 1)
   * - Archetype: randomly chosen from one of the two parents
   * - A random creature template from the chosen archetype supplies id/name/ability
   * - parentIds set to [p1.id, p2.id]
   *
   * @param {Creature} p1
   * @param {Creature} p2
   * @returns {Creature}
   */
  static breed(p1, p2) {
    const p1s = p1.getStats();
    const p2s = p2.getStats();

    const avg = (a, b) => (a + b) / 2;
    const vary = v => Math.max(1, Math.floor(v * (0.9 + Math.random() * 0.2)));

    // Pick archetype from one parent at random
    const archetype = Math.random() < 0.5 ? p1.archetype : p2.archetype;

    // Pick a random template from that archetype
    const pool = creatureData.filter(c => c.archetype === archetype);
    const template = pool[Math.floor(Math.random() * pool.length)];

    // Build a synthetic data object with averaged stats
    const offspringData = {
      id:        template.id,
      name:      template.name,
      archetype: template.archetype,
      ability:   template.ability,
      baseHp:  vary(avg(p1s.hp,  p2s.hp)),
      baseAtk: vary(avg(p1s.atk, p2s.atk)),
      baseDef: vary(avg(p1s.def, p2s.def)),
      baseSpd: vary(avg(p1s.spd, p2s.spd)),
    };

    return new Creature(offspringData, 1, [p1.id, p2.id]);
  }
}
