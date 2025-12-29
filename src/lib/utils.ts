import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata uma data no formato ISO (YYYY-MM-DD) para o formato brasileiro (DD/MM/YYYY)
 * sem problemas de timezone, extraindo diretamente da string
 * 
 * Esta função evita problemas de conversão de timezone ao extrair diretamente
 * a parte da data (YYYY-MM-DD) da string, sem passar pelo construtor Date
 * que interpreta datas como UTC.
 */
export function formatDateOnly(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  
  // Extrair a parte da data (YYYY-MM-DD) da string, mesmo se houver timezone
  // Isso funciona para formatos como:
  // - "2025-11-01"
  // - "2025-11-01T00:00:00"
  // - "2025-11-01T00:00:00.000Z"
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  
  // Fallback: se não conseguir extrair, tentar com Date (caso raro)
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    // Usar getFullYear, getMonth, getDate que retornam valores locais
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '-';
  }
}

/**
 * Formata um valor numérico como moeda brasileira (R$)
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}