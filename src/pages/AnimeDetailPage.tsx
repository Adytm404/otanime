import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchAnimeDetail, fetchAnimeByGenre, fetchAnimeExtra } from '../services/otakudesuApi';
import { AnimeDetail, AnimeItem, AnimeExtraInfo, WatchHistoryItem } from '../types/anime';
import { AnimeCard } from '../components/AnimeCard';
import { parseEpisodeInfo } from '../utils/formatters';
import {
  Play,
  Heart,
  Star,
  Calendar,
  Clock,
  Film,
  ArrowLeft,
  Share2,
  Tv,
  Check,
  Search,
  Download,
  Building2,
  RefreshCw,
  Video,
  Users,
  Music,
  X
} from 'lucide-react';

interface AnimeDetailPageProps {
  myList: AnimeItem[];
  watchHistory?: WatchHistoryItem[];
  onToggleFavorite: (anime: AnimeItem) => void;
}

export const AnimeDetailPage: React.FC<AnimeDetailPageProps> = ({
  myList,
  watchHistory = [],
  onToggleFavorite
}) => {
  const { id } = useParams<{ id: string }>();
  const slug = id || '';
  const navigate = useNavigate();

  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [extraInfo, setExtraInfo] = useState<AnimeExtraInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [showFullSynopsis, setShowFullSynopsis] = useState(false);
  const [similarAnime, setSimilarAnime] = useState<AnimeItem[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState<boolean>(false);
  const [showTrailerModal, setShowTrailerModal] = useState<boolean>(false);

  const loadData = () => {
    if (!slug) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setLoading(true);
    setLoadingExtra(true);
    setError(null);
    setExtraInfo(null);

    fetchAnimeDetail(slug)
      .then((data) => {
        setAnime(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed fetching anime detail:', err);
        setError(err.message || 'Gagal memuat data anime');
        setLoading(false);
      });

    fetchAnimeExtra(slug)
      .then((extra) => {
        setExtraInfo(extra);
      })
      .catch((err) => {
        console.warn('Failed fetching anime extra details:', err);
      })
      .finally(() => {
        setLoadingExtra(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [slug]);

  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY BEFORE CONDITIONAL RETURNS
  const sortedEpisodes = useMemo(() => {
    if (!anime?.episodes || !Array.isArray(anime.episodes)) return [];
    return [...anime.episodes].sort((a, b) => {
      const infoA = parseEpisodeInfo(a?.title, a?.slug);
      const infoB = parseEpisodeInfo(b?.title, b?.slug);
      if (infoA.epInt && infoB.epInt) {
        return infoB.epInt - infoA.epInt; // Descending: newest first
      }
      return 0;
    });
  }, [anime?.episodes]);

  const filteredEpisodes = useMemo(() => {
    return sortedEpisodes.filter((ep) =>
      (ep?.title || '').toLowerCase().includes(episodeSearch.toLowerCase()) ||
      (ep?.slug || '').toLowerCase().includes(episodeSearch.toLowerCase())
    );
  }, [sortedEpisodes, episodeSearch]);

  const latestEpisode = sortedEpisodes.length > 0 ? sortedEpisodes[0] : null;
  const earliestEpisode = sortedEpisodes.length > 0 ? sortedEpisodes[sortedEpisodes.length - 1] : null;
  const isFav = Array.isArray(myList) && myList.some((item) => item?.slug === slug);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Fetch and calculate recommendations sharing at least 3 genres (default 6 items)
  useEffect(() => {
    if (!anime?.genres || anime.genres.length === 0) {
      setSimilarAnime([]);
      return;
    }

    let isMounted = true;
    setLoadingSimilar(true);

    const loadGenreRecommendations = async () => {
      try {
        const currentGenreSet = new Set(anime.genres.map((g) => g.slug.toLowerCase()));
        const targetGenres = anime.genres.slice(0, 4);

        const fetchPromises = targetGenres.map((g) =>
          fetchAnimeByGenre(g.slug, 1).catch(() => ({ data: [] }))
        );
        const results = await Promise.all(fetchPromises);

        const candidateMap = new Map<string, { anime: AnimeItem; matchCount: number }>();

        for (const res of results) {
          const list = res.data || [];
          for (const item of list) {
            if (item.slug === slug) continue;

            const itemGenreSlugs = (item.genres || []).map((g) => g.slug.toLowerCase());
            const matchCount = itemGenreSlugs.filter((s) => currentGenreSet.has(s)).length;

            if (!candidateMap.has(item.slug)) {
              candidateMap.set(item.slug, {
                anime: {
                  title: item.title,
                  slug: item.slug,
                  thumb: item.thumb,
                  rating: item.rating,
                  total_episode: item.episodes,
                  badge: matchCount >= 3 ? `${matchCount} Genre Serupa` : undefined
                },
                matchCount
              });
            }
          }
        }

        const allCandidates = Array.from(candidateMap.values());

        // Prioritize strictly >= 3 matching genres
        const strictMatches = allCandidates
          .filter((c) => c.matchCount >= 3)
          .sort((a, b) => b.matchCount - a.matchCount);

        let finalRecs: AnimeItem[] = [];

        if (strictMatches.length >= 6) {
          finalRecs = strictMatches.slice(0, 6).map((c) => c.anime);
        } else {
          // If less than 6 with >= 3 genres, backfill with 2 matching genres or defaults
          const relaxedMatches = allCandidates
            .filter((c) => c.matchCount === 2)
            .map((c) => c.anime);

          finalRecs = [
            ...strictMatches.map((c) => c.anime),
            ...relaxedMatches
          ];

          if (finalRecs.length < 6 && anime.recommendations) {
            const existingSlugs = new Set(finalRecs.map((r) => r.slug));
            for (const rec of anime.recommendations) {
              if (rec.slug !== slug && !existingSlugs.has(rec.slug)) {
                finalRecs.push({
                  title: rec.title,
                  slug: rec.slug,
                  thumb: rec.thumb
                });
                if (finalRecs.length >= 6) break;
              }
            }
          }

          finalRecs = finalRecs.slice(0, 6);
        }

        if (isMounted) {
          setSimilarAnime(finalRecs);
        }
      } catch (err) {
        console.error('Failed calculating genre recommendations:', err);
      } finally {
        if (isMounted) setLoadingSimilar(false);
      }
    };

    loadGenreRecommendations();

    return () => {
      isMounted = false;
    };
  }, [anime?.title, anime?.genres, slug]);

  // CONDITIONAL RENDERING (AFTER ALL HOOKS)
  if (loading) {
    return (
      <div className="min-h-screen bg-[#121214] flex flex-col items-center justify-center pt-20 text-white/60">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-3" />
        <p className="text-sm">Memuat Detail Anime dari API...</p>
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="min-h-screen bg-[#121214] flex flex-col items-center justify-center pt-20 text-center px-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3">
          <RefreshCw className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Anime Tidak Ditemukan</h2>
        <p className="text-white/60 text-xs max-w-md mb-5">{error || `Slug "${slug}" tidak valid.`}</p>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all"
          >
            Coba Lagi
          </button>
          <Link
            to="/"
            className="px-4 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-all"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121214] text-white selection:bg-white selection:text-black">
      {/* Hero Backdrop with Gradient Overlay */}
      <div className="relative w-full h-[50vh] sm:h-[60vh] max-h-[580px] overflow-hidden pointer-events-none">
        <img
          src={anime.poster}
          alt={anime.title}
          decoding="async"
          className="w-full h-full object-cover object-center opacity-65 sm:scale-105 sm:filter sm:blur-[1px]"
        />
        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-[#121214]/75 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#121214] via-[#121214]/60 to-transparent" />

        {/* Top Floating Back Button */}
        <div className="absolute top-20 sm:top-24 left-4 sm:left-6 lg:left-10 z-20 pointer-events-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/80 hover:bg-black/95 sm:backdrop-blur-md border border-white/10 text-xs sm:text-sm text-white/80 hover:text-white transition-colors shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
        </div>
      </div>

      {/* Main Details Card Area */}
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-10 -mt-44 sm:-mt-56 relative z-30 pb-20">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 lg:gap-10">
          {/* Left Column: Poster Image + Actions */}
          <div className="flex-shrink-0 w-48 sm:w-56 md:w-64 lg:w-72 flex flex-col items-center">
            <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden bg-[#1a1a20] border border-white/10 shadow-xl shadow-black/80">
              <img
                src={anime.poster}
                alt={anime.title}
                decoding="async"
                className="w-full h-full object-cover"
              />
              {anime.score && (
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/85 sm:backdrop-blur-md border border-white/10 flex items-center gap-1.5 text-xs font-bold text-amber-400 shadow">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{anime.score}</span>
                </div>
              )}
            </div>

            {/* Action buttons below poster */}
            <div className="w-full mt-4 flex items-center gap-2.5">
              <button
                onClick={() =>
                  onToggleFavorite({
                    title: anime.title,
                    slug: slug,
                    thumb: anime.poster,
                    rating: anime.score
                  })
                }
                className={`flex-1 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  isFav
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : 'bg-white/10 hover:bg-white/15 border-white/10 text-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{isFav ? 'Tersimpan' : 'Simpan'}</span>
              </button>

              <button
                onClick={handleShare}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all relative"
                title="Bagikan tautan"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Right Column: Title, Metadata, Synopsis & Play Button */}
          <div className="flex-1 w-full space-y-4 sm:space-y-5 text-center md:text-left">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                {anime.title}
              </h1>
              {anime.japanese_title && (
                <p className="text-xs sm:text-sm text-white/50 mt-1 font-medium">
                  {anime.japanese_title}
                </p>
              )}
            </div>

            {/* Badges / Meta Info Pills */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
              {anime.status && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-medium">
                  {anime.status}
                </span>
              )}
              {anime.total_episode && (
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/5 flex items-center gap-1.5 text-white/90">
                  <Film className="w-3.5 h-3.5" />
                  {anime.total_episode}
                </span>
              )}
              {anime.duration && (
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/5 flex items-center gap-1.5 text-white/90">
                  <Clock className="w-3.5 h-3.5" />
                  {anime.duration}
                </span>
              )}
              {anime.release_date && (
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/5 flex items-center gap-1.5 text-white/90">
                  <Calendar className="w-3.5 h-3.5" />
                  {anime.release_date}
                </span>
              )}
              {anime.studio && (
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/5 flex items-center gap-1.5 text-white/90">
                  <Tv className="w-3.5 h-3.5" />
                  {anime.studio}
                </span>
              )}
              {anime.producer && (
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/5 flex items-center gap-1.5 text-white/90">
                  <Building2 className="w-3.5 h-3.5" />
                  {anime.producer}
                </span>
              )}
              {extraInfo?.score && (
                <span className="px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 font-bold flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{extraInfo.score} (MAL)</span>
                </span>
              )}
              {extraInfo?.rank && (
                <span className="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-medium">
                  Rank #{extraInfo.rank}
                </span>
              )}
              {loadingExtra && (
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[11px] text-white/40 flex items-center gap-1.5 animate-pulse">
                  <div className="w-2.5 h-2.5 rounded-full border border-white/30 border-t-white animate-spin" />
                  <span>Memuat info MAL...</span>
                </span>
              )}
            </div>

            {/* Watch Action Buttons */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
              {latestEpisode && (
                <Link
                  to={`/anime/${slug}/${latestEpisode.slug}`}
                  className="flex items-center gap-2 px-6 sm:px-8 py-3 rounded-full bg-white text-black font-bold text-xs sm:text-sm hover:bg-white/90 active:scale-95 transition-all shadow-lg shadow-black/40 group"
                >
                  <Play className="w-4 h-4 fill-black text-black transition-transform group-hover:scale-110" />
                  <span>Nonton Terbaru ({parseEpisodeInfo(latestEpisode.title, latestEpisode.slug).epNumber})</span>
                </Link>
              )}

              {earliestEpisode && earliestEpisode.slug !== latestEpisode?.slug && (
                <Link
                  to={`/anime/${slug}/${earliestEpisode.slug}`}
                  className="flex items-center gap-2 px-5 sm:px-6 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-sm border border-white/10 transition-colors"
                >
                  <span>Mulai dari {parseEpisodeInfo(earliestEpisode.title, earliestEpisode.slug).epNumber}</span>
                </Link>
              )}

              {extraInfo?.trailer?.embed_url && (
                <button
                  onClick={() => setShowTrailerModal(true)}
                  className="flex items-center gap-2 px-5 sm:px-6 py-3 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm active:scale-95 transition-all shadow-md shadow-rose-600/25"
                >
                  <Video className="w-4 h-4" />
                  <span>Trailer Resmi</span>
                </button>
              )}
            </div>

            {/* Synopsis */}
            <div className="text-left bg-white/[0.04] p-4 sm:p-5 rounded-2xl border border-white/5">
              <h3 className="text-xs uppercase tracking-wider text-white/50 font-bold mb-2">
                Sinopsis
              </h3>
              <p
                className={`text-xs sm:text-sm text-white/80 leading-relaxed font-normal whitespace-pre-line ${
                  !showFullSynopsis ? 'line-clamp-4 sm:line-clamp-5' : ''
                }`}
              >
                {anime.synopsis || 'Sinopsis belum tersedia untuk anime ini.'}
              </p>
              {anime.synopsis && anime.synopsis.length > 250 && (
                <button
                  onClick={() => setShowFullSynopsis(!showFullSynopsis)}
                  className="mt-2 text-xs font-semibold text-white underline hover:text-white/80"
                >
                  {showFullSynopsis ? 'Sembunyikan' : 'Baca Selengkapnya'}
                </button>
              )}
            </div>

            {/* Genres */}
            {anime.genres && Array.isArray(anime.genres) && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                {anime.genres.map((g) => (
                  <span
                    key={g?.slug || g?.name}
                    className="px-3.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/5 text-xs text-white/90 font-medium transition-colors cursor-default"
                  >
                    {g?.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Batch Download Notice if available */}
        {anime.batch && (
          <div className="mt-8 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-300">
              <Download className="w-4 h-4 flex-shrink-0" />
              <span>Tersedia paket download batch: <strong>{anime.batch.title}</strong></span>
            </div>
            <span className="text-white/40">{anime.batch.uploaded_at}</span>
          </div>
        )}

        {/* Episode List Section */}
        <section className="mt-12 sm:mt-16 pt-8 border-t border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5">
              <span>Daftar Episode</span>
              <span className="text-sm font-normal text-white/40">
                ({sortedEpisodes.length})
              </span>
            </h2>

            {/* Search / Filter Episode */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Cari episode..."
                value={episodeSearch}
                onChange={(e) => setEpisodeSearch(e.target.value)}
                className="w-full bg-white/[0.08] text-white text-xs sm:text-sm pl-9 pr-4 py-2 rounded-xl border border-white/10 focus:border-white/20 outline-none placeholder-white/40"
              />
              <Search className="w-4 h-4 text-white/40 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Episode Cards Grid */}
          {filteredEpisodes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredEpisodes.map((ep, index) => {
                const epInfo = parseEpisodeInfo(ep.title, ep.slug);
                const isLatest = index === 0 && !episodeSearch;

                const epHistory = watchHistory.find(
                  (h) => h.anime_slug === slug && (h.episode_slug === ep.slug || h.episode_title === ep.title)
                );
                const epProgress = epHistory ? epHistory.progress : 0;

                return (
                  <Link
                    key={`ep-${ep.slug}`}
                    to={`/anime/${slug}/${ep.slug}`}
                    className="group p-3 sm:p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 hover:border-white/20 transition-colors flex items-center gap-3 sm:gap-4 relative card-content-visibility"
                  >
                    {/* Episode Icon Preview */}
                    <div className="relative w-16 sm:w-20 aspect-video rounded-xl overflow-hidden bg-black/50 flex-shrink-0 flex items-center justify-center">
                      <img
                        src={anime.poster}
                        alt={ep.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover sm:group-hover:scale-105 transition-transform duration-200 opacity-60"
                      />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center shadow">
                          <Play className="w-3 h-3 fill-black text-black ml-0.5" />
                        </div>
                      </div>

                      {/* Progress bar under thumbnail */}
                      {epProgress > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60 z-10 overflow-hidden">
                          <div
                            className="h-full bg-rose-600 rounded-r-full"
                            style={{ width: `${epProgress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Episode Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className="px-2.5 py-0.5 rounded-lg bg-rose-600/25 border border-rose-500/40 text-rose-300 font-bold text-xs sm:text-sm truncate">
                            {epInfo.epNumber}
                          </span>
                          {isLatest && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold flex-shrink-0">
                              Terbaru
                            </span>
                          )}
                        </div>

                        {/* Watched Progress Percentage */}
                        {epProgress > 0 && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                              epProgress >= 90
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {epProgress >= 90 ? 'Selesai' : `${epProgress}%`}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/50 truncate">
                        {ep.uploaded_at ? `${ep.uploaded_at} • Sub Indo` : 'Subtitle Indonesia'}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-white/40 py-6">Tidak ada episode yang cocok dengan pencarian.</p>
          )}
        </section>

        {/* Characters & Voice Actors Section from Jikan/MAL */}
        {extraInfo?.characters && extraInfo.characters.length > 0 && (
          <section className="mt-12 sm:mt-16 pt-8 border-t border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5">
                <Users className="w-5 h-5 text-rose-500" />
                <span>Karakter & Pengisi Suara (Seiyuu)</span>
                <span className="text-sm font-normal text-white/40">
                  ({extraInfo.characters.length})
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {extraInfo.characters.map((item, idx) => (
                <div
                  key={`char-${idx}-${item.character.name}`}
                  className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center justify-between gap-3 card-content-visibility"
                >
                  {/* Character Avatar & Name */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-11 h-14 rounded-xl overflow-hidden bg-black/50 flex-shrink-0">
                      {item.character.image ? (
                        <img
                          src={item.character.image}
                          alt={item.character.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">?</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white/95 truncate" title={item.character.name}>
                        {item.character.name}
                      </h4>
                      <span className="text-[10px] text-rose-400 block font-medium mt-0.5">
                        {item.character.role}
                      </span>
                    </div>
                  </div>

                  {/* Voice Actor (Seiyuu) Avatar & Name */}
                  {item.voice_actor && (
                    <div className="flex items-center gap-2 text-right min-w-0 flex-1 justify-end border-l border-white/5 pl-2.5">
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-medium text-white/80 truncate" title={item.voice_actor.name}>
                          {item.voice_actor.name}
                        </h5>
                        <span className="text-[10px] text-white/40 block mt-0.5">
                          {item.voice_actor.language}
                        </span>
                      </div>
                      <div className="w-11 h-14 rounded-xl overflow-hidden bg-black/50 flex-shrink-0">
                        {item.voice_actor.image ? (
                          <img
                            src={item.voice_actor.image}
                            alt={item.voice_actor.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">?</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Production Staff Section from Jikan/MAL */}
        {extraInfo?.staff && extraInfo.staff.length > 0 && (
          <section className="mt-12 sm:mt-16 pt-8 border-t border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <span>Staf & Tim Produksi</span>
                <span className="text-sm font-normal text-white/40">
                  ({extraInfo.staff.length})
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {extraInfo.staff.map((person, idx) => (
                <div
                  key={`staff-${idx}-${person.name}`}
                  className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center gap-3 card-content-visibility"
                >
                  <div className="w-11 h-14 rounded-xl overflow-hidden bg-black/50 flex-shrink-0">
                    {person.image ? (
                      <img
                        src={person.image}
                        alt={person.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">?</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white/95 truncate" title={person.name}>
                      {person.name}
                    </h4>
                    <p className="text-[10px] text-indigo-300 truncate mt-0.5" title={person.role}>
                      {person.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Theme Songs / OST Section */}
        {extraInfo?.themes && (extraInfo.themes.openings.length > 0 || extraInfo.themes.endings.length > 0) && (
          <section className="mt-12 sm:mt-16 pt-8 border-t border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5">
                <Music className="w-5 h-5 text-amber-400" />
                <span>Lagu Tema (Opening & Ending)</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {extraInfo.themes.openings.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2.5">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                    Opening Themes
                  </span>
                  <div className="space-y-1.5">
                    {extraInfo.themes.openings.map((op, idx) => (
                      <div key={`op-${idx}`} className="text-xs text-white/80 flex items-start gap-2">
                        <span className="text-white/30 flex-shrink-0">{idx + 1}.</span>
                        <span className="leading-relaxed">{op}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {extraInfo.themes.endings.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2.5">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block">
                    Ending Themes
                  </span>
                  <div className="space-y-1.5">
                    {extraInfo.themes.endings.map((ed, idx) => (
                      <div key={`ed-${idx}`} className="text-xs text-white/80 flex items-start gap-2">
                        <span className="text-white/30 flex-shrink-0">{idx + 1}.</span>
                        <span className="leading-relaxed">{ed}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Similar Recommendations Section (sharing at least 3 genres, default 6 items) */}
        {(similarAnime.length > 0 || (anime.recommendations && anime.recommendations.length > 0)) && (
          <section className="mt-14 pt-8 border-t border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5">
                <span>Rekomendasi Serupa</span>
                <span className="text-xs font-normal text-white/40">
                  (Minimal 3 Genre Serupa • 6 Pilihan)
                </span>
              </h2>
              {loadingSimilar && (
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Mencocokkan genre...</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
              {(similarAnime.length > 0
                ? similarAnime
                : (anime.recommendations || []).slice(0, 6).map((r): AnimeItem => ({
                    title: r.title,
                    slug: r.slug,
                    thumb: r.thumb,
                  }))
              ).map((item) => (
                <AnimeCard
                  key={`rec-${item.slug}`}
                  anime={item}
                  badgeText={item.badge}
                  onClick={() => navigate(`/anime/${item.slug}`)}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Official Trailer Modal */}
      {showTrailerModal && extraInfo?.trailer?.embed_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => setShowTrailerModal(false)} />
          <div className="relative w-full max-w-4xl bg-[#17171d] border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl z-10 my-auto">
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Video className="w-5 h-5 text-rose-500" />
                <span className="font-bold text-sm sm:text-base text-white">Trailer Resmi: {anime.title}</span>
              </div>
              <button
                onClick={() => setShowTrailerModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                aria-label="Tutup modal trailer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative w-full aspect-video bg-black">
              <iframe
                src={extraInfo.trailer.embed_url}
                title={`${anime.title} Official Trailer`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
