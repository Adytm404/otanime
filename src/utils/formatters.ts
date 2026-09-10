/**
 * Helper to parse episode number and clean display title from Otakudesu raw episode strings
 */
export function parseEpisodeInfo(title?: string | null, slug?: string | null): {
  epNumber: string;
  cleanTitle: string;
  epInt: number;
} {
  const safeTitle = typeof title === 'string' ? title : '';
  const safeSlug = typeof slug === 'string' ? slug : '';

  // Try matching Episode X, Eps X, Ep X
  const match = safeTitle.match(/(?:Episode|Eps\.?|Ep)\s*(\d+)/i) || safeSlug.match(/episode-(\d+)/i);
  const epInt = match ? parseInt(match[1], 10) : 0;
  const epNumber = match ? `Episode ${match[1]}` : (safeTitle || 'Episode');

  // Remove repetitive title parts
  let cleanTitle = safeTitle
    .replace(/^.*?(?:Episode|Eps\.?|Ep)\s*\d+/i, '')
    .replace(/Subtitle\s+Indonesia.*/i, '')
    .replace(/Sub\s+Indo.*/i, '')
    .replace(/[()\-]/g, ' ')
    .trim();

  if (!cleanTitle) {
    cleanTitle = 'Sub Indo';
  }

  return { epNumber, cleanTitle, epInt };
}

/**
 * Helper to get a concise short badge text for cards (e.g. "Eps 10" or "End")
 */
export function formatShortEpisode(title?: string | null, slug?: string | null): string {
  const safeTitle = typeof title === 'string' ? title : '';
  const safeSlug = typeof slug === 'string' ? slug : '';

  const match = safeTitle.match(/(?:Episode|Eps\.?|Ep)\s*(\d+)/i) || safeSlug.match(/episode-(\d+)/i);
  if (match) {
    return `Eps ${match[1]}`;
  }
  if (/batch/i.test(safeTitle)) return 'Batch';
  if (/movie/i.test(safeTitle)) return 'Movie';
  if (/ova/i.test(safeTitle)) return 'OVA';
  return 'Eps';
}
