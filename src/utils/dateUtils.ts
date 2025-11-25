/**
 * Utilitários para formatação de datas
 * Corrige problema de timezone que faz datas aparecerem um dia antes
 */

/**
 * Formata uma data string (YYYY-MM-DD) para exibição em pt-BR
 * Trata a data como local, evitando problemas de timezone
 */
export function formatDateString(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  
  // Se for string no formato YYYY-MM-DD, tratar como data local
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  
  // Para outros formatos, usar conversão padrão
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formata uma data (Date object ou string) para exibição
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  if (typeof date === 'string') {
    return formatDateString(date);
  }
  
  if (date instanceof Date) {
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  
  return '-';
}

