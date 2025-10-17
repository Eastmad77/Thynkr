
// /game/streak.js
// ------------------------------------------------------
// Streak Tracker for Whylee
// Tracks daily login streaks, resets on missed days.
// Integrates with XP system for reward multipliers.
// ------------------------------------------------------

export const streak = {
  count: 0,
  lastActive: null,
  storageKey: 'whylee_streak',

  load() {
    const saved = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
    this.count = saved.count || 0;
    this.lastActive = saved.lastActive || null;
  },

  update() {
    const today = new Date().toDateString();
    if (this.lastActive === today) return; // already updated

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (this.lastActive === yesterday) {
      this.count += 1;
    } else {
      this.count = 1;
    }

    this.lastActive = today;
    localStorage.setItem(this.storageKey, JSON.stringify({
      count: this.count,
      lastActive: this.lastActive
    }));

    console.log(`[Whylee] Streak updated: ${this.count} days`);
  },

  getBonusXP() {
    return Math.min(1 + this.count * 0.05, 2.0); // up to 2x
  }
};

// Initialise streak data on app load
streak.load();
