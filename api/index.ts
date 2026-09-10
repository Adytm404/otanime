import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { cors } from 'hono/cors';
import { animeRouter } from '../backend/src/routes/anime';
import openapiSpec from '../backend/openapi.json';

const app = new Hono();

app.use('*', cors());

// Redocly Interactive Documentation UI
app.get('/docs', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="id">
  <head>
    <title>Otanime API - Redocly Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/png" href="https://otakudesu.blog/wp-content/uploads/2020/08/Otakudesu.png"/>
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>
      body { margin: 0; padding: 0; }
    </style>
  </head>
  <body>
    <redoc spec-url="/openapi.json"></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </body>
</html>`);
});

// OpenAPI Specification JSON
app.get('/openapi.json', (c) => c.json(openapiSpec));

app.get('/api/docs', (c) => c.redirect('/docs'));
app.get('/api/openapi.json', (c) => c.json(openapiSpec));

app.get('/api', (c) => {
  return c.json({
    status: 'online',
    message: 'Otanime REST API (Vercel Serverless Function)',
    docs: '/docs',
    openapi: '/openapi.json',
  });
});

// Mount anime routes under both /api and /
app.route('/api', animeRouter);
app.route('/', animeRouter);

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);

export default handle(app);
