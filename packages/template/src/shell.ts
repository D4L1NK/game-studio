import type Phaser from 'phaser';
import type { Theme } from './theme';

export interface LevelBadge {
  id: number;
  name: string;
}

export interface ShellProgress {
  coins: number;
  sound: boolean;
  dailyClaimable: boolean;
  continueLevel: number;
  continueLabel: string;
}

export interface ShellConfig {
  title: string;
  tagline: string;
  theme: Theme;
  getProgress: () => ShellProgress;
  getLevels: () => LevelBadge[];
  starsFor: (levelId: number) => number;
  isUnlocked: (levelId: number) => boolean;
  setSound: (on: boolean) => void;
  resetSave: () => void;
  startLevel: (scene: Phaser.Scene, levelId: number) => void;
  openDepot: (scene: Phaser.Scene) => void;
  openDaily: (scene: Phaser.Scene) => void;
  /** Optional extra drawing on the menu, in design coordinates. */
  decorateMenu?: (scene: Phaser.Scene) => void;
}

export const SHELL_KEY = 'shell-config';

export function readShell(scene: Phaser.Scene): ShellConfig {
  const config = scene.registry.get(SHELL_KEY) as ShellConfig | undefined;
  if (!config) throw new Error('Shell config missing from registry');
  return config;
}
