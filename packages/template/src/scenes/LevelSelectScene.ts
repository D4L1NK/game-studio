import Phaser from 'phaser';
import { SoundManager } from '../audio/SoundManager';
import { readShell } from '../shell';
import { SOUND_KEY } from './MenuScene';
import { paintBackdrop } from '../ui/widgets';
import { publishTargets, type TargetMap } from '../targets';

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'levels', active: false });
  }

  create(): void {
    const shell = readShell(this);
    const theme = shell.theme;
    const sound = this.registry.get(SOUND_KEY) as SoundManager;
    paintBackdrop(this, theme);

    this.add
      .text(56, 48, 'Routes', {
        fontFamily: theme.fontTitle,
        fontSize: '34px',
        color: '#2b241b',
      })
      .setOrigin(0, 0.5);

    const back = this.add
      .text(330, 48, 'Back', {
        fontFamily: theme.fontBody,
        fontSize: '18px',
        color: '#2b241b',
        backgroundColor: '#fff8ee',
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    back.on('pointerup', () => {
      sound.play('ui');
      this.scene.start('menu');
    });

    const levels = shell.getLevels();
    const cols = 4;
    const cellW = 78;
    const cellH = 92;
    const gapX = 10;
    const gapY = 12;
    const originX = 36;
    const originY = 100;
    const content = this.add.container(0, 0);
    const targets: TargetMap = {
      back: { x: 330, y: 48, w: 72, h: 36 },
    };

    levels.forEach((level, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = originX + col * (cellW + gapX) + cellW / 2;
      const y = originY + row * (cellH + gapY) + cellH / 2;
      const unlocked = shell.isUnlocked(level.id);
      const stars = shell.starsFor(level.id);
      const express = level.tag === 'very-hard';
      const g = this.add.graphics();
      g.fillStyle(unlocked ? theme.panel : 0xe7d7c0, 1);
      g.fillRoundedRect(-cellW / 2, -cellH / 2, cellW, cellH, 14);
      g.lineStyle(express ? 3 : 2, express ? theme.danger : theme.ink, unlocked ? (express ? 0.95 : 0.12) : 0.2);
      g.strokeRoundedRect(-cellW / 2 + 1, -cellH / 2 + 1, cellW - 2, cellH - 2, 13);
      const bits: Phaser.GameObjects.GameObject[] = [g];
      if (express) {
        const badge = this.add
          .text(0, -cellH / 2 + 14, 'EXPRESS', {
            fontFamily: theme.fontBody,
            fontSize: '9px',
            color: '#fff8ee',
            backgroundColor: '#a33b32',
            padding: { x: 4, y: 2 },
            fontStyle: '700',
          })
          .setOrigin(0.5);
        bits.push(badge);
      }
      const label = this.add
        .text(0, express ? -4 : -12, unlocked ? String(level.id) : '·', {
          fontFamily: theme.fontTitle,
          fontSize: '26px',
          color: unlocked ? '#2b241b' : '#a89480',
        })
        .setOrigin(0.5);
      const starText = this.add
        .text(0, 22, '★'.repeat(stars) + '☆'.repeat(Math.max(0, 3 - stars)), {
          fontFamily: theme.fontBody,
          fontSize: '12px',
          color: stars > 0 ? '#c4842a' : '#b5a28c',
        })
        .setOrigin(0.5);
      const cell = this.add.container(x, y, [...bits, label, starText]);
      content.add(cell);
      if (unlocked) {
        cell.setSize(cellW, cellH);
        cell.setInteractive(
          new Phaser.Geom.Rectangle(0, 0, cellW, cellH),
          Phaser.Geom.Rectangle.Contains,
        );
        cell.on('pointerup', (pointer: Phaser.Input.Pointer) => {
          if (moved || pointer.y < viewTop || pointer.y > viewBottom) return;
          sound.play('ui');
          shell.startLevel(this, level.id);
        });
        targets[`level-${level.id}`] = { x, y, w: cellW, h: cellH };
      }
    });

    const viewTop = 88;
    const viewBottom = 618;
    const rows = Math.ceil(levels.length / cols);
    const contentHeight = originY + rows * (cellH + gapY) + 24;
    const minY = Math.min(0, viewBottom - 16 - contentHeight);
    let dragY = 0;
    let startPointer = 0;
    let startContent = 0;
    let moved = false;
    let dragging = false;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      moved = false;
      dragging = p.y >= viewTop && p.y <= viewBottom;
      if (!dragging) return;
      dragY = p.y;
      startPointer = p.y;
      startContent = content.y;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!dragging || !p.isDown) return;
      if (Math.abs(p.y - startPointer) > 8) moved = true;
      content.y = Phaser.Math.Clamp(startContent + (p.y - dragY), minY, 0);
    });
    this.input.on('pointerup', () => {
      dragging = false;
    });
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      content.y = Phaser.Math.Clamp(content.y - dy, minY, 0);
    });

    const maskG = new Phaser.GameObjects.Graphics(this);
    maskG.fillStyle(0xffffff, 1);
    maskG.fillRect(0, viewTop, 390, viewBottom - viewTop);
    content.setMask(maskG.createGeometryMask());

    publishTargets('levels', targets);
  }
}
