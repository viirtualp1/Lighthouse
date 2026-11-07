/**
 * Draws the app's own artwork from code: the icon (app, favicon, touch icon) and the macOS installer background.
 * Run with `bun run art`; the results are committed, so builds and CI never need the renderer.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

interface Eye {
  x: number;
  y: number;
  size: number;
  open: number;
}

const WARM = '#ffe9c4';
const HOT = '#ffcf8a';
const SNOW = '#f2f4f5';
const BODY = '#121519';
const ROOF = '#2a3036';

const ICON_SIZE = 1024;
const DMG = { width: 660, height: 400 };
const APP_SLOT = { x: 150, y: 200 };
const APPLICATIONS_SLOT = { x: 510, y: 200 };
/** Where Finder puts the label's centre below a 96-pixel icon. */
const LABEL_OFFSET = 63;

/** Pairs of eyes in the dark around the installer, some wide open, some half shut. */
const EYES: Eye[] = [
  { x: 52, y: 62, size: 1.1, open: 1 },
  { x: 128, y: 34, size: 0.8, open: 0.5 },
  { x: 596, y: 54, size: 1, open: 1 },
  { x: 628, y: 132, size: 0.75, open: 0.6 },
  { x: 36, y: 318, size: 0.9, open: 0.7 },
  { x: 612, y: 330, size: 1.15, open: 1 },
  { x: 250, y: 30, size: 0.65, open: 1 },
  { x: 452, y: 26, size: 0.7, open: 0.45 },
  { x: 92, y: 364, size: 0.7, open: 1 }
];

/** The Lighthouse exactly as the map draws it, foot at 0,16 and lamp at 0,-56, in the game's own units. */
function lighthouse (stroke: number) {
  const line = `stroke="${SNOW}" stroke-width="${stroke}" stroke-linejoin="round" stroke-opacity="0.9"`;

  return `
    <ellipse cx="0" cy="16" rx="30" ry="10" fill="${BODY}" ${line}/>
    <polygon points="-11,16 -7,-46 7,-46 11,16" fill="${BODY}" ${line}/>
    <polygon points="-9.6,-5 -8.9,-15 8.9,-15 9.6,-5" fill="${SNOW}" fill-opacity="0.88"/>
    <polygon points="-8.2,-26 -7.6,-35 7.6,-35 8.2,-26" fill="${SNOW}" fill-opacity="0.88"/>
    <rect x="-11" y="-50" width="22" height="4" fill="${BODY}" ${line}/>
    <rect x="-6" y="-62" width="12" height="12" fill="${WARM}" ${line}/>
    <polygon points="-8,-62 0,-72 8,-62" fill="${ROOF}" ${line}/>
    <rect x="-2" y="6" width="4" height="10" fill="#060708"/>`;
}

/** Soft blades of light leaving the lamp, fading with distance. */
function beam (id: string, from: { x: number; y: number }, to: { x: number; y: number }, spread: number) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const a = { x: from.x + Math.cos(angle - spread) * length, y: from.y + Math.sin(angle - spread) * length };
  const b = { x: from.x + Math.cos(angle + spread) * length, y: from.y + Math.sin(angle + spread) * length };

  return `
    <linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}">
      <stop offset="0" stop-color="${WARM}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${WARM}" stop-opacity="0"/>
    </linearGradient>
    <polygon points="${from.x},${from.y} ${a.x},${a.y} ${b.x},${b.y}" fill="url(#${id})"/>`;
}

function eyes (list: Eye[]) {
  return list.map(({ x, y, size, open }) => {
    const rx = 3.2 * size;
    const ry = 1.5 * size * open;
    const gap = 5.5 * size;

    return `
      <g opacity="${0.55 + open * 0.35}">
        <ellipse cx="${x - gap}" cy="${y}" rx="${rx}" ry="${ry}" fill="#d8e4ff"/>
        <ellipse cx="${x + gap}" cy="${y}" rx="${rx}" ry="${ry}" fill="#d8e4ff"/>
      </g>`;
  }).join('');
}

function iconSvg () {
  const scale = 6.4;
  const foot = { x: 512, y: 700 };
  const lamp = { x: foot.x, y: foot.y + (-56 - 16) * scale };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON_SIZE} ${ICON_SIZE}">
  <defs>
    <radialGradient id="sky" cx="50%" cy="32%" r="75%">
      <stop offset="0" stop-color="#2a3138"/>
      <stop offset="0.55" stop-color="#0e1114"/>
      <stop offset="1" stop-color="#040506"/>
    </radialGradient>
    <radialGradient id="halo" cx="${lamp.x}" cy="${lamp.y}" r="260" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${HOT}" stop-opacity="0.75"/>
      <stop offset="0.3" stop-color="${WARM}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${WARM}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="tile"><rect x="100" y="100" width="824" height="824" rx="186"/></clipPath>
  </defs>
  <g clip-path="url(#tile)">
    <rect x="100" y="100" width="824" height="824" fill="url(#sky)"/>
    ${beam('left', lamp, { x: 60, y: lamp.y - 40 }, 0.16)}
    ${beam('right', lamp, { x: 964, y: lamp.y - 40 }, 0.16)}
    <circle cx="${lamp.x}" cy="${lamp.y}" r="260" fill="url(#halo)"/>
    <g transform="translate(${foot.x} ${foot.y - 16 * scale}) scale(${scale})">${lighthouse(1.5)}</g>
  </g>
  <rect x="100.5" y="100.5" width="823" height="823" rx="186" fill="none" stroke="${SNOW}" stroke-opacity="0.1"/>
</svg>`;
}

/** The installer window: the Lighthouse between the app and Applications, its beam pointing the way across. */
function dmgSvg () {
  const { width, height } = DMG;
  const scale = 2;
  const foot = { x: width / 2, y: 262 };
  const lamp = { x: foot.x, y: foot.y + (-56 - 16) * scale };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <defs>
    <radialGradient id="night" cx="50%" cy="35%" r="80%">
      <stop offset="0" stop-color="#1d2329"/>
      <stop offset="0.6" stop-color="#0a0c0f"/>
      <stop offset="1" stop-color="#030304"/>
    </radialGradient>
    <radialGradient id="halo" cx="${lamp.x}" cy="${lamp.y}" r="150" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${HOT}" stop-opacity="0.7"/>
      <stop offset="0.35" stop-color="${WARM}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${WARM}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="pool" cx="${foot.x}" cy="${foot.y + 30}" r="230" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${WARM}" stop-opacity="0.14"/>
      <stop offset="1" stop-color="${WARM}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#night)"/>
  ${eyes(EYES)}
  <ellipse cx="${foot.x}" cy="${foot.y + 30}" rx="230" ry="120" fill="url(#pool)"/>
  ${beam('toApps', lamp, { x: APPLICATIONS_SLOT.x - 20, y: APPLICATIONS_SLOT.y - 6 }, 0.11)}
  ${beam('back', lamp, { x: APP_SLOT.x + 60, y: APP_SLOT.y - 30 }, 0.07)}
  <circle cx="${lamp.x}" cy="${lamp.y}" r="150" fill="url(#halo)"/>
  <path d="M0 ${height - 46} Q ${width * 0.3} ${height - 66} ${width / 2} ${height - 52} T ${width} ${height - 50} L ${width} ${height} L 0 ${height} Z" fill="#06080a"/>
  <path d="M0 ${height - 46} Q ${width * 0.3} ${height - 66} ${width / 2} ${height - 52} T ${width} ${height - 50}" fill="none" stroke="${SNOW}" stroke-opacity="0.35" stroke-width="1"/>
  <path d="M0 ${height - 36} Q ${width * 0.3} ${height - 54} ${width / 2} ${height - 42} T ${width} ${height - 40}" fill="none" stroke="${SNOW}" stroke-opacity="0.12" stroke-width="1" stroke-dasharray="40 18"/>
  <ellipse cx="${foot.x + 4}" cy="${foot.y + 4}" rx="${40 * scale}" ry="${10 * scale}" fill="#000" opacity="0.5"/>
  <g transform="translate(${foot.x} ${foot.y - 16 * scale}) scale(${scale})">${lighthouse(1.3)}</g>
  ${[APP_SLOT, APPLICATIONS_SLOT].map(labelPlate).join('')}
  <g fill="none" stroke="${WARM}" stroke-opacity="0.55" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M${APPLICATIONS_SLOT.x - 92} ${APPLICATIONS_SLOT.y + 64} l8 -8 -8 -8"/>
    <path d="M${APPLICATIONS_SLOT.x - 80} ${APPLICATIONS_SLOT.y + 64} l8 -8 -8 -8" stroke-opacity="0.3"/>
  </g>
</svg>`;
}

/**
 * Finder draws icon labels in the system's text colour, black in light mode and white in dark mode, and a DMG cannot
 * change it. A mid-grey plate under each label keeps either colour readable on the night background.
 */
function labelPlate (slot: { x: number; y: number }) {
  const y = slot.y + LABEL_OFFSET;

  return `<rect x="${slot.x - 70}" y="${y - 12}" width="140" height="24" rx="5" fill="#808991" fill-opacity="0.92" stroke="${SNOW}" stroke-opacity="0.25"/>`;
}

function png (svg: string, width: number) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: width }, background: 'rgba(0,0,0,0)' }).render().asPng();
}

function main () {
  mkdirSync('build', { recursive: true });
  mkdirSync('public', { recursive: true });

  const icon = iconSvg();
  const dmg = dmgSvg();

  writeFileSync('public/favicon.svg', icon);
  writeFileSync('public/apple-touch-icon.png', png(icon, 180));
  writeFileSync('build/icon.png', png(icon, ICON_SIZE));
  writeFileSync('build/background.png', png(dmg, DMG.width));
  writeFileSync('build/background@2x.png', png(dmg, DMG.width * 2));
}

main();
