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
  entrada_almoco_original?: string;
  saida_almoco_original?: string;
  entrada_almoco_corrigida?: string;
  saida_almoco_corrigida?: string;
  entrada_extra1_original?: string;
  saida_extra1_original?: string;
  entrada_extra1_corrigida?: string;
  saida_extra1_corrigida?: string;
  justificativa: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  solicitado_por?: string;
  aprovado_por?: string;
  aprovado_em?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  funcionario_nome?: string;
  funcionario_matricula?: string;
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
    console.log('🔍 [AttendanceCorrectionsService.approve] Iniciando aprovação:', {
      correction_id: id,
      approved_by: approvedBy,
      observacoes
    });

    const { data, error } = await supabase.rpc('approve_attendance_correction', {
      p_correction_id: id,
      p_approved_by: approvedBy,
      p_observacoes: observacoes
    });

    console.log('📊 [AttendanceCorrectionsService.approve] Resposta RPC:', { data, error });

    if (error) {
      const msg = error.message || '';
      const details = (error as { details?: string }).details ?? '';
      const fullMessage = details ? `${msg}. ${details}` : msg;
      console.error('[AttendanceCorrectionsService.approve] Erro na RPC:', {
        code: error.code,
        message: msg,
        details,
        hint: error.hint
      });

      // Tratar erro 409 (Conflict) especificamente
      if (error.code === '23505' || msg.includes('já foi aprovada') || msg.includes('já foi processada') || msg.includes('já foi rejeitada')) {
        throw new Error('Esta correção já foi aprovada ou processada anteriormente.');
      }
      if (msg.includes('não está pendente')) {
        throw new Error('Esta correção não está mais pendente e não pode ser aprovada.');
      }
      if (error.code === '42501' || msg.includes('não tem acesso')) {
        throw new Error('Você não tem permissão para aprovar esta correção.');
      }
      if (msg.includes('numeric field overflow') || msg.includes('overflow')) {
        throw new Error('Erro interno ao calcular horas. As migrações de correção (20260203000001/20260203000002) podem não estar aplicadas no banco. Contate o suporte.');
      }
      throw new Error(fullMessage || `Erro ao aprovar correção (${error.code || 'RPC'}).`);
    }

    console.log('[AttendanceCorrectionsService.approve] Aprovacao bem-sucedida:', data);
    return data === true;
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
   getPending: async (companyId: string): Promise<any[]> => {
     console.log('🔍 [getPending] Buscando correções pendentes para companyId:', companyId);
     
     try {
       // Buscar o ID do usuário autenticado
       const { data: { user } } = await supabase.auth.getUser();
       if (!user?.id) {
         throw new Error('Usuário não autenticado');
       }

       console.log('👤 [getPending] Usuário:', user.id);

       // Usar função RPC específica que retorna correções pendentes dos funcionários do gestor
       // com dados completos e informações dos funcionários
       const { data: correctionsData, error: correctionsError } = await supabase.rpc('get_pending_attendance_corrections', {
         p_company_id: companyId,
         p_user_id: user.id
       });

       if (correctionsError) {
         console.error('❌ [getPending] Erro ao buscar correções:', correctionsError);
         
         // Fallback: tentar usar get_pending_approvals_for_user
         try {
           const { data: { user } } = await supabase.auth.getUser();
           if (user?.id) {
             const { data: approvalsData, error: approvalsError } = await supabase.rpc('get_pending_approvals_for_user', {
               p_user_id: user.id,
               p_company_id: companyId
             });

             if (!approvalsError && approvalsData) {
               const correctionsFromApprovals = (approvalsData || [])
                 .filter((item: any) => item.tipo === 'correcao_ponto')
                 .map((item: any) => {
                   const dataMatch = item.descricao?.match(/Correção de ponto para (\d{4}-\d{2}-\d{2})/);
                   const dataOriginal = dataMatch ? dataMatch[1] : '';
                   
                   return {
                     id: item.id,
                     employee_id: '',
                     company_id: companyId,
                     data_original: dataOriginal,
                     entrada_original: null,
                     saida_original: null,
                     entrada_corrigida: null,
                     saida_corrigida: null,
                     justificativa: '',
                     status: item.status,
                     funcionario_nome: item.funcionario_nome || 'N/A',
                     funcionario_matricula: item.funcionario_matricula || 'N/A',
                     observacoes: item.observacoes || null,
                     created_at: item.data_solicitacao,
                     updated_at: item.data_solicitacao
                   };
                 });
               
               console.log('✅ [getPending] Usando fallback, encontradas:', correctionsFromApprovals.length);
               return correctionsFromApprovals;
             }
           }
         } catch (fallbackError) {
           console.error('❌ [getPending] Erro no fallback:', fallbackError);
         }
         
         throw new Error(`Erro ao buscar correções pendentes: ${correctionsError.message}`);
       }

       console.log('✅ [getPending] Correções encontradas:', correctionsData?.length || 0);
       console.log('📊 [getPending] Primeira correção (sample):', correctionsData?.[0]);
       
       return correctionsData || [];
       
     } catch (error) {
       console.error('❌ [getPending] Erro geral:', error);
       throw new Error(`Erro ao buscar correções pendentes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
     }

     // Buscar dados dos funcionários
     const employeeIds = [...new Set(corrections.map((c: any) => c.employee_id).filter(Boolean))];
     
     if (employeeIds.length === 0) {
       return corrections;
     }

     const { data: employeesData, error: employeesError } = await supabase
       .rpc('get_entity_data', {
         schema_name: 'rh',
         table_name: 'employees',
         company_id_param: companyId,
         filters: {},
         order_by: 'created_at',
         order_direction: 'ASC',
         limit_param: 1000,
         offset_param: 0
       });

     if (employeesError) {
       console.warn('Erro ao buscar funcionários:', employeesError);
       return corrections;
     }

     const employees = employeesData?.map((item: any) => item.data) || [];
     const employeeMap = new Map(employees.map((emp: any) => [emp.id, emp]));

     // Adicionar dados dos funcionários às correções
     return corrections.map((correction: any) => {
       const employee = employeeMap.get(correction.employee_id);
       return {
         ...correction,
         funcionario_nome: employee?.nome || 'N/A',
         funcionario_matricula: employee?.matricula || 'N/A'
       };
     });
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
   * Busca estatísticas de correções (filtradas por gestor)
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
     // Buscar o ID do usuário autenticado
     const { data: { user } } = await supabase.auth.getUser();
     if (!user?.id) {
       throw new Error('Usuário não autenticado');
     }

     // Usar função RPC específica que retorna estatísticas filtradas por gestor
     const { data, error } = await supabase.rpc('get_attendance_corrections_stats_for_manager', {
       p_company_id: companyId,
       p_user_id: user.id
     });

     if (error) {
       console.error('❌ [getStats] Erro ao buscar estatísticas:', error);
       throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
     }

     // A função retorna um array com um único objeto
     const stats = data?.[0] || {
       total: 0,
       pendentes: 0,
       aprovadas: 0,
       rejeitadas: 0
     };

     return {
       total: Number(stats.total) || 0,
       pendentes: Number(stats.pendentes) || 0,
       aprovadas: Number(stats.aprovadas) || 0,
       rejeitadas: Number(stats.rejeitadas) || 0
     };
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
