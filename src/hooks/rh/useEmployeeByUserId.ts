import { useQuery } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';

export interface Employee {
  id: string;
  user_id: string;
  company_id: string;
  nome: string;
  matricula: string;
  cpf: string;
  email: string;
  telefone?: string;
  data_admissao: string;
  cargo_id?: string;
  unidade_id?: string;
  salario?: number;
  status: 'ativo' | 'inativo' | 'afastado' | 'demitido';
  created_at: string;
  updated_at: string;
}

export function useEmployeeByUserId(userId: string) {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['employee-by-user-id', userId, selectedCompany?.id],
    queryFn: async (): Promise<Employee | null> => {
      if (!userId) {
        console.log('🔍 [useEmployeeByUserId] UserId faltando');
        return null;
      }

      try {
        // Primeiro, tentar buscar na empresa selecionada
        if (selectedCompany?.id) {
          console.log('🔍 [useEmployeeByUserId] Buscando funcionário na empresa selecionada:', { 
            userId, 
            companyId: selectedCompany.id 
          });
          
          const result = await EntityService.list({
            schema: 'rh',
            table: 'employees',
            companyId: selectedCompany.id,
            filters: { user_id: userId },
            pageSize: 1
          });

          if (result.data && result.data.length > 0) {
            console.log('✅ [useEmployeeByUserId] Funcionário encontrado na empresa selecionada');
            return result.data[0];
          }
        }

        // Se não encontrou, buscar em todas as empresas do usuário
        console.log('🔍 [useEmployeeByUserId] Funcionário não encontrado na empresa selecionada, buscando em todas as empresas...');
        
        // Buscar empresas do usuário
        const { data: userCompanies, error: userCompaniesError } = await supabase
          .from('user_companies')
          .select('company_id')
          .eq('user_id', userId)
          .eq('ativo', true);

        if (userCompaniesError) {
          console.error('❌ [useEmployeeByUserId] Erro ao buscar empresas do usuário:', userCompaniesError);
        }

        if (userCompanies && userCompanies.length > 0) {
          // Tentar buscar em cada empresa
          for (const uc of userCompanies) {
            try {
              const result = await EntityService.list({
                schema: 'rh',
                table: 'employees',
                companyId: uc.company_id,
                filters: { user_id: userId },
                pageSize: 1
              });

              if (result.data && result.data.length > 0) {
                console.log('✅ [useEmployeeByUserId] Funcionário encontrado na empresa:', uc.company_id);
                return result.data[0];
              }
            } catch (error) {
              console.warn('⚠️ [useEmployeeByUserId] Erro ao buscar na empresa:', uc.company_id, error);
            }
          }
        }

        console.log('❌ [useEmployeeByUserId] Funcionário não encontrado em nenhuma empresa');
        return null;
      } catch (error) {
        console.error('❌ [useEmployeeByUserId] Erro ao buscar funcionário:', error);
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false
  });
}
