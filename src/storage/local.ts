/** localStorage 读写，所有持久化都走这里 */

export function loadJSON<T>(key: string, fallback: () => T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback();
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback();
  }
}

export function saveJSON(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}
