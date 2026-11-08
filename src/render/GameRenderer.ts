import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { BUILDINGS, RESTORATION, UNIT } from '@/game/config';
import { DARK, levelAt, lightParams } from '@/game/light';
import { SLOT_RADIUS, slotNear } from '@/game/map';
import { canPlace, nightness, shadowAt } from '@/game/sim';
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
  /** The player is hovering the next restoration stage: show how far the light would reach with it. */
  previewStage: boolean;
  selectedFind: number | null;
  /** Title-screen backdrop: always night, the Lighthouse burning, the Shadow everywhere else, no game markings. */
  cinematic: boolean;
}

/** What lies under the pointer: a building slot, a find out in the dark, or the Lighthouse itself. */
export interface MapTarget {
  slot: number | null;
  find: number | null;
  lighthouse: boolean;
}

export interface RendererEvents {
  frame: (seconds: number) => void;
  hover: (target: MapTarget | null, point: Point | null, screen: Point | null) => void;
  press: (target: MapTarget, point: Point) => void;
  cancel: () => void;
}

const DRAG_THRESHOLD = 6;
const SWEEP_SECONDS = 7;
const CINEMATIC_X = 0.68;
const MAX_ZOOM = 2.4;

export class GameRenderer {
  private app = new Application();
  private world = new Container();
  private buildings = new Container();
  private windows = new Graphics();
  private flare = new Graphics();
  private pips = new Graphics();
  private badges = new Graphics();
  private badgeClock = 0;
  private reach = new Graphics();
  private reachLabels = new Container();
  private reachLayer = new Container();
  private reachKey = '';
  private cinematic = false;
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
      this.badges,
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

  /** Where a map point is on screen, and how many screen pixels one map pixel takes, for HUD overlays. */
  toScreen (point: Point) {
    const p = this.world.toGlobal(point);
    const box = this.app.canvas.getBoundingClientRect();

    return { x: box.left + p.x, y: box.top + p.y, scale: this.world.scale.x };
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

    if (view.cinematic !== this.cinematic) {
      this.cinematic = view.cinematic;
      this.fit();
    }

    const night = view.cinematic ? 1 : nightness(state);
    const light = view.cinematic ? lightParams(state, true) : lightParams(state);
    const front = view.cinematic ? (state.map.maxEdge + 1) * UNIT : state.shadowFront * UNIT;

    this.pips.visible = !view.cinematic;
    this.badges.visible = !view.cinematic;
    this.overlay.visible = !view.cinematic;

    this.particles.update({ state, light, night, seconds: this.lastSeconds }, effects);

    const flicker = 0.93 + Math.sin(this.time * 7.3) * 0.03 + Math.sin(this.time * 17.9) * 0.02 + Math.sin(this.time * 2.1) * 0.02;
    this.darkness.update({ light, frontPx: front, night, time: this.time, sweep: this.sweepAngle(), flicker });
    this.windows.alpha = (0.25 + night * 0.75) * (0.92 + Math.sin(this.time * 5.1) * 0.05 + Math.sin(this.time * 12.7) * 0.03);
    this.drawFlare(night, light.dim > 0);
    this.badgeClock += this.lastSeconds;

    if (this.badgeClock > 0.25 || state.revision !== this.revision) {
      this.badgeClock = 0;
      this.drawBadges();
    }

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

    // Behind the title screen the Lighthouse stands to the right, leaving the left side dark for the menu.
    if (this.cinematic) {
      const { x, y } = this.state.map.lighthouse;
      this.world.position.set(screen.width * CINEMATIC_X - x * scale, screen.height / 2 - y * scale);

      return;
    }

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

    // Pixi follows the pointer across the whole page, so a move over the HUD still lands here: only the map counts.
    if (event.nativeEvent.target !== this.app.canvas) {
      this.events.hover(null, null, null);

      return;
    }

    this.events.hover(this.pick(p), { x: p.x, y: p.y }, { x: event.global.x, y: event.global.y });
  }

  private pick (p: Point): MapTarget {
    const { x, y } = this.state.map.lighthouse;
    const lighthouse = Math.abs(p.x - x) < 30 && p.y > y - 80 && p.y < y + 26;
    const find = this.state.finds.find(f => f.found && !f.collected && Math.hypot(f.x - p.x, f.y - p.y) < 30);

    return {
      slot: lighthouse || find ? null : slotNear(this.state.map, p.x, p.y)?.id ?? null,
      find: find?.id ?? null,
      lighthouse
    };
  }

  private onUp (event: FederatedPointerEvent) {
    const drag = this.drag;
    this.drag = null;

    if (!drag || drag.moved || event.button === 2) {
      return;
    }

    const p = this.toWorld(event);
    this.events.press(this.pick(p), { x: p.x, y: p.y });
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

  /**
   * Small signs above buildings for the problems a player must not miss: nobody at work, the Shadow on it now, or
   * darkness waiting for it tonight. They keep the essentials on the map instead of only in tooltips.
   */
  private drawBadges () {
    const g = this.badges;
    const state = this.state;
    const planned = lightParams(state, true);
    const pulse = 0.75 + Math.sin(this.time * 5) * 0.25;
    g.clear();

    for (const find of state.finds) {
      if (find.found && !find.collected) {
        this.findMark(find.x, find.y, pulse);
      }
    }

    for (const b of state.buildings) {
      if (b.type === 'lighthouse') {
        continue;
      }

      const def = BUILDINGS[b.type];
      const peopled = b.workers > 0 || !!def.housing;
      const x = b.x;
      const y = b.y - 50;

      if (state.phase !== 'day' && peopled && shadowAt(state, b.slot) >= 0.7) {
        this.badge(x, y, PALETTE.danger, pulse);
        g.rect(x - 1.2, y - 5, 2.4, 6.5).fill(PALETTE.danger);
        g.circle(x, y + 4.3, 1.4).fill(PALETTE.danger);
      } else if (def.maxWorkers > 0 && b.workers === 0) {
        this.badge(x, y, PALETTE.mist, 1);
        g.circle(x, y - 2.6, 2.4).fill(PALETTE.white);
        g.roundRect(x - 3.8, y + 0.8, 7.6, 4.2, 2).fill(PALETTE.white);
        g.moveTo(x - 5.5, y + 5.5).lineTo(x + 5.5, y - 5.5).stroke({ width: 1.6, color: PALETTE.danger });
      } else if (state.phase === 'day' && peopled && levelAt(planned, b.x, b.y) === DARK) {
        this.badge(x, y, PALETTE.warm, 1);
        g.circle(x, y, 5).fill(PALETTE.warm).circle(x + 2.6, y - 1.8, 4.2).cut();
      }
    }
  }

  /** A found thing out in the dark: a warm diamond on a short stake, the kind of mark a scout would leave. */
  private findMark (x: number, y: number, pulse: number) {
    const g = this.badges;
    g.moveTo(x, y + 4).lineTo(x, y - 14).stroke({ width: 1.5, color: PALETTE.warm, alpha: 0.7 });
    g.circle(x, y - 22, 16).fill({ color: PALETTE.warm, alpha: 0.12 * pulse });
    g.poly([x, y - 32, x + 9, y - 22, x, y - 12, x - 9, y - 22]).fill({ color: 0x0b0d10, alpha: 0.92 }).stroke({ width: 2, color: PALETTE.warm, alpha: pulse });
    g.circle(x, y - 22, 2.5).fill({ color: PALETTE.warm });
    g.ellipse(x, y + 4, 8, 3).fill({ color: 0x000000, alpha: 0.4 });
  }

  private badge (x: number, y: number, color: number, alpha: number) {
    this.badges.moveTo(x, y + 9).lineTo(x, y + 18).stroke({ width: 1, color, alpha: 0.5 * alpha });
    this.badges.circle(x, y, 9.5).fill({ color: 0x0b0d10, alpha: 0.92 }).stroke({ width: 1.5, color, alpha });
  }

  private drawWindow (at: Point, w: Window) {
    const x = at.x + w.x;
    const y = at.y + w.y;

    this.windows.rect(x, y, w.w, w.h).fill({ color: PALETTE.warm, alpha: 0.9 });
    this.windows.circle(x + w.w / 2, y + w.h / 2, Math.max(w.w, w.h) * 1.6).fill({ color: PALETTE.warm, alpha: 0.12 });
  }

  /** One turn of the lamp every few seconds, like a real lighthouse. */
  private sweepAngle () {
    return ((this.time * Math.PI * 2) / SWEEP_SECONDS) % (Math.PI * 2);
  }

  /** A wedge of light from the lamp, drawn as a few nested layers so its edges fade instead of cutting off. */
  private glare (cx: number, cy: number, angle: number, length: number, spread: number, alpha: number) {
    for (let i = 0; i < 4; i++) {
      const k = 1 - i * 0.22;
      const a0 = angle - spread * k;
      const a1 = angle + spread * k;
      const r = length * (0.55 + 0.45 * k);
      this.flare.poly([cx, cy, cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r])
        .fill({ color: PALETTE.warm, alpha: alpha * (0.35 + i * 0.25) });
    }
  }

  /**
   * The lamp itself: a soft layered halo, a thin horizontal streak like light caught in a lens, and the glare of the
   * turning beam (or the fixed one in beam mode) leaving the lantern room.
   */
  private drawFlare (night: number, burning: boolean) {
    const g = this.flare;
    const { x, y } = this.state.map.lighthouse;
    const ly = y - 56;
    g.clear();

    if (!burning || night <= 0) {
      return;
    }

    const flicker = 0.9 + Math.sin(this.time * 7) * 0.05 + Math.sin(this.time * 19) * 0.03;
    const glow = night * flicker;

    for (const [r, a] of [[60, 0.05], [38, 0.08], [22, 0.16], [11, 0.4], [5, 0.9]] as const) {
      g.circle(x, ly, r).fill({ color: PALETTE.warm, alpha: a * glow });
    }

    g.ellipse(x, ly, 70, 1.6).fill({ color: PALETTE.warm, alpha: 0.35 * glow });
    g.ellipse(x, ly, 34, 0.8).fill({ color: 0xffffff, alpha: 0.6 * glow });

    if (this.state.mode === 'beam') {
      this.glare(x, ly, this.state.beamAngle, 260, 0.14, 0.05 * glow);
    } else {
      const sweep = this.sweepAngle();
      this.glare(x, ly, sweep, 180, 0.12, 0.06 * glow);
      this.glare(x, ly, sweep + Math.PI, 90, 0.1, 0.03 * glow);
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
        fontFamily: 'Fira Sans Condensed, sans-serif',
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

  /** The light's reach after the next restoration stage, in white over the current warm zones so the gain stands out. */
  private drawStagePreview (g: Graphics) {
    const p = lightParams(this.state, true, this.state.restoration.stage + 1);
    const { x, y } = p.origin;
    const pulse = 0.6 + Math.sin(this.time * 4) * 0.25;

    if (p.dim > 0) {
      g.circle(x, y, p.lit).stroke({ width: 2.5, color: PALETTE.white, alpha: pulse });
      this.dashedCircle(g, x, y, p.dim, 9);
      g.stroke({ width: 1.6, color: PALETTE.white, alpha: pulse * 0.7 });
    }

    if (p.beamLength > 0) {
      g.moveTo(x, y).arc(x, y, p.beamLength, p.beamAngle - p.beamHalfArc, p.beamAngle + p.beamHalfArc).closePath()
        .stroke({ width: 2.5, color: PALETTE.white, alpha: pulse });
    }
  }

  private drawOverlay (view: ViewState) {
    const g = this.overlay;
    const state = this.state;
    const pulse = 0.65 + Math.sin(this.time * 4) * 0.25;
    g.clear();

    if (view.previewStage && state.restoration.stage < RESTORATION.length) {
      this.drawStagePreview(g);
    }

    const find = state.finds.find(f => f.id === view.selectedFind);

    if (find) {
      g.circle(find.x, find.y, 22).stroke({ width: 2, color: PALETTE.white, alpha: pulse });
    }

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
