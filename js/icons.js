// Ingichka chiziqli ikonkalar va girih yulduzi (8 burchakli) medalyoni — emoji oʻrniga.
const P = {
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  hint: '<path d="M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3Z"/><path d="M9.5 19h5M10.5 21.5h3"/>',
  view: '<path d="M3 8l9-5 9 5-9 5-9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/>',
  half: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/><path d="M10 10h4v4h-4z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.8 2.7 2.8 15.3 0 18M12 3c-2.8 2.7-2.8 15.3 0 18"/>',
  pair: '<circle cx="8" cy="8" r="3.2"/><circle cx="16" cy="8" r="3.2"/><path d="M2.5 20c.6-3.6 2.8-5.5 5.5-5.5s4.9 1.9 5.5 5.5M13 15.2c.9-.5 1.9-.7 3-.7 2.7 0 4.9 1.9 5.5 5.5"/>',
  play: '<path d="M7 4.5v15l12-7.5-12-7.5Z"/>',
  bag: '<path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  send: '<path d="M21 3 3 10.5l7 2.5 2.5 7L21 3Z"/><path d="m10 13 4.5-4.5"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8.5 21h7M9.5 18h5"/>',
  bolt: '<path d="M13 2 5 13.5h6L10 22l8-11.5h-6L13 2Z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.8"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
};

export function icon(name, size = 22) {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}

/** Brend belgisi: ochiq koʻk yumaloq kvadrat, ichida oq ot boshi va oltin taglik. */
export function knightLogo(size = 56) {
  return `<svg class="logo" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
    <rect class="logo-tile" x="2" y="2" width="60" height="60" rx="16"/>
    <path class="logo-knight" d="M21 47c0-6 2.5-10.5 7-14.5-3 .3-5.5 1.6-8 2.6-2.4 1-4.6-.3-4.6-2.7 0-1.2.4-2.2 1.2-3.4l4.6-6.6c1.6-2.3 3.6-4.2 6-5.5l1-4.9 3.6 3.9c7.4.6 12.9 6.7 13.7 15.6.4 4.7.5 10.2.5 15.5Z"/>
    <path class="logo-mane" d="M35.5 17.6c4.4 2.7 7 7.6 7.6 14.2.3 3.8.4 9 .4 15.2" fill="none" stroke-width="2.2" stroke-linecap="round"/>
    <circle class="logo-eye" cx="27.4" cy="23.6" r="1.7"/>
    <rect class="logo-base" x="16" y="48.5" width="32" height="5" rx="2.5"/>
  </svg>`;
}

/** Girih: ikki kvadratdan hosil boʻlgan 8 burchakli yulduz, ichida matn (masalan "1–0" yoki ♞). */
export function medallion(inner = '', size = 120, cls = '') {
  const sq = (r) => `<rect x="${60 - r}" y="${60 - r}" width="${2 * r}" height="${2 * r}"/>`;
  return `<svg class="medal ${cls}" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
    <g fill="none" stroke="currentColor" stroke-width="1.4">
      <g>${sq(42)}</g><g transform="rotate(45 60 60)">${sq(42)}</g>
      <circle cx="60" cy="60" r="31" stroke-width="1"/>
      <g opacity=".55">${sq(50)}</g><g transform="rotate(45 60 60)" opacity=".55">${sq(50)}</g>
    </g>
    <text x="60" y="60" text-anchor="middle" dominant-baseline="central" class="medal-t">${/[\u2654-\u265F]/.test(inner) ? inner + '\uFE0E' : inner}</text>
  </svg>`;
}
