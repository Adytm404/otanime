import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { GenreFilters } from '../components/GenreFilters';
import { AnimeSection } from '../components/AnimeSection';
import { AnimeCard } from '../components/AnimeCard';
import { fetchGenreList, fetchAnimeByGenre } from '../services/otakudesuApi';
import { AnimeItem, WatchHistoryItem } from '../types/anime';
import { Search, Loader2, RefreshCw } from 'lucide-react';

interface HomePageProps {
  ongoingList: AnimeItem[];
  completeList: AnimeItem[];
  watchHistory: WatchHistoryItem[];
  searchQuery: string;
  searchResults: AnimeItem[];
  isSearching: boolean;
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  ongoingList,
  completeList,
  watchHistory,
  searchQuery,
  searchResults,
  isSearching,
  loading,
  error,
  onRefresh
}) => {
  const navigate = useNavigate();

  // Genre Scraper State from https://otakudesu.blog/genre-list/
  const [genreList, setGenreList] = useState<Array<{ name: string; slug: string }>>([]);
  const [selectedGenreSlug, setSelectedGenreSlug] = useState<string>('all');
  const [genreAnimeList, setGenreAnimeList] = useState<AnimeItem[]>([]);
  const [loadingGenre, setLoadingGenre] = useState<boolean>(false);
  const [loadingGenresList, setLoadingGenresList] = useState<boolean>(false);

  // Infinite Scroll State for Genre
  const [genrePage, setGenrePage] = useState<number>(1);
  const [hasMoreGenre, setHasMoreGenre] = useState<boolean>(true);
  const [loadingMoreGenre, setLoadingMoreGenre] = useState<boolean>(false);
  const observerRef = useRef<HTMLDivElement>(null);

  // Load genres from backend on mount
  useEffect(() => {
    setLoadingGenresList(true);
    fetchGenreList()
      .then((genres) => {
        if (genres && genres.length > 0) {
          setGenreList(genres);
        }
      })
      .catch((err) => {
        console.error('Failed to load genre list:', err);
      })
      .finally(() => {
        setLoadingGenresList(false);
      });
  }, []);

  // When user picks a genre, fetch page 1 from backend
  const handleSelectGenre = async (slug: string) => {
    setSelectedGenreSlug(slug);
    setGenrePage(1);
    setHasMoreGenre(true);

    if (slug === 'all') {
      setGenreAnimeList([]);
      return;
    }

    setLoadingGenre(true);
    try {
      const result = await fetchAnimeByGenre(slug, 1);
      setGenreAnimeList(result.data || []);
      setHasMoreGenre(Boolean(result.hasNextPage) && (result.data?.length ?? 0) > 0);
    } catch (err) {
      console.error(`Failed to fetch anime for genre ${slug}:`, err);
      setGenreAnimeList([]);
      setHasMoreGenre(false);
    } finally {
      setLoadingGenre(false);
    }
  };

  // Load more anime for selected genre (infinite scroll)
  const loadMoreGenreAnime = useCallback(async () => {
    if (
      selectedGenreSlug === 'all' ||
      loadingGenre ||
      loadingMoreGenre ||
      !hasMoreGenre
    ) {
      return;
    }

    setLoadingMoreGenre(true);
    const nextPage = genrePage + 1;

    try {
      const result = await fetchAnimeByGenre(selectedGenreSlug, nextPage);
      const newItems = result.data || [];

      if (newItems.length > 0) {
        setGenreAnimeList((prev) => {
          const existingSlugs = new Set(prev.map((item) => item.slug));
          const uniqueNew = newItems.filter((item) => !existingSlugs.has(item.slug));
          return [...prev, ...uniqueNew];
        });
        setGenrePage(nextPage);
        setHasMoreGenre(Boolean(result.hasNextPage));
      } else {
        setHasMoreGenre(false);
      }
    } catch (err) {
      console.error(`Failed loading more anime for genre ${selectedGenreSlug}:`, err);
      setHasMoreGenre(false);
    } finally {
      setLoadingMoreGenre(false);
    }
  }, [selectedGenreSlug, genrePage, hasMoreGenre, loadingGenre, loadingMoreGenre]);

  // IntersectionObserver for trigger infinite scroll when scrolling to bottom
  useEffect(() => {
    if (
      selectedGenreSlug === 'all' ||
      !hasMoreGenre ||
      loadingGenre ||
      loadingMoreGenre
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreGenreAnime();
        }
      },
      { rootMargin: '350px' }
    );

    const currentEl = observerRef.current;
    if (currentEl) {
      observer.observe(currentEl);
    }

    return () => {
      if (currentEl) {
        observer.unobserve(currentEl);
      }
    };
  }, [selectedGenreSlug, hasMoreGenre, loadingGenre, loadingMoreGenre, loadMoreGenreAnime]);

  const currentGenreName = genreList.find((g) => g.slug === selectedGenreSlug)?.name || selectedGenreSlug;

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
                <span>Mencari di database Otanime...</span>
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
      ) : (
        /* Default Home View */
        <>
          {/* Hero Slider (Top 5 Featured Anime with 30s Auto-Advance & Trailer Background) */}
          <Hero
            items={ongoingList}
            loading={loading}
            onPlay={(slug) => navigate(`/anime/${slug}`)}
            onMoreInfo={(slug) => navigate(`/anime/${slug}`)}
          />

          {/* Main Sections Container */}
          <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-10 -mt-12 sm:-mt-16 md:-mt-20 relative z-20 pb-20">
            {/* Newest Anime (Ongoing Releases) */}
            <AnimeSection
              title="Newest Anime"
              items={ongoingList}
            />

            {/* Genre Filter Pills from https://otakudesu.blog/genre-list/ */}
            <GenreFilters
              genres={genreList}
              selectedGenreSlug={selectedGenreSlug}
              onSelectGenre={handleSelectGenre}
              loading={loadingGenresList}
            />

            {/* If a genre is selected, display anime from that genre with infinite scroll */}
            {selectedGenreSlug !== 'all' ? (
              <section className="w-full my-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    <span>Anime Genre: {currentGenreName}</span>
                    <span className="text-xs font-normal text-white/40">
                      ({genreAnimeList.length} anime)
                    </span>
                  </h2>

                  {loadingGenre && (
                    <div className="flex items-center gap-2 text-xs text-white/60">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memuat anime {currentGenreName}...</span>
                    </div>
                  )}
                </div>

                {genreAnimeList.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
                      {genreAnimeList.map((anime) => (
                        <AnimeCard key={`genre-${anime.slug}`} anime={anime} />
                      ))}
                    </div>

                    {/* Infinite Scroll Trigger Sentinel & Loading Indicator */}
                    <div ref={observerRef} className="w-full py-8 flex flex-col items-center justify-center">
                      {loadingMoreGenre ? (
                        <div className="flex items-center gap-2.5 text-xs text-white/70 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                          <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                          <span>Memuat anime berikutnya...</span>
                        </div>
                      ) : hasMoreGenre ? (
                        <button
                          onClick={loadMoreGenreAnime}
                          className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-colors"
                        >
                          Muat Lebih Banyak
                        </button>
                      ) : (
                        <p className="text-xs text-white/30">
                          Semua anime untuk genre {currentGenreName} telah ditampilkan
                        </p>
                      )}
                    </div>
                  </>
                ) : !loadingGenre ? (
                  <p className="text-xs text-white/40 py-8 text-center">
                    Tidak ditemukan anime untuk genre {currentGenreName}.
                  </p>
                ) : null}
              </section>
            ) : (
              <>
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
                  items={completeList}
                />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
