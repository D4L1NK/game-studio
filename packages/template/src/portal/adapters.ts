import type { AdKind, PortalSdk } from './types';
import { readCrazyGamesSdk } from './types';

/** Records calls and resolves ads immediately. Used in tests and headless boot. */
export class InstantPortal implements PortalSdk {
  readonly name = 'instant-stub';
  readonly calls: string[] = [];

  async init(): Promise<void> {
    this.calls.push('init');
  }
  loadingStart(): void {
    this.calls.push('loadingStart');
  }
  loadingStop(): void {
    this.calls.push('loadingStop');
  }
  gameplayStart(): void {
    this.calls.push('gameplayStart');
  }
  gameplayStop(): void {
    this.calls.push('gameplayStop');
  }
  happytime(): void {
    this.calls.push('happytime');
  }
  async requestAd(kind: AdKind): Promise<boolean> {
    this.calls.push(`ad:${kind}`);
    return true;
  }
}

/**
 * Local stand-in for CrazyGames ads. A short overlay stands in for the
 * network so rewarded flows can be exercised without the SDK.
 */
export class DomStubPortal implements PortalSdk {
  readonly name = 'dom-stub';

  async init(): Promise<void> {}
  loadingStart(): void {}
  loadingStop(): void {}
  gameplayStart(): void {}
  gameplayStop(): void {}
  happytime(): void {}

  requestAd(kind: AdKind): Promise<boolean> {
    return showStubAd(kind);
  }
}

export class CrazyGamesPortal implements PortalSdk {
  readonly name = 'crazygames';

  constructor(private readonly sdk: NonNullable<ReturnType<typeof readCrazyGamesSdk>>) {}

  async init(): Promise<void> {
    if (!this.sdk.init) return;
    await Promise.race([
      this.sdk.init(),
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);
  }
  loadingStart(): void {
    this.guard(() => this.sdk.game.loadingStart());
  }
  loadingStop(): void {
    this.guard(() => this.sdk.game.loadingStop());
  }
  gameplayStart(): void {
    this.guard(() => this.sdk.game.gameplayStart());
  }
  gameplayStop(): void {
    this.guard(() => this.sdk.game.gameplayStop());
  }
  happytime(): void {
    this.guard(() => this.sdk.game.happytime());
  }
  requestAd(kind: AdKind): Promise<boolean> {
    if (!hostedOnCrazyGames(this.sdk.environment)) return showStubAd(kind);
    return new Promise((resolve) => {
      try {
        this.sdk.ad.requestAd(kind, {
          adFinished: () => resolve(true),
          adError: () => resolve(false),
        });
      } catch {
        resolve(false);
      }
    });
  }

  private guard(fn: () => void): void {
    try {
      fn();
    } catch {
      /* The host SDK can reject calls outside an approved embed. */
    }
  }
}

function hostedOnCrazyGames(environment: string | undefined): boolean {
  if (environment === 'crazygames') return true;
  if (environment === 'local') return false;
  if (typeof document === 'undefined') return false;
  return document.referrer.includes('crazygames.com');
}

function showStubAd(kind: AdKind): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(true);
  return new Promise((resolve) => {
    const root = document.createElement('div');
    root.setAttribute('data-stub-ad', kind);
    root.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:99999',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:rgba(28,23,18,0.72)',
      'font-family:Georgia,serif',
      'color:#fff8ee',
    ].join(';');
    const card = document.createElement('div');
    card.style.cssText = [
      'width:min(320px,86vw)',
      'padding:28px 24px',
      'border-radius:18px',
      'background:#2b241b',
      'text-align:center',
      'box-shadow:0 18px 50px rgba(0,0,0,0.35)',
    ].join(';');
    const eyebrow = document.createElement('div');
    eyebrow.textContent = kind === 'rewarded' ? 'A small favour' : 'A short break';
    eyebrow.style.cssText = 'letter-spacing:0.14em;text-transform:uppercase;font-size:12px;opacity:0.7';
    const title = document.createElement('h2');
    title.textContent = kind === 'rewarded' ? 'Demo reward' : 'Demo interlude';
    title.style.cssText = 'font-weight:500;font-size:28px;margin:10px 0';
    const body = document.createElement('p');
    body.textContent =
      'A local stand-in, shown when a CrazyGames ad is not available.';
    body.style.cssText = 'font-family:sans-serif;font-size:14px;line-height:1.45;opacity:0.85';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = kind === 'rewarded' ? 'Collect reward' : 'Continue';
    button.style.cssText = [
      'margin-top:8px',
      'border:0',
      'background:#d4654a',
      'color:#fff8ee',
      'font:600 16px/1 sans-serif',
      'padding:12px 22px',
      'border-radius:999px',
      'cursor:pointer',
    ].join(';');
    button.addEventListener('click', () => {
      root.remove();
      resolve(true);
    });
    card.append(eyebrow, title, body, button);
    root.append(card);
    document.body.append(root);
  });
}

export async function createPortal(timeoutMs = 800): Promise<PortalSdk> {
  const existing = readCrazyGamesSdk();
  const sdk = existing ?? (await waitForSdk(timeoutMs));
  if (!sdk) return new DomStubPortal();
  const portal = new CrazyGamesPortal(sdk);
  try {
    await portal.init();
  } catch {
    return new DomStubPortal();
  }
  return portal;
}

function waitForSdk(timeoutMs: number): Promise<ReturnType<typeof readCrazyGamesSdk>> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const sdk = readCrazyGamesSdk();
      if (sdk) {
        resolve(sdk);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(null);
        return;
      }
      setTimeout(tick, 40);
    };
    tick();
  });
}
