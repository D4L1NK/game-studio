export type SymbolKind = 'circle' | 'diamond' | 'star' | 'heart' | 'leaf' | 'hex';

export interface ParcelColor {
  id: string;
  name: string;
  fill: number;
  dark: number;
  symbol: SymbolKind;
}

export const PALETTE: ParcelColor[] = [
  { id: 'terracotta', name: 'Terracotta', fill: 0xd4654a, dark: 0xa84c36, symbol: 'circle' },
  { id: 'teal', name: 'Teal', fill: 0x2a9d8f, dark: 0x1d756b, symbol: 'diamond' },
  { id: 'mustard', name: 'Mustard', fill: 0xe0a83a, dark: 0xb58322, symbol: 'star' },
  { id: 'plum', name: 'Plum', fill: 0x7d5a8c, dark: 0x5c4170, symbol: 'heart' },
  { id: 'forest', name: 'Forest', fill: 0x3e7c59, dark: 0x2c5a40, symbol: 'leaf' },
  { id: 'navy', name: 'Navy', fill: 0x355f8a, dark: 0x244466, symbol: 'hex' },
];

const BY_ID = new Map(PALETTE.map((color) => [color.id, color]));

export function colorOf(id: string): ParcelColor {
  return BY_ID.get(id) ?? PALETTE[0];
}
