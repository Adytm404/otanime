// AniList GraphQL: reachable where api.jikan.moe is not, used as fallback for synopsis, trailer, cast & staff
const ANILIST_URL = 'https://graphql.anilist.co';
const ANILIST_TIMEOUT_MS = 8000;

const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native }
  description(asHtml: false)
  averageScore
  trailer { id site thumbnail }
  studios(isMain: true) { nodes { id name } }
  rankings { rank type allTime }
  characters(sort: [ROLE, RELEVANCE, ID], perPage: 12) {
    edges {
      role
      node { name { full } image { medium } }
      voiceActors(language: JAPANESE, sort: [RELEVANCE, ID]) { name { full } image { medium } }
    }
  }
  staff(sort: [RELEVANCE, ID], perPage: 10) {
    edges { role node { name { full } image { medium } } }
  }
`;

export interface AniListMedia {
  id: number;
  idMal: number | null;
  title: { romaji?: string | null; english?: string | null; native?: string | null };
  description: string | null;
  averageScore: number | null;
  trailer: { id: string; site: string; thumbnail?: string | null } | null;
  studios: { nodes: Array<{ id: number; name: string }> };
  rankings: Array<{ rank: number; type: string; allTime: boolean }>;
  characters: {
    edges: Array<{
      role: string;
      node: { name: { full: string }; image: { medium?: string | null } };
      voiceActors: Array<{ name: { full: string }; image: { medium?: string | null } }>;
    }>;
  };
  staff: { edges: Array<{ role: string; node: { name: { full: string }; image: { medium?: string | null } } }> };
}

async function anilistQuery(query: string, variables: Record<string, unknown>): Promise<AniListMedia | null> {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(ANILIST_TIMEOUT_MS),
  });
  // AniList answers 404 when nothing matches
  if (!res.ok) return null;
  const json: any = await res.json();
  return json?.data?.Media ?? null;
}

/** Look the anime up by MAL id when known, otherwise by title search (best match). */
export async function findAniListMedia(malId: number | null, titles: string[]): Promise<AniListMedia | null> {
  try {
    if (malId) {
      const byMal = await anilistQuery(
        `query ($idMal: Int) { Media(idMal: $idMal, type: ANIME) { ${MEDIA_FIELDS} } }`,
        { idMal: malId }
      );
      if (byMal) return byMal;
    }
    for (const search of titles) {
      const found = await anilistQuery(
        `query ($search: String) { Media(search: $search, type: ANIME, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} } }`,
        { search }
      );
      if (found) return found;
    }
  } catch (err) {
    console.warn(`AniList lookup failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  return null;
}

/** AniList descriptions carry light HTML and a trailing "(Source: ...)" note. */
export function cleanAniListDescription(desc?: string | null): string | null {
  if (!desc) return null;
  const text = desc
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\(Source:[^)]*\)\s*$/i, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text || null;
}

const ROLE_LABEL: Record<string, string> = { MAIN: 'Main', SUPPORTING: 'Supporting', BACKGROUND: 'Background' };
export const aniListRole = (role: string) => ROLE_LABEL[role] || role;
