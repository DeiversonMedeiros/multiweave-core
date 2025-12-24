// =====================================================
// SERVIÇO DE DEDUÇÕES E COPARTICIPAÇÃO
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';

export type DeductionType = 
  | 'coparticipacao_medica'
  | 'emprestimo'
  | 'multa'
  | 'avaria_veiculo'
  | 'danos_materiais'
  | 'adiantamento'
  | 'desconto_combinado'
  | 'outros';

export type DeductionStatus = 'pendente' | 'em_aberto' | 'pago' | 'cancelado' | 'parcelado';

export interface EmployeeDeduction {
  id: string;
  company_id: string;
  employee_id: string;
  tipo_deducao: DeductionType;
  categoria?: string;
  descricao: string;
  valor_total: number;
  valor_parcela?: number;
  numero_parcelas: number;
  parcela_atual: number;
  data_origem: string;
  mes_referencia_inicio: number;
  ano_referencia_inicio: number;
  mes_referencia_fim?: number;
  ano_referencia_fim?: number;
  status: DeductionStatus;
  valor_total_pago: number;
  medical_service_usage_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  aplicar_na_folha: boolean;
  mes_referencia_folha?: number;
  ano_referencia_folha?: number;
  payroll_event_id?: string;
  documento_referencia?: string;
  anexo_url?: string;
  observacoes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MedicalServiceUsage {
  id: string;
  company_id: string;
  employee_id: string;
  employee_plan_id: string;
  dependent_id?: string;
  tipo_servico: 'consulta' | 'exame' | 'cirurgia' | 'procedimento' | 'internacao' | 'outros';
  descricao: string;
  data_utilizacao: string;
  prestador_nome?: string;
  prestador_cnpj?: string;
  valor_total: number;
  valor_coparticipacao: number;
  percentual_aplicado?: number;
  status: 'pendente' | 'pago' | 'cancelado';
  mes_referencia_folha?: number;
  ano_referencia_folha?: number;
  payroll_event_id?: string;
  nota_fiscal_numero?: string;
  nota_fiscal_valor?: number;
  anexo_url?: string;
  observacoes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DeductionCreateData {
  employee_id: string;
  tipo_deducao: DeductionType;
  categoria?: string;
  descricao: string;
  valor_total: number;
  valor_parcela?: number;
  numero_parcelas?: number;
  data_origem: string;
  mes_referencia_inicio: number;
  ano_referencia_inicio: number;
  mes_referencia_fim?: number;
  ano_referencia_fim?: number;
  medical_service_usage_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  aplicar_na_folha?: boolean;
  mes_referencia_folha?: number;
  ano_referencia_folha?: number;
  documento_referencia?: string;
  anexo_url?: string;
  observacoes?: string;
}

export interface MedicalServiceUsageCreateData {
  employee_id: string;
  employee_plan_id: string;
  dependent_id?: string;
  tipo_servico: 'consulta' | 'exame' | 'cirurgia' | 'procedimento' | 'internacao' | 'outros';
  descricao: string;
  data_utilizacao: string;
  prestador_nome?: string;
  prestador_cnpj?: string;
  valor_total: number;
  nota_fiscal_numero?: string;
  nota_fiscal_valor?: number;
  anexo_url?: string;
  observacoes?: string;
}

export const DeductionsService = {
  /**
   * Lista todas as deduções de uma empresa
   */
  list: async (
    companyId: string,
    filters?: {
      employeeId?: string;
      tipoDeducao?: DeductionType;
      status?: DeductionStatus;
      mesReferencia?: number;
      anoReferencia?: number;
    }
  ): Promise<EmployeeDeduction[]> => {
    try {
      const result = await EntityService.list<EmployeeDeduction>({
        schema: 'rh',
        table: 'employee_deductions',
        companyId,
        filters: {
          ...(filters?.employeeId && { employee_id: filters.employeeId }),
          ...(filters?.tipoDeducao && { tipo_deducao: filters.tipoDeducao }),
          ...(filters?.status && { status: filters.status }),
          ...(filters?.mesReferencia && { mes_referencia_folha: filters.mesReferencia }),
          ...(filters?.anoReferencia && { ano_referencia_folha: filters.anoReferencia }),
        },
        orderBy: 'data_origem',
        orderDirection: 'DESC'
      });

      return result.data || [];
    } catch (error) {
      console.error('Erro ao listar deduções:', error);
      throw error;
    }
  },

  /**
   * Busca uma dedução por ID
   */
  getById: async (id: string, companyId: string): Promise<EmployeeDeduction | null> => {
    try {
      const result = await EntityService.getById<EmployeeDeduction>(
        'rh',
        'employee_deductions',
        id,
        companyId
      );

      return result;
    } catch (error) {
      console.error('Erro ao buscar dedução:', error);
      throw error;
    }
  },

  /**
   * Cria uma nova dedução
   */
  create: async (
    companyId: string,
    deduction: DeductionCreateData
  ): Promise<EmployeeDeduction> => {
    try {
      const result = await EntityService.create<EmployeeDeduction>({
        schema: 'rh',
        table: 'employee_deductions',
        companyId,
        data: {
          ...deduction,
          company_id: companyId,
          numero_parcelas: deduction.numero_parcelas || 1,
          parcela_atual: 1,
          status: 'pendente',
          valor_total_pago: 0,
          aplicar_na_folha: deduction.aplicar_na_folha ?? true,
        },
      });

      return result;
    } catch (error) {
      console.error('Erro ao criar dedução:', error);
      throw error;
    }
  },

  /**
   * Atualiza uma dedução
   */
  update: async (
    id: string,
    companyId: string,
    updates: Partial<DeductionCreateData>
  ): Promise<EmployeeDeduction> => {
    try {
      const result = await EntityService.update<EmployeeDeduction>({
        schema: 'rh',
        table: 'employee_deductions',
        id,
        companyId,
        data: updates,
      });

      return result;
    } catch (error) {
      console.error('Erro ao atualizar dedução:', error);
      throw error;
    }
  },

  /**
   * Remove uma dedução
   */
  delete: async (id: string, companyId: string): Promise<void> => {
    try {
      await EntityService.delete({
        schema: 'rh',
        table: 'employee_deductions',
        id,
        companyId,
      });
    } catch (error) {
      console.error('Erro ao remover dedução:', error);
      throw error;
    }
  },

  /**
   * Busca deduções pendentes para aplicar na folha
   */
  getPendingForPayroll: async (
    companyId: string,
    employeeId?: string,
    mesReferencia?: number,
    anoReferencia?: number
  ): Promise<EmployeeDeduction[]> => {
    try {
      // Usar call_schema_rpc para chamar função do schema rh
      const { data, error } = await supabase.rpc('call_schema_rpc', {
        p_schema_name: 'rh',
        p_function_name: 'get_pending_deductions',
        p_params: {
          p_company_id: companyId,
          p_employee_id: employeeId || null,
          p_mes_referencia: mesReferencia || null,
          p_ano_referencia: anoReferencia || null,
        }
      });

      if (error) {
        console.error('Erro na chamada RPC:', error);
        throw error;
      }
      
      // call_schema_rpc retorna { result: ... } ou { error: true, message: ... }
      if (data?.error) {
        throw new Error(data.message || 'Erro ao buscar deduções pendentes');
      }
      
      // Funções que retornam TABLE podem retornar como array direto ou dentro de result
      // Verificar se data é um array (retorno direto de TABLE)
      if (Array.isArray(data)) {
        return data as EmployeeDeduction[];
      }
      
      // Se data.result existe e é um array, usar ele
      if (data?.result && Array.isArray(data.result)) {
        return data.result as EmployeeDeduction[];
      }
      
      // Se data.result existe mas não é array, tentar converter
      if (data?.result) {
        return [data.result] as EmployeeDeduction[];
      }
      
      // Retornar array vazio se não houver dados
      return [];
    } catch (error) {
      console.error('Erro ao buscar deduções pendentes:', error);
      throw error;
    }
  },

  /**
   * Registra utilização de serviço médico e cria dedução automaticamente
   */
  createFromMedicalService: async (
    medicalServiceUsageId: string,
    companyId: string,
    mesReferencia: number,
    anoReferencia: number
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('create_deduction_from_medical_service', {
        p_medical_service_usage_id: medicalServiceUsageId,
        p_company_id: companyId,
        p_mes_referencia: mesReferencia,
        p_ano_referencia: anoReferencia,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao criar dedução a partir de serviço médico:', error);
      throw error;
    }
  },

  // =====================================================
  // SERVIÇOS MÉDICOS
  // =====================================================

  /**
   * Lista utilização de serviços médicos
   */
  listMedicalServices: async (
    companyId: string,
    filters?: {
      employeeId?: string;
      employeePlanId?: string;
      status?: 'pendente' | 'pago' | 'cancelado';
      mesReferencia?: number;
      anoReferencia?: number;
    }
  ): Promise<MedicalServiceUsage[]> => {
    try {
      const result = await EntityService.list<MedicalServiceUsage>({
        schema: 'rh',
        table: 'medical_services_usage',
        companyId,
        filters: {
          ...(filters?.employeeId && { employee_id: filters.employeeId }),
          ...(filters?.employeePlanId && { employee_plan_id: filters.employeePlanId }),
          ...(filters?.status && { status: filters.status }),
          ...(filters?.mesReferencia && { mes_referencia_folha: filters.mesReferencia }),
          ...(filters?.anoReferencia && { ano_referencia_folha: filters.anoReferencia }),
        },
        orderBy: 'data_utilizacao',
        orderDirection: 'DESC'
      });

      return result.data || [];
    } catch (error) {
      console.error('Erro ao listar serviços médicos:', error);
      throw error;
    }
  },

  /**
   * Registra utilização de serviço médico
   */
  createMedicalService: async (
    companyId: string,
    service: MedicalServiceUsageCreateData
  ): Promise<MedicalServiceUsage> => {
    try {
      const result = await EntityService.create<MedicalServiceUsage>({
        schema: 'rh',
        table: 'medical_services_usage',
        companyId,
        data: {
          ...service,
          company_id: companyId,
          status: 'pendente',
          valor_coparticipacao: 0, // Será calculado pelo trigger
        },
      });

      return result;
    } catch (error) {
      console.error('Erro ao registrar serviço médico:', error);
      throw error;
    }
  },

  /**
   * Atualiza utilização de serviço médico
   */
  updateMedicalService: async (
    id: string,
    companyId: string,
    updates: Partial<MedicalServiceUsageCreateData>
  ): Promise<MedicalServiceUsage> => {
    try {
      const result = await EntityService.update<MedicalServiceUsage>({
        schema: 'rh',
        table: 'medical_services_usage',
        id,
        companyId,
        data: updates,
      });

      return result;
    } catch (error) {
      console.error('Erro ao atualizar serviço médico:', error);
      throw error;
    }
  },

  /**
   * Remove utilização de serviço médico
   */
  deleteMedicalService: async (id: string, companyId: string): Promise<void> => {
    try {
      await EntityService.delete({
        schema: 'rh',
        table: 'medical_services_usage',
        id,
        companyId,
      });
    } catch (error) {
      console.error('Erro ao remover serviço médico:', error);
      throw error;
    }
  },

  /**
   * Calcula coparticipação manualmente (se necessário)
   */
  calculateCoparticipation: async (
    medicalServiceUsageId: string,
    companyId: string
  ): Promise<number> => {
    try {
      const { data, error } = await supabase.rpc('calculate_coparticipation', {
        p_medical_service_usage_id: medicalServiceUsageId,
        p_company_id: companyId,
      });

      if (error) throw error;
      return data || 0;
    } catch (error) {
      console.error('Erro ao calcular coparticipação:', error);
      throw error;
    }
  },
};

