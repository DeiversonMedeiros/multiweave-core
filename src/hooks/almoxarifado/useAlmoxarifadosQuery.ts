import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlmoxarifadoService, Almoxarifado } from '@/services/almoxarifado/almoxarifadoService';
import { useCompany } from '@/lib/company-context';

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar almoxarifados
 */
export function useAlmoxarifados() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['almoxarifado', 'almoxarifados', selectedCompany?.id],
    queryFn: () => AlmoxarifadoService.listAlmoxarifados(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar almoxarifado por ID
 */
export function useAlmoxarifado(id: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['almoxarifado', 'almoxarifados', id],
    queryFn: () => AlmoxarifadoService.getAlmoxarifadoById(id, selectedCompany?.id || ''),
    enabled: !!id && !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Hook para criar almoxarifado
 */
export function useCreateAlmoxarifado() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: Omit<Almoxarifado, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      return await AlmoxarifadoService.createAlmoxarifado({
        ...data,
        company_id: selectedCompany?.id || ''
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'almoxarifados'] });
    },
  });
}

/**
 * Hook para atualizar almoxarifado
 */
export function useUpdateAlmoxarifado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Almoxarifado> }) => {
      return await AlmoxarifadoService.updateAlmoxarifado(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'almoxarifados'] });
    },
  });
}

/**
 * Hook para deletar almoxarifado
 */
export function useDeleteAlmoxarifado() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await AlmoxarifadoService.deleteAlmoxarifado(id, selectedCompany.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'almoxarifados'] });
    },
  });
}
