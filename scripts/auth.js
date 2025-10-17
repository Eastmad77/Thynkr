/**
 * Whylee Auth Module v8 (Bridge-Based)
 * Handles Firebase Auth for login, signup, reset, and logout.
 * Imports from /scripts/firebase-bridge.js
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from "firebase/auth";

import { auth } from "./firebase-bridge.js";

// -------------------------
// HELPERS
// -------------------------
function showMessage(msg, color = "var(--whylee-accent)") {
  const messageBox = document.getElementById("message") || document.getElementById("resetMessage");
  if (messageBox) {
    messageBox.textContent = msg;
    messageBox.classList.remove("hidden");
    messageBox.style.color = color;
  } else {
    console.log("[Auth] " + msg);
  }
}

// -------------------------
// SIGN IN
// -------------------------
export async function signInUser(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showMessage("✅ Welcome back, " + email);
    window.location.href = "/menu.html";
  } catch (error) {
    console.error("[Auth] Login failed:", error.message);
    showMessage("⚠️ " + error.message, "var(--whylee-warn)");
  }
}

// -------------------------
// SIGN UP
// -------------------------
export async function signUpUser(email, password) {
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    showMessage("🎉 Account created successfully!");
    window.location.href = "/menu.html";
  } catch (error) {
    console.error("[Auth] Signup failed:", error.message);
    showMessage("⚠️ " + error.message, "var(--whylee-warn)");
  }
}

// -------------------------
// RESET PASSWORD
// -------------------------
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    showMessage(`📧 Reset link sent to ${email}. Check your inbox.`);
  } catch (error) {
    console.error("[Auth] Reset failed:", error.message);
    showMessage("⚠️ " + error.message, "var(--whylee-warn)");
  }
}

// -------------------------
// SIGN OUT
// -------------------------
export async function logoutUser() {
  try {
    await signOut(auth);
    showMessage("👋 Signed out successfully.");
    window.location.href = "/auth.html";
  } catch (error) {
    console.error("[Auth] Logout failed:", error.message);
    showMessage("⚠️ " + error.message, "var(--whylee-warn)");
  }
}

// -------------------------
// AUTH STATE WATCHER
// -------------------------
export function initAuthState() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("[Auth] Logged in:", user.email);
      localStorage.setItem("whyleeUser", user.email);
    } else {
      console.log("[Auth] No user session found.");
      localStorage.removeItem("whyleeUser");
    }
  });
}

// -------------------------
// PAGE EVENT BINDINGS
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#authForm");
  const resetForm = document.querySelector("#resetForm");
  const toggle = document.querySelector("#toggleSignup");
  const submitBtn = document.querySelector("#submitBtn");
  let mode = "login";

  if (toggle) {
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      mode = mode === "login" ? "signup" : "login";
      document.getElementById("authTitle").textContent =
        mode === "login" ? "Sign In" : "Create Account";
      document.getElementById("authSubtitle").textContent =
        mode === "login" ? "Continue your Whylee journey" : "Start your Whylee journey";
      submitBtn.textContent = mode === "login" ? "Sign In" : "Sign Up";
      toggle.textContent =
        mode === "login" ? "Create one" : "Already have an account? Sign in";
    });
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      if (mode === "login") signInUser(email, password);
      else signUpUser(email, password);
    });
  }

  if (resetForm) {
    resetForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value;
      resetPassword(email);
    });
  }

  initAuthState();
});
