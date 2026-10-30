import { describe, expect, it } from 'vitest';
import { createSession, continueAfterFail, destination, isStuck, isWin, shuffleBoard, tap, undo } from '../src/game/session';
import type { LevelDef } from '../src/game/types';

const autoload: LevelDef = {
  id: 50,
  name: 'autoload',
  stacks: [['terracotta', 'teal'], ['terracotta'], ['terracotta']],
  vans: [
    { color: 'terracotta', capacity: 3 },
    { color: 'teal', capacity: 1 },
  ],
  par: 1,
};

describe('session rules', () => {
  it('loads a matching parcel and sends a mismatch to the dock', () => {
    const session = createSession(autoload);
    expect(tap(session, 1)).toMatchObject({ ok: true, dest: 'van' });
    expect(session.loaded).toBe(1);
    expect(session.dock).toHaveLength(0);
    expect(tap(session, 0)).toMatchObject({ ok: true, dest: 'dock' });
    expect(session.dock.map((parcel) => parcel.color)).toEqual(['teal']);
    expect(session.peakDock).toBe(1);
  });

  it('autoloads the dock when a matching van arrives', () => {
    const session = createSession(autoload);
    expect(tap(session, 1).ok).toBe(true);
    expect(tap(session, 0).ok).toBe(true);
    expect(tap(session, 2).ok).toBe(true);
    const last = tap(session, 0);
    expect(last).toMatchObject({ ok: true, won: true, departed: true });
    expect(isWin(session)).toBe(true);
    expect(session.dock).toHaveLength(0);
  });

  it('fails when the dock is full and nothing matches the van', () => {
    const level: LevelDef = {
      id: 51,
      name: 'overflow',
      stacks: [['terracotta', 'teal'], ['teal'], ['teal'], ['teal'], ['teal'], ['teal']],
      vans: [
        { color: 'terracotta', capacity: 1 },
        { color: 'teal', capacity: 6 },
      ],
      par: 5,
    };
    const session = createSession(level);
    for (const index of [1, 2, 3, 4, 5]) expect(tap(session, index).ok).toBe(true);
    expect(session.dock).toHaveLength(5);
    expect(tap(session, 0)).toMatchObject({ ok: false, reason: 'blocked' });
    expect(isStuck(session)).toBe(true);
    continueAfterFail(session);
    expect(session.dockCapacity).toBe(6);
    expect(isStuck(session)).toBe(false);
    expect(tap(session, 0).ok).toBe(true);
  });

  it('lets a wider bay preload the next van', () => {
    const level: LevelDef = {
      id: 52,
      name: 'bay',
      stacks: [['teal'], ['terracotta']],
      vans: [
        { color: 'terracotta', capacity: 1 },
        { color: 'teal', capacity: 1 },
      ],
      par: 1,
    };
    const plain = createSession(level);
    expect(destination(plain, 'teal')).toBe('dock');
    const wide = createSession(level, { widerBay: true });
    expect(destination(wide, 'teal')).toBe('next');
    expect(tap(wide, 0).ok).toBe(true);
    expect(wide.dock).toHaveLength(0);
    expect(wide.preloaded[1]).toBe(1);
    expect(tap(wide, 1)).toMatchObject({ ok: true, won: true });
    expect(isWin(wide)).toBe(true);
  });

  it('undo restores the previous stacks and an extra dock slot can be bought into the session', () => {
    const session = createSession(autoload, { dockCapacity: 6 });
    tap(session, 0);
    expect(session.dock).toHaveLength(1);
    expect(undo(session)).toBe(true);
    expect(session.moves).toBe(0);
    expect(session.dock).toHaveLength(0);
    expect(session.stacks[0]).toHaveLength(2);
    expect(session.dockCapacity).toBe(6);
  });

  it('shuffles parcels without changing the multiset or stack heights', () => {
    const session = createSession(autoload);
    const before = session.stacks.flat().map((parcel) => parcel.color).sort();
    const heights = session.stacks.map((stack) => stack.length);
    expect(shuffleBoard(session, () => 0.2)).toBe(true);
    expect(session.stacks.flat().map((parcel) => parcel.color).sort()).toEqual(before);
    expect(session.stacks.map((stack) => stack.length)).toEqual(heights);
    expect(undo(session)).toBe(true);
    expect(session.stacks.flat().map((parcel) => parcel.color).sort()).toEqual(before);
  });
});
