import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlmoxarifadoService, MaterialEquipamento } from '@/services/almoxarifado/almoxarifadoService';
import { useCompany } from '@/lib/company-context';

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar materiais e equipamentos
 */
export function useMateriaisEquipamentos(filters?: any) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['almoxarifado', 'materiais_equipamentos', selectedCompany?.id, filters],
    queryFn: () => AlmoxarifadoService.listMateriaisEquipamentos(selectedCompany?.id || '', filters),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Hook para criar material/equipamento
 */
export function useCreateMaterialEquipamento() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: Omit<MaterialEquipamento, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      return await AlmoxarifadoService.createMaterialEquipamento({
        ...data,
        company_id: selectedCompany?.id || ''
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'materiais_equipamentos'] });
    },
  });
}

/**
 * Hook para atualizar material/equipamento
 */
export function useUpdateMaterialEquipamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MaterialEquipamento> }) => {
      return await AlmoxarifadoService.updateMaterialEquipamento(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'materiais_equipamentos'] });
    },
  });
}

/**
 * Hook para deletar material/equipamento
 */
export function useDeleteMaterialEquipamento() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await AlmoxarifadoService.deleteMaterialEquipamento(id, selectedCompany.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'materiais_equipamentos'] });
    },
  });
}
