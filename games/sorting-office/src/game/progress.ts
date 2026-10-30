import { DAILY_REWARDS, PRICES, coinGrant, formatLocalDate, shiftDate, type UpgradeId } from './economy';

export interface SaveData {
  v: 1;
  sound: boolean;
  coins: number;
  /** Highest route that may be opened. */
  unlocked: number;
  best: Record<string, number>;
  extraDock: boolean;
  widerBay: boolean;
  undos: number;
  shuffles: number;
  dailyLast: string;
  dailyStreak: number;
  /**
   * Very-hard intro cards already dismissed, keyed by route id.
   * Missing on saves from the first release; the loader fills `{}`.
   */
  expressSeen: Record<string, 1>;
}

export function defaultSave(): SaveData {
  return {
    v: 1,
    sound: true,
    coins: 0,
    unlocked: 1,
    best: {},
    extraDock: false,
    widerBay: false,
    undos: 3,
    shuffles: 1,
    dailyLast: '',
    dailyStreak: 0,
    expressSeen: {},
  };
}

export function todayIso(now = new Date()): string {
  return formatLocalDate(now);
}

export interface DailyStatus {
  claimable: boolean;
  streak: number;
  reward: number;
  dayIndex: number;
}

export function dailyStatus(save: SaveData, today: string): DailyStatus {
  if (save.dailyLast === today) {
    const streak = save.dailyStreak;
    const dayIndex = Math.max(0, (Math.max(streak, 1) - 1) % DAILY_REWARDS.length);
    return { claimable: false, streak, reward: DAILY_REWARDS[dayIndex] ?? 0, dayIndex };
  }
  const continued = save.dailyLast !== '' && shiftDate(save.dailyLast, 1) === today;
  const streak = continued ? save.dailyStreak + 1 : 1;
  const dayIndex = (streak - 1) % DAILY_REWARDS.length;
  return { claimable: true, streak, reward: DAILY_REWARDS[dayIndex] ?? 0, dayIndex };
}

export function claimDaily(save: SaveData, today: string): { save: SaveData; reward: number } {
  const status = dailyStatus(save, today);
  if (!status.claimable) return { save, reward: 0 };
  return {
    reward: status.reward,
    save: {
      ...save,
      coins: save.coins + status.reward,
      dailyLast: today,
      dailyStreak: status.streak,
    },
  };
}

export function continueLevelId(save: SaveData, total: number): number {
  const unlocked = Math.min(Math.max(save.unlocked, 1), total);
  for (let id = 1; id <= unlocked; id += 1) {
    if ((save.best[String(id)] ?? 0) < 1) return id;
  }
  return unlocked;
}

export function continueLabel(save: SaveData, total: number): string {
  const id = continueLevelId(save, total);
  if ((save.best[String(id)] ?? 0) >= 1 && id === total && save.unlocked >= total) return 'Replay finale';
  if (id <= 1 && (save.best['1'] ?? 0) < 1) return 'Begin the morning';
  return `Continue · route ${id}`;
}

export function applyVictory(
  save: SaveData,
  levelId: number,
  stars: number,
  total: number,
): { save: SaveData; earned: number } {
  const previous = save.best[String(levelId)] ?? 0;
  const earned = coinGrant(previous, stars);
  const best = Math.max(previous, stars);
  const unlocked = levelId >= total ? total : Math.max(save.unlocked, Math.min(total, levelId + 1));
  return {
    earned,
    save: {
      ...save,
      coins: save.coins + earned,
      unlocked,
      best: { ...save.best, [String(levelId)]: best },
    },
  };
}

export function purchase(save: SaveData, id: UpgradeId): { save: SaveData; ok: boolean } {
  if (id === 'extraDock') {
    if (save.extraDock || save.coins < PRICES.extraDock) return { save, ok: false };
    return { ok: true, save: { ...save, extraDock: true, coins: save.coins - PRICES.extraDock } };
  }
  if (id === 'widerBay') {
    if (save.widerBay || save.coins < PRICES.widerBay) return { save, ok: false };
    return { ok: true, save: { ...save, widerBay: true, coins: save.coins - PRICES.widerBay } };
  }
  if (id === 'undoPack') {
    if (save.coins < PRICES.undoPack) return { save, ok: false };
    return { ok: true, save: { ...save, undos: save.undos + 3, coins: save.coins - PRICES.undoPack } };
  }
  if (save.coins < PRICES.shufflePack) return { save, ok: false };
  return { ok: true, save: { ...save, shuffles: save.shuffles + 3, coins: save.coins - PRICES.shufflePack } };
}

export function levelErrors(level: {
  stacks: string[][];
  vans: { color: string; capacity: number }[];
  par: number;
}): string[] {
  const errors: string[] = [];
  const counts: Record<string, number> = {};
  if (level.stacks.length === 0) errors.push('no stacks');
  for (const stack of level.stacks) {
    if (stack.length === 0) errors.push('empty stack');
    for (const color of stack) counts[color] = (counts[color] ?? 0) + 1;
  }
  const caps: Record<string, number> = {};
  if (level.vans.length === 0) errors.push('no vans');
  for (const van of level.vans) {
    if (van.capacity < 1) errors.push(`bad capacity ${van.color}`);
    caps[van.color] = (caps[van.color] ?? 0) + van.capacity;
  }
  const colors = new Set([...Object.keys(counts), ...Object.keys(caps)]);
  for (const color of colors) {
    if ((counts[color] ?? 0) !== (caps[color] ?? 0)) {
      errors.push(`${color} parcels ${counts[color] ?? 0} vs seats ${caps[color] ?? 0}`);
    }
  }
  if (level.par < 0) errors.push('negative par');
  return errors;
}
