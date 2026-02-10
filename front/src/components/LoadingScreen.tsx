import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingScreen = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = () => setVisible(true);
    const hide = () => setVisible(false);

    document.addEventListener('SHOW_LOADING', show);
    document.addEventListener('HIDE_LOADING', hide);

    return () => {
      document.removeEventListener('SHOW_LOADING', show);
      document.removeEventListener('HIDE_LOADING', hide);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-white/60 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <span className="text-xs font-black text-slate-500 uppercase tracking-widest italic">
          Processando...
        </span>
      </div>
    </div>
  );
};