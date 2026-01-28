/**
 * Formata horário com data - sempre mostra a data quando disponível
 * 
 * @param timeString - Horário no formato HH:MM:SS ou HH:MM
 * @param dateString - Data real da marcação (formato YYYY-MM-DD)
 * @param baseDate - Data base do registro (formato YYYY-MM-DD)
 * @returns String formatada como "HH:MM (DD/MM)" quando há data disponível, ou apenas "HH:MM" se não houver data
 */
export function formatTimeWithDate(
  timeString?: string,
  dateString?: string,
  baseDate?: string
): string {
  if (!timeString) return '--:--';
  
  const time = timeString.substring(0, 5); // Extrair apenas HH:MM
  
  // Determinar qual data usar
  let dateToUse: string | undefined;
  if (dateString) {
    // Se tem data específica da marcação, usar ela
    dateToUse = dateString;
  } else if (baseDate) {
    // Se não tem data específica, usar a data base
    dateToUse = baseDate;
  } else {
    // Se não tem nenhuma data, retornar apenas o horário
    return time;
  }
  
  // SEMPRE mostrar a data quando disponível (removida a condição que ocultava quando igual à base)
  
  // Formatar data manualmente para evitar problemas de timezone
  // Espera-se que dateToUse esteja no formato 'YYYY-MM-DD'
  const [year, month, day] = dateToUse.split('-');
  if (!year || !month || !day) {
    // Se o formato for inesperado, retorna apenas o horário
    return time;
  }
  const formattedDate = `${day.padStart(2, '0')}/${month.padStart(2, '0')}`;
  
  return `${time} (${formattedDate})`;
}
