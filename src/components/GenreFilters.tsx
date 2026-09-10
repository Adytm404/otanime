import React from 'react';

export interface GenreItem {
  name: string;
  slug: string;
}

interface GenreFiltersProps {
  genres: GenreItem[];
  selectedGenreSlug: string;
  onSelectGenre: (genreSlug: string) => void;
  loading?: boolean;
}

export const GenreFilters: React.FC<GenreFiltersProps> = ({
  genres,
  selectedGenreSlug,
  onSelectGenre,
  loading = false
}) => {
  return (
    <div className="w-full my-6 sm:my-8">
      {/* Horizontally scrollable container with smooth sliding */}
      <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar py-1">
        {/* "Semua" default pill */}
        <button
          onClick={() => onSelectGenre('all')}
          className={`flex-shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ${
            selectedGenreSlug === 'all'
              ? 'bg-white text-black font-semibold shadow-md shadow-black/20 scale-[1.02]'
              : 'bg-white/[0.08] hover:bg-white/[0.14] text-white/80 hover:text-white border border-white/5 active:scale-95'
          }`}
        >
          Semua Genre
        </button>

        {genres.map((genre) => {
          const isSelected = selectedGenreSlug === genre.slug;
          return (
            <button
              key={genre.slug}
              onClick={() => onSelectGenre(genre.slug)}
              className={`flex-shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ${
                isSelected
                  ? 'bg-white text-black font-semibold shadow-md shadow-black/20 scale-[1.02]'
                  : 'bg-white/[0.08] hover:bg-white/[0.14] text-white/80 hover:text-white border border-white/5 active:scale-95'
              }`}
            >
              {genre.name}
            </button>
          );
        })}

        {loading && (
          <div className="flex-shrink-0 px-4 py-2 text-xs text-white/40">
            Memuat genre...
          </div>
        )}
      </div>
    </div>
  );
};
