import { supabase } from '@/integrations/supabase/client';

// =====================================================
// SERVIÇO DE CONFIGURAÇÕES DE PONTO ELETRÔNICO
// =====================================================
// Acessa funções do schema rh através de wrappers no schema public
// Seguindo o padrão: nunca acessar schemas não-públicos diretamente

export interface TimeRecordSettings {
  id: string;
  company_id: string;
  janela_tempo_marcacoes: number;
  created_at: string;
  updated_at: string;
}

export interface TimeWindowValidation {
  valid_date: string;
  is_new_record: boolean;
  first_mark_time: string | null;
  hours_elapsed: number;
  window_hours: number;
}

export const TimeRecordSettingsService = {
  /**
   * Busca configurações de ponto eletrônico
   * Usa função wrapper no schema public que chama rh.get_time_record_settings
   */
  getSettings: async (companyId: string): Promise<TimeRecordSettings | null> => {
    try {
      // Função wrapper no schema public acessível via REST API
      const { data, error } = await supabase.rpc('get_time_record_settings', {
        p_company_id: companyId
      });

      if (error) {
        console.error('Erro ao buscar configurações de ponto:', error);
        // Retornar configuração padrão em caso de erro
        return {
          id: '',
          company_id: companyId,
          janela_tempo_marcacoes: 24,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      return data && data.length > 0 ? data[0] : {
        id: '',
        company_id: companyId,
        janela_tempo_marcacoes: 24,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro ao buscar configurações de ponto:', error);
      return {
        id: '',
        company_id: companyId,
        janela_tempo_marcacoes: 24,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  },

  /**
   * Valida janela de tempo para registro de ponto
   * Usa função wrapper no schema public que chama rh.validate_time_record_window
   */
  validateTimeWindow: async (
    employeeId: string,
    companyId: string,
    currentDate: string,
    currentTime: string
  ): Promise<TimeWindowValidation | null> => {
    try {
      // Função wrapper no schema public acessível via REST API
      const { data, error } = await supabase.rpc('validate_time_record_window', {
        p_employee_id: employeeId,
        p_company_id: companyId,
        p_current_date: currentDate,
        p_current_time: currentTime
      });

      if (error) {
        console.error('Erro ao validar janela de tempo:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Erro ao validar janela de tempo:', error);
      return null;
    }
  }
};

