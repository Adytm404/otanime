import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { GenrePage } from './pages/GenrePage';
import { MyListPage } from './pages/MyListPage';
import { NewSeasonPage } from './pages/NewSeasonPage';
import { AnimeDetailPage } from './pages/AnimeDetailPage';
import { AnimeWatchPage } from './pages/AnimeWatchPage';
import { fetchHome, searchAnime } from './services/otakudesuApi';
import { AnimeItem, WatchHistoryItem, NavTab } from './types/anime';
import { ExternalLink, Activity, X, CheckCircle2, Server } from 'lucide-react';

const AppContent: React.FC = () => {
  const location = useLocation();

  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<AnimeItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Live Data from Otakudesu Backend API
  const [ongoingList, setOngoingList] = useState<AnimeItem[]>([]);
  const [completeList, setCompleteList] = useState<AnimeItem[]>([]);
  const [apiLoading, setApiLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);

  // My List (Local Storage Persistence)
  const [myList, setMyList] = useState<AnimeItem[]>(() => {
    try {
      const saved = localStorage.getItem('otanime_my_list') || localStorage.getItem('otakudesu_my_list');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Continue Watching History (Local Storage Persistence)
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('otanime_watch_history') || localStorage.getItem('otakudesu_watch_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync active nav tab based on URL
  useEffect(() => {
    if (location.pathname.startsWith('/genres')) {
      setCurrentTab('genres');
    } else if (location.pathname.startsWith('/my-list')) {
      setCurrentTab('my-list');
    } else if (location.pathname.startsWith('/new-season')) {
      setCurrentTab('new-season');
    } else if (location.pathname === '/') {
      setCurrentTab('home');
    }
  }, [location.pathname]);

  // Fetch initial home data from API
  const loadHomeData = async () => {
    setApiLoading(true);
    setApiError(null);
    try {
      const data = await fetchHome();
      setOngoingList(data.ongoing || []);
      setCompleteList(data.complete || []);
    } catch (err: any) {
      console.error('Failed fetching Otakudesu home data:', err);
      setApiError(err.message || 'Gagal memuat data dari server backend');
    } finally {
      setApiLoading(false);
    }
  };

  useEffect(() => {
    loadHomeData();
  }, []);

  // Sync My List to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('otanime_my_list', JSON.stringify(myList));
    } catch (e) {
      console.error(e);
    }
  }, [myList]);

  // Sync Watch History to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('otanime_watch_history', JSON.stringify(watchHistory));
    } catch (e) {
      console.error(e);
    }
  }, [watchHistory]);

  const toggleFavorite = (anime: AnimeItem) => {
    setMyList((prev) => {
      const exists = prev.some((a) => a.slug === anime.slug);
      if (exists) {
        return prev.filter((a) => a.slug !== anime.slug);
      } else {
        return [anime, ...prev];
      }
    });
  };

  const removeFavorite = (slug: string) => {
    setMyList((prev) => prev.filter((a) => a.slug !== slug));
  };

  const clearFavorites = () => {
    setMyList([]);
  };

  const handleSaveHistory = useCallback((item: {
    anime_slug: string;
    anime_title: string;
    episode_slug: string;
    episode_title: string;
    thumb: string;
    progress: number;
    currentTime?: number;
    duration?: number;
  }) => {
    setWatchHistory((prev) => {
      // Remove previous entry for this specific episode
      const filtered = prev.filter(
        (h) => !(h.anime_slug === item.anime_slug && h.episode_slug === item.episode_slug)
      );
      const newEntry: WatchHistoryItem = {
        ...item,
        updated_at: Date.now()
      };
      return [newEntry, ...filtered].slice(0, 100); // Keep last 100 watched episodes
    });
  }, []);

  // Group latest episode per anime for Continue Watching on homepage
  const continueWatchingList = useMemo(() => {
    const seen = new Set<string>();
    const result: WatchHistoryItem[] = [];
    for (const h of watchHistory) {
      if (!seen.has(h.anime_slug)) {
        seen.add(h.anime_slug);
        result.push(h);
      }
    }
    return result;
  }, [watchHistory]);

  // Debounced Search via Backend /api/search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const results = await searchAnime(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleTabChange = (tab: NavTab) => {
    setCurrentTab(tab);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-[#121214] text-white flex flex-col selection:bg-white selection:text-black">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        myListCount={myList.length}
        latestReleases={ongoingList}
      />

      {/* Main Content Body with Routes */}
      <main className="flex-1 w-full">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                ongoingList={ongoingList}
                completeList={completeList}
                watchHistory={continueWatchingList}
                searchQuery={searchQuery}
                searchResults={searchResults}
                isSearching={isSearching}
                loading={apiLoading}
                error={apiError}
                onRefresh={loadHomeData}
              />
            }
          />

          <Route path="/genres" element={<GenrePage />} />
          <Route path="/genres/:genreSlug" element={<GenrePage />} />

          <Route
            path="/my-list"
            element={
              <MyListPage
                myList={myList}
                onRemoveItem={removeFavorite}
                onClearList={clearFavorites}
              />
            }
          />

          <Route
            path="/new-season"
            element={<NewSeasonPage initialList={ongoingList} />}
          />

          <Route
            path="/anime/:id"
            element={
              <AnimeDetailPage
                myList={myList}
                watchHistory={watchHistory}
                onToggleFavorite={toggleFavorite}
              />
            }
          />

          <Route
            path="/anime/:id/:eps"
            element={
              <AnimeWatchPage
                myList={myList}
                watchHistory={watchHistory}
                onToggleFavorite={toggleFavorite}
                onSaveHistory={handleSaveHistory}
              />
            }
          />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 py-8 bg-[#0e0e10] text-center text-xs text-white/40">
        <div className="max-w-[1520px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Otanime • Data provided by Otakudesu</p>
          <div className="flex items-center gap-5">
            <a
              href="/docs"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1 group"
            >
              <span>Documentation</span>
              <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
            </a>
            <a
              href="/openapi.json"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1 group"
            >
              <span>API Spec</span>
              <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
            </a>
            <button
              onClick={() => setShowStatusModal(true)}
              className="hover:text-white transition-colors flex items-center gap-1 focus:outline-none"
            >
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>Server Status</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Server Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => setShowStatusModal(false)} />
          <div className="relative w-full max-w-md bg-[#17171d] border border-white/10 rounded-2xl p-6 text-white z-10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>Status Server Otanime</span>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-between">
                <span className="text-white/60">API Backend</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Online (Hono & Bun)
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-between">
                <span className="text-white/60">Scraper Engine</span>
                <span className="font-semibold text-white/90">Cheerio / Otakudesu Core</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-between">
                <span className="text-white/60">Katalog Tersedia</span>
                <span className="font-semibold text-white/90">
                  {ongoingList.length} Ongoing • {completeList.length} Complete
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-between">
                <span className="text-white/60">OpenAPI Spec</span>
                <a
                  href="/openapi.json"
                  target="_blank"
                  rel="noreferrer"
                  className="text-rose-400 hover:underline font-medium"
                >
                  /openapi.json
                </a>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-between">
                <span className="text-white/60">Interactive Docs</span>
                <a
                  href="/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="text-rose-400 hover:underline font-medium"
                >
                  /docs (Redocly)
                </a>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setShowStatusModal(false)}
                className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-white/90 transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
