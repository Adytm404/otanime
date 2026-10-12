import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchOngoing, fetchSchedule } from '../services/otakudesuApi';
import { AnimeItem, ScheduleDay } from '../types/anime';
import { AnimeCard } from '../components/AnimeCard';
import { useDocumentTitle } from '../utils/useDocumentTitle';
import { CalendarDays, Loader2, RefreshCw } from 'lucide-react';

interface SchedulePageProps {
  ongoingList?: AnimeItem[];
}

// Indexed by Date.getDay()
const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Ongoing pages to scan for posters/latest episode; the schedule itself only has titles
const MAX_ONGOING_PAGES = 6;

export const SchedulePage: React.FC<SchedulePageProps> = ({ ongoingList = [] }) => {
  const navigate = useNavigate();
  const today = DAY_NAMES[new Date().getDay()];

  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>(today);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [ongoingPages, setOngoingPages] = useState<AnimeItem[]>([]);

  useDocumentTitle('Jadwal Rilis');

  const loadSchedule = () => {
    setLoading(true);
    setError(null);
    fetchSchedule()
      .then((data) => {
        setSchedule(data);
        if (!data.some((d) => d.day === today) && data[0]) setSelectedDay(data[0].day);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat jadwal rilis'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSchedule();
  }, []);

  // Collect posters from the ongoing listing in the background
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (let page = 1; page <= MAX_ONGOING_PAGES && !cancelled; page++) {
        try {
          const res = await fetchOngoing(page);
          if (cancelled) return;
          setOngoingPages((prev) => [...prev, ...(res.data || [])]);
          if (!res.hasNextPage) return;
        } catch {
          return;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ongoingBySlug = useMemo(() => {
    const map = new Map<string, AnimeItem>();
    for (const item of [...ongoingList, ...ongoingPages]) {
      if (!map.has(item.slug)) map.set(item.slug, item);
    }
    return map;
  }, [ongoingList, ongoingPages]);

  const activeDay = schedule.find((d) => d.day === selectedDay);

  return (
    <div className="min-h-screen bg-[#121214] text-white selection:bg-white selection:text-black pt-24 sm:pt-28 pb-24">
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8 border-b border-white/10 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-2">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Hari ini: {today}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">Jadwal Rilis</h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1.5">
            Anime ongoing yang tayang setiap hari. Episode baru biasanya muncul pada hari tersebut.
          </p>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-white/50">
            <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            <p className="text-sm">Memuat jadwal rilis...</p>
          </div>
        ) : error ? (
          <div className="py-20 flex flex-col items-center gap-3 text-center text-white/50">
            <p className="text-sm">{error}</p>
            <button
              onClick={loadSchedule}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Coba Lagi
            </button>
          </div>
        ) : (
          <>
            {/* Day Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
              {schedule.map((d) => {
                const isActive = d.day === selectedDay;
                const isToday = d.day === today;
                return (
                  <button
                    key={d.day}
                    onClick={() => setSelectedDay(d.day)}
                    className={`relative flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-all ${
                      isActive
                        ? 'bg-white text-black border-white'
                        : 'bg-white/[0.06] text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {isToday && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                    <span>{d.day}</span>
                    <span className={isActive ? 'text-black/50' : 'text-white/40'}>{d.anime.length}</span>
                  </button>
                );
              })}
            </div>

            {activeDay && activeDay.anime.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
                {activeDay.anime.map((item) => {
                  const ongoing = ongoingBySlug.get(item.slug);
                  return (
                    <AnimeCard
                      key={`schedule-${item.slug}`}
                      anime={{
                        title: item.title,
                        slug: item.slug,
                        thumb: ongoing?.thumb || '',
                        current_episode: ongoing?.current_episode,
                      }}
                      badgeText={ongoing?.current_episode || selectedDay}
                      onClick={() => navigate(`/anime/${item.slug}`)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="py-20 text-center text-white/40">Tidak ada anime yang dijadwalkan pada hari ini.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
