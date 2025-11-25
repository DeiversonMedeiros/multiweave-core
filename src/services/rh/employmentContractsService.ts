// =====================================================
// SERVIÇO DE CONTRATOS DE TRABALHO (EMPLOYMENT CONTRACTS)
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { EmploymentContract, Employee } from '@/integrations/supabase/rh-types';

export interface EmploymentContractFilters {
  status?: string;
  tipo_contrato?: string;
  employee_id?: string;
  company_id?: string;
  data_inicio_from?: string;
  data_inicio_to?: string;
}

export interface EmploymentContractCreateData {
  company_id: string;
  employee_id: string;
  numero_contrato: string;
  tipo_contrato: 'CLT' | 'PJ' | 'Estagiário' | 'Terceirizado' | 'Temporário' | 'Freelancer';
  data_inicio: string;
  data_fim?: string;
  periodo_experiencia?: number;
  salario_base: number;
  carga_horaria_semanal?: number;
  regime_trabalho?: 'tempo_integral' | 'meio_periodo' | 'reducao_jornada' | 'banco_horas';
  tipo_jornada?: 'normal' | 'noturna' | 'especial';
  beneficios?: Record<string, any>;
  clausulas_especiais?: string;
  status?: 'ativo' | 'suspenso' | 'encerrado' | 'rescisao';
  observacoes?: string;
}

export interface EmploymentContractUpdateData extends Partial<EmploymentContractCreateData> {
  id: string;
}

export interface EmploymentContractWithEmployee extends EmploymentContract {
  employee: Employee;
}

// =====================================================
// FUNÇÕES DE CRUD
// =====================================================

export async function getEmploymentContracts(
  companyId: string,
  filters: EmploymentContractFilters = {}
): Promise<{ data: EmploymentContractWithEmployee[]; totalCount: number }> {
  try {
    let query = supabase
      .from('employment_contracts')
      .select(`
        *,
        employee:employees!employment_contracts_employee_id_fkey(
          id,
          nome,
          matricula,
          cpf,
          data_admissao,
          status
        )
      `, { count: 'exact' })
      .eq('company_id', companyId)
      .order('data_inicio', { ascending: false });

    // Aplicar filtros
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.tipo_contrato) {
      query = query.eq('tipo_contrato', filters.tipo_contrato);
    }

    if (filters.employee_id) {
      query = query.eq('employee_id', filters.employee_id);
    }

    if (filters.data_inicio_from) {
      query = query.gte('data_inicio', filters.data_inicio_from);
    }

    if (filters.data_inicio_to) {
      query = query.lte('data_inicio', filters.data_inicio_to);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar contratos de trabalho:', error);
      throw new Error(`Erro ao buscar contratos de trabalho: ${error.message}`);
    }

    return {
      data: data || [],
      totalCount: count || 0,
    };
  } catch (error) {
    console.error('Erro no serviço de contratos de trabalho:', error);
    throw error;
  }
}

export async function getEmploymentContractById(
  id: string,
  companyId: string
): Promise<EmploymentContractWithEmployee | null> {
  try {
    const { data, error } = await supabase
      .from('employment_contracts')
      .select(`
        *,
        employee:employees!employment_contracts_employee_id_fkey(
          id,
          nome,
          matricula,
          cpf,
          data_admissao,
          status,
          cargo_id,
          departamento_id,
          cargo:positions!employees_cargo_id_fkey(nome),
          departamento:units!employees_departamento_id_fkey(nome)
        )
      `)
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Não encontrado
      }
      console.error('Erro ao buscar contrato de trabalho:', error);
      throw new Error(`Erro ao buscar contrato de trabalho: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Erro no serviço de contrato de trabalho:', error);
    throw error;
  }
}

export async function createEmploymentContract(
  contractData: EmploymentContractCreateData
): Promise<EmploymentContract> {
  try {
    const { data, error } = await supabase
      .from('employment_contracts')
      .insert([contractData])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar contrato de trabalho:', error);
      throw new Error(`Erro ao criar contrato de trabalho: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Erro no serviço de criação de contrato:', error);
    throw error;
  }
}

export async function updateEmploymentContract(
  contractData: EmploymentContractUpdateData
): Promise<EmploymentContract> {
  try {
    const { id, ...updateData } = contractData;

    const { data, error } = await supabase
      .from('employment_contracts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar contrato de trabalho:', error);
      throw new Error(`Erro ao atualizar contrato de trabalho: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Erro no serviço de atualização de contrato:', error);
    throw error;
  }
}

export async function deleteEmploymentContract(
  id: string,
  companyId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('employment_contracts')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      console.error('Erro ao excluir contrato de trabalho:', error);
      throw new Error(`Erro ao excluir contrato de trabalho: ${error.message}`);
    }
  } catch (error) {
    console.error('Erro no serviço de exclusão de contrato:', error);
    throw error;
  }
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

export async function getActiveEmploymentContracts(
  companyId: string
): Promise<EmploymentContractWithEmployee[]> {
  try {
    const { data, error } = await supabase
      .from('employment_contracts')
      .select(`
        *,
        employee:employees!employment_contracts_employee_id_fkey(
          id,
          nome,
          matricula,
          cpf,
          status
        )
      `)
      .eq('company_id', companyId)
      .eq('status', 'ativo')
      .order('data_inicio', { ascending: false });

    if (error) {
      console.error('Erro ao buscar contratos ativos:', error);
      throw new Error(`Erro ao buscar contratos ativos: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Erro no serviço de contratos ativos:', error);
    throw error;
  }
}

export async function getEmploymentContractsByEmployee(
  employeeId: string,
  companyId: string
): Promise<EmploymentContract[]> {
  try {
    const { data, error } = await supabase
      .from('employment_contracts')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('company_id', companyId)
      .order('data_inicio', { ascending: false });

    if (error) {
      console.error('Erro ao buscar contratos do funcionário:', error);
      throw new Error(`Erro ao buscar contratos do funcionário: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Erro no serviço de contratos do funcionário:', error);
    throw error;
  }
}

export async function terminateEmploymentContract(
  id: string,
  companyId: string,
  dataRescisao: string,
  motivoRescisao: string
): Promise<EmploymentContract> {
  try {
    const { data, error } = await supabase
      .from('employment_contracts')
      .update({
        status: 'rescisao',
        data_rescisao: dataRescisao,
        motivo_rescisao: motivoRescisao,
      })
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao encerrar contrato:', error);
      throw new Error(`Erro ao encerrar contrato: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Erro no serviço de encerramento de contrato:', error);
    throw error;
  }
}

// =====================================================
// UTILITÁRIOS
// =====================================================

export function getContractTypes(): { value: string; label: string }[] {
  return [
    { value: 'CLT', label: 'CLT - Consolidação das Leis do Trabalho' },
    { value: 'Menor Aprendiz', label: 'Menor Aprendiz' },
    { value: 'PJ', label: 'PJ - Pessoa Jurídica' },
    { value: 'Estagiário', label: 'Estagiário' },
    { value: 'Terceirizado', label: 'Terceirizado' },
    { value: 'Temporário', label: 'Temporário' },
    { value: 'Freelancer', label: 'Freelancer' },
  ];
}

export function getWorkRegimes(): { value: string; label: string }[] {
  return [
    { value: 'tempo_integral', label: 'Tempo Integral' },
    { value: 'meio_periodo', label: 'Meio Período' },
    { value: 'reducao_jornada', label: 'Redução de Jornada' },
    { value: 'banco_horas', label: 'Banco de Horas' },
  ];
}

export function getWorkSchedules(): { value: string; label: string }[] {
  return [
    { value: 'normal', label: 'Normal' },
    { value: 'noturna', label: 'Noturna' },
    { value: 'especial', label: 'Especial' },
  ];
}

export function getContractStatuses(): { value: string; label: string }[] {
  return [
    { value: 'ativo', label: 'Ativo' },
    { value: 'suspenso', label: 'Suspenso' },
    { value: 'encerrado', label: 'Encerrado' },
    { value: 'rescisao', label: 'Rescisão' },
  ];
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

export function calculateContractDuration(dataInicio: string, dataFim?: string): number {
  const inicio = new Date(dataInicio);
  const fim = dataFim ? new Date(dataFim) : new Date();
  
  const diffTime = Math.abs(fim.getTime() - inicio.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

