import type { Effect } from '@/game/state';

interface Ambience {
  wind: GainNode;
  sea: GainNode;
  drone: GainNode;
  whisper: GainNode;
}

const MUTE_KEY = 'lighthouse.muted';
const VOLUME_KEY = 'lighthouse.volume';
const DEFAULT_VOLUME = 0.7;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let ambience: Ambience | null = null;
let muted = readMuted();
let volume = readVolume();

function readMuted () {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function readVolume () {
  try {
    const stored = Number(localStorage.getItem(VOLUME_KEY));

    return localStorage.getItem(VOLUME_KEY) !== null && Number.isFinite(stored) ? Math.min(1, Math.max(0, stored)) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

function save (key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private windows can refuse storage; the setting then lasts only for this visit.
  }
}

function applyVolume () {
  master?.gain.setTargetAtTime(muted ? 0 : volume, now(), 0.1);
}

function noiseBuffer (audio: AudioContext) {
  const buffer = audio.createBuffer(1, audio.sampleRate * 3, audio.sampleRate);
  const data = buffer.getChannelData(0);
  let brown = 0;

  for (let i = 0; i < data.length; i++) {
    brown = (brown + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = brown * 3.5;
  }

  return buffer;
}

function loopNoise (audio: AudioContext, filter: BiquadFilterType, frequency: number, q: number, out: AudioNode) {
  const source = audio.createBufferSource();
  source.buffer = noise;
  source.loop = true;
  source.loopStart = Math.random();
  const f = audio.createBiquadFilter();
  f.type = filter;
  f.frequency.value = frequency;
  f.Q.value = q;
  source.connect(f).connect(out);
  source.start();

  return f;
}

/** A slow sine that swings an AudioParam around its value, for gusts and swells. */
function lfo (audio: AudioContext, rate: number, depth: number, param: AudioParam) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.frequency.value = rate;
  gain.gain.value = depth;
  osc.connect(gain).connect(param);
  osc.start();
}

function buildAmbience (audio: AudioContext, out: AudioNode): Ambience {
  const wind = audio.createGain();
  const sea = audio.createGain();
  const drone = audio.createGain();
  const whisper = audio.createGain();

  wind.gain.value = 0;
  sea.gain.value = 0;
  drone.gain.value = 0;
  whisper.gain.value = 0;
  [wind, sea, drone, whisper].forEach(g => g.connect(out));

  const windFilter = loopNoise(audio, 'bandpass', 500, 0.7, wind);
  lfo(audio, 0.07, 260, windFilter.frequency);

  const swell = audio.createGain();
  swell.gain.value = 0.6;
  swell.connect(sea);
  loopNoise(audio, 'lowpass', 420, 0.3, swell);
  lfo(audio, 0.11, 0.4, swell.gain);

  const droneFilter = audio.createBiquadFilter();
  droneFilter.type = 'lowpass';
  droneFilter.frequency.value = 260;
  droneFilter.connect(drone);

  for (const frequency of [55, 55.4, 82.4, 110.7]) {
    const osc = audio.createOscillator();
    osc.type = frequency > 100 ? 'triangle' : 'sine';
    osc.frequency.value = frequency;
    const g = audio.createGain();
    g.gain.value = frequency > 100 ? 0.15 : 0.5;
    osc.connect(g).connect(droneFilter);
    osc.start();
  }

  const hiss = audio.createGain();
  hiss.connect(whisper);
  loopNoise(audio, 'bandpass', 2600, 4, hiss);
  lfo(audio, 3.3, 0.8, hiss.gain);

  return { wind, sea, drone, whisper };
}

function now () {
  return ctx?.currentTime ?? 0;
}

function envelope (gain: GainNode, peak: number, attack: number, release: number, at = now()) {
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + release);
}

function tone (frequency: number, peak: number, attack: number, release: number, type: OscillatorType = 'sine', at = now(), glideTo?: number) {
  if (!ctx || !master) {
    return;
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, at);

  if (glideTo) {
    osc.frequency.exponentialRampToValueAtTime(glideTo, at + attack + release);
  }

  envelope(gain, peak, attack, release, at);
  osc.connect(gain).connect(master);
  osc.start(at);
  osc.stop(at + attack + release + 0.05);
}

function burst (filter: BiquadFilterType, from: number, to: number, peak: number, attack: number, release: number) {
  if (!ctx || !master || !noise) {
    return;
  }

  const at = now();
  const source = ctx.createBufferSource();
  source.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(from, at);
  f.frequency.exponentialRampToValueAtTime(to, at + attack + release);
  const gain = ctx.createGain();
  envelope(gain, peak, attack, release, at);
  source.connect(f).connect(gain).connect(master);
  source.start(at, Math.random());
  source.stop(at + attack + release + 0.05);
}

function bell (base: number, peak: number) {
  [1, 2.4, 3.9, 5.4].forEach((ratio, i) => tone(base * ratio, peak / (i + 1), 0.005, 3.2 - i * 0.5));
}

const ONE_SHOTS: Record<Effect['kind'], () => void> = {
  build: () => {
    burst('lowpass', 900, 200, 0.5, 0.01, 0.35);
    tone(130, 0.35, 0.005, 0.3, 'sine', now(), 55);
  },
  demolish: () => {
    burst('lowpass', 1400, 150, 0.45, 0.01, 0.6);
  },
  assign: () => {
    tone(660, 0.06, 0.003, 0.06, 'triangle');
  },
  vanish: () => {
    burst('bandpass', 3000, 200, 0.35, 0.4, 1.2);
    tone(73, 0.25, 0.5, 1.6, 'sine', now(), 49);
    tone(77.8, 0.15, 0.5, 1.6, 'sine', now(), 51);
  },
  dusk: () => {
    bell(196, 0.25);
  },
  night: () => {
    tone(98, 0.3, 0.02, 4, 'sine');
    tone(103.8, 0.18, 0.02, 4, 'sine');
  },
  dawn: () => {
    [261.6, 329.6, 392, 523.3].forEach((f, i) => tone(f, 0.1, 0.02, 2.2, 'sine', now() + i * 0.14));
  },
  discover: () => {
    [659.3, 987.8, 1318.5].forEach((f, i) => tone(f, 0.07, 0.01, 1.4, 'sine', now() + i * 0.09));
  },
  restore: () => {
    bell(146.8, 0.3);
    [293.7, 370, 440, 587.3].forEach((f, i) => tone(f, 0.09, 0.03, 2.6, 'triangle', now() + 0.2 + i * 0.12));
  },
  collect: () => {
    tone(523.3, 0.08, 0.005, 0.25, 'triangle');
    tone(784, 0.06, 0.005, 0.35, 'triangle', now() + 0.08);
  },
  oilOut: () => {
    tone(220, 0.25, 0.01, 0.5, 'triangle', now(), 110);
    tone(147, 0.25, 0.01, 0.9, 'triangle', now() + 0.35, 73);
  }
};

/** Starts audio on the first user gesture; Chromium refuses to play sound before one. */
export function unlockSound () {
  if (ctx) {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    return;
  }

  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : volume;
  master.connect(ctx.destination);
  noise = noiseBuffer(ctx);
  ambience = buildAmbience(ctx, master);
}

export function isMuted () {
  return muted;
}

export function setMuted (value: boolean) {
  muted = value;
  save(MUTE_KEY, muted ? '1' : '0');
  applyVolume();
}

export function getVolume () {
  return volume;
}

/** 0 to 1. Moving the slider also unmutes, since that is what someone dragging it wants. */
export function setVolume (value: number) {
  volume = Math.min(1, Math.max(0, value));
  save(VOLUME_KEY, String(volume));

  if (muted && volume > 0) {
    setMuted(false);
  } else {
    applyVolume();
  }
}

export function playEffects (effects: Effect[]) {
  if (!ctx) {
    return;
  }

  const seen = new Set<Effect['kind']>();

  for (const effect of effects) {
    if (!seen.has(effect.kind)) {
      seen.add(effect.kind);
      ONE_SHOTS[effect.kind]();
    }
  }
}

export function playClick () {
  tone(1200, 0.05, 0.002, 0.04, 'triangle');
}

/** Moves the ambience between day and night; `dread` is how close the Shadow stands to the people, 0 to 1. */
export function updateAmbience (night: number, dread: number) {
  if (!ambience) {
    return;
  }

  const t = now();
  ambience.wind.gain.setTargetAtTime(0.08 + night * 0.1, t, 0.8);
  ambience.sea.gain.setTargetAtTime(0.14 - night * 0.05, t, 0.8);
  ambience.drone.gain.setTargetAtTime(night * 0.09, t, 1.5);
  ambience.whisper.gain.setTargetAtTime(night * dread * 0.05, t, 1);
}
