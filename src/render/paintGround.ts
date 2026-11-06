import { createRng } from '@/game/rng';
import { coastAt, COAST_STEP, RINGS, ringRadius } from '@/game/map';
import { cssColor, PALETTE } from './theme';
import type { GameMap, Rock, Slot } from '@/game/map';
import type { Rng } from '@/game/rng';

/** The ground is painted once, so it can afford blur and thousands of strokes; 1.5× keeps it crisp when zoomed. */
export const GROUND_SCALE = 1.5;

function coastPath (ctx: CanvasRenderingContext2D, map: GameMap, offset = 0, wobble = 0, rng?: Rng) {
  ctx.beginPath();

  for (let x = 0; x <= map.width; x += COAST_STEP / 2) {
    const y = coastAt(map, x) + offset + (rng ? rng.range(-wobble, wobble) : 0);

    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
}

function paintLand (ctx: CanvasRenderingContext2D, rng: Rng, map: GameMap) {
  const { x, y } = map.lighthouse;
  const gradient = ctx.createRadialGradient(x, y, 40, x, y, map.width * 0.75);
  gradient.addColorStop(0, cssColor(PALETTE.landLight));
  gradient.addColorStop(0.55, cssColor(PALETTE.land));
  gradient.addColorStop(1, cssColor(PALETTE.landDark));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, map.width, map.height);

  ctx.save();
  ctx.filter = 'blur(10px)';

  for (let i = 0; i < 700; i++) {
    ctx.beginPath();
    ctx.ellipse(rng.range(0, map.width), rng.range(0, map.height), rng.range(20, 90), rng.range(10, 50), rng.range(0, Math.PI), 0, Math.PI * 2);
    ctx.fillStyle = rng.chance(0.5) ? cssColor(PALETTE.white, rng.range(0.008, 0.02)) : cssColor(0x000000, rng.range(0.05, 0.12));
    ctx.fill();
  }

  ctx.restore();

  for (let i = 0; i < 14000; i++) {
    ctx.fillStyle = cssColor(PALETTE.white, rng.range(0.01, 0.05));
    ctx.fillRect(rng.range(0, map.width), rng.range(0, map.height), rng.range(0.5, 1.6), rng.range(0.5, 1.6));
  }

  ctx.strokeStyle = cssColor(PALETTE.white, 0.035);
  ctx.lineWidth = 1;

  for (let i = 0; i < 260; i++) {
    const sx = rng.range(0, map.width);
    const sy = rng.range(0, map.height);
    const a = rng.range(0, Math.PI * 2);
    const len = rng.range(6, 18);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len);
    ctx.stroke();
  }
}

function paintRings (ctx: CanvasRenderingContext2D, map: GameMap) {
  const { x, y } = map.lighthouse;

  ctx.save();
  ctx.setLineDash([3, 12]);
  ctx.lineWidth = 1.2;

  for (let ring = 1; ring <= RINGS; ring++) {
    ctx.strokeStyle = cssColor(PALETTE.white, 0.06 - ring * 0.005);
    ctx.beginPath();
    ctx.arc(x, y, ringRadius(ring), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  const plaza = ctx.createRadialGradient(x, y, 0, x, y, ringRadius(1) - 10);
  plaza.addColorStop(0, cssColor(PALETTE.white, 0.06));
  plaza.addColorStop(1, cssColor(PALETTE.white, 0));
  ctx.fillStyle = plaza;
  ctx.beginPath();
  ctx.arc(x, y, ringRadius(1) - 10, 0, Math.PI * 2);
  ctx.fill();
}

function paintSea (ctx: CanvasRenderingContext2D, rng: Rng, map: GameMap) {
  coastPath(ctx, map);
  ctx.lineTo(map.width, map.height);
  ctx.lineTo(0, map.height);
  ctx.closePath();

  const gradient = ctx.createLinearGradient(0, 700, 0, map.height);
  gradient.addColorStop(0, cssColor(PALETTE.sea));
  gradient.addColorStop(1, cssColor(PALETTE.seaDeep));
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.save();
  ctx.clip();
  ctx.lineCap = 'round';

  for (let i = 0; i < 420; i++) {
    const sx = rng.range(0, map.width);
    const sy = rng.range(coastAt(map, sx) + 20, map.height);
    const len = rng.range(10, 46);
    ctx.strokeStyle = cssColor(PALETTE.white, rng.range(0.02, 0.07));
    ctx.lineWidth = rng.range(0.8, 1.6);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + len / 2, sy - 2, sx + len, sy);
    ctx.stroke();
  }

  ctx.restore();

  ctx.save();
  ctx.lineJoin = 'round';
  coastPath(ctx, map, -4);
  ctx.strokeStyle = cssColor(PALETTE.white, 0.05);
  ctx.lineWidth = 16;
  ctx.stroke();
  coastPath(ctx, map);
  ctx.strokeStyle = cssColor(PALETTE.white, 0.6);
  ctx.lineWidth = 1.8;
  ctx.stroke();

  for (const [offset, alpha] of [[9, 0.22], [20, 0.1], [34, 0.05]] as const) {
    ctx.setLineDash([rng.range(30, 60), rng.range(10, 30)]);
    coastPath(ctx, map, offset, 1.5, rng);
    ctx.strokeStyle = cssColor(PALETTE.white, alpha);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  ctx.restore();
}

function paintRock (ctx: CanvasRenderingContext2D, rock: Rock) {
  const rng = createRng(Math.floor(rock.seed * 1e6));
  const points = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2;
    const r = rock.r * rng.range(0.75, 1.1);

    return { x: rock.x + Math.cos(a) * r, y: rock.y + Math.sin(a) * r * 0.82 };
  });

  const trace = (dx: number, dy: number) => {
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x + dx, p.y + dy) : ctx.moveTo(p.x + dx, p.y + dy)));
    ctx.closePath();
  };

  trace(6, 8);
  ctx.fillStyle = cssColor(0x000000, 0.45);
  ctx.fill();
  trace(0, 0);
  ctx.fillStyle = cssColor(0x0c0e11);
  ctx.fill();
  ctx.strokeStyle = cssColor(PALETTE.white, 0.16);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.save();
  trace(0, 0);
  ctx.clip();
  ctx.strokeStyle = cssColor(PALETTE.white, 0.28);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(rock.x + rock.r * 0.15, rock.y + rock.r * 0.2, rock.r, Math.PI * 1.05, Math.PI * 1.6);
  ctx.stroke();
  ctx.restore();
}

function paintOil (ctx: CanvasRenderingContext2D, slot: Slot) {
  ctx.save();
  ctx.translate(slot.x, slot.y);
  ctx.scale(1, 0.62);
  ctx.beginPath();
  ctx.arc(0, 0, 44, 0, Math.PI * 2);
  ctx.fillStyle = cssColor(0x000000, 0.9);
  ctx.fill();
  ctx.strokeStyle = cssColor(PALETTE.white, 0.12);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-10, -10, 22, Math.PI * 1.1, Math.PI * 1.55);
  ctx.strokeStyle = cssColor(PALETTE.white, 0.35);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function paintWreck (ctx: CanvasRenderingContext2D, rng: Rng, slot: Slot) {
  ctx.save();
  ctx.translate(slot.x, slot.y);
  ctx.rotate(-0.35);
  ctx.lineCap = 'round';
  ctx.strokeStyle = cssColor(PALETTE.white, 0.45);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-40, 0);
  ctx.quadraticCurveTo(-10, 22, 38, 8);
  ctx.stroke();

  for (let i = 0; i < 7; i++) {
    const x = -32 + i * 10;
    ctx.strokeStyle = cssColor(PALETTE.white, rng.range(0.2, 0.4));
    ctx.beginPath();
    ctx.moveTo(x, 6 + Math.sin(i) * 3);
    ctx.quadraticCurveTo(x + 4, -10, x + rng.range(-2, 6), -22 - rng.range(0, 10));
    ctx.stroke();
  }

  ctx.strokeStyle = cssColor(PALETTE.mist, 0.4);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(4, 2);
  ctx.lineTo(12, -38);
  ctx.stroke();
  ctx.restore();
}

export function paintGround (map: GameMap) {
  const canvas = document.createElement('canvas');
  canvas.width = map.width * GROUND_SCALE;
  canvas.height = map.height * GROUND_SCALE;
  const ctx = canvas.getContext('2d')!;
  const rng = createRng(11);
  ctx.scale(GROUND_SCALE, GROUND_SCALE);

  paintLand(ctx, rng, map);
  paintRings(ctx, map);
  paintSea(ctx, rng, map);
  map.rocks.forEach(rock => paintRock(ctx, rock));

  for (const slot of map.slots) {
    if (slot.kind === 'oil') {
      paintOil(ctx, slot);
    } else if (slot.kind === 'wreck') {
      paintWreck(ctx, rng, slot);
    }
  }

  return canvas;
}
