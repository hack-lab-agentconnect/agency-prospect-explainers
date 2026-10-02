import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SR = 48000, DUR = 201.6, BPM = 120, BEAT = 60 / BPM;
const N = Math.ceil(DUR * SR) + SR;
mkdirSync(path.join(__dirname, 'out'), { recursive: true });

const L = new Float32Array(N), R = new Float32Array(N);
let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 - 0.5; };
const NOTES = { A2: 110.0, F2: 87.31, C3: 130.81, G2: 98.0, A3: 220.0, C4: 261.63, E4: 329.63, F3: 174.61, G3: 196.0 };
const PROG = ['A2', 'F2', 'C3', 'G2'];

function add(buf, t, dur, fn, gain) {
  const s = Math.floor(t * SR), e = Math.min(N, Math.floor((t + dur) * SR));
  for (let i = s; i < e; i++) buf[i] += fn((i - s) / SR) * gain;
}
function kick(t, g = 0.9) {
  add(L, t, 0.38, x => Math.sin(6.283 * (120 - 80 * x) * x) * Math.exp(-x * 11), g);
  add(R, t, 0.38, x => Math.sin(6.283 * (120 - 80 * x) * x) * Math.exp(-x * 11), g);
}
function hat(t, g = 0.16) {
  add(L, t, 0.05, x => rnd() * Math.exp(-x * 90), g);
  add(R, t, 0.05, x => rnd() * Math.exp(-x * 90), g);
}
function snare(t, g = 0.22) {
  add(L, t, 0.18, x => (rnd() * 0.7 + Math.sin(6.283 * 190 * x) * 0.3) * Math.exp(-x * 26), g);
  add(R, t, 0.18, x => (rnd() * 0.7 + Math.sin(6.283 * 175 * x) * 0.3) * Math.exp(-x * 26), g);
}
function tone(t, dur, f, g, type = 'sine', pan = 0) {
  const fn = x => {
    const v = type === 'saw' ? 2 * (f * x - Math.floor(f * x + 0.5))
      : type === 'tri' ? 2 * Math.abs(2 * (f * x - Math.floor(f * x + 0.5))) - 1
      : Math.sin(6.283 * f * x);
    const env = Math.min(1, x * 60) * Math.exp(-x * 2.2);
    return v * env;
  };
  add(L, t, dur, fn, g * (1 - pan));
  add(R, t, dur, fn, g * (1 + pan));
}
function whoosh(t, g = 0.3) {
  let last = 0;
  add(L, t, 0.4, x => { const n = rnd(); last = last * 0.6 + n * 0.4; return last * Math.sin(Math.PI * Math.min(1, x / 0.4)); }, g);
  add(R, t, 0.4, x => { const n = rnd(); last = last * 0.6 + n * 0.4; return last * Math.sin(Math.PI * Math.min(1, x / 0.4)); }, g * 0.8);
}
function chime(t, f = 880, g = 0.16) { tone(t, 1.2, f, g, 'sine', 0.2); tone(t, 1.2, f * 2, g * 0.4, 'sine', -0.2); }
function click(t, g = 0.12) { add(L, t, 0.03, x => Math.sin(6.283 * 1500 * x) * Math.exp(-x * 120), g); add(R, t, 0.03, x => Math.sin(6.283 * 1500 * x) * Math.exp(-x * 120), g); }
function riser(t, dur = 2.0, g = 0.18) {
  let last = 0;
  add(L, t, dur, x => { const n = rnd(); last = last * 0.85 + n * 0.15; return last * (x / dur) * (0.5 + 0.5 * Math.sin(6.283 * (200 + 900 * x) * x)); }, g);
  add(R, t, dur, x => { const n = rnd(); return n * (x / dur) * 0.4; }, g * 0.7);
}

// Arrangement: kick every beat, hat on 8ths, snare on 2 & 4, bass+pad per bar, arp 16ths
const bars = Math.ceil(DUR / (BEAT * 4));
for (let bar = 0; bar < bars; bar++) {
  const bt = bar * BEAT * 4;
  const root = PROG[bar % 4];
  const f = NOTES[root];
  // pad chord (root, minor third, fifth) swell per bar
  [f, f * 1.189, f * 1.5].forEach((ff, i) => {
    add(L, bt, BEAT * 4, x => Math.sin(6.283 * ff * x) * Math.min(1, x * 3) * Math.exp(-x * 0.5) * 0.10, 0.28);
    add(R, bt, BEAT * 4, x => Math.sin(6.283 * ff * 1.003 * x) * Math.min(1, x * 3) * Math.exp(-x * 0.5) * 0.10, 0.28);
  });
  for (let b = 0; b < 4; b++) {
    const t = bt + b * BEAT;
    if (t > DUR) break;
    kick(t, 0.85);
    if (b === 1 || b === 3) snare(t, 0.2);
    // bass on 1 and 3
    if (b % 2 === 0) tone(t, 0.45, f, 0.22, 'tri', 0);
    // hats 8ths
    hat(t + BEAT * 0.5, 0.14);
    // arp 16ths (quiet)
    for (let k = 0; k < 4; k++) {
      const at = t + BEAT * 0.25 * k;
      if (at > DUR) break;
      if ((k + b) % 3 === 0) tone(at, 0.22, f * (k % 2 ? 4 : 3), 0.055, 'tri', (k % 2 ? 0.3 : -0.3));
    }
  }
}
// Scene-change hits
[0, 37, 72, 107.8, 143.9].forEach((t, i) => { whoosh(t - 0.35, 0.34); chime(t, i % 2 ? 660 : 880, 0.14); });
// Accent hits on key reveals
[3.0, 11.2, 21.0, 37.4, 41.0, 51.0, 72.2, 90.0, 107.9, 120.0, 130.0, 143.9, 156.0, 165.0, 176.0, 188.0].forEach((t, i) => { if (i % 2 === 0) click(t, 0.1); else chime(t, 990, 0.1); });
// Build risers into scenes 3 and 5
riser(34.5, 2.4, 0.14);
riser(70.0, 2.2, 0.14);
riser(105.5, 2.2, 0.14);
riser(141.5, 2.2, 0.14);
riser(168.0, 2.0, 0.12);

// Stereo soft-clip + normalize
let peak = 0;
for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i]); R[i] = Math.tanh(R[i]); peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
const norm = 0.89 / (peak || 1);
for (let i = 0; i < N; i++) { L[i] *= norm; R[i] *= norm; }

// Fade in/out
const fi = Math.floor(0.15 * SR), fo = Math.floor(1.2 * SR);
for (let i = 0; i < fi; i++) { L[i] *= i / fi; R[i] *= i / fi; }
for (let i = 0; i < fo; i++) { const a = i / fo; L[N - 1 - i] *= a; R[N - 1 - i] *= a; }

// Write 16-bit stereo WAV
const dataLen = N * 2 * 2, buf = Buffer.alloc(44 + dataLen);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + dataLen, 4); buf.write('WAVE', 8);
buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
buf.write('data', 36); buf.writeUInt32LE(dataLen, 40);
let o = 44;
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), o); o += 2; buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), o); o += 2; }
const out = path.join(__dirname, 'out', 'audio.wav');
writeFileSync(out, buf);
console.log('wrote', out, (dataLen / 1e6).toFixed(1), 'MB');
