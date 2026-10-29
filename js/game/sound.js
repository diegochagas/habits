// sound.js: RPG Maker 2000 style sound effects synthesised with the Web Audio API, so the game
// ships no audio files. Each effect is a list of notes (square/triangle/sawtooth tones or a noise
// burst) with start offsets; `createSoundBoard` schedules them and remembers the mute toggle.

const SOUND_KEY = "habits:sound";

/**
 * @typedef {object} SoundNote
 * @property {number} [f] start frequency (Hz)
 * @property {number} [to] end frequency for a sweep
 * @property {number} d duration (s)
 * @property {number} [at] start offset (s)
 * @property {number} [g] gain 0..1
 * @property {OscillatorType} [w] waveform
 * @property {boolean} [noise] white-noise burst instead of a tone
 */

/** @type {Record<string, SoundNote[]>} */
export const SOUND_EFFECTS = {
  cursor: [{ f: 1200, d: 0.03, g: 0.12 }],
  decision: [
    { f: 880, d: 0.05 },
    { f: 1320, d: 0.08, at: 0.05 },
  ],
  cancel: [
    { f: 660, d: 0.06 },
    { f: 440, d: 0.1, at: 0.06 },
  ],
  encounter: [
    { f: 200, to: 1600, d: 0.25, w: "sawtooth", g: 0.2 },
    { f: 1600, to: 100, d: 0.3, w: "sawtooth", g: 0.2, at: 0.25 },
  ],
  attack: [{ f: 900, to: 300, d: 0.08, w: "sawtooth", g: 0.18 }],
  hit: [
    { noise: true, d: 0.12, g: 0.3 },
    { f: 160, to: 60, d: 0.15, g: 0.25 },
  ],
  crit: [
    { noise: true, d: 0.2, g: 0.4 },
    { f: 220, to: 50, d: 0.25, g: 0.3 },
    { f: 1760, d: 0.05, at: 0.05 },
  ],
  miss: [{ f: 700, to: 250, d: 0.15, w: "triangle", g: 0.18 }],
  skill: [
    { f: 523, d: 0.06 },
    { f: 784, d: 0.06, at: 0.06 },
    { f: 1047, d: 0.12, at: 0.12 },
  ],
  heal: [
    { f: 784, d: 0.08, w: "triangle" },
    { f: 988, d: 0.08, w: "triangle", at: 0.08 },
    { f: 1319, d: 0.2, w: "triangle", at: 0.16 },
  ],
  victory: [
    { f: 523, d: 0.12 },
    { f: 659, d: 0.12, at: 0.12 },
    { f: 784, d: 0.12, at: 0.24 },
    { f: 1047, d: 0.3, at: 0.36 },
    { f: 784, d: 0.1, at: 0.66 },
    { f: 1047, d: 0.45, at: 0.76 },
  ],
  fanfare: [
    { f: 523, d: 0.1 },
    { f: 523, d: 0.1, at: 0.12 },
    { f: 523, d: 0.1, at: 0.24 },
    { f: 659, d: 0.3, at: 0.36 },
    { f: 587, d: 0.1, at: 0.7 },
    { f: 659, d: 0.1, at: 0.82 },
    { f: 784, d: 0.5, at: 0.94 },
  ],
  defeat: [
    { f: 392, d: 0.3, w: "triangle" },
    { f: 349, d: 0.3, w: "triangle", at: 0.3 },
    { f: 311, d: 0.3, w: "triangle", at: 0.6 },
    { f: 262, d: 0.6, w: "triangle", at: 0.9 },
  ],
  flee: [{ f: 400, to: 1200, d: 0.2, g: 0.15 }],
  buy: [
    { f: 1568, d: 0.05 },
    { f: 2093, d: 0.15, at: 0.05 },
  ],
  habitGood: [
    { f: 1047, d: 0.06 },
    { f: 1319, d: 0.06, at: 0.06 },
    { f: 1568, d: 0.15, at: 0.12 },
  ],
  habitBad: [
    { f: 180, d: 0.25, w: "sawtooth", g: 0.18 },
    { f: 120, d: 0.3, w: "sawtooth", g: 0.18, at: 0.1 },
  ],
};

/**
 * @typedef {object} SoundBoard
 * @property {(name: string, delay?: number) => void} play
 * @property {() => boolean} toggle returns the new enabled state
 * @property {() => boolean} enabled
 */

/**
 * @param {() => AudioContext} createContext called lazily on the first play (needs a user gesture)
 * @param {Storage} storage remembers the mute toggle
 * @returns {SoundBoard}
 * @example createSoundBoard(() => new AudioContext(), localStorage).play("decision")
 */
export function createSoundBoard(createContext, storage) {
  /** @type {AudioContext | null} */
  let context = null;
  let enabled = storage.getItem(SOUND_KEY) !== "off";
  const play = (name, delay = 0) => {
    const notes = SOUND_EFFECTS[name];
    if (!enabled || !notes) return;
    context ??= createContext();
    if (context.state === "suspended") context.resume();
    for (const note of notes) scheduleNote(context, note, context.currentTime + delay + (note.at ?? 0));
  };
  const toggle = () => {
    enabled = !enabled;
    storage.setItem(SOUND_KEY, enabled ? "on" : "off");
    return enabled;
  };
  return { play, toggle, enabled: () => enabled };
}

/**
 * @param {AudioContext} context
 * @param {SoundNote} note
 * @param {number} at absolute context time
 */
function scheduleNote(context, note, at) {
  const gain = context.createGain();
  gain.gain.setValueAtTime(note.g ?? 0.2, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + note.d);
  gain.connect(context.destination);
  const source = note.noise ? noiseSource(context, note.d) : toneSource(context, note, at);
  source.connect(gain);
  source.start(at);
  source.stop(at + note.d);
}

/**
 * @param {AudioContext} context
 * @param {SoundNote} note
 * @param {number} at
 * @returns {OscillatorNode}
 */
function toneSource(context, note, at) {
  const oscillator = context.createOscillator();
  oscillator.type = note.w ?? "square";
  oscillator.frequency.setValueAtTime(note.f ?? 440, at);
  if (note.to) oscillator.frequency.exponentialRampToValueAtTime(note.to, at + note.d);
  return oscillator;
}

/**
 * @param {AudioContext} context
 * @param {number} seconds
 * @returns {AudioBufferSourceNode}
 */
function noiseSource(context, seconds) {
  const length = Math.max(1, Math.round(context.sampleRate * seconds));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) samples[i] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  source.buffer = buffer;
  return source;
}
