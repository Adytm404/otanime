# Otanime

Aplikasi streaming anime modern berbasis web yang terintegrasi langsung dengan Otakudesu Scraper REST API. Dibangun dengan desain dark-theme responsif, video streaming multi-server, playlist episode interaktif, dan resolver unduhan berkas.

---

## Tech Stack

### Frontend
- **Framework**: [Vite](https://vitejs.dev/) + [React](https://react.dev/) (TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Routing**: [React Router](https://reactrouter.com/) v7

### Backend
- **Runtime**: [Bun](https://bun.sh/)
- **Web Framework**: [Hono](https://hono.dev/)
- **Scraping Engine**: [Cheerio](https://cheerio.js.org/)
- **API Documentation**: OpenAPI 3.0 + Redocly UI (`/docs`)

---

## Fitur Utama

- **Katalog Anime Real-time**:
  - Menampilkan daftar anime *Ongoing* (rilis harian) dan *Complete* (tamat).
  - Hero banner featured anime otomatis dari rilisan terbaru.
  - Filter genre instan (*Action, Fantasy, Comedy, Isekai, Romance, dll*).
- **Halaman Detail Anime (`/anime/:slug`)**:
  - Metadata lengkap (skor rating, status tayang, studio, produser, durasi, tanggal rilis).
  - Sinopsis lengkap dengan toggle baca selengkapnya.
  - Daftar episode lengkap dengan pencarian nomor episode.
  - Rekomendasi anime serupa.
- **Halaman Pemutar Streaming (`/anime/:animeSlug/:episodeSlug`)**:
  - Pemutar video 16:9 responsif (mendukung mode Iframe embed & Direct MP4).
  - Multi-server mirror resolver (`DesuStream, Filedon, MegaCloud, dll`) tanpa reload halaman.
  - Link download per resolusi (1080p FHD, 720p HD, 480p SD, 360p Mobile) dengan bypass redirect hosting.
  - Playlist episode sidebar dengan auto-scroll dan penanda episode aktif.
  - Navigasi cepat episode sebelumnya dan selanjutnya.
- **Pencarian Live**:
  - Debounce search otomatis mencari judul anime di database Otakudesu.
- **Riwayat Tonton & Simpanan**:
  - *Continue Watching for You* tersinkronisasi otomatis saat menonton episode.
  - *My List* untuk bookmark anime favorit (tersimpan di `localStorage`).

---

## Cara Menjalankan

### 1. Prasyarat
- [Bun](https://bun.sh/) (disarankan) atau [Node.js](https://nodejs.org/) (v18+)

### 2. Jalankan Backend (API)
```bash
cd backend
bun install
bun run src/index.ts
```
Backend akan berjalan di `http://localhost:3000`.
- Dokumentasi interaktif: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`

### 3. Jalankan Frontend
Buka terminal baru di root folder:
```bash
bun install
bun run dev
```
Frontend akan berjalan di `http://localhost:5173`.

### 4. Build Produksi Frontend
```bash
bun run build
bun run preview
```

---

## Endpoint API Backend

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/home` | Daftar anime ongoing dan anime tamat terbaru |
| `GET` | `/api/ongoing?page=1` | Daftar anime ongoing berpaginasi |
| `GET` | `/api/complete?page=1` | Daftar anime tamat berpaginasi |
| `GET` | `/api/search?q=:query` | Pencarian judul anime |
| `GET` | `/api/anime/:slug` | Detail metadata anime dan daftar episode |
| `GET` | `/api/episode/:slug` | Detail episode, player embed, mirror, dan download |
| `POST` | `/api/episode/resolve-mirror` | Bypass token mirror ke URL embed iframe |
| `GET` | `/api/episode/resolve-download?url=:url` | Resolusi redirect URL download hosting asli |

---

## Lisensi
Proyek ini dibuat untuk tujuan edukasi dan pembelajaran scraping web serta integrasi frontend-backend modern.
