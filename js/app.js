/* Whylee — Core App Utilities (routing-lite, state, avatars, entitlements)
   Path: /js/app.js
*/
const LS = {
  PROFILE: "whylee.profile",
  ENTITLEMENT: "whylee.entitlement", // { tier: "free" | "pro-silver" | "pro-gold" | "pro-charcoal" }
  REFLECTIONS: "whylee.reflections",
  STREAK: "whylee.streak" // { count, lastISO }
};

export const PATHS = {
  posters: "/media/posters",
  avatars: "/media/avatars"
};

// ---------- Entitlements ----------
export function getEntitlement() {
  const raw = localStorage.getItem(LS.ENTITLEMENT);
  if (!raw) return { tier: "free" };
  try { return JSON.parse(raw) || { tier: "free" }; } catch { return { tier: "free" }; }
}

export function setEntitlement(tier) {
  localStorage.setItem(LS.ENTITLEMENT, JSON.stringify({ tier }));
  window.dispatchEvent(new CustomEvent("whylee:entitlement", { detail: { tier } }));
}

export function isPro() {
  const { tier } = getEntitlement();
  return tier && tier !== "free";
}

// ---------- Avatars / Rings / Mascots ----------
export const Avatars = {
  free: {
    base: `${PATHS.avatars}/profile-default.svg`,
    ring: `${PATHS.avatars}/ring-default.svg`,
    mascots: {
      default: `${PATHS.avatars}/fox-default.png`,
      happy:   `${PATHS.avatars}/fox-happy.png`,
      sad:     `${PATHS.avatars}/fox-sad.png`,
      focused: `${PATHS.avatars}/fox-focused.png`,
      curious: `${PATHS.avatars}/fox-curious.png`
    }
  },
  pro: {
    "pro-silver": {
      base: `${PATHS.avatars}/profile-pro-silver.svg`,
      ring: `${PATHS.avatars}/ring-pro-silver.svg`,
      mascot: `${PATHS.avatars}/owl-pro.png`
    },
    "pro-gold": {
      base: `${PATHS.avatars}/profile-pro-gold.svg`,
      ring: `${PATHS.avatars}/ring-pro-gold.svg`,
      mascot: `${PATHS.avatars}/panda-pro.png`
    },
    "pro-charcoal": {
      base: `${PATHS.avatars}/profile-pro-charcoal.svg`,
      ring: `${PATHS.avatars}/ring-pro-charcoal.svg`,
      mascot: `${PATHS.avatars}/cat-pro.png`
    }
  }
};

// ---------- Profile ----------
export function getProfile() {
  const raw = localStorage.getItem(LS.PROFILE);
  if (!raw) {
    const seed = { name: "Player", mood: "default" }; // mood = default|happy|sad|focused|curious
    localStorage.setItem(LS.PROFILE, JSON.stringify(seed));
    return seed;
  }
  try { return JSON.parse(raw); } catch { return { name: "Player", mood: "default" }; }
}

export function saveProfile(patch) {
  const cur = getProfile();
  const next = { ...cur, ...patch };
  localStorage.setItem(LS.PROFILE, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("whylee:profile", { detail: next }));
  return next;
}

// ---------- Helpers ----------
export function preloadImages(srcs = []) {
  srcs.forEach((src) => {
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = src;
  });
}

export function selectMascotSrc() {
  const ent = getEntitlement();
  if (!isPro()) {
    const { mood = "default" } = getProfile();
    return Avatars.free.mascots[mood] || Avatars.free.mascots.default;
  }
  const map = Avatars.pro[ent.tier] || Avatars.pro["pro-silver"];
  return map.mascot;
}

export function getFrameAssets() {
  const ent = getEntitlement();
  if (!isPro()) {
    return { base: Avatars.free.base, ring: Avatars.free.ring };
  }
  const tier = Avatars.pro[ent.tier] ? ent.tier : "pro-silver";
  return { base: Avatars.pro[tier].base, ring: Avatars.pro[tier].ring };
}

// ---------- Profile Page wiring ----------
export function initProfilePage() {
  const $name = document.querySelector('[data-prof="name"]');
  const $save = document.querySelector('[data-prof="save"]');
  const $mood = document.querySelector('[data-prof="mood"]');
  const $tier = document.querySelector('[data-prof="tier"]');
  const $avatarBase = document.querySelector('[data-prof="avatar-base"]');
  const $avatarRing = document.querySelector('[data-prof="avatar-ring"]');
  const $mascot = document.querySelector('[data-prof="mascot"]');

  const profile = getProfile();
  const ent = getEntitlement();

  $name.value = profile.name || "Player";
  $mood.value = profile.mood || "default";
  $tier.textContent = isPro() ? ent.tier.replace("pro-", "Pro ").toUpperCase() : "FREE";

  const { base, ring } = getFrameAssets();
  $avatarBase.src = base;
  $avatarRing.src = ring;
  $mascot.src = selectMascotSrc();

  preloadImages([base, ring, $mascot.src]);

  $save?.addEventListener("click", () => {
    const next = saveProfile({ name: $name.value.trim() || "Player", mood: $mood.value });
    // Live refresh of mascot if on Free
    if (!isPro()) {
      $mascot.src = selectMascotSrc();
    }
    // Simple toast
    toast("Profile saved");
  });

  // Live entitlement badge updates
  window.addEventListener("whylee:entitlement", (e) => {
    const t = e.detail?.tier || "free";
    $tier.textContent = t === "free" ? "FREE" : t.replace("pro-", "Pro ").toUpperCase();
    const { base, ring } = getFrameAssets();
    $avatarBase.src = base;
    $avatarRing.src = ring;
    $mascot.src = selectMascotSrc();
  });
}

// ---------- Tiny toast ----------
export function toast(msg = "Done") {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    Object.assign(el.style, {
      position: "fixed",
      left: "50%", bottom: "24px", transform: "translateX(-50%)",
      padding: "10px 14px", borderRadius: "10px",
      background: "rgba(10,14,23,.85)", color: "#dbe2ea",
      border: "1px solid #17233b", zIndex: 9999,
      boxShadow: "0 10px 30px rgba(0,0,0,.35)"
    });
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = "1";
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = "0"; }, 1400);
}

// ---------- Expose (optional debugging in console) ----------
window.Whylee = {
  getEntitlement, setEntitlement, isPro,
  getProfile, saveProfile, selectMascotSrc, getFrameAssets
};
