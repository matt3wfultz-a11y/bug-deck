// Archetype advantage: key beats value → 1.5× damage multiplier
export const ADVANTAGE = { Flying: 'Water', Water: 'Ground', Ground: 'Flying' };

export default class BattleSystem {
  constructor(playerCreatures, enemyCreatures, playerItems = []) {
    this.playerHand  = [...playerCreatures];
    this.enemyHand   = [...enemyCreatures];
    this.playerItems = [...playerItems];
    this.battleLog   = [];
    this.turn        = 'player';
    this._defeatedEnemies = [];
  }

  _log(msg) {
    this.battleLog.push(msg);
    console.log(`[BattleSystem] ${msg}`);
  }

  _activePlayer() { return this.playerHand[0]; }
  _activeEnemy()  { return this.enemyHand[0];  }

  _cullDead(hand, defeatedStore = null) {
    while (hand.length > 0 && !hand[0].isAlive()) {
      const dead = hand.shift();
      this._log(`${dead.name} has fainted!`);
      if (defeatedStore) defeatedStore.push(dead);
    }
  }

  playerAction(action, targetIdx = 0) {
    if (this.turn !== 'player') return;
    if (this.isOver()) return;

    const attacker = this._activePlayer();
    const defender = this.enemyHand[targetIdx];
    if (!attacker || !defender) return;

    const aStats = attacker.getStats();
    const dStats = defender.getStats();

    const adv    = ADVANTAGE[attacker.archetype] === defender.archetype ? 1.5 : 1;
    const advTag = adv > 1 ? ' [ADV]' : '';

    if (action === 'ATK') {
      const dmg = Math.max(1, Math.ceil((aStats.atk - dStats.def) * adv));
      defender.takeDamage(dmg);
      this._log(`${attacker.name} attacks ${defender.name} for ${dmg} damage${advTag}. (${defender.currentHP} HP left)`);
    } else if (action === 'DEF') {
      const dmg = Math.max(1, Math.ceil((aStats.atk - (dStats.def + 2)) * adv));
      defender.takeDamage(dmg);
      this._log(`${attacker.name} uses DEF strike on ${defender.name} for ${dmg} damage${advTag}. (${defender.currentHP} HP left)`);
    } else if (action === 'ITEM') {
      if (this.playerItems.length === 0) return;
      const item = this.playerItems.shift();
      if (item.type === 'heal') {
        const maxHp   = attacker.getStats().hp;
        const healAmt = item.percent
          ? Math.max(1, Math.floor(maxHp * item.value / 100))
          : item.value;
        const healed  = Math.min(healAmt, maxHp - attacker.currentHP);
        attacker.currentHP = Math.min(maxHp, attacker.currentHP + healAmt);
        this._log(`${attacker.name} used ${item.name}! Restored ${healed} HP. (${attacker.currentHP}/${maxHp})`);
      } else if (item.type === 'atkBuff') {
        attacker._baseAtk += item.value;
        this._log(`${attacker.name} used ${item.name}! ATK +${item.value}.`);
      } else if (item.type === 'defBuff') {
        attacker._baseDef += item.value;
        this._log(`${attacker.name} used ${item.name}! DEF +${item.value}.`);
      }
    }
    // NO _cullDead here — scene animates death first, nextTurn() cleans up
  }

  enemyTurn() {
    if (this.isOver()) return;

    const attacker = this._activeEnemy();
    const defender = this._activePlayer();
    if (!attacker || !defender) return;

    const aStats  = attacker.getStats();
    const dStats  = defender.getStats();
    const usesDef = Math.random() < 0.5;
    const adv     = ADVANTAGE[attacker.archetype] === defender.archetype ? 1.5 : 1;
    const advTag  = adv > 1 ? ' [ADV]' : '';

    const raw = usesDef ? aStats.atk - (dStats.def + 2) : aStats.atk - dStats.def;
    const dmg = Math.max(1, Math.ceil(raw * adv));

    defender.takeDamage(dmg);
    this._log(`${attacker.name} ${usesDef ? '(DEF strike)' : 'attacks'} ${defender.name} for ${dmg} damage${advTag}. (${defender.currentHP} HP left)`);
    // NO _cullDead here — scene animates death first, nextTurn() cleans up
  }

  nextTurn() {
    this._cullDead(this.playerHand);
    this._cullDead(this.enemyHand, this._defeatedEnemies);
    this.turn = 'player';
    this._log(`--- Player turn ---`);
  }

  isOver() {
    // Check actual alive status, not just array length (culling happens in nextTurn)
    const playerAlive = this.playerHand.some(c => c.isAlive());
    const enemyAlive  = this.enemyHand.some(c => c.isAlive());
    return !playerAlive || !enemyAlive;
  }

  playerWon() {
    return !this.enemyHand.some(c => c.isAlive());
  }

  /**
   * Move a specific creature to position 1 in playerHand so it becomes
   * active after nextTurn() culls the dead creature at position 0.
   */
  deployCreature(creature) {
    const idx = this.playerHand.indexOf(creature);
    if (idx <= 0) return;                      // already front or not found
    this.playerHand.splice(idx, 1);
    this.playerHand.splice(1, 0, creature);    // slot 1 → becomes 0 after cull
  }

  /**
   * Immediately swap a living creature to the front of playerHand.
   * Used for mid-battle voluntary swaps (costs a turn).
   */
  swapCreature(creature) {
    const idx = this.playerHand.indexOf(creature);
    if (idx <= 0) return;                      // already active or not found
    this.playerHand.splice(idx, 1);
    this.playerHand.unshift(creature);
    this._log(`Swapped in ${creature.name}!`);
  }

  getCapturableCreature() {
    if (this._defeatedEnemies.length === 0) return null;
    const idx = Math.floor(Math.random() * this._defeatedEnemies.length);
    return this._defeatedEnemies[idx];
  }
}