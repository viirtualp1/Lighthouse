import { PALETTE } from './theme';
import type { Graphics, StrokeStyle } from 'pixi.js';
import type { BuildingId } from '@/game/config';

export interface Window {
  x: number;
  y: number;
  w: number;
  h: number;
}

const LINE: StrokeStyle = { width: 1.4, color: PALETTE.white, alpha: 0.85, join: 'round', cap: 'round' };
const FAINT: StrokeStyle = { ...LINE, width: 1, alpha: 0.4 };
const WOOD = 0x2a2520;

function shadow (g: Graphics, rx: number, y = 14) {
  g.ellipse(4, y, rx, rx * 0.32).fill({ color: 0x000000, alpha: 0.45 });
}

function house (g: Graphics, x: number, y: number, w: number, h: number, roof: number) {
  g.rect(x, y, w, h).fill(PALETTE.body).stroke(LINE);
  g.poly([x - 3, y + 1, x + w / 2, y - roof, x + w + 3, y + 1]).fill(PALETTE.roof).stroke(LINE);
}

function lighthouse (g: Graphics): Window[] {
  g.ellipse(6, 20, 40, 13).fill({ color: 0x000000, alpha: 0.5 });
  g.ellipse(0, 16, 30, 10).fill(PALETTE.body).stroke(LINE);
  g.poly([-11, 16, -7, -46, 7, -46, 11, 16]).fill(PALETTE.body).stroke(LINE);
  g.poly([-9.6, -5, -8.9, -15, 8.9, -15, 9.6, -5]).fill({ color: PALETTE.white, alpha: 0.85 });
  g.poly([-8.2, -26, -7.6, -35, 7.6, -35, 8.2, -26]).fill({ color: PALETTE.white, alpha: 0.85 });
  g.rect(-11, -50, 22, 4).fill(PALETTE.body).stroke(LINE);
  g.rect(-6, -62, 12, 12).fill(PALETTE.warm).stroke(LINE);
  g.poly([-8, -62, 0, -72, 8, -62]).fill(PALETTE.roof).stroke(LINE);
  g.rect(-2, 6, 4, 10).fill(PALETTE.void);

  return [{ x: -6, y: -62, w: 12, h: 12 }];
}

function hut (g: Graphics): Window[] {
  shadow(g, 22);
  g.rect(7, -18, 4, 9).fill(PALETTE.body).stroke(FAINT);
  house(g, -14, -4, 28, 18, 15);
  g.rect(-3, 5, 6, 9).fill(PALETTE.void);

  return [{ x: 6, y: 1, w: 5, h: 5 }];
}

function dock (g: Graphics): Window[] {
  g.rect(-8, -8, 16, 38).fill(WOOD).stroke(LINE);

  for (let y = -2; y < 30; y += 6) {
    g.moveTo(-8, y).lineTo(8, y).stroke(FAINT);
  }

  for (const [x, y] of [[-11, -4], [11, -4], [-11, 24], [11, 24]] as const) {
    g.circle(x, y, 2.4).fill(PALETTE.body).stroke(LINE);
  }

  g.ellipse(22, 16, 6, 13).fill(PALETTE.body).stroke(LINE);
  g.moveTo(22, 6).lineTo(22, 26).stroke(FAINT);
  g.rect(-14, -20, 12, 10).fill(PALETTE.body).stroke(LINE);

  return [{ x: -11, y: -17, w: 4, h: 4 }];
}

function renderer (g: Graphics): Window[] {
  shadow(g, 24);
  g.rect(-14, -30, 6, 22).fill(PALETTE.body).stroke(LINE);
  house(g, -18, -6, 26, 20, 10);
  g.ellipse(14, 8, 9, 4).fill(PALETTE.body).stroke(LINE);
  g.rect(5, -4, 18, 12).fill(PALETTE.body);
  g.moveTo(5, -4).lineTo(5, 8).moveTo(23, -4).lineTo(23, 8).stroke(LINE);
  g.ellipse(14, -4, 9, 4).fill(0x000000).stroke(LINE);
  g.circle(-17, -36, 5).fill({ color: PALETTE.mist, alpha: 0.15 });
  g.circle(-14, -45, 7).fill({ color: PALETTE.mist, alpha: 0.1 });

  return [{ x: -12, y: 2, w: 5, h: 5 }, { x: -3, y: 2, w: 5, h: 5 }];
}

function oilCollector (g: Graphics): Window[] {
  shadow(g, 24);
  g.rect(-20, -6, 18, 20).fill(PALETTE.body);
  g.ellipse(-11, 14, 9, 3.5).fill(PALETTE.body).stroke(LINE);
  g.moveTo(-20, -6).lineTo(-20, 14).moveTo(-2, -6).lineTo(-2, 14).stroke(LINE);
  g.ellipse(-11, -6, 9, 3.5).fill(PALETTE.roof).stroke(LINE);
  g.moveTo(4, 14).lineTo(12, -34).lineTo(20, 14).stroke(LINE);
  g.moveTo(6, 2).lineTo(18, 2).moveTo(8, -10).lineTo(16, -10).moveTo(10, -22).lineTo(14, -22).stroke(FAINT);
  g.moveTo(6, 2).lineTo(16, -10).moveTo(8, -10).lineTo(14, -22).stroke(FAINT);

  return [{ x: 10, y: -36, w: 4, h: 3 }];
}

function driftwood (g: Graphics): Window[] {
  shadow(g, 22);

  for (const [y, half] of [[8, 16], [1, 14], [-6, 10]] as const) {
    g.roundRect(-half, y - 3.5, half * 2, 7, 3.5).fill(WOOD).stroke(LINE);
    g.circle(half - 2, y, 2.2).stroke(FAINT);
  }

  g.moveTo(14, -12).lineTo(22, 12).moveTo(22, -12).lineTo(14, 12).stroke(LINE);

  return [];
}

function salvage (g: Graphics): Window[] {
  shadow(g, 24);
  g.poly([-20, 14, -6, 8, 2, 14, 10, 9, 18, 14]).fill(PALETTE.roof).stroke(FAINT);
  g.moveTo(-14, 12).lineTo(-6, -34).lineTo(2, 12).stroke(LINE);
  g.moveTo(-6, -34).lineTo(18, -26).stroke(LINE);
  g.moveTo(16, -27).lineTo(16, -6).stroke(FAINT);
  g.moveTo(16, -6).quadraticCurveTo(21, -1, 16, 2).stroke(LINE);

  return [];
}

function infirmary (g: Graphics): Window[] {
  shadow(g, 26);
  house(g, -20, -4, 40, 18, 11);
  g.rect(-1.5, -12, 3, 9).fill(PALETTE.danger);
  g.rect(-4.5, -9, 9, 3).fill(PALETTE.danger);
  g.rect(-3, 5, 6, 9).fill(PALETTE.void);

  return [{ x: -15, y: 1, w: 6, h: 5 }, { x: 9, y: 1, w: 6, h: 5 }];
}

function chapel (g: Graphics): Window[] {
  shadow(g, 20);
  house(g, -11, -2, 22, 16, 12);
  g.rect(-4, -30, 8, 18).fill(PALETTE.body).stroke(LINE);
  g.poly([-6, -30, 0, -42, 6, -30]).fill(PALETTE.roof).stroke(LINE);
  g.moveTo(0, -42).lineTo(0, -50).moveTo(-3, -47).lineTo(3, -47).stroke(LINE);

  return [{ x: -2, y: -25, w: 4, h: 6 }, { x: -2.5, y: 3, w: 5, h: 7 }];
}

function lantern (g: Graphics): Window[] {
  g.ellipse(3, 14, 8, 3).fill({ color: 0x000000, alpha: 0.45 });
  g.moveTo(0, 14).lineTo(0, -16).stroke({ ...LINE, width: 2 });
  g.moveTo(-5, 14).lineTo(5, 14).stroke(LINE);
  g.rect(-5, -26, 10, 10).fill(PALETTE.warm).stroke(LINE);
  g.poly([-6, -26, 0, -31, 6, -26]).fill(PALETTE.roof).stroke(LINE);

  return [{ x: -5, y: -26, w: 10, h: 10 }];
}

const PAINTERS: Record<BuildingId, (g: Graphics) => Window[]> = {
  lighthouse,
  hut,
  dock,
  renderer,
  oilCollector,
  driftwood,
  salvage,
  infirmary,
  chapel,
  lantern
};

/** Draws the building around its foot point and returns where its windows are, for the night glow. */
export function drawBuilding (g: Graphics, type: BuildingId) {
  return PAINTERS[type](g);
}
