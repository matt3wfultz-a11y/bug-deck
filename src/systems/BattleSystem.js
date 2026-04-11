/**
 * BattleSystem — pure-logic battle engine, no Phaser dependency.
 *
 * Usage:
 *   const sys = new BattleSystem(playerCreatures, enemyCreatures, playerItems);
 *   sys.playerAction('ATK', 0);   // attack enemy at index 0
 *   sys.enemyTurn();
 *   sys.nextTurn();
 *   if (sys.isOver()) console.log(sys.playerWon() ? 'Win' : 'Loss');
 */
export default class BattleSystem {
  /**
   * @param {Creature[]} playerCreatures  - Ordered array; index 0 is active fighter
   * @param {Creature[]} enemyCreatures   - Ordered array; index 0 is active fighter
   * @param {object[]}   playerItems      - Item data objects from items.js (unused in core logic, stored for scene use)
   */
  constructor(playerCreatures, enemyCreatures, playerItems = []) {
    this.playerHand  = [...playerCreatures];
    this.enemyHand   = [...enemyCreatures];
    this.playerItems = [...playerItems];
    this.battleLog   = [];
    this.turn        = 'player';          // 'player' | 'enemy'
    this._defeatedEnemies = [];           // creatures removed from enemyHand
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  _log(msg) {
    this.battleLog.push(msg);
    console.log(`[BattleSystem] ${msg}`);
  }

  _activePlayer() { return this.playerHand[0]; }
  _activeEnemy()  { return this.enemyHand[0];  }

  /** Remove dead creatures from the front of a hand array. */
  _cullDead(hand, defeatedStore = null) {
    while (hand.length > 0 && !hand[0].isAlive()) {
      const dead = hand.shift();
      this._log(`${dead.name} has fainted!`);
      if (defeatedStore) defeatedStore.push(dead);
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Execute the player's chosen action.
   *
   * @param {'ATK'|'DEF'|'ITEM'} action
   * @param {number} targetIdx  - Index into enemyHand to target (usually 0)
   */
  playerAction(action, targetIdx = 0) {
    if (this.turn !== 'player') return;
    if (this.isOver()) return;

    const attacker = this._activePlayer();
    const defender = this.enemyHand[targetIdx];
    if (!attacker || !defender) return;

    const aStats = attacker.getStats();
    const dStats = defender.getStats();

    if (action === 'ATK') {
      const dmg = Math.max(1, aStats.atk - dStats.def);
      defender.takeDamage(dmg);
      this._log(`${attacker.name} attacks ${defender.name} for ${dmg} damage. (${defender.currentHP} HP left)`);
    } else if (action === 'DEF') {
      const dmg = Math.max(1, aStats.atk - (dStats.def + 2));
      defender.takeDamage(dmg);
      this._log(`${attacker.name} uses DEF strike on ${defender.name} for ${dmg} damage. (${defender.currentHP} HP left)`);
    } else if (action === 'ITEM') {
      this._log(`${attacker.name} uses an item. (not yet implemented)`);
    }

    this._cullDead(this.enemyHand, this._defeatedEnemies);
  }

  /**
   * Execute the enemy's turn automatically.
   * 50% chance ATK, 50% chance DEF action against the active player creature.
   */
  enemyTurn() {
    if (this.isOver()) return;

    const attacker = this._activeEnemy();
    const defender = this._activePlayer();
    if (!attacker || !defender) return;

    const aStats = attacker.getStats();
    const dStats = defender.getStats();
    const usesDef = Math.random() < 0.5;

    const dmg = usesDef
      ? Math.max(1, aStats.atk - (dStats.def + 2))
      : Math.max(1, aStats.atk - dStats.def);

    defender.takeDamage(dmg);
    this._log(`${attacker.name} ${usesDef ? '(DEF strike)' : 'attacks'} ${defender.name} for ${dmg} damage. (${defender.currentHP} HP left)`);

    this._cullDead(this.playerHand);
  }

  /**
   * Advance to the next turn (switch sides).
   * Cleans up any dead creatures before handing off.
   */
  nextTurn() {
    this._cullDead(this.playerHand);
    this._cullDead(this.enemyHand, this._defeatedEnemies);
    this.turn = this.turn === 'player' ? 'enemy' : 'player';
    this._log(`--- ${this.turn === 'player' ? 'Player' : 'Enemy'} turn ---`);
  }

  /** @returns {boolean} True when one side has no creatures left. */
  isOver() {
    return this.playerHand.length === 0 || this.enemyHand.length === 0;
  }

  /** @returns {boolean} True if the player won (all enemies defeated). */
  playerWon() {
    return this.enemyHand.length === 0;
  }

  /**
   * Returns a random creature from the pool of defeated enemy creatures,
   * or null if no enemies have been defeated yet.
   * @returns {Creature|null}
   */
  getCapturableCreature() {
    if (this._defeatedEnemies.length === 0) return null;
    const idx = Math.floor(Math.random() * this._defeatedEnemies.length);
    return this._defeatedEnemies[idx];
  }
}
