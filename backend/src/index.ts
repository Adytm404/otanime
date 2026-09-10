import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { animeRouter } from './routes/anime';
import openapiSpec from '../openapi.json';

const app = new Hono();

app.use('*', cors());

// OpenAPI Specification JSON
app.get('/openapi.json', (c) => c.json(openapiSpec));

// Redocly Interactive Documentation UI
app.get('/docs', (c) => {
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
    <redoc spec-url="/openapi.json"></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"> </script>
  </body>
</html>`);
});

app.get('/', (c) => {
  return c.json({
    status: 'online',
    message: 'Otakudesu Scraper API',
    docs: 'http://localhost:3000/docs',
    openapi: 'http://localhost:3000/openapi.json',
    endpoints: {
      home: 'GET /api/home',
      ongoing: 'GET /api/ongoing?page=1',
      complete: 'GET /api/complete?page=1',
      search: 'GET /api/search?q=:query',
      anime_detail: 'GET /api/anime/:slug',
      episode_detail: 'GET /api/episode/:slug',
      resolve_mirror: 'POST /api/episode/resolve-mirror',
      resolve_download: 'GET /api/episode/resolve-download?url=:url',
    },
  });
});

app.route('/api', animeRouter);

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

const PORT = Number(process.env.PORT) || 3000;
console.log(`Otakudesu API server running on http://localhost:${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
