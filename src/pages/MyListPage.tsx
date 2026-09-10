import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AnimeItem } from '../types/anime';
import { AnimeCard } from '../components/AnimeCard';
import { Bookmark, Trash2 } from 'lucide-react';

interface MyListPageProps {
  myList: AnimeItem[];
  onRemoveItem: (slug: string) => void;
  onClearList: () => void;
}

export const MyListPage: React.FC<MyListPageProps> = ({
  myList,
  onRemoveItem,
  onClearList
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#121214] text-white selection:bg-white selection:text-black pt-24 sm:pt-28 pb-24">
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-2">
              <Bookmark className="w-3.5 h-3.5 fill-rose-500" />
              <span>Koleksi Pribadi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>My List</span>
              <span className="text-sm font-normal text-white/40">
                ({myList.length} anime tersimpan)
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-white/50 mt-1.5">
              Daftar anime favorit yang Anda simpan untuk ditonton nanti. Tersimpan aman di perangkat Anda.
            </p>
          </div>

          {myList.length > 0 && (
            <button
              onClick={onClearList}
              className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-300 border border-white/10 text-xs text-white/80 transition-colors flex items-center gap-2 self-start md:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Semua</span>
            </button>
          )}
        </div>

        {/* Anime Grid */}
        {myList.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
            {myList.map((anime) => (
              <div key={`mylist-${anime.slug}`} className="relative group/item flex flex-col">
                <AnimeCard
                  anime={anime}
                  onClick={() => navigate(`/anime/${anime.slug}`)}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveItem(anime.slug);
                  }}
                  className="mt-2 w-full py-1.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 hover:text-rose-400 border border-white/5 text-[11px] text-white/50 transition-colors flex items-center justify-center gap-1.5"
                  title="Hapus dari daftar"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Hapus</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/40">
              <Bookmark className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Daftar Anda Masih Kosong</h3>
              <p className="text-xs text-white/40 mt-1">
                Jelajahi anime dan klik tombol "Simpan" pada halaman detail untuk menambahkannya ke koleksi Anda.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                to="/"
                className="px-5 py-2.5 rounded-full bg-white text-black font-semibold text-xs hover:bg-white/90 transition-all shadow-lg shadow-black/40"
              >
                Jelajahi Beranda
              </Link>
              <Link
                to="/genres"
                className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 transition-colors"
              >
                Pilih Berdasarkan Genre
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
