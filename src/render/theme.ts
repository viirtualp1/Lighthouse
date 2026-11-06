export const PALETTE = {
  void: 0x060708,
  land: 0x16191d,
  landLight: 0x22272d,
  landDark: 0x0e1013,
  sea: 0x0b0e12,
  seaDeep: 0x040506,
  white: 0xf2f4f5,
  mist: 0x9aa3ad,
  body: 0x121519,
  roof: 0x2a3036,
  warm: 0xffe9c4,
  danger: 0xe0574a,
  good: 0xa8e6c1
};

export function cssColor (value: number, alpha = 1) {
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
