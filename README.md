# Sorting Office

A small portrait puzzle about a morning at the depot. Parcels are stacked, only the top of each stack can be touched, and the vans arrive in an order you can see coming.

The repo is a studio layout: a shared Phaser shell in `packages/template`, and the game in `games/sorting-office`.

## Play

1. Tap an uncovered parcel.
2. If it matches the van in the loading bay, it loads. The van leaves when it is full, and the next one in the queue rolls up.
3. If it does not match, it waits in the dock. The dock holds five parcels (six after the Depot upgrade). Fill it with nowhere to put the next mismatch and the route fails.
4. Parcels already on the dock climb aboard by themselves when their van arrives.
5. The queue shows the next three vans. Clear every parcel to win.

Stars reward a tidy dock. Three stars means you matched the route's minimum dock peak; two stars allows one extra parcel waiting; one star is any clear. Coins from new star ratings are spent in the Depot.

Difficulty sawtooths. Routes 1 and 2 are a gentle tutorial. Every fifth route (5, 10, 15, 20, 25, 30) is an Express boss: the dock has almost no slack, and tapping the obvious parcel can lose. Between bosses the tag drops, then climbs again, and the later routes sit higher than the early ones. Each route is tagged easy, medium, hard, or very hard.

Depot upgrades:

- **Extra dock slot** — a permanent sixth berth.
- **Wider loading bay** — you may load the *next* van early.
- **Undo stamps** and **shelf shuffles** — consumable packs.

A rewarded ad can continue after a failure (one more berth), double the coins from a clear, or grant a free undo. A midgame break runs after routes 6, 9, 12, and so on — never during the first three. The daily parcel is a seven-day streak of coins.

Progress, sound, and the streak are stored in `localStorage` under `sorting-office`.

## Commands

From the repository root:

```bash
npm install
npm run dev          # Vite dev server
npm run build        # production build, Vite base './'
npm test             # unit tests (rules, solver, economy) and typecheck
npm run test:e2e     # Playwright smoke test against the production build
npm run generate     # rebuild the 32 routes from the seeded generator
npm run zip          # zip dist/ for a CrazyGames upload (fails if over 5 MB)
```

The zip is written to `games/sorting-office/sorting-office-crazygames.zip`.

## Layout

- `packages/template` — boot, menu, route select, settings, pause, save slot, procedural sound, portrait scaling, and the CrazyGames SDK v3 wrapper (`loadingStart` / `loadingStop`, `gameplayStart` / `gameplayStop`, midgame and rewarded ads, `happytime`). Outside CrazyGames the ad calls use a local stub.
- `games/sorting-office` — rules, solver, 32 routes, Depot, daily reward, and scenes.
- `ASSETS.md` — source and licence for everything that is drawn or heard.

## Solver

`npm test` runs a depth-first solver over the same rules the game uses. Every route must have a clear whose dock peak is no worse than the stored par, and replaying those moves must empty the board. The generator refuses a layout it cannot prove.

## GitHub Pages

`.github/workflows/pages.yml` builds on every push to `main` and deploys `games/sorting-office/dist` with `actions/deploy-pages`. The site is [https://d4l1nk.github.io/game-studio/](https://d4l1nk.github.io/game-studio/).

The first deployment needs GitHub Pages set to **GitHub Actions** as the source (Settings → Pages). Vite uses a relative `base` of `./`, so the build works both at that project URL and inside a CrazyGames iframe.
