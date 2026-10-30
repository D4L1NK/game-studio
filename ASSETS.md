# Assets

| Asset | Where | Source | Licence |
| --- | --- | --- | --- |
| Parcel boxes, tape, labels, stamps, and vans | `games/sorting-office/src/view/art.ts` | Original procedural art, baked to textures at startup | CC0 — original work, dedicated to the public domain |
| Depot wall, pigeon holes, floor, awning, and UI panels | `packages/template/src/ui/widgets.ts`, `games/sorting-office/src/view/art.ts` | Original procedural drawing | CC0 — original work, dedicated to the public domain |
| Sound effects (paper tap, van, warning, win, coins, UI) | `packages/template/src/audio/SoundManager.ts` | Original WebAudio synthesis, no samples | CC0 — original work, dedicated to the public domain |
| Fraunces 600, latin | `@fontsource/fraunces` latin-600 | [Fraunces by The League of Moveable Type / Undercase Type](https://fonts.google.com/specimen/Fraunces), via Fontsource | SIL Open Font License 1.1 |
| Nunito 600 and 700, latin | `@fontsource/nunito` latin-600, latin-700 | [Nunito by Vernon Adams](https://fonts.google.com/specimen/Nunito), via Fontsource | SIL Open Font License 1.1 |
| CrazyGames SDK v3 | Loaded at runtime from `https://sdk.crazygames.com/crazygames-sdk-v3.js` when the page can reach it | [CrazyGames SDK](https://docs.crazygames.com/sdk/intro/) | CrazyGames SDK terms. Ads fall back to a local stub when the SDK is absent or outside the CrazyGames host. |
| Phaser 3 | npm dependency `phaser` | [phaserjs](https://github.com/phaserjs/phaser) | MIT |

No Kenney pack is bundled. The postal-depot pictures are drawn in code so the upload stays small. Fonts are the only third-party binary assets, and only the latin weights used on screen are imported.
