import { Hono } from 'hono';
import {
  getAnimeByGenre,
  getAnimeDetail,
  getComplete,
  getEpisodeDetail,
  getGenreList,
  getHome,
  getOngoing,
  searchAnime,
} from '../services/scraper';
import { resolveDownloadUrl, resolveMirror } from '../services/stream';
import { getCache, setCache } from '../utils/cache';

export const animeRouter = new Hono();

// GET /api/home
animeRouter.get('/home', async (c) => {
  const cacheKey = 'home';
  const cached = getCache(cacheKey);
  if (cached) {
    return c.json({ success: true, cached: true, data: cached });
  }

  const data = await getHome();
  setCache(cacheKey, data, 300); // 5 minutes
  return c.json({ success: true, cached: false, data });
});

// GET /api/ongoing?page=1
animeRouter.get('/ongoing', async (c) => {
  const page = parseInt(c.req.query('page') || '1', 10);
  const cacheKey = `ongoing:${page}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return c.json({ success: true, cached: true, data: cached });
  }

  const data = await getOngoing(page);
  setCache(cacheKey, data, 300);
  return c.json({ success: true, cached: false, data });
});

// GET /api/complete?page=1
animeRouter.get('/complete', async (c) => {
  const page = parseInt(c.req.query('page') || '1', 10);
  const cacheKey = `complete:${page}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return c.json({ success: true, cached: true, data: cached });
  }

  const data = await getComplete(page);
  setCache(cacheKey, data, 600); // 10 minutes
  return c.json({ success: true, cached: false, data });
});

// GET /api/search?q=keyword
animeRouter.get('/search', async (c) => {
  const query = c.req.query('q');
  if (!query) {
    return c.json({ success: false, message: 'Query parameter "q" is required' }, 400);
  }

  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return c.json({ success: true, cached: true, data: cached });
  }

  const data = await searchAnime(query);
  setCache(cacheKey, data, 600);
  return c.json({ success: true, cached: false, data });
});

// GET /api/genres
animeRouter.get('/genres', async (c) => {
  const cacheKey = 'genres:list';
  const cached = getCache(cacheKey);
  if (cached) {
    return c.json({ success: true, cached: true, data: cached });
  }

  const data = await getGenreList();
  setCache(cacheKey, data, 86400); // 24 hours
  return c.json({ success: true, cached: false, data });
});

// GET /api/genres/:slug?page=1
animeRouter.get('/genres/:slug', async (c) => {
  const slug = c.req.param('slug');
  const page = parseInt(c.req.query('page') || '1', 10);
  const cacheKey = `genres:${slug}:${page}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return c.json({ success: true, cached: true, data: cached });
  }

  const data = await getAnimeByGenre(slug, page);
  setCache(cacheKey, data, 600); // 10 minutes
  return c.json({ success: true, cached: false, data });
});

// GET /api/anime/:slug
animeRouter.get('/anime/:slug', async (c) => {
  const slug = c.req.param('slug');
  const cacheKey = `anime:${slug}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return c.json({ success: true, cached: true, data: cached });
  }

  const data = await getAnimeDetail(slug);
  setCache(cacheKey, data, 600);
  return c.json({ success: true, cached: false, data });
});

// GET /api/episode/resolve-download?url=https://link.desustream.com/?id=...
animeRouter.get('/episode/resolve-download', async (c) => {
  const targetUrl = c.req.query('url');
  if (!targetUrl) {
    return c.json({ success: false, message: 'Query parameter "url" is required' }, 400);
  }

  const directUrl = await resolveDownloadUrl(targetUrl);
  return c.json({ success: true, direct_url: directUrl });
});

// POST /api/episode/resolve-mirror
animeRouter.post('/episode/resolve-mirror', async (c) => {
  try {
    const body = await c.req.json<{
      raw_content?: string;
      content?: { id: number; i: number; q: string };
      nonce?: string;
    }>();

    const targetContent = body.raw_content || body.content;
    if (!targetContent) {
      return c.json(
        { success: false, message: 'Payload "raw_content" or "content" object is required' },
        400
      );
    }

    const result = await resolveMirror(targetContent, body.nonce);
    return c.json({ success: true, data: result });
  } catch (error: any) {
    return c.json({ success: false, message: error.message || 'Error resolving mirror' }, 500);
  }
});

// GET /api/episode/:slug
animeRouter.get('/episode/:slug', async (c) => {
  const slug = c.req.param('slug');
  const cacheKey = `episode:${slug}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return c.json({ success: true, cached: true, data: cached });
  }

  const data = await getEpisodeDetail(slug);
  setCache(cacheKey, data, 1800); // 30 minutes
  return c.json({ success: true, cached: false, data });
});
