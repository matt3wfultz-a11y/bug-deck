export default class BattleQueue {
  constructor(creature) {
    this.creature       = creature;
    this.queue          = [];
    this.maxStamina     = this._calcMax();
    this.currentStamina = this.maxStamina;
  }

  _calcMax() {
    if (this.creature.archetype === 'Flying') return 4;
    return 3; // Ground and Water
  }

  queueAction(type, payload = null) {
    if (this.currentStamina < 1) return false;
    this.queue.push({ type, payload });
    this.currentStamina--;
    return true;
  }

  canAfford()  { return this.currentStamina >= 1; }
  get()        { return [...this.queue]; }
  isEmpty()    { return this.queue.length === 0; }
  clear()      { this.queue = []; }
  regen()      { this.currentStamina = this.maxStamina; }

  getStaminaDots() {
    return Array.from({ length: this.maxStamina }, (_, i) => i < this.currentStamina);
  }

  // Actions that fire before the swap
  actionsBeforeSwap() {
    const si = this.queue.findIndex(a => a.type === 'SWAP');
    return si === -1 ? [...this.queue] : this.queue.slice(0, si);
  }

  swapAction() {
    const si = this.queue.findIndex(a => a.type === 'SWAP');
    return si === -1 ? null : this.queue[si];
  }
}
