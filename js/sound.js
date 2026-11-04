// WebAudio bilan sintez qilingan ovozlar (fayl kerak emas).
let ctx = null, on = true, master = null;
export function setSound(v) { on = v; }

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noiseBurst(t, dur, freq, q, gain) {
  const c = ctx, len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); g.gain.value = gain;
  src.connect(f); f.connect(g); g.connect(master); src.start(t);
}

function tone(t, freq, dur, type = 'sine', gain = 0.25, slideTo = null) {
  const c = ctx, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}

export function play(name) {
  if (!on || !ac()) return;
  const t = ctx.currentTime + 0.005;
  switch (name) {
    case 'move': noiseBurst(t, 0.07, 1800, 1.2, 0.9); tone(t, 220, 0.08, 'triangle', 0.12); break;
    case 'capture': noiseBurst(t, 0.12, 900, 0.8, 1.2); tone(t, 140, 0.18, 'sine', 0.3, 60); break;
    case 'castle': noiseBurst(t, 0.06, 1800, 1.2, 0.8); noiseBurst(t + 0.11, 0.06, 1500, 1.2, 0.8); break;
    case 'check': tone(t, 880, 0.18, 'triangle', 0.18); tone(t + 0.12, 660, 0.25, 'triangle', 0.18); break;
    case 'promote': [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.06, f, 0.22, 'triangle', 0.14)); break;
    case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(t + i * 0.11, f, 0.4, 'triangle', 0.16)); break;
    case 'lose': [392, 330, 262, 196].forEach((f, i) => tone(t + i * 0.16, f, 0.45, 'sine', 0.16)); break;
    case 'draw': tone(t, 440, 0.3, 'sine', 0.14); tone(t + 0.2, 440, 0.3, 'sine', 0.14); break;
    case 'click': tone(t, 1200, 0.04, 'sine', 0.06); break;
    case 'zap': noiseBurst(t, 0.25, 3000, 0.5, 1.0); tone(t, 1500, 0.2, 'sawtooth', 0.06, 200); break;
    case 'fire': noiseBurst(t, 0.4, 500, 0.4, 1.0); break;
    default: break;
  }
}
