import Phaser from 'phaser';
import { SoundManager } from '../audio/SoundManager';
import { readShell } from '../shell';
import { SOUND_KEY } from './MenuScene';
import { addButton, addPanel } from '../ui/widgets';
import { publishTargets, type TargetMap } from '../targets';

export const PAUSE_SCENE_KEY = 'paused-scene';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'pause', active: false });
  }

  create(): void {
    const shell = readShell(this);
    const theme = shell.theme;
    const sound = this.registry.get(SOUND_KEY) as SoundManager;
    const parentKey = (this.registry.get(PAUSE_SCENE_KEY) as string) || 'play';

    const dim = this.add.rectangle(195, 422, 390, 844, 0x1c1712, 0.55);
    dim.setInteractive();
    addPanel(this, 40, 230, 310, 390, theme, 22);

    this.add
      .text(195, 280, 'Paused', {
        fontFamily: theme.fontTitle,
        fontSize: '36px',
        color: '#2b241b',
      })
      .setOrigin(0.5);

    const progress = shell.getProgress();
    const soundBtn = addButton(this, {
      x: 195,
      y: 360,
      width: 240,
      height: 48,
      label: progress.sound ? 'Sound on' : 'Sound off',
      theme,
      variant: 'secondary',
      fontSize: 18,
      onClick: () => {
        const next = !shell.getProgress().sound;
        shell.setSound(next);
        soundBtn.setLabel(next ? 'Sound on' : 'Sound off');
        sound.play('ui');
      },
    });

    addButton(this, {
      x: 195,
      y: 424,
      width: 240,
      height: 48,
      label: 'Resume',
      theme,
      variant: 'primary',
      onClick: () => {
        sound.play('ui');
        this.scene.stop();
        this.scene.resume(parentKey);
      },
    });

    addButton(this, {
      x: 195,
      y: 488,
      width: 240,
      height: 48,
      label: 'Restart route',
      theme,
      variant: 'secondary',
      onClick: () => {
        sound.play('ui');
        const levelId = this.registry.get('levelId') as number;
        this.scene.stop();
        this.scene.stop(parentKey);
        shell.startLevel(this, levelId);
      },
    });

    addButton(this, {
      x: 195,
      y: 552,
      width: 240,
      height: 48,
      label: 'Leave',
      theme,
      variant: 'ghost',
      onClick: () => {
        sound.play('ui');
        this.scene.stop();
        this.scene.stop(parentKey);
        this.scene.start('menu');
      },
    });

    const targets: TargetMap = {
      'pause-sound': { x: 195, y: 360, w: 240, h: 48 },
      resume: { x: 195, y: 424, w: 240, h: 48 },
      restart: { x: 195, y: 488, w: 240, h: 48 },
      leave: { x: 195, y: 552, w: 240, h: 48 },
    };
    publishTargets('pause', targets);
  }
}
