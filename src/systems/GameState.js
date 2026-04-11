const SAVE_KEY = 'bugDeck_save';

class GameState {
  constructor() {
    this.reset();
  }

  // ── Public state ──────────────────────────────────────────────────────────

  reset() {
    this.selectedArchetype   = null;
    this.farm                = [];        // array of creature ids owned
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
      this.farm               = data.farm               ?? [];
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
