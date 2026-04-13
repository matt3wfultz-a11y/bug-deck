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

    if (action === 'ATK') {
      const dmg = Math.max(1, aStats.atk - dStats.def);
      defender.takeDamage(dmg);
      this._log(`${attacker.name} attacks ${defender.name} for ${dmg} damage. (${defender.currentHP} HP left)`);
    } else if (action === 'DEF') {
      const dmg = Math.max(1, aStats.atk - (dStats.def + 2));
      defender.takeDamage(dmg);
      this._log(`${attacker.name} uses DEF strike on ${defender.name} for ${dmg} damage. (${defender.currentHP} HP left)`);
    } else if (action === 'ITEM') {
      if (this.playerItems.length === 0) return;
      const item = this.playerItems.shift();
      if (item.type === 'heal') {
        const maxHp  = attacker.getStats().hp;
        const healed = Math.min(item.value, maxHp - attacker.currentHP);
        attacker.currentHP = Math.min(maxHp, attacker.currentHP + item.value);
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

    const aStats = attacker.getStats();
    const dStats = defender.getStats();
    const usesDef = Math.random() < 0.5;

    const dmg = usesDef
      ? Math.max(1, aStats.atk - (dStats.def + 2))
      : Math.max(1, aStats.atk - dStats.def);

    defender.takeDamage(dmg);
    this._log(`${attacker.name} ${usesDef ? '(DEF strike)' : 'attacks'} ${defender.name} for ${dmg} damage. (${defender.currentHP} HP left)`);
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

  getCapturableCreature() {
    if (this._defeatedEnemies.length === 0) return null;
    const idx = Math.floor(Math.random() * this._defeatedEnemies.length);
    return this._defeatedEnemies[idx];
  }
}