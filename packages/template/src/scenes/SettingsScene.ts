import Phaser from 'phaser';
import { SoundManager } from '../audio/SoundManager';
import { readShell } from '../shell';
import { SOUND_KEY } from './MenuScene';
import { addButton, addPanel, paintBackdrop } from '../ui/widgets';
import { publishTargets, type TargetMap } from '../targets';

export class SettingsScene extends Phaser.Scene {
  private confirm = false;

  constructor() {
    super({ key: 'settings', active: false });
  }

  create(): void {
    const shell = readShell(this);
    const theme = shell.theme;
    const sound = this.registry.get(SOUND_KEY) as SoundManager;
    paintBackdrop(this, theme);
    this.confirm = false;

    this.add
      .text(195, 120, 'Settings', {
        fontFamily: theme.fontTitle,
        fontSize: '40px',
        color: '#2b241b',
      })
      .setOrigin(0.5);

    addPanel(this, 40, 180, 310, 120, theme);
    const progress = shell.getProgress();
    const label = this.add
      .text(64, 220, 'Sound', {
        fontFamily: theme.fontBody,
        fontSize: '22px',
        color: '#2b241b',
      })
      .setOrigin(0, 0.5);
    const state = this.add
      .text(326, 220, progress.sound ? 'On' : 'Off', {
        fontFamily: theme.fontBody,
        fontSize: '20px',
        color: '#2b241b',
      })
      .setOrigin(1, 0.5);

    const toggle = addButton(this, {
      x: 195,
      y: 268,
      width: 250,
      height: 40,
      label: progress.sound ? 'Turn sound off' : 'Turn sound on',
      theme,
      variant: 'secondary',
      fontSize: 16,
      onClick: () => {
        const next = !shell.getProgress().sound;
        shell.setSound(next);
        state.setText(next ? 'On' : 'Off');
        toggle.setLabel(next ? 'Turn sound off' : 'Turn sound on');
        sound.play(next ? 'ui' : 'deny');
      },
    });

    const reset = addButton(this, {
      x: 195,
      y: 390,
      width: 250,
      height: 52,
      label: 'Reset progress',
      theme,
      variant: 'danger',
      onClick: () => {
        if (!this.confirm) {
          this.confirm = true;
          reset.setLabel('Tap again to reset');
          return;
        }
        shell.resetSave();
        sound.play('deny');
        this.scene.start('menu');
      },
    });

    addButton(this, {
      x: 195,
      y: 700,
      width: 220,
      height: 52,
      label: 'Back',
      theme,
      variant: 'primary',
      onClick: () => {
        sound.play('ui');
        this.scene.start('menu');
      },
    });

    const targets: TargetMap = {
      sound: { x: 195, y: 268, w: 250, h: 40 },
      reset: { x: 195, y: 390, w: 250, h: 52 },
      back: { x: 195, y: 700, w: 220, h: 52 },
    };
    publishTargets('settings', targets);
    void label;
  }
}
