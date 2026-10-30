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
  type TargetMap,
} from '@game-studio/template';
import { SAVE_KEY } from '../bridge';
import { PRICES, type UpgradeId } from '../game/economy';
import { purchase, type SaveData } from '../game/progress';

const CARDS: Array<{ id: UpgradeId; title: string; body: string; price: number; owned?: (save: SaveData) => boolean }> = [
  {
    id: 'extraDock',
    title: 'Extra dock slot',
    body: 'A sixth berth on the dock for the rest of your career.',
    price: PRICES.extraDock,
    owned: (save) => save.extraDock,
  },
  {
    id: 'widerBay',
    title: 'Wider loading bay',
    body: 'Parcels may load onto the next van before it pulls up.',
    price: PRICES.widerBay,
    owned: (save) => save.widerBay,
  },
  {
    id: 'undoPack',
    title: 'Undo stamps',
    body: 'Three undos. Put a parcel back where you found it.',
    price: PRICES.undoPack,
  },
  {
    id: 'shufflePack',
    title: 'Shelf shuffle',
    body: 'Three shuffles. The shelves keep their heights, not their order.',
    price: PRICES.shufflePack,
  },
];

export class DepotScene extends Phaser.Scene {
  constructor() {
    super({ key: 'depot', active: false });
  }

  create(): void {
    const shell = readShell(this);
    const theme = shell.theme;
    const sound = this.registry.get(SOUND_KEY) as SoundManager;
    const save = this.registry.get(SAVE_KEY) as SaveStore<SaveData>;
    const data = save.get();
    paintBackdrop(this, theme);
    const targets: TargetMap = {};

    this.add
      .text(24, 36, 'Depot', {
        fontFamily: theme.fontTitle,
        fontSize: '36px',
        color: '#2b241b',
      })
      .setOrigin(0, 0.5);
    this.add
      .text(24, 72, `${data.coins} coins`, {
        fontFamily: theme.fontBody,
        fontSize: '16px',
        color: '#6d5c49',
      })
      .setOrigin(0, 0);

    const back = addButton(this, {
      x: 320,
      y: 48,
      width: 100,
      height: 40,
      label: 'Back',
      theme,
      variant: 'secondary',
      fontSize: 16,
      onClick: () => {
        sound.play('ui');
        this.scene.start('menu');
      },
    });
    targets.back = { x: 320, y: 48, w: 100, h: 40 };
    void back;

    CARDS.forEach((card, index) => {
      const y = 118 + index * 148;
      addPanel(this, 20, y, 350, 136, theme, 16);
      this.add
        .text(36, y + 16, card.title, {
          fontFamily: theme.fontTitle,
          fontSize: '22px',
          color: '#2b241b',
        })
        .setOrigin(0, 0);
      this.add
        .text(36, y + 48, card.body, {
          fontFamily: theme.fontBody,
          fontSize: '14px',
          color: '#6d5c49',
          wordWrap: { width: 318 },
        })
        .setOrigin(0, 0);
      const owned = card.owned?.(data) ?? false;
      const stock =
        card.id === 'undoPack' ? `${data.undos} left` : card.id === 'shufflePack' ? `${data.shuffles} left` : '';
      const label = owned ? 'Owned' : `${card.price} coins${stock ? ` · ${stock}` : ''}`;
      const button = addButton(this, {
        x: 195,
        y: y + 108,
        width: 300,
        height: 36,
        label,
        theme,
        variant: owned ? 'ghost' : 'primary',
        fontSize: 15,
        onClick: () => {
          if (owned) return;
          const result = purchase(save.get(), card.id);
          if (!result.ok) {
            sound.play('deny');
            return;
          }
          save.update((draft) => {
            Object.assign(draft, result.save);
          });
          sound.play('coin');
          this.scene.restart();
        },
      });
      if (owned) button.setEnabled(false);
      targets[`buy-${card.id}`] = { x: 195, y: y + 108, w: 300, h: 36 };
    });

    publishTargets('depot', targets);
  }
}
