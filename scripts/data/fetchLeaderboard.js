/**
 * Whylee — Leaderboard Data Fetcher
 * Uses static /data/leaderboard.json for now.
 * Later can point to Firestore or Netlify function.
 */

export async function fetchLeaderboard() {
  try {
    const res = await fetch('/data/leaderboard.json?v=7006', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load leaderboard data');
    return await res.json();
  } catch (err) {
    console.warn('⚠️ Using fallback leaderboard data', err);
    return [];
  }
}
