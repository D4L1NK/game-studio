import '@fontsource/fraunces/latin-600.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import Phaser from 'phaser';
import {
  BootScene,
  LevelSelectScene,
  MenuScene,
  PORTAL_KEY,
  PauseScene,
  Portal,
  SOUND_KEY,
  SHELL_KEY,
  SaveStore,
  SettingsScene,
  SoundManager,
  createPortal,
  depotTheme,
  scaleGame,
  type ShellConfig,
} from '@game-studio/template';
import { drawAwning, ensureDepotArt, parcelKey, vanKey } from './view/art';
import { DailyScene } from './scenes/DailyScene';
import { DepotScene } from './scenes/DepotScene';
import { PlayScene } from './scenes/PlayScene';
import { SAVE_KEY, installBridge } from './bridge';
import { LEVELS, levelCount } from './content/levels';
import { continueLabel, continueLevelId, dailyStatus, defaultSave, todayIso, type SaveData } from './game/progress';

void boot();

async function boot(): Promise<void> {
  const portal = new Portal(await createPortal());
  const save = new SaveStore<SaveData>('sorting-office', defaultSave());
  const sound = new SoundManager(() => save.get().sound);

  const shell: ShellConfig = {
    title: 'Sorting Office',
    tagline: 'A calm morning of vans, colours, and a dock that fills up.',
    theme: depotTheme,
    getProgress: () => {
      const data = save.get();
      const total = levelCount();
      return {
        coins: data.coins,
        sound: data.sound,
        dailyClaimable: dailyStatus(data, todayIso()).claimable,
        continueLevel: continueLevelId(data, total),
        continueLabel: continueLabel(data, total),
      };
    },
    getLevels: () => LEVELS.map((level) => ({ id: level.id, name: level.name, tag: level.tag })),
    starsFor: (levelId) => save.get().best[String(levelId)] ?? 0,
    isUnlocked: (levelId) => levelId <= save.get().unlocked,
    setSound: (on) => {
      save.update((draft) => {
        draft.sound = on;
      });
    },
    resetSave: () => {
      save.reset();
    },
    startLevel: (scene, levelId) => {
      scene.registry.set('levelId', levelId);
      scene.scene.start('play');
    },
    openDepot: (scene) => {
      scene.scene.start('depot');
    },
    openDaily: (scene) => {
      scene.scene.start('daily');
    },
    decorateMenu: (scene) => {
      ensureDepotArt(scene);
      const art = scene.add.graphics();
      drawAwning(art, 0, 86);
      scene.add.image(196, 372, vanKey('terracotta')).setDisplaySize(240, 120);
      scene.add.image(54, 392, parcelKey('teal')).setDisplaySize(70, 78);
      scene.add.image(336, 396, parcelKey('mustard')).setDisplaySize(66, 74);
    },
  };

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    backgroundColor: '#231c16',
    banner: false,
    disableContextMenu: true,
    scale: scaleGame('game'),
    scene: [BootScene, MenuScene, LevelSelectScene, SettingsScene, PauseScene, PlayScene, DepotScene, DailyScene],
    callbacks: {
      preBoot: (created) => {
        created.registry.set(SHELL_KEY, shell);
        created.registry.set(PORTAL_KEY, portal);
        created.registry.set(SOUND_KEY, sound);
        created.registry.set(SAVE_KEY, save);
      },
    },
    input: { activePointers: 2 },
  });

  installBridge(game);
  window.addEventListener('pointerdown', () => sound.resume());
}
