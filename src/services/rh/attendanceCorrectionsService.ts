import { EntityService } from '@/services/generic/entityService';
import { supabase } from '@/integrations/supabase/client';

export interface AttendanceCorrection {
  id: string;
  employee_id: string;
  company_id: string;
  data_original: string;
  entrada_original?: string;
  saida_original?: string;
  entrada_corrigida?: string;
  saida_corrigida?: string;
  justificativa: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  solicitado_por?: string;
  aprovado_por?: string;
  aprovado_em?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceCorrectionCreateData {
  employee_id: string;
  company_id: string;
  data_original: string;
  entrada_original?: string;
  saida_original?: string;
  entrada_corrigida?: string;
  saida_corrigida?: string;
  justificativa: string;
  observacoes?: string;
}

export interface AttendanceCorrectionUpdateData {
  entrada_corrigida?: string;
  saida_corrigida?: string;
  justificativa?: string;
  observacoes?: string;
}

export interface AttendanceCorrectionFilters {
  company_id?: string;
  employee_id?: string;
  status?: string;
  data_inicio?: string;
  data_fim?: string;
  limit?: number;
  offset?: number;
}

export const AttendanceCorrectionsService = {
  /**
   * Lista correções de ponto com filtros
   */
  list: async (filters: AttendanceCorrectionFilters = {}): Promise<{
    data: AttendanceCorrection[];
    count: number;
  }> => {
    try {
       // Usar RPC function para acessar tabela do schema rh
       const { data, error, count } = await supabase
         .rpc('get_entity_data', {
           schema_name: 'rh',
           table_name: 'attendance_corrections',
           company_id_param: filters.company_id || null,
           filters: {
             ...(filters.employee_id && { employee_id: filters.employee_id }),
             ...(filters.status && { status: filters.status }),
             ...(filters.data_inicio && { data_original_gte: filters.data_inicio }),
             ...(filters.data_fim && { data_original_lte: filters.data_fim })
           },
           order_by: 'created_at',
           order_direction: 'DESC',
           limit_param: filters.limit || 50,
           offset_param: filters.offset || 0
         });

       if (error) {
         throw new Error(`Erro ao buscar correções: ${error.message}`);
       }

       return {
         data: data?.map((item: any) => item.data) || [],
         count: data?.[0]?.total_count || 0
       };
    } catch (error) {
      console.error('Erro ao buscar correções:', error);
      throw new Error(`Erro ao buscar correções: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  },

  /**
   * Busca correção por ID
   */
  getById: async (id: string, companyId: string): Promise<AttendanceCorrection> => {
    try {
      const result = await EntityService.getById({
        schema: 'rh',
        table: 'attendance_corrections',
        companyId: companyId,
        id: id
      });

      return result;
    } catch (error) {
      console.error('Erro ao buscar correção:', error);
      throw new Error(`Erro ao buscar correção: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  },

  /**
   * Cria nova correção de ponto
   */
  create: async (data: AttendanceCorrectionCreateData): Promise<AttendanceCorrection> => {
    try {
      const result = await EntityService.create({
        schema: 'rh',
        table: 'attendance_corrections',
        companyId: data.company_id,
        data: {
          ...data,
          status: 'pendente'
        }
      });

      return result;
    } catch (error) {
      console.error('Erro ao criar correção:', error);
      throw new Error(`Erro ao criar correção: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  },

  /**
   * Atualiza correção existente
   */
  update: async (id: string, data: AttendanceCorrectionUpdateData, companyId: string): Promise<AttendanceCorrection> => {
    try {
      const result = await EntityService.update({
        schema: 'rh',
        table: 'attendance_corrections',
        companyId: companyId,
        id: id,
        data: {
          ...data
        }
      });

      return result;
    } catch (error) {
      console.error('Erro ao atualizar correção:', error);
      throw new Error(`Erro ao atualizar correção: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  },

  /**
   * Aprova correção de ponto
   */
  approve: async (id: string, approvedBy: string, observacoes?: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('approve_attendance_correction', {
      p_correction_id: id,
      p_approved_by: approvedBy,
      p_observacoes: observacoes
    });

    if (error) {
      throw new Error(`Erro ao aprovar correção: ${error.message}`);
    }

    return data;
  },

  /**
   * Rejeita correção de ponto
   */
  reject: async (id: string, rejectedBy: string, observacoes: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('reject_attendance_correction', {
      p_correction_id: id,
      p_rejected_by: rejectedBy,
      p_observacoes: observacoes
    });

    if (error) {
      throw new Error(`Erro ao rejeitar correção: ${error.message}`);
    }

    return data;
  },

  /**
   * Busca correções pendentes de uma empresa
   */
   getPending: async (companyId: string): Promise<AttendanceCorrection[]> => {
     const { data, error } = await supabase
       .rpc('get_entity_data', {
         schema_name: 'rh',
         table_name: 'attendance_corrections',
         company_id_param: companyId,
         filters: {
           status: 'pendente'
         },
         order_by: 'created_at',
         order_direction: 'DESC',
         limit_param: 100,
         offset_param: 0
       });

     if (error) {
       throw new Error(`Erro ao buscar correções pendentes: ${error.message}`);
     }

     return data?.map((item: any) => item.data) || [];
   },

  /**
   * Busca correções de um funcionário específico
   */
   getByEmployee: async (employeeId: string, year?: number, month?: number): Promise<AttendanceCorrection[]> => {
     const filters: any = {
       employee_id: employeeId
     };

     if (year && month) {
       const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
       const endDate = new Date(year, month, 0).toISOString().split('T')[0];
       filters.data_original_gte = startDate;
       filters.data_original_lte = endDate;
     }

     const { data, error } = await supabase
       .rpc('get_entity_data', {
         schema_name: 'rh',
         table_name: 'attendance_corrections',
         company_id_param: null,
         filters: filters,
         order_by: 'created_at',
         order_direction: 'DESC',
         limit_param: 100,
         offset_param: 0
       });

     if (error) {
       throw new Error(`Erro ao buscar correções do funcionário: ${error.message}`);
     }

     return data?.map((item: any) => item.data) || [];
   },

  /**
   * Busca estatísticas de correções
   */
   getStats: async (companyId: string, filters?: {
     data_inicio?: string;
     data_fim?: string;
     employee_id?: string;
   }): Promise<{
     total: number;
     pendentes: number;
     aprovadas: number;
     rejeitadas: number;
   }> => {
     const rpcFilters: any = {};
     
     if (filters?.data_inicio) {
       rpcFilters.data_original_gte = filters.data_inicio;
     }
     if (filters?.data_fim) {
       rpcFilters.data_original_lte = filters.data_fim;
     }
     if (filters?.employee_id) {
       rpcFilters.employee_id = filters.employee_id;
     }

     const { data, error } = await supabase
       .rpc('get_entity_data', {
         schema_name: 'rh',
         table_name: 'attendance_corrections',
         company_id_param: companyId,
         filters: rpcFilters,
         order_by: 'created_at',
         order_direction: 'DESC',
         limit_param: 1000,
         offset_param: 0
       });

     if (error) {
       throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
     }

     const records = data?.map((item: any) => item.data) || [];
     const stats = {
       total: records.length,
       pendentes: records.filter(c => c.status === 'pendente').length,
       aprovadas: records.filter(c => c.status === 'aprovado').length,
       rejeitadas: records.filter(c => c.status === 'rejeitado').length
     };

     return stats;
   },

  /**
   * Deleta correção (apenas se pendente)
   */
   delete: async (id: string): Promise<boolean> => {
     // Usar RPC function para deletar
     const { data, error } = await supabase.rpc('delete_entity_data', {
       schema_name: 'rh',
       table_name: 'attendance_corrections',
       record_id: id,
       additional_filters: {
         status: 'pendente' // Só permite deletar se estiver pendente
       }
     });

     if (error) {
       throw new Error(`Erro ao deletar correção: ${error.message}`);
     }

     return data;
   }
};
