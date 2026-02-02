export const formatarDataHora = (isoString: string) => {
  if (!isoString) return "";
  
  const data = new Date(isoString);
  
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data);
};