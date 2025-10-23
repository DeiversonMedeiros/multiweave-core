import { useQuery } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { supabase } from '@/integrations/supabase/client';

interface CorrectionStatus {
  liberado: boolean;
  liberado_por?: string;
  liberado_em?: string;
  observacoes?: string;
  configuracoes: {
    dias_liberacao_correcao: number;
    permitir_correcao_futura: boolean;
    exigir_justificativa: boolean;
    permitir_correcao_apos_aprovacao: boolean;
    dias_limite_correcao: number;
  };
}

export function useEmployeeCorrectionStatus(year: number, month: number) {
  const { selectedCompany } = useCompany();
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  return useQuery({
    queryKey: ['employee-correction-status', user?.id, year, month, selectedCompany?.id],
    queryFn: async (): Promise<CorrectionStatus> => {
      if (!user?.id || !selectedCompany?.id) {
        throw new Error('Usuário não autenticado ou empresa não selecionada');
      }

      try {
        // Buscar funcionário pelo user_id
        const employeeResult = await EntityService.list({
          schema: 'rh',
          table: 'employees',
          companyId: selectedCompany.id,
          filters: { user_id: user.id },
          pageSize: 1
        });

        const employee = employeeResult.data?.[0];
        if (!employee) {
          throw new Error('Funcionário não encontrado');
        }

        // Chamar função RPC para verificar status
        const { data, error } = await supabase.rpc('get_correction_status', {
          p_employee_id: employee.id,
          p_year: year,
          p_month: month
        });

        if (error) {
          throw new Error(`Erro ao verificar status: ${error.message}`);
        }

        return data;
      } catch (error) {
        console.error('Erro ao verificar status de correção:', error);
        throw error;
      }
    },
    enabled: !!user?.id && !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false
  });
}

// Hook simplificado que retorna apenas se está liberado
export function useEmployeeCorrectionStatusSimple(year: number, month: number) {
  const { data, isLoading, error } = useEmployeeCorrectionStatus(year, month);
  
  return {
    correctionEnabled: data?.liberado || false,
    isLoading,
    error,
    configuracoes: data?.configuracoes
  };
}
