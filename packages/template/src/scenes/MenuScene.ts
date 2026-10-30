import Phaser from 'phaser';
import { SoundManager } from '../audio/SoundManager';
import { readShell } from '../shell';
import { addButton, paintBackdrop } from '../ui/widgets';
import { publishTargets, type TargetMap } from '../targets';

export const SOUND_KEY = 'sound';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'menu', active: false });
  }

  create(): void {
    const shell = readShell(this);
    const theme = shell.theme;
    const progress = shell.getProgress();
    const sound = this.registry.get(SOUND_KEY) as SoundManager;
    paintBackdrop(this, theme);
    shell.decorateMenu?.(this);

    this.add
      .text(195, 168, shell.title, {
        fontFamily: theme.fontTitle,
        fontSize: '48px',
        color: '#2b241b',
        align: 'center',
        wordWrap: { width: 340 },
      })
      .setOrigin(0.5);

    this.add
      .text(195, 232, shell.tagline, {
        fontFamily: theme.fontBody,
        fontSize: '16px',
        color: '#6d5c49',
        align: 'center',
        wordWrap: { width: 300 },
      })
      .setOrigin(0.5);

    const coin = this.add
      .text(195, 286, `${progress.coins} coins`, {
        fontFamily: theme.fontBody,
        fontSize: '15px',
        color: '#2b241b',
        backgroundColor: '#fff8ee',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5);

    const targets: TargetMap = {
      coins: { x: coin.x, y: coin.y, w: 140, h: 32 },
    };

    const play = addButton(this, {
      x: 195,
      y: 470,
      width: 280,
      height: 64,
      label: progress.continueLabel,
      theme,
      variant: 'primary',
      fontSize: 22,
      onClick: () => {
        sound.play('ui');
        shell.startLevel(this, progress.continueLevel);
      },
    });
    targets.play = { x: 195, y: 470, w: 280, h: 64 };

    const levels = addButton(this, {
      x: 195,
      y: 556,
      width: 280,
      height: 54,
      label: 'Routes',
      theme,
      variant: 'secondary',
      onClick: () => {
        sound.play('ui');
        this.scene.start('levels');
      },
    });
    targets.levels = { x: 195, y: 556, w: 280, h: 54 };

    addButton(this, {
      x: 108,
      y: 640,
      width: 150,
      height: 52,
      label: 'Depot',
      theme,
      variant: 'secondary',
      onClick: () => {
        sound.play('ui');
        shell.openDepot(this);
      },
    });
    targets.depot = { x: 108, y: 640, w: 150, h: 52 };

    addButton(this, {
      x: 282,
      y: 640,
      width: 150,
      height: 52,
      label: progress.dailyClaimable ? 'Daily · new' : 'Daily',
      theme,
      variant: 'secondary',
      fontSize: 18,
      onClick: () => {
        sound.play('ui');
        shell.openDaily(this);
      },
    });
    targets.daily = { x: 282, y: 640, w: 150, h: 52 };

    addButton(this, {
      x: 195,
      y: 724,
      width: 280,
      height: 48,
      label: 'Settings',
      theme,
      variant: 'ghost',
      fontSize: 18,
      onClick: () => {
        sound.play('ui');
        this.scene.start('settings');
      },
    });
    targets.settings = { x: 195, y: 724, w: 280, h: 48 };

    this.add
      .text(195, 800, 'Colours, vans, and a dock that fills up.', {
        fontFamily: theme.fontBody,
        fontSize: '13px',
        color: '#fff8ee',
      })
      .setOrigin(0.5);

    publishTargets('menu', targets);
    void play;
    void levels;
  }
}
