import { cloneSession, createSession, destination, isWin, legalMoves, tap } from './session';
import type { LevelDef, Session } from './types';

export interface SolveOptions {
  dockCapacity?: number;
  widerBay?: boolean;
  /** Reject branches whose dock peak would exceed this. */
  maxPeak?: number;
  nodeLimit?: number;
}

export interface SolveResult {
  solvable: boolean;
  moves: number[];
  peak: number;
  visited: number;
  limited: boolean;
}

function rankMoves(session: Session, moves: number[]): number[] {
  const vanColor = session.vans[session.vanIndex]?.color;
  const nextColor = session.vans[session.vanIndex + 1]?.color;
  const score = (index: number) => {
    const color = session.stacks[index]?.[session.stacks[index].length - 1]?.color;
    if (color === vanColor) return 0;
    if (color === nextColor) return 1;
    let soon = 8;
    for (let look = session.vanIndex; look < Math.min(session.vans.length, session.vanIndex + 5); look += 1) {
      if (session.vans[look]?.color === color) {
        soon = look - session.vanIndex;
        break;
      }
    }
    return 2 + soon;
  };
  return [...moves].sort((a, b) => score(a) - score(b) || a - b);
}

function hashState(session: Session): string {
  const stacks = session.stacks.map((column) => column.map((parcel) => parcel.color).join('.')).join('|');
  const dock = session.dock
    .map((parcel) => parcel.color)
    .slice()
    .sort()
    .join('.');
  const preloaded = session.preloaded[session.vanIndex + 1] ?? 0;
  return `${stacks}#${dock}#${session.vanIndex}#${session.loaded}#${preloaded}`;
}

/** Depth-first search over the same rules the game plays. */
export function solve(level: LevelDef, options: SolveOptions = {}): SolveResult {
  const session = createSession(level, {
    dockCapacity: options.dockCapacity ?? 5,
    widerBay: options.widerBay ?? false,
  });
  const maxPeak = options.maxPeak ?? session.dockCapacity;
  const limit = options.nodeLimit ?? 200_000;
  const seen = new Set<string>();
  const path: number[] = [];
  let peak = -1;
  let limited = false;

  const dfs = (state: Session): boolean => {
    if (isWin(state)) {
      peak = state.peakDock;
      return true;
    }
    if (seen.size > limit) {
      limited = true;
      return false;
    }
    const key = hashState(state);
    if (seen.has(key)) return false;
    seen.add(key);
    const moves = legalMoves(state).filter((index) => {
      const stack = state.stacks[index];
      const color = stack?.[stack.length - 1]?.color;
      if (!color) return false;
      const dest = destination(state, color);
      return !(dest === 'dock' && state.dock.length + 1 > maxPeak);
    });
    for (const move of rankMoves(state, moves)) {
      const next = cloneSession(state);
      const result = tap(next, move, false);
      if (!result.ok || next.peakDock > maxPeak) continue;
      path.push(move);
      if (dfs(next)) return true;
      path.pop();
    }
    return false;
  };

  const solvable = dfs(session);
  return {
    solvable,
    moves: solvable ? [...path] : [],
    peak: solvable ? peak : -1,
    visited: seen.size,
    limited,
  };
}
