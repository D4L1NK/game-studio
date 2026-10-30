import Phaser from 'phaser';
import {
  SOUND_KEY,
  SaveStore,
  SoundManager,
  addButton,
  addPanel,
  paintBackdrop,
  publishTargets,
  readShell,
} from '@game-studio/template';
import { SAVE_KEY } from '../bridge';
import { DAILY_REWARDS } from '../game/economy';
import { claimDaily, dailyStatus, todayIso, type SaveData } from '../game/progress';

export class DailyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'daily', active: false });
  }

  create(): void {
    const shell = readShell(this);
    const theme = shell.theme;
    const sound = this.registry.get(SOUND_KEY) as SoundManager;
    const save = this.registry.get(SAVE_KEY) as SaveStore<SaveData>;
    const today = todayIso();
    const status = dailyStatus(save.get(), today);
    paintBackdrop(this, theme);

    this.add
      .text(195, 120, 'Daily parcel', {
        fontFamily: theme.fontTitle,
        fontSize: '38px',
        color: '#2b241b',
      })
      .setOrigin(0.5);
    this.add
      .text(195, 168, status.claimable ? `Day ${status.streak}` : `Collected · day ${status.streak}`, {
        fontFamily: theme.fontBody,
        fontSize: '16px',
        color: '#6d5c49',
      })
      .setOrigin(0.5);

    addPanel(this, 48, 210, 294, 220, theme, 20);
    this.add
      .text(195, 270, status.claimable ? `${status.reward}` : '—', {
        fontFamily: theme.fontTitle,
        fontSize: '64px',
        color: '#2b241b',
      })
      .setOrigin(0.5);
    this.add
      .text(195, 330, 'coins', {
        fontFamily: theme.fontBody,
        fontSize: '16px',
        color: '#6d5c49',
      })
      .setOrigin(0.5);

    const marks = DAILY_REWARDS.map((_, index) => {
      const filled = status.claimable ? index < status.dayIndex : index <= status.dayIndex;
      return filled ? '●' : '○';
    }).join('  ');
    this.add
      .text(195, 390, marks, {
        fontFamily: theme.fontBody,
        fontSize: '18px',
        color: '#c4842a',
      })
      .setOrigin(0.5);

    this.add
      .text(195, 470, 'Come back each day. Miss one and the streak starts over.', {
        fontFamily: theme.fontBody,
        fontSize: '14px',
        color: '#6d5c49',
        align: 'center',
        wordWrap: { width: 280 },
      })
      .setOrigin(0.5);

    if (status.claimable) {
      addButton(this, {
        x: 195,
        y: 560,
        width: 240,
        height: 56,
        label: `Claim ${status.reward}`,
        theme,
        variant: 'primary',
        onClick: () => {
          const result = claimDaily(save.get(), today);
          save.update((draft) => {
            draft.coins = result.save.coins;
            draft.dailyLast = result.save.dailyLast;
            draft.dailyStreak = result.save.dailyStreak;
          });
          sound.play('coin');
          this.scene.restart();
        },
      });
    }

    addButton(this, {
      x: 195,
      y: 700,
      width: 220,
      height: 52,
      label: 'Back',
      theme,
      variant: 'secondary',
      onClick: () => {
        sound.play('ui');
        this.scene.start('menu');
      },
    });

    publishTargets('daily', {
      claim: { x: 195, y: 560, w: 240, h: 56 },
      back: { x: 195, y: 700, w: 220, h: 52 },
    });
  }
}
