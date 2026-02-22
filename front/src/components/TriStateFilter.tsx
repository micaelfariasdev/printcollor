export const TriStateFilter = ({ label, state, onClick }: any) => {
  const configs: any = {
    todos: { bg: 'bg-slate-100 text-slate-500', icon: '⚪' },
    sim: { bg: 'bg-green-500 text-white', icon: '✅' },
    nao: { bg: 'bg-red-500 text-white', icon: '❌' },
  };

  return (
    <button
      onClick={onClick}
      className={`${configs[state].bg} px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 shadow-sm active:scale-95`}
    >
      <span>{configs[state].icon}</span>
      {label}: {state.toUpperCase()}
    </button>
  );
};