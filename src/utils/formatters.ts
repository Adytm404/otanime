/**
 * Helper to parse episode number and clean display title from Otakudesu raw episode strings
 */
export function parseEpisodeInfo(title: string, slug?: string): {
  epNumber: string;
  cleanTitle: string;
  epInt: number;
} {
  // Try matching Episode X, Eps X, Ep X
  const match = title.match(/(?:Episode|Eps\.?|Ep)\s*(\d+)/i) || slug?.match(/episode-(\d+)/i);
  const epInt = match ? parseInt(match[1], 10) : 0;
  const epNumber = match ? `Episode ${match[1]}` : 'Episode';

  // Remove repetitive title parts
  let cleanTitle = title
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
export function formatShortEpisode(title: string, slug?: string): string {
  const match = title.match(/(?:Episode|Eps\.?|Ep)\s*(\d+)/i) || slug?.match(/episode-(\d+)/i);
  if (match) {
    return `Eps ${match[1]}`;
  }
  if (/batch/i.test(title)) return 'Batch';
  if (/movie/i.test(title)) return 'Movie';
  if (/ova/i.test(title)) return 'OVA';
  return 'Eps';
}
