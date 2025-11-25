import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { ClasseFinanceiraConta, ClasseFinanceiraContaFormData } from '@/integrations/supabase/financial-types';
import { useCompany } from '@/lib/company-context';
import { queryConfig } from '@/lib/react-query-config';
import { useAuth } from '@/lib/auth-context';

/**
 * Hook para listar vinculações de classes financeiras com contas contábeis
 */
export function useClassesFinanceirasContas(classeFinanceiraId?: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['financeiro', 'classes_financeiras_contas', selectedCompany?.id, classeFinanceiraId],
    queryFn: async () => {
      const filters: Record<string, any> = {};
      if (classeFinanceiraId) {
        filters.classe_financeira_id = classeFinanceiraId;
      }
      
      const result = await EntityService.list<ClasseFinanceiraConta>({
        schema: 'financeiro',
        table: 'classes_financeiras_contas',
        companyId: selectedCompany?.id || '',
        filters,
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
 * Hook para buscar conta padrão de uma classe financeira
 */
export function useClasseFinanceiraContaPadrao(classeFinanceiraId: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['financeiro', 'classes_financeiras_contas', 'default', selectedCompany?.id, classeFinanceiraId],
    queryFn: async () => {
      const result = await EntityService.list<ClasseFinanceiraConta>({
        schema: 'financeiro',
        table: 'classes_financeiras_contas',
        companyId: selectedCompany?.id || '',
        filters: {
          classe_financeira_id: classeFinanceiraId,
          is_default: true
        },
        page: 1,
        pageSize: 1
      });
      return result.data?.[0] || null;
    },
    enabled: !!selectedCompany?.id && !!classeFinanceiraId,
    ...queryConfig.static,
  });
}

/**
 * Hook para criar vinculação classe financeira ↔ conta contábil
 */
export function useCreateClasseFinanceiraConta() {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ClasseFinanceiraContaFormData) => {
      // Se is_default for true, desmarcar outras como default
      if (data.is_default) {
        // Buscar outras vinculações da mesma classe
        const existing = await EntityService.list<ClasseFinanceiraConta>({
          schema: 'financeiro',
          table: 'classes_financeiras_contas',
          companyId: selectedCompany?.id || '',
          filters: {
            classe_financeira_id: data.classe_financeira_id,
            is_default: true
          },
          page: 1,
          pageSize: 100
        });

        // Desmarcar outras como default
        for (const item of existing.data || []) {
          await EntityService.update<ClasseFinanceiraConta>({
            schema: 'financeiro',
            table: 'classes_financeiras_contas',
            companyId: selectedCompany?.id || '',
            id: item.id,
            data: { is_default: false }
          });
        }
      }

      const result = await EntityService.create<ClasseFinanceiraConta>({
        schema: 'financeiro',
        table: 'classes_financeiras_contas',
        companyId: selectedCompany?.id || '',
        data: {
          ...data,
          company_id: selectedCompany?.id || '',
          is_default: data.is_default || false,
          created_by: user?.id
        }
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro', 'classes_financeiras_contas'] });
    }
  });
}

/**
 * Hook para atualizar vinculação classe financeira ↔ conta contábil
 */
export function useUpdateClasseFinanceiraConta() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ClasseFinanceiraContaFormData> }) => {
      // Se is_default for true, desmarcar outras como default
      if (data.is_default) {
        // Buscar a vinculação atual para pegar a classe_financeira_id
        const current = await EntityService.get<ClasseFinanceiraConta>({
          schema: 'financeiro',
          table: 'classes_financeiras_contas',
          companyId: selectedCompany?.id || '',
          id
        });

        if (current) {
          // Buscar outras vinculações da mesma classe
          const existing = await EntityService.list<ClasseFinanceiraConta>({
            schema: 'financeiro',
            table: 'classes_financeiras_contas',
            companyId: selectedCompany?.id || '',
            filters: {
              classe_financeira_id: current.classe_financeira_id,
              is_default: true
            },
            page: 1,
            pageSize: 100
          });

          // Desmarcar outras como default
          for (const item of existing.data || []) {
            if (item.id !== id) {
              await EntityService.update<ClasseFinanceiraConta>({
                schema: 'financeiro',
                table: 'classes_financeiras_contas',
                companyId: selectedCompany?.id || '',
                id: item.id,
                data: { is_default: false }
              });
            }
          }
        }
      }

      const result = await EntityService.update<ClasseFinanceiraConta>({
        schema: 'financeiro',
        table: 'classes_financeiras_contas',
        companyId: selectedCompany?.id || '',
        id,
        data
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro', 'classes_financeiras_contas'] });
    }
  });
}

/**
 * Hook para deletar vinculação classe financeira ↔ conta contábil
 */
export function useDeleteClasseFinanceiraConta() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await EntityService.delete({
        schema: 'financeiro',
        table: 'classes_financeiras_contas',
        companyId: selectedCompany?.id || '',
        id
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro', 'classes_financeiras_contas'] });
    }
  });
}

