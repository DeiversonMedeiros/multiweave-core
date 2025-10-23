import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';

// =====================================================
// INTERFACES
// =====================================================

export interface Inventario {
  id: string;
  company_id: string;
  almoxarifado_id: string;
  tipo: 'geral' | 'ciclico' | 'rotativo';
  data_inicio: string;
  data_fim?: string;
  responsavel_id?: string;
  status: 'aberto' | 'em_andamento' | 'concluido' | 'cancelado';
  total_itens: number;
  itens_contados: number;
  divergencias: number;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface InventarioItem {
  id: string;
  inventario_id: string;
  material_equipamento_id: string;
  quantidade_sistema: number;
  quantidade_contada: number;
  divergencia: number;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar inventários
 */
export function useInventarios(filters?: any) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['almoxarifado', 'inventarios', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      
      const result = await EntityService.list<Inventario>({
        schema: 'almoxarifado',
        table: 'inventarios',
        companyId: selectedCompany.id,
        filters: filters || {},
        orderBy: 'data_inicio',
        orderDirection: 'DESC'
      });
      
      return result.data;
    },
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Hook para criar inventário
 */
export function useCreateInventario() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: Omit<Inventario, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      return await EntityService.create<Inventario>('almoxarifado', 'inventarios', {
        ...data,
        company_id: selectedCompany.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'inventarios'] });
    },
  });
}

/**
 * Hook para atualizar inventário
 */
export function useUpdateInventario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Inventario> }) => {
      return await EntityService.update<Inventario>('almoxarifado', 'inventarios', id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'inventarios'] });
    },
  });
}

/**
 * Hook para deletar inventário
 */
export function useDeleteInventario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await EntityService.delete('almoxarifado', 'inventarios', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'inventarios'] });
    },
  });
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

/**
 * Hook que retorna funções auxiliares para trabalhar com inventários
 */
export function useInventario() {
  const { data: inventarios = [], isLoading: loading, error, refetch } = useInventarios();
  const { selectedCompany } = useCompany();
  const createInventarioMutation = useCreateInventario();
  const updateInventarioMutation = useUpdateInventario();
  const deleteInventarioMutation = useDeleteInventario();

  const createInventario = async (data: Omit<Inventario, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
    return await createInventarioMutation.mutateAsync({
      ...data,
      company_id: selectedCompany?.id || ''
    });
  };

  const iniciarInventario = async (id: string) => {
    return await updateInventarioMutation.mutateAsync({
      id,
      data: { status: 'em_andamento' }
    });
  };

  const finalizarInventario = async (id: string) => {
    return await updateInventarioMutation.mutateAsync({
      id,
      data: { status: 'concluido', data_fim: new Date().toISOString() }
    });
  };

  const cancelarInventario = async (id: string) => {
    return await updateInventarioMutation.mutateAsync({
      id,
      data: { status: 'cancelado' }
    });
  };

  const getResumoInventario = () => {
    const resumo = {
      total_inventarios: inventarios.length,
      inventarios_abertos: inventarios.filter(i => i.status === 'aberto').length,
      inventarios_em_andamento: inventarios.filter(i => i.status === 'em_andamento').length,
      inventarios_concluidos: inventarios.filter(i => i.status === 'concluido').length,
      inventarios_cancelados: inventarios.filter(i => i.status === 'cancelado').length,
      total_itens: inventarios.reduce((sum, i) => sum + i.total_itens, 0),
      itens_contados: inventarios.reduce((sum, i) => sum + i.itens_contados, 0),
      total_divergencias: inventarios.reduce((sum, i) => sum + i.divergencias, 0)
    };

    return resumo;
  };

  return {
    inventarios,
    loading,
    error,
    refetch,
    createInventario,
    iniciarInventario,
    finalizarInventario,
    cancelarInventario,
    getResumoInventario
  };
}