import Phaser from 'phaser';
import { PALETTE, colorOf, type ParcelColor, type SymbolKind } from '../content/palette';

const PARCEL_W = 128;
const PARCEL_H = 140;
const VAN_W = 280;
const VAN_H = 150;

export function parcelKey(colorId: string): string {
  return `depot-parcel-${colorId}`;
}

export function vanKey(colorId: string): string {
  return `depot-van-${colorId}`;
}

export function ensureDepotArt(scene: Phaser.Scene): void {
  if (scene.textures.exists(parcelKey(PALETTE[0]!.id))) return;
  for (const color of PALETTE) {
    bakeParcel(scene, color);
    bakeVan(scene, color);
  }
  if (!scene.textures.exists('depot-spark')) {
    const spark = new Phaser.GameObjects.Graphics(scene);
    spark.fillStyle(0xfff6e4, 1);
    spark.fillCircle(8, 8, 6);
    spark.generateTexture('depot-spark', 16, 16);
    spark.destroy();
  }
}

function bakeParcel(scene: Phaser.Scene, color: ParcelColor): void {
  const g = new Phaser.GameObjects.Graphics(scene);
  g.fillStyle(0x2b241b, 0.2);
  g.fillEllipse(64, 128, 96, 16);

  g.fillStyle(color.dark, 1);
  g.fillRoundedRect(14, 22, 100, 100, 14);
  g.fillStyle(color.fill, 1);
  g.fillRoundedRect(14, 14, 100, 96, 14);
  g.fillStyle(lighten(color.fill), 1);
  g.fillRoundedRect(22, 20, 84, 24, 8);

  g.fillStyle(0xf4e4bc, 0.95);
  g.fillRect(54, 14, 20, 100);
  g.fillStyle(0xe7d3a1, 0.95);
  g.fillRect(20, 62, 88, 12);
  g.fillStyle(0xc4a574, 0.55);
  g.fillCircle(64, 68, 2.6);

  g.fillStyle(0xfff8ee, 0.96);
  g.fillRoundedRect(22, 78, 46, 30, 5);
  g.lineStyle(2, color.dark, 0.35);
  g.strokeRoundedRect(22, 78, 46, 30, 5);

  g.fillStyle(0xfff8ee, 1);
  drawSymbol(g, 92, 42, color.symbol, 13);
  g.lineStyle(3, 0xfff8ee, 0.9);
  g.strokeCircle(92, 42, 18);

  g.generateTexture(parcelKey(color.id), PARCEL_W, PARCEL_H);
  g.destroy();
}

function bakeVan(scene: Phaser.Scene, color: ParcelColor): void {
  const g = new Phaser.GameObjects.Graphics(scene);
  g.fillStyle(0x2b241b, 0.18);
  g.fillEllipse(150, 132, 210, 24);

  g.fillStyle(0x2c2416, 1);
  g.fillRoundedRect(18, 38, 86, 78, 16);
  g.fillStyle(color.fill, 1);
  g.fillRoundedRect(78, 28, 176, 88, 18);
  g.fillStyle(color.dark, 1);
  g.fillRect(78, 28, 10, 88);
  g.fillStyle(lighten(color.fill), 0.55);
  g.fillRoundedRect(96, 38, 70, 22, 6);

  g.fillStyle(0xd7e4ea, 1);
  g.fillRoundedRect(30, 50, 46, 32, 8);
  g.fillStyle(0xffffff, 0.55);
  g.fillRoundedRect(36, 54, 16, 8, 3);

  g.fillStyle(0xfff8ee, 1);
  g.fillCircle(24, 78, 5);
  g.fillStyle(0xf0c14a, 1);
  g.fillRoundedRect(236, 58, 10, 16, 3);

  g.fillStyle(0x241c14, 1);
  g.fillCircle(78, 118, 18);
  g.fillCircle(214, 118, 18);
  g.fillStyle(0xc4a574, 1);
  g.fillCircle(78, 118, 8);
  g.fillCircle(214, 118, 8);

  g.generateTexture(vanKey(color.id), VAN_W, VAN_H);
  g.destroy();
}

function lighten(color: number): number {
  const r = Math.min(255, ((color >> 16) & 255) + 36);
  const g = Math.min(255, ((color >> 8) & 255) + 28);
  const b = Math.min(255, (color & 255) + 22);
  return (r << 16) | (g << 8) | b;
}

function drawSymbol(g: Phaser.GameObjects.Graphics, cx: number, cy: number, kind: SymbolKind, radius: number): void {
  if (kind === 'circle') {
    g.fillCircle(cx, cy, radius * 0.72);
    return;
  }
  if (kind === 'diamond') {
    g.fillPoints(
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
      const arm = i % 2 === 0 ? radius : radius * 0.42;
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      points.push({ x: cx + Math.cos(angle) * arm, y: cy + Math.sin(angle) * arm });
    }
    g.fillPoints(points, true);
    return;
  }
  if (kind === 'heart') {
    g.fillCircle(cx - radius * 0.36, cy - radius * 0.12, radius * 0.42);
    g.fillCircle(cx + radius * 0.36, cy - radius * 0.12, radius * 0.42);
    g.fillTriangle(cx - radius, cy, cx + radius, cy, cx, cy + radius);
    return;
  }
  if (kind === 'leaf') {
    g.fillEllipse(cx, cy, radius * 1.15, radius * 1.7);
    return;
  }
  const hex: Phaser.Types.Math.Vector2Like[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 3;
    hex.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
  }
  g.fillPoints(hex, true);
}

export function drawAwning(graphics: Phaser.GameObjects.Graphics, y: number, height: number): void {
  graphics.fillStyle(0x8d3d32, 1);
  graphics.fillRect(0, y, 390, height);
  graphics.fillStyle(0xf6efe4, 1);
  const stripe = 26;
  for (let x = 0; x < 390; x += stripe * 2) graphics.fillRect(x, y, stripe, height);
  graphics.fillStyle(0x2b241b, 1);
  graphics.fillRect(0, y + height - 8, 390, 8);
  graphics.fillStyle(0xc4a574, 1);
  for (let x = 18; x < 390; x += 48) graphics.fillCircle(x, y + height - 2, 3);
}

export { colorOf };
