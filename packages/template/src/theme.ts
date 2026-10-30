export interface Theme {
  bgTop: number;
  bgBottom: number;
  ink: number;
  cream: number;
  creamText: string;
  accent: number;
  panel: number;
  wood: number;
  woodDark: number;
  muted: number;
  good: number;
  danger: number;
  fontTitle: string;
  fontBody: string;
}

export const depotTheme: Theme = {
  bgTop: 0xf4e6cf,
  bgBottom: 0xe4d0b0,
  ink: 0x2b241b,
  cream: 0xfff8ee,
  creamText: '#fff8ee',
  accent: 0xd4654a,
  panel: 0xfff8ee,
  wood: 0xc4a574,
  woodDark: 0x8d6a45,
  muted: 0x8a7660,
  good: 0x3e7c59,
  danger: 0xa33b32,
  fontTitle: '"Liberation Serif", Palatino, Georgia, serif',
  fontBody: '"Liberation Sans", "Segoe UI", sans-serif',
};

export const DESIGN_WIDTH = 390;
export const DESIGN_HEIGHT = 844;
