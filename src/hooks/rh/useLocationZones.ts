// =====================================================
// HOOKS PARA ZONAS DE LOCALIZAÇÃO
// =====================================================
// Descrição: Hooks para gerenciar zonas de localização usando EntityService
//            Segue o padrão do sistema

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/lib/company-context';
import { LocationZonesService, LocationZone, LocationZoneCreate, LocationZoneUpdate } from '@/services/rh/locationZonesService';
import { toast } from 'sonner';

/**
 * Hook para listar zonas de localização
 */
export function useLocationZones(filters?: { ativo?: boolean }) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['location-zones', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) {
        return [];
      }
      return await LocationZonesService.list(selectedCompany.id, filters);
    },
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar zona por ID
 */
export function useLocationZone(id: string | undefined) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['location-zone', id, selectedCompany?.id],
    queryFn: async () => {
      if (!id || !selectedCompany?.id) {
        return null;
      }
      return await LocationZonesService.getById(id, selectedCompany.id);
    },
    enabled: !!id && !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar zona ativa
 */
export function useActiveLocationZone() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['active-location-zone', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) {
        return null;
      }
      return await LocationZonesService.getActiveZone(selectedCompany.id);
    },
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para criar zona de localização
 */
export function useCreateLocationZone() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: Omit<LocationZoneCreate, 'company_id'>) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      return await LocationZonesService.create({
        ...data,
        company_id: selectedCompany.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-zones'] });
      queryClient.invalidateQueries({ queryKey: ['active-location-zone'] });
      toast.success('Zona de localização criada com sucesso');
    },
    onError: (error: any) => {
      console.error('Erro ao criar zona:', error);
      toast.error('Erro ao criar zona de localização');
    },
  });
}

/**
 * Hook para atualizar zona de localização
 */
export function useUpdateLocationZone() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: LocationZoneUpdate }) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      return await LocationZonesService.update(id, selectedCompany.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-zones'] });
      queryClient.invalidateQueries({ queryKey: ['active-location-zone'] });
      queryClient.invalidateQueries({ queryKey: ['location-zone'] });
      toast.success('Zona de localização atualizada com sucesso');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar zona:', error);
      toast.error('Erro ao atualizar zona de localização');
    },
  });
}

/**
 * Hook para deletar zona de localização
 */
export function useDeleteLocationZone() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      await LocationZonesService.delete(id, selectedCompany.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-zones'] });
      queryClient.invalidateQueries({ queryKey: ['active-location-zone'] });
      toast.success('Zona de localização excluída com sucesso');
    },
    onError: (error: any) => {
      console.error('Erro ao deletar zona:', error);
      toast.error('Erro ao excluir zona de localização');
    },
  });
}

