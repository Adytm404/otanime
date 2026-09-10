import React from 'react';

interface GenreFiltersProps {
  genres: string[];
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
}

export const GenreFilters: React.FC<GenreFiltersProps> = ({
  genres,
  selectedGenre,
  onSelectGenre
}) => {
  return (
    <div className="w-full my-6 sm:my-8">
      {/* Horizontally scrollable container with smooth sliding */}
      <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar py-1">
        {genres.map((genre) => {
          const isSelected = selectedGenre.toLowerCase() === genre.toLowerCase();
          return (
            <button
              key={genre}
              onClick={() => onSelectGenre(genre)}
              className={`flex-shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ${
                isSelected
                  ? 'bg-white text-black font-semibold shadow-md shadow-black/20 scale-[1.02]'
                  : 'bg-white/[0.08] hover:bg-white/[0.14] text-white/80 hover:text-white border border-white/5 active:scale-95'
              }`}
            >
              {genre}
            </button>
          );
        })}
      </div>
    </div>
  );
};
