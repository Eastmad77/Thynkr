// /game/challenges.js
// ------------------------------------------------------
// Challenge Mode foundation
// Allows rotating daily/weekly challenges and XP multipliers.
// ------------------------------------------------------

export const challenges = {
  active: false,
  list: [
    { id: 1, name: 'Speed Quiz', xp: 1.5 },
    { id: 2, name: 'Perfect Streak', xp: 2.0 }
  ],

  start(id = 1) {
    const challenge = this.list.find(c => c.id === id);
    if (challenge) {
      this.active = true;
      this.current = challenge;
      console.log(`[Whylee] Challenge started: ${challenge.name}`);
    }
  },

  complete() {
    if (!this.active) return;
    console.log(`[Whylee] Challenge completed: ${this.current.name}`);
    this.active = false;
  }
};

