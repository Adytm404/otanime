import * as cheerio from 'cheerio';
import { BASE_URL, DEFAULT_HEADERS } from '../config/constants';
import { extractDirectVideo } from './stream';
import type {
  AnimeDetail,
  AnimeItem,
  DownloadResolution,
  EpisodeDetail,
  HomeData,
  MirrorStream,
} from '../types';

export async function fetchHtml(url: string): Promise<string> {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  const res = await fetch(fullUrl, {
    headers: DEFAULT_HEADERS,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${fullUrl}: ${res.status} ${res.statusText}`);
  }

  return await res.text();
}

export function extractSlug(url?: string, prefix: string = 'anime'): string {
  if (!url) return '';
  const regex = new RegExp(`/${prefix}/([^/]+)`);
  const match = url.match(regex);
  return (match && match[1]) ? match[1] : url.replace(BASE_URL, '').replace(/^\/|\/$/g, '');
}

export async function getHome(): Promise<HomeData> {
  const html = await fetchHtml('/');
  const $ = cheerio.load(html);

  const ongoing: AnimeItem[] = [];
  const complete: AnimeItem[] = [];

  // Scrape ongoing (first .venz block)
  $('.venz').eq(0).find('ul li').each((_, el) => {
    const $el = $(el);
    const title = $el.find('.jdlflm').text().trim();
    const href = $el.find('.thumb a').attr('href');
    const thumb = $el.find('.thumb img').attr('src') || '';
    const current_episode = $el.find('.epz').text().trim();
    const release_day = $el.find('.epztipe').text().trim();
    const release_date = $el.find('.newnime').text().trim();

    if (title && href) {
      ongoing.push({
        title,
        slug: extractSlug(href, 'anime'),
        thumb,
        current_episode,
        release_day,
        release_date,
      });
    }
  });

  // Scrape complete (second .venz block)
  $('.venz').eq(1).find('ul li').each((_, el) => {
    const $el = $(el);
    const title = $el.find('.jdlflm').text().trim();
    const href = $el.find('.thumb a').attr('href');
    const thumb = $el.find('.thumb img').attr('src') || '';
    const total_episode = $el.find('.epz').text().trim();
    const rating = $el.find('.epztipe').text().trim();
    const release_date = $el.find('.newnime').text().trim();

    if (title && href) {
      complete.push({
        title,
        slug: extractSlug(href, 'anime'),
        thumb,
        total_episode,
        rating,
        release_date,
      });
    }
  });

  return { ongoing, complete };
}

export async function getOngoing(page = 1): Promise<{ data: AnimeItem[]; currentPage: number; hasNextPage: boolean }> {
  const url = page > 1 ? `/ongoing-anime/page/${page}/` : `/ongoing-anime/`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const data: AnimeItem[] = [];
  $('.venz ul li').each((_, el) => {
    const $el = $(el);
    const title = $el.find('.jdlflm').text().trim();
    const href = $el.find('.thumb a').attr('href');
    const thumb = $el.find('.thumb img').attr('src') || '';
    const current_episode = $el.find('.epz').text().trim();
    const release_day = $el.find('.epztipe').text().trim();
    const release_date = $el.find('.newnime').text().trim();

    if (title && href) {
      data.push({
        title,
        slug: extractSlug(href, 'anime'),
        thumb,
        current_episode,
        release_day,
        release_date,
      });
    }
  });

  const hasNextPage = $('.pagination .next').length > 0;
  return { data, currentPage: page, hasNextPage };
}

export async function getComplete(page = 1): Promise<{ data: AnimeItem[]; currentPage: number; hasNextPage: boolean }> {
  const url = page > 1 ? `/complete-anime/page/${page}/` : `/complete-anime/`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const data: AnimeItem[] = [];
  $('.venz ul li').each((_, el) => {
    const $el = $(el);
    const title = $el.find('.jdlflm').text().trim();
    const href = $el.find('.thumb a').attr('href');
    const thumb = $el.find('.thumb img').attr('src') || '';
    const total_episode = $el.find('.epz').text().trim();
    const rating = $el.find('.epztipe').text().trim();
    const release_date = $el.find('.newnime').text().trim();

    if (title && href) {
      data.push({
        title,
        slug: extractSlug(href, 'anime'),
        thumb,
        total_episode,
        rating,
        release_date,
      });
    }
  });

  const hasNextPage = $('.pagination .next').length > 0;
  return { data, currentPage: page, hasNextPage };
}

export async function searchAnime(query: string): Promise<AnimeItem[]> {
  const html = await fetchHtml(`/?s=${encodeURIComponent(query)}&post_type=anime`);
  const $ = cheerio.load(html);

  const results: AnimeItem[] = [];
  $('ul.chivsrc li').each((_, el) => {
    const $el = $(el);
    const title = $el.find('h2 a').text().trim();
    const href = $el.find('h2 a').attr('href');
    const thumb = $el.find('img').attr('src') || '';
    const rating = $el.find('.set:contains("Rating")').text().replace(/Rating\s*:/i, '').trim();

    if (title && href) {
      results.push({
        title,
        slug: extractSlug(href, 'anime'),
        thumb,
        rating,
      });
    }
  });

  return results;
}

export async function getGenreList(): Promise<Array<{ name: string; slug: string; url: string }>> {
  const html = await fetchHtml('/genre-list/');
  const $ = cheerio.load(html);
  const genres: Array<{ name: string; slug: string; url: string }> = [];

  $('.genres li a').each((_, el) => {
    const $el = $(el);
    const name = $el.text().trim();
    const href = $el.attr('href') || '';
    const slug = extractSlug(href, 'genres');
    if (name && slug) {
      genres.push({ name, slug, url: href });
    }
  });

  return genres;
}

export async function getAnimeByGenre(
  genreSlug: string,
  page = 1
): Promise<{ data: AnimeItem[]; currentPage: number; hasNextPage: boolean }> {
  const url = page > 1 ? `/genres/${genreSlug}/page/${page}/` : `/genres/${genreSlug}/`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const data: AnimeItem[] = [];
  $('.col-anime').each((_, el) => {
    const $el = $(el);
    const title = $el.find('.col-anime-title a').text().trim();
    const href = $el.find('.col-anime-title a').attr('href') || '';
    const thumb = $el.find('.col-anime-cover img').attr('src') || '';
    const total_episode = $el.find('.col-anime-eps').text().trim();
    const rating = $el.find('.col-anime-rating').text().trim();
    const release_date = $el.find('.col-anime-date').text().trim();

    if (title && href) {
      data.push({
        title,
        slug: extractSlug(href, 'anime'),
        thumb,
        total_episode,
        rating,
        release_date,
      });
    }
  });

  const hasNextPage = $('.pagination .next').length > 0;
  return { data, currentPage: page, hasNextPage };
}

export async function getAnimeDetail(slug: string): Promise<AnimeDetail> {
  const html = await fetchHtml(`/anime/${slug}/`);
  const $ = cheerio.load(html);

  const title = $('.jdlrx h1').text().replace(/Subtitle Indonesia.*/i, '').trim() ||
                $('.fotoanime img').attr('alt')?.replace(/Sub Indo.*/i, '').trim() || '';
  const poster = $('.fotoanime img').attr('src') || '';
  const synopsis = $('.sinopc').text().trim();

  // Metadata mapping
  const infoMap: Record<string, string> = {};
  $('.infozin .infozingle p').each((_, el) => {
    const text = $(el).text().trim();
    const colonIndex = text.indexOf(':');
    if (colonIndex !== -1) {
      const key = text.slice(0, colonIndex).trim().toLowerCase().replace(/\s+/g, '_');
      const val = text.slice(colonIndex + 1).trim();
      infoMap[key] = val;
    }
  });

  const genres = $('.infozingle p a[href*="/genres/"]').map((_, el) => ({
    name: $(el).text().trim(),
    slug: extractSlug($(el).attr('href'), 'genres'),
  })).get();

  // Batch
  let batch: AnimeDetail['batch'] = null;
  const batchEl = $('.episodelist:has(.monktit:contains("Batch")) ul li a').first();
  if (batchEl.length > 0) {
    batch = {
      title: batchEl.text().trim(),
      slug: extractSlug(batchEl.attr('href'), 'batch'),
      uploaded_at: batchEl.closest('li').find('.zeebr').text().trim(),
    };
  }

  // Episodes
  const episodes: AnimeDetail['episodes'] = [];
  $('.episodelist:has(.monktit:contains("Episode List")) ul li').each((_, el) => {
    const a = $(el).find('span a');
    const epTitle = a.text().trim();
    const epHref = a.attr('href');
    const uploaded_at = $(el).find('.zeebr').text().trim();

    if (epTitle && epHref) {
      episodes.push({
        title: epTitle,
        slug: extractSlug(epHref, 'episode'),
        uploaded_at,
      });
    }
  });

  // Recommendations
  const recommendations: AnimeDetail['recommendations'] = [];
  $('#recommend-anime-series .isi-anime').each((_, el) => {
    const a = $(el).find('a').first();
    const recTitle = $(el).find('.judul-anime').text().trim();
    const recHref = a.attr('href');
    const recThumb = $(el).find('img').attr('src') || '';

    if (recTitle && recHref) {
      recommendations.push({
        title: recTitle,
        slug: extractSlug(recHref, 'anime'),
        thumb: recThumb,
      });
    }
  });

  return {
    title,
    japanese_title: infoMap['japanese'],
    score: infoMap['skor'],
    producer: infoMap['produser'],
    type: infoMap['tipe'],
    status: infoMap['status'],
    total_episode: infoMap['total_episode'],
    duration: infoMap['durasi'],
    release_date: infoMap['tanggal_rilis'],
    studio: infoMap['studio'],
    genres,
    synopsis,
    poster,
    batch,
    episodes,
    recommendations,
  };
}

export async function getEpisodeDetail(slug: string): Promise<EpisodeDetail> {
  const html = await fetchHtml(`/episode/${slug}/`);
  const $ = cheerio.load(html);

  const title = $('h1.posttl').text().trim();
  const stream_url = $('#pembed iframe').attr('src') || $('.responsive-embed-stream iframe').attr('src') || null;

  let direct_video_url: string | null = null;
  if (stream_url) {
    try {
      direct_video_url = await extractDirectVideo(stream_url);
    } catch {
      direct_video_url = null;
    }
  }

  // Navigations
  const prevHref = $('.flir a[title*="Sebelumnya"]').attr('href');
  const allEpisodesHref = $('.flir a:contains("See All")').attr('href');

  const previous_episode_slug = prevHref ? extractSlug(prevHref, 'episode') : null;
  const anime_slug = allEpisodesHref ? extractSlug(allEpisodesHref, 'anime') : null;

  // Dropdown episodes
  const all_episodes: Array<{ title: string; slug: string }> = [];
  $('#selectcog option').each((_, el) => {
    const val = $(el).attr('value');
    const epTitle = $(el).text().trim();
    if (val && val !== '0') {
      all_episodes.push({
        title: epTitle,
        slug: extractSlug(val, 'episode'),
      });
    }
  });

  // Mirrors
  const mirrors: MirrorStream[] = [];
  $('.mirrorstream ul').each((_, ul) => {
    const rawClass = $(ul).attr('class') || '';
    const qualityMatch = rawClass.match(/m(\d+p)/);
    const quality = qualityMatch && qualityMatch[1] ? qualityMatch[1] : rawClass;

    $(ul).find('li a').each((__, a) => {
      const server = $(a).text().trim();
      const raw_content = $(a).attr('data-content') || null;
      let content: MirrorStream['content'] = null;

      if (raw_content) {
        try {
          content = JSON.parse(Buffer.from(raw_content, 'base64').toString('utf-8'));
        } catch {
          content = null;
        }
      }

      mirrors.push({
        quality,
        server,
        content,
        raw_content,
      });
    });
  });

  // Downloads
  const downloads: DownloadResolution[] = [];
  $('.download ul li').each((_, el) => {
    const quality = $(el).find('strong').text().trim();
    const size = $(el).find('i').text().trim();
    const links = $(el).find('a').map((__, a) => ({
      provider: $(a).text().trim(),
      url: $(a).attr('href') || '',
    })).get().filter(l => l.url.length > 0);

    if (quality && links.length > 0) {
      downloads.push({
        quality,
        size,
        links,
      });
    }
  });

  // Info
  const infoBlock = $('.cukder .infozin .infozingle');
  const genres = infoBlock.find('p:contains("Genres") a').map((_, a) => $(a).text().trim()).get();

  return {
    title,
    stream_url,
    direct_video_url,
    previous_episode_slug,
    anime_slug,
    all_episodes,
    mirrors,
    downloads,
    info: {
      credit: infoBlock.find('p:contains("Credit")').text().split(':')[1]?.trim(),
      encoder: infoBlock.find('p:contains("Encoder")').text().split(':')[1]?.trim(),
      duration: infoBlock.find('p:contains("Duration")').text().split(':')[1]?.trim(),
      type: infoBlock.find('p:contains("Tipe")').text().split(':')[1]?.trim(),
      genres,
    },
  };
}
