import { BASE_URL, DEFAULT_HEADERS, MIRROR_INFO_URL } from './constants';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const LOOKUP_TIMEOUT_MS = 5000;

let cachedBaseUrl = BASE_URL;
let cachedAt = 0;
let pendingLookup: Promise<string> | null = null;

/**
 * Read the current live domain from otakudesu.io, which links to the active site
 * via its "skip" button (and a delayed location.href redirect as backup).
 */
async function lookupLiveBaseUrl(): Promise<string | null> {
  const res = await fetch(MIRROR_INFO_URL, {
    headers: DEFAULT_HEADERS,
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
  });
  if (!res.ok) return null;

  const html = await res.text();
  const match =
    html.match(/id=["']skip["'][^>]*href=["']([^"']+)["']/i) ||
    html.match(/href=["']([^"']+)["'][^>]*id=["']skip["']/i) ||
    html.match(/location\.href\s*=\s*["']([^"']+)["']/i);
  if (!match || !match[1]) return null;

  try {
    const url = new URL(match[1]);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Current otakudesu base URL (no trailing slash). Cached for an hour; on lookup
 * failure keeps the last known URL, starting from the BASE_URL default.
 */
export async function getBaseUrl(): Promise<string> {
  if (Date.now() - cachedAt < CACHE_TTL_MS) return cachedBaseUrl;

  if (!pendingLookup) {
    pendingLookup = lookupLiveBaseUrl()
      .catch(() => null)
      .then((url) => {
        if (url) cachedBaseUrl = url;
        cachedAt = Date.now();
        return cachedBaseUrl;
      })
      .finally(() => {
        pendingLookup = null;
      });
  }

  return pendingLookup;
}

export async function getRequestHeaders(): Promise<Record<string, string>> {
  return { ...DEFAULT_HEADERS, Referer: await getBaseUrl() };
}
