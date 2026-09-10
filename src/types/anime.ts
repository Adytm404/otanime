export interface AnimeItem {
  title: string;
  slug: string;
  thumb: string;
  current_episode?: string;
  total_episode?: string;
  rating?: string;
  release_day?: string;
  release_date?: string;
}

export interface HomeData {
  ongoing: AnimeItem[];
  complete: AnimeItem[];
}

export interface PagedAnimeData {
  data: AnimeItem[];
  currentPage: number;
  hasNextPage: boolean;
}

export interface AnimeGenre {
  name: string;
  slug: string;
}

export interface EpisodeListItem {
  title: string;
  slug: string;
  uploaded_at?: string;
}

export interface AnimeRecommendation {
  title: string;
  slug: string;
  thumb: string;
}

export interface AnimeDetail {
  title: string;
  japanese_title?: string;
  score?: string;
  producer?: string;
  type?: string;
  status?: string;
  total_episode?: string;
  duration?: string;
  release_date?: string;
  studio?: string;
  genres: AnimeGenre[];
  synopsis: string;
  poster: string;
  batch?: {
    title: string;
    slug: string;
    uploaded_at: string;
  } | null;
  episodes: EpisodeListItem[];
  recommendations: AnimeRecommendation[];
}

export interface MirrorStream {
  quality: string;
  server: string;
  content: {
    id: number;
    i: number;
    q: string;
  } | null;
  raw_content: string | null;
}

export interface DownloadLink {
  provider: string;
  url: string;
}

export interface DownloadResolution {
  quality: string;
  size: string;
  links: DownloadLink[];
}

export interface EpisodeDetail {
  title: string;
  stream_url: string | null;
  direct_video_url?: string | null;
  previous_episode_slug?: string | null;
  next_episode_slug?: string | null;
  anime_slug?: string | null;
  all_episodes: Array<{
    title: string;
    slug: string;
  }>;
  mirrors: MirrorStream[];
  downloads: DownloadResolution[];
  info?: {
    credit?: string;
    encoder?: string;
    duration?: string;
    type?: string;
    genres?: string[];
  };
}

export interface WatchHistoryItem {
  anime_slug: string;
  anime_title: string;
  episode_slug: string;
  episode_title: string;
  thumb: string;
  progress: number;
  updated_at: number;
}

export type NavTab = 'home' | 'my-list' | 'movie' | 'new-season';
