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

  queueAction(type, payload = null, cost = 1) {
    if (this.currentStamina < cost) return false;
    this.queue.push({ type, payload, cost });
    this.currentStamina -= cost;
    return true;
  }

  canAfford(cost = 1) { return this.currentStamina >= cost; }
  get()               { return [...this.queue]; }
  isEmpty()           { return this.queue.length === 0; }
  clear()             { this.queue = []; }
  regen()             { this.currentStamina = this.maxStamina; }

  getStaminaDots() {
    return Array.from({ length: this.maxStamina }, (_, i) => i < this.currentStamina);
  }

  actionsBeforeSwap() {
    const si = this.queue.findIndex(a => a.type === 'SWAP');
    return si === -1 ? [...this.queue] : this.queue.slice(0, si);
  }

  swapAction() {
    const si = this.queue.findIndex(a => a.type === 'SWAP');
    return si === -1 ? null : this.queue[si];
  }
}
