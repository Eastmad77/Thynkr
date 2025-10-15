// scripts/play.js — v7000
import { Entitlements } from './entitlements.js';

const isAndroid = /Android/i.test(navigator.userAgent);

export async function startPlayPurchase(sku = 'pro_monthly') {
  if (!isAndroid || !window.AndroidBilling) {
    console.info('[Play] Not in Android TWA, fallback to Stripe or trial.');
    return false;
  }
  try {
    const ok = await window.AndroidBilling.purchase(sku);
    if (ok) Entitlements.grantPro();
    return ok;
  } catch (e) {
    console.error('[Play] purchase error', e);
    return false;
  }
}

export async function restorePlayPurchases() {
  if (!isAndroid || !window.AndroidBilling) return false;
  try {
    const active = await window.AndroidBilling.restore();
    if (active) Entitlements.grantPro();
    return active;
  } catch { return false; }
}
