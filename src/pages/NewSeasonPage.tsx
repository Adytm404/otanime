import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchOngoing } from '../services/otakudesuApi';
import { AnimeItem } from '../types/anime';
import { AnimeCard } from '../components/AnimeCard';
import { Sparkles, Loader2, Calendar } from 'lucide-react';

interface NewSeasonPageProps {
  initialList?: AnimeItem[];
}

export const NewSeasonPage: React.FC<NewSeasonPageProps> = ({ initialList = [] }) => {
  const navigate = useNavigate();

  const [ongoingList, setOngoingList] = useState<AnimeItem[]>(initialList);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasNextPage, setHasNextPage] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(initialList.length === 0);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const observerRef = useRef<HTMLDivElement>(null);

  // Load first page if not provided
  useEffect(() => {
    if (initialList.length === 0) {
      setLoading(true);
      fetchOngoing(1)
        .then((res) => {
          setOngoingList(res.data || []);
          setCurrentPage(res.currentPage || 1);
          setHasNextPage(Boolean(res.hasNextPage));
        })
        .catch((err) => console.error('Failed fetching ongoing anime:', err))
        .finally(() => setLoading(false));
    }
  }, [initialList]);

  // Load next page (Infinite Scroll)
  const loadNextPage = useCallback(async () => {
    if (loading || loadingMore || !hasNextPage) return;

    setLoadingMore(true);
    const nextPage = currentPage + 1;

    try {
      const res = await fetchOngoing(nextPage);
      const newItems = res.data || [];

      if (newItems.length > 0) {
        setOngoingList((prev) => {
          const existingSlugs = new Set(prev.map((a) => a.slug));
          const uniqueNew = newItems.filter((a) => !existingSlugs.has(a.slug));
          return [...prev, ...uniqueNew];
        });
        setCurrentPage(nextPage);
        setHasNextPage(Boolean(res.hasNextPage));
      } else {
        setHasNextPage(false);
      }
    } catch (err) {
      console.error('Failed loading next page of ongoing anime:', err);
      setHasNextPage(false);
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage, hasNextPage, loading, loadingMore]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!hasNextPage || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadNextPage();
        }
      },
      { rootMargin: '350px' }
    );

    const el = observerRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasNextPage, loading, loadingMore, loadNextPage]);

  return (
    <div className="min-h-screen bg-[#121214] text-white selection:bg-white selection:text-black pt-24 sm:pt-28 pb-24">
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Jadwal Tayang Ongoing</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>New Season (Anime Sedang Tayang)</span>
            </h1>
            <p className="text-xs sm:text-sm text-white/50 mt-1.5">
              Daftar anime musim ini yang sedang aktif tayang dan diperbarui setiap hari sesuai jadwal rilis.
            </p>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-white/[0.06] border border-white/10 text-xs flex items-center gap-2 self-start md:self-auto">
            <Calendar className="w-4 h-4 text-white/60" />
            <span>
              <strong>{ongoingList.length}</strong> anime dimuat
            </span>
          </div>
        </div>

        {/* Loading Spinner for Initial Fetch */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-white/50">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            <p className="text-sm">Memuat daftar anime ongoing terbaru...</p>
          </div>
        ) : ongoingList.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
              {ongoingList.map((anime) => (
                <AnimeCard
                  key={`ongoing-${anime.slug}`}
                  anime={anime}
                  onClick={() => navigate(`/anime/${anime.slug}`)}
                />
              ))}
            </div>

            {/* Infinite Scroll Sentinel */}
            <div ref={observerRef} className="w-full py-12 flex flex-col items-center justify-center">
              {loadingMore ? (
                <div className="flex items-center gap-2.5 text-xs text-white/70 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                  <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                  <span>Memuat episode ongoing berikutnya...</span>
                </div>
              ) : hasNextPage ? (
                <button
                  onClick={loadNextPage}
                  className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-colors"
                >
                  Muat Lebih Banyak
                </button>
              ) : (
                <p className="text-xs text-white/30">
                  Seluruh anime ongoing musim ini telah ditampilkan
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="py-20 text-center text-white/40">
            Tidak ada anime ongoing yang ditemukan.
          </div>
        )}
      </div>
    </div>
  );
};
