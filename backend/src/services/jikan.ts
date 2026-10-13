import * as cheerio from 'cheerio';
import type { AnimeDetail } from '../types';
import { findAniListMedia, cleanAniListDescription, aniListRole, type AniListMedia } from './anilist';

// api.jikan.moe is unreachable from some networks; fail fast instead of hanging the request
const JIKAN_TIMEOUT_MS = 8000;
// After a network failure, skip Jikan for a while so every request isn't delayed by the timeout
const JIKAN_BACKOFF_MS = 10 * 60 * 1000;
let jikanDownUntil = 0;

async function jikanFetch(path: string): Promise<Response> {
  if (Date.now() < jikanDownUntil) throw new Error('skipped, recently unreachable');
  try {
    return await fetch(`https://api.jikan.moe/v4${path}`, { signal: AbortSignal.timeout(JIKAN_TIMEOUT_MS) });
  } catch (err) {
    jikanDownUntil = Date.now() + JIKAN_BACKOFF_MS;
    throw err;
  }
}

const KITSU_TIMEOUT_MS = 5000;

const MAL_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

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
  anilist_id?: number | null;
  /** Fallback synopsis (English) for anime that Otakudesu has no synopsis for */
  synopsis?: string | null;
  synopsis_source?: 'MyAnimeList' | 'AniList' | 'Kitsu' | null;
  title_english?: string | null;
  title_japanese?: string | null;
  score?: number | null;
  score_source?: 'MAL' | 'AniList' | null;
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

function extractYouTubeId(urlOrId?: string | null): string | null {
  if (!urlOrId) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) return urlOrId;
  const match =
    urlOrId.match(/(?:embed\/|v=|vi\/|youtu\.be\/|\/v\/|\/e\/|watch\?v=|\/shorts\/)([a-zA-Z0-9_-]{11})/i) ||
    urlOrId.match(/embed\/([a-zA-Z0-9_-]+)/i);
  return match?.[1] ?? null;
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

const youtubeTrailer = (ytId: string, imageUrl?: string | null) => ({
  youtube_id: ytId,
  url: `https://www.youtube.com/watch?v=${ytId}`,
  embed_url: `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1`,
  image_url: imageUrl || null
});

interface KitsuMatch {
  malId: string | null;
  youtubeVideoId: string | null;
  synopsis: string | null;
}

/**
 * Search Kitsu by title: gives the MAL id (via mappings), a YouTube trailer id and an English synopsis
 */
async function searchKitsu(queries: string[]): Promise<KitsuMatch> {
  for (const q of queries) {
    try {
      const url = `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(q)}&include=mappings&page[limit]=1`;
      const res = await fetch(url, {
        headers: { 'Accept': 'application/vnd.api+json' },
        signal: AbortSignal.timeout(KITSU_TIMEOUT_MS)
      });
      if (!res.ok) continue;

      const json: any = await res.json();
      const anime = json.data?.[0];
      if (!anime) continue;

      const mappings = json.included?.filter((i: any) => i.type === 'mappings') || [];
      const malMapping = mappings.find((m: any) => m.attributes?.externalSite === 'myanimelist/anime');
      return {
        malId: malMapping?.attributes?.externalId || null,
        youtubeVideoId: anime.attributes?.youtubeVideoId || null,
        synopsis: anime.attributes?.synopsis?.trim() || null
      };
    } catch (e) {
      // Network-level failure: other queries would fail the same way
      console.warn(`Kitsu search failed for "${q}": ${errorMessage(e)}`);
      break;
    }
  }
  return { malId: null, youtubeVideoId: null, synopsis: null };
}

/**
 * Last resort to find the MAL id: scrape the MyAnimeList search page
 */
async function searchMalId(queries: string[]): Promise<string | null> {
  for (const q of queries) {
    try {
      const res = await fetch(`https://myanimelist.net/anime.php?q=${encodeURIComponent(q)}`, {
        headers: { 'User-Agent': MAL_USER_AGENT },
        signal: AbortSignal.timeout(JIKAN_TIMEOUT_MS)
      });
      if (!res.ok) continue;
      const match = (await res.text()).match(/https:\/\/myanimelist\.net\/anime\/(\d+)/);
      if (match?.[1]) return match[1];
    } catch (e) {
      console.warn(`MAL search failed for "${q}": ${errorMessage(e)}`);
    }
  }
  return null;
}

/** Fill scores, synopsis, trailer, studios and themes from Jikan */
async function applyJikanMain(extra: AnimeExtraInfo, malId: string, detail: AnimeDetail): Promise<void> {
  try {
    const jikanRes = await jikanFetch(`/anime/${malId}`);
    if (!jikanRes.ok) return;
    const d = ((await jikanRes.json()) as any).data;
    if (!d) return;

    extra.title_english = d.title_english || null;
    extra.title_japanese = d.title_japanese || detail.japanese_title || null;
    if (typeof d.score === 'number') {
      extra.score = d.score;
      extra.score_source = 'MAL';
    }
    extra.scored_by = typeof d.scored_by === 'number' ? d.scored_by : null;
    extra.rank = typeof d.rank === 'number' ? d.rank : null;
    extra.popularity = typeof d.popularity === 'number' ? d.popularity : null;
    if (typeof d.synopsis === 'string' && d.synopsis.trim()) {
      extra.synopsis = d.synopsis.replace(/\s*\[Written by MAL Rewrite\]\s*$/i, '').trim();
      extra.synopsis_source = 'MyAnimeList';
    }

    const ytId =
      d.trailer?.youtube_id || extractYouTubeId(d.trailer?.embed_url) || extractYouTubeId(d.trailer?.url) || null;
    if (ytId) {
      extra.trailer = youtubeTrailer(ytId, d.trailer?.images?.maximum_image_url || d.trailer?.images?.large_image_url);
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
  } catch (err) {
    console.warn(`Jikan main detail failed for MAL ${malId}: ${errorMessage(err)}`);
  }
}

/** Fill whatever Jikan could not provide from AniList */
function applyAniList(extra: AnimeExtraInfo, media: AniListMedia): void {
  extra.anilist_id = media.id;
  extra.title_english ||= media.title.english || null;
  extra.title_japanese ||= media.title.native || null;

  if (extra.score == null && typeof media.averageScore === 'number') {
    extra.score = media.averageScore / 10;
    extra.score_source = 'AniList';
  }
  if (extra.rank == null) {
    const rated = media.rankings?.find((r) => r.type === 'RATED' && r.allTime);
    if (rated) extra.rank = rated.rank;
  }
  if (!extra.synopsis) {
    const synopsis = cleanAniListDescription(media.description);
    if (synopsis) {
      extra.synopsis = synopsis;
      extra.synopsis_source = 'AniList';
    }
  }
  if (!extra.trailer?.embed_url && media.trailer?.site === 'youtube' && media.trailer.id) {
    extra.trailer = youtubeTrailer(media.trailer.id, media.trailer.thumbnail);
  }
  if (!extra.studios?.length && media.studios?.nodes?.length) {
    extra.studios = media.studios.nodes.map((s) => ({ mal_id: s.id, name: s.name }));
  }
  if (!extra.characters?.length && media.characters?.edges?.length) {
    extra.characters = media.characters.edges.map((e) => {
      const va = e.voiceActors?.[0];
      return {
        character: { name: e.node.name.full, role: aniListRole(e.role), image: e.node.image.medium || undefined },
        voice_actor: va ? { name: va.name.full, language: 'Japanese', image: va.image.medium || undefined } : null
      };
    });
  }
  if (!extra.staff?.length && media.staff?.edges?.length) {
    extra.staff = media.staff.edges.map((e) => ({
      name: e.node.name.full,
      role: e.role,
      image: e.node.image.medium || undefined
    }));
  }
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
      headers: { 'User-Agent': MAL_USER_AGENT },
      signal: AbortSignal.timeout(JIKAN_TIMEOUT_MS)
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
    console.warn(`Direct MAL scrape error for ${malId}: ${errorMessage(err)}`);
  }

  return { characters, staff };
}

/**
 * Fetch enriched anime details (synopsis, trailer, staff, characters, themes).
 * Sources in order of preference: Jikan (MAL) -> AniList -> Kitsu -> MAL HTML scrape.
 */
export async function getAnimeExtraDetails(detail: AnimeDetail): Promise<AnimeExtraInfo> {
  const queries = [...new Set([detail.japanese_title, cleanTitle(detail.title), detail.title].filter(Boolean) as string[])];

  const extra: AnimeExtraInfo = {
    mal_id: null,
    title_japanese: detail.japanese_title || null,
    trailer: null,
    studios: [],
    producers: [],
    staff: [],
    characters: [],
    themes: { openings: [], endings: [] }
  };

  // Both are title searches and independent of each other, so run them together
  const [kitsu, anilist] = await Promise.all([searchKitsu(queries), findAniListMedia(null, queries)]);

  let malId = anilist?.idMal ? String(anilist.idMal) : kitsu.malId;
  if (!malId) malId = await searchMalId(queries);
  if (malId) await applyJikanMain(extra, malId, detail);
  extra.mal_id = malId ? parseInt(malId, 10) : null;

  if (anilist) applyAniList(extra, anilist);

  // Kitsu is the last fallback for synopsis and trailer
  if (!extra.synopsis && kitsu.synopsis) {
    extra.synopsis = kitsu.synopsis;
    extra.synopsis_source = 'Kitsu';
  }
  if (!extra.trailer?.embed_url && kitsu.youtubeVideoId) {
    extra.trailer = youtubeTrailer(kitsu.youtubeVideoId);
  }

  if (!malId) return extra;

  // Characters & seiyuu from Jikan (only when AniList had none)
  if (!extra.characters?.length) {
    try {
      const charsRes = await jikanFetch(`/anime/${malId}/characters`);
      if (charsRes.ok) {
        const charsJson: any = await charsRes.json();
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
      console.warn(`Jikan characters failed for MAL ${malId}: ${errorMessage(err)}`);
    }
  }

  // Staff from Jikan (only when AniList had none)
  if (!extra.staff?.length) {
    try {
      const staffRes = await jikanFetch(`/anime/${malId}/staff`);
      if (staffRes.ok) {
        const staffJson: any = await staffRes.json();
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
            const staffItem: AnimeStaffItem = { name, role: positions.join(', '), image };
            (isKey ? keyStaff : otherStaff).push(staffItem);
          }

          extra.staff = [...keyStaff, ...otherStaff].slice(0, 10);
        }
      }
    } catch (err) {
      console.warn(`Jikan staff failed for MAL ${malId}: ${errorMessage(err)}`);
    }
  }

  // Direct MAL scrape if characters or staff are still empty
  if (!extra.characters?.length || !extra.staff?.length) {
    const directMal = await scrapeMalCharactersAndStaff(malId);
    if (!extra.characters?.length && directMal.characters.length > 0) {
      extra.characters = directMal.characters.slice(0, 12);
    }
    if (!extra.staff?.length && directMal.staff.length > 0) {
      extra.staff = directMal.staff.slice(0, 10);
    }
  }

  return extra;
}
