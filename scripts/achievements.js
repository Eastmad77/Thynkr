export const PRO_UNLOCKS = {
  "wolf-pro": { xp: 500 },
  "tiger-pro": { xp: 1000 },
  "nightowl-pro": { theme: "dark" },
  "dragon-pro": { streaks: 10, elite: true }
};

export function checkAvatarUnlocks(userData) {
  const unlocked = [];
  for (const [id, req] of Object.entries(PRO_UNLOCKS)) {
    if (req.xp && userData.xp >= req.xp) unlocked.push(id);
    if (req.streaks && userData.streak >= req.streaks) unlocked.push(id);
    if (req.theme && userData.theme === req.theme) unlocked.push(id);
  }
  return unlocked;
}
