// Script una tantum per generare i suoni UI (pop/swoosh/etc) come WAV PCM
// sintetico, senza dipendere da asset esterni scaricati. Esegui con:
//   node scripts/generate-sounds.js
// Non fa parte del bundle dell'app: gira solo in fase di sviluppo per
// produrre i file in assets/sounds/.
const fs = require("fs");
const path = require("path");

const SAMPLE_RATE = 44100;
const OUT_DIR = path.join(__dirname, "..", "assets", "sounds");

function writeWav(filename, samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(OUT_DIR, filename), buffer);
  console.log("scritto", filename, `(${(samples.length / SAMPLE_RATE).toFixed(2)}s)`);
}

function seconds(n) {
  return Math.round(n * SAMPLE_RATE);
}

// Inviluppo ADSR molto semplice: attacco rapido, decadimento esponenziale.
function envelope(i, n, attackN, decay) {
  if (i < attackN) return i / attackN;
  return Math.exp(-decay * (i - attackN) / SAMPLE_RATE);
}

function tone(freqStart, freqEnd, durationS, { attack = 0.003, decay = 14, volume = 0.5, wave = "sine" } = {}) {
  const n = seconds(durationS);
  const attackN = Math.max(1, seconds(attack));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const freq = freqStart + (freqEnd - freqStart) * (i / n);
    const phase = 2 * Math.PI * freq * t;
    let sample;
    switch (wave) {
      case "triangle":
        sample = (2 / Math.PI) * Math.asin(Math.sin(phase));
        break;
      case "square":
        sample = Math.sign(Math.sin(phase));
        break;
      default:
        sample = Math.sin(phase);
    }
    out[i] = sample * volume * envelope(i, n, attackN, decay);
  }
  return out;
}

function mix(...layers) {
  const n = Math.max(...layers.map((l) => l.length));
  const out = new Float32Array(n);
  for (const layer of layers) {
    for (let i = 0; i < layer.length; i++) out[i] += layer[i];
  }
  return out;
}

function noiseBurst(durationS, { decay = 18, volume = 0.15 } = {}) {
  const n = seconds(durationS);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = (Math.random() * 2 - 1) * volume * Math.exp((-decay * i) / SAMPLE_RATE);
  }
  return out;
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Completa un todo: pop ascendente, positivo e breve.
writeWav("todo-complete.wav", tone(520, 900, 0.16, { decay: 10, volume: 0.5 }));

// Riapri un todo completato: pop discendente, più neutro.
writeWav("todo-uncomplete.wav", tone(700, 420, 0.14, { decay: 12, volume: 0.4 }));

// Crea todo/lista: doppio "tick" ascendente, leggero.
writeWav(
  "create.wav",
  mix(
    tone(600, 780, 0.09, { decay: 20, volume: 0.42 }),
    (() => {
      const delay = seconds(0.07);
      const t = tone(780, 980, 0.1, { decay: 18, volume: 0.42 });
      const out = new Float32Array(delay + t.length);
      out.set(t, delay);
      return out;
    })()
  )
);

// Elimina todo/lista: swoosh discendente breve + un po' di rumore, come un "via".
writeWav(
  "delete.wav",
  mix(tone(500, 160, 0.18, { decay: 9, volume: 0.35, wave: "triangle" }), noiseBurst(0.08, { volume: 0.1 }))
);
