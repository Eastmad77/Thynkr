// /scripts/auth.js
// Handles sign-in and password reset for Whylee

import { auth, signInWithEmailAndPassword } from "/scripts/firebase-bridge.js";
import { sendPasswordResetEmail } from "firebase/auth";

// DOM references
const emailEl = document.getElementById("email");
const passEl  = document.getElementById("password");
const msg     = document.getElementById("msg");
const signInBtn = document.getElementById("signInBtn");
const resetBtn  = document.getElementById("resetBtn");

if (signInBtn) {
  signInBtn.addEventListener("click", async () => {
    msg.textContent = "Signing in…";
    msg.style.color = "var(--text-muted)";
    try {
      await signInWithEmailAndPassword(auth, emailEl.value.trim(), passEl.value);
      msg.textContent = "✅ Signed in! Redirecting…";
      msg.style.color = "var(--accent)";
      setTimeout(() => (window.location.href = "/game.html"), 800);
    } catch (e) {
      msg.textContent = e.message || "Sign-in failed.";
      msg.style.color = "#ff6666";
    }
  });
}

if (resetBtn) {
  resetBtn.addEventListener("click", async () => {
    const email = emailEl.value.trim();
    if (!email) {
      msg.textContent = "Enter your email first.";
      msg.style.color = "#ffcc66";
      return;
    }
    msg.textContent = "Sending reset link…";
    msg.style.color = "var(--text-muted)";
    try {
      await sendPasswordResetEmail(auth, email);
      msg.textContent = `✅ Reset link sent to ${email}. Check your inbox.`;
      msg.style.color = "var(--accent)";
    } catch (e) {
      msg.textContent = e.message || "Could not send reset link.";
      msg.style.color = "#ff6666";
    }
  });
}

// Optional: Enter key triggers sign-in
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && document.activeElement.tagName === "INPUT") {
    signInBtn?.click();
  }
});
