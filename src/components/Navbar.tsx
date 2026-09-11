import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, X, Sparkles, Play } from 'lucide-react';
import { AnimeItem, NavTab } from '../types/anime';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  myListCount: number;
  latestReleases?: AnimeItem[];
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  myListCount,
  latestReleases = []
}) => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Take maximum 5 new anime releases
  const recentAnime = latestReleases.slice(0, 5);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const shouldScroll = window.scrollY > 40;
          setIsScrolled((prev) => (prev !== shouldScroll ? shouldScroll : prev));
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotifOpen]);

  const navItems: { label: string; tab: NavTab; path: string }[] = [
    { label: 'Home', tab: 'home', path: '/' },
    { label: 'Genres', tab: 'genres', path: '/genres' },
    { label: 'My List', tab: 'my-list', path: '/my-list' },
    { label: 'New Season', tab: 'new-season', path: '/new-season' },
  ];

  const handleNotifClick = (slug: string) => {
    setIsNotifOpen(false);
    navigate(`/anime/${slug}`);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-colors duration-200 py-3 sm:py-4 ${
        isScrolled
          ? 'bg-[#121214]/95 shadow-lg shadow-black/40'
          : 'bg-gradient-to-b from-black/80 via-black/30 to-transparent'
      }`}
    >
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-3 sm:gap-6">
        {/* Left: Logo & Nav items */}
        <div className="flex items-center gap-6 lg:gap-8">
          {/* Swirl Logo & Brand Name */}
          <Link
            to="/"
            onClick={() => onTabChange('home')}
            className="flex items-center gap-2.5 group focus:outline-none"
            aria-label="Otanime Home"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 flex items-center justify-center p-1.5 transition-transform duration-300 group-hover:scale-105">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-full h-full text-white"
              >
                <circle cx="12" cy="12" r="9" strokeOpacity="0.4" />
                <path d="M12 3a9 9 0 0 1 9 9c0 4.5-3.5 8-8 8a6 6 0 0 1-6-6c0-3.3 2.7-5 5-5a3 3 0 0 1 3 3" />
                <circle cx="12" cy="12" r="1.5" fill="white" />
              </svg>
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-white group-hover:text-rose-400 transition-colors">
              Otanime
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-7 text-sm font-medium">
            {navItems.map((item) => {
              const active = currentTab === item.tab;
              return (
                <Link
                  key={item.tab}
                  to={item.path}
                  onClick={() => onTabChange(item.tab)}
                  className={`relative transition-colors duration-200 ${
                    active
                      ? 'text-white font-semibold'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {item.label}
                  {item.tab === 'my-list' && myListCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-rose-500/80 rounded-full font-bold">
                      {myListCount}
                    </span>
                  )}
                  {active && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white rounded-full transition-all" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Search & Notifications */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Search Pill Input */}
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Search here ..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-36 sm:w-56 md:w-64 lg:w-72 bg-white/[0.08] hover:bg-white/[0.12] focus:bg-white/[0.15] text-white text-xs sm:text-sm pl-4 pr-9 py-2 sm:py-2.5 rounded-full border border-white/5 focus:border-white/20 placeholder-white/40 outline-none transition-all duration-200"
            />
            <Search className="w-4 h-4 text-white/50 absolute right-3 pointer-events-none" />
          </div>

          {/* Notification Button & Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center transition-all duration-200 relative focus:outline-none ${
                isNotifOpen
                  ? 'bg-rose-600 text-white border-rose-500'
                  : 'bg-white/[0.08] hover:bg-white/[0.16] border-white/5 text-white/80 hover:text-white'
              }`}
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {recentAnime.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5 ring-2 ring-[#121214]" />
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#18181f] border border-white/10 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden z-50 text-white animate-in fade-in zoom-in-95 duration-200">
                <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-rose-400" />
                    <span className="font-bold text-xs sm:text-sm">Anime Rilis Terbaru</span>
                  </div>
                  <span className="text-[11px] text-rose-400 font-semibold bg-rose-500/15 px-2 py-0.5 rounded-full">
                    {recentAnime.length} Episode Baru
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                  {recentAnime.length > 0 ? (
                    recentAnime.map((anime) => (
                      <div
                        key={`notif-${anime.slug}`}
                        onClick={() => handleNotifClick(anime.slug)}
                        className="p-3 hover:bg-white/[0.06] transition-colors cursor-pointer flex items-center gap-3 group"
                      >
                        {/* Thumbnail */}
                        <div className="relative w-12 aspect-[2/3] rounded-lg overflow-hidden bg-black/50 flex-shrink-0">
                          <img
                            src={anime.thumb}
                            alt={anime.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center">
                            <Play className="w-3 h-3 fill-white text-white" />
                          </div>
                        </div>

                        {/* Text info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-semibold text-white/90 group-hover:text-white truncate">
                            {anime.title}
                          </h4>
                          <p className="text-[11px] text-rose-400 font-medium mt-0.5">
                            {anime.current_episode || 'Episode Baru'}
                          </p>
                          {anime.release_day && (
                            <span className="text-[10px] text-white/40 block mt-0.5">
                              Rilis: {anime.release_day} {anime.release_date ? `• ${anime.release_date}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-white/40">
                      Belum ada episode anime terbaru saat ini.
                    </div>
                  )}
                </div>

                {recentAnime.length > 0 && (
                  <div className="p-2.5 bg-black/30 border-t border-white/5 text-center">
                    <button
                      onClick={() => {
                        setIsNotifOpen(false);
                        onTabChange('new-season');
                      }}
                      className="text-xs text-white/60 hover:text-white font-medium transition-colors"
                    >
                      Lihat Semua Anime Ongoing →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:text-white focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#16161b] border-b border-white/10 px-6 py-4 space-y-3 animate-in fade-in slide-in-from-top-4 duration-200 shadow-2xl">
          {navItems.map((item) => {
            const active = currentTab === item.tab;
            return (
              <Link
                key={item.tab}
                to={item.path}
                onClick={() => {
                  onTabChange(item.tab);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                  active
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {item.tab === 'my-list' && myListCount > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-rose-500/80 rounded-full font-bold">
                    {myListCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};
