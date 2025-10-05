/* =======================================================
   Thynkr — Premium App Logic (v7.0 Silent Edition)
   ======================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const shuffleBtn = document.getElementById("shuffleBtn");
  const shareBtn = document.getElementById("shareBtn");
  const playAgainBtn = document.getElementById("playAgainBtn");

  const startSplash = document.getElementById("startSplash");
  const successSplash = document.getElementById("successSplash");
  const startVideo = document.getElementById("startVideo");
  const successVideo = document.getElementById("successVideo");

  const questionBox = document.getElementById("questionBox");
  const choicesBox = document.getElementById("choices");
  const gameOverBox = document.getElementById("gameOverBox");
  const gameOverText = document.getElementById("gameOverText");

  let currentQuestion = 0;
  let score = 0;
  let isPlaying = false;

  // =======================================================
  // START SEQUENCE — Play Intro Video then Countdown
  // =======================================================
  startBtn.addEventListener("click", async () => {
    if (isPlaying) return;
    isPlaying = true;

    startSplash.classList.add("fade-out");
    await fadeOut(startSplash, 600);

    startVideo.style.display = "block";
    startVideo.play();

    startVideo.onended = () => {
      startVideo.style.display = "none";
      startCountdown(3); // 3-second countdown
    };
  });

  // =======================================================
  // COUNTDOWN ANIMATION
  // =======================================================
  function startCountdown(seconds) {
    const countdown = document.createElement("div");
    countdown.id = "countdown";
    countdown.style.position = "fixed";
    countdown.style.top = "0";
    countdown.style.left = "0";
    countdown.style.width = "100%";
    countdown.style.height = "100%";
    countdown.style.display = "flex";
    countdown.style.alignItems = "center";
    countdown.style.justifyContent = "center";
    countdown.style.zIndex = "2000";
    countdown.style.background = "rgba(8, 26, 45, 0.8)";
    countdown.style.backdropFilter = "blur(10px)";

    const ring = document.createElement("div");
    ring.style.width = "180px";
    ring.style.height = "180px";
    ring.style.border = "3px solid rgba(23, 241, 209, 0.3)";
    ring.style.borderRadius = "50%";
    ring.style.position = "absolute";
    ring.style.boxShadow = "0 0 25px rgba(23, 241, 209, 0.2)";
    countdown.appendChild(ring);

    const text = document.createElement("div");
    text.style.position = "relative";
    text.style.fontSize = "4rem";
    text.style.fontWeight = "700";
    text.style.color = "#17f1d1";
    text.style.textShadow = "0 0 15px rgba(23, 241, 209, 0.5)";
    text.style.animation = "pulseCount 0.8s ease-in-out infinite alternate";
    countdown.appendChild(text);

    document.body.appendChild(countdown);

    let counter = seconds;
    const interval = setInterval(() => {
      text.textContent = counter > 0 ? counter : "Go!";
      counter--;

      if (counter < -1) {
        clearInterval(interval);
        countdown.remove();
        startGame();
      }
    }, 1000);
  }

  // =======================================================
  // START GAMEPLAY
  // =======================================================
  function startGame() {
    questionBox.textContent = "Question loading...";
    score = 0;
    currentQuestion = 0;
    loadNextQuestion();
  }

  // =======================================================
  // LOAD QUESTIONS (stub demo)
  // =======================================================
  const sampleQuestions = [
    { q: "What is 5 + 7?", options: ["10", "12", "11", "14"], answer: "12" },
    { q: "Capital of France?", options: ["Paris", "Rome", "London", "Berlin"], answer: "Paris" },
    { q: "Which planet is closest to the sun?", options: ["Venus", "Mercury", "Earth", "Mars"], answer: "Mercury" }
  ];

  function loadNextQuestion() {
    if (currentQuestion >= sampleQuestions.length) {
      showSuccess();
      return;
    }

    const q = sampleQuestions[currentQuestion];
    questionBox.textContent = q.q;
    choicesBox.innerHTML = "";

    q.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "btn ghost";
      btn.textContent = opt;
      btn.onclick = () => checkAnswer(opt, q.answer);
      choicesBox.appendChild(btn);
    });
  }

  function checkAnswer(selected, correct) {
    if (selected === correct) {
      score++;
    }
    currentQuestion++;
    loadNextQuestion();
  }

  // =======================================================
  // SUCCESS SPLASH SEQUENCE
  // =======================================================
  function showSuccess() {
    successSplash.style.display = "flex";
    successVideo.style.display = "block";
    successVideo.play();

    successVideo.onended = () => {
      successSplash.style.display = "none";
      resetGame();
    };
  }

  function resetGame() {
    isPlaying = false;
    questionBox.textContent = "Press Start to Play";
    choicesBox.innerHTML = "";
  }

  // =======================================================
  // UTIL — Fade Out Helper
  // =======================================================
  function fadeOut(el, duration) {
    return new Promise((resolve) => {
      el.style.transition = `opacity ${duration}ms ease`;
      el.style.opacity = 0;
      setTimeout(() => {
        el.style.display = "none";
        resolve();
      }, duration);
    });
  }

  // =======================================================
  // ANIMATION (inline CSS keyframe injection)
  // =======================================================
  const style = document.createElement("style");
  style.textContent = `
    @keyframes pulseCount {
      0% { transform: scale(1); opacity: 1; }
      100% { transform: scale(1.1); opacity: 0.9; }
    }
  `;
  document.head.appendChild(style);
});
