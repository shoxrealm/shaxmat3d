// Telegram WebApp oʻrami: brauzerda ham ishlaydi (fallback).
const tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData !== undefined
  ? window.Telegram.WebApp : null;
export const inTelegram = !!(tg && tg.initData);

export function initTelegram() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
    if (tg.setHeaderColor) tg.setHeaderColor('#EEF0F2');
    if (tg.setBackgroundColor) tg.setBackgroundColor('#EEF0F2');
    if (tg.requestFullscreen && tg.isVersionAtLeast && tg.isVersionAtLeast('8.0') && /android|iphone|ipad/i.test(navigator.userAgent)) {
      // toʻliq ekran faqat telefonlarda
      try { tg.requestFullscreen(); } catch (e) { /* ignore */ }
    }
  } catch (e) { /* ignore */ }
}

export function userName() {
  const u = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
  return (u && (u.first_name || u.username)) || 'Siz';
}

let hapticsOn = true;
export function setHaptics(v) { hapticsOn = v; }
export function haptic(kind) {
  if (!hapticsOn || !tg || !tg.HapticFeedback) return;
  try {
    if (kind === 'success' || kind === 'error' || kind === 'warning') tg.HapticFeedback.notificationOccurred(kind);
    else if (kind === 'select') tg.HapticFeedback.selectionChanged();
    else tg.HapticFeedback.impactOccurred(kind || 'light');
  } catch (e) { /* ignore */ }
}

// --- saqlash: CloudStorage (Telegram) + localStorage (har doim) ---
const cloudOK = () => tg && tg.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast('6.9');

export function storeGet(key) {
  return new Promise((resolve) => {
    const local = localStorage.getItem('s3d_' + key);
    if (!cloudOK()) return resolve(local ? JSON.parse(local) : null);
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve(local ? JSON.parse(local) : null); } }, 1500);
    tg.CloudStorage.getItem(key, (err, val) => {
      if (done) return;
      done = true; clearTimeout(t);
      const v = !err && val ? val : local;
      try { resolve(v ? JSON.parse(v) : null); } catch (e) { resolve(null); }
    });
  });
}

export function storeSet(key, value) {
  const s = JSON.stringify(value);
  try { localStorage.setItem('s3d_' + key, s); } catch (e) { /* ignore */ }
  if (cloudOK() && s.length < 4000) {
    try { tg.CloudStorage.setItem(key, s, () => {}); } catch (e) { /* ignore */ }
  }
}

export function openInvoice(url) {
  return new Promise((resolve) => {
    if (!tg || !tg.openInvoice || !url) return resolve('unavailable');
    try { tg.openInvoice(url, (status) => resolve(status)); } catch (e) { resolve('failed'); }
  });
}

export function shareGame(text) {
  if (tg && tg.switchInlineQuery) {
    try { tg.switchInlineQuery('shaxmat', ['users', 'groups']); return true; } catch (e) { /* ignore */ }
  }
  if (navigator.share) { navigator.share({ text }).catch(() => {}); return true; }
  return false;
}

let backHandler = null;
export function setBack(fn) {
  if (!tg || !tg.BackButton) return;
  if (backHandler) tg.BackButton.offClick(backHandler);
  backHandler = fn;
  if (fn) { tg.BackButton.onClick(fn); tg.BackButton.show(); } else tg.BackButton.hide();
}

export function startParamOwned() {
  const q = new URLSearchParams(location.search);
  const own = (q.get('own') || '').split(',').filter(Boolean);
  return own;
}
