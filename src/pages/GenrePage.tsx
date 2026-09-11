import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchGenreList, fetchAnimeByGenre } from '../services/otakudesuApi';
import { GenreAnimeItem, AnimeGenre } from '../types/anime';
import { AnimeCard } from '../components/AnimeCard';
import {
  Filter,
  Check,
  X,
  Loader2,
  Search,
  SlidersHorizontal,
  Layers
} from 'lucide-react';

export const GenrePage: React.FC = () => {
  const { genreSlug } = useParams<{ genreSlug?: string }>();
  const navigate = useNavigate();

  // All scraped genres from Otakudesu (/genre-list/)
  const [allGenres, setAllGenres] = useState<AnimeGenre[]>([]);
  const [loadingGenres, setLoadingGenres] = useState<boolean>(true);
  const [genreSearch, setGenreSearch] = useState<string>('');

  // Selected genres state (set of slugs, e.g. ['action', 'fantasy'])
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(() => {
    return genreSlug ? [genreSlug] : ['action'];
  });

  // Anime results state
  const [rawAnimeList, setRawAnimeList] = useState<GenreAnimeItem[]>([]);
  const [loadingAnime, setLoadingAnime] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasNextPage, setHasNextPage] = useState<boolean>(true);

  const observerRef = useRef<HTMLDivElement>(null);

  // Sync route param with selected slugs if param changes
  useEffect(() => {
    if (genreSlug && !selectedSlugs.includes(genreSlug)) {
      setSelectedSlugs((prev) => [...prev, genreSlug]);
    }
  }, [genreSlug]);

  // Load all 36 genres on mount
  useEffect(() => {
    setLoadingGenres(true);
    fetchGenreList()
      .then((data) => {
        if (data && data.length > 0) {
          setAllGenres(data);
          // If no genre selected, select first genre by default
          if (selectedSlugs.length === 0) {
            setSelectedSlugs([data[0].slug]);
          }
        }
      })
      .catch((err) => console.error('Failed fetching genre list:', err))
      .finally(() => setLoadingGenres(false));
  }, []);

  // Primary genre used for backend API request
  const primarySlug = selectedSlugs.length > 0 ? selectedSlugs[0] : '';

  // Fetch page 1 when primary slug changes
  const loadFirstPage = useCallback(async () => {
    if (!primarySlug) {
      setRawAnimeList([]);
      return;
    }

    setLoadingAnime(true);
    setCurrentPage(1);
    setHasNextPage(true);

    try {
      const res = await fetchAnimeByGenre(primarySlug, 1);
      setRawAnimeList(res.data || []);
      setHasNextPage(Boolean(res.hasNextPage) && (res.data?.length ?? 0) > 0);
    } catch (err) {
      console.error(`Error loading anime for genre ${primarySlug}:`, err);
      setRawAnimeList([]);
      setHasNextPage(false);
    } finally {
      setLoadingAnime(false);
    }
  }, [primarySlug]);

  useEffect(() => {
    loadFirstPage();
  }, [primarySlug]);

  // Load next page (Infinite Scroll)
  const loadNextPage = useCallback(async () => {
    if (!primarySlug || loadingAnime || loadingMore || !hasNextPage) return;

    setLoadingMore(true);
    const nextPage = currentPage + 1;

    try {
      const res = await fetchAnimeByGenre(primarySlug, nextPage);
      const newItems = res.data || [];

      if (newItems.length > 0) {
        setRawAnimeList((prev) => {
          const existingSlugs = new Set(prev.map((item) => item.slug));
          const uniqueNew = newItems.filter((item) => !existingSlugs.has(item.slug));
          return [...prev, ...uniqueNew];
        });
        setCurrentPage(nextPage);
        setHasNextPage(Boolean(res.hasNextPage));
      } else {
        setHasNextPage(false);
      }
    } catch (err) {
      console.error('Error loading next page of anime by genre:', err);
      setHasNextPage(false);
    } finally {
      setLoadingMore(false);
    }
  }, [primarySlug, currentPage, hasNextPage, loadingAnime, loadingMore]);

  // Toggle genre selection (Multi-Select)
  const toggleGenre = (slug: string) => {
    setSelectedSlugs((prev) => {
      if (prev.includes(slug)) {
        // If it's the only one selected, keep at least one or allow empty
        return prev.filter((s) => s !== slug);
      } else {
        return [...prev, slug];
      }
    });
  };

  const resetSelection = () => {
    if (allGenres.length > 0) {
      setSelectedSlugs([allGenres[0].slug]);
    } else {
      setSelectedSlugs([]);
    }
  };

  // MULTI-GENRE FILTER:
  // Anime must contain ALL genres currently selected by the user!
  const filteredAnimeList = useMemo(() => {
    if (selectedSlugs.length <= 1) return rawAnimeList;

    return rawAnimeList.filter((anime) => {
      const animeGenreSlugs = new Set(
        (anime.genres || []).map((g) => g.slug.toLowerCase())
      );
      // All selected genres must be present in anime
      return selectedSlugs.every((slug) => animeGenreSlugs.has(slug.toLowerCase()));
    });
  }, [rawAnimeList, selectedSlugs]);

  // If multi-genre filter produced few results, auto-fetch next page to fill results
  useEffect(() => {
    if (
      selectedSlugs.length > 1 &&
      filteredAnimeList.length < 6 &&
      hasNextPage &&
      !loadingAnime &&
      !loadingMore
    ) {
      loadNextPage();
    }
  }, [selectedSlugs, filteredAnimeList.length, hasNextPage, loadingAnime, loadingMore, loadNextPage]);

  // Infinite Scroll IntersectionObserver
  useEffect(() => {
    if (!hasNextPage || loadingAnime || loadingMore || selectedSlugs.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadNextPage();
        }
      },
      { rootMargin: '400px' }
    );

    const el = observerRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasNextPage, loadingAnime, loadingMore, selectedSlugs, loadNextPage]);

  // Filter genres list by search input
  const filteredGenres = allGenres.filter((g) =>
    g.name.toLowerCase().includes(genreSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#121214] text-white selection:bg-white selection:text-black pt-24 sm:pt-28 pb-24">
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
              <Layers className="w-7 h-7 sm:w-8 sm:h-8 text-rose-500" />
              <span>Daftar Genre Anime</span>
            </h1>
            <p className="text-xs sm:text-sm text-white/50 mt-1.5">
              Pilih satu atau beberapa genre sekaligus. Hanya anime yang memiliki <strong>seluruh genre terpilih</strong> yang akan ditampilkan.
            </p>
          </div>

          {/* Quick Stats / Selected Counter */}
          <div className="flex items-center gap-2.5">
            <div className="px-4 py-2 rounded-2xl bg-white/[0.06] border border-white/10 text-xs flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-white/60" />
              <span>
                <strong>{selectedSlugs.length}</strong> genre dipilih
              </span>
            </div>

            {selectedSlugs.length > 1 && (
              <button
                onClick={resetSelection}
                className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-xs text-white/80 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Genre Selector Panel */}
        <div className="bg-[#17171d] border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white/90">
              <Filter className="w-4 h-4 text-rose-500" />
              <span>Pilih Genre (Bisa lebih dari satu)</span>
            </div>

            {/* Quick search input inside genre list */}
            <div className="relative w-full sm:w-60">
              <input
                type="text"
                placeholder="Cari nama genre..."
                value={genreSearch}
                onChange={(e) => setGenreSearch(e.target.value)}
                className="w-full bg-white/[0.06] text-white text-xs pl-8 pr-3 py-1.5 rounded-xl border border-white/10 focus:border-white/20 outline-none placeholder-white/40"
              />
              <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-2" />
            </div>
          </div>

          {/* Genres Pills Cloud */}
          {loadingGenres ? (
            <div className="py-8 flex items-center justify-center gap-2 text-xs text-white/50">
              <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
              <span>Mengambil daftar genre...</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredGenres.map((g) => {
                const isSelected = selectedSlugs.includes(g.slug);
                return (
                  <button
                    key={g.slug}
                    onClick={() => toggleGenre(g.slug)}
                    className={`px-3.5 py-1.5 sm:py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-white text-black shadow-lg shadow-white/10 scale-[1.02]'
                        : 'bg-white/[0.06] hover:bg-white/[0.12] text-white/75 hover:text-white border border-white/5'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    <span>{g.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected Badges Bar */}
          {selectedSlugs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-white/40 text-[11px] mr-1">Filter Aktif:</span>
              {selectedSlugs.map((slug) => {
                const name = allGenres.find((g) => g.slug === slug)?.name || slug;
                return (
                  <span
                    key={`badge-${slug}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-300 text-[11px] font-medium"
                  >
                    <span>{name}</span>
                    <button
                      onClick={() => toggleGenre(slug)}
                      className="hover:text-white transition-colors"
                      aria-label={`Hapus ${name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Filtered Anime Results Section */}
        <section>
          {/* Section Heading */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Hasil Anime
              </h2>
              <span className="text-xs font-normal text-white/40">
                ({filteredAnimeList.length} anime ditemukan)
              </span>
            </div>

            {loadingAnime && (
              <div className="flex items-center gap-2 text-xs text-white/60">
                <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                <span>Memuat data anime...</span>
              </div>
            )}
          </div>

          {/* Anime Grid */}
          {filteredAnimeList.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
              {filteredAnimeList.map((anime) => (
                <div key={`genre-anime-${anime.slug}`} className="flex flex-col card-content-visibility">
                  <AnimeCard
                    anime={{
                      title: anime.title,
                      slug: anime.slug,
                      thumb: anime.thumb,
                      rating: anime.rating,
                      total_episode: anime.episodes
                    }}
                    onClick={() => navigate(`/anime/${anime.slug}`)}
                  />

                  {/* Anime Genres Badges below card */}
                  {anime.genres && anime.genres.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {anime.genres.slice(0, 3).map((g) => {
                        const isMatch = selectedSlugs.includes(g.slug);
                        return (
                          <span
                            key={g.slug}
                            className={`text-[9px] px-1.5 py-0.5 rounded ${
                              isMatch
                                ? 'bg-rose-600/30 text-rose-300 font-bold'
                                : 'bg-white/5 text-white/40'
                            }`}
                          >
                            {g.name}
                          </span>
                        );
                      })}
                      {anime.genres.length > 3 && (
                        <span className="text-[9px] text-white/30 self-center">
                          +{anime.genres.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : !loadingAnime ? (
            <div className="py-20 text-center text-white/40 space-y-3 bg-[#17171d]/50 rounded-3xl border border-white/5">
              <p className="text-base sm:text-lg text-white/80">
                Tidak ada anime yang memiliki <strong>seluruh genre</strong> terpilih
              </p>
              <p className="text-xs text-white/40 max-w-md mx-auto">
                Coba kurangi kombinasi filter genre atau pilih genre lain untuk melihat daftar anime.
              </p>
              <button
                onClick={resetSelection}
                className="mt-2 px-5 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-all"
              >
                Reset Filter
              </button>
            </div>
          ) : null}

          {/* Infinite Scroll Sentinel & Loader */}
          {selectedSlugs.length > 0 && (
            <div ref={observerRef} className="w-full py-10 flex flex-col items-center justify-center">
              {loadingMore ? (
                <div className="flex items-center gap-2.5 text-xs text-white/70 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                  <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                  <span>Memuat anime berikutnya...</span>
                </div>
              ) : hasNextPage && filteredAnimeList.length > 0 ? (
                <button
                  onClick={loadNextPage}
                  className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-colors"
                >
                  Muat Lebih Banyak
                </button>
              ) : filteredAnimeList.length > 0 ? (
                <p className="text-xs text-white/30">
                  Seluruh anime untuk filter genre ini telah ditampilkan
                </p>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
