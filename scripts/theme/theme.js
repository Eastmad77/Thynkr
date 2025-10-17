/**
 * Whylee Theme Manager (v8)
 * Path: /scripts/theme/theme.js
 *
 * Themes: "system" | "light" | "dark" | "midnight"
 * - Adds data-theme to <html> for CSS variables
 * - Syncs with Cloud Sync when signed in
 */

import { auth } from "../auth/firebase-bridge.js";
import { getUserDoc, setThemePref, onUserSnapshot } from "../auth/cloudsync.js";

const THEME_STORAGE_KEY = "whylee:theme";

export function currentSystemTheme() {
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme === "system" ? currentSystemTheme() : theme);
}

export async function initTheme() {
  // 1) local preference (fast)
  const local = localStorage.getItem(THEME_STORAGE_KEY);
  if (local) applyTheme(local);

  // 2) user preference (authoritative) if logged
  const user = auth.currentUser;
  if (user) {
    const data = await getUserDoc();
    if (data?.theme) {
      localStorage.setItem(THEME_STORAGE_KEY, data.theme);
      applyTheme(data.theme);
    }
    // live follow
    onUserSnapshot((d) => {
      if (d?.theme) {
        localStorage.setItem(THEME_STORAGE_KEY, d.theme);
        applyTheme(d.theme);
      }
    });
  }

  // react to system change if user set "system"
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const pref = localStorage.getItem(THEME_STORAGE_KEY) || "system";
    if (pref === "system") applyTheme("system");
  });

  // wire any dropdown/radio with [data-theme-choose]
  document.querySelectorAll("[data-theme-choose]").forEach(el => {
    el.addEventListener("change", async (e) => {
      const value = e.target.value; // "system" | "light" | "dark" | "midnight"
      localStorage.setItem(THEME_STORAGE_KEY, value);
      applyTheme(value);
      if (auth.currentUser) { try { await setThemePref(value); } catch (_) {} }
    });
  });
}
