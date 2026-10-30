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
  g.fillRect(0, 0, 390, 520);
  g.fillStyle(theme.bgBottom, 1);
  g.fillRect(0, 520, 390, 324);
  g.fillStyle(theme.wood, 1);
  g.fillRect(0, 700, 390, 144);
  g.lineStyle(2, theme.woodDark, 0.35);
  for (let y = 722; y < 844; y += 22) {
    g.lineBetween(0, y, 390, y);
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
