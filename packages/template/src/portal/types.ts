export type AdKind = 'midgame' | 'rewarded';

export interface PortalSdk {
  readonly name: string;
  init(): Promise<void>;
  loadingStart(): void;
  loadingStop(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  happytime(): void;
  requestAd(kind: AdKind): Promise<boolean>;
}

interface CrazyAdCallbacks {
  adStarted?: () => void;
  adFinished?: () => void;
  adError?: (error: unknown) => void;
}

interface CrazyGamesLike {
  init?: () => Promise<void>;
  environment?: string;
  game: {
    loadingStart: () => void;
    loadingStop: () => void;
    gameplayStart: () => void;
    gameplayStop: () => void;
    happytime: () => void;
  };
  ad: {
    requestAd: (kind: AdKind, callbacks: CrazyAdCallbacks) => void;
  };
}

declare global {
  interface Window {
    CrazyGames?: { SDK?: CrazyGamesLike };
  }
}

export function readCrazyGamesSdk(): CrazyGamesLike | null {
  if (typeof window === 'undefined') return null;
  return window.CrazyGames?.SDK ?? null;
}
