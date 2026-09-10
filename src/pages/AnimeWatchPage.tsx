import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  fetchEpisodeDetail,
  fetchAnimeDetail,
  resolveMirror,
  resolveDownload
} from '../services/otakudesuApi';
import { EpisodeDetail, AnimeDetail, MirrorStream, AnimeItem, WatchHistoryItem } from '../types/anime';
import { parseEpisodeInfo } from '../utils/formatters';
import { JWVideoPlayer } from '../components/JWVideoPlayer';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Server,
  Download,
  ListVideo,
  Play,
  ArrowLeft,
  Heart,
  Share2,
  Check,
  Search,
  ExternalLink,
  RefreshCw,
  Video
} from 'lucide-react';

interface AnimeWatchPageProps {
  myList: AnimeItem[];
  watchHistory?: WatchHistoryItem[];
  onToggleFavorite: (anime: AnimeItem) => void;
  onSaveHistory: (item: {
    anime_slug: string;
    anime_title: string;
    episode_slug: string;
    episode_title: string;
    thumb: string;
    progress: number;
    currentTime?: number;
    duration?: number;
  }) => void;
}

export const AnimeWatchPage: React.FC<AnimeWatchPageProps> = ({
  myList,
  watchHistory = [],
  onToggleFavorite,
  onSaveHistory
}) => {
  const { id, eps } = useParams<{ id: string; eps: string }>();
  const animeSlug = id || '';
  const episodeSlugParam = eps || '';
  const navigate = useNavigate();

  const [episode, setEpisode] = useState<EpisodeDetail | null>(null);
  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Player state
  const [currentEmbedUrl, setCurrentEmbedUrl] = useState<string | null>(null);
  const [currentDirectUrl, setCurrentDirectUrl] = useState<string | null>(null);
  const [playerMode, setPlayerMode] = useState<'embed' | 'direct'>('embed');
  const [activeMirror, setActiveMirror] = useState<MirrorStream | null>(null);
  const [resolvingMirror, setResolvingMirror] = useState(false);

  // UI state
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [playlistSearch, setPlaylistSearch] = useState('');
  const [copied, setCopied] = useState(false);

  const activeEpRef = useRef<HTMLAnchorElement>(null);

  // Load episode and anime data
  useEffect(() => {
    if (!animeSlug) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setLoading(true);
    setError(null);

    const loadStream = async () => {
      try {
        // 1. Fetch Anime detail first if needed to resolve episode slugs
        const animeData = await fetchAnimeDetail(animeSlug);
        setAnime(animeData);

        let targetEpSlug = episodeSlugParam;

        // If numeric like '1', resolve to first episode slug
        if (/^\d+$/.test(episodeSlugParam)) {
          const epIndex = parseInt(episodeSlugParam, 10);
          if (animeData.episodes && animeData.episodes.length > 0) {
            // episodes usually indexed from latest or earliest
            const resolved =
              animeData.episodes[animeData.episodes.length - epIndex] ||
              animeData.episodes[epIndex - 1] ||
              animeData.episodes[0];
            targetEpSlug = resolved.slug;
          }
        }

        // 2. Fetch episode detail
        const epData = await fetchEpisodeDetail(targetEpSlug);
        setEpisode(epData);

        // Set initial stream URL
        setCurrentEmbedUrl(epData.stream_url);
        setCurrentDirectUrl(epData.direct_video_url || null);
        if (epData.direct_video_url) {
          setPlayerMode('direct');
        } else {
          setPlayerMode('embed');
        }

        // Find existing history or initialize with initial progress
        const prevHistory = watchHistory.find(
          (h) => h.anime_slug === animeSlug && h.episode_slug === targetEpSlug
        );

        onSaveHistory({
          anime_slug: animeSlug,
          anime_title: animeData.title,
          episode_slug: targetEpSlug,
          episode_title: epData.title,
          thumb: animeData.poster,
          progress: prevHistory?.progress || 10,
          currentTime: prevHistory?.currentTime || 0,
          duration: prevHistory?.duration || 1440
        });

        setLoading(false);
      } catch (err: any) {
        console.error('Failed loading episode stream:', err);
        setError(err.message || 'Gagal memuat video episode');
        setLoading(false);
      }
    };

    loadStream();
  }, [animeSlug, episodeSlugParam]);

  // Scroll active episode into view
  useEffect(() => {
    if (activeEpRef.current) {
      activeEpRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [episode]);

  // Find active history item for resuming playback
  const existingHistory = watchHistory.find(
    (h) => h.anime_slug === animeSlug && (h.episode_slug === episodeSlugParam || h.episode_title === episode?.title)
  );

  const handleVideoProgress = (currentTime: number, duration: number) => {
    if (!anime || !episode) return;
    const pct = Math.min(100, Math.max(5, Math.round((currentTime / duration) * 100)));
    onSaveHistory({
      anime_slug: animeSlug,
      anime_title: anime.title,
      episode_slug: episodeSlugParam,
      episode_title: episode.title,
      thumb: anime.poster,
      progress: pct,
      currentTime: Math.round(currentTime),
      duration: Math.round(duration)
    });
  };

  // Track progress for embed mirror mode while tab is active
  useEffect(() => {
    if (playerMode !== 'embed' || !anime || !episode) return;

    let elapsed = existingHistory?.currentTime || 20;
    const totalDuration = existingHistory?.duration || 1440;

    const timer = setInterval(() => {
      if (document.hidden) return;
      elapsed += 4;
      const pct = Math.min(95, Math.max(10, Math.round((elapsed / totalDuration) * 100)));
      onSaveHistory({
        anime_slug: animeSlug,
        anime_title: anime.title,
        episode_slug: episodeSlugParam,
        episode_title: episode.title,
        thumb: anime.poster,
        progress: pct,
        currentTime: elapsed,
        duration: totalDuration
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [playerMode, anime?.title, episode?.title, animeSlug, episodeSlugParam]);

  // Handle switching mirror server
  const handleSelectMirror = async (mirror: MirrorStream) => {
    setActiveMirror(mirror);
    setResolvingMirror(true);
    try {
      const resolved = await resolveMirror({
        raw_content: mirror.raw_content || undefined,
        content: mirror.content || undefined
      });

      if (resolved.embed_url) {
        setCurrentEmbedUrl(resolved.embed_url);
        setPlayerMode('embed');
      }
      if (resolved.direct_video_url) {
        setCurrentDirectUrl(resolved.direct_video_url);
      }
    } catch (err) {
      console.error('Error resolving mirror:', err);
    } finally {
      setResolvingMirror(false);
    }
  };

  // Handle download link click with 302 resolver (opens in new tab)
  const handleDownloadClick = async (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    try {
      const realUrl = await resolveDownload(url);
      const newTab = window.open(realUrl, '_blank', 'noopener,noreferrer');
      if (!newTab) {
        const a = document.createElement('a');
        a.href = realUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121214] flex flex-col items-center justify-center pt-20 text-white/60">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-3" />
        <p className="text-sm">Menghubungkan ke Server Streaming...</p>
      </div>
    );
  }

  if (error || !episode) {
    return (
      <div className="min-h-screen bg-[#121214] flex flex-col items-center justify-center pt-20 text-center px-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3">
          <RefreshCw className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">Gagal Memutar Episode</h2>
        <p className="text-white/60 text-xs max-w-md mb-5">{error || 'Episode tidak ditemukan.'}</p>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all"
          >
            Coba Lagi
          </button>
          <Link
            to={`/anime/${animeSlug}`}
            className="px-4 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-all"
          >
            Kembali ke Detail Anime
          </Link>
        </div>
      </div>
    );
  }

  const isFav = myList.some((item) => item.slug === animeSlug);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Filter episodes list inside playlist
  const playlistItems = episode.all_episodes.length > 0
    ? episode.all_episodes
    : (anime?.episodes || []).map((e) => ({ title: e.title, slug: e.slug }));

  const filteredPlaylist = playlistItems.filter((ep) =>
    ep.title.toLowerCase().includes(playlistSearch.toLowerCase()) ||
    ep.slug.toLowerCase().includes(playlistSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#121214] text-white selection:bg-white selection:text-black pt-16 sm:pt-20 pb-20">
      <div className="max-w-[1520px] mx-auto px-3 sm:px-6 lg:px-10">
        {/* Navigation Breadcrumb & Back button */}
        <div className="flex items-center justify-between py-3 mb-2 text-xs sm:text-sm text-white/60">
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link
              to={`/anime/${animeSlug}`}
              className="hover:text-white transition-colors truncate max-w-[140px] sm:max-w-[280px]"
            >
              {anime?.title || animeSlug}
            </Link>
            <span>/</span>
            <span className="text-white font-medium truncate max-w-[160px] sm:max-w-none">
              {episode.title}
            </span>
          </div>

          <button
            onClick={() => navigate(`/anime/${animeSlug}`)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Detail Anime</span>
          </button>
        </div>

        {/* Streaming Main Layout: 2-Column or Theater Full Width */}
        <div
          className={`grid gap-6 ${
            isTheaterMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'
          }`}
        >
          {/* Main Video Player & Controls Column */}
          <div className={isTheaterMode ? 'w-full' : 'lg:col-span-8 xl:col-span-9'}>
            {/* Video Frame */}
            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/80">
              {resolvingMirror ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/60">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span className="text-xs">Menghubungkan ke Mirror...</span>
                </div>
              ) : playerMode === 'direct' && currentDirectUrl ? (
                <JWVideoPlayer
                  key={currentDirectUrl}
                  src={currentDirectUrl}
                  title={episode.title}
                  poster={anime?.poster}
                  initialTime={existingHistory?.currentTime}
                  onProgress={handleVideoProgress}
                  onFallbackToEmbed={() => {
                    setPlayerMode('embed');
                    setCurrentEmbedUrl(episode.stream_url);
                  }}
                />
              ) : currentEmbedUrl ? (
                <iframe
                  key={currentEmbedUrl}
                  src={currentEmbedUrl}
                  title={episode.title}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/40 text-xs">
                  Server video belum tersedia. Silakan pilih server alternatif di bawah.
                </div>
              )}
            </div>

            {/* Episode Navigation Bar */}
            <div className="mt-3.5 p-3 sm:p-4 rounded-2xl bg-[#17171d] border border-white/5 flex flex-wrap items-center justify-between gap-3">
              {/* Previous Episode Button */}
              {episode.previous_episode_slug ? (
                <Link
                  to={`/anime/${animeSlug}/${episode.previous_episode_slug}`}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/20 text-white active:scale-95 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev Eps</span>
                </Link>
              ) : (
                <span className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white/5 text-white/20 cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev Eps</span>
                </span>
              )}

              {/* Current Episode Title Indicator */}
              <div className="text-xs sm:text-sm font-bold px-4 py-1.5 rounded-full bg-white/10 border border-white/5 text-white truncate max-w-[200px] sm:max-w-[320px]">
                {episode.title}
              </div>

              {/* Next Episode Button */}
              {episode.next_episode_slug ? (
                <Link
                  to={`/anime/${animeSlug}/${episode.next_episode_slug}`}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white text-black hover:bg-white/90 active:scale-95 transition-all shadow-md shadow-black/40"
                >
                  <span>Next Eps</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <span className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white/5 text-white/20 cursor-not-allowed">
                  <span>Next Eps</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              )}

              {/* Theater Mode Toggle */}
              <button
                onClick={() => setIsTheaterMode(!isTheaterMode)}
                className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white/70 hover:text-white transition-colors ml-auto"
                title="Theater Mode"
              >
                {isTheaterMode ? (
                  <>
                    <Minimize2 className="w-4 h-4" />
                    <span>Normal</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-4 h-4" />
                    <span>Theater Mode</span>
                  </>
                )}
              </button>
            </div>

            {/* Server / Mirror Selector */}
            {episode.mirrors.length > 0 && (
              <div className="mt-4 p-4 rounded-2xl bg-[#17171d] border border-white/5">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-rose-500" />
                    Pilihan Server Mirror
                  </span>
                  {currentDirectUrl && (
                    <button
                      onClick={() => setPlayerMode(playerMode === 'direct' ? 'embed' : 'direct')}
                      className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Video className="w-3 h-3" />
                      <span>Mode: {playerMode === 'direct' ? 'Direct MP4' : 'Iframe Embed'}</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Default server button */}
                  <button
                    onClick={() => {
                      setCurrentEmbedUrl(episode.stream_url);
                      setActiveMirror(null);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                      !activeMirror
                        ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
                        : 'bg-white/10 hover:bg-white/15 text-white/80'
                    }`}
                  >
                    Default (DesuStream)
                  </button>

                  {/* Dynamic Mirrors from API */}
                  {episode.mirrors.map((m, idx) => {
                    const isActive = activeMirror === m;
                    return (
                      <button
                        key={`mirror-${idx}-${m.server}-${m.quality}`}
                        onClick={() => handleSelectMirror(m)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30'
                            : 'bg-white/10 hover:bg-white/15 text-white/80'
                        }`}
                      >
                        <span className="capitalize">{m.server}</span>
                        <span className="ml-1.5 text-[10px] opacity-75">({m.quality})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Anime Info & Download Accordion */}
            <div className="mt-4 p-5 rounded-2xl bg-[#17171d] border border-white/5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-white">
                    {episode.title}
                  </h1>
                  <p className="text-xs text-white/50 mt-0.5">
                    {anime?.title} • {episode.info?.duration || '24m'} • {episode.info?.credit || 'Otanime'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onToggleFavorite({
                        title: anime?.title || episode.title,
                        slug: animeSlug,
                        thumb: anime?.poster || ''
                      })
                    }
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                      isFav
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                        : 'bg-white/10 hover:bg-white/15 border-white/10 text-white'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500' : ''}`} />
                    <span>{isFav ? 'Tersimpan' : 'Simpan'}</span>
                  </button>

                  <button
                    onClick={handleShare}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white transition-colors"
                    title="Bagikan tautan"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Download Links Section from API */}
              {episode.downloads.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowDownloads(!showDownloads)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 text-xs sm:text-sm font-semibold transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-emerald-400" />
                      Download Video Episode ({episode.downloads.length} Resolusi Tersedia)
                    </span>
                    <span className="text-xs text-white/40">
                      {showDownloads ? 'Sembunyikan' : 'Lihat Link'}
                    </span>
                  </button>

                  {showDownloads && (
                    <div className="mt-3 space-y-2 animate-in fade-in duration-200">
                      {episode.downloads.map((dl) => (
                        <div
                          key={dl.quality}
                          className="p-3 rounded-xl bg-black/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white/90">{dl.quality}</span>
                            {dl.size && <span className="text-white/40">[{dl.size}]</span>}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            {dl.links.map((link) => (
                              <button
                                key={`${dl.quality}-${link.provider}`}
                                onClick={(e) => handleDownloadClick(e, link.url)}
                                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-[11px] font-medium transition-colors flex items-center gap-1"
                              >
                                <span>{link.provider}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Playlist Episode Selector */}
          <div className={isTheaterMode ? 'w-full mt-6' : 'lg:col-span-4 xl:col-span-3'}>
            <div className="bg-[#17171d] border border-white/5 rounded-2xl p-4 sticky top-24">
              {/* Header */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2 font-bold text-sm text-white">
                  <ListVideo className="w-4 h-4 text-rose-500" />
                  <span>Daftar Episode</span>
                  <span className="text-xs font-normal text-white/40">
                    ({playlistItems.length})
                  </span>
                </div>
              </div>

              {/* Search episode inside playlist */}
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Cari episode..."
                  value={playlistSearch}
                  onChange={(e) => setPlaylistSearch(e.target.value)}
                  className="w-full bg-white/[0.06] text-white text-xs pl-8 pr-3 py-1.5 rounded-xl border border-white/10 focus:border-white/20 outline-none placeholder-white/40"
                />
                <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-2" />
              </div>

              {/* Scrollable Episode Cards */}
              <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                {filteredPlaylist.map((ep) => {
                  const isActive = ep.slug === episodeSlugParam || ep.title === episode.title;
                  // Look up watched history for this specific episode
                  const epHistory = watchHistory.find(
                    (h) => h.anime_slug === animeSlug && (h.episode_slug === ep.slug || h.episode_title === ep.title)
                  );
                  const epProgress = epHistory ? epHistory.progress : 0;

                  return (
                    <Link
                      key={`list-ep-${ep.slug}`}
                      ref={isActive ? activeEpRef : null}
                      to={`/anime/${animeSlug}/${ep.slug}`}
                      className={`p-2.5 rounded-xl border transition-all flex items-center gap-3 relative group/ep ${
                        isActive
                          ? 'bg-rose-500/15 border-rose-500/50 shadow-md shadow-rose-500/10 text-white'
                          : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 text-white/80'
                      }`}
                    >
                      {/* Episode Thumbnail */}
                      <div className="relative w-14 aspect-video rounded-lg overflow-hidden bg-black/50 flex-shrink-0">
                        {anime?.poster ? (
                          <img
                            src={anime.poster}
                            alt={ep.title}
                            className="w-full h-full object-cover opacity-60"
                          />
                        ) : null}
                        {isActive ? (
                          <div className="absolute inset-0 bg-rose-600/60 flex items-center justify-center">
                            <Play className="w-3.5 h-3.5 fill-white text-white" />
                          </div>
                        ) : null}
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

                      {/* Episode Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs font-bold truncate ${
                              isActive ? 'text-rose-400' : 'text-white/90'
                            }`}
                          >
                            {parseEpisodeInfo(ep.title, ep.slug).epNumber}
                          </span>

                          {/* Progress Percentage Badge */}
                          {epProgress > 0 ? (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                                epProgress >= 90
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {epProgress >= 90 ? 'Selesai' : `${epProgress}%`}
                            </span>
                          ) : (
                            <span className="text-[10px] text-white/30 flex-shrink-0">
                              0%
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/50 truncate mt-0.5">
                          {ep.title.replace(/^.*?(?:Episode|Eps\.?|Ep)\s*\d+/i, '').trim() || 'Sub Indo'}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
