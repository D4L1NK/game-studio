import Phaser from 'phaser';
import type { Theme } from '../theme';

export interface ButtonHandle {
  container: Phaser.GameObjects.Container;
  setLabel: (label: string) => void;
  setEnabled: (on: boolean) => void;
  destroy: () => void;
}

export function addButton(
  scene: Phaser.Scene,
  opts: {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    onClick: () => void;
    theme: Theme;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    fontSize?: number;
  },
): ButtonHandle {
  const variant = opts.variant ?? 'primary';
  const container = scene.add.container(opts.x, opts.y);
  const g = scene.add.graphics();
  const text = scene.add
    .text(0, 0, opts.label, {
      fontFamily: opts.theme.fontBody,
      fontSize: `${opts.fontSize ?? 20}px`,
      color: variant === 'primary' || variant === 'danger' ? opts.theme.creamText : '#2b241b',
      fontStyle: '600',
    })
    .setOrigin(0.5);

  const paint = (hover: boolean, enabled: boolean) => {
    g.clear();
    const fill =
      variant === 'primary' ? opts.theme.accent : variant === 'danger' ? opts.theme.danger : opts.theme.panel;
    if (variant !== 'ghost') {
      g.fillStyle(opts.theme.ink, enabled ? 0.12 : 0.05);
      g.fillRoundedRect(-opts.width / 2, -opts.height / 2 + 3, opts.width, opts.height, 16);
    }
    if (variant === 'ghost') {
      g.fillStyle(opts.theme.cream, enabled ? (hover ? 0.35 : 0.12) : 0.08);
    } else {
      g.fillStyle(enabled ? fill : opts.theme.muted, enabled ? 1 : 0.4);
    }
    g.fillRoundedRect(-opts.width / 2, -opts.height / 2, opts.width, opts.height, 16);
    if (variant === 'secondary' || variant === 'ghost') {
      g.lineStyle(2, opts.theme.ink, enabled ? 0.8 : 0.25);
      g.strokeRoundedRect(-opts.width / 2 + 1, -opts.height / 2 + 1, opts.width - 2, opts.height - 2, 15);
    }
  };

  let enabled = true;
  paint(false, true);
  container.add([g, text]);
  container.setSize(opts.width, opts.height);
  // Hit area is top-left based. Phaser offsets the test by the container origin.
  container.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, opts.width, opts.height),
    Phaser.Geom.Rectangle.Contains,
  );
  container.on('pointerover', () => paint(true, enabled));
  container.on('pointerout', () => paint(false, enabled));
  container.on('pointerup', () => {
    if (!enabled) return;
    opts.onClick();
  });

  return {
    container,
    setLabel: (label) => text.setText(label),
    setEnabled: (on) => {
      enabled = on;
      paint(false, on);
    },
    destroy: () => container.destroy(),
  };
}

export function paintBackdrop(scene: Phaser.Scene, theme: Theme): void {
  const g = scene.add.graphics();
  g.fillStyle(theme.bgTop, 1);
  g.fillRect(0, 0, 390, 844);
  g.fillStyle(0xf7edd8, 1);
  g.fillRect(0, 0, 390, 168);
  g.fillStyle(theme.bgBottom, 1);
  g.fillRect(0, 168, 390, 532);

  g.fillStyle(0xe7d3b0, 0.65);
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const x = 16 + col * 46;
      const y = 188 + row * 36;
      g.fillRoundedRect(x, y, 38, 26, 4);
      g.fillStyle(0xf6efe4, 0.35);
      g.fillRoundedRect(x + 4, y + 4, 30, 8, 2);
      g.fillStyle(0xe7d3b0, 0.65);
    }
  }

  g.fillStyle(0xf6e7c1, 0.28);
  g.fillEllipse(300, 120, 180, 90);

  g.fillStyle(theme.woodDark, 1);
  g.fillRect(0, 688, 390, 10);
  g.fillStyle(theme.wood, 1);
  g.fillRect(0, 698, 390, 146);
  g.lineStyle(2, theme.woodDark, 0.28);
  for (let y = 718; y < 844; y += 18) g.lineBetween(0, y, 390, y);
  g.fillStyle(0x8d6a45, 0.35);
  for (let x = 28; x < 390; x += 64) {
    g.fillCircle(x, 742, 2);
    g.fillCircle(x + 18, 796, 2);
  }
}

export function addPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  theme: Theme,
  radius = 18,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x2b241b, 0.08);
  g.fillRoundedRect(x + 2, y + 4, width, height, radius);
  g.fillStyle(theme.panel, 1);
  g.fillRoundedRect(x, y, width, height, radius);
  g.lineStyle(2, theme.ink, 0.08);
  g.strokeRoundedRect(x, y, width, height, radius);
  return g;
}
