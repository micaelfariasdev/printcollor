import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div 
      className={`animate-pulse bg-slate-200 rounded-lg ${className}`} 
    />
  );
};

export const CardSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" /> {/* Nome Cliente */}
              <Skeleton className="h-3 w-24" /> {/* ID/Data */}
            </div>
            <Skeleton className="h-6 w-20 rounded-full" /> {/* Status */}
          </div>
          
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-2xl" /> {/* Info 1 */}
            <Skeleton className="h-10 w-full rounded-2xl" /> {/* Info 2 */}
          </div>
          
          <div className="flex justify-between pt-4 border-t border-slate-50">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Adicione ao seu arquivo de Skeletons ou importe conforme sua estrutura
export const DashboardSkeleton = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar Simulada */}
      <aside className="w-64 bg-slate-900 flex flex-col p-6 space-y-6">
        <Skeleton className="h-10 w-3/4 bg-slate-800" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-12 w-full bg-slate-800 rounded-xl" />
          ))}
        </div>
      </aside>

      {/* Área de Conteúdo Simulada */}
      <main className="flex-1 p-8 space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" /> {/* Título Dashboard */}
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-8 w-64" /> {/* "Resumo do Mês" */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-28 w-full rounded-xl shadow-sm" />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-[2rem]" /> {/* Gráfico ou Tabela */}
        </div>
      </main>
    </div>
  );
};