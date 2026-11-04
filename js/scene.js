// Shaxmat 3D — three.js sahnasi: doska, donalar, mavzular, animatsiyalar va effektlar.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { THEMES } from './config.js';

// ───────────── yordamchi: easing va tween ─────────────
export const ease = {
  linear: (k) => k,
  outCubic: (k) => 1 - Math.pow(1 - k, 3),
  inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  outBack: (k) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  outBounce: (k) => {
    const n1 = 7.5625, d1 = 2.75;
    if (k < 1 / d1) return n1 * k * k;
    if (k < 2 / d1) return n1 * (k -= 1.5 / d1) * k + 0.75;
    if (k < 2.5 / d1) return n1 * (k -= 2.25 / d1) * k + 0.9375;
    return n1 * (k -= 2.625 / d1) * k + 0.984375;
  },
};

const tweens = [];
export function tween(dur, fn, easing = ease.inOutCubic, delay = 0) {
  return new Promise((res) => tweens.push({ t0: performance.now() + delay, dur: Math.max(1, dur), fn, easing, res }));
}
function stepTweens(now) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    if (now < tw.t0) continue;
    const k = Math.min(1, (now - tw.t0) / tw.dur);
    tw.fn(tw.easing(k), k);
    if (k >= 1) { tweens.splice(i, 1); tw.res(); }
  }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ───────────── koordinatalar ─────────────
export function sqToXZ(sq) {
  const f = sq.charCodeAt(0) - 97, r = +sq[1] - 1;
  return { x: f - 3.5, z: 3.5 - r };
}
function xzToSq(x, z) {
  const f = Math.floor(x + 4), r = Math.floor(4 - z);
  if (f < 0 || f > 7 || r < 0 || r > 7) return null;
  return String.fromCharCode(97 + f) + (r + 1);
}

// ───────────── donalar geometriyasi (protsedural) ─────────────
const V = (x, y) => new THREE.Vector2(x, y);
const BASE = [V(0, 0), V(0.38, 0), V(0.395, 0.02), V(0.395, 0.06), V(0.37, 0.085), V(0.33, 0.1), V(0.335, 0.13), V(0.3, 0.15)];
function arc(cx, cy, rx, ry, a0, a1, n = 10) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = THREE.MathUtils.degToRad(a0 + ((a1 - a0) * i) / n);
    pts.push(V(Math.max(0, cx + rx * Math.cos(a)), cy + ry * Math.sin(a)));
  }
  return pts;
}
function clean(g) {
  g = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((g.attributes.position.count) * 2), 2));
  g.clearGroups();
  return g;
}
function lathe(pts, seg) { return clean(new THREE.LatheGeometry(pts, seg)); }

function buildGeometries(seg = 40) {
  const G = {};
  G.p = lathe([...BASE, V(0.22, 0.2), V(0.17, 0.28), V(0.13, 0.38), V(0.115, 0.45), V(0.17, 0.47), V(0.18, 0.49),
    V(0.17, 0.51), V(0.11, 0.53), ...arc(0, 0.645, 0.15, 0.15, -58, 90, 14)], seg);

  const rookBody = lathe([...BASE, V(0.27, 0.18), V(0.24, 0.24), V(0.215, 0.32), V(0.205, 0.6), V(0.22, 0.66),
    V(0.29, 0.69), V(0.29, 0.72), V(0.27, 0.73), V(0.27, 0.86), V(0.19, 0.86), V(0.19, 0.8), V(0, 0.8)], seg);
  const merlons = [];
  for (let i = 0; i < 6; i++) {
    const b = new RoundedBoxGeometry(0.15, 0.1, 0.09, 2, 0.02);
    const a = (i / 6) * Math.PI * 2;
    b.rotateY(-a); b.translate(Math.cos(a) * 0.232, 0.905, Math.sin(a) * 0.232);
    merlons.push(clean(b));
  }
  G.r = mergeGeometries([rookBody, ...merlons]);

  G.b = mergeGeometries([
    lathe([...BASE, V(0.23, 0.18), V(0.17, 0.27), V(0.13, 0.42), V(0.11, 0.58), V(0.2, 0.61), V(0.21, 0.63), V(0.19, 0.65),
      V(0.12, 0.67), ...arc(0, 0.83, 0.155, 0.2, -70, 78, 14), V(0.035, 1.0), V(0.045, 1.02), ...arc(0, 1.065, 0.05, 0.05, -60, 90, 8)], seg),
  ]);

  const qBalls = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, s = new THREE.SphereGeometry(0.038, 10, 8);
    s.translate(Math.cos(a) * 0.215, 1.125, Math.sin(a) * 0.215);
    qBalls.push(clean(s));
  }
  const qTop = new THREE.SphereGeometry(0.075, 16, 12); qTop.translate(0, 1.13, 0);
  G.q = mergeGeometries([lathe([...BASE, V(0.25, 0.18), V(0.19, 0.28), V(0.15, 0.45), V(0.12, 0.7), V(0.11, 0.82), V(0.21, 0.85),
    V(0.22, 0.875), V(0.2, 0.9), V(0.13, 0.92), V(0.16, 0.98), V(0.23, 1.1), V(0.2, 1.115), V(0.12, 1.06), V(0, 1.06)], seg),
  ...qBalls, clean(qTop)]);

  const cv = new RoundedBoxGeometry(0.075, 0.28, 0.075, 2, 0.02); cv.translate(0, 1.3, 0);
  const ch = new RoundedBoxGeometry(0.22, 0.075, 0.075, 2, 0.02); ch.translate(0, 1.33, 0);
  G.k = mergeGeometries([lathe([...BASE, V(0.26, 0.18), V(0.2, 0.28), V(0.155, 0.46), V(0.125, 0.74), V(0.115, 0.86), V(0.22, 0.89),
    V(0.23, 0.915), V(0.21, 0.94), V(0.14, 0.96), V(0.18, 1.02), V(0.21, 1.12), V(0.16, 1.15), V(0, 1.16)], seg), clean(cv), clean(ch)]);

  // Ot: yon siluet (x — oldinga) ekstruziya + aylanma taglik
  const s = new THREE.Shape();
  s.moveTo(-0.2, 0.2);
  s.splineThru([V(-0.24, 0.45), V(-0.2, 0.7), V(-0.12, 0.88), V(-0.05, 0.98)]);
  s.lineTo(-0.01, 1.07); s.lineTo(0.05, 0.97);
  s.splineThru([V(0.15, 0.9), V(0.25, 0.78), V(0.32, 0.66)]);
  s.quadraticCurveTo(0.35, 0.6, 0.3, 0.56);
  s.splineThru([V(0.2, 0.57), V(0.1, 0.6), V(0.04, 0.55)]);
  s.splineThru([V(0.1, 0.42), V(0.22, 0.28), V(0.2, 0.2)]);
  s.lineTo(-0.2, 0.2);
  const head = clean(new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 4, curveSegments: 12 }));
  head.translate(0, 0, -0.15);
  // tumshuq tomonga ingichkalashadi — hajmli koʻrinish
  const hp = head.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    const x = hp.getX(i), y = hp.getY(i);
    const t = THREE.MathUtils.clamp((x + 0.25) / 0.6, 0, 1), u = THREE.MathUtils.clamp((y - 0.2) / 0.3, 0, 1);
    hp.setZ(i, hp.getZ(i) * (1 - 0.42 * t) * (0.85 + 0.15 * u));
  }
  const eyeL = new THREE.SphereGeometry(0.032, 10, 8); eyeL.translate(0.13, 0.83, 0.15);
  const eyeR = new THREE.SphereGeometry(0.032, 10, 8); eyeR.translate(0.13, 0.83, -0.15);
  const knightHead = mergeGeometries([head, clean(eyeL), clean(eyeR)]);
  knightHead.rotateY(Math.PI / 4); // raqib tomonga qiya qaraydi — profil koʻrinadi
  G.n = mergeGeometries([lathe([...BASE, V(0.29, 0.18), V(0.27, 0.23), V(0, 0.23)], seg), knightHead]);

  // silliq normallar (asosiy) va toʻliq payvandlangan kontur geometriyasi (qora chegara uchun)
  const OUT = {};
  for (const k in G) {
    const base = G[k];
    const g = base.clone(); g.deleteAttribute('normal');
    G[k] = mergeVertices(g, 1e-4); G[k].computeVertexNormals(); G[k].computeBoundingBox();
    const o = base.clone(); o.deleteAttribute('normal'); o.deleteAttribute('uv');
    OUT[k] = mergeVertices(o, 1e-4); OUT[k].computeVertexNormals();
  }
  G.outline = OUT;
  return G;
}

// Kontur: orqa tomoni koʻrinadigan, normal boʻylab biroz kattalashtirilgan qora qobiq
function outlineMaterial(color, width) {
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed += normalize(normal) * ${width.toFixed(4)};`);
  };
  m.customProgramCacheKey = () => 'outline' + width;
  return m;
}

// ───────────── protsedural teksturalar ─────────────
function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

function marbleTexture(base, vein, seed = 7, size = 512) {
  const [c, x] = canvas(size); const r = rnd(seed);
  x.fillStyle = base; x.fillRect(0, 0, size, size);
  x.globalAlpha = 0.5;
  for (let v = 0; v < 14; v++) {
    x.strokeStyle = vein; x.lineWidth = 0.5 + r() * 2.2; x.beginPath();
    let px = r() * size, py = r() * size; x.moveTo(px, py);
    for (let i = 0; i < 40; i++) { px += (r() - 0.35) * 40; py += (r() - 0.5) * 40; x.lineTo(px, py); }
    x.stroke();
  }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function drawStar8(x, cx, cy, R) {
  x.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? R * 0.62 : R;
    const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
    i ? x.lineTo(px, py) : x.moveTo(px, py);
  }
  x.closePath();
}

function boardTexture(style, size) {
  const [c, x] = canvas(size); const q = size / 8; const r = rnd(11);
  const sq = (i, j) => (i + j) % 2 === 0; // true = qora katak (a1 qora)
  const each = (fn) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) fn(i, j, i * q, (7 - j) * q, !sq(i, j)); };
  let emissive = null;
  if (style === 'wood') {
    each((i, j, px, py, light) => {
      x.fillStyle = light ? '#d6aa70' : '#6b3d20'; x.fillRect(px, py, q, q);
      x.globalAlpha = 0.18;
      for (let k = 0; k < 18; k++) {
        x.strokeStyle = light ? '#b98d5c' : '#3f2414'; x.lineWidth = 1 + r() * 2; x.beginPath();
        const vert = (i + j) % 2 === 0, o = r() * q;
        for (let t = 0; t <= q; t += 8) {
          const w = Math.sin((t + k * 13) * 0.05) * 3;
          vert ? (t ? x.lineTo(px + o + w, py + t) : x.moveTo(px + o + w, py + t)) : (t ? x.lineTo(px + t, py + o + w) : x.moveTo(px + t, py + o + w));
        }
        x.stroke();
      }
      x.globalAlpha = 1;
    });
  } else if (style === 'marble') {
    const L = marbleTexture('#dedad2', '#8a8a96', 3, 256).image, D = marbleTexture('#26262c', '#8c7a55', 5, 256).image;
    each((i, j, px, py, light) => x.drawImage(light ? L : D, ((i * 37) % 4) * 32, ((j * 53) % 4) * 32, 128, 128, px, py, q, q));
    x.strokeStyle = 'rgba(214,180,110,.55)'; x.lineWidth = size / 512;
    for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * q, 0); x.lineTo(i * q, size); x.moveTo(0, i * q); x.lineTo(size, i * q); x.stroke(); }
  } else if (style === 'obsidian') {
    each((i, j, px, py, light) => {
      const g = x.createLinearGradient(px, py, px + q, py + q);
      if (light) { g.addColorStop(0, '#6b5320'); g.addColorStop(1, '#3d2f10'); } else { g.addColorStop(0, '#141219'); g.addColorStop(1, '#050408'); }
      x.fillStyle = g; x.fillRect(px, py, q, q);
    });
    x.strokeStyle = '#d4a640'; x.lineWidth = size / 400;
    for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * q, 0); x.lineTo(i * q, size); x.moveTo(0, i * q); x.lineTo(size, i * q); x.stroke(); }
  } else if (style === 'neon') {
    each((i, j, px, py, light) => { x.fillStyle = light ? '#120f2a' : '#07060f'; x.fillRect(px, py, q, q); });
    const [ec, ex] = canvas(size); ex.fillStyle = '#000'; ex.fillRect(0, 0, size, size);
    for (const ctx of [x, ex]) {
      ctx.lineWidth = size / 300;
      for (let i = 0; i <= 8; i++) {
        ctx.strokeStyle = i % 2 ? '#ff2fb4' : '#19c6ff';
        ctx.beginPath(); ctx.moveTo(i * q, 0); ctx.lineTo(i * q, size); ctx.stroke();
        ctx.strokeStyle = i % 2 ? '#19c6ff' : '#ff2fb4';
        ctx.beginPath(); ctx.moveTo(0, i * q); ctx.lineTo(size, i * q); ctx.stroke();
      }
    }
    each((i, j, px, py, light) => { if (light) { ex.fillStyle = 'rgba(80,60,255,.08)'; ex.fillRect(px, py, q, q); } });
    emissive = new THREE.CanvasTexture(ec); emissive.colorSpace = THREE.SRGBColorSpace;
  } else if (style === 'ice') {
    each((i, j, px, py, light) => {
      const g = x.createLinearGradient(px, py, px, py + q);
      if (light) { g.addColorStop(0, '#d6ebfa'); g.addColorStop(1, '#a9cdec'); } else { g.addColorStop(0, '#5f8fc8'); g.addColorStop(1, '#3d6aa6'); }
      x.fillStyle = g; x.fillRect(px, py, q, q);
      x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1.2;
      for (let k = 0; k < 4; k++) {
        x.beginPath(); let a = px + r() * q, b = py + r() * q; x.moveTo(a, b);
        for (let t = 0; t < 4; t++) { a += (r() - 0.5) * q * 0.5; b += (r() - 0.5) * q * 0.5; x.lineTo(a, b); }
        x.stroke();
      }
    });
  } else if (style === 'samarqand') {
    each((i, j, px, py, light) => {
      x.fillStyle = light ? '#d6c6a2' : '#123f70'; x.fillRect(px, py, q, q);
      const cx = px + q / 2, cy = py + q / 2;
      drawStar8(x, cx, cy, q * 0.42);
      x.fillStyle = light ? '#2f9a93' : '#1a68a0'; x.fill();
      x.lineWidth = q * 0.035; x.strokeStyle = '#d6ae55'; x.stroke();
      drawStar8(x, cx, cy, q * 0.2); x.fillStyle = light ? '#f6efe0' : '#0d335e'; x.fill(); x.stroke();
      x.beginPath(); x.arc(cx, cy, q * 0.06, 0, Math.PI * 2); x.fillStyle = '#d6ae55'; x.fill();
      x.strokeStyle = 'rgba(214,174,85,.7)'; x.lineWidth = q * 0.02; x.strokeRect(px + q * 0.03, py + q * 0.03, q * 0.94, q * 0.94);
    });
  }
  // kataklar orasida ingichka qora chiziq va doska atrofida qalin qora chegara
  if (style !== 'neon') {
    x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = Math.max(1.5, size / 650);
    for (let i = 1; i < 8; i++) { x.beginPath(); x.moveTo(i * q, 0); x.lineTo(i * q, size); x.moveTo(0, i * q); x.lineTo(size, i * q); x.stroke(); }
  }
  x.strokeStyle = style === 'neon' ? '#000' : 'rgba(8,6,4,.92)'; x.lineWidth = size / 110;
  x.strokeRect(0, 0, size, size);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  return { map, emissive };
}

function labelTexture(color, flip, size = 1024) {
  const [c, x] = canvas(size); const W = 9.5, unit = size / W, m = 0.75 * unit;
  x.fillStyle = color; x.font = `600 ${Math.round(unit * 0.32)}px system-ui, sans-serif`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let i = 0; i < 8; i++) {
    const f = String.fromCharCode(97 + i), rk = String(i + 1);
    const p = m + (i + 0.5) * unit;
    const drawAt = (txt, px, py) => {
      x.save(); x.translate(px, py); if (flip) x.rotate(Math.PI); x.fillText(txt, 0, 0); x.restore();
    };
    drawAt(f, p, size - m / 2); drawAt(f, p, m / 2);
    drawAt(rk, m / 2, size - p); drawAt(rk, size - m / 2, size - p);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function radialTexture(inner, outer) {
  const [c, x] = canvas(512); const g = x.createRadialGradient(256, 256, 30, 256, 256, 256);
  g.addColorStop(0, inner); g.addColorStop(1, outer); x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ───────────── zarrachalar (Points + shader) ─────────────
class Emitter {
  constructor(max, additive, square = false) {
    this.max = max; this.n = 0;
    const A = (k) => new Float32Array(max * k);
    this.p = A(3); this.c = A(3); this.s = A(1); this.a = A(1);
    this.v = A(3); this.life = A(1); this.maxLife = A(1); this.g = A(1); this.drag = A(1); this.s0 = A(1); this.grow = A(1); this.spin = A(1);
    const geo = new THREE.BufferGeometry();
    this.attrP = new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage);
    this.attrC = new THREE.BufferAttribute(this.c, 3).setUsage(THREE.DynamicDrawUsage);
    this.attrS = new THREE.BufferAttribute(this.s, 1).setUsage(THREE.DynamicDrawUsage);
    this.attrA = new THREE.BufferAttribute(this.a, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.attrP); geo.setAttribute('pcolor', this.attrC);
    geo.setAttribute('psize', this.attrS); geo.setAttribute('palpha', this.attrA);
    geo.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { scale: { value: 500 }, square: { value: square ? 1 : 0 } },
      vertexShader: `attribute vec3 pcolor; attribute float psize; attribute float palpha; uniform float scale;
        varying vec3 vC; varying float vA;
        void main(){ vC=pcolor; vA=palpha; vec4 mv=modelViewMatrix*vec4(position,1.0);
          gl_PointSize=psize*scale/max(0.1,-mv.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA; uniform float square;
        void main(){ vec2 c=gl_PointCoord-0.5; float d=length(c);
          if(square<0.5){ if(d>0.5) discard; gl_FragColor=vec4(vC, vA*smoothstep(0.5,0.05,d)); }
          else { if(max(abs(c.x),abs(c.y))>0.5) discard; gl_FragColor=vec4(vC, vA); } }`,
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.geo = geo;
  }
  spawn(o) {
    if (this.n >= this.max) return;
    const i = this.n++, c = new THREE.Color(o.color ?? 0xffffff);
    this.p.set([o.p.x, o.p.y, o.p.z], i * 3); this.v.set([o.v?.x || 0, o.v?.y || 0, o.v?.z || 0], i * 3);
    this.c.set([c.r, c.g, c.b], i * 3);
    this.s0[i] = o.size ?? 0.06; this.s[i] = this.s0[i]; this.a[i] = 1;
    this.life[i] = this.maxLife[i] = o.life ?? 1; this.g[i] = o.grav ?? 0; this.drag[i] = o.drag ?? 0; this.grow[i] = o.grow ?? 0;
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        const j = --this.n;
        if (i !== j) {
          for (const [arr, k] of [[this.p, 3], [this.v, 3], [this.c, 3]]) for (let t = 0; t < k; t++) arr[i * k + t] = arr[j * k + t];
          for (const arr of [this.s, this.a, this.life, this.maxLife, this.g, this.drag, this.s0, this.grow]) arr[i] = arr[j];
        }
        i--; continue;
      }
      const d = Math.max(0, 1 - this.drag[i] * dt);
      this.v[i * 3] *= d; this.v[i * 3 + 2] *= d; this.v[i * 3 + 1] = this.v[i * 3 + 1] * d + this.g[i] * dt;
      this.p[i * 3] += this.v[i * 3] * dt; this.p[i * 3 + 1] += this.v[i * 3 + 1] * dt; this.p[i * 3 + 2] += this.v[i * 3 + 2] * dt;
      if (this.p[i * 3 + 1] < 0.01 && this.g[i] < 0) { this.p[i * 3 + 1] = 0.01; this.v[i * 3 + 1] *= -0.3; }
      const k = this.life[i] / this.maxLife[i];
      this.a[i] = Math.min(1, k * 2.2);
      this.s[i] = this.s0[i] * (1 + this.grow[i] * (1 - k));
    }
    this.geo.setDrawRange(0, this.n);
    this.attrP.needsUpdate = this.attrC.needsUpdate = this.attrS.needsUpdate = this.attrA.needsUpdate = true;
  }
}

// ───────────── asosiy sahna ─────────────
export class Scene3D {
  constructor(container) {
    this.container = container;
    this.quality = 'high';
    this.themeKey = 'klassik';
    this.effect = 'shatter';
    this.orientation = 'w';
    this.view2D = false;
    this.pieces = new Map();
    this.fragments = [];
    this.overlays = [];
    this.onTap = () => false;
    this.canDrag = () => false;
    this.shake = 0;
    this.insets = { top: 0, bottom: 0 };
    this.camAnim = false;

    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.85;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(r.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.camera.position.set(0, 10.5, 9.5);
    this.envTex = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envTex;

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x404050, 0.5);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.6);
    this.sun.position.set(4.5, 11, 5.5);
    this.sun.castShadow = true;
    Object.assign(this.sun.shadow.camera, { left: -6.5, right: 6.5, top: 6.5, bottom: -6.5, near: 1, far: 30 });
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.02;
    this.rim = new THREE.DirectionalLight(0x8fb6ff, 0.6); this.rim.position.set(-6, 5, -7);
    this.fxLight = new THREE.PointLight(0xffffff, 0, 6, 2);
    this.checkLight = new THREE.PointLight(0xff2020, 0, 3, 2);
    this.scene.add(this.hemi, this.sun, this.rim, this.fxLight, this.checkLight);

    this.geos = buildGeometries(40);
    this.boardGroup = new THREE.Group();
    this.scene.add(this.boardGroup);
    this.piecesGroup = new THREE.Group();
    this.scene.add(this.piecesGroup);

    this.frame = new THREE.Mesh(new RoundedBoxGeometry(9.5, 0.6, 9.5, 6, 0.16), new THREE.MeshPhysicalMaterial({ color: 0x5a3a22 }));
    this.frame.position.y = -0.3; this.frame.receiveShadow = true;
    this.labels = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 9.5), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
    this.labels.rotation.x = -Math.PI / 2; this.labels.position.y = 0.003;
    this.top = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshPhysicalMaterial({ roughness: 0.35 }));
    this.top.rotation.x = -Math.PI / 2; this.top.position.y = 0.006; this.top.receiveShadow = true;
    this.floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshBasicMaterial({ depthWrite: false }));
    this.floor.rotation.x = -Math.PI / 2; this.floor.position.y = -0.62;
    this.boardGroup.add(this.floor, this.frame, this.labels, this.top);

    // belgilar (tanlov, oxirgi yurish, nuqtalar)
    this.markGroup = new THREE.Group(); this.scene.add(this.markGroup);
    this.dotGeo = new THREE.CircleGeometry(0.13, 24);
    this.ringGeo = new THREE.RingGeometry(0.36, 0.47, 40);
    this.squareGeo = new THREE.PlaneGeometry(1, 1);
    this.selRing = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.5, 48), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.selRing.rotation.x = -Math.PI / 2; this.selRing.visible = false; this.scene.add(this.selRing);
    this.checkRing = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.6, 48), new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.checkRing.rotation.x = -Math.PI / 2; this.checkRing.visible = false; this.scene.add(this.checkRing);
    this.hintGroup = new THREE.Group(); this.scene.add(this.hintGroup);

    this.sparks = new Emitter(1500, true);
    this.dust = new Emitter(400, false);
    this.confetti = new Emitter(500, false, true);
    this.ambient = new Emitter(120, true);
    this.scene.add(this.sparks.points, this.dust.points, this.confetti.points, this.ambient.points);

    this.controls = null; // pointer handlerlardan keyin yaratiladi (tartib muhim)
    this._setupInput();
    this.controls = new OrbitControls(this.camera, r.domElement);
    Object.assign(this.controls, { enablePan: false, enableDamping: true, dampingFactor: 0.08, minDistance: 8, maxDistance: 18, minPolarAngle: 0.15, maxPolarAngle: 1.2, rotateSpeed: 0.6 });
    this.controls.target.set(0, 0, 0.2);

    this.lineGroup = new THREE.Group(); this.scene.add(this.lineGroup);
    this.applyTheme('klassik');
    this.setQuality('high');
    this._resize();
    new ResizeObserver(() => this._resize()).observe(container);
    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this._frame());
  }

  // ───── sozlamalar ─────
  setQuality(q) {
    this.quality = q;
    const dpr = Math.min(window.devicePixelRatio || 1, q === 'high' ? 2 : q === 'mid' ? 1.5 : 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.shadowMap.enabled = q !== 'low';
    this.sun.shadow.mapSize.set(q === 'high' ? 2048 : 1024, q === 'high' ? 2048 : 1024);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    this.applyTheme(this.themeKey);
    this._resize();
  }

  _mat(spec) {
    const p = { ...spec };
    const mapKey = p.map; delete p.map;
    if (this.quality === 'low' && p.transmission) { p.transparent = true; p.opacity = 0.75; delete p.transmission; delete p.thickness; }
    const m = new THREE.MeshPhysicalMaterial(p);
    if (mapKey === 'marbleLight') m.map = marbleTexture('#ffffff', '#b8b8c4', 21);
    if (mapKey === 'marbleDark') m.map = marbleTexture('#2b2b31', '#9b8457', 33);
    m.envMapIntensity = 1.0;
    return m;
  }

  applyTheme(key) {
    const th = THEMES[key] || THEMES.klassik;
    this.themeKey = key; this.theme = th;
    this.scene.background = new THREE.Color(th.bg);
    this.scene.fog = new THREE.Fog(th.fog, 18, 40);
    this.floor.material.map = radialTexture(hex(new THREE.Color(th.bg).offsetHSL(0, 0, 0.08).getHex()), hex(th.bg));
    this.floor.material.needsUpdate = true;
    Object.assign(this.frame.material, { color: new THREE.Color(th.frame), metalness: th.frameMetal, roughness: th.frameMetal > 0.5 ? 0.25 : 0.5, clearcoat: 0.6 });
    const size = this.quality === 'low' ? 1024 : 2048;
    const bt = boardTexture(th.board, size);
    const tm = this.top.material;
    if (tm.map) tm.map.dispose();
    tm.map = bt.map;
    tm.emissiveMap = bt.emissive; tm.emissive = new THREE.Color(bt.emissive ? 0xffffff : 0x000000); tm.emissiveIntensity = bt.emissive ? 0.7 : 0;
    tm.roughness = th.board === 'wood' ? 0.45 : th.board === 'neon' ? 0.5 : 0.12;
    tm.clearcoat = th.board === 'wood' ? 0.5 : 1.0; tm.clearcoatRoughness = 0.1;
    tm.needsUpdate = true;
    this.labels.material.map = labelTexture(th.label || '#f3dfbf', this.orientation === 'b');
    this.labels.material.needsUpdate = true;
    this.scene.environmentIntensity = th.board === 'neon' ? 0.3 : (th.env ?? 0.6);
    this.hemi.intensity = th.board === 'neon' ? 0.12 : 0.28;
    this.sun.intensity = th.board === 'neon' ? 0.55 : 1.25;
    this.mats = { w: this._mat(th.light), b: this._mat(th.dark) };
    if (this.outlineMat) this.outlineMat.dispose();
    this.outlineMat = outlineMaterial(th.outline ?? 0x050505, th.outlineWidth ?? 0.016);
    for (const m of this.pieces.values()) {
      m.material = this.mats[m.userData.color];
      const ol = m.getObjectByName('outline'); if (ol) ol.material = this.outlineMat;
    }
    this.selRing.material.color = new THREE.Color(th.accent);
    this._setupBloom();
    this._seedAmbient();
  }

  setEffect(key) { this.effect = key; }

  _setupBloom() {
    const want = this.theme.bloom && this.quality !== 'low';
    if (!want) { this.composer = null; return; }
    const size = this.renderer.getSize(new THREE.Vector2());
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.55, 0.4, 0.55);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(size.x, size.y);
  }

  _seedAmbient() {
    this.ambient.n = 0;
    const col = new THREE.Color(this.theme.accent);
    const count = this.quality === 'low' ? 0 : 70;
    for (let i = 0; i < count; i++) {
      this.ambient.spawn({ p: { x: (Math.random() - 0.5) * 14, y: Math.random() * 5, z: (Math.random() - 0.5) * 14 },
        v: { x: (Math.random() - 0.5) * 0.1, y: 0.05 + Math.random() * 0.1, z: (Math.random() - 0.5) * 0.1 },
        color: col, size: 0.04 + Math.random() * 0.05, life: 1e9 });
    }
  }

  _resize() {
    const w = this.container.clientWidth || window.innerWidth, h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%'; this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    // tor ekranda (telefon) doska sigʻishi uchun FOV ni kattalashtiramiz
    this.camera.fov = w / h < 0.75 ? 46 : 38;
    this.camera.setViewOffset(w, h, 0, (this.insets.bottom - this.insets.top) / 2, w, h);
    this.camera.updateProjectionMatrix();
    if (this.controls && !this.camAnim) this._refit();
    const scale = (h * this.renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2));
    for (const e of [this.sparks, this.dust, this.confetti, this.ambient]) e.mat.uniforms.scale.value = scale;
    if (this.composer) { this.composer.setPixelRatio(this.renderer.getPixelRatio()); this.composer.setSize(w, h); }
  }

  // ───── kamera ─────
  setInsets(top, bottom) { this.insets = { top, bottom }; this._resize(); }

  _basePhi() { const a = this.camera.aspect; return this.view2D ? 0.001 : a < 0.8 ? 0.7 : 0.82; }

  /** Doska (va donalar) ekranga, UI panellari orasiga sigʻadigan eng yaqin masofa. */
  _fitRadius(phi, theta) {
    const cam = this.camera.clone();
    const w = this.renderer.domElement.clientWidth || window.innerWidth, h = this.renderer.domElement.clientHeight || window.innerHeight;
    const pts = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { pts.push(new THREE.Vector3(4.8 * sx, 0, 4.8 * sz)); pts.push(new THREE.Vector3(4.2 * sx, 1.35, 4.2 * sz)); }
    const t = this.controls.target, m = 8;
    for (let r = 7; r < 45; r += 0.25) {
      cam.position.setFromSpherical(new THREE.Spherical(r, phi, theta)).add(t);
      cam.lookAt(t); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      let ok = true;
      for (const p of pts) {
        const v = p.clone().project(cam);
        const x = ((v.x + 1) / 2) * w, y = ((1 - v.y) / 2) * h; // view offset proyeksiyaga kirgan
        if (x < m || x > w - m || y < this.insets.top + m || y > h - this.insets.bottom - m) { ok = false; break; }
      }
      if (ok) return r;
    }
    return 20;
  }

  _refit() {
    const s = this._spherical();
    s.phi = this._basePhi();
    s.radius = this._fitRadius(s.phi, s.theta);
    this.controls.minDistance = s.radius * 0.75; this.controls.maxDistance = s.radius * 1.5;
    this._applySpherical(s);
  }
  _spherical() { return new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target)); }
  _applySpherical(s) { this.camera.position.copy(new THREE.Vector3().setFromSpherical(s).add(this.controls.target)); this.camera.lookAt(this.controls.target); }

  setOrientation(color, animate = true) {
    this.orbitId = (this.orbitId || 0) + 1; // davom etayotgan aylanishni toʻxtatadi
    this.orientation = color;
    this.labels.material.map = labelTexture(this.theme.label || '#f3dfbf', color === 'b');
    this.labels.material.needsUpdate = true;
    const target = color === 'w' ? 0 : Math.PI;
    const s = this._spherical();
    let d = target - s.theta; d = Math.atan2(Math.sin(d), Math.cos(d));
    const t0 = s.theta, phi0 = s.phi, r0 = s.radius;
    const phi1 = this._basePhi(), r1 = this._fitRadius(phi1, target);
    this.controls.minDistance = r1 * 0.75; this.controls.maxDistance = r1 * 1.5;
    if (!animate) { s.theta = target; s.phi = phi1; s.radius = r1; this._applySpherical(s); return Promise.resolve(); }
    this.camAnim = true;
    return tween(900, (k) => { s.theta = t0 + d * k; s.phi = phi0 + (phi1 - phi0) * k; s.radius = r0 + (r1 - r0) * k; this._applySpherical(s); })
      .then(() => { this.camAnim = false; });
  }

  set2D(on) {
    this.view2D = on;
    this.controls.minPolarAngle = on ? 0.0005 : 0.15;
    this.controls.maxPolarAngle = on ? 0.001 : 1.2;
    this.controls.enableRotate = !on;
    return this.setOrientation(this.orientation, true);
  }

  async orbitShow(dur = 5000, amount = Math.PI * 0.5) {
    const s = this._spherical(), t0 = s.theta, id = ++this.orbitId;
    await tween(dur, (k) => { if (id !== this.orbitId) return; s.theta = t0 + amount * Math.sin(k * Math.PI); this._applySpherical(s); }, ease.linear);
  }

  setIdle(on) { this.controls.autoRotate = on; this.controls.autoRotateSpeed = 0.6; }

  // ───── donalar ─────
  _makePiece(type, color, sq) {
    const m = new THREE.Mesh(this.geos[type], this.mats[color]);
    m.castShadow = true; m.receiveShadow = true;
    const { x, z } = sqToXZ(sq);
    m.position.set(x, 0.006, z);
    if (color === 'b') m.rotation.y = Math.PI;
    m.userData = { type, color, square: sq };
    const ol = new THREE.Mesh(this.geos.outline[type], this.outlineMat);
    ol.name = 'outline'; ol.raycast = () => {};
    m.add(ol);
    this.piecesGroup.add(m);
    return m;
  }

  _removePiece(m) {
    this.piecesGroup.remove(m);
  }

  /** board — chess.js board() natijasi (8x8, [0] = 8-qator). */
  setBoard(board, intro = false) {
    for (const m of this.pieces.values()) this._removePiece(m);
    this.confetti.n = 0; this.sparks.n = 0; this.dust.n = 0;
    for (const f of this.fragments) if (f.parent) f.parent.remove(f);
    this.fragments = []; this._clearMarks('draw'); this.setCheck(null);
    this.pieces.clear();
    const jobs = [];
    board.forEach((row, ri) => row.forEach((p, fi) => {
      if (!p) return;
      const sq = String.fromCharCode(97 + fi) + (8 - ri);
      const m = this._makePiece(p.type, p.color, sq);
      this.pieces.set(sq, m);
      if (intro) {
        const y0 = 5 + Math.random() * 2, delay = (p.color === 'w' ? 0 : 140) + (fi + (p.color === 'w' ? 7 - ri : ri)) * 35;
        m.position.y = y0; m.visible = false;
        jobs.push(tween(750, (k) => { m.visible = true; m.position.y = 0.006 + (y0 - 0.006) * (1 - k); }, ease.outBounce, delay)
          .then(() => this._dustPuff(m.position, 5)));
      }
    }));
    return Promise.all(jobs);
  }

  /** Doskani yangi holatga animatsiya bilan moslaydi (orqaga, yuklash). */
  async syncBoard(board) {
    const target = new Map();
    board.forEach((row, ri) => row.forEach((p, fi) => { if (p) target.set(String.fromCharCode(97 + fi) + (8 - ri), p); }));
    const keep = new Map(), free = [];
    for (const [sq, m] of this.pieces) {
      const t = target.get(sq);
      if (t && t.type === m.userData.type && t.color === m.userData.color) keep.set(sq, m); else free.push(m);
    }
    const jobs = [];
    for (const [sq, p] of target) {
      if (keep.has(sq)) continue;
      const { x, z } = sqToXZ(sq);
      let best = -1, bd = 1e9;
      free.forEach((m, i) => {
        if (m.userData.type !== p.type || m.userData.color !== p.color) return;
        const d = (m.position.x - x) ** 2 + (m.position.z - z) ** 2;
        if (d < bd) { bd = d; best = i; }
      });
      if (best >= 0) {
        const m = free.splice(best, 1)[0];
        m.userData.square = sq; keep.set(sq, m);
        jobs.push(this._arc(m, m.position.clone(), new THREE.Vector3(x, 0.006, z), 0.4, 380));
      } else {
        const m = this._makePiece(p.type, p.color, sq);
        m.scale.setScalar(0.01); keep.set(sq, m);
        jobs.push(tween(380, (k) => m.scale.setScalar(Math.max(0.01, k)), ease.outBack));
      }
    }
    for (const m of free) jobs.push(tween(250, (k) => m.scale.setScalar(Math.max(0.001, 1 - k))).then(() => this._removePiece(m)));
    this.pieces = keep;
    await Promise.all(jobs);
  }

  _arc(m, from, to, h, dur, lean = true) {
    const dir = new THREE.Vector3().subVectors(to, from); dir.y = 0;
    const axis = new THREE.Vector3(dir.z, 0, -dir.x).normalize();
    const baseRotY = m.rotation.y;
    const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, baseRotY, 0));
    return tween(dur, (k) => {
      m.position.lerpVectors(from, to, k);
      m.position.y = from.y + (to.y - from.y) * k + h * Math.sin(Math.PI * k);
      if (lean && axis.lengthSq() > 0) {
        const q = new THREE.Quaternion().setFromAxisAngle(axis, Math.sin(Math.PI * k) * 0.28 * (k < 0.5 ? 1 : 0.6));
        m.quaternion.copy(q).multiply(q0);
      }
      if (this.effect === 'yulduz' && Math.random() < 0.7) {
        this.sparks.spawn({ p: m.position.clone().add(new THREE.Vector3(0, 0.3, 0)), v: { x: (Math.random() - 0.5) * 0.4, y: 0.3, z: (Math.random() - 0.5) * 0.4 },
          color: Math.random() < 0.5 ? 0xfff1a8 : this.theme.accent, size: 0.09, life: 0.7 });
      }
    }, ease.inOutCubic).then(() => { m.quaternion.setFromEuler(new THREE.Euler(0, baseRotY, 0)); });
  }

  _squash(m) {
    return tween(180, (k) => { const s = Math.sin(Math.PI * k); m.scale.set(1 + 0.09 * s, 1 - 0.16 * s, 1 + 0.09 * s); }, ease.linear)
      .then(() => m.scale.set(1, 1, 1));
  }

  _dustPuff(pos, n = 10) {
    if (this.quality === 'low') n = Math.ceil(n / 3);
    const col = this.theme.board === 'neon' ? this.theme.accent : 0xbfb4a6;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 0.6 + Math.random() * 0.8;
      (this.theme.board === 'neon' ? this.sparks : this.dust).spawn({ p: { x: pos.x + Math.cos(a) * 0.3, y: 0.05, z: pos.z + Math.sin(a) * 0.3 },
        v: { x: Math.cos(a) * sp, y: 0.25 + Math.random() * 0.3, z: Math.sin(a) * sp }, color: col, size: 0.12 + Math.random() * 0.08, life: 0.5 + Math.random() * 0.3, drag: 3, grow: 1.5 });
    }
  }

  /** move — chess.js verbose move. opts.dropped: dona qoʻl bilan tashlangan. */
  async animateMove(mv, opts = {}) {
    const mesh = this.pieces.get(mv.from);
    if (!mesh) { return; }
    let capSq = null;
    if (mv.flags.includes('e')) capSq = mv.to[0] + mv.from[1];
    else if (mv.captured) capSq = mv.to;
    const victim = capSq ? this.pieces.get(capSq) : null;
    if (capSq) this.pieces.delete(capSq);
    this.pieces.delete(mv.from);
    this.pieces.set(mv.to, mesh);
    mesh.userData.square = mv.to;

    const { x, z } = sqToXZ(mv.to);
    const to = new THREE.Vector3(x, 0.006, z);
    const from = mesh.position.clone();
    mesh.userData.from = from.clone();
    const dist = from.distanceTo(to);
    const isKnight = mv.piece === 'n';
    const h = opts.dropped ? 0.15 : isKnight ? 1.0 : victim ? 0.55 : 0.32;
    const dur = opts.dropped ? 160 : isKnight ? 460 : Math.min(560, 300 + dist * 30);
    const jobs = [];
    if (victim && !opts.dropped && !isKnight) {
      // hujum: oldin biroz orqaga tortilib, keyin zarba
      const back = from.clone().add(new THREE.Vector3().subVectors(from, to).setLength(0.18));
      await tween(110, (k) => mesh.position.lerpVectors(from, back, k).setY(from.y + 0.15 * k), ease.outCubic);
      jobs.push(this._arc(mesh, mesh.position.clone(), to, 0.3, Math.max(220, dur - 120)).then(() => this._impact(mesh, victim, to)));
    } else {
      jobs.push(this._arc(mesh, from, to, h, dur).then(() => (victim ? this._impact(mesh, victim, to) : (this._squash(mesh), this._dustPuff(to, 8)))));
    }
    if (mv.flags.includes('k') || mv.flags.includes('q')) {
      const rank = mv.color === 'w' ? '1' : '8';
      const rf = (mv.flags.includes('k') ? 'h' : 'a') + rank, rt = (mv.flags.includes('k') ? 'f' : 'd') + rank;
      const rook = this.pieces.get(rf);
      if (rook) {
        this.pieces.delete(rf); this.pieces.set(rt, rook); rook.userData.square = rt;
        const p = sqToXZ(rt);
        jobs.push(wait(120).then(() => this._arc(rook, rook.position.clone(), new THREE.Vector3(p.x, 0.006, p.z), 0.7, 420)).then(() => this._dustPuff(rook.position, 6)));
      }
    }
    await Promise.all(jobs);
    if (mv.promotion) await this._promote(mesh, mv.promotion);
  }

  _impact(attacker, victim, pos) {
    this._squash(attacker);
    this.shake = 0.12;
    const fx = this.effect;
    if (fx === 'olov') return this._burn(victim);
    if (fx === 'chaqmoq') return this._lightning(victim);
    // har bir dona oʻziga xos uslubda oladi; ketma-ket bir xil boʻlmasligi uchun tasodifiy almashadi
    const STYLES = { p: ['kick', 'shatter'], n: ['stomp', 'kick'], b: ['slice', 'vortex'], r: ['crush', 'shatter'], q: ['vortex', 'blast'], k: ['push', 'slice'] };
    const opts = STYLES[attacker.userData.type] || ['shatter'];
    let style = opts[Math.floor(Math.random() * opts.length)];
    if (style === this.lastStyle && opts.length > 1) style = opts.find((s) => s !== style);
    this.lastStyle = style;
    const dir = new THREE.Vector3().subVectors(victim.position, attacker.userData.from || victim.position).setY(0);
    if (dir.lengthSq() < 1e-4) dir.set(0, 0, attacker.userData.color === 'w' ? -1 : 1);
    dir.normalize();
    const col = fx === 'yulduz' ? 0xffe27a : this.theme.accent;
    switch (style) {
      case 'kick': return this._kick(victim, dir, 1);
      case 'push': return this._kick(victim, dir, 0.35);
      case 'stomp': return this._stomp(victim, col);
      case 'slice': return this._slice(victim, dir, col);
      case 'vortex': return this._vortex(victim, col);
      case 'crush': this.shake = 0.25; return this._shatter(victim, col, 1.6);
      case 'blast': return this._blast(victim, col);
      default: return this._shatter(victim, col);
    }
  }

  /** Urib uchirib yuborish: dona aylanib doskadan tashqariga uchadi. */
  _kick(victim, dir, power) {
    victim.castShadow = true;
    victim.userData.kicked = true;
    const sp = 3.2 + 2.2 * power;
    victim.userData.v = new THREE.Vector3(dir.x * sp, 2.2 + 3.2 * power, dir.z * sp);
    victim.userData.w = new THREE.Vector3((Math.random() - 0.5) * 14 * power + dir.z * 8, (Math.random() - 0.5) * 6, -dir.x * 8 * power);
    victim.userData.life = 2.2;
    this.fragments.push(victim);
    this._dustPuff(victim.position, 8);
    this._flash(victim.position, 0xffffff, 2);
  }

  /** Ot bosib yassilaydi: dona yassilanib, chang boʻlib yoʻqoladi. */
  async _stomp(victim, col) {
    const p = victim.position;
    this.shake = 0.2;
    await tween(160, (k) => victim.scale.set(1 + 0.5 * k, Math.max(0.06, 1 - 0.94 * k), 1 + 0.5 * k), ease.outCubic);
    this._dustPuff(p, 18);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      this.sparks.spawn({ p: { x: p.x, y: 0.05, z: p.z }, v: { x: Math.cos(a) * 2.4, y: 0.2, z: Math.sin(a) * 2.4 }, color: col, size: 0.07, life: 0.5, drag: 2.5 });
    }
    await tween(380, (k) => victim.scale.set(1.5 * (1 - k) + 0.01, 0.06, 1.5 * (1 - k) + 0.01), ease.inOutCubic);
    this._removePiece(victim);
  }

  /** Fil kesib oʻtadi: yorqin kesik chizigʻi, dona qiyshayib doskaga botadi. */
  async _slice(victim, dir, col) {
    const p = victim.position.clone();
    const slash = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.05), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    slash.position.set(p.x, 0.65, p.z);
    slash.lookAt(this.camera.position); slash.rotateZ(Math.PI / 4);
    this.scene.add(slash);
    this._flash(p, col, 3);
    for (let i = 0; i < 20; i++) {
      const t = (Math.random() - 0.5) * 1.2;
      this.sparks.spawn({ p: { x: p.x + t * 0.5, y: 0.65 + t * 0.5, z: p.z }, v: { x: (Math.random() - 0.5) * 1.5, y: Math.random() * 1.5, z: (Math.random() - 0.5) * 1.5 }, color: col, size: 0.06, life: 0.5, grav: -4 });
    }
    const axis = new THREE.Vector3(dir.z, 0, -dir.x);
    const q0 = victim.quaternion.clone();
    tween(260, (k) => { slash.material.opacity = 1 - k; slash.scale.set(1 + k, 1, 1); }, ease.outCubic).then(() => { this.scene.remove(slash); slash.geometry.dispose(); });
    await tween(620, (k) => {
      victim.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(axis, 0.6 * k)).multiply(q0);
      victim.position.y = p.y - 1.5 * k * k;
    }, ease.inOutCubic);
    this._removePiece(victim);
  }

  /** Farzin/fil girdobi: dona aylanib koʻtariladi va uchqunlarga aylanadi. */
  async _vortex(victim, col) {
    const p = victim.position, y0 = p.y, ry = victim.rotation.y;
    await tween(720, (k) => {
      victim.rotation.y = ry + k * k * Math.PI * 10;
      p.y = y0 + 1.4 * k * k;
      victim.scale.setScalar(Math.max(0.01, 1 - k * k));
      const a = k * Math.PI * 12;
      for (let i = 0; i < 2; i++) {
        this.sparks.spawn({ p: { x: p.x + Math.cos(a + i * Math.PI) * 0.45 * (1 - k), y: p.y + 0.3, z: p.z + Math.sin(a + i * Math.PI) * 0.45 * (1 - k) },
          v: { x: 0, y: 0.6, z: 0 }, color: i ? col : 0xffffff, size: 0.08, life: 0.6 });
      }
    }, ease.linear);
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      this.sparks.spawn({ p: { x: p.x, y: p.y + 0.3, z: p.z }, v: { x: Math.cos(a) * 2, y: (Math.random() - 0.5) * 2, z: Math.sin(a) * 2 }, color: col, size: 0.08, life: 0.7, drag: 1.5 });
    }
    this._flash(p, col, 4);
    this._removePiece(victim);
  }

  /** Farzin zarbasi: zarb toʻlqini halqasi va kuchli parchalanish. */
  _blast(victim, col) {
    const p = victim.position.clone();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.32, 48), new THREE.MeshBasicMaterial({ color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, 0.03, p.z); this.scene.add(ring);
    tween(520, (k) => { ring.scale.setScalar(1 + k * 7); ring.material.opacity = 1 - k; }, ease.outCubic).then(() => { this.scene.remove(ring); ring.geometry.dispose(); });
    this.shake = 0.22;
    this._shatter(victim, col, 2);
  }

  _shatter(victim, sparkColor, power = 1) {
    const n = Math.round((this.quality === 'low' ? 8 : 20) * Math.min(1.6, power));
    const bb = victim.geometry.boundingBox, hgt = bb.max.y;
    const geo = new THREE.TetrahedronGeometry(1, 0);
    const mat = victim.material.clone(); mat.transparent = true;
    for (let i = 0; i < n; i++) {
      const f = new THREE.Mesh(geo, mat);
      const a = Math.random() * Math.PI * 2, rr = Math.random() * 0.22;
      f.position.set(victim.position.x + Math.cos(a) * rr, 0.1 + Math.random() * hgt, victim.position.z + Math.sin(a) * rr);
      f.scale.setScalar(0.045 + Math.random() * 0.07);
      f.castShadow = this.quality === 'high';
      f.userData = { v: new THREE.Vector3(Math.cos(a) * (1.2 + Math.random() * 2) * power, (2 + Math.random() * 3) * Math.sqrt(power), Math.sin(a) * (1.2 + Math.random() * 2) * power),
        w: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10), life: 1.4 + Math.random() * 0.4, mat };
      this.scene.add(f); this.fragments.push(f);
    }
    for (let i = 0; i < (this.quality === 'low' ? 10 : 36); i++) {
      const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 2.5;
      this.sparks.spawn({ p: { x: victim.position.x, y: 0.4 + Math.random() * 0.4, z: victim.position.z },
        v: { x: Math.cos(a) * sp, y: 1 + Math.random() * 2.5, z: Math.sin(a) * sp }, color: sparkColor, size: 0.07 + Math.random() * 0.05, life: 0.6 + Math.random() * 0.4, grav: -6, drag: 1.5 });
    }
    this._flash(victim.position, sparkColor, 3);
    this._removePiece(victim);
  }

  async _burn(victim) {
    const mat = victim.material.clone(); victim.material = mat;
    mat.emissive = new THREE.Color(0xff5a00);
    const y0 = victim.position.y, p = victim.position;
    this._flash(p, 0xff7a1a, 4);
    const fire = tween(700, (k) => {
      mat.emissiveIntensity = 2 * k;
      victim.position.y = y0 - 1.1 * k * k; victim.scale.setScalar(1 - 0.3 * k);
      const n = this.quality === 'low' ? 1 : 4;
      for (let i = 0; i < n; i++) {
        this.sparks.spawn({ p: { x: p.x + (Math.random() - 0.5) * 0.5, y: 0.05 + Math.random() * 0.4, z: p.z + (Math.random() - 0.5) * 0.5 },
          v: { x: (Math.random() - 0.5) * 0.4, y: 1.2 + Math.random() * 1.6, z: (Math.random() - 0.5) * 0.4 },
          color: [0xffd24a, 0xff8a1a, 0xff3d00][Math.floor(Math.random() * 3)], size: 0.16 + Math.random() * 0.14, life: 0.5 + Math.random() * 0.5, grow: -0.6 });
      }
    }, ease.linear);
    await fire;
    this._removePiece(victim);
  }

  async _lightning(victim) {
    const p = victim.position.clone();
    const pts = [];
    let x = p.x + (Math.random() - 0.5) * 2, z = p.z + (Math.random() - 0.5) * 2;
    for (let y = 8; y > 0.3; y -= 0.5) { pts.push(new THREE.Vector3(x, y, z)); x += (p.x - x) * 0.25 + (Math.random() - 0.5) * 0.5; z += (p.z - z) * 0.25 + (Math.random() - 0.5) * 0.5; }
    pts.push(new THREE.Vector3(p.x, 0.6, p.z));
    const mat = new THREE.LineBasicMaterial({ color: 0xbfe8ff, transparent: true, blending: THREE.AdditiveBlending });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
    const glow = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.035, 5), new THREE.MeshBasicMaterial({ color: 0x6fc8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.scene.add(line, glow);
    this._flash(p, 0x9fd8ff, 8);
    victim.material = victim.material.clone(); victim.material.emissive = new THREE.Color(0x9fdcff); victim.material.emissiveIntensity = 3;
    await tween(260, (k) => { mat.opacity = glow.material.opacity = Math.random() > 0.3 ? 1 - k : 0.2; }, ease.linear);
    this.scene.remove(line, glow); glow.geometry.dispose();
    this._shatter(victim, 0x7fd0ff);
  }

  _flash(pos, color, intensity) {
    this.fxLight.color.set(color); this.fxLight.position.set(pos.x, 1.2, pos.z);
    tween(350, (k) => { this.fxLight.intensity = intensity * (1 - k); }, ease.outCubic);
  }

  async _promote(mesh, type) {
    const p = mesh.position;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 7, 32, 1, true),
      new THREE.MeshBasicMaterial({ color: this.theme.accent, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
    pillar.position.set(p.x, 3.5, p.z); this.scene.add(pillar);
    const y0 = p.y, ry0 = mesh.rotation.y;
    await tween(450, (k) => { pillar.material.opacity = 0.45 * k; p.y = y0 + 1.3 * k; mesh.rotation.y = ry0 + k * Math.PI * 4; }, ease.inOutCubic);
    mesh.geometry = this.geos[type]; mesh.userData.type = type;
    const ol = mesh.getObjectByName('outline'); if (ol) ol.geometry = this.geos.outline[type];
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 2;
      this.sparks.spawn({ p: { x: p.x, y: p.y + 0.5, z: p.z }, v: { x: Math.cos(a) * sp, y: (Math.random() - 0.3) * 2, z: Math.sin(a) * sp }, color: 0xfff3b0, size: 0.08, life: 0.8, drag: 1.2 });
    }
    this._flash(p, this.theme.accent, 5);
    await tween(220, (k) => mesh.scale.setScalar(1 + 0.25 * Math.sin(Math.PI * k)), ease.linear);
    await tween(380, (k) => { p.y = y0 + 1.3 * (1 - k); pillar.material.opacity = 0.45 * (1 - k); }, ease.outBounce);
    mesh.rotation.y = ry0;
    this.scene.remove(pillar); pillar.geometry.dispose();
  }

  // ───── belgilar ─────
  _overlay(sq, color, opacity, geo = this.squareGeo, y = 0.012, additive = false) {
    const { x, z } = sqToXZ(sq);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z);
    this.markGroup.add(m);
    return m;
  }

  _clearMarks(tag) {
    for (let i = this.markGroup.children.length - 1; i >= 0; i--) {
      const m = this.markGroup.children[i];
      if (!tag || m.userData.tag === tag) { this.markGroup.remove(m); m.material.dispose(); }
    }
  }

  setLastMove(from, to) {
    this._clearMarks('last');
    if (!from) return;
    for (const sq of [from, to]) this._overlay(sq, this.theme.board === 'neon' ? 0x7a5cff : 0xffe066, 0.32).userData.tag = 'last';
  }

  showSelection(sq, targets, showDots = true) {
    this.clearSelection();
    this.selected = sq;
    const m = this.pieces.get(sq);
    if (m) {
      this.lifted = m;
      const y0 = m.position.y;
      tween(140, (k) => { if (this.lifted === m) m.position.y = y0 + (0.22 - y0) * k; }, ease.outCubic);
    }
    const { x, z } = sqToXZ(sq);
    this.selRing.position.set(x, 0.014, z); this.selRing.visible = true;
    if (showDots) {
      const acc = this.theme.accent;
      for (const t of targets) {
        const o = t.capture ? this._overlay(t.to, 0xff3b3b, 0.85, this.ringGeo, 0.016, true) : this._overlay(t.to, acc, 0.8, this.dotGeo, 0.016, true);
        o.userData.tag = 'dot';
        o.scale.setScalar(0.01);
        tween(180, (k) => o.scale.setScalar(Math.max(0.01, k)), ease.outBack);
      }
    }
  }

  clearSelection() {
    this._clearMarks('dot');
    this.selRing.visible = false;
    if (this.lifted && !this.dragging) {
      const m = this.lifted, y0 = m.position.y;
      tween(120, (k) => { m.position.y = y0 + (0.006 - y0) * k; });
    }
    this.lifted = null; this.selected = null;
  }

  setCheck(sq) {
    this.checkSq = sq;
    this.checkRing.visible = !!sq;
    if (sq) { const { x, z } = sqToXZ(sq); this.checkRing.position.set(x, 0.018, z); this.checkLight.position.set(x, 0.8, z); }
    else this.checkLight.intensity = 0;
  }

  showHint(from, to) {
    this.clearHint();
    const a = sqToXZ(from), b = sqToXZ(to);
    const A = new THREE.Vector3(a.x, 0.15, a.z), B = new THREE.Vector3(b.x, 0.15, b.z);
    const mid = A.clone().lerp(B, 0.5); mid.y = 0.9 + A.distanceTo(B) * 0.12;
    const curve = new THREE.QuadraticBezierCurve3(A, mid, B);
    const mat = new THREE.MeshBasicMaterial({ color: 0x4dff9a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.075, 10), mat);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 16), mat);
    const tan = curve.getTangent(1);
    cone.position.copy(B); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
    this.hintGroup.add(tube, cone);
    this.hintGroup.scale.set(1, 0.01, 1);
    tween(300, (k) => this.hintGroup.scale.set(1, Math.max(0.01, k), 1), ease.outBack);
    this._overlay(from, 0x4dff9a, 0.35).userData.tag = 'hint';
    this._overlay(to, 0x4dff9a, 0.35).userData.tag = 'hint';
  }

  clearHint() {
    for (const c of [...this.hintGroup.children]) { this.hintGroup.remove(c); c.geometry.dispose(); }
    this._clearMarks('hint');
  }

  // ───── oʻyin oxiri ─────
  async checkmate(kingSq, winner) {
    const king = this.pieces.get(kingSq);
    this.setCheck(kingSq);
    this._confetti();
    if (king) {
      const dir = winner === 'w' ? -1 : 1;
      const q0 = king.quaternion.clone(), z0 = king.position.z;
      await tween(900, (k) => {
        const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dir * 1.45 * k);
        king.quaternion.copy(qx).multiply(q0);
        king.position.y = 0.006 + 0.25 * Math.sin(Math.PI * Math.min(1, k * 1.2)) + 0.12 * k;
        king.position.z = z0 + dir * 0.35 * k;
      }, ease.outBounce);
      this._dustPuff(king.position, 14);
      this.shake = 0.18;
    }
    this.orbitShow(5000, Math.PI * 0.35);
  }

  drawEffect(kingSqs) {
    for (const sq of kingSqs) {
      const o = this._overlay(sq, 0x6fb6ff, 0.0, this.ringGeo, 0.02, true); o.userData.tag = 'draw';
      tween(2400, (k) => { o.material.opacity = 0.9 * Math.sin(Math.PI * k); o.scale.setScalar(1 + k); }, ease.linear).then(() => this._clearMarks('draw'));
    }
  }

  _confetti() {
    const cols = [0xff4d6d, 0xffd166, 0x06d6a0, 0x4cc9f0, 0xb388ff, 0xffffff];
    const n = this.quality === 'low' ? 80 : 260;
    for (let i = 0; i < n; i++) {
      this.confetti.spawn({ p: { x: (Math.random() - 0.5) * 9, y: 6 + Math.random() * 4, z: (Math.random() - 0.5) * 9 },
        v: { x: (Math.random() - 0.5) * 1.2, y: -1 - Math.random() * 1.5, z: (Math.random() - 0.5) * 1.2 },
        color: cols[i % cols.length], size: 0.09 + Math.random() * 0.07, life: 4 + Math.random() * 2, drag: 0.3 });
    }
  }

  // ───── kiritish (tap va drag) ─────
  _setupInput() {
    const el = this.renderer.domElement;
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const setRay = (e) => { const r = el.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, this.camera); };
    const pick = (e, ignore) => {
      setRay(e);
      const hits = ray.intersectObjects([...this.pieces.values()].filter((m) => m !== ignore), false);
      if (hits.length) return hits[0].object.userData.square;
      const p = new THREE.Vector3();
      return ray.ray.intersectPlane(plane, p) ? xzToSq(p.x, p.z) : null;
    };
    let down = null;
    el.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      const sq = pick(e);
      down = { x: e.clientX, y: e.clientY, sq, drag: null };
      if (sq && this.canDrag(sq)) {
        this.controls && (this.controls.enabled = false);
        down.drag = this.pieces.get(sq);
        this.onTap(sq);
      }
    });
    el.addEventListener('pointermove', (e) => {
      if (!down || !down.drag) return;
      if (!this.dragging && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8) return;
      this.dragging = true;
      setRay(e);
      const p = new THREE.Vector3();
      if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.5), p)) {
        down.drag.position.set(THREE.MathUtils.clamp(p.x, -4.2, 4.2), 0.5, THREE.MathUtils.clamp(p.z, -4.2, 4.2));
      }
    });
    const up = (e) => {
      if (!down) return;
      if (this.controls) this.controls.enabled = true;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8;
      if (down.drag) {
        if (this.dragging) {
          const target = pick(e, down.drag);
          this.dragging = false;
          const started = target && target !== down.sq ? this.onTap(target, true) : false;
          if (!started) {
            const m = down.drag, { x, z } = sqToXZ(m.userData.square), from = m.position.clone();
            this._arc(m, from, new THREE.Vector3(x, this.selected === m.userData.square ? 0.22 : 0.006, z), 0.2, 200, false);
          }
        }
      } else if (!moved && down.sq) {
        this.onTap(down.sq);
      }
      down = null;
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', () => { if (this.controls) this.controls.enabled = true; this.dragging = false; down = null; });
  }

  // ───── kadr ─────
  _frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    const now = performance.now();
    stepTweens(now);
    // boʻlaklar fizikasi
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const f = this.fragments[i], u = f.userData;
      u.life -= dt;
      u.v.y -= 9.8 * dt;
      f.position.addScaledVector(u.v, dt);
      const onBoard = Math.abs(f.position.x) < 4.75 && Math.abs(f.position.z) < 4.75;
      if (f.position.y < 0.03 && (onBoard || !u.kicked)) { f.position.y = 0.03; u.v.y *= -0.35; u.v.x *= 0.7; u.v.z *= 0.7; u.w.multiplyScalar(0.7); }
      f.rotation.x += u.w.x * dt; f.rotation.y += u.w.y * dt; f.rotation.z += u.w.z * dt;
      if (u.life < 0.5) f.scale.multiplyScalar(0.92);
      if (u.life <= 0 || f.position.y < -4) { if (f.parent) f.parent.remove(f); this.fragments.splice(i, 1); }
    }
    this.sparks.update(dt); this.dust.update(dt); this.confetti.update(dt);
    // ambient zarralar aylanib yuradi
    const am = this.ambient;
    for (let i = 0; i < am.n; i++) {
      am.p[i * 3 + 1] += am.v[i * 3 + 1] * dt; am.p[i * 3] += Math.sin(now * 0.0004 + i) * 0.002;
      if (am.p[i * 3 + 1] > 5) am.p[i * 3 + 1] = 0;
      am.a[i] = 0.35 + 0.35 * Math.sin(now * 0.002 + i * 1.7);
    }
    am.geo.setDrawRange(0, am.n); am.attrP.needsUpdate = am.attrA.needsUpdate = true;
    // tanlov va shoh belgisi pulsatsiyasi
    if (this.selRing.visible) { const s = 1 + 0.06 * Math.sin(now * 0.008); this.selRing.scale.setScalar(s); }
    if (this.checkRing.visible) {
      const s = 0.5 + 0.5 * Math.sin(now * 0.012);
      this.checkRing.material.opacity = 0.35 + 0.5 * s; this.checkRing.scale.setScalar(0.9 + 0.25 * s);
      this.checkLight.intensity = 1.5 + 2 * s;
    }
    if (this.controls) this.controls.update();
    let off = null;
    if (this.shake > 0.001) {
      off = new THREE.Vector3((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
      this.camera.position.add(off); this.shake *= 0.85;
    }
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
    if (off) this.camera.position.sub(off);
  }
}
