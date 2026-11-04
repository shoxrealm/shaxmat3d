// Shaxmat 3D — konfiguratsiya: mavzular, effektlar, doʻkon mahsulotlari.
// invoiceUrl — bot (createInvoiceLink) orqali yaratilgan doimiy Telegram Stars havolalari.

export const BOT_USERNAME = 'Shaxmat3DBot';
// Onlayn server (Cloudflare Worker). Boʻsh boʻlsa onlayn rejim oʻchiq.
export const API_BASE = 'https://shaxmat3d-server.davr-home-catalog-server.workers.dev';

export const LEVELS = [
  { id: 0, name: 'Boshlovchi', emoji: '🐣', opts: { timeMs: 250, randomness: 160 } },
  { id: 1, name: 'Oʻrta', emoji: '🙂', opts: { timeMs: 450, maxDepth: 4 } },
  { id: 2, name: 'Kuchli', emoji: '💪', opts: { timeMs: 1400 } },
  { id: 3, name: 'Usta', emoji: '🧠', opts: { timeMs: 3000 } },
];

// Har bir mavzu: doska va donalar uchun material sozlamalari.
export const THEMES = {
  klassik: {
    name: 'Klassik yogʻoch', free: true,
    bg: 0x2a1d14, fog: 0x2a1d14, board: 'wood', frame: 0x5a3a22, frameMetal: 0.1, label: '#f3dfbf',
    light: { color: 0xd9bf94, roughness: 0.45, metalness: 0.0, clearcoat: 0.5 },
    dark: { color: 0x3b2416, roughness: 0.38, metalness: 0.0, clearcoat: 0.7 },
    accent: 0xffc36b,
  },
  marmar: {
    name: 'Marmar',
    bg: 0x1c1d22, fog: 0x1c1d22, board: 'marble', frame: 0xc9a45c, frameMetal: 0.9, label: '#3a2a10',
    light: { color: 0xe4e0d8, roughness: 0.2, metalness: 0.0, clearcoat: 1.0, map: 'marbleLight' },
    dark: { color: 0x2b2b30, roughness: 0.16, metalness: 0.0, clearcoat: 1.0, map: 'marbleDark' },
    accent: 0xe8c77a,
  },
  oltin: {
    name: 'Oltin & Obsidian',
    bg: 0x0b0b10, fog: 0x0b0b10, board: 'obsidian', frame: 0xd4a640, frameMetal: 1.0, label: '#3a2a10',
    light: { color: 0xe8b84a, roughness: 0.25, metalness: 1.0, clearcoat: 0.3 },
    dark: { color: 0x15131c, roughness: 0.12, metalness: 0.6, clearcoat: 1.0 },
    accent: 0xffd36a, sparkle: true,
  },
  neon: {
    name: 'Neon',
    bg: 0x05040f, fog: 0x05040f, board: 'neon', frame: 0x14102e, frameMetal: 0.4, label: '#7fe9ff',
    light: { color: 0x9ff6ff, roughness: 0.3, metalness: 0.2, emissive: 0x19c6ff, emissiveIntensity: 0.3 },
    dark: { color: 0xff7ad9, roughness: 0.3, metalness: 0.2, emissive: 0xff2fb4, emissiveIntensity: 0.28 },
    accent: 0x3cf2ff, bloom: true, outline: 0x020208,
  },
  kristall: {
    name: 'Kristall',
    bg: 0x0d1b2a, fog: 0x0d1b2a, board: 'ice', frame: 0x5f8fc8, frameMetal: 0.5, label: '#e9f6ff',
    light: { color: 0xeaf7ff, roughness: 0.1, metalness: 0.0, transmission: 0.75, thickness: 1.2, ior: 1.5, attenuationColor: 0x8fd0ff, attenuationDistance: 0.9, clearcoat: 1.0 },
    dark: { color: 0x3a63ff, roughness: 0.1, metalness: 0.0, transmission: 0.55, thickness: 1.2, ior: 1.5, attenuationColor: 0x1a2aa0, attenuationDistance: 0.6, clearcoat: 1.0 },
    accent: 0x9fdcff,
  },
  samarqand: {
    name: 'Samarqand',
    bg: 0x0a1a2c, fog: 0x0a1a2c, board: 'samarqand', frame: 0xc8a050, frameMetal: 0.9, label: '#3a2a10',
    light: { color: 0xe2d3b0, roughness: 0.32, metalness: 0.0, clearcoat: 0.7 },
    dark: { color: 0xc9a14a, roughness: 0.25, metalness: 1.0, clearcoat: 0.4 },
    accent: 0x3fd0c9,
  },
};

export const EFFECTS = {
  shatter: { name: 'Parchalanish', free: true },
  olov: { name: 'Olov' },
  chaqmoq: { name: 'Chaqmoq' },
  yulduz: { name: 'Yulduzlar' },
};

// Doʻkon. type: theme | effect | pro | bundle
export const ITEMS = [
  { id: 'theme_marmar', type: 'theme', key: 'marmar', name: 'Marmar', emoji: '🏛', price: 49, invoiceUrl: '' },
  { id: 'theme_oltin', type: 'theme', key: 'oltin', name: 'Oltin & Obsidian', emoji: '👑', price: 79, invoiceUrl: '' },
  { id: 'theme_neon', type: 'theme', key: 'neon', name: 'Neon', emoji: '🌌', price: 79, invoiceUrl: '' },
  { id: 'theme_kristall', type: 'theme', key: 'kristall', name: 'Kristall', emoji: '💎', price: 99, invoiceUrl: '' },
  { id: 'theme_samarqand', type: 'theme', key: 'samarqand', name: 'Samarqand', emoji: '🕌', price: 99, invoiceUrl: '' },
  { id: 'fx_olov', type: 'effect', key: 'olov', name: 'Olov effekti', emoji: '🔥', price: 29, invoiceUrl: '' },
  { id: 'fx_chaqmoq', type: 'effect', key: 'chaqmoq', name: 'Chaqmoq effekti', emoji: '⚡', price: 29, invoiceUrl: '' },
  { id: 'fx_yulduz', type: 'effect', key: 'yulduz', name: 'Yulduz izi', emoji: '✨', price: 29, invoiceUrl: '' },
  { id: 'pro', type: 'pro', name: 'PRO: cheksiz orqaga va maslahat', emoji: '🧠', price: 99, invoiceUrl: '' },
  { id: 'bundle_all', type: 'bundle', name: 'Hammasi bir paketda', emoji: '🎁', price: 299, invoiceUrl: '' },
];

export const FREE_UNDOS = 3;
export const FREE_HINTS = 1;
