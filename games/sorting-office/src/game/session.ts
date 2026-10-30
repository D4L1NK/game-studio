import type { LevelDef, Parcel, Session, SessionMods, Snapshot, VanView } from './types';

export type Destination = 'van' | 'next' | 'dock' | 'blocked';

export type TapResult =
  | { ok: true; won: boolean; dest: Destination; departed: boolean }
  | { ok: false; reason: 'empty' | 'blocked' };

let parcelSeq = 1;

function copyParcels(parcels: Parcel[]): Parcel[] {
  return parcels.map((parcel) => ({ id: parcel.id, color: parcel.color }));
}

export function createSession(level: LevelDef, mods: SessionMods = {}): Session {
  return {
    stacks: level.stacks.map((column) => column.map((color) => ({ id: parcelSeq++, color }))),
    dock: [],
    vans: level.vans.map((van) => ({ color: van.color, capacity: van.capacity })),
    vanIndex: 0,
    loaded: 0,
    preloaded: level.vans.map(() => 0),
    dockCapacity: mods.dockCapacity ?? 5,
    widerBay: mods.widerBay ?? false,
    moves: 0,
    peakDock: 0,
    history: [],
  };
}

export function destination(session: Session, color: string): Destination {
  const van = session.vans[session.vanIndex];
  if (van && van.color === color && session.loaded < van.capacity) return 'van';
  if (session.widerBay) {
    const next = session.vans[session.vanIndex + 1];
    const preloaded = session.preloaded[session.vanIndex + 1] ?? 0;
    if (next && next.color === color && preloaded < next.capacity) return 'next';
  }
  if (session.dock.length < session.dockCapacity) return 'dock';
  return 'blocked';
}

function snapshot(session: Session): Snapshot {
  return {
    stacks: session.stacks.map(copyParcels),
    dock: copyParcels(session.dock),
    vanIndex: session.vanIndex,
    loaded: session.loaded,
    preloaded: [...session.preloaded],
    moves: session.moves,
    peakDock: session.peakDock,
    dockCapacity: session.dockCapacity,
  };
}

function depart(session: Session): void {
  session.vanIndex += 1;
  if (session.vanIndex < session.vans.length) {
    session.loaded = session.preloaded[session.vanIndex] ?? 0;
    session.preloaded[session.vanIndex] = 0;
  } else {
    session.loaded = 0;
  }
}

/** Pull matching dock parcels onto a van that has just arrived, chaining departures. */
function arrive(session: Session): void {
  let guard = 0;
  while (session.vanIndex < session.vans.length && guard++ < 64) {
    const van = session.vans[session.vanIndex];
    let index = 0;
    while (index < session.dock.length && session.loaded < van.capacity) {
      if (session.dock[index].color === van.color) {
        session.dock.splice(index, 1);
        session.loaded += 1;
      } else {
        index += 1;
      }
    }
    if (session.loaded >= van.capacity && van.capacity > 0) {
      depart(session);
      continue;
    }
    break;
  }
}

export function tap(session: Session, stackIndex: number, recordUndo = true): TapResult {
  const stack = session.stacks[stackIndex];
  if (!stack || stack.length === 0) return { ok: false, reason: 'empty' };
  const parcel = stack[stack.length - 1];
  const dest = destination(session, parcel.color);
  if (dest === 'blocked') return { ok: false, reason: 'blocked' };
  if (recordUndo) {
    session.history.push(snapshot(session));
    if (session.history.length > 40) session.history.shift();
  }
  const before = session.vanIndex;
  stack.pop();
  if (dest === 'van') {
    session.loaded += 1;
    const van = session.vans[before];
    if (van && session.loaded >= van.capacity) {
      depart(session);
      arrive(session);
    }
  } else if (dest === 'next') {
    const nextIndex = session.vanIndex + 1;
    session.preloaded[nextIndex] = (session.preloaded[nextIndex] ?? 0) + 1;
  } else {
    session.dock.push(parcel);
    session.peakDock = Math.max(session.peakDock, session.dock.length);
  }
  session.moves += 1;
  return { ok: true, won: isWin(session), dest, departed: session.vanIndex !== before };
}

export function undo(session: Session): boolean {
  const previous = session.history.pop();
  if (!previous) return false;
  session.stacks = previous.stacks;
  session.dock = previous.dock;
  session.vanIndex = previous.vanIndex;
  session.loaded = previous.loaded;
  session.preloaded = previous.preloaded;
  session.moves = previous.moves;
  session.peakDock = previous.peakDock;
  session.dockCapacity = previous.dockCapacity;
  return true;
}

export function shuffleBoard(session: Session, rng: () => number): boolean {
  const parcels = session.stacks.flat();
  if (parcels.length < 2) return false;
  session.history.push(snapshot(session));
  for (let index = parcels.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    const current = parcels[index];
    parcels[index] = parcels[swap]!;
    parcels[swap] = current!;
  }
  const heights = session.stacks.map((stack) => stack.length);
  let cursor = 0;
  session.stacks = heights.map((height) => parcels.slice(cursor, (cursor += height)));
  return true;
}

export function grantExtraDock(session: Session, amount = 1, max = 8): void {
  session.dockCapacity = Math.min(max, session.dockCapacity + amount);
}

/** Rewarded continue: one more dock berth, and if that is still stuck, hand two parcels back. */
export function continueAfterFail(session: Session): void {
  grantExtraDock(session);
  if (!isStuck(session)) return;
  const returned = session.dock.splice(0, Math.min(2, session.dock.length));
  for (const parcel of returned) session.stacks.push([parcel]);
}

export function legalMoves(session: Session): number[] {
  const moves: number[] = [];
  session.stacks.forEach((stack, index) => {
    const top = stack[stack.length - 1];
    if (top && destination(session, top.color) !== 'blocked') moves.push(index);
  });
  return moves;
}

export function isWin(session: Session): boolean {
  return session.dock.length === 0 && session.stacks.every((stack) => stack.length === 0);
}

export function isStuck(session: Session): boolean {
  return !isWin(session) && legalMoves(session).length === 0;
}

export function parcelsRemaining(session: Session): number {
  return session.dock.length + session.stacks.reduce((sum, stack) => sum + stack.length, 0);
}

export function vanViews(session: Session, preview: number): { current: VanView | null; upcoming: VanView[] } {
  const currentDef = session.vans[session.vanIndex];
  const current = currentDef
    ? {
        color: currentDef.color,
        capacity: currentDef.capacity,
        loaded: session.loaded,
        active: true,
        early: false,
      }
    : null;
  const upcoming: VanView[] = [];
  for (let step = 1; step <= preview; step += 1) {
    const van = session.vans[session.vanIndex + step];
    if (!van) break;
    upcoming.push({
      color: van.color,
      capacity: van.capacity,
      loaded: session.preloaded[session.vanIndex + step] ?? 0,
      active: false,
      early: session.widerBay && step === 1,
    });
  }
  return { current, upcoming };
}

export function cloneSession(session: Session): Session {
  return {
    stacks: session.stacks.map(copyParcels),
    dock: copyParcels(session.dock),
    vans: session.vans,
    vanIndex: session.vanIndex,
    loaded: session.loaded,
    preloaded: [...session.preloaded],
    dockCapacity: session.dockCapacity,
    widerBay: session.widerBay,
    moves: session.moves,
    peakDock: session.peakDock,
    history: [],
  };
}
