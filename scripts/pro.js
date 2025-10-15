// scripts/pro.js — v7000
import { Entitlements } from './entitlements.js';
import { Plans } from './plan.js';
import { startStripeCheckout } from './stripe.js';
import { startPlayPurchase } from './play.js';

function $ (s) { return document.querySelector(s); }

function renderStatus() {
  const statusEl = $('#trial-status');
  if (!statusEl) return;

  if (Entitlements.isPro()) {
    statusEl.textContent = 'You are Pro. Enjoy your perks!';
    return;
  }

  const t = Entitlements.trialStatus();
  if (t.active) {
    statusEl.textContent = `Trial active — ${t.remaining} day(s) left`;
  } else {
    statusEl.textContent = `Includes a ${Plans.pro.trialDays}-day free trial`;
  }
}

function onStartTrial() {
  const t = Entitlements.trialStatus();
  if (!t.active && !Entitlements.isPro()) {
    Entitlements.startTrial();
    renderStatus();
    alert('Your 3-day Pro trial has started. Enjoy!');
  } else {
    alert('You already have Pro or an active trial.');
  }
}

function onBuyPro() {
  // Prefer Play Billing when in Android TWA, fallback to Stripe otherwise
  startPlayPurchase('pro_monthly').then(ok => {
    if (!ok) startStripeCheckout();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const btnTrial = document.getElementById('start-trial');
  if (btnTrial) btnTrial.addEventListener('click', onStartTrial);

  const buyBtn = document.getElementById('buy-pro');
  if (buyBtn) buyBtn.addEventListener('click', onBuyPro);

  renderStatus();
});
