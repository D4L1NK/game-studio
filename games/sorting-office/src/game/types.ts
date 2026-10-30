export interface VanDef {
  color: string;
  capacity: number;
}

export interface LevelDef {
  id: number;
  name: string;
  /** Each stack is bottom → top. Only the top parcel can be tapped. */
  stacks: string[][];
  vans: VanDef[];
  /** Dock peak of a designed clear. Three stars means matching this or better. */
  par: number;
}

export interface Parcel {
  id: number;
  color: string;
}

export interface SessionMods {
  dockCapacity?: number;
  widerBay?: boolean;
}

export interface Snapshot {
  stacks: Parcel[][];
  dock: Parcel[];
  vanIndex: number;
  loaded: number;
  preloaded: number[];
  moves: number;
  peakDock: number;
  dockCapacity: number;
}

export interface Session {
  stacks: Parcel[][];
  dock: Parcel[];
  vans: VanDef[];
  vanIndex: number;
  loaded: number;
  /** Parcels already placed on vans that have not arrived yet. */
  preloaded: number[];
  dockCapacity: number;
  widerBay: boolean;
  moves: number;
  peakDock: number;
  history: Snapshot[];
}

export interface VanView {
  color: string;
  capacity: number;
  loaded: number;
  active: boolean;
  early: boolean;
}
