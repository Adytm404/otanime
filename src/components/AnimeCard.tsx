import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Star } from 'lucide-react';
import { AnimeItem } from '../types/anime';

interface AnimeCardProps {
  anime: AnimeItem;
  onClick?: (anime: AnimeItem) => void;
  showProgress?: boolean;
  progress?: number;
  badgeText?: string;
  targetEpisodeSlug?: string;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({
  anime,
  onClick,
  showProgress = false,
  progress = 0,
  badgeText,
  targetEpisodeSlug
}) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (onClick) {
      onClick(anime);
    } else if (targetEpisodeSlug) {
      navigate(`/anime/${anime.slug}/${targetEpisodeSlug}`);
    } else {
      navigate(`/anime/${anime.slug}`);
    }
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (targetEpisodeSlug) {
      navigate(`/anime/${anime.slug}/${targetEpisodeSlug}`);
    } else {
      navigate(`/anime/${anime.slug}`);
    }
  };

  const displayBadge = badgeText || anime.current_episode || anime.total_episode;

  return (
    <div
      onClick={handleCardClick}
      className="group cursor-pointer flex flex-col flex-shrink-0 w-[136px] sm:w-[160px] md:w-[180px] lg:w-[204px] transition-transform duration-300"
    >
      {/* Poster Container */}
      <div className="relative w-full aspect-[2/3] rounded-xl sm:rounded-2xl overflow-hidden bg-[#1a1a20] border border-white/5 shadow-md group-hover:shadow-xl group-hover:shadow-black/50 group-hover:border-white/20 transition-all duration-300">
        <img
          src={anime.thumb}
          alt={anime.title}
          loading="lazy"
          className="w-full h-full object-cover object-center transform transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80";
          }}
        />

        {/* Hover Gradient & Quick Play Action */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <button
            onClick={handlePlayClick}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 text-black flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 hover:scale-110 active:scale-95 transition-all duration-200"
            title={`Watch ${anime.title}`}
          >
            <Play className="w-5 h-5 fill-black text-black ml-0.5" />
          </button>
        </div>

        {/* Badge (e.g. "Episode 12" / "12 Episode") */}
        {displayBadge && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/15 text-[10px] sm:text-xs font-semibold text-white/90 shadow">
              {displayBadge}
            </span>
          </div>
        )}

        {/* Rating score badge if available */}
        {anime.rating && (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-bold text-amber-400 border border-white/10 flex items-center gap-1 shadow">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{anime.rating}</span>
            </span>
          </div>
        )}

        {/* Progress Bar for "Continue Watching" */}
        {showProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-1 sm:h-1.5 bg-white/20 z-10">
            <div
              className="h-full bg-rose-600 rounded-r-full"
              style={{ width: `${Math.max(10, Math.min(100, progress))}%` }}
            />
          </div>
        )}
      </div>

      {/* Anime Title */}
      <div className="mt-2.5 sm:mt-3 px-0.5">
        <h3 className="text-xs sm:text-sm font-medium text-white/90 group-hover:text-white line-clamp-2 leading-snug transition-colors">
          {anime.title}
        </h3>
        {anime.release_day && (
          <span className="text-[11px] text-white/40 block mt-0.5">
            {anime.release_day} {anime.release_date ? `• ${anime.release_date}` : ''}
          </span>
        )}
      </div>
    </div>
  );
};
