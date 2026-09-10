import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimeItem, WatchHistoryItem } from '../types/anime';
import { AnimeCard } from './AnimeCard';

interface AnimeSectionProps {
  title: string;
  items: AnimeItem[];
  onAnimeClick?: (anime: AnimeItem) => void;
  showProgress?: boolean;
  historyItems?: WatchHistoryItem[];
  emptyMessage?: string;
}

export const AnimeSection: React.FC<AnimeSectionProps> = ({
  title,
  items,
  onAnimeClick,
  showProgress = false,
  historyItems,
  emptyMessage
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll);
    return () => el.removeEventListener('scroll', checkScroll);
  }, [items]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  if (items.length === 0 && !historyItems?.length) {
    if (!emptyMessage) return null;
    return (
      <section className="w-full my-6">
        <h2 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-white mb-2">
          {title}
        </h2>
        <p className="text-xs text-white/40">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="w-full my-6 sm:my-8 group/section relative">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3.5 sm:mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-white">
            {title}
          </h2>
          <span className="text-xs font-normal text-white/40">
            ({historyItems ? historyItems.length : items.length})
          </span>
        </div>

        {/* Desktop Carousel Navigation Arrows */}
        <div className="hidden sm:flex items-center gap-1.5 opacity-0 group-hover/section:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => handleScroll('left')}
            disabled={!canScrollLeft}
            className={`w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/5 flex items-center justify-center text-white transition-all ${
              !canScrollLeft ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'
            }`}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleScroll('right')}
            disabled={!canScrollRight}
            className={`w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/5 flex items-center justify-center text-white transition-all ${
              !canScrollRight ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'
            }`}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel Row */}
      <div
        ref={scrollRef}
        className="flex items-start gap-3 sm:gap-4 md:gap-5 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-1"
      >
        {historyItems
          ? historyItems.map((h) => (
              <div key={`history-${h.episode_slug}`} className="snap-start">
                <AnimeCard
                  anime={{
                    title: h.anime_title,
                    slug: h.anime_slug,
                    thumb: h.thumb,
                    current_episode: h.episode_title
                  }}
                  showProgress={true}
                  progress={h.progress}
                  targetEpisodeSlug={h.episode_slug}
                  badgeText={h.episode_title}
                />
              </div>
            ))
          : items.map((anime) => (
              <div key={`${title}-${anime.slug}`} className="snap-start">
                <AnimeCard
                  anime={anime}
                  onClick={onAnimeClick}
                  showProgress={showProgress}
                />
              </div>
            ))}
      </div>
    </section>
  );
};
