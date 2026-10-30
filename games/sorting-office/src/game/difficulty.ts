import { createSession, isWin, legalMoves, tap } from './session';
import { solve } from './solver';
import type { DifficultyTag, LevelDef } from './types';

export const VERY_HARD_IDS = [5, 10, 15, 20, 25, 30] as const;

const CLIMB: DifficultyTag[][] = [
  ['easy', 'easy', 'easy', 'medium'],
  ['easy', 'medium', 'hard', 'medium'],
  ['medium', 'hard', 'medium', 'hard'],
  ['medium', 'hard', 'medium', 'hard'],
  ['hard', 'medium', 'hard', 'medium'],
  ['hard', 'medium', 'hard', 'hard'],
];

/** The intended tag. Bosses are every 5th route. The others sawtooth, and the floor rises. */
export function plannedTag(id: number): DifficultyTag {
  if (id >= 31) return 'hard';
  if ((VERY_HARD_IDS as readonly number[]).includes(id)) return 'very-hard';
  const cycle = Math.floor((id - 1) / 5);
  const pos = (id - 1) % 5;
  return CLIMB[cycle]?.[pos] ?? 'hard';
}

export function isVeryHardId(id: number): boolean {
  return (VERY_HARD_IDS as readonly number[]).includes(id);
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DifficultyMeasure {
  solvable: boolean;
  limited: boolean;
  /** Minimum dock peak with 5 slots and no wider bay. -1 when unsolvable. */
  minPeak: number;
  /** Share of greedy playouts that do not clear. */
  greedyFail: number;
  /** Share of uniform random playouts that do not clear. */
  randomFail: number;
  /** Nodes visited while searching for the minimum peak. */
  visited: number;
  /** Composite used to check the sawtooth and the rising curve. */
  score: number;
}

export function difficultyScore(minPeak: number, greedyFail: number, randomFail: number): number {
  return minPeak * 14 + greedyFail * 10 + randomFail * 4;
}

function playout(level: LevelDef, rng: () => number, policy: 'greedy' | 'random'): boolean {
  const session = createSession(level, { dockCapacity: 5, widerBay: false });
  const limit = level.stacks.reduce((sum, stack) => sum + stack.length, 0) + 2;
  for (let step = 0; step < limit; step += 1) {
    if (isWin(session)) return true;
    const moves = legalMoves(session);
    if (moves.length === 0) return false;
    let pool = moves;
    if (policy === 'greedy') {
      const van = session.vans[session.vanIndex]?.color;
      const matches = moves.filter((index) => {
        const stack = session.stacks[index];
        return stack?.[stack.length - 1]?.color === van;
      });
      if (matches.length > 0) pool = matches;
    }
    const choice = pool[Math.floor(rng() * pool.length)] ?? pool[0]!;
    const result = tap(session, choice, false);
    if (!result.ok) return false;
  }
  return isWin(session);
}

export function failRate(
  level: LevelDef,
  policy: 'greedy' | 'random',
  trials: number,
  seed: number,
): number {
  let fails = 0;
  for (let trial = 0; trial < trials; trial += 1) {
    const rng = mulberry32(seed + trial * 9973 + (policy === 'random' ? 101 : 0));
    if (!playout(level, rng, policy)) fails += 1;
  }
  return fails / trials;
}

/** Minimum peak, then greedy and random fail rates. Base rules only: 5-slot dock, no wider bay. */
export function measureLevel(level: LevelDef, trials = 24, seed = 20261030): DifficultyMeasure {
  let visited = 0;
  let minPeak = -1;
  let limited = false;
  for (let peak = 0; peak <= 5; peak += 1) {
    const result = solve(level, { maxPeak: peak, dockCapacity: 5, widerBay: false, nodeLimit: 80_000 });
    visited += result.visited;
    if (result.limited) {
      limited = true;
      break;
    }
    if (result.solvable) {
      minPeak = peak;
      break;
    }
  }
  const solvable = minPeak >= 0 && !limited;
  const greedyFail = solvable ? failRate(level, 'greedy', trials, seed) : 1;
  const randomFail = solvable ? failRate(level, 'random', trials, seed + 17) : 1;
  return {
    solvable,
    limited,
    minPeak,
    greedyFail,
    randomFail,
    visited,
    score: solvable ? difficultyScore(minPeak, greedyFail, randomFail) : -1,
  };
}

export function expressBlurb(): string {
  return 'Express route. The dock has almost no slack, and the obvious parcel can be the wrong one.';
}
