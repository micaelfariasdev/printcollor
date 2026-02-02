export const formatarReal = (valor: number | string) => {
  const numero = typeof valor === 'string' ? parseFloat(valor) : valor;

  if (isNaN(numero)) return "R$ 0,00";

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numero);
};