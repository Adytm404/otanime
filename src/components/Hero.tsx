import React from 'react';
import { Play, Info } from 'lucide-react';
import { AnimeItem } from '../types/anime';

interface HeroProps {
  anime: AnimeItem | null;
  synopsis?: string;
  onPlay: (slug: string) => void;
  onMoreInfo: (slug: string) => void;
  loading?: boolean;
}

export const Hero: React.FC<HeroProps> = ({
  anime,
  synopsis,
  onPlay,
  onMoreInfo,
  loading = false
}) => {
  if (loading || !anime) {
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

  const imageSrc = anime.thumb;
  const displaySynopsis =
    synopsis ||
    `Nonton streaming dan download anime ${anime.title} subtitle Indonesia kualitas HD 1080p, 720p, 480p di Otanime.`;

  return (
    <section className="relative w-full h-[70vh] sm:h-[78vh] md:h-[84vh] lg:h-[88vh] min-h-[520px] max-h-[920px] flex items-center overflow-hidden">
      {/* Background Image Container */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src={imageSrc}
          alt={anime.title}
          decoding="async"
          fetchPriority="high"
          className="w-full h-full object-cover object-[center_25%]"
        />

        {/* Cinematic Vignette & Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#121214]/95 via-[#121214]/75 sm:via-[#121214]/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-48 sm:h-64 bg-gradient-to-t from-[#121214] via-[#121214]/85 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-[1520px] w-full mx-auto px-4 sm:px-6 lg:px-10 pt-16 sm:pt-20">
        <div className="max-w-2xl space-y-3 sm:space-y-4">
          {/* Badge */}
          {anime.current_episode && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-semibold sm:backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              <span>Update Terbaru • {anime.current_episode}</span>
            </div>
          )}

          {/* Main Title */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tight text-white leading-[1.14] drop-shadow-md">
            {anime.title}
          </h1>

          {/* Synopsis */}
          <p className="text-xs sm:text-sm md:text-base text-white/80 line-clamp-3 leading-relaxed max-w-xl font-normal drop-shadow">
            {displaySynopsis}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2 sm:pt-4">
            {/* Play Button */}
            <button
              onClick={() => onPlay(anime.slug)}
              className="flex items-center gap-2 px-6 sm:px-7 py-2.5 sm:py-3 rounded-full bg-white text-black font-semibold text-xs sm:text-sm hover:bg-white/90 active:scale-95 transition-transform shadow-md shadow-black/30 group"
            >
              <Play className="w-4 h-4 fill-black text-black transition-transform group-hover:scale-110" />
              <span>Nonton Sekarang</span>
            </button>

            {/* More Info Button */}
            <button
              onClick={() => onMoreInfo(anime.slug)}
              className="flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white font-medium text-xs sm:text-sm sm:backdrop-blur-md border border-white/10 transition-colors"
            >
              <Info className="w-4 h-4 opacity-90" />
              <span>Detail Anime</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
