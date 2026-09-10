import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { GenrePage } from './pages/GenrePage';
import { AnimeDetailPage } from './pages/AnimeDetailPage';
import { AnimeWatchPage } from './pages/AnimeWatchPage';
import { fetchHome, searchAnime } from './services/otakudesuApi';
import { AnimeItem, WatchHistoryItem, NavTab } from './types/anime';

const AppContent: React.FC = () => {
  const navigate = useNavigate();
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

  // My List (Local Storage Persistence)
  const [myList, setMyList] = useState<AnimeItem[]>(() => {
    try {
      const saved = localStorage.getItem('otakudesu_my_list');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Continue Watching History (Local Storage Persistence)
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('otakudesu_watch_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync active nav tab based on URL
  useEffect(() => {
    if (location.pathname.startsWith('/genres')) {
      setCurrentTab('genres');
    } else if (location.pathname === '/') {
      if (currentTab === 'genres') {
        setCurrentTab('home');
      }
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
      localStorage.setItem('otakudesu_my_list', JSON.stringify(myList));
    } catch (e) {
      console.error(e);
    }
  }, [myList]);

  // Sync Watch History to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('otakudesu_watch_history', JSON.stringify(watchHistory));
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

  const handleSaveHistory = (item: {
    anime_slug: string;
    anime_title: string;
    episode_slug: string;
    episode_title: string;
    thumb: string;
    progress: number;
  }) => {
    setWatchHistory((prev) => {
      const filtered = prev.filter((h) => h.anime_slug !== item.anime_slug);
      const newEntry: WatchHistoryItem = {
        ...item,
        updated_at: Date.now()
      };
      return [newEntry, ...filtered].slice(0, 20); // Keep latest 20
    });
  };

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
    if (tab === 'genres') {
      navigate('/genres');
    } else {
      if (location.pathname !== '/') {
        navigate('/');
      }
    }
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
      />

      {/* Main Content Body with Routes */}
      <main className="flex-1 w-full">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                currentTab={currentTab}
                ongoingList={ongoingList}
                completeList={completeList}
                watchHistory={watchHistory}
                myList={myList}
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
            path="/anime/:id"
            element={
              <AnimeDetailPage
                myList={myList}
                onToggleFavorite={toggleFavorite}
              />
            }
          />

          <Route
            path="/anime/:id/:eps"
            element={
              <AnimeWatchPage
                myList={myList}
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
          <div className="flex items-center gap-6">
            <span className="hover:text-white cursor-pointer transition-colors">Documentation</span>
            <span className="hover:text-white cursor-pointer transition-colors">API Spec</span>
            <span className="hover:text-white cursor-pointer transition-colors">Server Status</span>
          </div>
        </div>
      </footer>
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
