import { supabase } from '@/integrations/supabase/client';
import { IrrfBracket } from '@/integrations/supabase/rh-types';
import { EntityService } from '@/services/generic/entityService';

export interface IrrfBracketFilters {
  ano_vigencia?: number;
  mes_vigencia?: number;
  ativo?: boolean;
  // Add other filterable fields here
}

export type IrrfBracketCreateData = Omit<IrrfBracket, 'id' | 'created_at' | 'updated_at'>;
export type IrrfBracketUpdateData = Partial<IrrfBracket> & { id: string };

// =====================================================
// FUNÇÕES DE CRUD
// =====================================================

export async function getIrrfBrackets(
  companyId: string,
  filters: IrrfBracketFilters = {}
): Promise<{ data: IrrfBracket[]; totalCount: number }> {
  try {
    const result = await EntityService.list<IrrfBracket>({
      schema: 'rh',
      table: 'irrf_brackets',
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
    console.error('Erro no serviço de faixas IRRF:', error);
    throw error;
  }
}

export async function getIrrfBracketById(
  companyId: string,
  id: string
): Promise<IrrfBracket | null> {
  try {
    const result = await EntityService.getById<IrrfBracket>({
      schema: 'rh',
      table: 'irrf_brackets',
      companyId,
      id
    });

    return result;
  } catch (error) {
    console.error('Erro ao buscar faixa IRRF por ID:', error);
    throw error;
  }
}

export async function createIrrfBracket(
  companyId: string,
  data: IrrfBracketCreateData
): Promise<IrrfBracket> {
  try {
    const result = await EntityService.create<IrrfBracket>({
      schema: 'rh',
      table: 'irrf_brackets',
      companyId,
      data: { ...data, company_id: companyId }
    });

    return result;
  } catch (error) {
    console.error('Erro ao criar faixa IRRF:', error);
    throw error;
  }
}

export async function updateIrrfBracket(
  companyId: string,
  data: IrrfBracketUpdateData
): Promise<IrrfBracket> {
  try {
    const result = await EntityService.update<IrrfBracket>({
      schema: 'rh',
      table: 'irrf_brackets',
      companyId,
      id: data.id,
      data
    });

    return result;
  } catch (error) {
    console.error('Erro ao atualizar faixa IRRF:', error);
    throw error;
  }
}

export async function deleteIrrfBracket(
  companyId: string,
  id: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: 'rh',
      table: 'irrf_brackets',
      companyId,
      id
    });
  } catch (error) {
    console.error('Erro ao excluir faixa IRRF:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

export async function getActiveIrrfBrackets(
  companyId: string,
  anoVigencia?: number,
  mesVigencia?: number
): Promise<IrrfBracket[]> {
  try {
    const filters: IrrfBracketFilters = { ativo: true };
    
    if (anoVigencia) filters.ano_vigencia = anoVigencia;
    if (mesVigencia) filters.mes_vigencia = mesVigencia;

    const result = await getIrrfBrackets(companyId, filters);
    return result.data;
  } catch (error) {
    console.error('Erro no serviço de faixas IRRF ativas:', error);
    throw error;
  }
}

export async function getCurrentIrrfBrackets(companyId: string): Promise<IrrfBracket[]> {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    return await getActiveIrrfBrackets(companyId, currentYear, currentMonth);
  } catch (error) {
    console.error('Erro no serviço de faixas IRRF atuais:', error);
    throw error;
  }
}

export async function getIrrfBracketsByPeriod(
  companyId: string,
  anoVigencia: number,
  mesVigencia: number
): Promise<IrrfBracket[]> {
  try {
    return await getActiveIrrfBrackets(companyId, anoVigencia, mesVigencia);
  } catch (error) {
    console.error('Erro no serviço de faixas IRRF por período:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES DE CÁLCULO
// =====================================================

export function calculateIrrf(
  baseSalary: number,
  dependents: number = 0,
  deductions: number = 0,
  brackets: IrrfBracket[]
): { 
  baseCalculation: number;
  irrf: number;
  aliquot: number;
  deduction: number;
  bracket: IrrfBracket | null;
} {
  // Base de cálculo = Salário - Dependentes - Deduções
  const baseCalculation = Math.max(0, baseSalary - (dependents * 189.59) - deductions);
  
  // Encontrar a faixa aplicável
  const bracket = brackets.find(b => 
    baseCalculation >= b.valor_minimo && 
    baseCalculation <= b.valor_maximo
  );

  if (!bracket) {
    return {
      baseCalculation,
      irrf: 0,
      aliquot: 0,
      deduction: 0,
      bracket: null
    };
  }

  // IRRF = (Base de Cálculo × Alíquota) - Dedução
  const irrf = Math.max(0, (baseCalculation * bracket.aliquota) - bracket.valor_deducao);

  return {
    baseCalculation,
    irrf,
    aliquot: bracket.aliquota,
    deduction: bracket.valor_deducao,
    bracket
  };
}

// =====================================================
// FUNÇÕES DE FORMATAÇÃO
// =====================================================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function formatTaxRate(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR').format(dateObj);
}

// =====================================================
// FUNÇÕES DE VALIDAÇÃO
// =====================================================

export function validateIrrfBracket(data: IrrfBracketCreateData): string[] {
  const errors: string[] = [];

  if (!data.codigo?.trim()) {
    errors.push('Código é obrigatório');
  }

  if (!data.descricao?.trim()) {
    errors.push('Descrição é obrigatória');
  }

  if (data.valor_minimo === undefined || data.valor_minimo < 0) {
    errors.push('Valor mínimo deve ser maior ou igual a zero');
  }

  if (data.valor_maximo === undefined || data.valor_maximo <= 0) {
    errors.push('Valor máximo deve ser maior que zero');
  }

  if (data.valor_minimo !== undefined && data.valor_maximo !== undefined && data.valor_minimo >= data.valor_maximo) {
    errors.push('Valor mínimo deve ser menor que o valor máximo');
  }

  if (data.aliquota === undefined || data.aliquota < 0 || data.aliquota > 1) {
    errors.push('Alíquota deve estar entre 0 e 1 (0% a 100%)');
  }

  if (data.valor_deducao === undefined || data.valor_deducao < 0) {
    errors.push('Valor de dedução deve ser maior ou igual a zero');
  }

  if (!data.ano_vigencia || data.ano_vigencia < 2000 || data.ano_vigencia > 2100) {
    errors.push('Ano de vigência deve estar entre 2000 e 2100');
  }

  if (!data.mes_vigencia || data.mes_vigencia < 1 || data.mes_vigencia > 12) {
    errors.push('Mês de vigência deve estar entre 1 e 12');
  }

  return errors;
}
