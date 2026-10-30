export const STAR_COINS = { 1: 15, 2: 30, 3: 50 } as const;

export const PRICES = {
  extraDock: 220,
  widerBay: 380,
  undoPack: 45,
  shufflePack: 75,
} as const;

export const DAILY_REWARDS = [25, 40, 60, 80, 100, 140, 200] as const;

export type UpgradeId = 'extraDock' | 'widerBay' | 'undoPack' | 'shufflePack';

export function starsForPeak(peak: number, par: number): 1 | 2 | 3 {
  if (peak <= par) return 3;
  if (peak <= par + 1) return 2;
  return 1;
}

export function coinValue(stars: number): number {
  if (stars >= 3) return STAR_COINS[3];
  if (stars === 2) return STAR_COINS[2];
  if (stars === 1) return STAR_COINS[1];
  return 0;
}

/** Coins gained for improving a level's best star rating. */
export function coinGrant(previousBest: number, stars: number): number {
  return Math.max(0, coinValue(stars) - coinValue(previousBest));
}

/**
 * Midgame break after every 3rd cleared route, skipping the opening three.
 * Levels 6, 9, 12… qualify. Levels 1–3 never do.
 */
export function shouldShowMidgame(completedLevel: number): boolean {
  return completedLevel > 3 && completedLevel % 3 === 0;
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftDate(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year || 1970, (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}
