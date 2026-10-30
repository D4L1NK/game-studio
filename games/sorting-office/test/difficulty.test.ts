import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/content/levels';
import {
  VERY_HARD_IDS,
  difficultyScore,
  failRate,
  isVeryHardId,
  measureLevel,
  plannedTag,
} from '../src/game/difficulty';
import { solve } from '../src/game/solver';

describe('difficulty curve', () => {
  it('tags every route and keeps bosses on the fives', () => {
    expect(LEVELS.map((level) => level.id)).toEqual(Array.from({ length: 32 }, (_, index) => index + 1));
    for (const level of LEVELS) {
      expect(level.tag, level.name).toBe(plannedTag(level.id));
      expect(level.minPeak).toBe(level.par);
    }
    expect(LEVELS.filter((level) => level.tag === 'very-hard').map((level) => level.id)).toEqual([...VERY_HARD_IDS]);
    expect(LEVELS[0]?.tag).toBe('easy');
    expect(LEVELS[1]?.tag).toBe('easy');
    expect(plannedTag(1)).toBe('easy');
    expect(plannedTag(6)).toBe('easy');
    expect(isVeryHardId(10)).toBe(true);
    expect(isVeryHardId(9)).toBe(false);
  });

  it('proves every route solvable on a 5-slot dock with no boosters', () => {
    for (const level of LEVELS) {
      const result = solve(level, { dockCapacity: 5, widerBay: false, maxPeak: 5, nodeLimit: 80_000 });
      expect(result.limited, level.name).toBe(false);
      expect(result.solvable, `${level.id} ${level.name}`).toBe(true);
      if (level.tag === 'very-hard') {
        const tooEasy = solve(level, { dockCapacity: 5, widerBay: false, maxPeak: 2, nodeLimit: 80_000 });
        expect(tooEasy.solvable, `${level.name} should need more than two dock slots`).toBe(false);
      }
      if (level.id <= 2) {
        expect(level.minPeak, level.name).toBe(0);
      }
    }
  }, 60_000);

  it('makes express routes fail most greedy playouts and sawtooths upward', () => {
    const scores = LEVELS.map((level) => {
      const greedyFail = failRate(level, 'greedy', 40, 2026);
      const randomFail = failRate(level, 'random', 24, 2026);
      if (level.tag === 'very-hard') {
        expect(greedyFail, `${level.id} ${level.name}`).toBeGreaterThanOrEqual(0.7);
        expect(level.minPeak).toBeGreaterThanOrEqual(3);
        expect(level.minPeak).toBeLessThanOrEqual(4);
      }
      return difficultyScore(level.minPeak, greedyFail, randomFail);
    });

    for (const boss of VERY_HARD_IDS) {
      const score = scores[boss - 1] ?? 0;
      expect(score, `boss ${boss} vs previous`).toBeGreaterThan(scores[boss - 2] ?? 0);
      if (boss < 32) expect(scores[boss] ?? 0, `after boss ${boss}`).toBeLessThan(score);
    }

    const early = scores.slice(0, 16).reduce((sum, score) => sum + score, 0) / 16;
    const late = scores.slice(16).reduce((sum, score) => sum + score, 0) / 16;
    expect(late).toBeGreaterThan(early);

    const tags = new Set(LEVELS.map((level) => level.tag));
    expect(tags.has('easy')).toBe(true);
    expect(tags.has('medium')).toBe(true);
    expect(tags.has('hard')).toBe(true);
    expect(tags.has('very-hard')).toBe(true);

    const sample = measureLevel(LEVELS[4]!, 8, 1);
    expect(sample.solvable).toBe(true);
  }, 60_000);
});