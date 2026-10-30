import type { AdKind, PortalSdk } from './types';

/** Game-facing wrapper. Call sites never touch CrazyGames directly. */
export class Portal {
  constructor(private readonly sdk: PortalSdk) {}

  get name(): string {
    return this.sdk.name;
  }

  init(): Promise<void> {
    return this.sdk.init();
  }
  loadingStart(): void {
    this.sdk.loadingStart();
  }
  loadingStop(): void {
    this.sdk.loadingStop();
  }
  gameplayStart(): void {
    this.sdk.gameplayStart();
  }
  gameplayStop(): void {
    this.sdk.gameplayStop();
  }
  happytime(): void {
    this.sdk.happytime();
  }
  midgame(): Promise<boolean> {
    return this.sdk.requestAd('midgame');
  }
  rewarded(): Promise<boolean> {
    return this.sdk.requestAd('rewarded');
  }
  requestAd(kind: AdKind): Promise<boolean> {
    return this.sdk.requestAd(kind);
  }
}
