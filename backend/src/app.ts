import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { animeRouter } from './routes/anime';
import openapiSpec from '../openapi.json';

const app = new Hono();

app.use('*', cors());

// System keepalive & heartbeat for frontend
const systemHandler = (c: any) => c.json({ status: 'ok' });
app.get('/system/heartbeat', systemHandler);
app.get('/api/system/heartbeat', systemHandler);
app.all('/system/exit', systemHandler);
app.all('/api/system/exit', systemHandler);

// OpenAPI Specification JSON
const openapiHandler = (c: any) => c.json(openapiSpec);
app.get('/openapi.json', openapiHandler);
app.get('/api/openapi.json', openapiHandler);

// Redocly Interactive Documentation UI
const docsHandler = (c: any) => {
  return c.html(`<!DOCTYPE html>
<html lang="id">
  <head>
    <title>Otakudesu API - Redocly Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/png" href="https://otakudesu.blog/wp-content/uploads/2020/08/Otakudesu.png"/>
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>
      body {
        margin: 0;
        padding: 0;
      }
    </style>
  </head>
  <body>
    <redoc spec-url="/api/openapi.json"></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"> </script>
  </body>
</html>`);
};
app.get('/docs', docsHandler);
app.get('/api/docs', docsHandler);

// Root information endpoint
const infoHandler = (c: any) => {
  return c.json({
    status: 'online',
    message: 'Otakudesu Scraper API',
    docs: 'https://otanime.webkulo.com/api/docs',
    openapi: 'https://otanime.webkulo.com/api/openapi.json',
    endpoints: {
      home: 'GET /api/home',
      ongoing: 'GET /api/ongoing?page=1',
      complete: 'GET /api/complete?page=1',
      search: 'GET /api/search?q=:query',
      schedule: 'GET /api/schedule',
      genres: 'GET /api/genres',
      genre_anime: 'GET /api/genres/:slug?page=1',
      anime_detail: 'GET /api/anime/:slug',
      anime_extra: 'GET /api/anime/:slug/extra',
      episode_detail: 'GET /api/episode/:slug',
      resolve_mirror: 'POST /api/episode/resolve-mirror',
      resolve_download: 'GET /api/episode/resolve-download?url=:url',
      stream_proxy: 'GET /api/stream/proxy?url=:url',
    },
  });
};

app.get('/', infoHandler);
app.get('/api', infoHandler);
app.get('/api/', infoHandler);

// Mount anime router on both /api and / so all paths resolve
app.route('/api', animeRouter);
app.route('/', animeRouter);

app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json(
    {
      success: false,
      message: err.message || 'Internal Server Error',
    },
    500
  );
});

export { app };
