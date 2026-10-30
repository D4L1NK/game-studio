import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PALETTE } from '../src/content/palette';
import {
  isVeryHardId,
  measureLevel,
  mulberry32,
  plannedTag,
  type DifficultyMeasure,
} from '../src/game/difficulty';
import type { DifficultyTag, LevelDef, VanDef } from '../src/game/types';

const SEED = 20261102;
const TOTAL = 32;

const NAMES = [
  'First Light',
  'Paper Route',
  'Side Dock',
  'Tea Crates',
  'Express Lane',
  'Morning Rush',
  'Lantern Lane',
  'Stacked Post',
  'Third Van',
  'Rush Hour',
  'Parcel Rain',
  'Quiet Hour',
  'Crossing Tags',
  'Four Routes',
  'Red Stamp',
  'Bay Window',
  'Hold the Line',
  'Ink and Twine',
  'Switchback',
  'Night Express',
  'The Long Dock',
  'Overlap',
  'Narrow Queue',
  'Colour Study',
  'Full Platform',
  'Last Shelf',
  'Depot Clock',
  'Braided Vans',
  'Deep Stacks',
  'Last Express',
  'Careful Hands',
  'Closing Bell',
];

const TUTORIAL: Array<Omit<LevelDef, 'par' | 'tag' | 'minPeak'>> = [
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
];

function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    const current = copy[index]!;
    copy[index] = copy[swap]!;
    copy[swap] = current;
  }
  return copy;
}

function vansFor(id: number, tag: DifficultyTag, rng: () => number): VanDef[] {
  const cycle = Math.floor((id - 1) / 5);
  let colors = 2;
  let capacity = 3;
  let repeats = 1;
  if (tag === 'medium') colors = cycle >= 2 ? 3 : 3;
  if (tag === 'hard') {
    colors = cycle >= 3 ? 4 : 3;
    capacity = cycle >= 4 ? 2 : 3;
    repeats = capacity === 2 ? 2 : 1;
  }
  if (tag === 'very-hard') {
    colors = 4;
    capacity = 3;
    repeats = 1;
  }
  if (tag === 'easy' && id > 2) {
    colors = 2;
    capacity = 3;
  }
  while (colors * capacity * repeats > 14) {
    if (repeats > 1) repeats -= 1;
    else if (colors > 2) colors -= 1;
    else break;
  }
  const ids = PALETTE.map((color) => color.id);
  const palette = ids.slice(0, colors);
  const shift = Math.floor(rng() * palette.length);
  const rotated = palette.slice(shift).concat(palette.slice(0, shift));
  const alternate = tag !== 'easy';
  const vans: VanDef[] = [];
  if (alternate) {
    for (let round = 0; round < repeats; round += 1) {
      for (const color of rotated) vans.push({ color, capacity });
    }
  } else {
    for (const color of rotated) {
      for (let round = 0; round < repeats; round += 1) vans.push({ color, capacity });
    }
  }
  return vans;
}

function deal(
  parcels: string[],
  stackCount: number,
  maxHeight: number,
  rng: () => number,
  balanced: boolean,
): string[][] | null {
  const columns: string[][] = Array.from({ length: stackCount }, () => []);
  for (const color of parcels) {
    const open = columns
      .map((column, index) => ({ index, height: column.length }))
      .filter((column) => column.height < maxHeight);
    if (open.length === 0) return null;
    open.sort((a, b) => a.height - b.height || a.index - b.index);
    const pick = balanced ? open[0]! : open[Math.floor(rng() * open.length)]!;
    columns[pick.index]!.push(color);
  }
  const used = columns.filter((column) => column.length > 0);
  if (used.length < 2) return null;
  return used;
}

function tempt(stacks: string[][], first: string, count: number, rng: () => number): void {
  const buried = stacks.filter((stack) => stack.includes(first) && stack[stack.length - 1] !== first);
  for (let made = 0; made < count && buried.length > 0; made += 1) {
    const index = Math.floor(rng() * buried.length);
    const stack = buried.splice(index, 1)[0]!;
    const at = stack.lastIndexOf(first);
    if (at < 0) continue;
    stack.splice(at, 1);
    stack.push(first);
  }
}

function candidate(id: number, tag: DifficultyTag, rng: () => number): Omit<LevelDef, 'par' | 'tag' | 'minPeak'> | null {
  const vans = vansFor(id, tag, rng);
  if (vans.reduce((sum, van) => sum + van.capacity, 0) > 14) return null;
  const parcels: string[] = [];
  for (const van of vans) {
    for (let i = 0; i < van.capacity; i += 1) parcels.push(van.color);
  }
  // Push order is bottom → top, so easy routes put the first van's colour on top.
  const ordered = tag === 'easy' ? [...parcels].reverse() : shuffle(parcels, rng);
  const stackCount = tag === 'very-hard' ? 4 : tag === 'hard' ? 4 : 3;
  const maxHeight = tag === 'easy' ? 3 : 4;
  const stacks = deal(ordered, stackCount, maxHeight, rng, tag === 'easy');
  if (!stacks) return null;
  if (tag === 'hard' && rng() < 0.5) tempt(stacks, vans[0]?.color ?? ordered[0]!, 1, rng);
  return { id, name: NAMES[id - 1] ?? `Route ${id}`, stacks, vans };
}

function bandOk(tag: DifficultyTag, measure: DifficultyMeasure): boolean {
  if (!measure.solvable || measure.limited || measure.minPeak < 0) return false;
  if (tag === 'easy') return measure.minPeak === 0 && measure.greedyFail <= 0.2 && measure.randomFail <= 0.4;
  if (tag === 'medium') {
    return measure.minPeak <= 2 && (measure.greedyFail >= 0.15 || measure.randomFail >= 0.4) && measure.score < 46;
  }
  if (tag === 'hard') return measure.minPeak >= 1 && measure.minPeak <= 3 && measure.greedyFail >= 0.3 && measure.randomFail >= 0.45;
  return measure.minPeak >= 3 && measure.minPeak <= 4 && measure.greedyFail >= 0.75;
}

function orderOk(id: number, measure: DifficultyMeasure, previous: DifficultyMeasure | null): boolean {
  if (!previous) return true;
  if (isVeryHardId(id)) return measure.score > previous.score + 4;
  if (isVeryHardId(id - 1)) return measure.score < previous.score - 4;
  return true;
}

function finish(draft: Omit<LevelDef, 'par' | 'tag' | 'minPeak'>, tag: DifficultyTag, measure: DifficultyMeasure): LevelDef {
  return { ...draft, tag, par: measure.minPeak, minPeak: measure.minPeak };
}

function generateOne(id: number, previous: DifficultyMeasure | null): { level: LevelDef; measure: DifficultyMeasure } {
  const tutorial = TUTORIAL.find((level) => level.id === id);
  if (tutorial) {
    const measure = measureLevel({ ...tutorial, par: 0, tag: 'easy', minPeak: 0 }, 20, SEED + id);
    if (!bandOk('easy', measure)) {
      throw new Error(`Tutorial ${id} is not easy (${JSON.stringify(measure)})`);
    }
    return { level: finish(tutorial, 'easy', measure), measure };
  }
  const tag = plannedTag(id);
  const attempts = tag === 'very-hard' ? 500 : tag === 'hard' ? 220 : 120;
  let best: { level: LevelDef; measure: DifficultyMeasure; gap: number } | null = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const rng = mulberry32(SEED + id * 10007 + attempt * 131);
    const draft = candidate(id, tag, rng);
    if (!draft) continue;
    const measure = measureLevel({ ...draft, par: 0, tag, minPeak: 0 }, tag === 'very-hard' ? 24 : 16, SEED + id);
    const gap =
      (tag === 'very-hard' ? Math.max(0, 0.85 - measure.greedyFail) * 20 + Math.max(0, 3 - measure.minPeak) * 8 : 0) +
      (measure.solvable ? 0 : 30);
    if (!best || gap < best.gap) best = { level: finish(draft, tag, measure.solvable ? measure : { ...measure, minPeak: 0 }), measure, gap };
    if (!bandOk(tag, measure) || !orderOk(id, measure, previous)) continue;
    return { level: finish(draft, tag, measure), measure };
  }
  const hint = best ? ` closest peak ${best.measure.minPeak} fail ${best.measure.greedyFail.toFixed(2)} score ${best.measure.score.toFixed(1)}` : '';
  throw new Error(`Could not generate level ${id} (${tag}).${hint}`);
}

const levels: LevelDef[] = [];
let previous: DifficultyMeasure | null = null;
for (let id = 1; id <= TOTAL; id += 1) {
  const { level, measure } = generateOne(id, previous);
  levels.push(level);
  previous = measure;
  console.log(
    `${String(id).padStart(2)} ${level.tag.padEnd(10)} peak ${measure.minPeak} greedy ${measure.greedyFail.toFixed(2)} random ${measure.randomFail.toFixed(2)} score ${measure.score.toFixed(1)}  ${level.name}`,
  );
}

const body = `import type { LevelDef } from '../game/types';

/** Generated by scripts/generate-levels.ts — seed ${SEED}. Do not edit by hand. */
export const LEVELS: LevelDef[] = ${JSON.stringify(levels, null, 2)};
`;

const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(resolve(here, '../src/content/levels.generated.ts'), body);
console.log(`wrote ${levels.length} levels`);
