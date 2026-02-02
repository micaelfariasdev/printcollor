import { theme } from "./Theme";

export const FilterToggle = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border transition-all shadow-sm ${
      active
        ? `${theme.colors.sidebarActive} text-white border-transparent`
        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
    }`}
  >
    {label}
  </button>
);
