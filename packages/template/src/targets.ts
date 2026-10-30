export interface TargetBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type TargetMap = Record<string, TargetBox>;

export interface PublishedTargets {
  scene: string;
  targets: TargetMap;
}

type Listener = (published: PublishedTargets) => void;
const listeners = new Set<Listener>();

export function publishTargets(scene: string, targets: TargetMap): void {
  const published = { scene, targets };
  for (const listener of listeners) listener(published);
}

export function onTargets(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
