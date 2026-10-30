import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const ARTIFACTS = '/opt/cursor/artifacts';

interface Target {
  x: number;
  y: number;
  w: number;
  h: number;
}

async function ready(page: Page): Promise<void> {
  await page.goto('./');
  await page.waitForFunction(() => {
    const bridge = (window as unknown as { __sortingOffice?: { ready?: boolean } }).__sortingOffice;
    return bridge?.ready === true;
  });
}

async function target(page: Page, id: string): Promise<Target> {
  const box = await page.evaluate((key) => {
    const bridge = (window as unknown as { __sortingOffice: { getTarget: (id: string) => Target | null } })
      .__sortingOffice;
    return bridge.getTarget(key);
  }, id);
  expect(box, id).toBeTruthy();
  return box!;
}

test('loads the build and plays the start of a route', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await ready(page);
  const play = await target(page, 'play');
  await page.mouse.click(play.x, play.y);
  await page.waitForFunction(
    () => (window as unknown as { __sortingOffice: { scene: string } }).__sortingOffice.scene === 'play',
  );
  const before = await page.evaluate(() =>
    (window as unknown as { __sortingOffice: { getState: () => { moves: number; remaining: number } } }).__sortingOffice.getState(),
  );
  const stack = await target(page, 'stack-0');
  await page.mouse.click(stack.x, stack.y);
  await page.waitForFunction(
    () =>
      (window as unknown as { __sortingOffice: { getState: () => { moves: number } } }).__sortingOffice.getState()
        .moves >= 1,
  );
  const after = await page.evaluate(() =>
    (
      window as unknown as { __sortingOffice: { getState: () => { moves: number; remaining: number } } }
    ).__sortingOffice.getState(),
  );
  expect(after.moves).toBeGreaterThan(before.moves);
  expect(after.remaining).toBeLessThan(before.remaining);
  const ours = errors.filter((error) => !/crazygames|sdk/i.test(error));
  expect(ours).toEqual([]);
});

test('portrait screens of menu, routes, play, win, and depot', async ({ page }) => {
  mkdirSync(ARTIFACTS, { recursive: true });
  await ready(page);
  await page.screenshot({ path: `${ARTIFACTS}/menu_portrait.png` });

  const routes = await target(page, 'levels');
  await page.mouse.click(routes.x, routes.y);
  await page.waitForFunction(
    () => (window as unknown as { __sortingOffice: { scene: string } }).__sortingOffice.scene === 'levels',
  );
  await page.screenshot({ path: `${ARTIFACTS}/level_select_portrait.png` });

  const back = await target(page, 'back');
  await page.mouse.click(back.x, back.y);
  await page.waitForFunction(
    () => (window as unknown as { __sortingOffice: { scene: string } }).__sortingOffice.scene === 'menu',
  );
  const play = await target(page, 'play');
  await page.mouse.click(play.x, play.y);
  await page.waitForFunction(
    () => (window as unknown as { __sortingOffice: { scene: string } }).__sortingOffice.scene === 'play',
  );
  await page.screenshot({ path: `${ARTIFACTS}/easy_route_portrait.png` });

  for (let step = 0; step < 3; step += 1) {
    const stack = await page.evaluate(() => {
      const bridge = (window as unknown as { __sortingOffice: { getTarget: (id: string) => Target | null } })
        .__sortingOffice;
      return bridge.getTarget('stack-0') ?? bridge.getTarget('stack-1') ?? bridge.getTarget('stack-2');
    });
    if (!stack) break;
    await page.mouse.click(stack.x, stack.y);
    await page.waitForTimeout(420);
  }
  await page.waitForFunction(
    () => (window as unknown as { __sortingOffice: { scene: string } }).__sortingOffice.scene === 'win',
  );
  await page.screenshot({ path: `${ARTIFACTS}/win_portrait.png` });

  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('sorting-office') || '{}') as { unlocked?: number };
    localStorage.setItem('sorting-office', JSON.stringify({ ...raw, unlocked: 32, expressSeen: {} }));
  });
  await page.goto('./');
  await page.waitForFunction(() => (window as unknown as { __sortingOffice?: { ready?: boolean } }).__sortingOffice?.ready);
  const routesAgain = await target(page, 'levels');
  await page.mouse.click(routesAgain.x, routesAgain.y);
  await page.waitForFunction(
    () => (window as unknown as { __sortingOffice: { scene: string } }).__sortingOffice.scene === 'levels',
  );
  const boss = await target(page, 'level-5');
  await page.mouse.click(boss.x, boss.y);
  await page.waitForFunction(
    () => (window as unknown as { __sortingOffice: { scene: string } }).__sortingOffice.scene === 'express',
  );
  const sortIt = await target(page, 'express-start');
  await page.mouse.click(sortIt.x, sortIt.y);
  await page.waitForFunction(
    () => (window as unknown as { __sortingOffice: { scene: string } }).__sortingOffice.scene === 'play',
  );
  await page.screenshot({ path: `${ARTIFACTS}/very_hard_route_portrait.png` });

  await page.goto('./');
  await page.waitForFunction(() => (window as unknown as { __sortingOffice?: { ready?: boolean } }).__sortingOffice?.ready);
  const depot = await target(page, 'depot');
  await page.mouse.click(depot.x, depot.y);
  await page.waitForFunction(
    () => (window as unknown as { __sortingOffice: { scene: string } }).__sortingOffice.scene === 'depot',
  );
  await page.screenshot({ path: `${ARTIFACTS}/depot_portrait.png` });
});
