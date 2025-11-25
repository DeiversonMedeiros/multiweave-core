import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { PlanoContas } from '@/integrations/supabase/financial-types';
import { useCompany } from '@/lib/company-context';
import { queryConfig } from '@/lib/react-query-config';
import { useAuth } from '@/lib/auth-context';

/**
 * Hook para listar plano de contas (classe financeira)
 */
export function usePlanoContas() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['financeiro', 'plano_contas', selectedCompany?.id],
    queryFn: async () => {
      const result = await EntityService.list<PlanoContas>({
        schema: 'financeiro',
        table: 'plano_contas',
        companyId: selectedCompany?.id || '',
        filters: { is_active: true },
        page: 1,
        pageSize: 1000
      });
      return result;
    },
    enabled: !!selectedCompany?.id,
    ...queryConfig.static,
  });
}

/**
 * Hook para buscar plano de contas ativos
 */
export function useActivePlanoContas() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['financeiro', 'plano_contas', 'active', selectedCompany?.id],
    queryFn: async () => {
      const result = await EntityService.list<PlanoContas>({
        schema: 'financeiro',
        table: 'plano_contas',
        companyId: selectedCompany?.id || '',
        filters: { is_active: true },
        page: 1,
        pageSize: 1000
      });
      return result;
    },
    enabled: !!selectedCompany?.id,
    ...queryConfig.static,
  });
}

/**
 * Hook para inserir plano de contas padrão (Telecom)
 */
export function useInsertPlanoContasTelecom() {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!selectedCompany?.id) {
        throw new Error('Company not selected.');
      }
      
      // Chamar função RPC do schema financeiro via função genérica
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.rpc('call_schema_rpc', {
        p_schema_name: 'financeiro',
        p_function_name: 'insert_plano_contas_telecom',
        p_params: {
          p_company_id: selectedCompany.id,
          p_created_by: user?.id || null
        }
      });
      
      if (error) throw error;
      
      // Verificar se houve erro na execução
      if (data?.error) {
        throw new Error(data.message || 'Erro ao inserir plano de contas');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro', 'plano_contas'] });
    },
    ...queryConfig.mutation,
  });
}

