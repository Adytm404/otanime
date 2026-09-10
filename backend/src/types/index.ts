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
  genres: Array<{ name: string; slug: string }>;
  synopsis: string;
  poster: string;
  batch?: {
    title: string;
    slug: string;
    uploaded_at: string;
  } | null;
  episodes: Array<{
    title: string;
    slug: string;
    uploaded_at: string;
  }>;
  recommendations: Array<{
    title: string;
    slug: string;
    thumb: string;
  }>;
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
  info: {
    credit?: string;
    encoder?: string;
    duration?: string;
    type?: string;
    genres?: string[];
  };
}

export interface Genre {
  name: string;
  slug: string;
}

export interface GenreAnimeItem {
  title: string;
  slug: string;
  thumb: string;
  studio?: string;
  episodes?: string;
  rating?: string;
  genres: Genre[];
  synopsis?: string;
  season?: string;
}

