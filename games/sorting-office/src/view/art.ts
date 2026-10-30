import Phaser from 'phaser';
import { colorOf, type SymbolKind } from '../content/palette';

export function drawParcel(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  colorId: string,
  buried: boolean,
): void {
  const color = colorOf(colorId);
  const shade = buried ? 0.78 : 1;
  graphics.fillStyle(color.dark, shade);
  graphics.fillRoundedRect(x + 2, y + 3, width, height, 10);
  graphics.fillStyle(color.fill, shade);
  graphics.fillRoundedRect(x, y, width, height, 10);
  const symbolY = buried ? y + height - 13 : y + height * 0.42;
  if (!buried) {
    graphics.fillStyle(0xfff8ee, 0.85);
    graphics.fillRect(x + 7, y + height * 0.62, width - 14, 5);
  }
  graphics.fillStyle(0xfff8ee, buried ? 0.9 : 0.95);
  drawSymbol(graphics, x + width / 2, symbolY, color.symbol, buried ? 5 : 6.5);
  if (!buried) {
    graphics.lineStyle(2, 0xfff8ee, 0.35);
    graphics.strokeRoundedRect(x + 1.5, y + 1.5, width - 3, height - 3, 9);
  }
}

function drawSymbol(
  graphics: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  kind: SymbolKind,
  radius: number,
): void {
  if (kind === 'circle') {
    graphics.fillCircle(cx, cy, radius);
    return;
  }
  if (kind === 'diamond') {
    graphics.fillPoints(
      [
        { x: cx, y: cy - radius },
        { x: cx + radius, y: cy },
        { x: cx, y: cy + radius },
        { x: cx - radius, y: cy },
      ],
      true,
    );
    return;
  }
  if (kind === 'star') {
    const points: Phaser.Types.Math.Vector2Like[] = [];
    for (let i = 0; i < 10; i += 1) {
      const arm = i % 2 === 0 ? radius : radius * 0.45;
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      points.push({ x: cx + Math.cos(angle) * arm, y: cy + Math.sin(angle) * arm });
    }
    graphics.fillPoints(points, true);
    return;
  }
  if (kind === 'heart') {
    graphics.fillCircle(cx - radius * 0.38, cy - radius * 0.2, radius * 0.42);
    graphics.fillCircle(cx + radius * 0.38, cy - radius * 0.2, radius * 0.42);
    graphics.fillTriangle(cx - radius, cy - radius * 0.05, cx + radius, cy - radius * 0.05, cx, cy + radius);
    return;
  }
  if (kind === 'leaf') {
    graphics.fillEllipse(cx, cy, radius * 1.3, radius * 1.8);
    graphics.fillStyle(0x2c5a40, 0.35);
    graphics.fillRect(cx - 0.8, cy - radius, 1.6, radius * 2);
    return;
  }
  const hex: Phaser.Types.Math.Vector2Like[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 3;
    hex.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
  }
  graphics.fillPoints(hex, true);
}

export function drawVan(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  colorId: string,
): void {
  const color = colorOf(colorId);
  const cabW = Math.max(18, width * 0.28);
  graphics.fillStyle(0x2b241b, 1);
  graphics.fillRoundedRect(x, y + height * 0.18, width, height * 0.62, 8);
  graphics.fillStyle(color.fill, 1);
  graphics.fillRoundedRect(x + cabW, y + height * 0.18, width - cabW - 4, height * 0.62, 8);
  graphics.fillStyle(0xfff8ee, 0.9);
  graphics.fillRoundedRect(x + 6, y + height * 0.3, cabW * 0.55, height * 0.28, 3);
  graphics.fillStyle(0x2b241b, 1);
  const wheel = Math.max(4, height * 0.14);
  graphics.fillCircle(x + cabW * 0.7, y + height * 0.84, wheel);
  graphics.fillCircle(x + width * 0.72, y + height * 0.84, wheel);
  graphics.fillStyle(0xc4a574, 1);
  graphics.fillCircle(x + cabW * 0.7, y + height * 0.84, wheel * 0.45);
  graphics.fillCircle(x + width * 0.72, y + height * 0.84, wheel * 0.45);
}

export function drawAwning(graphics: Phaser.GameObjects.Graphics, y: number, height: number): void {
  graphics.fillStyle(0x8d3d32, 1);
  graphics.fillRect(0, y, 390, height);
  graphics.fillStyle(0xf4e6cf, 1);
  const stripe = 28;
  for (let x = 0; x < 390; x += stripe * 2) {
    graphics.fillRect(x, y, stripe, height);
  }
  graphics.fillStyle(0x2b241b, 1);
  graphics.fillRect(0, y + height - 6, 390, 6);
}
