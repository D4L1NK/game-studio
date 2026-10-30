import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import { createSession, isWin, tap } from '../src/game/session';
import { solve } from '../src/game/solver';
import { levelErrors } from '../src/game/progress';
import type { LevelDef } from '../src/game/types';

const impossible: LevelDef = {
  id: 0,
  name: 'buried',
  stacks: [
    ['terracotta', 'teal', 'teal'],
    ['terracotta', 'teal', 'teal'],
    ['terracotta', 'teal', 'teal'],
  ],
  vans: [
    { color: 'terracotta', capacity: 3 },
    { color: 'teal', capacity: 6 },
  ],
  par: 0,
  tag: 'hard',
  minPeak: 5,
};

describe('solver', () => {
  it('rejects a dock that cannot reach the buried parcel', () => {
    const result = solve(impossible, { nodeLimit: 20_000 });
    expect(result.solvable).toBe(false);
    expect(result.limited).toBe(false);
  });

  it('proves every campaign route solvable within its par', () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(30);
    const ids = LEVELS.map((level) => level.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(new Set(ids).size).toBe(LEVELS.length);

    for (const level of LEVELS) {
      expect(levelErrors(level), `${level.id} ${level.name}`).toEqual([]);
      const result = solve(level, { maxPeak: level.par, nodeLimit: 80_000 });
      expect(result.limited, level.name).toBe(false);
      expect(result.solvable, `${level.id} ${level.name}`).toBe(true);
      expect(result.peak).toBeLessThanOrEqual(level.par);
      const session = createSession(level);
      for (const move of result.moves) {
        const played = tap(session, move, false);
        expect(played.ok, `${level.name} move ${move}`).toBe(true);
      }
      expect(isWin(session), level.name).toBe(true);
      expect(session.peakDock).toBeLessThanOrEqual(level.par);
    }
  });
});
