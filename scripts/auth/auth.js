// /scripts/auth.js v9007
// UI wiring + (optional) Firebase email/password flows via firebase-bridge.
// Works with CSP (no inline code).

import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "/scripts/firebase-bridge.js";

// Elements
const title = document.getElementById("authTitle");
const subtitle = document.getElementById("authSubtitle");
const submitBtn = document.getElementById("submitBtn");
const toggleSignup = document.getElementById("toggleSignup");
const forgotPassword = document.getElementById("forgotPassword");
const form = document.getElementById("authForm");
const message = document.getElementById("message");

let mode = "login";

function setMessage(text, kind = "info") {
  if (!message) return;
  message.textContent = text || "";
  message.classList.remove("hidden", "error", "success", "info");
  message.classList.add(kind);
}

function clearMessage() {
  if (!message) return;
  message.textContent = "";
  message.classList.add("hidden");
  message.classList.remove("error", "success", "info");
}

function updateMode(next) {
  mode = next;
  if (mode === "signup") {
    title.textContent = "Create Account";
    subtitle.textContent = "Start your Whylee journey";
    submitBtn.textContent = "Sign Up";
    toggleSignup.textContent = "Already have an account? Sign in";
  } else {
    title.textContent = "Sign In";
    subtitle.textContent = "Continue your Whylee journey";
    submitBtn.textContent = "Sign In";
    toggleSignup.textContent = "Create one";
  }
  clearMessage();
}

// Toggle Login/Signup
toggleSignup?.addEventListener("click", (e) => {
  e.preventDefault();
  updateMode(mode === "login" ? "signup" : "login");
});

// Forgot password
forgotPassword?.addEventListener("click", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value?.trim();
  if (!email) {
    setMessage("Enter your email first, then click Forgot password.", "error");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    setMessage("Password reset email sent. Check your inbox.", "success");
  } catch (err) {
    console.warn("[Auth] reset error:", err);
    setMessage(err?.message || "Could not send reset email.", "error");
  }
});

// Submit handler
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessage();

  const email = document.getElementById("email").value?.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    setMessage("Please fill in email and password.", "error");
    return;
  }

  submitBtn.disabled = true;

  try {
    if (mode === "signup") {
      await createUserWithEmailAndPassword(auth, email, password);
      setMessage("Account created! You’re signed in.", "success");
      // TODO: redirect if desired
      // location.href = "/menu.html";
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      setMessage("Signed in successfully.", "success");
      // TODO: redirect if desired
      // location.href = "/menu.html";
    }
  } catch (err) {
    console.warn("[Auth] submit error:", err);
    setMessage(err?.message || "Authentication failed.", "error");
  } finally {
    submitBtn.disabled = false;
  }
});

// Initial state
updateMode("login");
