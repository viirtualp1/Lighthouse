import { Particle, ParticleContainer, Texture } from 'pixi.js';
import { lightAmount } from '@/game/light';
import { coastAt } from '@/game/map';
import { PALETTE } from './theme';
import type { LightParams } from '@/game/light';
import type { Effect, GameState } from '@/game/state';

type Layer = 'under' | 'glow' | 'over';

interface Mote {
  particle: Particle;
  layer: Layer;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  peak: number;
  grow: number;
  baseScale: number;
  /** Ash dies the moment it drifts into light. */
  fleesLight: boolean;
}

export interface ParticleFrame {
  state: GameState;
  light: LightParams;
  night: number;
  seconds: number;
}

const LIMIT = 900;
const CHIMNEYS = new Set(['hut', 'renderer', 'infirmary']);
const SMOKE_EVERY = 0.7;
const WIND = 7;

function softDot () {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return Texture.from(canvas);
}

function container () {
  return new ParticleContainer({ dynamicProperties: { position: true, vertex: true, color: true, rotation: false, uvs: false } });
}

export class Particles {
  readonly under = container();
  readonly glow = container();
  readonly over = container();
  private texture = softDot();
  private motes: Mote[] = [];
  private smokeClock = 0;

  constructor () {
    this.glow.blendMode = 'add';
  }

  update (frame: ParticleFrame, effects: Effect[]) {
    const { seconds } = frame;

    effects.forEach(effect => this.burst(effect));
    this.emitSmoke(frame);
    this.emitMotes(frame);
    this.emitAsh(frame);
    this.emitSparkles(frame);

    const alive: Mote[] = [];

    for (const m of this.motes) {
      m.life += seconds;
      const t = m.life / m.maxLife;
      const fled = m.fleesLight && lightAmount(frame.light, m.particle.x, m.particle.y) > 0.35;

      if (t >= 1 || fled) {
        continue;
      }

      m.particle.x += m.vx * seconds;
      m.particle.y += m.vy * seconds;
      m.particle.alpha = m.peak * Math.min(1, t * 5) * (1 - t);
      const scale = m.baseScale * (1 + m.grow * t);
      m.particle.scaleX = scale;
      m.particle.scaleY = scale;
      alive.push(m);
    }

    this.motes = alive;

    for (const layer of ['under', 'glow', 'over'] as const) {
      this[layer].particleChildren = alive.filter(m => m.layer === layer).map(m => m.particle);
      this[layer].update();
    }
  }

  private spawn (layer: Layer, x: number, y: number, options: Partial<Omit<Mote, 'particle' | 'layer'>> & { tint: number }) {
    if (this.motes.length >= LIMIT) {
      return;
    }

    const baseScale = options.baseScale ?? 0.2;

    this.motes.push({
      particle: new Particle({ texture: this.texture, x, y, anchorX: 0.5, anchorY: 0.5, scaleX: baseScale, scaleY: baseScale, tint: options.tint, alpha: 0 }),
      layer,
      vx: options.vx ?? 0,
      vy: options.vy ?? 0,
      life: 0,
      maxLife: options.maxLife ?? 2,
      peak: options.peak ?? 0.5,
      grow: options.grow ?? 0,
      baseScale,
      fleesLight: options.fleesLight ?? false
    });
  }

  private emitSmoke ({ state, seconds }: ParticleFrame) {
    this.smokeClock += seconds;

    if (this.smokeClock < SMOKE_EVERY) {
      return;
    }

    this.smokeClock = 0;

    for (const b of state.buildings) {
      if (!CHIMNEYS.has(b.type) || Math.random() > 0.6) {
        continue;
      }

      const chimney = b.type === 'renderer' ? { x: -11, y: -32 } : { x: 9, y: -20 };
      this.spawn('under', b.x + chimney.x, b.y + chimney.y, {
        tint: PALETTE.mist,
        vx: WIND + Math.random() * 4,
        vy: -12 - Math.random() * 6,
        maxLife: 4 + Math.random() * 2,
        peak: 0.22,
        baseScale: 0.18,
        grow: 2.2
      });
    }
  }

  private emitMotes ({ light, night }: ParticleFrame) {
    if (night < 0.3 || light.lit <= 0 || Math.random() > 0.6) {
      return;
    }

    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * light.lit;
    this.spawn('glow', light.origin.x + Math.cos(a) * r, light.origin.y + Math.sin(a) * r, {
      tint: PALETTE.warm,
      vx: (Math.random() - 0.5) * 10,
      vy: -4 - Math.random() * 8,
      maxLife: 3 + Math.random() * 3,
      peak: 0.5 * night,
      baseScale: 0.05 + Math.random() * 0.04
    });
  }

  private emitAsh ({ state, light, night }: ParticleFrame) {
    if (night < 0.3) {
      return;
    }

    for (let i = 0; i < 3; i++) {
      const x = Math.random() * state.map.width;
      const y = Math.random() * state.map.height;

      if (lightAmount(light, x, y) > 0.2) {
        continue;
      }

      const dx = light.origin.x - x;
      const dy = light.origin.y - y;
      const d = Math.hypot(dx, dy) || 1;

      this.spawn('over', x, y, {
        tint: 0x1a1d22,
        vx: (dx / d) * 14 + (Math.random() - 0.5) * 8,
        vy: (dy / d) * 14 + (Math.random() - 0.5) * 8,
        maxLife: 5 + Math.random() * 4,
        peak: 0.7 * night,
        baseScale: 0.12 + Math.random() * 0.2,
        grow: 0.6,
        fleesLight: true
      });
    }
  }

  private emitSparkles ({ state }: ParticleFrame) {
    if (Math.random() > 0.35) {
      return;
    }

    const x = Math.random() * state.map.width;
    const y = coastAt(state.map, x) + 6 + Math.random() * 40;
    this.spawn('under', x, y, {
      tint: PALETTE.white,
      maxLife: 0.6 + Math.random() * 0.6,
      peak: 0.5,
      baseScale: 0.04
    });
  }

  private burst (effect: Effect) {
    if (effect.x === undefined || effect.y === undefined) {
      return;
    }

    if (effect.kind === 'build' || effect.kind === 'demolish') {
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * Math.PI * 2;
        const speed = 20 + Math.random() * 40;
        this.spawn('under', effect.x, effect.y + 8, {
          tint: PALETTE.mist,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed * 0.45 - 6,
          maxLife: 0.8 + Math.random() * 0.6,
          peak: 0.35,
          baseScale: 0.15,
          grow: 1.5
        });
      }
    } else if (effect.kind === 'vanish') {
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * Math.PI * 2;
        const speed = 10 + Math.random() * 30;
        this.spawn('over', effect.x, effect.y, {
          tint: 0x000000,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed - 25,
          maxLife: 1.5 + Math.random(),
          peak: 0.9,
          baseScale: 0.25,
          grow: 2
        });
      }
    } else if (effect.kind === 'assign') {
      this.spawn('glow', effect.x, effect.y - 10, { tint: PALETTE.white, maxLife: 0.5, peak: 0.25, baseScale: 0.3, grow: 1.5 });
    }
  }
}
