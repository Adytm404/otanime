import React, { useState, useEffect } from 'react';
import { Search, Bell, ChevronDown, Menu, X, Globe } from 'lucide-react';
import { NavTab } from '../types/anime';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenSearch?: () => void;
  myListCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  myListCount
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState<'EN' | 'ID'>('EN');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems: { label: string; tab: NavTab }[] = [
    { label: 'Home', tab: 'home' },
    { label: 'My List', tab: 'my-list' },
    { label: 'Movie', tab: 'movie' },
    { label: 'New Season', tab: 'new-season' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#121214]/90 backdrop-blur-md shadow-lg shadow-black/40 py-3'
          : 'bg-gradient-to-b from-black/80 via-black/40 to-transparent py-4 sm:py-5'
      }`}
    >
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-3 sm:gap-6">
        {/* Left: Logo & Nav items */}
        <div className="flex items-center gap-6 lg:gap-8">
          {/* Swirl Logo */}
          <button
            onClick={() => onTabChange('home')}
            className="flex items-center gap-2.5 group focus:outline-none"
            aria-label="AnimeStream Home"
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
                {/* Spiral / Whirlpool icon matching the reference */}
                <circle cx="12" cy="12" r="9" strokeOpacity="0.4" />
                <path d="M12 3a9 9 0 0 1 9 9c0 4.5-3.5 8-8 8a6 6 0 0 1-6-6c0-3.3 2.7-5 5-5a3 3 0 0 1 3 3" />
                <circle cx="12" cy="12" r="1.5" fill="white" />
              </svg>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-7 text-sm font-medium">
            {navItems.map((item) => {
              const active = currentTab === item.tab;
              return (
                <button
                  key={item.tab}
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
                </button>
              );
            })}

            {/* Language Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-1 text-white/70 hover:text-white text-sm transition-colors py-1 focus:outline-none"
              >
                <span>Language</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {isLangOpen && (
                <div className="absolute top-full left-0 mt-2 w-32 bg-[#1b1b20] border border-white/10 rounded-xl shadow-2xl py-1 z-50 text-xs">
                  <button
                    onClick={() => { setSelectedLang('EN'); setIsLangOpen(false); }}
                    className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-white/10 transition-colors ${
                      selectedLang === 'EN' ? 'text-white font-semibold' : 'text-white/70'
                    }`}
                  >
                    <span>English</span>
                    {selectedLang === 'EN' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </button>
                  <button
                    onClick={() => { setSelectedLang('ID'); setIsLangOpen(false); }}
                    className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-white/10 transition-colors ${
                      selectedLang === 'ID' ? 'text-white font-semibold' : 'text-white/70'
                    }`}
                  >
                    <span>Indonesia</span>
                    {selectedLang === 'ID' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Right: Search, Notification, Profile */}
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

          {/* Notification Button */}
          <button
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/5 flex items-center justify-center text-white/80 hover:text-white transition-all duration-200 relative focus:outline-none"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5 ring-2 ring-[#121214]" />
          </button>

          {/* User Avatar matching screenshot */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full ring-2 ring-white/10 overflow-hidden bg-[#24242c] flex-shrink-0 cursor-pointer hover:ring-white/30 transition-all">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              alt="User Profile"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback cute anime avatar SVG
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
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
        <div className="md:hidden bg-[#16161b]/98 backdrop-blur-xl border-b border-white/10 px-6 py-4 space-y-3 animate-in fade-in slide-in-from-top-4 duration-200">
          {navItems.map((item) => {
            const active = currentTab === item.tab;
            return (
              <button
                key={item.tab}
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
              </button>
            );
          })}

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Language
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedLang('EN')}
                className={`px-2.5 py-1 rounded-md ${
                  selectedLang === 'EN' ? 'bg-white text-black font-bold' : 'bg-white/10 text-white'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setSelectedLang('ID')}
                className={`px-2.5 py-1 rounded-md ${
                  selectedLang === 'ID' ? 'bg-white text-black font-bold' : 'bg-white/10 text-white'
                }`}
              >
                ID
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
