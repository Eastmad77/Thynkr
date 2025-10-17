// /config/remoteflags.js
// ------------------------------------------------------
// Remote feature flags for Whylee
// Used to toggle beta features or experiments dynamically.
// ------------------------------------------------------

export const remoteFlags = {
  enableReflection: true,        // Reflection Mode feature toggle
  enableLeaderboard: true,       // Leaderboard / Community tab
  enableProTrial: true,          // Pro Trial UX
  enableChallengeMode: false,    // Challenge Mode (future)
  enableStreakTracking: true,    // Daily streaks & XP saver
  enableAnimations: true,        // Allow subtle motion UI
  enableDebugMode: false         // For developer builds only
};

// Optional: if you connect Firebase Remote Config or fetch from /config/flags.json
// you can extend this with dynamic merging:
export async function loadRemoteFlags() {
  try {
    const res = await fetch('/config/flags.json');
    if (res.ok) {
      const json = await res.json();
      Object.assign(remoteFlags, json);
      console.log('[Whylee] Remote flags updated:', remoteFlags);
    }
  } catch (err) {
    console.warn('[Whylee] Remote flags fallback used', err);
  }
}

