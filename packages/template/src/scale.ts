import Phaser from 'phaser';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from './theme';

export function scaleGame(parent: string): Phaser.Types.Core.ScaleConfig {
  return {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
    parent,
  };
}
