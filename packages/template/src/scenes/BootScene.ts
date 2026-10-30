import Phaser from 'phaser';
import { Portal } from '../portal/Portal';
import { depotTheme } from '../theme';
import { readShell } from '../shell';

export const PORTAL_KEY = 'portal';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'boot' });
  }

  create(): void {
    const portal = this.registry.get(PORTAL_KEY) as Portal;
    portal.loadingStart();
    const theme = depotTheme;
    const g = this.add.graphics();
    g.fillStyle(theme.bgTop, 1);
    g.fillRect(0, 0, 390, 844);
    this.add
      .text(195, 360, 'Sorting Office', {
        fontFamily: theme.fontTitle,
        fontSize: '36px',
        color: '#2b241b',
      })
      .setOrigin(0.5);
    this.add
      .text(195, 410, 'Opening the shutters…', {
        fontFamily: theme.fontBody,
        fontSize: '16px',
        color: '#8a7660',
      })
      .setOrigin(0.5);
    const bar = this.add.graphics();
    bar.fillStyle(theme.ink, 0.1);
    bar.fillRoundedRect(95, 450, 200, 8, 4);
    bar.fillStyle(theme.accent, 1);
    bar.fillRoundedRect(95, 450, 36, 8, 4);

    const finish = () => {
      portal.loadingStop();
      this.scene.start('menu');
    };

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]).then(() => this.time.delayedCall(180, finish));
    } else {
      this.time.delayedCall(180, finish);
    }

    // Touch the shell so a missing config fails during boot, not later.
    readShell(this);
  }
}
