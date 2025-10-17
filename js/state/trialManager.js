
// /state/trialManager.js
// ------------------------------------------------------
// TrialManager: controls Whylee Pro trial flow.
// Tracks activation, days remaining, expiry, and analytics.
// ------------------------------------------------------

export class TrialManager {
  constructor(storageKey = 'whylee_trial') {
    this.key = storageKey;
    this.data = JSON.parse(localStorage.getItem(this.key) || '{}');
  }

  startTrial(days = 3) {
    const now = Date.now();
    this.data = {
      started: now,
      expires: now + days * 86400000,
      active: true
    };
    localStorage.setItem(this.key, JSON.stringify(this.data));
    console.log(`[Whylee] Trial started for ${days} days.`);
  }

  getDaysRemaining() {
    if (!this.data?.active) return 0;
    const remaining = Math.max(0, this.data.expires - Date.now());
    return Math.ceil(remaining / 86400000);
  }

  hasExpired() {
    return this.data?.active && Date.now() > this.data.expires;
  }

  endTrial() {
    this.data.active = false;
    localStorage.setItem(this.key, JSON.stringify(this.data));
    console.log('[Whylee] Trial ended.');
  }

  status() {
    return {
      active: !!this.data.active,
      daysRemaining: this.getDaysRemaining(),
      expired: this.hasExpired()
    };
  }
}

export const trialManager = new TrialManager();
