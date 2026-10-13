// Bun entry (local dev): `bun --watch src/index.ts`
import { app } from './app';

const PORT = Number(process.env.PORT) || 3000;
console.log(`Otakudesu API server running on http://localhost:${PORT}`);

export default {
  port: PORT,
  // Some upstream lookups (scraping, anime metadata) can exceed Bun's default 10s idle timeout
  idleTimeout: 60,
  fetch: app.fetch,
};
