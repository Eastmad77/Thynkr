// scripts/reflections.js — v7000
import { Entitlements } from './entitlements.js';

const LS_KEY = 'wl_reflections';

function getAllLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function saveAllLocal(arr) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch {}
}

export const Reflections = (() => {
  function showCard({ question = "What surprised you today?" } = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay-poster';
    overlay.innerHTML = `
      <div class="reflection-card" style="background:#0c1a26;padding:20px;border-radius:16px;max-width:520px;width:92vw;color:#eaf2ff;box-shadow:0 12px 48px rgba(0,0,0,.5)">
        <h3 style="margin:0 0 8px">Daily Reflection</h3>
        <p style="margin:0 0 12px" class="muted">${question}</p>
        <textarea id="wl-ref-input" rows="4" style="width:100%;background:#0a131c;border:1px solid rgba(255,255,255,.08);color:#fff;border-radius:8px;padding:10px"></textarea>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
          <button id="wl-ref-skip" class="secondary">Skip</button>
          <button id="wl-ref-save" class="primary">Save</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#wl-ref-skip').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#wl-ref-save').addEventListener('click', () => {
      const text = (overlay.querySelector('#wl-ref-input').value || '').trim();
      if (text) {
        const entry = { date: new Date().toISOString(), text };
        const all = getAllLocal(); all.unshift(entry); saveAllLocal(all);
        // Future: if (Entitlements.can.reflectionsCloud()) sync to Firestore here
      }
      overlay.remove();
      dispatchEvent(new CustomEvent('wl:reflection-saved'));
    });
  }

  function listLocal() { return getAllLocal(); }

  return { showCard, listLocal };
})();

window.WhyleeReflections = Reflections;
