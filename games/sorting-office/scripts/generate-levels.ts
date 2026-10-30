import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PALETTE } from '../src/content/palette';
import { createSession, isWin, tap } from '../src/game/session';
import { solve } from '../src/game/solver';
import type { LevelDef, VanDef } from '../src/game/types';

const SEED = 20261030;
const TOTAL = 32;

const NAMES = [
  'Tea Crates',
  'Morning Rush',
  'Lantern Lane',
  'Stacked Post',
  'Third Van',
  'Parcel Rain',
  'Quiet Hour',
  'Crossing Tags',
  'Four Routes',
  'Bay Window',
  'Hold the Line',
  'Ink and Twine',
  'Switchback',
  'The Long Dock',
  'Overlap',
  'Narrow Queue',
  'Colour Study',
  'Last Shelf',
  'Depot Clock',
  'Braided Vans',
  'Deep Stacks',
  'Careful Hands',
  'Winter Post',
  'Full House',
  'Night Sorting',
  'Master Route',
  'The Closing Bell',
  'Last Collection',
  'Dawn Shift',
];

const HAND: Array<Omit<LevelDef, 'par'>> = [
  {
    id: 1,
    name: 'First Light',
    stacks: [['terracotta'], ['terracotta'], ['terracotta']],
    vans: [{ color: 'terracotta', capacity: 3 }],
  },
  {
    id: 2,
    name: 'Paper Route',
    stacks: [
      ['teal', 'terracotta'],
      ['teal', 'terracotta'],
      ['teal', 'terracotta'],
    ],
    vans: [
      { color: 'terracotta', capacity: 3 },
      { color: 'teal', capacity: 3 },
    ],
  },
  {
    id: 3,
    name: 'The Side Dock',
    stacks: [
      ['terracotta', 'teal'],
      ['terracotta', 'terracotta'],
      ['teal', 'teal'],
    ],
    vans: [
      { color: 'terracotta', capacity: 3 },
      { color: 'teal', capacity: 3 },
    ],
  },
];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Plan {
  vans: VanDef[];
  stacks: number;
  parkChance: number;
  dockMax: number;
}

function planFor(id: number): Plan {
  const ids = PALETTE.map((color) => color.id);
  let colorCount = 2;
  let capacity = 3;
  let repeats = 1;
  let stacks = 3;
  let parkChance = 0;
  let dockMax = 1;
  let alternate = false;

  if (id >= 6) {
    colorCount = 2;
    stacks = 4;
    parkChance = 0.15;
    dockMax = 1;
  }
  if (id >= 9) {
    colorCount = 3;
    stacks = 4;
    capacity = 3;
    parkChance = 0.2;
    dockMax = 2;
    alternate = true;
  }
  if (id >= 13) {
    colorCount = 3;
    stacks = 4;
    capacity = 2;
    repeats = 2;
    parkChance = 0.25;
    dockMax = 2;
    alternate = true;
  }
  if (id >= 18) {
    colorCount = 4;
    stacks = 4;
    capacity = 3;
    repeats = 1;
    parkChance = 0.3;
    dockMax = 2;
    alternate = true;
  }
  if (id >= 23) {
    colorCount = 4;
    stacks = 5;
    capacity = 3;
    repeats = 1;
    parkChance = 0.45;
    dockMax = 2;
    alternate = true;
  }
  if (id >= 27) {
    colorCount = 5;
    stacks = 5;
    capacity = 3;
    repeats = 1;
    parkChance = 0.35;
    dockMax = 2;
    alternate = true;
  }
  if (id >= 30) {
    colorCount = 4;
    stacks = 5;
    capacity = 2;
    repeats = 2;
    parkChance = 0.4;
    dockMax = 3;
    alternate = true;
  }

  const rotated = [...ids.slice(0, colorCount)];
  const shift = id % rotated.length;
  const colors = rotated.slice(shift).concat(rotated.slice(0, shift));
  const vans: VanDef[] = [];
  if (alternate) {
    for (let round = 0; round < repeats; round += 1) {
      for (const color of colors) vans.push({ color, capacity });
    }
  } else {
    for (const color of colors) {
      for (let round = 0; round < repeats; round += 1) vans.push({ color, capacity });
    }
  }
  const parcels = vans.reduce((sum, van) => sum + van.capacity, 0);
  stacks = Math.max(stacks, Math.ceil(parcels / 5));
  return { vans, stacks, parkChance, dockMax };
}

function supplyOf(vans: VanDef[]): Record<string, number> {
  const supply: Record<string, number> = {};
  for (const van of vans) supply[van.color] = (supply[van.color] ?? 0) + van.capacity;
  return supply;
}

function buildPops(vans: VanDef[], parkChance: number, dockMax: number, rng: () => number): string[] | null {
  const supply = supplyOf(vans);
  const dock: string[] = [];
  const pops: string[] = [];
  let vanIndex = 0;
  let loaded = 0;
  let guard = 0;

  const total = () => Object.values(supply).reduce((sum, count) => sum + count, 0);

  const arrive = () => {
    while (vanIndex < vans.length) {
      const van = vans[vanIndex]!;
      let index = 0;
      while (index < dock.length && loaded < van.capacity) {
        if (dock[index] === van.color) {
          dock.splice(index, 1);
          loaded += 1;
        } else {
          index += 1;
        }
      }
      if (loaded >= van.capacity) {
        vanIndex += 1;
        loaded = 0;
        continue;
      }
      break;
    }
  };

  while (guard++ < 2000 && (total() > 0 || dock.length > 0)) {
    if (vanIndex >= vans.length) return null;
    const van = vans[vanIndex]!;
    const left = Object.keys(supply).filter((color) => (supply[color] ?? 0) > 0);
    if (left.length === 0) return null;
    const canFeed = (supply[van.color] ?? 0) > 0;
    const parks = left.filter((color) => color !== van.color);
    const wantPark = canFeed && parks.length > 0 && dock.length < dockMax && rng() < parkChance;
    if (wantPark || !canFeed) {
      if (parks.length === 0 || dock.length >= 5) return null;
      const color = parks[Math.floor(rng() * parks.length)]!;
      supply[color] = (supply[color] ?? 1) - 1;
      pops.push(color);
      dock.push(color);
      continue;
    }
    supply[van.color] = (supply[van.color] ?? 1) - 1;
    pops.push(van.color);
    loaded += 1;
    if (loaded >= van.capacity) {
      vanIndex += 1;
      loaded = 0;
      arrive();
    }
  }

  if (vanIndex < vans.length || dock.length > 0 || total() > 0) return null;
  return pops;
}

function layStacks(
  pops: string[],
  stackCount: number,
  rng: () => number,
): { stacks: string[][]; assignments: number[] } | null {
  const topFirst: string[][] = Array.from({ length: stackCount }, () => []);
  const assignments: number[] = [];
  for (const color of pops) {
    const open = topFirst
      .map((column, index) => ({ index, height: column.length }))
      .filter((column) => column.height < 5);
    if (open.length === 0) return null;
    open.sort((a, b) => a.height - b.height);
    const pick = rng() < 0.82 ? open[0]! : open[Math.floor(rng() * Math.min(3, open.length))]!;
    topFirst[pick.index]!.push(color);
    assignments.push(pick.index);
  }
  const used = topFirst
    .map((column, index) => ({ column, index }))
    .filter((entry) => entry.column.length > 0);
  const remap = new Map(used.map((entry, index) => [entry.index, index]));
  return {
    stacks: used.map((entry) => [...entry.column].reverse()),
    assignments: assignments.map((index) => remap.get(index)!),
  };
}

function witnessPar(level: Omit<LevelDef, 'par'>, assignments: number[]): number | null {
  const session = createSession({ ...level, par: 0 });
  for (const index of assignments) {
    const result = tap(session, index, false);
    if (!result.ok) return null;
  }
  return isWin(session) ? session.peakDock : null;
}

function withPar(level: Omit<LevelDef, 'par'>, par: number): LevelDef {
  const solved = solve({ ...level, par }, { maxPeak: par, nodeLimit: 80_000 });
  if (!solved.solvable || solved.limited) {
    throw new Error(`Level ${level.id} ${level.name} not solved within par ${par} (visited ${solved.visited})`);
  }
  return { ...level, par };
}

function generateOne(id: number): LevelDef {
  const plan = planFor(id);
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const rng = mulberry32(SEED + id * 10007 + attempt * 997);
    const pops = buildPops(plan.vans, plan.parkChance, plan.dockMax, rng);
    if (!pops) continue;
    const laid = layStacks(pops, plan.stacks, rng);
    if (!laid) continue;
    const draft: Omit<LevelDef, 'par'> = {
      id,
      name: NAMES[id - 4] ?? `Route ${id}`,
      stacks: laid.stacks,
      vans: plan.vans,
    };
    const par = witnessPar(draft, laid.assignments);
    if (par === null) continue;
    try {
      return withPar(draft, par);
    } catch {
      continue;
    }
  }
  throw new Error(`Could not generate level ${id}`);
}

function handPar(level: Omit<LevelDef, 'par'>): LevelDef {
  for (let par = 0; par <= 5; par += 1) {
    const solved = solve({ ...level, par }, { maxPeak: par, nodeLimit: 50_000 });
    if (solved.solvable && !solved.limited) return { ...level, par };
  }
  throw new Error(`Handcrafted level ${level.id} is unsolvable`);
}

const levels: LevelDef[] = [];
for (let id = 1; id <= TOTAL; id += 1) {
  const hand = HAND.find((level) => level.id === id);
  const level = hand ? handPar(hand) : generateOne(id);
  levels.push(level);
  console.log(
    `level ${level.id} ${level.name} par ${level.par} stacks ${level.stacks.length} parcels ${level.stacks.reduce((n, s) => n + s.length, 0)} vans ${level.vans.length}`,
  );
}

const body = `import type { LevelDef } from '../game/types';

/** Generated by scripts/generate-levels.ts — seed ${SEED}. Do not edit by hand. */
export const LEVELS: LevelDef[] = ${JSON.stringify(levels, null, 2)};
`;

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../src/content/levels.generated.ts');
writeFileSync(out, body);
console.log(`wrote ${levels.length} levels`);
