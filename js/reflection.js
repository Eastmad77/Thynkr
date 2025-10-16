/* Whylee — Daily Reflection
   Path: /js/reflection.js
*/
import { isPro, toast } from "./app.js";

const LS_REF = "whylee.reflections";
const LS_STREAK = "whylee.streak";

const PROMPTS = [
  "What did I learn today?",
  "What am I grateful for right now?",
  "What challenged me? How did I respond?",
  "Which tiny win am I proud of?",
  "What’s one thing I’ll do better tomorrow?"
];

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function getStore() {
  try { return JSON.parse(localStorage.getItem(LS_REF)) || {}; } catch { return {}; }
}
function setStore(v) {
  localStorage.setItem(LS_REF, JSON.stringify(v || {}));
}

function getStreak() {
  try { return JSON.parse(localStorage.getItem(LS_STREAK)) || { count: 0, lastISO: null }; }
  catch { return { count: 0, lastISO: null }; }
}
function setStreak(s) {
  localStorage.setItem(LS_STREAK, JSON.stringify(s));
}

function nextPrompt() {
  const idx = Math.floor(Math.random() * PROMPTS.length);
  return PROMPTS[idx];
}

function updateStreak() {
  const s = getStreak();
  const today = todayISO();
  if (s.lastISO === today) return s; // already counted

  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yISO = yesterday.toISOString().slice(0, 10);

  const contiguous = s.lastISO === yISO;
  const count = contiguous ? (s.count || 0) + 1 : 1;
  const next = { count, lastISO: today };
  setStreak(next);
  return next;
}

export function initReflectionPage() {
  const $prompt = document.querySelector('[data-ref="prompt"]');
  const $text = document.querySelector('[data-ref="text"]');
  const $save = document.querySelector('[data-ref="save"]');
  const $count = document.querySelector('[data-ref="streak"]');
  const $proNote = document.querySelector('[data-ref="pro-note"]');
  const $export = document.querySelector('[data-ref="export"]');

  // Init prompt
  $prompt.textContent = nextPrompt();

  // Load today if exists
  const store = getStore();
  const key = todayISO();
  if (store[key]?.text) $text.value = store[key].text;

  // Streak render
  const s = getStreak();
  $count.textContent = s.count || 0;

  // Pro extras (export)
  if (!isPro()) {
    $proNote.hidden = false;
    $export.disabled = true;
  }

  $save.addEventListener("click", () => {
    const t = ($text.value || "").trim();
    const all = getStore();
    all[key] = { text: t, ts: Date.now() };
    setStore(all);
    const st = updateStreak();
    $count.textContent = st.count;
    toast("Reflection saved");
  });

  $export.addEventListener("click", () => {
    if (!isPro()) { toast("Pro feature"); return; }
    const all = getStore();
    const lines = Object.keys(all)
      .sort()
      .map(k => `# ${k}\n${all[k].text}\n`)
      .join("\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `whylee-reflections-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}
