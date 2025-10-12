<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="theme-color" content="#0a2a43"/>
  <title>Achievements · Whylee</title>
  <link rel="manifest" href="/site.webmanifest?v=7000"/>
  <link rel="icon" href="/media/icons/favicon.svg" type="image/svg+xml"/>
  <link rel="stylesheet" href="/css/style.css?v=7000"/>
</head>
<body class="theme-dark">
  <header class="app-header">
    <a class="brand" href="/"><img src="/media/icons/app-icon.svg" alt="" class="brand-icon"/>Whylee</a>
    <nav class="top-nav">
      <a href="/profile.html" class="top-link">Profile</a>
      <a href="/pro.html" class="top-link">Pro</a>
    </nav>
  </header>

  <main class="app-shell">
    <section class="card">
      <h1>Achievements</h1>
      <div class="grid-3 gap" id="badgeGrid">
        <div class="badge-tile">
          <div class="badge-ico">🔥</div>
          <div class="badge-title">7-day Streak</div>
          <div class="badge-sub muted">Keep it going!</div>
        </div>
        <div class="badge-tile">
          <div class="badge-ico">✨</div>
          <div class="badge-title">Perfect Level</div>
          <div class="badge-sub muted">Zero mistakes</div>
        </div>
        <div class="badge-tile disabled">
          <div class="badge-ico">🏆</div>
          <div class="badge-title">Golden Run</div>
          <div class="badge-sub muted">Pro event</div>
        </div>
      </div>
      <p class="muted">Badges animate subtly when unlocked (reduced-motion aware).</p>
    </section>
  </main>

  <footer class="app-footer">
    <nav class="tabs">
      <a href="/#/home">Home</a>
      <a href="/achievements.html" class="active">Badges</a>
      <a href="/profile.html">Profile</a>
    </nav>
  </footer>

  <script src="/js/app.js?v=7000" defer></script>
</body>
</html>
