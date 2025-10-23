import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';

// =====================================================
// INTERFACES
// =====================================================

export interface EntradaMaterial {
  id: string;
  company_id: string;
  almoxarifado_id: string;
  fornecedor_id?: string;
  numero_nota: string;
  serie_nota?: string;
  chave_acesso_nfe?: string;
  data_entrada: string;
  data_emissao_nfe?: string;
  valor_total_nfe: number;
  status: 'pendente' | 'aprovada' | 'rejeitada' | 'cancelada';
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface EntradaItem {
  id: string;
  entrada_material_id: string;
  material_equipamento_id: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  lote?: string;
  data_validade?: string;
  centro_custo_id?: string;
  projeto_id?: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar entradas de materiais
 */
export function useEntradasMateriais(filters?: any) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['almoxarifado', 'entradas_materiais', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      
      const result = await EntityService.list<EntradaMaterial>({
        schema: 'almoxarifado',
        table: 'entradas_materiais',
        companyId: selectedCompany.id,
        filters: filters || {},
        orderBy: 'data_entrada',
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
 * Hook para criar entrada de material
 */
export function useCreateEntradaMaterial() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: Omit<EntradaMaterial, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      return await EntityService.create<EntradaMaterial>('almoxarifado', 'entradas_materiais', {
        ...data,
        company_id: selectedCompany.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'entradas_materiais'] });
    },
  });
}

/**
 * Hook para atualizar entrada de material
 */
export function useUpdateEntradaMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EntradaMaterial> }) => {
      return await EntityService.update<EntradaMaterial>('almoxarifado', 'entradas_materiais', id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'entradas_materiais'] });
    },
  });
}

/**
 * Hook para deletar entrada de material
 */
export function useDeleteEntradaMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await EntityService.delete('almoxarifado', 'entradas_materiais', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'entradas_materiais'] });
    },
  });
}
