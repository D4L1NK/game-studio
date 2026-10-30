import type Phaser from 'phaser';
import { onTargets, type TargetMap } from '@game-studio/template';

export const SAVE_KEY = 'save';

export interface PublicState {
  levelId: number;
  moves: number;
  dock: number;
  loaded: number;
  remaining: number;
  won: boolean;
  scene: string;
}

let reader: () => Omit<PublicState, 'scene'> | null = () => null;
let targets: TargetMap = {};
let sceneName = 'boot';
let ready = false;

export function setStateReader(read: () => Omit<PublicState, 'scene'> | null): void {
  reader = read;
}

export function installBridge(game: Phaser.Game): void {
  onTargets((published) => {
    sceneName = published.scene;
    targets = published.targets;
    if (published.scene === 'menu') ready = true;
  });

  const api = {
    get ready() {
      return ready;
    },
    get scene() {
      return sceneName;
    },
    getTarget(id: string) {
      const target = targets[id];
      if (!target || !game.canvas) return null;
      const rect = game.canvas.getBoundingClientRect();
      const sx = rect.width / game.scale.width;
      const sy = rect.height / game.scale.height;
      return {
        x: rect.left + target.x * sx,
        y: rect.top + target.y * sy,
        w: target.w * sx,
        h: target.h * sy,
      };
    },
    getState(): PublicState {
      const state = reader();
      return {
        levelId: state?.levelId ?? 0,
        moves: state?.moves ?? 0,
        dock: state?.dock ?? 0,
        loaded: state?.loaded ?? 0,
        remaining: state?.remaining ?? 0,
        won: state?.won ?? false,
        scene: sceneName,
      };
    },
  };

  (window as unknown as { __sortingOffice?: typeof api }).__sortingOffice = api;
}
