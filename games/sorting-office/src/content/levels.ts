import { LEVELS } from './levels.generated';
import type { LevelDef } from '../game/types';

export { LEVELS };

export function levelCount(): number {
  return LEVELS.length;
}

export function getLevel(id: number): LevelDef | undefined {
  return LEVELS.find((level) => level.id === id);
}
