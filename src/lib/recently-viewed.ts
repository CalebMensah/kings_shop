const KEY = "recently-viewed:v1";
const MAX = 12;
const SLUG = /^[a-z0-9-]{1,200}$/;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is string => typeof s === "string" && SLUG.test(s))
      .slice(0, MAX);
  } catch {
    // Storage blocked or corrupted: act as if nothing has been viewed
    return [];
  }
}

/** Most recent first */
export function getRecentlyViewed(): string[] {
  return read();
}

/** Adds a product to the front of the list. Viewing it again moves it up instead of duplicating it. */
export function recordView(slug: string) {
  if (typeof window === "undefined" || !SLUG.test(slug)) return;
  try {
    const next = [slug, ...read().filter((s) => s !== slug)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private browsing or full storage: skip quietly
  }
}

export function clearRecentlyViewed() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
