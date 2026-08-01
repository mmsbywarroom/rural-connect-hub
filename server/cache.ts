/** Tiny in-memory TTL cache for hot read endpoints (single process). */
type Entry<T> = { expires: number; value: T };

const store = new Map<string, Entry<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expires) {
    store.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expires: Date.now() + ttlMs });
}

export function cacheDel(prefixOrKey: string): void {
  if (store.has(prefixOrKey)) {
    store.delete(prefixOrKey);
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefixOrKey)) store.delete(key);
  }
}
