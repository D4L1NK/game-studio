# Assets

Sorting Office ships no third-party image, audio, or font files. Everything on screen is drawn at runtime, and every sound is synthesized in the browser.

| Asset | Where | Source | Licence |
| --- | --- | --- | --- |
| Parcel, van, awning, dock, and UI shapes | `games/sorting-office/src/view/art.ts`, `packages/template/src/ui/widgets.ts` | Original procedural drawing (Phaser graphics) | CC0 — original work, dedicated to the public domain |
| Sound effects (tap, load, van, win, fail, coins, UI) | `packages/template/src/audio/SoundManager.ts` | Original WebAudio synthesis, no samples | CC0 — original work, dedicated to the public domain |
| Typography | System stack: Liberation Serif / Palatino / Georgia, Liberation Sans / Segoe UI | Fonts already present on the player's operating system. None are bundled. | n/a — not distributed |
| CrazyGames SDK v3 | Loaded at runtime from `https://sdk.crazygames.com/crazygames-sdk-v3.js` when the page can reach it | [CrazyGames SDK](https://docs.crazygames.com/sdk/intro/) | CrazyGames SDK terms. The game falls back to a local ad stub when the SDK is absent or outside the CrazyGames host. |
| Phaser 3 | npm dependency `phaser` | [phaserjs](https://github.com/phaserjs/phaser) | MIT |

No Kenney pack is included: the procedural set stays under the upload budget and keeps the licence log to work we actually ship.
