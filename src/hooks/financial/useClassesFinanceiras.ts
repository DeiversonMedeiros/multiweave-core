import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { ClasseFinanceira, ClasseFinanceiraFormData } from '@/integrations/supabase/financial-types';
import { useCompany } from '@/lib/company-context';
import { queryConfig } from '@/lib/react-query-config';
import { useAuth } from '@/lib/auth-context';

/**
 * Hook para listar classes financeiras
 */
export function useClassesFinanceiras() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['financeiro', 'classes_financeiras', selectedCompany?.id],
    queryFn: async () => {
      const result = await EntityService.list<ClasseFinanceira>({
        schema: 'financeiro',
        table: 'classes_financeiras',
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
 * Hook para buscar classes financeiras ativas
 */
export function useActiveClassesFinanceiras() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['financeiro', 'classes_financeiras', 'active', selectedCompany?.id],
    queryFn: async () => {
      const result = await EntityService.list<ClasseFinanceira>({
        schema: 'financeiro',
        table: 'classes_financeiras',
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
 * Hook para buscar classes financeiras hierárquicas (árvore)
 */
export function useClassesFinanceirasHierarquicas() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['financeiro', 'classes_financeiras', 'hierarquicas', selectedCompany?.id],
    queryFn: async () => {
      const result = await EntityService.list<ClasseFinanceira>({
        schema: 'financeiro',
        table: 'classes_financeiras',
        companyId: selectedCompany?.id || '',
        filters: { is_active: true },
        page: 1,
        pageSize: 1000,
        orderBy: 'codigo',
        orderDirection: 'ASC'
      });
      
      // Organizar em hierarquia
      const classes = result.data || [];
      const rootClasses = classes.filter(c => !c.classe_pai_id);
      
      const buildTree = (parentId?: string): ClasseFinanceira[] => {
        return classes
          .filter(c => c.classe_pai_id === parentId)
          .sort((a, b) => a.ordem - b.ordem)
          .map(classe => ({
            ...classe,
            children: buildTree(classe.id)
          }));
      };
      
      return {
        ...result,
        data: rootClasses.map(root => ({
          ...root,
          children: buildTree(root.id)
        }))
      };
    },
    enabled: !!selectedCompany?.id,
    ...queryConfig.static,
  });
}

/**
 * Hook para criar classe financeira
 */
export function useCreateClasseFinanceira() {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ClasseFinanceiraFormData) => {
      const result = await EntityService.create<ClasseFinanceira>({
        schema: 'financeiro',
        table: 'classes_financeiras',
        companyId: selectedCompany?.id || '',
        data: {
          ...data,
          company_id: selectedCompany?.id || '',
          nivel: data.classe_pai_id ? 2 : 1, // Será calculado pela função
          ordem: data.ordem || 0,
          is_active: true,
          created_by: user?.id
        }
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro', 'classes_financeiras'] });
    }
  });
}

/**
 * Hook para atualizar classe financeira
 */
export function useUpdateClasseFinanceira() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ClasseFinanceiraFormData> }) => {
      const result = await EntityService.update<ClasseFinanceira>({
        schema: 'financeiro',
        table: 'classes_financeiras',
        companyId: selectedCompany?.id || '',
        id,
        data
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro', 'classes_financeiras'] });
    }
  });
}

/**
 * Hook para deletar classe financeira (soft delete)
 */
export function useDeleteClasseFinanceira() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await EntityService.update<ClasseFinanceira>({
        schema: 'financeiro',
        table: 'classes_financeiras',
        companyId: selectedCompany?.id || '',
        id,
        data: { is_active: false }
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro', 'classes_financeiras'] });
    }
  });
}

/**
 * Hook para inserir classes financeiras padrão (Telecom)
 */
export function useInsertClassesFinanceirasTelecom() {
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
        p_function_name: 'insert_classes_financeiras_telecom',
        p_params: {
          p_company_id: selectedCompany.id,
          p_created_by: user?.id || null
        }
      });
      
      if (error) throw error;
      
      // Verificar se houve erro na execução
      if (data?.error) {
        throw new Error(data.message || 'Erro ao inserir classes financeiras');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro', 'classes_financeiras'] });
    },
    ...queryConfig.mutation,
  });
}

