import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

interface AgeGateModalProps {
  title?: string;
  /** Replaces the default "<title> bergenre Ecchi ..." sentence */
  description?: string;
  onConfirm: () => void;
  /** Defaults to navigating back (or home when there is no history) */
  onCancel?: () => void;
}

export const AgeGateModal: React.FC<AgeGateModalProps> = ({ title, description, onConfirm, onCancel }) => {
  const navigate = useNavigate();

  const goBack = () => {
    if (onCancel) return onCancel();
    if (window.history.length > 1) navigate(-1);
    else navigate('/', { replace: true });
  };

  // Lock page scroll while the gate is shown; Esc counts as "Tidak"
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') goBack();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-[#17171d] border border-white/10 rounded-2xl p-6 text-white shadow-2xl space-y-5 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="w-11 h-11 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <span className="px-2.5 py-1 rounded-full bg-rose-500 text-white text-xs font-bold tracking-wide">18+</span>
        </div>

        <div className="space-y-2">
          <h2 id="age-gate-title" className="text-lg font-bold">Konten Dewasa (18+)</h2>
          <p className="text-xs sm:text-sm text-white/60 leading-relaxed">
            {description ?? (
              <>
                {title ? <span className="font-semibold text-white/90">{title}</span> : 'Anime ini'} bergenre Ecchi dan
                mengandung konten yang hanya cocok untuk penonton berusia 18 tahun ke atas.
              </>
            )}{' '}
            Apakah Anda sudah berusia 18 tahun?
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={goBack}
            className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white/80 font-semibold text-xs transition-colors"
          >
            Tidak, kembali
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className="flex-1 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-white/90 transition-all"
          >
            Ya, saya 18+
          </button>
        </div>
      </div>
    </div>
  );
};
