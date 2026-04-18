import { creatures as creatureData, SPECIAL_POOLS } from '../data/creatures.js';

// Syllable pools by archetype
const SYLLABLES = {
  Flying: ['zip', 'zax', 'buzz', 'flit', 'wing', 'dart', 'swift', 'aero', 'sky', 'zephyr'],
  Ground: ['thud', 'burr', 'stone', 'drill', 'dig', 'claw', 'hard', 'rock', 'tar', 'thrum'],
  Water: ['rip', 'flow', 'tide', 'wave', 'splash', 'aqua', 'drift', 'glide', 'surge', 'eddyx'],
};

// Track generated names to avoid duplicates
const usedNames = new Set();

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
    this.special   = data.special ?? null;
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
   * Generate a random abstract name from parent archetypes.
   * Blends syllables from both parents' archetype pools.
   * 3-9 characters, tracks used names to avoid duplicates.
   */
  static generateName(archetype1, archetype2) {
    const pool1 = SYLLABLES[archetype1] || SYLLABLES.Flying;
    const pool2 = SYLLABLES[archetype2] || SYLLABLES.Flying;

    let name;
    let attempts = 0;
    do {
      const syl1 = pool1[Math.floor(Math.random() * pool1.length)];
      const syl2 = pool2[Math.floor(Math.random() * pool2.length)];
      const combine = Math.random() < 0.5 ? syl1 + syl2 : syl2 + syl1;
      name = combine.slice(0, 9); // Cap at 9 chars
      attempts++;
    } while (usedNames.has(name) && attempts < 50); // Try 50 times, then accept repeat

    usedNames.add(name);
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /**
   * Breed two Creature instances to produce an offspring.
   * - Stats: average of parents * 1.05^generation, capped at 100
   * - Archetype: randomly chosen from one of the two parents
   * - Name: random abstract name hinting at parent archetypes
   * - Ability: from random template of chosen archetype
   * - Special: randomly mutated from the archetype's special pool
   * - parentIds set to [p1.id, p2.id]
   *
   * @param {Creature} p1
   * @param {Creature} p2
   * @param {number} generation
   * @returns {Creature}
   */
  static breed(p1, p2, generation = 1) {
    const p1s   = p1.getStats();
    const p2s   = p2.getStats();
    const avg = (a, b) => (a + b) / 2;
    const cap = v => Math.min(100, Math.max(1, Math.floor(v) + generation));

    // Pick archetype from one parent at random
    const archetype = Math.random() < 0.5 ? p1.archetype : p2.archetype;

    // Pick a random template from that archetype (for id/ability)
    const pool     = creatureData.filter(c => c.archetype === archetype);
    const template = pool[Math.floor(Math.random() * pool.length)];

    // Randomly mutate special from the archetype's pool
    const spPool  = SPECIAL_POOLS[archetype] ?? [];
    const special = spPool.length > 0 ? spPool[Math.floor(Math.random() * spPool.length)] : null;

    const offspringName = Creature.generateName(p1.archetype, p2.archetype);

    const offspringData = {
      id:        template.id,
      name:      offspringName,
      archetype: template.archetype,
      ability:   template.ability,
      special,
      baseHp:  cap(avg(p1s.hp,  p2s.hp)),
      baseAtk: cap(avg(p1s.atk, p2s.atk)),
      baseDef: cap(avg(p1s.def, p2s.def)),
      baseSpd: cap(avg(p1s.spd, p2s.spd)),
    };

    return new Creature(offspringData, 1, [p1.id, p2.id]);
  }
}