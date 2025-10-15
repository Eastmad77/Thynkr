// scripts/signin.js — v7000
(async () => {
  const cfg = await import('/firebase-config.js').catch(()=>null);
  if (!cfg) {
    console.warn('[signin] firebase-config.js not found');
    return;
  }
  const { app, db } = cfg;

  const { getAuth, GoogleAuthProvider, signInWithPopup } =
    await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js');

  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();

  async function writeProfile(user) {
    if (!db) return;
    try {
      const { doc, setDoc, serverTimestamp } =
        await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: user.displayName || 'Player',
        avatar: user.photoURL || '',
        email: user.email || '',
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) { console.warn('[signin] write profile fail', e); }
  }

  function saveLocal(user) {
    try {
      localStorage.setItem('wl_username', user.displayName || 'Player');
      if (user.photoURL) localStorage.setItem('wl_avatar', user.photoURL);
    } catch {}
  }

  document.getElementById('google-login')?.addEventListener('click', async () => {
    try {
      const res = await signInWithPopup(auth, provider);
      const user = res.user;
      saveLocal(user);
      await writeProfile(user);
      location.href = '/profile.html';
    } catch (e) {
      alert('Sign-in failed. Please try again.');
      console.error('[signin]', e);
    }
  });
})();
