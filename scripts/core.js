// scripts/core.js — v7000
import { loadQuestionsForToday } from './questions.js';
import { Achievements } from './achievements.js';

window.WhyleeGame = (function () {
  const sfx = {
    click: new Audio('/media/audio/click.mp3'),
    correct: new Audio('/media/audio/correct.mp3'),
    wrong: new Audio('/media/audio/wrong.mp3'),
    levelup: new Audio('/media/audio/levelup.mp3'),
    start: new Audio('/media/audio/start-chime.mp3')
  };

  let daily = null;
  let currentLevel = 0;
  let qIndex = 0;

  function $(sel) { return document.querySelector(sel); }

  function renderQuestion(q) {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
      <section class="route route--play">
        <h2>Level ${currentLevel + 1}</h2>
        <div class="question">${q.question}</div>
        <div class="choices">
          ${q.choices.map((c, i) => `<button class="choice" data-i="${i}">${c}</button>`).join('')}
        </div>
        <div class="hud">
          <span>Q ${qIndex + 1} / ${daily.levels[currentLevel].items.length}</span>
          <span>Streak: ${Achievements.state.streak}</span>
          <span>XP: ${Achievements.state.xp}</span>
        </div>
      </section>`;
    app.querySelectorAll('.choice').forEach(btn => {
      btn.addEventListener('click', () => onAnswer(parseInt(btn.dataset.i, 10)));
    });
  }

  function onAnswer(i) {
    const q = daily.levels[currentLevel].items[qIndex];
    if (i === q.correctIndex) {
      sfx.correct.play().catch(()=>{});
      Achievements.awardXP(25);
      Achievements.addStreak(1);
      nextQuestion();
    } else {
      sfx.wrong.play().catch(()=>{});
      Achievements.resetStreak();
      nextQuestion();
    }
    Achievements.checkBadges();
  }

  function nextQuestion() {
    qIndex++;
    const levelItems = daily.levels[currentLevel].items;
    if (qIndex < levelItems.length) {
      renderQuestion(levelItems[qIndex]);
      return;
    }
    // next level
    sfx.levelup.play().catch(()=>{});
    currentLevel++;
    qIndex = 0;
    if (currentLevel < daily.levels.length && daily.levels[currentLevel].items.length) {
      renderQuestion(daily.levels[currentLevel].items[qIndex]);
    } else {
      endSession();
    }
  }

  function endSession() {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
      <section class="route route--end">
        <h2>Great session!</h2>
        <p>Streak: ${Achievements.state.streak} · XP: ${Achievements.state.xp}</p>
        <button id="play-again" class="primary">Play Again</button>
      </section>`;
    $('#play-again')?.addEventListener('click', start);
  }

  async function start() {
    sfx.start.play().catch(()=>{});
    if (!daily) daily = await loadQuestionsForToday();
    currentLevel = 0; qIndex = 0;
    if (!daily?.levels?.length || !daily.levels[0].items.length) {
      const app = document.getElementById('app');
      if (app) app.innerHTML = `<p class="muted">No questions available. Try again later.</p>`;
      return;
    }
    renderQuestion(daily.levels[0].items[0]);
  }

  // Auto-bind start button if present (index hash route)
  window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('start-btn');
    if (btn) btn.addEventListener('click', start);
  });

  return { start };
})();
