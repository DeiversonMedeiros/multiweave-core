// =====================================================
// SERVIÇO DE PREMIAÇÕES E PRODUTIVIDADE
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { 
  AwardProductivity, 
  AwardProductivityCreateData, 
  AwardProductivityUpdateData, 
  AwardProductivityFilters,
  AwardCategory,
  AwardCategoryCreateData,
  AwardCategoryUpdateData,
  AwardCategoryFilters,
  AwardImport,
  AwardImportCreateData,
  AwardImportUpdateData,
  AwardImportError,
  AwardImportErrorFilters,
  AwardImportData
} from '@/integrations/supabase/rh-types';
import { EntityService } from '@/services/generic/entityService';

// =====================================================
// FUNÇÕES DE CRUD - PREMIAÇÕES E PRODUTIVIDADE
// =====================================================

export async function getAwardsProductivity(
  companyId: string,
  filters: AwardProductivityFilters = {}
): Promise<{ data: AwardProductivity[]; totalCount: number }> {
  try {
    const result = await EntityService.list<AwardProductivity>({
      schema: 'rh',
      table: 'awards_productivity',
      companyId,
      filters,
      orderBy: 'mes_referencia',
      orderDirection: 'DESC'
    });

    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro no serviço de premiações e produtividade:', error);
    throw error;
  }
}

export async function getAwardProductivityById(
  id: string,
  companyId: string
): Promise<AwardProductivity | null> {
  try {
    return await EntityService.getById<AwardProductivity>({
      schema: 'rh',
      table: 'awards_productivity',
      companyId,
      id
    });
  } catch (error) {
    console.error('Erro no serviço de premiações e produtividade:', error);
    throw error;
  }
}

export async function createAwardProductivity(
  awardData: AwardProductivityCreateData
): Promise<AwardProductivity> {
  try {
    return await EntityService.create<AwardProductivity>({
      schema: 'rh',
      table: 'awards_productivity',
      companyId: awardData.company_id,
      data: awardData
    });
  } catch (error) {
    console.error('Erro no serviço de premiações e produtividade:', error);
    throw error;
  }
}

export async function updateAwardProductivity(
  awardData: AwardProductivityUpdateData
): Promise<AwardProductivity> {
  try {
    const { id, company_id, ...updateData } = awardData;

    return await EntityService.update<AwardProductivity>({
      schema: 'rh',
      table: 'awards_productivity',
      companyId: company_id,
      id: id,
      data: updateData
    });
  } catch (error) {
    console.error('Erro no serviço de premiações e produtividade:', error);
    throw error;
  }
}

export async function deleteAwardProductivity(
  id: string,
  companyId: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: 'rh',
      table: 'awards_productivity',
      companyId: companyId,
      id: id
    });
  } catch (error) {
    console.error('Erro no serviço de premiações e produtividade:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES DE CRUD - CATEGORIAS DE PREMIAÇÃO
// =====================================================

export async function getAwardCategories(
  companyId: string,
  filters: AwardCategoryFilters = {}
): Promise<{ data: AwardCategory[]; totalCount: number }> {
  try {
    const result = await EntityService.list<AwardCategory>({
      schema: 'rh',
      table: 'award_categories',
      companyId,
      filters,
      orderBy: 'nome',
      orderDirection: 'ASC'
    });

    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro no serviço de categorias de premiação:', error);
    throw error;
  }
}

export async function getAwardCategoryById(
  id: string,
  companyId: string
): Promise<AwardCategory | null> {
  try {
    return await EntityService.getById<AwardCategory>({
      schema: 'rh',
      table: 'award_categories',
      companyId,
      id
    });
  } catch (error) {
    console.error('Erro no serviço de categorias de premiação:', error);
    throw error;
  }
}

export async function createAwardCategory(
  categoryData: AwardCategoryCreateData
): Promise<AwardCategory> {
  try {
    return await EntityService.create<AwardCategory>({
      schema: 'rh',
      table: 'award_categories',
      companyId: categoryData.company_id,
      data: categoryData
    });
  } catch (error) {
    console.error('Erro no serviço de categorias de premiação:', error);
    throw error;
  }
}

export async function updateAwardCategory(
  categoryData: AwardCategoryUpdateData
): Promise<AwardCategory> {
  try {
    const { id, company_id, ...updateData } = categoryData;

    return await EntityService.update<AwardCategory>({
      schema: 'rh',
      table: 'award_categories',
      companyId: company_id,
      id: id,
      data: updateData
    });
  } catch (error) {
    console.error('Erro no serviço de categorias de premiação:', error);
    throw error;
  }
}

export async function deleteAwardCategory(
  id: string,
  companyId: string
): Promise<void> {
  try {
    await EntityService.delete({
      schema: 'rh',
      table: 'award_categories',
      companyId: companyId,
      id: id
    });
  } catch (error) {
    console.error('Erro no serviço de categorias de premiação:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES DE IMPORTAÇÃO EM MASSA
// =====================================================

export async function importAwardsFromCSV(
  companyId: string,
  mesReferencia: string,
  csvData: AwardImportData[],
  fileName: string
): Promise<{ success: boolean; importId?: string; errors?: string[] }> {
  try {
    // Criar registro de importação
    const importRecord: AwardImportCreateData = {
      company_id: companyId,
      mes_referencia: mesReferencia,
      nome_arquivo: fileName,
      tipo_importacao: 'csv',
      total_registros: csvData.length,
      registros_processados: 0,
      registros_com_erro: 0,
      status: 'processando'
    };

    const importResult = await EntityService.create<AwardImport>({
      schema: 'rh',
      table: 'award_imports',
      companyId: companyId,
      data: importRecord
    });

    const errors: string[] = [];
    let processed = 0;
    let errorCount = 0;

    // Processar cada linha do CSV
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      try {
        // Validar dados da linha
        const validation = await validateAwardImportRow(row, companyId);
        if (!validation.valid) {
          errors.push(`Linha ${i + 1}: ${validation.message}`);
          errorCount++;
          
          // Registrar erro
          await EntityService.create({
            schema: 'rh',
            table: 'award_import_errors',
            companyId: companyId,
            data: {
              import_id: importResult.id,
              linha_arquivo: i + 1,
              dados_linha: JSON.stringify(row),
              erro_descricao: validation.message,
              erro_campo: validation.field
            }
          });
          continue;
        }

        // Criar premiação
        await createAwardProductivity({
          company_id: companyId,
          employee_id: row.employee_id,
          tipo: row.tipo as any,
          nome: row.nome,
          descricao: row.descricao,
          mes_referencia: mesReferencia,
          valor: row.valor,
          percentual: row.percentual,
          tipo_calculo: row.tipo_calculo as any,
          meta_atingida: row.meta_atingida,
          meta_estabelecida: row.meta_estabelecida,
          criterios: row.criterios,
          observacoes: row.observacoes,
          status: 'pendente'
        });

        processed++;
      } catch (error) {
        errors.push(`Linha ${i + 1}: Erro ao processar - ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        errorCount++;
      }
    }

    // Atualizar registro de importação
    await EntityService.update({
      schema: 'rh',
      table: 'award_imports',
      companyId: companyId,
      id: importResult.id,
      data: {
        registros_processados: processed,
        registros_com_erro: errorCount,
        status: errorCount > 0 ? 'erro' : 'concluido',
        data_fim: new Date().toISOString(),
        erro_detalhes: errors.length > 0 ? errors.join('; ') : undefined
      }
    });

    return {
      success: errorCount === 0,
      importId: importResult.id,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Erro na importação de premiações:', error);
    throw error;
  }
}

export async function validateAwardImportRow(
  row: AwardImportData,
  companyId: string
): Promise<{ valid: boolean; message: string; field?: string }> {
  try {
    // Validar campos obrigatórios
    if (!row.employee_id) {
      return { valid: false, message: 'ID do funcionário é obrigatório', field: 'employee_id' };
    }
    if (!row.tipo) {
      return { valid: false, message: 'Tipo é obrigatório', field: 'tipo' };
    }
    if (!row.nome) {
      return { valid: false, message: 'Nome é obrigatório', field: 'nome' };
    }
    if (!row.valor || row.valor <= 0) {
      return { valid: false, message: 'Valor deve ser maior que zero', field: 'valor' };
    }
    if (!row.tipo_calculo) {
      return { valid: false, message: 'Tipo de cálculo é obrigatório', field: 'tipo_calculo' };
    }

    // Validar se funcionário existe
    const employee = await EntityService.getById({
      schema: 'rh',
      table: 'employees',
      companyId: companyId,
      id: row.employee_id
    });

    if (!employee) {
      return { valid: false, message: 'Funcionário não encontrado', field: 'employee_id' };
    }

    // Validar tipos
    const validTypes = ['premiacao', 'produtividade', 'bonus', 'comissao', 'meta', 'outros'];
    if (!validTypes.includes(row.tipo)) {
      return { valid: false, message: 'Tipo inválido', field: 'tipo' };
    }

    const validCalculationTypes = ['valor_fixo', 'percentual_meta', 'tabela_faixas', 'comissao_venda'];
    if (!validCalculationTypes.includes(row.tipo_calculo)) {
      return { valid: false, message: 'Tipo de cálculo inválido', field: 'tipo_calculo' };
    }

    return { valid: true, message: 'Válido' };
  } catch (error) {
    console.error('Erro na validação da linha:', error);
    return { valid: false, message: 'Erro na validação' };
  }
}

export async function getAwardImports(
  companyId: string,
  mesReferencia?: string
): Promise<{ data: AwardImport[]; totalCount: number }> {
  try {
    const filters: any = {};
    if (mesReferencia) {
      filters.mes_referencia = mesReferencia;
    }

    const result = await EntityService.list<AwardImport>({
      schema: 'rh',
      table: 'award_imports',
      companyId,
      filters,
      orderBy: 'data_inicio',
      orderDirection: 'DESC'
    });

    return {
      data: result.data,
      totalCount: result.totalCount,
    };
  } catch (error) {
    console.error('Erro ao buscar importações:', error);
    throw error;
  }
}

export async function getAwardImportErrors(
  companyId: string,
  importId: string
): Promise<AwardImportError[]> {
  try {
    const result = await EntityService.list<AwardImportError>({
      schema: 'rh',
      table: 'award_import_errors',
      companyId,
      filters: { import_id: importId },
      orderBy: 'linha_arquivo',
      orderDirection: 'ASC'
    });

    return result.data;
  } catch (error) {
    console.error('Erro ao buscar erros de importação:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

export function getAwardTypeLabel(tipo: string): string {
  const tipos = {
    premiacao: 'Premiação',
    produtividade: 'Produtividade',
    bonus: 'Bônus',
    comissao: 'Comissão',
    meta: 'Meta',
    outros: 'Outros'
  };
  return tipos[tipo as keyof typeof tipos] || tipo;
}

export function getAwardTypeColor(tipo: string): string {
  const cores = {
    premiacao: 'bg-yellow-100 text-yellow-800',
    produtividade: 'bg-green-100 text-green-800',
    bonus: 'bg-blue-100 text-blue-800',
    comissao: 'bg-purple-100 text-purple-800',
    meta: 'bg-orange-100 text-orange-800',
    outros: 'bg-gray-100 text-gray-800'
  };
  return cores[tipo as keyof typeof cores] || 'bg-gray-100 text-gray-800';
}

export function getAwardStatusLabel(status: string): string {
  const statusMap = {
    pendente: 'Pendente',
    aprovado: 'Aprovado',
    pago: 'Pago',
    cancelado: 'Cancelado'
  };
  return statusMap[status as keyof typeof statusMap] || status;
}

export function getAwardStatusColor(status: string): string {
  const cores = {
    pendente: 'bg-yellow-100 text-yellow-800',
    aprovado: 'bg-blue-100 text-blue-800',
    pago: 'bg-green-100 text-green-800',
    cancelado: 'bg-red-100 text-red-800'
  };
  return cores[status as keyof typeof cores] || 'bg-gray-100 text-gray-800';
}

export function getCalculationTypeLabel(tipo: string): string {
  const tipos = {
    valor_fixo: 'Valor Fixo',
    percentual_meta: 'Percentual da Meta',
    tabela_faixas: 'Tabela de Faixas',
    comissao_venda: 'Comissão por Venda'
  };
  return tipos[tipo as keyof typeof tipos] || tipo;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

// =====================================================
// FUNÇÕES ESPECÍFICAS
// =====================================================

export async function getAwardsByEmployee(
  employeeId: string,
  companyId: string,
  mesReferencia?: string
): Promise<AwardProductivity[]> {
  try {
    const filters: any = { employee_id: employeeId };
    if (mesReferencia) {
      filters.mes_referencia = mesReferencia;
    }

    const result = await EntityService.list<AwardProductivity>({
      schema: 'rh',
      table: 'awards_productivity',
      companyId,
      filters,
      orderBy: 'mes_referencia',
      orderDirection: 'DESC'
    });
    return result.data;
  } catch (error) {
    console.error('Erro ao buscar premiações do funcionário:', error);
    throw error;
  }
}

export async function getAwardsByMonth(
  companyId: string,
  mesReferencia: string
): Promise<AwardProductivity[]> {
  try {
    const result = await EntityService.list<AwardProductivity>({
      schema: 'rh',
      table: 'awards_productivity',
      companyId,
      filters: { mes_referencia: mesReferencia },
      orderBy: 'employee_id',
      orderDirection: 'ASC'
    });
    return result.data;
  } catch (error) {
    console.error('Erro ao buscar premiações do mês:', error);
    throw error;
  }
}

export async function getAwardStats(companyId: string) {
  try {
    const [awardsResult, importsResult] = await Promise.all([
      getAwardsProductivity(companyId),
      getAwardImports(companyId)
    ]);

    const awards = awardsResult.data;
    const imports = importsResult.data;

    const stats = {
      total_awards: awards.length,
      awards_by_status: awards.reduce((acc, award) => {
        acc[award.status] = (acc[award.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      awards_by_type: awards.reduce((acc, award) => {
        acc[award.tipo] = (acc[award.tipo] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      total_value: awards
        .filter(award => award.status !== 'cancelado')
        .reduce((sum, award) => sum + award.valor, 0),
      total_imports: imports.length,
      successful_imports: imports.filter(imp => imp.status === 'concluido').length,
      failed_imports: imports.filter(imp => imp.status === 'erro').length,
      total_imported_records: imports.reduce((sum, imp) => sum + imp.registros_processados, 0)
    };

    return stats;
  } catch (error) {
    console.error('Erro ao buscar estatísticas das premiações:', error);
    throw error;
  }
}

export async function approveAward(
  id: string,
  companyId: string,
  approvedBy: string
): Promise<AwardProductivity> {
  try {
    return await EntityService.update<AwardProductivity>({
      schema: 'rh',
      table: 'awards_productivity',
      companyId: companyId,
      id: id,
      data: {
        status: 'aprovado',
        data_aprovacao: new Date().toISOString(),
        aprovado_por: approvedBy
      }
    });
  } catch (error) {
    console.error('Erro ao aprovar premiação:', error);
    throw error;
  }
}

export async function markAsPaid(
  id: string,
  companyId: string
): Promise<AwardProductivity> {
  try {
    return await EntityService.update<AwardProductivity>({
      schema: 'rh',
      table: 'awards_productivity',
      companyId: companyId,
      id: id,
      data: {
        status: 'pago',
        data_pagamento: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Erro ao marcar como pago:', error);
    throw error;
  }
}

// Função para gerar template CSV
export function generateCSVTemplate(): string {
  const headers = [
    'employee_id',
    'employee_name',
    'tipo',
    'nome',
    'descricao',
    'valor',
    'percentual',
    'tipo_calculo',
    'meta_atingida',
    'meta_estabelecida',
    'criterios',
    'observacoes'
  ];

  const example = [
    'uuid-do-funcionario',
    'João Silva',
    'produtividade',
    'Meta de Vendas Janeiro',
    'Atingimento de meta de vendas',
    '500.00',
    '5.0',
    'valor_fixo',
    '100000.00',
    '80000.00',
    'Meta de R$ 80.000 em vendas',
    'Premiação por excelente desempenho'
  ];

  return [headers.join(','), example.join(',')].join('\n');
}
