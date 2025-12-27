// =====================================================
// HOOKS PARA MÓDULO FROTA
// Sistema ERP MultiWeave Core
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { toast } from 'sonner';
import { queryConfig } from '@/lib/react-query-config';

// =====================================================
// 1. HOOKS PARA VEÍCULOS
// =====================================================

export const useVehicles = (filters?: {
  tipo?: string;
  situacao?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) => {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['frota', 'vehicles', selectedCompany?.id, filters],
    queryFn: async () => {
      console.log('🚗 [DEBUG] useVehicles - Iniciando busca de veículos');
      console.log('🚗 [DEBUG] useVehicles - selectedCompany:', selectedCompany);
      console.log('🚗 [DEBUG] useVehicles - filters:', filters);
      
      if (!selectedCompany?.id) {
        console.error('🚗 [ERROR] useVehicles - Empresa não selecionada');
        throw new Error('Empresa não selecionada');
      }
      
      console.log('🚗 [DEBUG] useVehicles - Chamando EntityService.list');
      const result = await EntityService.list({
        schema: 'frota',
        table: 'vehicles',
        companyId: selectedCompany.id,
        filters: filters || {}
      });
      
      console.log('🚗 [DEBUG] useVehicles - Resultado recebido:', result);
      console.log('🚗 [DEBUG] useVehicles - Dados retornados:', result.data);
      
      return result.data;
    },
    enabled: !!selectedCompany?.id,
    ...queryConfig.semiStatic,
  });
};

export const useVehicle = (vehicleId: string) => {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['frota', 'vehicle', vehicleId, selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id || !vehicleId) {
        return null;
      }
      
      const result = await EntityService.getById({
        schema: 'frota',
        table: 'vehicles',
        companyId: selectedCompany.id,
        id: vehicleId
      });
      
      // EntityService.getById já retorna o objeto diretamente ou null
      return result || null;
    },
    enabled: !!selectedCompany?.id && !!vehicleId,
  });
};

export const useCreateVehicle = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: any) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.create({
        schema: 'frota',
        table: 'vehicles',
        companyId: selectedCompany.id,
        data
      });
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frota', 'vehicles'] });
      toast.success('Veículo criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar veículo: ' + error.message);
    },
  });
};

export const useUpdateVehicle = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.update({
        schema: 'frota',
        table: 'vehicles',
        companyId: selectedCompany.id,
        id,
        data
      });
      
      return result.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['frota', 'vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['frota', 'vehicle', id] });
      toast.success('Veículo atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar veículo: ' + error.message);
    },
  });
};

export const useDeleteVehicle = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.delete({
        schema: 'frota',
        table: 'vehicles',
        companyId: selectedCompany.id,
        id
      });
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frota', 'vehicles'] });
      toast.success('Veículo excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir veículo: ' + error.message);
    },
  });
};

// =====================================================
// 2. HOOKS PARA CONDUTORES
// =====================================================

export const useDrivers = (filters?: {
  ativo?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}) => {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['frota', 'drivers', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.list({
        schema: 'frota',
        table: 'drivers',
        companyId: selectedCompany.id,
        filters: filters || {}
      });
      
      return result.data;
    },
    enabled: !!selectedCompany?.id,
    ...queryConfig.semiStatic,
  });
};

export const useCreateDriver = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: any) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.create({
        schema: 'frota',
        table: 'drivers',
        companyId: selectedCompany.id,
        data
      });
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frota', 'drivers'] });
      toast.success('Condutor criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar condutor: ' + error.message);
    },
  });
};

export const useUpdateDriver = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.update({
        schema: 'frota',
        table: 'drivers',
        companyId: selectedCompany.id,
        id,
        data
      });
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frota', 'drivers'] });
      toast.success('Condutor atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar condutor: ' + error.message);
    },
  });
};

export const useDeleteDriver = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.delete({
        schema: 'frota',
        table: 'drivers',
        companyId: selectedCompany.id,
        id
      });
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frota', 'drivers'] });
      toast.success('Condutor excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir condutor: ' + error.message);
    },
  });
};

export const useDeleteInspection = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.delete({
        schema: 'frota',
        table: 'vehicle_inspections',
        companyId: selectedCompany.id,
        id
      });
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frota', 'inspections'] });
      toast.success('Vistoria excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir vistoria: ' + error.message);
    },
  });
};

export const useDeleteMaintenance = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.delete({
        schema: 'frota',
        table: 'vehicle_maintenances',
        companyId: selectedCompany.id,
        id
      });
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frota', 'maintenances'] });
      toast.success('Manutenção excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir manutenção: ' + error.message);
    },
  });
};

export const useDeleteOccurrence = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.delete({
        schema: 'frota',
        table: 'vehicle_occurrences',
        companyId: selectedCompany.id,
        id
      });
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frota', 'occurrences'] });
      toast.success('Ocorrência excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir ocorrência: ' + error.message);
    },
  });
};

export const useDeleteVehicleRequest = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.delete({
        schema: 'frota',
        table: 'vehicle_requests',
        companyId: selectedCompany.id,
        id
      });
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frota', 'requests'] });
      toast.success('Solicitação excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir solicitação: ' + error.message);
    },
  });
};

// =====================================================
// 3. HOOKS PARA VISTORIAS
// =====================================================

export const useInspections = (filters?: {
  vehicle_id?: string;
  driver_id?: string;
  limit?: number;
  offset?: number;
}) => {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['frota', 'inspections', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.list({
        schema: 'frota',
        table: 'vehicle_inspections',
        companyId: selectedCompany.id,
        filters: filters || {}
      });
      
      return result.data;
    },
    enabled: !!selectedCompany?.id,
    ...queryConfig.dynamic,
  });
};

export const useCreateInspection = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: any) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.create({
        schema: 'frota',
        table: 'vehicle_inspections',
        companyId: selectedCompany.id,
        data
      });
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frota', 'inspections'] });
      toast.success('Vistoria criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar vistoria: ' + error.message);
    },
  });
};

// =====================================================
// 4. HOOKS PARA MANUTENÇÕES
// =====================================================

export const useMaintenances = (filters?: {
  vehicle_id?: string;
  tipo?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) => {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['frota', 'maintenances', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.list({
        schema: 'frota',
        table: 'vehicle_maintenances',
        companyId: selectedCompany.id,
        filters: filters || {}
      });
      
      return result.data;
    },
    enabled: !!selectedCompany?.id,
    ...queryConfig.semiStatic,
  });
};

export const useCreateMaintenance = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: any) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.create({
        schema: 'frota',
        table: 'vehicle_maintenances',
        companyId: selectedCompany.id,
        data
      });
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frota', 'maintenances'] });
      toast.success('Manutenção criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar manutenção: ' + error.message);
    },
  });
};

export const useUpdateMaintenance = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.update({
        schema: 'frota',
        table: 'vehicle_maintenances',
        companyId: selectedCompany.id,
        id,
        data
      });
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frota', 'maintenances'] });
      toast.success('Manutenção atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar manutenção: ' + error.message);
    },
  });
};

// =====================================================
// 5. HOOKS PARA OCORRÊNCIAS
// =====================================================

export const useOccurrences = (filters?: {
  vehicle_id?: string;
  driver_id?: string;
  tipo?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) => {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['frota', 'occurrences', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.list({
        schema: 'frota',
        table: 'vehicle_occurrences',
        companyId: selectedCompany.id,
        filters: filters || {}
      });
      
      return result.data;
    },
    enabled: !!selectedCompany?.id,
    ...queryConfig.semiStatic,
  });
};

export const useCreateOccurrence = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: any) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.create({
        schema: 'frota',
        table: 'vehicle_occurrences',
        companyId: selectedCompany.id,
        data
      });
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frota', 'occurrences'] });
      toast.success('Ocorrência registrada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao registrar ocorrência: ' + error.message);
    },
  });
};

// =====================================================
// 6. HOOKS PARA SOLICITAÇÕES
// =====================================================

export const useVehicleRequests = (filters?: {
  solicitante_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) => {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['frota', 'requests', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.list({
        schema: 'frota',
        table: 'vehicle_requests',
        companyId: selectedCompany.id,
        filters: filters || {}
      });
      
      return result.data;
    },
    enabled: !!selectedCompany?.id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateVehicleRequest = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: any) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.create({
        schema: 'frota',
        table: 'vehicle_requests',
        companyId: selectedCompany.id,
        data
      });
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frota', 'requests'] });
      toast.success('Solicitação criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar solicitação: ' + error.message);
    },
  });
};

// =====================================================
// 7. HOOKS PARA DASHBOARD
// =====================================================

export const useFrotaDashboard = () => {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['frota', 'dashboard', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      // Usar função RPC para obter estatísticas do dashboard
      const result = await EntityService.callRPC({
        functionName: 'frota.get_dashboard_stats',
        args: { p_company_id: selectedCompany.id }
      });
      
      return result.data;
    },
    enabled: !!selectedCompany?.id,
    ...queryConfig.dashboard,
  });
};

export const useUpcomingMaintenances = (days: number = 30) => {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['frota', 'upcoming_maintenances', selectedCompany?.id, days],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.callRPC({
        functionName: 'frota.get_upcoming_maintenances',
        args: { 
          p_company_id: selectedCompany.id,
          p_days: days
        }
      });
      
      return result.data;
    },
    enabled: !!selectedCompany?.id,
    ...queryConfig.semiStatic,
  });
};

export const useExpiringDocuments = (days: number = 30) => {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['frota', 'expiring_documents', selectedCompany?.id, days],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.callRPC({
        functionName: 'frota.get_documents_expiring',
        args: { 
          p_company_id: selectedCompany.id,
          p_days: days
        }
      });
      
      return result.data;
    },
    enabled: !!selectedCompany?.id,
    ...queryConfig.dynamic,
  });
};

// =====================================================
// 8. HOOKS PARA DOCUMENTOS
// =====================================================

export const useVehicleDocuments = (vehicleId: string) => {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['frota', 'documents', vehicleId, selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id || !vehicleId) throw new Error('Dados necessários não fornecidos');
      
      const result = await EntityService.list({
        schema: 'frota',
        table: 'vehicle_documents',
        companyId: selectedCompany.id,
        filters: { vehicle_id: vehicleId }
      });
      
      return result.data;
    },
    enabled: !!selectedCompany?.id && !!vehicleId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateDocument = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: any) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.create({
        schema: 'frota',
        table: 'vehicle_documents',
        companyId: selectedCompany.id,
        data
      });
      
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['frota', 'documents', variables.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['frota', 'expiring_documents'] });
      toast.success('Documento adicionado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao adicionar documento: ' + error.message);
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.delete({
        schema: 'frota',
        table: 'vehicle_documents',
        companyId: selectedCompany.id,
        id
      });
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frota', 'documents'] });
      queryClient.invalidateQueries({ queryKey: ['frota', 'expiring_documents'] });
      toast.success('Documento excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir documento: ' + error.message);
    },
  });
};

// =====================================================
// 9. HOOKS PARA ATRIBUIÇÕES
// =====================================================

export const useAssignVehicle = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: {
      vehicle_id: string;
      driver_id: string;
      km_inicial?: number;
      observacoes?: string;
    }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.callRPC({
        functionName: 'frota.assign_vehicle',
        args: data
      });
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frota', 'vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['frota', 'assignments'] });
      toast.success('Veículo atribuído com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atribuir veículo: ' + error.message);
    },
  });
};

export const useReturnVehicle = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: {
      vehicle_id: string;
      km_final: number;
      observacoes?: string;
    }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.callRPC({
        functionName: 'frota.return_vehicle',
        args: data
      });
      
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frota', 'vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['frota', 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['frota', 'inspections'] });
      toast.success('Veículo devolvido com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao devolver veículo: ' + error.message);
    },
  });
};

// =====================================================
// 10. HOOKS PARA ATUALIZAÇÃO DE QUILOMETRAGEM
// =====================================================

export const useUpdateVehicleMileage = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: {
      vehicle_id: string;
      quilometragem: number;
    }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await EntityService.callRPC({
        functionName: 'frota.update_vehicle_mileage',
        args: {
          p_vehicle_id: data.vehicle_id,
          p_company_id: selectedCompany.id,
          p_quilometragem: data.quilometragem
        }
      });
      
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['frota', 'vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['frota', 'vehicle', variables.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['frota', 'upcoming_maintenances'] });
      toast.success('Quilometragem atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar quilometragem: ' + error.message);
    },
  });
};
