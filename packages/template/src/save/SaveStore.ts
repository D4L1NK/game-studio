export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

function browserStorage(): KeyValueStorage {
  if (typeof localStorage !== 'undefined') return localStorage;
  return memoryStorage();
}

/**
 * JSON save slot. Nested updates go through a mutator so callers cannot
 * accidentally shallow-merge away progress.
 */
export class SaveStore<T extends object> {
  private cache: T | null = null;

  constructor(
    private readonly key: string,
    private readonly defaults: T,
    private readonly storage: KeyValueStorage = browserStorage(),
  ) {}

  get(): T {
    if (this.cache) return this.cache;
    const raw = this.storage.getItem(this.key);
    if (!raw) {
      this.cache = structuredClone(this.defaults);
      return this.cache;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<T>;
      this.cache = { ...structuredClone(this.defaults), ...parsed };
      return this.cache;
    } catch {
      this.cache = structuredClone(this.defaults);
      return this.cache;
    }
  }

  update(mutator: (draft: T) => void): T {
    const next = structuredClone(this.get());
    mutator(next);
    this.cache = next;
    this.storage.setItem(this.key, JSON.stringify(next));
    return next;
  }

  reset(): T {
    this.cache = structuredClone(this.defaults);
    this.storage.setItem(this.key, JSON.stringify(this.cache));
    return this.cache;
  }
}
