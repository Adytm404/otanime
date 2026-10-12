// Node entry (production on cPanel): bundled to app.js by `npm run build`
import { serve } from '@hono/node-server';
import { app } from './app';

const PORT = Number(process.env.PORT) || 3000;
console.log(`Otakudesu API server running on port ${PORT}`);

serve({
  fetch: app.fetch,
  port: PORT,
});
