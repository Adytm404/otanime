import * as cheerio from 'cheerio';
import type { AnimeDetail } from '../types';

export interface AnimeStaffItem {
  name: string;
  role: string;
  image?: string;
}

export interface AnimeCharacterItem {
  character: {
    name: string;
    role: string;
    image?: string;
  };
  voice_actor?: {
    name: string;
    language: string;
    image?: string;
  } | null;
}

export interface AnimeThemeSongs {
  openings: string[];
  endings: string[];
}

export interface AnimeExtraInfo {
  mal_id?: number | null;
  title_english?: string | null;
  title_japanese?: string | null;
  score?: number | null;
  scored_by?: number | null;
  rank?: number | null;
  popularity?: number | null;
  trailer?: {
    youtube_id?: string | null;
    url?: string | null;
    embed_url?: string | null;
    image_url?: string | null;
  } | null;
  studios?: Array<{ mal_id: number; name: string }>;
  producers?: Array<{ mal_id: number; name: string }>;
  staff?: AnimeStaffItem[];
  characters?: AnimeCharacterItem[];
  themes?: AnimeThemeSongs;
}

function cleanTitle(title: string): string {
  return title
    .replace(/Subtitle\s+Indonesia.*/i, '')
    .replace(/Sub\s+Indo.*/i, '')
    .replace(/\bS\d+\b/i, '')
    .replace(/\bSeason\s+\d+\b/i, '')
    .replace(/[()\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolve anime to MyAnimeList ID and Kitsu details using Japanese title or cleaned Romaji title
 */
async function resolveMalId(title: string, japaneseTitle?: string): Promise<{ malId: string | null; youtubeVideoId?: string | null }> {
  const queries = [japaneseTitle, cleanTitle(title), title].filter(Boolean) as string[];

  for (const q of queries) {
    try {
      const url = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(q)}&include=mappings&page[limit]=1`;
      const res = await fetch(url, {
        headers: { 'Accept': 'application/vnd.api+json' }
      });
      if (!res.ok) continue;

      const json = await res.json();
      const anime = json.data?.[0];
      if (!anime) continue;

      const mappings = json.included?.filter((i: any) => i.type === 'mappings') || [];
      const malMapping = mappings.find((m: any) => m.attributes?.externalSite === 'myanimelist/anime');
      const malId = malMapping?.attributes?.externalId || null;
      const youtubeVideoId = anime.attributes?.youtubeVideoId || null;

      if (malId || youtubeVideoId) {
        return { malId, youtubeVideoId };
      }
    } catch (e) {
      console.warn(`Error searching Kitsu for query "${q}":`, e);
    }
  }

  return { malId: null, youtubeVideoId: null };
}

/**
 * Scrape staff and characters directly from MyAnimeList HTML when Jikan sub-endpoints rate limit
 */
async function scrapeMalCharactersAndStaff(malId: string | number): Promise<{
  characters: AnimeCharacterItem[];
  staff: AnimeStaffItem[];
}> {
  const characters: AnimeCharacterItem[] = [];
  const staff: AnimeStaffItem[] = [];

  try {
    const url = `https://myanimelist.net/anime/${malId}/_/characters`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) return { characters, staff };

    const html = await res.text();
    const ch = cheerio.load(html);

    // Parse Staff section
    ch('a[href*="/people/"]').each((_, el) => {
      const row = ch(el).closest('tr');
      const name = ch(el).text().trim();
      const role = row.find('small').text().trim();
      const img = row.find('img').attr('data-src') || row.find('img').attr('src') || '';

      if (name && role && !staff.some(s => s.name === name)) {
        staff.push({ name, role, image: img || undefined });
      }
    });

    // Parse Characters & Voice Actors section
    ch('table tr').each((_, row) => {
      const $row = ch(row);
      const charLink = $row.find('a[href*="/character/"]').filter((__, a) => ch(a).text().trim().length > 0).first();
      if (!charLink.length) return;

      const charName = charLink.text().trim();
      const roleText = $row.find('small:contains("Main"), small:contains("Supporting")').first().text().trim() || 'Supporting';
      const charImg = $row.find('img').first().attr('data-src') || $row.find('img').first().attr('src') || '';

      const vaEl = $row.find('a[href*="/people/"]').last();
      const vaName = vaEl.text().trim();
      const vaImg = $row.find('img').last().attr('data-src') || $row.find('img').last().attr('src') || '';

      if (charName && !characters.some(c => c.character.name === charName)) {
        characters.push({
          character: {
            name: charName,
            role: roleText,
            image: charImg || undefined
          },
          voice_actor: vaName && vaName !== charName
            ? {
                name: vaName,
                language: 'Japanese',
                image: vaImg || undefined
              }
            : null
        });
      }
    });
  } catch (err) {
    console.warn(`Direct MAL scrape error for ${malId}:`, err);
  }

  return { characters, staff };
}

/**
 * Fetch enriched anime details (trailer, staff, characters, themes) from Jikan / MAL
 */
export async function getAnimeExtraDetails(detail: AnimeDetail): Promise<AnimeExtraInfo> {
  const { malId, youtubeVideoId } = await resolveMalId(detail.title, detail.japanese_title);

  let extra: AnimeExtraInfo = {
    mal_id: malId ? parseInt(malId, 10) : null,
    title_japanese: detail.japanese_title || null,
    trailer: youtubeVideoId
      ? {
          youtube_id: youtubeVideoId,
          embed_url: `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1`,
          url: `https://www.youtube.com/watch?v=${youtubeVideoId}`
        }
      : null,
    studios: [],
    producers: [],
    staff: [],
    characters: [],
    themes: { openings: [], endings: [] }
  };

  if (!malId) {
    return extra;
  }

  // 1. Fetch main anime details from Jikan
  try {
    const jikanRes = await fetch(`https://api.jikan.moe/v4/anime/${malId}`);
    if (jikanRes.ok) {
      const jikanJson = await jikanRes.json();
      const d = jikanJson.data;

      if (d) {
        extra.title_english = d.title_english || null;
        extra.title_japanese = d.title_japanese || detail.japanese_title || null;
        extra.score = typeof d.score === 'number' ? d.score : null;
        extra.scored_by = typeof d.scored_by === 'number' ? d.scored_by : null;
        extra.rank = typeof d.rank === 'number' ? d.rank : null;
        extra.popularity = typeof d.popularity === 'number' ? d.popularity : null;

        if (d.trailer?.embed_url || d.trailer?.youtube_id) {
          extra.trailer = {
            youtube_id: d.trailer.youtube_id || youtubeVideoId || null,
            url: d.trailer.url || (d.trailer.youtube_id ? `https://www.youtube.com/watch?v=${d.trailer.youtube_id}` : null),
            embed_url: d.trailer.embed_url || (d.trailer.youtube_id ? `https://www.youtube-nocookie.com/embed/${d.trailer.youtube_id}?autoplay=1` : null),
            image_url: d.trailer.images?.maximum_image_url || d.trailer.images?.large_image_url || null
          };
        }

        if (Array.isArray(d.studios)) {
          extra.studios = d.studios.map((s: any) => ({ mal_id: s.mal_id, name: s.name }));
        }
        if (Array.isArray(d.producers)) {
          extra.producers = d.producers.map((p: any) => ({ mal_id: p.mal_id, name: p.name }));
        }
        if (d.theme) {
          extra.themes = {
            openings: Array.isArray(d.theme.openings) ? d.theme.openings : [],
            endings: Array.isArray(d.theme.endings) ? d.theme.endings : []
          };
        }
      }
    }
  } catch (err) {
    console.warn(`Jikan main detail failed for MAL ${malId}:`, err);
  }

  // 2. Fetch Characters & Seiyuu from Jikan
  try {
    const charsRes = await fetch(`https://api.jikan.moe/v4/anime/${malId}/characters`);
    if (charsRes.ok) {
      const charsJson = await charsRes.json();
      if (Array.isArray(charsJson.data) && charsJson.data.length > 0) {
        extra.characters = charsJson.data.slice(0, 12).map((item: any) => {
          const jpVa = item.voice_actors?.find((v: any) => v.language === 'Japanese') || item.voice_actors?.[0];
          return {
            character: {
              name: item.character?.name || 'Unknown',
              role: item.role || 'Supporting',
              image: item.character?.images?.jpg?.image_url || undefined
            },
            voice_actor: jpVa
              ? {
                  name: jpVa.person?.name || '',
                  language: jpVa.language || 'Japanese',
                  image: jpVa.person?.images?.jpg?.image_url || undefined
                }
              : null
          };
        });
      }
    }
  } catch (err) {
    console.warn(`Jikan characters failed for MAL ${malId}:`, err);
  }

  // 3. Fetch Staff from Jikan
  try {
    const staffRes = await fetch(`https://api.jikan.moe/v4/anime/${malId}/staff`);
    if (staffRes.ok) {
      const staffJson = await staffRes.json();
      if (Array.isArray(staffJson.data) && staffJson.data.length > 0) {
        const keyRoles = ['Director', 'Series Composition', 'Script', 'Music', 'Character Design', 'Sound Director', 'Original Creator'];
        const keyStaff: AnimeStaffItem[] = [];
        const otherStaff: AnimeStaffItem[] = [];

        for (const item of staffJson.data) {
          const name = item.person?.name;
          const positions: string[] = item.positions || [];
          const image = item.person?.images?.jpg?.image_url || undefined;
          if (!name || positions.length === 0) continue;

          const isKey = positions.some(pos => keyRoles.some(kr => pos.toLowerCase().includes(kr.toLowerCase())));
          const staffItem: AnimeStaffItem = {
            name,
            role: positions.join(', '),
            image
          };

          if (isKey) {
            keyStaff.push(staffItem);
          } else {
            otherStaff.push(staffItem);
          }
        }

        extra.staff = [...keyStaff, ...otherStaff].slice(0, 10);
      }
    }
  } catch (err) {
    console.warn(`Jikan staff failed for MAL ${malId}:`, err);
  }

  // 4. Fallback to direct MAL scraper if characters or staff are empty
  if ((!extra.characters || extra.characters.length === 0) || (!extra.staff || extra.staff.length === 0)) {
    const directMal = await scrapeMalCharactersAndStaff(malId);
    if ((!extra.characters || extra.characters.length === 0) && directMal.characters.length > 0) {
      extra.characters = directMal.characters.slice(0, 12);
    }
    if ((!extra.staff || extra.staff.length === 0) && directMal.staff.length > 0) {
      extra.staff = directMal.staff.slice(0, 10);
    }
  }

  return extra;
}
