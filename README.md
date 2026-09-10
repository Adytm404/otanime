# Otanime

Aplikasi streaming anime modern berbasis web yang terintegrasi langsung dengan Otakudesu Scraper REST API. Dibangun dengan desain dark-theme responsif, video streaming multi-server, JWPlayer kustom dengan watermark Otanime untuk video direct, filter multi-genre, dan dukungan Docker & Vercel.

---

## Tech Stack

### Frontend
- **Framework**: [Vite](https://vitejs.dev/) + [React](https://react.dev/) (TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Routing**: [React Router](https://reactrouter.com/) v7
- **Video Player**: Custom JWPlayer UI dengan watermark "Otanime"

### Backend
- **Runtime**: [Bun](https://bun.sh/)
- **Web Framework**: [Hono](https://hono.dev/)
- **Scraping Engine**: [Cheerio](https://cheerio.js.org/)
- **API Documentation**: OpenAPI 3.0 + Redocly UI (`/docs`)

---

## Fitur Utama

- **Katalog Anime Real-time**:
  - Anime *Newest Anime* (ongoing rilis harian) dan *Complete* (tamat).
  - Notifikasi navbar untuk 5 rilis episode anime terbaru.
  - Halaman khusus `/genres` dengan filter **multi-genre** (bisa memilih 2 atau lebih genre sekaligus dengan logika *AND*).
  - Halaman khusus `/my-list` untuk koleksi anime tersimpan.
  - Halaman khusus `/new-season` untuk daftar seluruh anime ongoing dengan infinite scroll.
- **Halaman Detail Anime (`/anime/:slug`)**:
  - Metadata lengkap (skor rating, status tayang, studio, produser, durasi, tanggal rilis).
  - Sinopsis lengkap dengan toggle baca selengkapnya.
  - Daftar episode berurutan dari episode terbaru dengan badge nomor episode yang jelas.
  - Rekomendasi anime serupa yang memiliki **minimal 3 genre serupa** (default 6 anime).
- **Halaman Pemutar Streaming (`/anime/:animeSlug/:episodeSlug`)**:
  - Pemutar video 16:9 responsif.
  - Pemutar video direct MP4 custom berpenampilan **JWPlayer** lengkap dengan watermark logo **Otanime**, kontrol seek bar, volume, kecepatan putar, dan tombol shortcut keyboard.
  - Proteksi iframe sandbox untuk memblokir popup iklan dan pencegah redirect tab utama pada embed mirror.
  - Link download per resolusi (1080p FHD, 720p HD, 480p SD, 360p Mobile) membuka tab baru ke hosting file asli.
  - Playlist episode sidebar dengan auto-scroll dan penanda episode aktif.

---

## Cara Menjalankan

### Opsi 1: Menggunakan Docker Compose (Direkomendasikan)
Menjalankan frontend dan backend sekaligus dalam container terisolasi:
```bash
docker compose up --build -d
```
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:3000`
- **Dokumentasi API**: `http://localhost:3000/docs`

Untuk mematikan container:
```bash
docker compose down
```

---

### Opsi 2: Menjalankan Manual dengan Bun / Node.js

#### 1. Prasyarat
- [Bun](https://bun.sh/) (disarankan) atau [Node.js](https://nodejs.org/) (v18+)

#### 2. Konfigurasi Environment (Frontend)
Salin berkas contoh konfigurasi:
```bash
cp .env.example .env
```
Isi `VITE_API_BASE_URL` sesuai lokasi backend Anda (default `/api` untuk proxy lokal).

#### 3. Jalankan Backend (API)
```bash
cd backend
bun install
bun run src/index.ts
```
Backend akan berjalan di `http://localhost:3000`.
- Dokumentasi interaktif: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`

#### 4. Jalankan Frontend
Buka terminal baru di direktori utama:
```bash
bun install
bun run dev
```
Frontend akan berjalan di `http://localhost:5173`.

---

## Deployment ke Vercel

Proyek ini telah dikonfigurasi dengan `vercel.json` dan serverless adapter `api/index.ts`. Cukup sambungkan repositori GitHub ke Vercel:
1. Hubungkan repo `Adytm404/otanime` ke Vercel.
2. Vercel akan otomatis mendeteksi konfigurasi dan mendepoy:
   - Frontend SPA di `/`
   - Serverless API Hono di `/api/*`
   - Dokumentasi API Redocly di `/docs`

---

## Endpoint API Backend

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/home` | Daftar anime ongoing dan anime tamat terbaru |
| `GET` | `/api/ongoing?page=1` | Daftar anime ongoing berpaginasi |
| `GET` | `/api/complete?page=1` | Daftar anime tamat berpaginasi |
| `GET` | `/api/search?q=:query` | Pencarian judul anime |
| `GET` | `/api/genres` | Daftar seluruh 36 genre dari Otakudesu |
| `GET` | `/api/genres/:slug?page=1` | Daftar anime berdasarkan genre berpaginasi |
| `GET` | `/api/anime/:slug` | Detail metadata anime dan daftar episode |
| `GET` | `/api/episode/:slug` | Detail episode, stream embed, direct video, mirror, download |
| `POST` | `/api/episode/resolve-mirror` | Bypass token mirror ke URL embed iframe |
| `GET` | `/api/episode/resolve-download?url=:url` | Resolusi redirect URL download hosting asli |

---

## Lisensi
Proyek ini dibuat untuk tujuan edukasi dan pembelajaran scraping web serta integrasi frontend-backend modern.
