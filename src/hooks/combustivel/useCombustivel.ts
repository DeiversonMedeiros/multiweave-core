import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/lib/company-context';
import { useAuth } from '@/lib/auth-context';
import { FuelService } from '@/services/combustivel/fuelService';
import { queryConfig } from '@/lib/react-query-config';
import { toast } from 'sonner';
import type {
  FuelTypeConfig,
  ApprovedGasStation,
  RefuelLimit,
  FuelBudget,
  RefuelRequest,
  ScheduledRefuel,
  RefuelRecord,
  VehicleConsumption,
  DriverConsumption,
  ConsumptionAlert,
  RefuelRequestFormData,
  RefuelRecordFormData,
  FuelBudgetFormData,
  RecargaConfirmFormData
} from '@/types/combustivel';

// =====================================================
// TIPOS DE COMBUSTÍVEL
// =====================================================

export function useFuelTypes(filters?: { ativo?: boolean }) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['fuel-types', selectedCompany?.id, filters],
    queryFn: () => FuelService.getFuelTypes(selectedCompany!.id, filters),
    enabled: !!selectedCompany?.id,
    ...queryConfig
  });
}

export function useFuelType(id: string | undefined) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['fuel-type', selectedCompany?.id, id],
    queryFn: () => FuelService.getFuelType(selectedCompany!.id, id!),
    enabled: !!selectedCompany?.id && !!id,
    ...queryConfig
  });
}

export function useCreateFuelType() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<FuelTypeConfig>) =>
      FuelService.createFuelType(selectedCompany!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-types'] });
      toast.success('Tipo de combustível criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar tipo de combustível: ${error.message}`);
    }
  });
}

export function useUpdateFuelType() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FuelTypeConfig> }) =>
      FuelService.updateFuelType(selectedCompany!.id, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-types'] });
      toast.success('Tipo de combustível atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar tipo de combustível: ${error.message}`);
    }
  });
}

export function useDeleteFuelType() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => FuelService.deleteFuelType(selectedCompany!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-types'] });
      toast.success('Tipo de combustível excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir tipo de combustível: ${error.message}`);
    }
  });
}

// =====================================================
// POSTOS HOMOLOGADOS
// =====================================================

export function useGasStations(filters?: { ativo?: boolean; search?: string }) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['gas-stations', selectedCompany?.id, filters],
    queryFn: () => FuelService.getGasStations(selectedCompany!.id, filters),
    enabled: !!selectedCompany?.id,
    ...queryConfig
  });
}

export function useCreateGasStation() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<ApprovedGasStation>) =>
      FuelService.createGasStation(selectedCompany!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gas-stations'] });
      toast.success('Posto homologado criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar posto: ${error.message}`);
    }
  });
}

export function useUpdateGasStation() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ApprovedGasStation> }) =>
      FuelService.updateGasStation(selectedCompany!.id, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gas-stations'] });
      toast.success('Posto atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar posto: ${error.message}`);
    }
  });
}

export function useDeleteGasStation() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => FuelService.deleteGasStation(selectedCompany!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gas-stations'] });
      toast.success('Posto excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir posto: ${error.message}`);
    }
  });
}

// =====================================================
// LIMITES DE ABASTECIMENTO
// =====================================================

export function useRefuelLimits(filters?: {
  tipo_limite?: string;
  veiculo_id?: string;
  colaborador_id?: string;
  centro_custo_id?: string;
  projeto_id?: string;
  ativo?: boolean;
}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['refuel-limits', selectedCompany?.id, filters],
    queryFn: () => FuelService.getRefuelLimits(selectedCompany!.id, filters),
    enabled: !!selectedCompany?.id,
    ...queryConfig
  });
}

export function useCreateRefuelLimit() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<RefuelLimit>) =>
      FuelService.createRefuelLimit(selectedCompany!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refuel-limits'] });
      toast.success('Limite de abastecimento criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar limite: ${error.message}`);
    }
  });
}

export function useUpdateRefuelLimit() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RefuelLimit> }) =>
      FuelService.updateRefuelLimit(selectedCompany!.id, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refuel-limits'] });
      toast.success('Limite atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar limite: ${error.message}`);
    }
  });
}

export function useDeleteRefuelLimit() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => FuelService.deleteRefuelLimit(selectedCompany!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refuel-limits'] });
      toast.success('Limite excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir limite: ${error.message}`);
    }
  });
}

// =====================================================
// ORÇAMENTOS
// =====================================================

export function useBudgets(filters?: {
  centro_custo_id?: string;
  projeto_id?: string;
  condutor_id?: string;
  mes?: number;
  ano?: number;
}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['fuel-budgets', selectedCompany?.id, filters],
    queryFn: () => FuelService.getBudgets(selectedCompany!.id, filters),
    enabled: !!selectedCompany?.id,
    ...queryConfig
  });
}

export function useBudget(id: string | undefined) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['fuel-budget', selectedCompany?.id, id],
    queryFn: () => FuelService.getBudget(selectedCompany!.id, id!),
    enabled: !!selectedCompany?.id && !!id,
    ...queryConfig
  });
}

export function useCreateBudget() {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FuelBudgetFormData) =>
      FuelService.createBudget(selectedCompany!.id, data, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-budgets'] });
      toast.success('Orçamento criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar orçamento: ${error.message}`);
    }
  });
}

export function useUpdateBudget() {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FuelBudgetFormData> }) =>
      FuelService.updateBudget(selectedCompany!.id, id, data, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-budgets'] });
      toast.success('Orçamento atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar orçamento: ${error.message}`);
    }
  });
}

export function useDeleteBudget() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => FuelService.deleteBudget(selectedCompany!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-budgets'] });
      toast.success('Orçamento excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir orçamento: ${error.message}`);
    }
  });
}

// =====================================================
// SOLICITAÇÕES DE ABASTECIMENTO
// =====================================================

export function useRefuelRequests(filters?: {
  status?: string;
  condutor_id?: string;
  veiculo_id?: string;
  centro_custo_id?: string;
  projeto_id?: string;
  solicitado_por?: string;
  search?: string;
}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['refuel-requests', selectedCompany?.id, filters],
    queryFn: () => FuelService.getRefuelRequests(selectedCompany!.id, filters),
    enabled: !!selectedCompany?.id,
    ...queryConfig
  });
}

export function useRefuelRequest(id: string | undefined) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['refuel-request', selectedCompany?.id, id],
    queryFn: () => FuelService.getRefuelRequest(selectedCompany!.id, id!),
    enabled: !!selectedCompany?.id && !!id,
    ...queryConfig
  });
}

export function useCreateRefuelRequest() {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RefuelRequestFormData) =>
      FuelService.createRefuelRequest(selectedCompany!.id, data, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refuel-requests'] });
      toast.success('Solicitação de abastecimento criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar solicitação: ${error.message}`);
    }
  });
}

export function useUpdateRefuelRequest() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RefuelRequestFormData> }) =>
      FuelService.updateRefuelRequest(selectedCompany!.id, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refuel-requests'] });
      toast.success('Solicitação atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar solicitação: ${error.message}`);
    }
  });
}

export function useCancelRefuelRequest() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => FuelService.cancelRefuelRequest(selectedCompany!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refuel-requests'] });
      toast.success('Solicitação cancelada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao cancelar solicitação: ${error.message}`);
    }
  });
}

export function useConfirmRecarga() {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: string; data: RecargaConfirmFormData }) =>
      FuelService.confirmRecarga(selectedCompany!.id, requestId, data, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refuel-requests'] });
      toast.success('Recarga confirmada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao confirmar recarga: ${error.message}`);
    }
  });
}

// =====================================================
// REGISTROS DE ABASTECIMENTO
// =====================================================

export function useRefuelRecords(filters?: {
  request_id?: string;
  status?: string;
  data_abastecimento?: string;
  condutor_id?: string;
  veiculo_id?: string;
}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['refuel-records', selectedCompany?.id, filters],
    queryFn: () => FuelService.getRefuelRecords(selectedCompany!.id, filters),
    enabled: !!selectedCompany?.id,
    ...queryConfig
  });
}

export function useCreateRefuelRecord() {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: string; data: RefuelRecordFormData }) =>
      FuelService.createRefuelRecord(selectedCompany!.id, requestId, data, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refuel-records'] });
      queryClient.invalidateQueries({ queryKey: ['refuel-requests'] });
      toast.success('Registro de abastecimento criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar registro: ${error.message}`);
    }
  });
}

export function useUpdateRefuelRecord() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RefuelRecordFormData> }) =>
      FuelService.updateRefuelRecord(selectedCompany!.id, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refuel-records'] });
      toast.success('Registro atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar registro: ${error.message}`);
    }
  });
}

// =====================================================
// CONSUMO
// =====================================================

export function useVehicleConsumption(filters?: {
  veiculo_id?: string;
  mes?: number;
  ano?: number;
}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['vehicle-consumption', selectedCompany?.id, filters],
    queryFn: () => FuelService.getVehicleConsumption(selectedCompany!.id, filters),
    enabled: !!selectedCompany?.id,
    ...queryConfig
  });
}

export function useDriverConsumption(filters?: {
  condutor_id?: string;
  mes?: number;
  ano?: number;
}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['driver-consumption', selectedCompany?.id, filters],
    queryFn: () => FuelService.getDriverConsumption(selectedCompany!.id, filters),
    enabled: !!selectedCompany?.id,
    ...queryConfig
  });
}

// =====================================================
// ALERTAS
// =====================================================

export function useAlerts(filters?: {
  resolvido?: boolean;
  severidade?: string;
  tipo_alerta?: string;
  veiculo_id?: string;
  condutor_id?: string;
}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['consumption-alerts', selectedCompany?.id, filters],
    queryFn: () => FuelService.getAlerts(selectedCompany!.id, filters),
    enabled: !!selectedCompany?.id,
    ...queryConfig
  });
}

export function useResolveAlert() {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, observacoes }: { id: string; observacoes?: string }) =>
      FuelService.resolveAlert(selectedCompany!.id, id, observacoes, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumption-alerts'] });
      toast.success('Alerta resolvido com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao resolver alerta: ${error.message}`);
    }
  });
}

// =====================================================
// DASHBOARD
// =====================================================

export function useDashboardStats(mes?: number, ano?: number) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['fuel-dashboard-stats', selectedCompany?.id, mes, ano],
    queryFn: () => FuelService.getDashboardStats(selectedCompany!.id, mes, ano),
    enabled: !!selectedCompany?.id,
    ...queryConfig
  });
}

