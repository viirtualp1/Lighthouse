import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { BUILDINGS, UNIT } from '@/game/config';
import { lightParams } from '@/game/light';
import { SLOT_RADIUS, slotNear } from '@/game/map';
import { canPlace, nightness } from '@/game/sim';
import { i18n, tr } from '@/i18n';
import { createDarkness } from './darkness';
import { drawBuilding } from './drawBuilding';
import { Particles } from './particles';
import { GROUND_SCALE, paintGround } from './paintGround';
import { PALETTE } from './theme';
import type { FederatedPointerEvent, FederatedWheelEvent } from 'pixi.js';
import type { BuildingId } from '@/game/config';
import type { Point } from '@/game/map';
import type { Effect, GameState } from '@/game/state';
import type { Window } from './drawBuilding';

export interface ViewState {
  hoverSlot: number | null;
  pointer: Point | null;
  selectedId: number | null;
  placing: BuildingId | null;
  aiming: boolean;
  /** A spot on the map the tutorial points at. */
  highlight: Point | null;
}

export interface RendererEvents {
  frame: (seconds: number) => void;
  hover: (slot: number | null, point: Point | null, screen: Point | null) => void;
  press: (slot: number | null, point: Point) => void;
  cancel: () => void;
}

const DRAG_THRESHOLD = 6;
const MAX_ZOOM = 2.4;

export class GameRenderer {
  private app = new Application();
  private world = new Container();
  private buildings = new Container();
  private windows = new Graphics();
  private flare = new Graphics();
  private pips = new Graphics();
  private reach = new Graphics();
  private reachLabels = new Container();
  private reachLayer = new Container();
  private reachKey = '';
  private particles = new Particles();
  private lastSeconds = 0;
  private signature = '';
  private overlay = new Graphics();
  private darkness = createDarkness(1, 1);
  private revision = -1;
  private time = 0;
  private minZoom = 1;
  private drag: { start: Point; origin: Point; moved: boolean } | null = null;
  private state: GameState;
  private events: RendererEvents;

  constructor (state: GameState, events: RendererEvents) {
    this.state = state;
    this.events = events;
  }

  async mount (host: HTMLElement) {
    const { map } = this.state;

    await this.app.init({
      resizeTo: host,
      background: PALETTE.void,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
      powerPreference: 'high-performance'
    });

    host.appendChild(this.app.canvas);
    this.app.canvas.addEventListener('contextmenu', e => e.preventDefault());

    const ground = new Sprite(Texture.from(paintGround(map)));
    ground.scale.set(1 / GROUND_SCALE);
    this.darkness = createDarkness(map.width, map.height);
    this.reachLayer.addChild(this.reach);
    this.windows.blendMode = 'add';
    this.flare.blendMode = 'add';

    this.world.addChild(
      ground,
      this.reachLayer,
      this.buildings,
      this.reachLabels,
      this.particles.under,
      this.windows,
      this.darkness.mesh,
      this.particles.over,
      this.particles.glow,
      this.flare,
      this.pips,
      this.overlay
    );
    this.app.stage.addChild(this.world);
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointerdown', this.onDown, this);
    this.app.stage.on('pointermove', this.onMove, this);
    this.app.stage.on('pointerup', this.onUp, this);
    this.app.stage.on('pointerupoutside', this.onUp, this);
    this.app.stage.on('wheel', this.onWheel, this);
    this.app.stage.on('pointerleave', () => this.events.hover(null, null, null));
    this.app.renderer.on('resize', this.fit, this);
    this.fit();

    this.app.ticker.add(ticker => {
      const seconds = Math.min(ticker.deltaMS / 1000, 0.1);
      this.time += seconds;
      this.lastSeconds = seconds;
      this.events.frame(seconds);
    });
  }

  destroy () {
    this.app.destroy(true, { children: true, texture: true });
  }

  draw (view: ViewState, effects: Effect[]) {
    const state = this.state;
    const signature = `${state.revision}:${state.buildings.map(b => b.workers).join(',')}`;

    if (state.revision !== this.revision) {
      this.revision = state.revision;
      this.drawBuildings();
    }

    if (signature !== this.signature) {
      this.signature = signature;
      this.drawPips();
    }

    const night = nightness(state);
    const light = lightParams(state);

    this.particles.update({ state, light, night, seconds: this.lastSeconds }, effects);

    this.darkness.update({ light, frontPx: state.shadowFront * UNIT, night, time: this.time });
    this.windows.alpha = 0.25 + night * 0.75;
    this.drawFlare(night, light.dim > 0);
    this.drawReach(1 - night);
    this.drawOverlay(view);
  }

  private fit () {
    const { width, height } = this.state.map;
    const screen = this.app.screen;
    this.minZoom = Math.max(screen.width / width, screen.height / height) * 0.82;
    const scale = Math.max(screen.width / width, screen.height / height) * 0.95;

    this.world.scale.set(scale);
    this.world.position.set((screen.width - width * scale) / 2, (screen.height - height * scale) / 2);
    this.app.stage.hitArea = screen;
    this.clampCamera();
  }

  private clampCamera () {
    const { width, height } = this.state.map;
    const screen = this.app.screen;
    const scale = this.world.scale.x;
    const w = width * scale;
    const h = height * scale;
    const slackX = Math.max(0, (screen.width - w) / 2) + screen.width * 0.25;
    const slackY = Math.max(0, (screen.height - h) / 2) + screen.height * 0.25;

    this.world.x = Math.min(slackX, Math.max(screen.width - w - slackX, this.world.x));
    this.world.y = Math.min(slackY, Math.max(screen.height - h - slackY, this.world.y));
  }

  private toWorld (event: FederatedPointerEvent) {
    return this.world.toLocal(event.global);
  }

  private onDown (event: FederatedPointerEvent) {
    if (event.button === 2) {
      this.events.cancel();

      return;
    }

    this.drag = {
      start: { x: event.global.x, y: event.global.y },
      origin: { x: this.world.x, y: this.world.y },
      moved: false
    };
  }

  private onMove (event: FederatedPointerEvent) {
    const p = this.toWorld(event);

    if (this.drag) {
      const dx = event.global.x - this.drag.start.x;
      const dy = event.global.y - this.drag.start.y;

      if (this.drag.moved || Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        this.drag.moved = true;
        this.world.position.set(this.drag.origin.x + dx, this.drag.origin.y + dy);
        this.clampCamera();
      }
    }

    this.events.hover(slotNear(this.state.map, p.x, p.y)?.id ?? null, { x: p.x, y: p.y }, { x: event.global.x, y: event.global.y });
  }

  private onUp (event: FederatedPointerEvent) {
    const drag = this.drag;
    this.drag = null;

    if (!drag || drag.moved || event.button === 2) {
      return;
    }

    const p = this.toWorld(event);
    this.events.press(slotNear(this.state.map, p.x, p.y)?.id ?? null, { x: p.x, y: p.y });
  }

  private onWheel (event: FederatedWheelEvent) {
    const before = this.world.toLocal(event.global);
    const scale = Math.min(MAX_ZOOM, Math.max(this.minZoom, this.world.scale.x * Math.exp(-event.deltaY * 0.0015)));

    this.world.scale.set(scale);
    this.world.position.set(event.global.x - before.x * scale, event.global.y - before.y * scale);
    this.clampCamera();
  }

  private drawBuildings () {
    this.buildings.removeChildren().forEach(child => child.destroy());
    this.windows.clear();

    const sorted = [...this.state.buildings].sort((a, b) => a.y - b.y);

    for (const b of sorted) {
      const g = new Graphics();
      const windows = drawBuilding(g, b.type);
      g.position.set(b.x, b.y);
      this.buildings.addChild(g);
      windows.forEach(w => this.drawWindow(b, w));
    }
  }

  /** Worker dots above each building: filled for people at work, hollow for empty places. */
  private drawPips () {
    const g = this.pips;
    g.clear();

    for (const b of this.state.buildings) {
      const max = BUILDINGS[b.type].maxWorkers;

      if (!max || b.type === 'lighthouse') {
        continue;
      }

      const step = 7;
      const x0 = b.x - ((max - 1) * step) / 2;
      const y = b.y + 26;

      for (let i = 0; i < max; i++) {
        if (i < b.workers) {
          g.circle(x0 + i * step, y, 2.6).fill({ color: PALETTE.white, alpha: 0.95 });
        } else {
          g.circle(x0 + i * step, y, 2.2).stroke({ width: 1, color: PALETTE.white, alpha: 0.45 });
        }
      }
    }
  }

  private drawWindow (at: Point, w: Window) {
    const x = at.x + w.x;
    const y = at.y + w.y;

    this.windows.rect(x, y, w.w, w.h).fill({ color: PALETTE.warm, alpha: 0.9 });
    this.windows.circle(x + w.w / 2, y + w.h / 2, Math.max(w.w, w.h) * 1.6).fill({ color: PALETTE.warm, alpha: 0.12 });
  }

  private drawFlare (night: number, burning: boolean) {
    const g = this.flare;
    const { x, y } = this.state.map.lighthouse;
    g.clear();

    if (!burning || night <= 0) {
      return;
    }

    const flicker = 0.9 + Math.sin(this.time * 7) * 0.05 + Math.sin(this.time * 19) * 0.03;
    g.circle(x, y - 56, 34).fill({ color: PALETTE.warm, alpha: 0.12 * night * flicker });
    g.circle(x, y - 56, 14).fill({ color: PALETTE.warm, alpha: 0.35 * night * flicker });

    if (this.state.mode === 'beam') {
      const a = this.state.beamAngle;
      g.poly([x, y - 56, x + Math.cos(a - 0.12) * 200, y + Math.sin(a - 0.12) * 200, x + Math.cos(a + 0.12) * 200, y + Math.sin(a + 0.12) * 200])
        .fill({ color: PALETTE.warm, alpha: 0.06 * night * flicker });
    }
  }

  private dashedCircle (g: Graphics, x: number, y: number, r: number, dash: number) {
    const count = Math.max(12, Math.round((Math.PI * 2 * r) / dash / 2));
    const step = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const a = i * step;
      g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r).arc(x, y, r, a, a + step * 0.55);
    }
  }

  private reachLabel (text: string, x: number, y: number, anchorX: number) {
    const label = new Text({
      text,
      style: {
        fontFamily: 'Oswald, sans-serif',
        fontSize: 13,
        fontWeight: '500',
        letterSpacing: 2.5,
        fill: PALETTE.warm,
        dropShadow: { color: 0x000000, alpha: 0.9, blur: 4, distance: 0 }
      }
    });
    label.anchor.set(anchorX, 0.5);
    label.position.set(x, y);
    label.alpha = 0.85;
    this.reachLabels.addChild(label);
  }

  /**
   * By day the light is out, so tonight's light is drawn as zones: warm fill where it is fully lit, dotted where it
   * fades into the dim. Redrawn only when the light changes; the day/night fade is the layer's alpha.
   */
  private drawReach (visibility: number) {
    this.reachLayer.alpha = visibility;
    this.reachLayer.visible = visibility > 0.02;
    this.reachLabels.alpha = visibility;
    this.reachLabels.visible = this.reachLayer.visible;

    const p = lightParams(this.state, true);
    const key = [i18n.global.locale.value, p.lit, p.dim, p.beamLength, p.beamAngle, ...p.lanterns.flatMap(l => [l.x, l.y])].join(',');

    if (key === this.reachKey) {
      return;
    }

    this.reachKey = key;
    const g = this.reach;
    const { x, y } = p.origin;
    g.clear();
    this.reachLabels.removeChildren().forEach(child => child.destroy());

    if (p.dim > 0) {
      g.circle(x, y, p.dim).fill({ color: PALETTE.warm, alpha: 0.02 }).circle(x, y, p.lit).cut();

      for (let gx = x - p.dim; gx <= x + p.dim; gx += 14) {
        for (let gy = y - p.dim; gy <= y + p.dim; gy += 14) {
          const offset = (Math.round((gy - y) / 14) % 2) * 7;
          const d = Math.hypot(gx + offset - x, gy - y);

          if (d > p.lit + 4 && d < p.dim - 4) {
            g.circle(gx + offset, gy, 1.2);
          }
        }
      }

      g.fill({ color: PALETTE.warm, alpha: 0.3 });
      g.circle(x, y, p.lit).fill({ color: PALETTE.warm, alpha: 0.07 });
      g.circle(x, y, p.lit).stroke({ width: 1.8, color: PALETTE.warm, alpha: 0.6 });
      this.dashedCircle(g, x, y, p.dim, 9);
      g.stroke({ width: 1.2, color: PALETTE.warm, alpha: 0.4 });
    }

    if (p.beamLength > 0) {
      const a0 = p.beamAngle - p.beamHalfArc;
      const a1 = p.beamAngle + p.beamHalfArc;
      const mid = p.beamLength * 0.62;

      g.moveTo(x, y).arc(x, y, p.beamLength, a0, a1).closePath()
        .fill({ color: PALETTE.warm, alpha: 0.07 })
        .stroke({ width: 1.6, color: PALETTE.warm, alpha: 0.55 });
      this.reachLabel(tr('modes.beam.name').toUpperCase(), x + Math.cos(p.beamAngle) * mid, y + Math.sin(p.beamAngle) * mid, 0.5);
    }

    for (const lantern of p.lanterns) {
      g.circle(lantern.x, lantern.y, p.lanternLit).fill({ color: PALETTE.warm, alpha: 0.07 })
        .stroke({ width: 1.2, color: PALETTE.warm, alpha: 0.45 });
    }
  }

  private drawOverlay (view: ViewState) {
    const g = this.overlay;
    const state = this.state;
    const pulse = 0.65 + Math.sin(this.time * 4) * 0.25;
    g.clear();

    if (view.highlight) {
      const r = 46 + Math.sin(this.time * 4) * 6;
      g.circle(view.highlight.x, view.highlight.y, r).stroke({ width: 3, color: PALETTE.warm, alpha: 0.9 });
      g.circle(view.highlight.x, view.highlight.y, r + 10).stroke({ width: 1.5, color: PALETTE.warm, alpha: 0.4 });
    }

    const selected = state.buildings.find(b => b.id === view.selectedId);

    if (selected) {
      g.ellipse(selected.x, selected.y + 10, SLOT_RADIUS + 8, (SLOT_RADIUS + 8) * 0.45)
        .stroke({ width: 2, color: PALETTE.white, alpha: pulse });
    }

    if (view.aiming && view.pointer) {
      const { x, y } = state.map.lighthouse;
      g.moveTo(x, y).lineTo(view.pointer.x, view.pointer.y).stroke({ width: 2, color: PALETTE.warm, alpha: 0.7 });
      g.circle(view.pointer.x, view.pointer.y, 8).stroke({ width: 2, color: PALETTE.warm, alpha: 0.7 });

      return;
    }

    if (view.placing) {
      for (const slot of state.map.slots) {
        if (!canPlace(state, view.placing, slot.id)) {
          g.circle(slot.x, slot.y, 4).fill({ color: PALETTE.white, alpha: 0.4 });
        }
      }
    }

    const hover = view.hoverSlot === null ? null : state.map.slots[view.hoverSlot];

    if (!hover) {
      return;
    }

    if (view.placing) {
      const ok = !canPlace(state, view.placing, hover.id);
      g.ellipse(hover.x, hover.y + 10, SLOT_RADIUS + 4, (SLOT_RADIUS + 4) * 0.45)
        .fill({ color: ok ? PALETTE.white : PALETTE.danger, alpha: 0.1 })
        .stroke({ width: 2, color: ok ? PALETTE.white : PALETTE.danger, alpha: 0.9 });

      return;
    }

    g.ellipse(hover.x, hover.y + 10, SLOT_RADIUS + 4, (SLOT_RADIUS + 4) * 0.45)
      .stroke({ width: 1.5, color: PALETTE.white, alpha: 0.4 });
  }
}
