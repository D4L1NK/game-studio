import Phaser from 'phaser';
import {
  PAUSE_SCENE_KEY,
  PORTAL_KEY,
  SOUND_KEY,
  SaveStore,
  SoundManager,
  Portal,
  addButton,
  addPanel,
  paintBackdrop,
  publishTargets,
  readShell,
  type TargetMap,
} from '@game-studio/template';
import { getLevel, levelCount } from '../content/levels';
import { colorOf } from '../content/palette';
import { SAVE_KEY, setStateReader } from '../bridge';
import { shouldShowMidgame, starsForPeak } from '../game/economy';
import { applyVictory, type SaveData } from '../game/progress';
import {
  continueAfterFail,
  createSession,
  isWin,
  isStuck,
  parcelsRemaining,
  shuffleBoard,
  tap,
  undo,
  vanViews,
} from '../game/session';
import type { LevelDef, Session } from '../game/types';
import { ensureDepotArt, parcelKey, vanKey } from '../view/art';
import { expressBlurb } from '../game/difficulty';

const PREVIEW = 3;
const HINTS: Record<number, string> = {
  1: 'Tap a top parcel. Matching colours load straight onto the van.',
  2: 'Clear this van and the next colour pulls in.',
  3: 'A mismatch waits on the dock until its own van arrives.',
};

export class PlayScene extends Phaser.Scene {
  private session!: Session;
  private level!: LevelDef;
  private save!: SaveStore<SaveData>;
  private audio!: SoundManager;
  private portal!: Portal;
  private layer!: Phaser.GameObjects.Container;
  private modal!: Phaser.GameObjects.Container;
  private targets: TargetMap = {};
  private locked = false;
  private playing = false;
  private settled = false;
  private doubled = false;
  private earned = 0;
  private stars: 1 | 2 | 3 = 1;
  private flying = false;
  private vanImage: Phaser.GameObjects.Image | null = null;
  private vanAnchor = { x: 106, y: 168 };
  private dockAnchors: Array<{ x: number; y: number }> = [];
  private readonly motion =
    typeof matchMedia === 'undefined' || !matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor() {
    super({ key: 'play', active: false });
  }

  create(): void {
    const shell = readShell(this);
    const levelId = (this.registry.get('levelId') as number) || 1;
    const level = getLevel(levelId);
    if (!level) {
      this.scene.start('menu');
      return;
    }
    this.level = level;
    this.save = this.registry.get(SAVE_KEY) as SaveStore<SaveData>;
    this.audio = this.registry.get(SOUND_KEY) as SoundManager;
    this.portal = this.registry.get(PORTAL_KEY) as Portal;
    const data = this.save.get();
    this.session = createSession(level, {
      dockCapacity: data.extraDock ? 6 : 5,
      widerBay: data.widerBay,
    });
    this.locked = false;
    this.settled = false;
    this.doubled = false;
    this.earned = 0;
    ensureDepotArt(this);
    paintBackdrop(this, shell.theme);
    this.layer = this.add.container(0, 0);
    this.modal = this.add.container(0, 0).setDepth(20);
    setStateReader(() => ({
      levelId: this.level.id,
      moves: this.session.moves,
      dock: this.session.dock.length,
      loaded: this.session.loaded,
      remaining: parcelsRemaining(this.session),
      won: isWin(this.session),
    }));
    this.render();
    const seen = data.expressSeen ?? {};
    if (level.tag === 'very-hard' && !seen[String(level.id)]) {
      this.locked = true;
      this.showExpress();
    } else {
      this.markPlay(true);
      this.arriveVan();
    }
    this.events.on('resume', () => {
      if (!this.locked) this.markPlay(true);
      publishTargets('play', this.targets);
    });
    this.events.on('shutdown', () => {
      this.markPlay(false);
      setStateReader(() => null);
    });
    this.input.keyboard?.on('keydown-ESC', () => this.openPause());
    this.input.keyboard?.on('keydown-U', () => this.onUndo());
    this.input.keyboard?.on('keydown-R', () => {
      if (!this.locked) this.scene.restart();
    });
  }

  private markPlay(on: boolean): void {
    if (on === this.playing) return;
    this.playing = on;
    if (on) this.portal.gameplayStart();
    else this.portal.gameplayStop();
  }

  private render(): void {
    this.layer.removeAll(true);
    const shell = readShell(this);
    const theme = shell.theme;
    const data = this.save.get();
    const views = vanViews(this.session, PREVIEW);
    const g = this.add.graphics();
    this.layer.add(g);
    this.targets = {};
    this.vanImage = null;

    this.layer.add(
      this.add
        .text(20, 22, `Route ${this.level.id}`, {
          fontFamily: theme.fontBody,
          fontSize: '13px',
          color: '#8a7660',
        })
        .setOrigin(0, 0),
    );
    this.layer.add(
      this.add
        .text(20, 40, this.level.name, {
          fontFamily: theme.fontTitle,
          fontSize: '26px',
          color: '#2b241b',
        })
        .setOrigin(0, 0),
    );
    this.layer.add(
      this.add
        .text(20, 74, `${data.coins} coins`, {
          fontFamily: theme.fontBody,
          fontSize: '14px',
          color: '#6d5c49',
        })
        .setOrigin(0, 0),
    );

    g.fillStyle(theme.ink, 1);
    g.fillCircle(350, 42, 18);
    g.fillStyle(theme.cream, 1);
    g.fillRoundedRect(343, 34, 4, 16, 1);
    g.fillRoundedRect(350, 34, 4, 16, 1);
    const pause = this.add.zone(350, 42, 44, 44).setInteractive({ useHandCursor: true });
    pause.on('pointerup', () => this.openPause());
    this.layer.add(pause);
    this.targets.pause = { x: 350, y: 42, w: 44, h: 44 };

    g.fillStyle(0x2b241b, 0.08);
    g.fillRoundedRect(18, 112, 358, 132, 16);
    g.fillStyle(0xfff8ee, 1);
    g.fillRoundedRect(16, 108, 358, 132, 16);
    if (this.level.tag === 'very-hard') {
      this.layer.add(
        this.add
          .text(168, 28, 'EXPRESS', {
            fontFamily: theme.fontBody,
            fontSize: '11px',
            color: '#fff8ee',
            backgroundColor: '#a33b32',
            padding: { x: 6, y: 3 },
            fontStyle: '700',
          })
          .setOrigin(0, 0),
      );
    }
    if (views.current) {
      this.vanImage = this.add.image(106, 168, vanKey(views.current.color)).setDisplaySize(150, 80);
      this.layer.add(this.vanImage);
      this.vanAnchor = { x: 106, y: 168 };
      const info = colorOf(views.current.color);
      this.layer.add(
        this.add
          .text(196, 136, info.name, {
            fontFamily: theme.fontTitle,
            fontSize: '26px',
            color: '#2b241b',
          })
          .setOrigin(0, 0),
      );
      this.layer.add(
        this.add
          .text(196, 172, `${views.current.loaded} of ${views.current.capacity} loaded`, {
            fontFamily: theme.fontBody,
            fontSize: '16px',
            color: '#6d5c49',
          })
          .setOrigin(0, 0),
      );
    }

    this.layer.add(
      this.add
        .text(20, 252, 'Coming up', {
          fontFamily: theme.fontBody,
          fontSize: '13px',
          color: '#8a7660',
        })
        .setOrigin(0, 0),
    );

    views.upcoming.forEach((van, index) => {
      const x = 16 + index * 122;
      g.fillStyle(van.early ? 0xfff8ee : 0xf7efe2, 1);
      g.fillRoundedRect(x, 274, 114, 62, 12);
      g.lineStyle(2, van.early ? theme.accent : theme.ink, van.early ? 0.9 : 0.08);
      g.strokeRoundedRect(x, 274, 114, 62, 12);
      const mini = this.add.image(x + 30, 304, vanKey(van.color)).setDisplaySize(48, 28);
      this.layer.add(mini);
      const info = colorOf(van.color);
      this.layer.add(
        this.add
          .text(x + 60, 286, info.name, {
            fontFamily: theme.fontBody,
            fontSize: '12px',
            color: '#2b241b',
          })
          .setOrigin(0, 0),
      );
      this.layer.add(
        this.add
          .text(x + 60, 304, van.early ? 'in the bay' : `${van.loaded}/${van.capacity}`, {
            fontFamily: theme.fontBody,
            fontSize: '12px',
            color: '#6d5c49',
          })
          .setOrigin(0, 0),
      );
    });
    if (views.upcoming.length === 0) {
      this.layer.add(
        this.add
          .text(20, 292, 'Last van of the route', {
            fontFamily: theme.fontBody,
            fontSize: '14px',
            color: '#6d5c49',
          })
          .setOrigin(0, 0),
      );
    }

    const hint = HINTS[this.level.id];
    if (hint) {
      this.layer.add(
        this.add
          .text(195, 352, hint, {
            fontFamily: theme.fontBody,
            fontSize: '13px',
            color: '#6d5c49',
            align: 'center',
            wordWrap: { width: 340 },
          })
          .setOrigin(0.5, 0),
      );
    }

    this.drawBoard(g);
    this.drawDock(g, theme.ink, theme.woodDark);

    const undoLabel = data.undos > 0 ? `Undo · ${data.undos}` : 'Undo · ad';
    const shuffleLabel = data.shuffles > 0 ? `Shuffle · ${data.shuffles}` : 'Shuffle';
    const undoButton = addButton(this, {
      x: 100,
      y: 802,
      width: 160,
      height: 46,
      label: undoLabel,
      theme,
      variant: 'secondary',
      fontSize: 16,
      onClick: () => this.onUndo(),
    });
    const shuffleButton = addButton(this, {
      x: 280,
      y: 802,
      width: 160,
      height: 46,
      label: shuffleLabel,
      theme,
      variant: 'secondary',
      fontSize: 16,
      onClick: () => this.onShuffle(),
    });
    this.layer.add(undoButton.container);
    this.layer.add(shuffleButton.container);
    this.targets.undo = { x: 100, y: 802, w: 160, h: 46 };
    this.targets.shuffle = { x: 280, y: 802, w: 160, h: 46 };
    publishTargets('play', this.targets);
  }

  private drawBoard(g: Phaser.GameObjects.Graphics): void {
    const count = this.session.stacks.length;
    const parcelW = count >= 5 ? 58 : 64;
    const gap = count >= 5 ? 8 : 12;
    const total = count * parcelW + (count - 1) * gap;
    const start = (390 - total) / 2;
    const parcelH = 50;
    const step = 22;
    const maxDepth = Math.max(1, ...this.session.stacks.map((stack) => stack.length));
    const stackPx = parcelH + (maxDepth - 1) * step;
    const regionTop = 392;
    const regionBottom = 676;
    const spare = Math.max(0, regionBottom - regionTop - stackPx);
    const baseline = regionTop + stackPx + spare * 0.2;
    this.session.stacks.forEach((stack, index) => {
      const x = start + index * (parcelW + gap);
      if (stack.length === 0) {
        g.fillStyle(0xc4a574, 0.28);
        g.fillRoundedRect(x, baseline - parcelH, parcelW, parcelH, 10);
        return;
      }
      g.fillStyle(0xc4a574, 0.55);
      g.fillRoundedRect(x + 8, baseline - 6, parcelW - 16, 6, 2);
      stack.forEach((parcel, depth) => {
        const buried = depth !== stack.length - 1;
        const y = baseline - parcelH - depth * step;
        const sprite = this.add
          .image(x + parcelW / 2, y + parcelH / 2, parcelKey(parcel.color))
          .setDisplaySize(buried ? parcelW * 0.92 : parcelW, buried ? parcelH * 0.92 : parcelH)
          .setAlpha(buried ? 0.88 : 1);
        this.layer.add(sprite);
      });
      const top = stack[stack.length - 1];
      if (!top) return;
      const y = baseline - parcelH - (stack.length - 1) * step;
      const zone = this.add.zone(x + parcelW / 2, y + parcelH / 2, parcelW, parcelH).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => this.onTap(index));
      this.layer.add(zone);
      this.targets[`stack-${index}`] = { x: x + parcelW / 2, y: y + parcelH / 2, w: parcelW, h: parcelH };
    });
  }

  private drawDock(g: Phaser.GameObjects.Graphics, ink: number, woodDark: number): void {
    const capacity = this.session.dockCapacity;
    const slot = capacity >= 6 ? 50 : 56;
    const gap = 6;
    const total = capacity * slot + (capacity - 1) * gap;
    const start = (390 - total) / 2;
    const y = 708;
    this.dockAnchors = [];
    this.layer.add(
      this.add
        .text(start, 688, `Dock  ${this.session.dock.length}/${capacity}   ·   peak ${this.session.peakDock}`, {
          fontFamily: '"Nunito", "Segoe UI", sans-serif',
          fontSize: '13px',
          color: '#2b241b',
        })
        .setOrigin(0, 0),
    );
    for (let index = 0; index < capacity; index += 1) {
      const x = start + index * (slot + gap);
      g.fillStyle(woodDark, 0.55);
      g.fillRoundedRect(x, y, slot, 52, 8);
      g.lineStyle(2, ink, 0.15);
      g.strokeRoundedRect(x, y, slot, 52, 8);
      this.dockAnchors.push({ x: x + slot / 2, y: y + 26 });
      const parcel = this.session.dock[index];
      if (parcel) {
        const sprite = this.add.image(x + slot / 2, y + 26, parcelKey(parcel.color)).setDisplaySize(slot - 10, 46);
        this.layer.add(sprite);
      }
    }
  }

  private onTap(index: number): void {
    if (this.locked || this.flying) return;
    const from = this.targets[`stack-${index}`];
    const color = this.session.stacks[index]?.[this.session.stacks[index].length - 1]?.color;
    if (!from || !color) return;
    const previousVan = this.session.vans[this.session.vanIndex]?.color;
    const result = tap(this.session, index);
    if (!result.ok) {
      if (isStuck(this.session)) this.openFail();
      else this.audio.play('deny');
      return;
    }
    this.audio.play(result.dest === 'dock' ? 'tap' : 'load');
    if (result.won) this.locked = true;
    this.flying = true;
    this.render();
    const dest =
      result.dest === 'dock'
        ? (this.dockAnchors[this.session.dock.length - 1] ?? this.vanAnchor)
        : this.vanAnchor;
    this.flyParcel(color, from, dest, () => {
      this.flying = false;
      if (result.departed) {
        this.audio.play('full');
        this.audio.play('depart');
        this.departGhost(previousVan);
      } else if (result.dest !== 'dock' && this.vanImage) {
        this.tweens.add({
          targets: this.vanImage,
          scaleX: this.vanImage.scaleX * 1.06,
          scaleY: this.vanImage.scaleY * 1.06,
          yoyo: true,
          duration: this.motion ? 120 : 1,
        });
      }
      if (result.dest === 'dock' && this.session.dock.length >= this.session.dockCapacity - 1) this.warnDock();
      if (result.won) {
        this.audio.play('win');
        this.starBurst(() => void this.openWin());
        return;
      }
      if (isStuck(this.session)) this.openFail();
    });
  }

  private flyParcel(
    color: string,
    from: { x: number; y: number; w: number; h: number },
    dest: { x: number; y: number },
    done: () => void,
  ): void {
    const flyer = this.add.image(from.x, from.y, parcelKey(color)).setDisplaySize(from.w, from.h).setDepth(30);
    const duration = this.motion ? 230 : 1;
    this.tweens.add({
      targets: flyer,
      scaleX: flyer.scaleX * 1.16,
      scaleY: flyer.scaleY * 0.82,
      duration: Math.min(80, duration),
      yoyo: true,
    });
    this.tweens.add({
      targets: flyer,
      x: dest.x,
      y: dest.y,
      duration,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.puff(dest.x, dest.y, colorOf(color).fill);
        flyer.destroy();
        done();
      },
    });
  }

  private puff(x: number, y: number, tint: number): void {
    const count = this.motion ? 7 : 0;
    for (let i = 0; i < count; i += 1) {
      const dot = this.add.image(x, y, 'depot-spark').setTint(tint).setDepth(31).setScale(0.7);
      const angle = (Math.PI * 2 * i) / count;
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * 26,
        y: y + Math.sin(angle) * 16,
        alpha: 0,
        scale: 0.15,
        duration: 280,
        onComplete: () => dot.destroy(),
      });
    }
  }

  private warnDock(): void {
    this.audio.play('warn');
    if (!this.motion) return;
    this.cameras.main.shake(160, 0.005);
    const flash = this.add.rectangle(195, 422, 390, 844, 0xa33b32, 0.28).setDepth(28);
    this.tweens.add({ targets: flash, alpha: 0, duration: 280, onComplete: () => flash.destroy() });
  }

  private departGhost(color: string | undefined): void {
    if (!color) return;
    const ghost = this.add.image(this.vanAnchor.x, this.vanAnchor.y, vanKey(color)).setDisplaySize(150, 80).setDepth(8);
    this.puff(this.vanAnchor.x, this.vanAnchor.y, 0xfff8ee);
    this.tweens.add({
      targets: ghost,
      x: this.vanAnchor.x + 220,
      alpha: 0,
      duration: this.motion ? 380 : 1,
      ease: 'Cubic.easeIn',
      onComplete: () => ghost.destroy(),
    });
    if (this.vanImage) {
      const rest = this.vanAnchor.x;
      this.vanImage.x = rest - 36;
      this.tweens.add({
        targets: this.vanImage,
        x: rest,
        duration: this.motion ? 320 : 1,
        ease: 'Back.easeOut',
      });
    }
  }

  private arriveVan(): void {
    if (!this.vanImage || !this.motion) return;
    const rest = this.vanImage.x;
    this.vanImage.x = rest - 28;
    this.vanImage.alpha = 0.2;
    this.tweens.add({ targets: this.vanImage, x: rest, alpha: 1, duration: 280, ease: 'Back.easeOut' });
  }

  private starBurst(done: () => void): void {
    const count = this.motion ? 10 : 0;
    for (let i = 0; i < count; i += 1) {
      const star = this.add
        .text(195, 430, '★', { fontFamily: 'Nunito, sans-serif', fontSize: '22px', color: '#e0a83a' })
        .setOrigin(0.5)
        .setDepth(32);
      const angle = (Math.PI * 2 * i) / count;
      this.tweens.add({
        targets: star,
        x: 195 + Math.cos(angle) * 120,
        y: 430 + Math.sin(angle) * 90,
        alpha: 0,
        scale: 1.4,
        duration: 520,
        onComplete: () => star.destroy(),
      });
    }
    this.time.delayedCall(this.motion ? 420 : 1, done);
  }

  private showExpress(): void {
    const shell = readShell(this);
    const theme = shell.theme;
    this.modal.removeAll(true);
    const dim = this.add.rectangle(195, 422, 390, 844, 0x1c1712, 0.45).setInteractive();
    this.modal.add(dim);
    const panel = addPanel(this, 36, 250, 318, 280, theme, 22);
    this.modal.add(panel);
    this.modal.add(
      this.add
        .text(195, 292, 'Express', {
          fontFamily: theme.fontTitle,
          fontSize: '36px',
          color: '#a33b32',
        })
        .setOrigin(0.5),
    );
    this.modal.add(
      this.add
        .text(195, 360, expressBlurb(), {
          fontFamily: theme.fontBody,
          fontSize: '16px',
          color: '#2b241b',
          align: 'center',
          wordWrap: { width: 260 },
        })
        .setOrigin(0.5),
    );
    const start = addButton(this, {
      x: 195,
      y: 470,
      width: 220,
      height: 52,
      label: 'Sort it',
      theme,
      variant: 'primary',
      onClick: () => {
        this.save.update((draft) => {
          draft.expressSeen[String(this.level.id)] = 1;
        });
        this.audio.play('ui');
        this.modal.removeAll(true);
        this.locked = false;
        publishTargets('play', this.targets);
        this.markPlay(true);
        this.arriveVan();
      },
    });
    this.modal.add(start.container);
    publishTargets('express', { 'express-start': { x: 195, y: 470, w: 220, h: 52 } });
  }

  private onUndo(): void {
    if (this.locked) return;
    if (this.session.history.length === 0) {
      this.audio.play('deny');
      this.flash('Nothing to undo');
      return;
    }
    const data = this.save.get();
    if (data.undos <= 0) {
      void this.freeUndo();
      return;
    }
    if (!undo(this.session)) return;
    this.save.update((draft) => {
      draft.undos = Math.max(0, draft.undos - 1);
    });
    this.audio.play('ui');
    this.render();
  }

  private async freeUndo(): Promise<void> {
    this.locked = true;
    const ok = await this.withAd('rewarded');
    this.locked = false;
    if (!ok || !undo(this.session)) {
      this.audio.play('deny');
      return;
    }
    this.audio.play('coin');
    this.render();
  }

  private onShuffle(): void {
    if (this.locked) return;
    const data = this.save.get();
    if (data.shuffles <= 0) {
      this.audio.play('deny');
      this.flash('Buy shuffles in the Depot');
      return;
    }
    if (!shuffleBoard(this.session, Math.random)) {
      this.audio.play('deny');
      return;
    }
    this.save.update((draft) => {
      draft.shuffles = Math.max(0, draft.shuffles - 1);
    });
    this.audio.play('tap');
    this.render();
  }

  private openPause(): void {
    if (this.locked) return;
    this.markPlay(false);
    this.audio.play('ui');
    this.registry.set(PAUSE_SCENE_KEY, 'play');
    this.scene.launch('pause');
    this.scene.pause();
  }

  private async openWin(): Promise<void> {
    if (this.settled) return;
    this.settled = true;
    this.locked = true;
    this.markPlay(false);
    this.stars = starsForPeak(this.session.peakDock, this.level.par);
    const applied = applyVictory(this.save.get(), this.level.id, this.stars, levelCount());
    this.earned = applied.earned;
    this.save.update((draft) => {
      draft.coins = applied.save.coins;
      draft.unlocked = applied.save.unlocked;
      draft.best = applied.save.best;
    });
    if (this.stars === 3) this.portal.happytime();
    if (shouldShowMidgame(this.level.id)) await this.withAd('midgame');
    this.showWin();
  }

  private showWin(): void {
    this.render();
    const shell = readShell(this);
    const theme = shell.theme;
    this.modal.removeAll(true);
    const dim = this.add.rectangle(195, 422, 390, 844, 0x1c1712, 0.56).setInteractive();
    this.modal.add(dim);
    const panel = addPanel(this, 36, 210, 318, 430, theme, 22);
    this.modal.add(panel);
    const title = this.add
      .text(195, 258, 'Nicely sorted', {
        fontFamily: theme.fontTitle,
        fontSize: '34px',
        color: '#2b241b',
      })
      .setOrigin(0.5);
    const stars = this.add
      .text(195, 312, '★'.repeat(this.stars) + '☆'.repeat(3 - this.stars), {
        fontFamily: theme.fontBody,
        fontSize: '28px',
        color: '#c4842a',
      })
      .setOrigin(0.5);
    const coins = this.add
      .text(195, 360, this.earned > 0 ? `+${this.earned} coins` : 'Best score kept', {
        fontFamily: theme.fontBody,
        fontSize: '18px',
        color: '#6d5c49',
      })
      .setOrigin(0.5);
    this.modal.add([title, stars, coins]);
    if (!this.doubled) {
      const double = addButton(this, {
        x: 195,
        y: 420,
        width: 250,
        height: 48,
        label: this.earned > 0 ? 'Double coins' : 'Bonus coins',
        theme,
        variant: 'secondary',
        fontSize: 18,
        onClick: () => void this.doubleCoins(coins, double),
      });
      this.modal.add(double.container);
    }
    const nextId = this.level.id + 1;
    const next = addButton(this, {
      x: 195,
      y: 488,
      width: 250,
      height: 52,
      label: nextId <= levelCount() ? 'Next route' : 'Back to the office',
      theme,
      variant: 'primary',
      onClick: () => {
        this.audio.play('ui');
        if (nextId <= levelCount()) {
          this.registry.set('levelId', nextId);
          this.scene.start('play');
        } else {
          this.scene.start('menu');
        }
      },
    });
    const menu = addButton(this, {
      x: 195,
      y: 556,
      width: 250,
      height: 46,
      label: 'Menu',
      theme,
      variant: 'ghost',
      fontSize: 18,
      onClick: () => {
        this.audio.play('ui');
        this.scene.start('menu');
      },
    });
    this.modal.add(next.container);
    this.modal.add(menu.container);
    publishTargets('win', {
      next: { x: 195, y: 488, w: 250, h: 52 },
      menu: { x: 195, y: 556, w: 250, h: 46 },
    });
  }

  private async doubleCoins(
    label: Phaser.GameObjects.Text,
    button: { container: Phaser.GameObjects.Container },
  ): Promise<void> {
    if (this.doubled) return;
    const ok = await this.withAd('rewarded');
    if (!ok) return;
    const bonus = this.earned > 0 ? this.earned : 20;
    this.save.update((draft) => {
      draft.coins += bonus;
    });
    this.doubled = true;
    this.earned += bonus;
    label.setText(`+${this.earned} coins`);
    button.container.destroy();
    this.audio.play('coin');
  }

  private openFail(): void {
    this.locked = true;
    this.markPlay(false);
    this.audio.play('fail');
    const shell = readShell(this);
    const theme = shell.theme;
    this.modal.removeAll(true);
    const dim = this.add.rectangle(195, 422, 390, 844, 0x1c1712, 0.56).setInteractive();
    this.modal.add(dim);
    const panel = addPanel(this, 36, 230, 318, 390, theme, 22);
    this.modal.add(panel);
    this.modal.add(
      this.add
        .text(195, 280, 'Dock overflow', {
          fontFamily: theme.fontTitle,
          fontSize: '32px',
          color: '#2b241b',
        })
        .setOrigin(0.5),
    );
    this.modal.add(
      this.add
        .text(195, 340, 'Nothing else fits. A short reward ad opens one more berth.', {
          fontFamily: theme.fontBody,
          fontSize: '16px',
          color: '#6d5c49',
          align: 'center',
          wordWrap: { width: 260 },
        })
        .setOrigin(0.5),
    );
    const cont = addButton(this, {
      x: 195,
      y: 420,
      width: 250,
      height: 52,
      label: 'Continue',
      theme,
      variant: 'primary',
      onClick: () => void this.continueRun(),
    });
    const retry = addButton(this, {
      x: 195,
      y: 488,
      width: 250,
      height: 46,
      label: 'Retry route',
      theme,
      variant: 'secondary',
      fontSize: 18,
      onClick: () => {
        this.audio.play('ui');
        this.scene.restart();
      },
    });
    const menu = addButton(this, {
      x: 195,
      y: 548,
      width: 250,
      height: 46,
      label: 'Menu',
      theme,
      variant: 'ghost',
      fontSize: 18,
      onClick: () => {
        this.audio.play('ui');
        this.scene.start('menu');
      },
    });
    this.modal.add(cont.container);
    this.modal.add(retry.container);
    this.modal.add(menu.container);
  }

  private async continueRun(): Promise<void> {
    const ok = await this.withAd('rewarded');
    if (!ok) return;
    continueAfterFail(this.session);
    this.modal.removeAll(true);
    this.locked = false;
    this.markPlay(true);
    this.audio.play('coin');
    this.render();
  }

  private async withAd(kind: 'midgame' | 'rewarded'): Promise<boolean> {
    this.audio.hold(true);
    try {
      return kind === 'midgame' ? await this.portal.midgame() : await this.portal.rewarded();
    } finally {
      this.audio.hold(false);
    }
  }

  private flash(message: string): void {
    const text = this.add
      .text(195, 640, message, {
        fontFamily: '"Liberation Sans", "Segoe UI", sans-serif',
        fontSize: '15px',
        color: '#fff8ee',
        backgroundColor: '#2b241b',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(40);
    this.tweens.add({
      targets: text,
      alpha: 0,
      delay: 700,
      duration: 280,
      onComplete: () => text.destroy(),
    });
  }
}
