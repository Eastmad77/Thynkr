/* Whylee — Profile view (v7004)
   Shows current user name, avatar, tier, and streak info
*/

document.addEventListener('DOMContentLoaded', async () => {
  const nameEl = document.querySelector('.user-name');
  const tierEl = document.querySelector('.user-tier');
  const streakEl = document.querySelector('.user-streak');
  const avatarImg = document.querySelector('.avatar');

  // Example user data from Firebase/Auth or localStorage
  const user = window.currentUser || JSON.parse(localStorage.getItem('wl_user') || '{}');

  // Fallback values
  const displayName = user.displayName || 'Player';
  const tier = user.tier || 'free';
  const streak = localStorage.getItem('wl_streak') || 0;

  nameEl.textContent = displayName;
  tierEl.textContent = tier === 'pro' ? 'Pro Member' :
                       tier === 'leader' ? 'Leaderboard Tier' :
                       'Free Player';
  streakEl.textContent = `Daily Streak: ${streak}`;

  // 🔸 Avatar assignment logic
  if (tier === 'pro') {
    avatarImg.src = '/media/avatars/profile-pro-gold.svg';
  } else if (tier === 'leader') {
    avatarImg.src = '/media/avatars/profile-pro-silver.svg';
  } else {
    avatarImg.src = '/media/avatars/profile-default.svg';
  }

  // Optional: add small animation on load
  avatarImg.classList.add('pop-in');
});
