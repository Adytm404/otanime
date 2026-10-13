import { useCallback, useState } from 'react';
import { AnimeGenre } from '../types/anime';

export const ADULT_GENRE_SLUGS = ['ecchi', 'hentai'];

const STORAGE_KEY = 'otanime_age_confirmed';

// Fallback when localStorage is unavailable (private mode, blocked storage)
let confirmedInMemory = false;

export function isAdultContent(genres?: Array<AnimeGenre | string>): boolean {
  if (!genres) return false;
  return genres.some((g) => {
    const values = typeof g === 'string' ? [g] : [g.slug, g.name];
    return values.some((v) => v && ADULT_GENRE_SLUGS.includes(v.trim().toLowerCase()));
  });
}

function readConfirmed(): boolean {
  if (confirmedInMemory) return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Blocks adult (ecchi) content until the viewer confirms they are 18+; remembered per browser. */
export function useAgeGate(genres?: Array<AnimeGenre | string>) {
  const [confirmed, setConfirmed] = useState<boolean>(readConfirmed);

  const confirm = useCallback(() => {
    confirmedInMemory = true;
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // keep the in-memory confirmation only
    }
    setConfirmed(true);
  }, []);

  return { blocked: !confirmed && isAdultContent(genres), confirm };
}
