// =====================================================
// SERVIÇO DE FAIXAS INSS
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { InssBracket } from '@/integrations/supabase/rh-types';
import { EntityService } from '@/services/generic/entityService';

export interface InssBracketFilters {
  ano_vigencia?: number;
  mes_vigencia?: number;
  ativo?: boolean;
  company_id?: string;
}

export interface InssBracketCreateData {
  company_id: string;
  codigo: string;
  descricao: string;
  ano_vigencia: number;
  mes_vigencia: number;
  valor_minimo: number;
  valor_maximo?: number;
  aliquota: number;
  valor_deducao?: number;
  ativo?: boolean;
}

export interface InssBracketUpdateData extends Partial<InssBracketCreateData> {
  id: string;
}

// =====================================================
// FUNÇÕES DE CRUD
// =====================================================

export async function getInssBrackets(
  companyId: string,
  filters: InssBracketFilters = {}
): Promise<{ data: InssBracket[]; totalCount: number }> {
  try {
    const result = await EntityService.list<InssBracket>({
      schema: 'rh',
      table: 'inss_brackets',
      companyId,
      filters,
      orderBy: 'ano_vigencia',
      orderDirection: 'DESC'
    });

    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro no serviço de faixas INSS:', error);
    throw error;
  }
}

export async function getInssBracketById(
  id: string,
  companyId: string
): Promise<InssBracket | null> {
  try {
    return await EntityService.getById<InssBracket>('rh', 'inss_brackets', id, companyId);
  } catch (error) {
    console.error('Erro no serviço de faixa INSS:', error);
    throw error;
  }
}

export async function createInssBracket(
  bracketData: InssBracketCreateData
): Promise<InssBracket> {
  try {
    return await EntityService.create<InssBracket>('rh', 'inss_brackets', bracketData);
  } catch (error) {
    console.error('Erro no serviço de criação de faixa INSS:', error);
    throw error;
  }
}

export async function updateInssBracket(
  bracketData: InssBracketUpdateData
): Promise<InssBracket> {
  try {
    const { id, ...updateData } = bracketData;
    return await EntityService.update<InssBracket>('rh', 'inss_brackets', id, updateData);
  } catch (error) {
    console.error('Erro no serviço de atualização de faixa INSS:', error);
    throw error;
  }
}

export async function deleteInssBracket(
  id: string,
  companyId: string
): Promise<void> {
  try {
    await EntityService.delete('rh', 'inss_brackets', id);
  } catch (error) {
    console.error('Erro no serviço de exclusão de faixa INSS:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

export async function getActiveInssBrackets(
  companyId: string,
  anoVigencia?: number,
  mesVigencia?: number
): Promise<InssBracket[]> {
  try {
    const filters: any = { ativo: true };
    
    if (anoVigencia) {
      filters.ano_vigencia = anoVigencia;
    }
    
    if (mesVigencia) {
      filters.mes_vigencia = mesVigencia;
    }

    const result = await EntityService.list<InssBracket>({
      schema: 'rh',
      table: 'inss_brackets',
      companyId,
      filters,
      orderBy: 'valor_minimo',
      orderDirection: 'ASC'
    });

    return result.data;
  } catch (error) {
    console.error('Erro no serviço de faixas INSS ativas:', error);
    throw error;
  }
}

export async function getCurrentInssBrackets(companyId: string): Promise<InssBracket[]> {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    return await getActiveInssBrackets(companyId, currentYear, currentMonth);
  } catch (error) {
    console.error('Erro no serviço de faixas INSS atuais:', error);
    throw error;
  }
}

export async function getInssBracketsByPeriod(
  companyId: string,
  anoVigencia: number,
  mesVigencia: number
): Promise<InssBracket[]> {
  try {
    return await getActiveInssBrackets(companyId, anoVigencia, mesVigencia);
  } catch (error) {
    console.error('Erro no serviço de faixas INSS por período:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES DE CÁLCULO
// =====================================================

export function calculateInssValue(salary: number, brackets: InssBracket[]): {
  valor: number;
  aliquota: number;
  faixa: InssBracket | null;
  base_calculo: number;
} {
  // Ordenar faixas por valor mínimo
  const sortedBrackets = brackets.sort((a, b) => a.valor_minimo - b.valor_minimo);
  
  for (const bracket of sortedBrackets) {
    if (salary >= bracket.valor_minimo && (bracket.valor_maximo === null || salary <= bracket.valor_maximo)) {
      const valorInss = salary * bracket.aliquota - bracket.valor_deducao;
      
      return {
        valor: Math.max(0, valorInss), // Não pode ser negativo
        aliquota: bracket.aliquota,
        faixa: bracket,
        base_calculo: salary,
      };
    }
  }
  
  return {
    valor: 0,
    aliquota: 0,
    faixa: null,
    base_calculo: salary,
  };
}

export function getInssBracketBySalary(salary: number, brackets: InssBracket[]): InssBracket | null {
  const sortedBrackets = brackets.sort((a, b) => a.valor_minimo - b.valor_minimo);
  
  for (const bracket of sortedBrackets) {
    if (salary >= bracket.valor_minimo && (bracket.valor_maximo === null || salary <= bracket.valor_maximo)) {
      return bracket;
    }
  }
  
  return null;
}

// =====================================================
// UTILITÁRIOS
// =====================================================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatTaxRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

export function formatDate(year: number, month: number): string {
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  return `${monthNames[month - 1]} ${year}`;
}

export function validateInssBracketData(data: InssBracketCreateData): string[] {
  const errors: string[] = [];

  if (!data.codigo?.trim()) {
    errors.push('Código é obrigatório');
  }

  if (!data.descricao?.trim()) {
    errors.push('Descrição é obrigatória');
  }

  if (!data.ano_vigencia || data.ano_vigencia < 2020 || data.ano_vigencia > 2030) {
    errors.push('Ano de vigência deve estar entre 2020 e 2030');
  }

  if (!data.mes_vigencia || data.mes_vigencia < 1 || data.mes_vigencia > 12) {
    errors.push('Mês de vigência deve estar entre 1 e 12');
  }

  if (data.valor_minimo < 0) {
    errors.push('Valor mínimo não pode ser negativo');
  }

  if (data.valor_maximo !== undefined && data.valor_maximo < data.valor_minimo) {
    errors.push('Valor máximo deve ser maior que o valor mínimo');
  }

  if (data.aliquota < 0 || data.aliquota > 1) {
    errors.push('Alíquota deve estar entre 0 e 100%');
  }

  if (data.valor_deducao !== undefined && data.valor_deducao < 0) {
    errors.push('Valor de dedução não pode ser negativo');
  }

  return errors;
}

export function getDefaultInssBrackets2024(): InssBracketCreateData[] {
  return [
    {
      codigo: 'INSS_FAIXA_1',
      descricao: '1ª Faixa - Até R$ 1.412,00',
      ano_vigencia: 2024,
      mes_vigencia: 1,
      valor_minimo: 0,
      valor_maximo: 1412.00,
      aliquota: 0.075, // 7.5%
      valor_deducao: 0,
      ativo: true,
    },
    {
      codigo: 'INSS_FAIXA_2',
      descricao: '2ª Faixa - De R$ 1.412,01 até R$ 2.666,68',
      ano_vigencia: 2024,
      mes_vigencia: 1,
      valor_minimo: 1412.01,
      valor_maximo: 2666.68,
      aliquota: 0.09, // 9%
      valor_deducao: 21.18,
      ativo: true,
    },
    {
      codigo: 'INSS_FAIXA_3',
      descricao: '3ª Faixa - De R$ 2.666,69 até R$ 4.000,03',
      ano_vigencia: 2024,
      mes_vigencia: 1,
      valor_minimo: 2666.69,
      valor_maximo: 4000.03,
      aliquota: 0.12, // 12%
      valor_deducao: 101.18,
      ativo: true,
    },
    {
      codigo: 'INSS_FAIXA_4',
      descricao: '4ª Faixa - De R$ 4.000,04 até R$ 7.786,02',
      ano_vigencia: 2024,
      mes_vigencia: 1,
      valor_minimo: 4000.04,
      valor_maximo: 7786.02,
      aliquota: 0.14, // 14%
      valor_deducao: 181.18,
      ativo: true,
    },
  ];
}
