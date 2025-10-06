import { supabase } from '@/integrations/supabase/client';
import { FgtsConfig } from '@/integrations/supabase/rh-types';
import { EntityService } from '@/services/generic/entityService';

export interface FgtsConfigFilters {
  ano_vigencia?: number;
  mes_vigencia?: number;
  ativo?: boolean;
  // Add other filterable fields here
}

export type FgtsConfigCreateData = Omit<FgtsConfig, 'id' | 'created_at' | 'updated_at'>;
export type FgtsConfigUpdateData = Partial<FgtsConfig> & { id: string };

// =====================================================
// FUNÇÕES DE CRUD
// =====================================================

export async function getFgtsConfigs(
  companyId: string,
  filters: FgtsConfigFilters = {}
): Promise<{ data: FgtsConfig[]; totalCount: number }> {
  try {
    const result = await EntityService.list<FgtsConfig>({
      schema: 'rh',
      table: 'fgts_config',
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
    console.error('Erro no serviço de configurações FGTS:', error);
    throw error;
  }
}

export async function getFgtsConfigById(
  companyId: string,
  id: string
): Promise<FgtsConfig | null> {
  try {
    const result = await EntityService.getById<FgtsConfig>({
      schema: 'rh',
      table: 'fgts_config',
      companyId,
      id
    });

    return result;
  } catch (error) {
    console.error('Erro ao buscar configuração FGTS por ID:', error);
    throw error;
  }
}

export async function createFgtsConfig(
  companyId: string,
  data: FgtsConfigCreateData
): Promise<FgtsConfig> {
  try {
    const result = await EntityService.create<FgtsConfig>({
      schema: 'rh',
      table: 'fgts_config',
      companyId,
      data: { ...data, company_id: companyId }
    });

    return result;
  } catch (error) {
    console.error('Erro ao criar configuração FGTS:', error);
    throw error;
  }
}

export async function updateFgtsConfig(
  companyId: string,
  data: FgtsConfigUpdateData
): Promise<FgtsConfig> {
  try {
    const result = await EntityService.update<FgtsConfig>({
      schema: 'rh',
      table: 'fgts_config',
      companyId,
      id: data.id,
      data
    });

    return result;
  } catch (error) {
    console.error('Erro ao atualizar configuração FGTS:', error);
    throw error;
  }
}

export async function deleteFgtsConfig(
  companyId: string,
  id: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: 'rh',
      table: 'fgts_config',
      companyId,
      id
    });
  } catch (error) {
    console.error('Erro ao excluir configuração FGTS:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

export async function getActiveFgtsConfigs(
  companyId: string,
  anoVigencia?: number,
  mesVigencia?: number
): Promise<FgtsConfig[]> {
  try {
    const filters: FgtsConfigFilters = { ativo: true };
    
    if (anoVigencia) filters.ano_vigencia = anoVigencia;
    if (mesVigencia) filters.mes_vigencia = mesVigencia;

    const result = await getFgtsConfigs(companyId, filters);
    return result.data;
  } catch (error) {
    console.error('Erro no serviço de configurações FGTS ativas:', error);
    throw error;
  }
}

export async function getCurrentFgtsConfig(companyId: string): Promise<FgtsConfig | null> {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const configs = await getActiveFgtsConfigs(companyId, currentYear, currentMonth);
    return configs.length > 0 ? configs[0] : null;
  } catch (error) {
    console.error('Erro no serviço de configuração FGTS atual:', error);
    throw error;
  }
}

export async function getFgtsConfigByPeriod(
  companyId: string,
  anoVigencia: number,
  mesVigencia: number
): Promise<FgtsConfig | null> {
  try {
    const configs = await getActiveFgtsConfigs(companyId, anoVigencia, mesVigencia);
    return configs.length > 0 ? configs[0] : null;
  } catch (error) {
    console.error('Erro no serviço de configuração FGTS por período:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES DE CÁLCULO
// =====================================================

export function calculateFgts(
  baseSalary: number,
  config: FgtsConfig
): { 
  baseCalculation: number;
  fgts: number;
  aliquot: number;
  multa: number;
  juros: number;
} {
  // Base de cálculo FGTS = Salário Base (sem deduções)
  const baseCalculation = baseSalary;
  
  // FGTS = Base de Cálculo × Alíquota FGTS
  const fgts = baseCalculation * config.aliquota_fgts;
  
  // Multa = FGTS × Alíquota de Multa
  const multa = fgts * (config.aliquota_multa || 0);
  
  // Juros = FGTS × Alíquota de Juros
  const juros = fgts * (config.aliquota_juros || 0);

  return {
    baseCalculation,
    fgts,
    aliquot: config.aliquota_fgts,
    multa,
    juros
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

export function formatPercent(value: number): string {
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

export function validateFgtsConfig(data: FgtsConfigCreateData): string[] {
  const errors: string[] = [];

  if (!data.codigo?.trim()) {
    errors.push('Código é obrigatório');
  }

  if (!data.descricao?.trim()) {
    errors.push('Descrição é obrigatória');
  }

  if (data.aliquota_fgts === undefined || data.aliquota_fgts < 0 || data.aliquota_fgts > 1) {
    errors.push('Alíquota FGTS deve estar entre 0 e 1 (0% a 100%)');
  }

  if (data.aliquota_multa !== undefined && (data.aliquota_multa < 0 || data.aliquota_multa > 1)) {
    errors.push('Alíquota de multa deve estar entre 0 e 1 (0% a 100%)');
  }

  if (data.aliquota_juros !== undefined && (data.aliquota_juros < 0 || data.aliquota_juros > 1)) {
    errors.push('Alíquota de juros deve estar entre 0 e 1 (0% a 100%)');
  }

  if (data.multa_rescisao !== undefined && (data.multa_rescisao < 0 || data.multa_rescisao > 1)) {
    errors.push('Multa de rescisão deve estar entre 0 e 1 (0% a 100%)');
  }

  if (!data.ano_vigencia || data.ano_vigencia < 2000 || data.ano_vigencia > 2100) {
    errors.push('Ano de vigência deve estar entre 2000 e 2100');
  }

  if (!data.mes_vigencia || data.mes_vigencia < 1 || data.mes_vigencia > 12) {
    errors.push('Mês de vigência deve estar entre 1 e 12');
  }

  return errors;
}
