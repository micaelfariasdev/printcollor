export type GradeItem = [string, string | number];

const ORDEM_TAMANHOS: Record<string, number> = {
  pp: 1, p: 2, m: 3, g: 4, gg: 5, xgg: 6, xxgg: 7,
  'bl pp': 10, 'bl p': 11, 'bl m': 12, 'bl g': 13, 'bl gg': 14, 'bl xgg': 15, 'bl xxgg': 16,
  '02': 20, '04': 21, '06': 22, '08': 23, '10': 24, '12': 25, '14': 26, '16': 27,
  '2a': 20, '4a': 21, '6a': 22, '8a': 23, '10a': 24, '12a': 25, '14a': 26, '16a': 27,
};

const ordenarGrade = ([a]: GradeItem, [b]: GradeItem) =>
  (ORDEM_TAMANHOS[a.toLowerCase()] ?? 99) - (ORDEM_TAMANHOS[b.toLowerCase()] ?? 99);

export function separarGrade(detalhes: Record<string, string | number> = {}) {
  const tamanhos = Object.entries(detalhes) as GradeItem[];
  const gradeBL = tamanhos.filter(([tamanho]) => tamanho.toLowerCase().startsWith('bl')).sort(ordenarGrade);
  const gradeInfantil = tamanhos
    .filter(([tamanho]) => !tamanho.toLowerCase().startsWith('bl') && /^\d{1,2}(a)?$/.test(tamanho.toLowerCase()) && Number.parseInt(tamanho, 10) <= 16)
    .sort(ordenarGrade);
  const gradeAdulto = tamanhos
    .filter(([tamanho]) => !tamanho.toLowerCase().startsWith('bl') && !/^\d{1,2}(a)?$/.test(tamanho.toLowerCase()) && tamanho.toLowerCase() !== 'quantidade')
    .sort(ordenarGrade);

  return { gradeAdulto, gradeBL, gradeInfantil };
}
