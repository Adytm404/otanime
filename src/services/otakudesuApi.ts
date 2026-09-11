import {
  HomeData,
  PagedAnimeData,
  PagedGenreAnimeData,
  AnimeItem,
  AnimeDetail,
  AnimeExtraInfo,
  EpisodeDetail
} from '../types/anime';

// Base API URL from environment variables, defaults to '/api' for same-origin proxy
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const res = await fetch(url, options);

  if (!res.ok) {
    throw new Error(`API Error [${res.status}]: ${res.statusText}`);
  }

  const json = await res.json();
  if (json.success === false) {
    throw new Error(json.message || 'API request failed');
  }

  return json.data !== undefined ? json.data : json;
}

export async function fetchHome(): Promise<HomeData> {
  return await fetchJson<HomeData>('/home');
}

export async function fetchOngoing(page: number = 1): Promise<PagedAnimeData> {
  return await fetchJson<PagedAnimeData>(`/ongoing?page=${page}`);
}

export async function fetchComplete(page: number = 1): Promise<PagedAnimeData> {
  return await fetchJson<PagedAnimeData>(`/complete?page=${page}`);
}

export async function searchAnime(query: string): Promise<AnimeItem[]> {
  if (!query.trim()) return [];
  return await fetchJson<AnimeItem[]>(`/search?q=${encodeURIComponent(query)}`);
}

export async function fetchGenreList(): Promise<Array<{ name: string; slug: string }>> {
  return await fetchJson<Array<{ name: string; slug: string }>>('/genres');
}

export async function fetchAnimeByGenre(genreSlug: string, page: number = 1): Promise<PagedGenreAnimeData> {
  return await fetchJson<PagedGenreAnimeData>(`/genres/${genreSlug}?page=${page}`);
}

export async function fetchAnimeDetail(slug: string): Promise<AnimeDetail> {
  return await fetchJson<AnimeDetail>(`/anime/${slug}`);
}

export async function fetchAnimeExtra(slug: string): Promise<AnimeExtraInfo> {
  return await fetchJson<AnimeExtraInfo>(`/anime/${slug}/extra`);
}

export async function fetchEpisodeDetail(slug: string): Promise<EpisodeDetail> {
  return await fetchJson<EpisodeDetail>(`/episode/${slug}`);
}

export async function resolveMirror(payload: {
  raw_content?: string;
  content?: { id: number; i: number; q: string };
  nonce?: string;
}): Promise<{ raw_html?: string; embed_url: string; direct_video_url?: string | null }> {
  return await fetchJson<{ raw_html?: string; embed_url: string; direct_video_url?: string | null }>(
    '/episode/resolve-mirror',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );
}

export async function resolveDownload(downloadUrl: string): Promise<string> {
  const res = await fetch(`${API_BASE}/episode/resolve-download?url=${encodeURIComponent(downloadUrl)}`);
  if (!res.ok) throw new Error('Failed to resolve download URL');
  const json = await res.json();
  return json.direct_url || downloadUrl;
}
