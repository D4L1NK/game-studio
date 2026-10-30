import { describe, expect, it } from 'vitest';
import { SaveStore, memoryStorage } from '../../../packages/template/src/save/SaveStore';
import { InstantPortal } from '../../../packages/template/src/portal/adapters';
import { Portal } from '../../../packages/template/src/portal/Portal';
import { coinGrant, shiftDate, shouldShowMidgame, starsForPeak } from '../src/game/economy';
import {
  applyVictory,
  claimDaily,
  continueLabel,
  continueLevelId,
  dailyStatus,
  defaultSave,
  purchase,
} from '../src/game/progress';

describe('economy and portal', () => {
  it('scores stars from dock peak and pays the improvement only', () => {
    expect(starsForPeak(0, 0)).toBe(3);
    expect(starsForPeak(1, 0)).toBe(2);
    expect(starsForPeak(2, 0)).toBe(1);
    expect(coinGrant(0, 3)).toBe(50);
    expect(coinGrant(1, 3)).toBe(35);
    expect(coinGrant(3, 2)).toBe(0);
  });

  it('shows a midgame ad every third route after the opening three', () => {
    expect([1, 2, 3, 4, 5].map(shouldShowMidgame)).toEqual([false, false, false, false, false]);
    expect(shouldShowMidgame(6)).toBe(true);
    expect(shouldShowMidgame(9)).toBe(true);
    expect(shouldShowMidgame(12)).toBe(true);
  });

  it('unlocks the next route and keeps the best star rating', () => {
    const first = applyVictory(defaultSave(), 1, 3, 32);
    expect(first.earned).toBe(50);
    expect(first.save.unlocked).toBe(2);
    expect(first.save.coins).toBe(50);
    const replay = applyVictory(first.save, 1, 1, 32);
    expect(replay.earned).toBe(0);
    expect(replay.save.best['1']).toBe(3);
    expect(continueLevelId(first.save, 32)).toBe(2);
    expect(continueLabel(defaultSave(), 32)).toBe('Begin the morning');
    const finale = applyVictory({ ...defaultSave(), unlocked: 32, best: { '32': 1 } }, 32, 2, 32);
    expect(finale.save.unlocked).toBe(32);
    expect(finale.earned).toBe(15);
  });

  it('tracks the daily streak and resets after a missed day', () => {
    const first = claimDaily(defaultSave(), '2026-10-30');
    expect(first.reward).toBe(25);
    expect(dailyStatus(first.save, '2026-10-30').claimable).toBe(false);
    expect(dailyStatus(first.save, '2026-10-31')).toMatchObject({ claimable: true, streak: 2, reward: 40 });
    expect(dailyStatus(first.save, '2026-11-02').streak).toBe(1);
    expect(shiftDate('2026-01-31', 1)).toBe('2026-02-01');
    expect(shiftDate('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('sells each permanent upgrade once', () => {
    const rich = { ...defaultSave(), coins: 220 };
    const bought = purchase(rich, 'extraDock');
    expect(bought.ok).toBe(true);
    expect(bought.save.extraDock).toBe(true);
    expect(bought.save.coins).toBe(0);
    expect(purchase(bought.save, 'extraDock').ok).toBe(false);
    expect(purchase(defaultSave(), 'widerBay').ok).toBe(false);
    const stamps = purchase({ ...defaultSave(), coins: 45 }, 'undoPack');
    expect(stamps.save.undos).toBe(6);
  });

  it('round-trips a save slot', () => {
    const storage = memoryStorage();
    const store = new SaveStore('sorting-office', defaultSave(), storage);
    store.update((draft) => {
      draft.coins = 80;
      draft.unlocked = 4;
    });
    const again = new SaveStore('sorting-office', defaultSave(), storage);
    expect(again.get().coins).toBe(80);
    expect(again.get().unlocked).toBe(4);
    expect(again.get().sound).toBe(true);
    again.reset();
    expect(again.get().coins).toBe(0);
  });

  it('records CrazyGames lifecycle calls on the stub', async () => {
    const inner = new InstantPortal();
    const portal = new Portal(inner);
    await portal.init();
    portal.loadingStart();
    portal.loadingStop();
    portal.gameplayStart();
    portal.gameplayStop();
    portal.happytime();
    await expect(portal.midgame()).resolves.toBe(true);
    await expect(portal.rewarded()).resolves.toBe(true);
    expect(inner.calls).toEqual([
      'init',
      'loadingStart',
      'loadingStop',
      'gameplayStart',
      'gameplayStop',
      'happytime',
      'ad:midgame',
      'ad:rewarded',
    ]);
  });
});
