import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Info, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { AnimeItem } from '../types/anime';
import { fetchAnimeExtra } from '../services/otakudesuApi';

interface HeroProps {
  items: AnimeItem[];
  onPlay: (slug: string) => void;
  onMoreInfo: (slug: string) => void;
  loading?: boolean;
}

interface TrailerCache {
  youtubeId: string;
  embedUrl: string;
  status: 'loading' | 'loaded' | 'none';
}

function extractYouTubeId(urlOrId?: string | null): string | null {
  if (!urlOrId) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) return urlOrId;
  const match =
    urlOrId.match(/(?:embed\/|v=|vi\/|youtu\.be\/|\/v\/|\/e\/|watch\?v=|\/shorts\/)([a-zA-Z0-9_-]{11})/i) ||
    urlOrId.match(/embed\/([a-zA-Z0-9_-]+)/i);
  return match ? match[1] : null;
}

export const Hero: React.FC<HeroProps> = ({
  items,
  onPlay,
  onMoreInfo,
  loading = false
}) => {
  // Top 5 featured ongoing anime
  const featuredItems = items.slice(0, 5);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [progress, setProgress] = useState<number>(0); // 0 to 100 percent
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [trailers, setTrailers] = useState<Record<string, TrailerCache>>({});

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isHoveredRef = useRef(false);
  const loadingSlugsRef = useRef<Set<string>>(new Set());
  isHoveredRef.current = isHovered;

  const activeItem = featuredItems[currentIndex] || null;

  // Auto-advance slider every 30 seconds (300 ticks of 100ms)
  useEffect(() => {
    if (featuredItems.length <= 1) return;

    const interval = setInterval(() => {
      // Pause countdown if user is hovering over hero
      if (isHoveredRef.current) return;

      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentIndex((idx) => (idx + 1) % featuredItems.length);
          return 0;
        }
        return prev + (100 / (30 * 10)); // 30 seconds * 10 ticks/sec
      });
    }, 100);

    return () => clearInterval(interval);
  }, [featuredItems.length]);

  // Load official trailer for current and next anime
  const loadTrailer = useCallback(async (slug: string) => {
    if (!slug || loadingSlugsRef.current.has(slug)) return;
    loadingSlugsRef.current.add(slug);

    try {
      const extra = await fetchAnimeExtra(slug);
      const ytId =
        extra?.trailer?.youtube_id ||
        extractYouTubeId(extra?.trailer?.embed_url) ||
        extractYouTubeId(extra?.trailer?.url);

      if (ytId) {
        const embedUrl = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${ytId}&playsinline=1&enablejsapi=1&rel=0&iv_load_policy=3&showinfo=0&modestbranding=1`;
        setTrailers((prev) => ({
          ...prev,
          [slug]: { youtubeId: ytId, embedUrl, status: 'loaded' }
        }));
      } else if (extra?.trailer?.embed_url) {
        const sep = extra.trailer.embed_url.includes('?') ? '&' : '?';
        const embedUrl = `${extra.trailer.embed_url}${sep}autoplay=1&mute=1&controls=0&loop=1&playsinline=1&enablejsapi=1&rel=0&iv_load_policy=3&showinfo=0&modestbranding=1`;
        setTrailers((prev) => ({
          ...prev,
          [slug]: { youtubeId: '', embedUrl, status: 'loaded' }
        }));
      } else {
        setTrailers((prev) => ({
          ...prev,
          [slug]: { youtubeId: '', embedUrl: '', status: 'none' }
        }));
      }
    } catch {
      setTrailers((prev) => ({
        ...prev,
        [slug]: { youtubeId: '', embedUrl: '', status: 'none' }
      }));
    }
  }, []);

  useEffect(() => {
    if (activeItem?.slug) {
      loadTrailer(activeItem.slug);

      // Preload next anime trailer
      const nextItem = featuredItems[(currentIndex + 1) % featuredItems.length];
      if (nextItem?.slug) {
        loadTrailer(nextItem.slug);
      }
    }
  }, [activeItem?.slug, currentIndex, featuredItems, loadTrailer]);

  // When changing slide, reset progress and mute status
  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setProgress(0);
    setIsMuted(true);
  };

  const handleNext = () => {
    if (featuredItems.length <= 1) return;
    goToSlide((currentIndex + 1) % featuredItems.length);
  };

  const handlePrev = () => {
    if (featuredItems.length <= 1) return;
    goToSlide((currentIndex - 1 + featuredItems.length) % featuredItems.length);
  };

  // Toggle YouTube audio (Muted / Unmuted) via postMessage
  const toggleAudio = () => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    const nextMuted = !isMuted;
    const command = nextMuted ? 'mute' : 'unMute';

    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: command, args: [] }),
      '*'
    );
    setIsMuted(nextMuted);
  };

  if (loading || !activeItem) {
    return (
      <section className="relative w-full h-[70vh] sm:h-[78vh] md:h-[84vh] min-h-[500px] flex items-center bg-[#15151a] animate-pulse">
        <div className="max-w-[1520px] w-full mx-auto px-4 sm:px-6 lg:px-10 pt-20">
          <div className="max-w-2xl space-y-4">
            <div className="h-10 sm:h-14 bg-white/10 rounded-2xl w-3/4" />
            <div className="h-4 bg-white/10 rounded-lg w-full" />
            <div className="h-4 bg-white/10 rounded-lg w-2/3" />
            <div className="flex gap-3 pt-4">
              <div className="h-12 w-32 bg-white/20 rounded-full" />
              <div className="h-12 w-36 bg-white/10 rounded-full" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  const currentTrailer = activeItem.slug ? trailers[activeItem.slug] : null;
  const displaySynopsis =
    `Nonton streaming dan download anime ${activeItem.title} subtitle Indonesia kualitas HD 1080p, 720p, 480p di Otanime.`;

  return (
    <section
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full h-[72vh] sm:h-[80vh] md:h-[86vh] lg:h-[90vh] min-h-[540px] max-h-[960px] flex items-center overflow-hidden select-none group/hero"
    >
      {/* Background Media Container */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Backdrop Poster Image (Always rendered as smooth underlying layer) */}
        <img
          key={`backdrop-${activeItem.slug}`}
          src={activeItem.thumb}
          alt={activeItem.title}
          decoding="async"
          fetchPriority="high"
          className="w-full h-full object-cover object-[center_25%] transition-opacity duration-700"
        />

        {/* Autoplay Video Trailer (YouTube embed background without audio by default) */}
        {currentTrailer?.status === 'loaded' && currentTrailer.embedUrl && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <iframe
              key={`yt-${activeItem.slug}`}
              ref={iframeRef}
              src={currentTrailer.embedUrl}
              title={`${activeItem.title} Trailer`}
              className="w-[140%] h-[140%] -top-[20%] -left-[20%] absolute pointer-events-none object-cover opacity-90 transition-opacity duration-700"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        )}

        {/* Cinematic Vignette & Gradient Overlays for perfect readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#121214]/98 via-[#121214]/80 sm:via-[#121214]/55 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-48 sm:h-64 bg-gradient-to-t from-[#121214] via-[#121214]/85 to-transparent" />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 max-w-[1520px] w-full mx-auto px-4 sm:px-6 lg:px-10 pt-16 sm:pt-20">
        <div className="max-w-2xl space-y-3 sm:space-y-4">
          {/* Badge & Slide Counter */}
          <div className="flex items-center gap-2">
            {activeItem.current_episode && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-semibold sm:backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span>Update Terbaru • {activeItem.current_episode}</span>
              </div>
            )}
            <span className="text-[11px] text-white/50 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/5 font-mono">
              {currentIndex + 1} / {featuredItems.length}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tight text-white leading-[1.14] drop-shadow-md">
            {activeItem.title}
          </h1>

          {/* Synopsis */}
          <p className="text-xs sm:text-sm md:text-base text-white/80 line-clamp-3 leading-relaxed max-w-xl font-normal drop-shadow">
            {displaySynopsis}
          </p>

          {/* Action Buttons & Controls */}
          <div className="flex flex-wrap items-center gap-3 pt-2 sm:pt-4">
            {/* Play Button */}
            <button
              onClick={() => onPlay(activeItem.slug)}
              className="flex items-center gap-2 px-6 sm:px-7 py-2.5 sm:py-3 rounded-full bg-white text-black font-semibold text-xs sm:text-sm hover:bg-white/90 active:scale-95 transition-transform shadow-md shadow-black/30 group"
            >
              <Play className="w-4 h-4 fill-black text-black transition-transform group-hover:scale-110" />
              <span>Nonton Sekarang</span>
            </button>

            {/* More Info Button */}
            <button
              onClick={() => onMoreInfo(activeItem.slug)}
              className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white font-medium text-xs sm:text-sm sm:backdrop-blur-md border border-white/10 transition-colors"
            >
              <Info className="w-4 h-4 opacity-90" />
              <span>Detail Anime</span>
            </button>

            {/* Audio Toggle Button (Mute / Unmute Trailer Background) */}
            {currentTrailer?.status === 'loaded' && (
              <button
                onClick={toggleAudio}
                className="flex items-center gap-2 px-4 py-2.5 sm:py-3 rounded-full bg-black/60 hover:bg-black/80 sm:backdrop-blur-md border border-white/15 text-xs text-white/90 hover:text-white transition-all shadow-md"
                title={isMuted ? 'Nyalakan Audio Trailer' : 'Matikan Audio Trailer'}
                aria-label="Toggle Trailer Sound"
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-4 h-4 text-rose-400" />
                    <span className="hidden sm:inline text-[11px] font-medium">Suara: Mati</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span className="hidden sm:inline text-[11px] font-medium text-emerald-300">Suara: Nyala</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Slider Controls (Previous / Next Arrows on sides for Desktop) */}
      {featuredItems.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="hidden sm:flex absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 sm:backdrop-blur-md border border-white/10 items-center justify-center text-white/80 hover:text-white transition-all opacity-0 group-hover/hero:opacity-100 shadow-xl"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="hidden sm:flex absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 sm:backdrop-blur-md border border-white/10 items-center justify-center text-white/80 hover:text-white transition-all opacity-0 group-hover/hero:opacity-100 shadow-xl"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* 30-Second Countdown Indicator Pills (Bottom Center) */}
      {featuredItems.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 sm:gap-2.5">
          {featuredItems.map((item, idx) => {
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={`indicator-${item.slug}`}
                onClick={() => goToSlide(idx)}
                className="group/ind py-2 focus:outline-none"
                aria-label={`Slide ke ${idx + 1}: ${item.title}`}
              >
                <div className="w-9 sm:w-14 h-1.5 rounded-full bg-white/20 overflow-hidden relative">
                  {isCurrent && (
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-100 ease-linear shadow-sm shadow-rose-500"
                      style={{ width: `${progress}%` }}
                    />
                  )}
                  {!isCurrent && (
                    <div className="h-full bg-transparent group-hover/ind:bg-white/40 transition-colors" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
