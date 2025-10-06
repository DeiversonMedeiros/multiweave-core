// =====================================================
// SERVIÇO DE RUBRICAS (RUBRICAS DE FOLHA)
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { Rubrica } from '@/integrations/supabase/rh-types';
import { EntityService } from '@/services/generic/entityService';

export interface RubricaFilters {
  tipo?: string;
  categoria?: string;
  natureza?: string;
  ativo?: boolean;
  company_id?: string;
}

export interface RubricaCreateData {
  company_id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  tipo: 'provento' | 'desconto' | 'base_calculo' | 'informacao';
  categoria?: string;
  natureza?: 'normal' | 'eventual' | 'fixo' | 'variavel';
  calculo_automatico?: boolean;
  formula_calculo?: string;
  valor_fixo?: number;
  percentual?: number;
  base_calculo?: string;
  incidencia_ir?: boolean;
  incidencia_inss?: boolean;
  incidencia_fgts?: boolean;
  incidencia_contribuicao_sindical?: boolean;
  ordem_exibicao?: number;
  obrigatorio?: boolean;
  ativo?: boolean;
}

export interface RubricaUpdateData extends Partial<RubricaCreateData> {
  id: string;
}

// =====================================================
// FUNÇÕES DE CRUD
// =====================================================

export async function getRubricas(
  companyId: string,
  filters: RubricaFilters = {}
): Promise<{ data: Rubrica[]; totalCount: number }> {
  try {
    const result = await EntityService.list<Rubrica>({
      schema: 'rh',
      table: 'rubricas',
      companyId,
      filters,
      orderBy: 'ordem_exibicao',
      orderDirection: 'ASC'
    });

    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro no serviço de rubricas:', error);
    throw error;
  }
}

export async function getRubricaById(
  id: string,
  companyId: string
): Promise<Rubrica | null> {
  try {
    return await EntityService.getById<Rubrica>({
      schema: 'rh',
      table: 'rubricas',
      companyId,
      id
    });
  } catch (error) {
    console.error('Erro no serviço de rubrica:', error);
    throw error;
  }
}

export async function createRubrica(
  rubricaData: RubricaCreateData
): Promise<Rubrica> {
  try {
    return await EntityService.create<Rubrica>({
      schema: 'rh',
      table: 'rubricas',
      companyId: rubricaData.company_id,
      data: rubricaData
    });
  } catch (error) {
    console.error('Erro no serviço de criação de rubrica:', error);
    throw error;
  }
}

export async function updateRubrica(
  rubricaData: RubricaUpdateData
): Promise<Rubrica> {
  try {
    const { id, company_id, ...updateData } = rubricaData;

    return await EntityService.update<Rubrica>({
      schema: 'rh',
      table: 'rubricas',
      companyId: company_id,
      id: id,
      data: updateData
    });
  } catch (error) {
    console.error('Erro no serviço de atualização de rubrica:', error);
    throw error;
  }
}

export async function deleteRubrica(
  id: string,
  companyId: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: 'rh',
      table: 'rubricas',
      companyId: companyId,
      id: id
    });
  } catch (error) {
    console.error('Erro no serviço de exclusão de rubrica:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

export async function getActiveRubricas(companyId: string): Promise<Rubrica[]> {
  try {
    const { data, error } = await supabase
      .from('rubricas')
      .select('*')
      .eq('company_id', companyId)
      .eq('ativo', true)
      .order('ordem_exibicao', { ascending: true })
      .order('codigo');

    if (error) {
      console.error('Erro ao buscar rubricas ativas:', error);
      throw new Error(`Erro ao buscar rubricas ativas: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Erro no serviço de rubricas ativas:', error);
    throw error;
  }
}

export async function getRubricasByType(
  companyId: string,
  tipo: string
): Promise<Rubrica[]> {
  try {
    const { data, error } = await supabase
      .from('rubricas')
      .select('*')
      .eq('company_id', companyId)
      .eq('tipo', tipo)
      .eq('ativo', true)
      .order('ordem_exibicao', { ascending: true });

    if (error) {
      console.error('Erro ao buscar rubricas por tipo:', error);
      throw new Error(`Erro ao buscar rubricas por tipo: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Erro no serviço de rubricas por tipo:', error);
    throw error;
  }
}

export async function getRubricasByCategoria(
  companyId: string,
  categoria: string
): Promise<Rubrica[]> {
  try {
    const { data, error } = await supabase
      .from('rubricas')
      .select('*')
      .eq('company_id', companyId)
      .eq('categoria', categoria)
      .eq('ativo', true)
      .order('ordem_exibicao', { ascending: true });

    if (error) {
      console.error('Erro ao buscar rubricas por categoria:', error);
      throw new Error(`Erro ao buscar rubricas por categoria: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Erro no serviço de rubricas por categoria:', error);
    throw error;
  }
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

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function getRubricaTypeColor(tipo: string): string {
  switch (tipo) {
    case 'provento':
      return 'text-green-600 bg-green-100';
    case 'desconto':
      return 'text-red-600 bg-red-100';
    case 'base_calculo':
      return 'text-blue-600 bg-blue-100';
    case 'informacao':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function getRubricaNatureColor(natureza: string): string {
  switch (natureza) {
    case 'normal':
      return 'text-blue-600 bg-blue-100';
    case 'eventual':
      return 'text-orange-600 bg-orange-100';
    case 'fixo':
      return 'text-purple-600 bg-purple-100';
    case 'variavel':
      return 'text-yellow-600 bg-yellow-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function validateRubricaData(data: RubricaCreateData): string[] {
  const errors: string[] = [];

  if (!data.codigo?.trim()) {
    errors.push('Código é obrigatório');
  }

  if (!data.nome?.trim()) {
    errors.push('Nome é obrigatório');
  }

  if (!data.tipo) {
    errors.push('Tipo é obrigatório');
  }

  if (data.calculo_automatico && !data.formula_calculo?.trim()) {
    errors.push('Fórmula de cálculo é obrigatória quando cálculo automático está ativo');
  }

  if (data.valor_fixo !== undefined && data.valor_fixo < 0) {
    errors.push('Valor fixo não pode ser negativo');
  }

  if (data.percentual !== undefined && (data.percentual < 0 || data.percentual > 100)) {
    errors.push('Percentual deve estar entre 0 e 100');
  }

  if (data.ordem_exibicao !== undefined && data.ordem_exibicao < 0) {
    errors.push('Ordem de exibição não pode ser negativa');
  }

  return errors;
}

