import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { GenreFilters } from '../components/GenreFilters';
import { AnimeSection } from '../components/AnimeSection';
import { AnimeCard } from '../components/AnimeCard';
import { AnimeItem, WatchHistoryItem, NavTab } from '../types/anime';
import { Search, Film, Bookmark, Sparkles, Loader2, RefreshCw } from 'lucide-react';

const GENRE_LIST = [
  'Semua',
  'Action',
  'Fantasy',
  'Comedy',
  'Isekai',
  'Romance',
  'School',
  'Adventure',
  'Sci-Fi',
  'Slice of Life'
];

interface HomePageProps {
  currentTab: NavTab;
  ongoingList: AnimeItem[];
  completeList: AnimeItem[];
  watchHistory: WatchHistoryItem[];
  myList: AnimeItem[];
  searchQuery: string;
  searchResults: AnimeItem[];
  isSearching: boolean;
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  currentTab,
  ongoingList,
  completeList,
  watchHistory,
  myList,
  searchQuery,
  searchResults,
  isSearching,
  loading,
  error,
  onRefresh
}) => {
  const navigate = useNavigate();
  const [selectedGenre, setSelectedGenre] = useState<string>('Semua');

  // Filter items by simple keyword/genre match if selected
  const filterByGenre = (items: AnimeItem[]) => {
    if (selectedGenre === 'Semua') return items;
    const g = selectedGenre.toLowerCase();
    return items.filter((item) => item.title.toLowerCase().includes(g));
  };

  const filteredOngoing = useMemo(
    () => filterByGenre(ongoingList),
    [ongoingList, selectedGenre]
  );

  const filteredComplete = useMemo(
    () => filterByGenre(completeList),
    [completeList, selectedGenre]
  );

  // Featured Anime for Hero: Top Ongoing Anime
  const featuredAnime = ongoingList.length > 0 ? ongoingList[0] : null;

  if (error && ongoingList.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 pt-24 pb-16">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3">
          <RefreshCw className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-white mb-1">Gagal Menghubungkan ke API</h3>
        <p className="text-xs text-white/50 max-w-md mb-4">{error}</p>
        <button
          onClick={onRefresh}
          className="px-5 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-all"
        >
          Coba Muat Ulang
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Search Results View if Searching */}
      {searchQuery.trim().length > 0 ? (
        <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-10 pt-24 sm:pt-28 pb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2.5">
              <Search className="w-5 h-5 text-white/60" />
              <span>Hasil Pencarian "{searchQuery}"</span>
            </h2>
            {isSearching && (
              <div className="flex items-center gap-2 text-xs text-white/60">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mencari di database Otakudesu...</span>
              </div>
            )}
          </div>

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
              {searchResults.map((anime) => (
                <AnimeCard key={`search-${anime.slug}`} anime={anime} />
              ))}
            </div>
          ) : !isSearching ? (
            <div className="py-20 text-center text-white/50 space-y-2">
              <p className="text-lg">Tidak ada anime yang cocok dengan kata kunci</p>
              <p className="text-xs text-white/30">Coba gunakan judul alternatif atau bahasa Jepang</p>
            </div>
          ) : null}
        </div>
      ) : currentTab === 'my-list' ? (
        /* My List Tab */
        <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-10 pt-24 sm:pt-28 pb-16">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-2.5">
            <Bookmark className="w-5 h-5 text-rose-500" />
            <span>Anime Tersimpan</span>
          </h2>

          {myList.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
              {myList.map((anime) => (
                <AnimeCard key={`fav-${anime.slug}`} anime={anime} />
              ))}
            </div>
          ) : (
            <div className="py-24 text-center text-white/40 space-y-3">
              <p className="text-base sm:text-lg">Daftar simpanan Anda masih kosong</p>
              <p className="text-xs text-white/30">
                Klik 'Simpan' pada halaman detail anime untuk menambahkannya ke sini.
              </p>
            </div>
          )}
        </div>
      ) : currentTab === 'movie' ? (
        /* Complete / Movie Tab */
        <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-10 pt-24 sm:pt-28 pb-16">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-2.5">
            <Film className="w-5 h-5 text-indigo-400" />
            <span>Anime Tamat (Complete)</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
            {completeList.map((anime) => (
              <AnimeCard key={`complete-${anime.slug}`} anime={anime} />
            ))}
          </div>
        </div>
      ) : currentTab === 'new-season' ? (
        /* Ongoing / New Season Tab */
        <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-10 pt-24 sm:pt-28 pb-16">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>Anime Sedang Tayang (Ongoing)</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
            {ongoingList.map((anime) => (
              <AnimeCard key={`season-${anime.slug}`} anime={anime} />
            ))}
          </div>
        </div>
      ) : (
        /* Default Home View */
        <>
          {/* Hero Banner (Featured Anime from API) */}
          <Hero
            anime={featuredAnime}
            loading={loading}
            onPlay={(slug) => navigate(`/anime/${slug}`)}
            onMoreInfo={(slug) => navigate(`/anime/${slug}`)}
          />

          {/* Main Sections Container */}
          <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-10 -mt-12 sm:-mt-16 md:-mt-20 relative z-20 pb-20">
            {/* Trending Now (Ongoing Releases) */}
            <AnimeSection
              title="Trending Now"
              items={filteredOngoing}
            />

            {/* Genre Filter Pills */}
            <GenreFilters
              genres={GENRE_LIST}
              selectedGenre={selectedGenre}
              onSelectGenre={setSelectedGenre}
            />

            {/* Continue Watching for You (100% Real Watch History) */}
            {watchHistory.length > 0 && (
              <AnimeSection
                title="Continue Watching for You"
                items={[]}
                historyItems={watchHistory}
                showProgress={true}
              />
            )}

            {/* Recommended For You (Complete Anime from API) */}
            <AnimeSection
              title="Recommended For You"
              items={filteredComplete}
            />
          </div>
        </>
      )}
    </div>
  );
};
