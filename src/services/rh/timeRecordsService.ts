import { supabase } from '@/integrations/supabase/client';
import { 
  TimeRecord, 
  TimeRecordInsert, 
  TimeRecordUpdate 
} from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE REGISTROS DE PONTO
// =====================================================

export const TimeRecordsService = {
  /**
   * Lista todos os registros de ponto de uma empresa
   */
  list: async (params: { 
    employeeId?: string;
    companyId: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) => {
    const { data, error } = await supabase.rpc('get_time_records_simple', {
      company_id_param: params.companyId
    });

    if (error) {
      console.error('Erro ao buscar registros de ponto:', error);
      throw error;
    }

    // Aplicar filtros no lado do cliente
    let filteredData = data || [];
    
    if (params.employeeId) {
      filteredData = filteredData.filter(record => record.employee_id === params.employeeId);
    }
    
    if (params.startDate) {
      filteredData = filteredData.filter(record => record.data_registro >= params.startDate);
    }
    
    if (params.endDate) {
      filteredData = filteredData.filter(record => record.data_registro <= params.endDate);
    }
    
    if (params.status) {
      filteredData = filteredData.filter(record => record.status === params.status);
    }

    return filteredData;
  },

  /**
   * Busca um registro de ponto por ID
   */
  getById: async (id: string, companyId: string): Promise<TimeRecord | null> => {
    const { data, error } = await supabase.rpc('get_time_records_simple', {
      company_id_param: companyId
    });

    if (error) {
      console.error('Erro ao buscar registro de ponto:', error);
      throw error;
    }

    const record = data?.find((r: TimeRecord) => r.id === id);
    return record || null;
  },

  /**
   * Cria um novo registro de ponto
   */
  create: async (record: TimeRecordInsert): Promise<TimeRecord> => {
    const { data, error } = await supabase
      .from('time_records')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar registro de ponto:', error);
      throw error;
    }

    return data;
  },

  /**
   * Atualiza um registro de ponto
   */
  update: async (id: string, record: TimeRecordUpdate): Promise<TimeRecord> => {
    const { data, error } = await supabase
      .from('time_records')
      .update(record)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar registro de ponto:', error);
      throw error;
    }

    return data;
  },

  /**
   * Remove um registro de ponto
   */
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('time_records')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao remover registro de ponto:', error);
      throw error;
    }
  },

  /**
   * Aprova um registro de ponto
   */
  approve: async (id: string, approvedBy: string): Promise<TimeRecord> => {
    const { data, error } = await supabase
      .from('time_records')
      .update({
        status: 'aprovado',
        aprovado_por: approvedBy,
        aprovado_em: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao aprovar registro de ponto:', error);
      throw error;
    }

    return data;
  },

  /**
   * Rejeita um registro de ponto
   */
  reject: async (id: string, reason: string, rejectedBy: string): Promise<TimeRecord> => {
    const { data, error } = await supabase
      .from('time_records')
      .update({
        status: 'rejeitado',
        observacoes: reason,
        aprovado_por: rejectedBy,
        aprovado_em: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao rejeitar registro de ponto:', error);
      throw error;
    }

    return data;
  },

  /**
   * Registra entrada de um funcionário
   */
  clockIn: async (employeeId: string, timestamp: Date): Promise<TimeRecord> => {
    const today = timestamp.toISOString().split('T')[0];
    
    // Verificar se já existe registro para hoje
    const { data: existingRecord } = await supabase
      .from('time_records')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('data_registro', today)
      .single();

    if (existingRecord) {
      // Atualizar entrada
      const { data, error } = await supabase
        .from('time_records')
        .update({ entrada: timestamp.toTimeString().split(' ')[0] })
        .eq('id', existingRecord.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Criar novo registro
      const { data, error } = await supabase
        .from('time_records')
        .insert({
          employee_id: employeeId,
          data_registro: today,
          entrada: timestamp.toTimeString().split(' ')[0],
          status: 'pendente'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  /**
   * Registra saída de um funcionário
   */
  clockOut: async (employeeId: string, timestamp: Date): Promise<TimeRecord> => {
    const today = timestamp.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('time_records')
      .update({ saida: timestamp.toTimeString().split(' ')[0] })
      .eq('employee_id', employeeId)
      .eq('data_registro', today)
      .select()
      .single();

    if (error) {
      console.error('Erro ao registrar saída:', error);
      throw error;
    }

    return data;
  },

  /**
   * Registra entrada de almoço
   */
  clockInLunch: async (employeeId: string, timestamp: Date): Promise<TimeRecord> => {
    const today = timestamp.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('time_records')
      .update({ entrada_almoco: timestamp.toTimeString().split(' ')[0] })
      .eq('employee_id', employeeId)
      .eq('data_registro', today)
      .select()
      .single();

    if (error) {
      console.error('Erro ao registrar entrada do almoço:', error);
      throw error;
    }

    return data;
  },

  /**
   * Registra saída de almoço
   */
  clockOutLunch: async (employeeId: string, timestamp: Date): Promise<TimeRecord> => {
    const today = timestamp.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('time_records')
      .update({ saida_almoco: timestamp.toTimeString().split(' ')[0] })
      .eq('employee_id', employeeId)
      .eq('data_registro', today)
      .select()
      .single();

    if (error) {
      console.error('Erro ao registrar saída do almoço:', error);
      throw error;
    }

    return data;
  },

  /**
   * Registra primeira entrada de horas extras
   */
  clockInExtra1: async (employeeId: string, timestamp: Date): Promise<TimeRecord> => {
    const today = timestamp.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('time_records')
      .update({ entrada_extra1: timestamp.toTimeString().split(' ')[0] })
      .eq('employee_id', employeeId)
      .eq('data_registro', today)
      .select()
      .single();

    if (error) {
      console.error('Erro ao registrar entrada extra 1:', error);
      throw error;
    }

    return data;
  },

  /**
   * Registra primeira saída de horas extras
   */
  clockOutExtra1: async (employeeId: string, timestamp: Date): Promise<TimeRecord> => {
    const today = timestamp.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('time_records')
      .update({ saida_extra1: timestamp.toTimeString().split(' ')[0] })
      .eq('employee_id', employeeId)
      .eq('data_registro', today)
      .select()
      .single();

    if (error) {
      console.error('Erro ao registrar saída extra 1:', error);
      throw error;
    }

    return data;
  },

};