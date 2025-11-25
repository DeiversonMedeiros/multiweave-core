import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BankHoursTypesService } from '@/services/rh/bankHoursTypesService';
import { 
  BankHoursType, 
  BankHoursTypeForm,
  BankHoursTypeSummary
} from '@/integrations/supabase/bank-hours-types-v2';
import { useCompany } from '@/lib/company-context';

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar tipos de banco de horas
 */
export function useBankHoursTypes() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'bank-hours-types', selectedCompany?.id],
    queryFn: async () => {
      const data = await BankHoursTypesService.list(selectedCompany?.id || '');
      return { data };
    },
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para buscar tipo por ID
 */
export function useBankHoursType(id: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'bank-hours-types', id],
    queryFn: () => BankHoursTypesService.getById(id, selectedCompany?.id || ''),
    enabled: !!id && !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar tipos ativos
 */
export function useActiveBankHoursTypes() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'bank-hours-types', 'active', selectedCompany?.id],
    queryFn: () => BankHoursTypesService.getActive(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para buscar tipo padrão
 */
export function useDefaultBankHoursType() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'bank-hours-types', 'default', selectedCompany?.id],
    queryFn: () => BankHoursTypesService.getDefault(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para resumo dos tipos
 */
export function useBankHoursTypesSummary() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['rh', 'bank-hours-types', 'summary', selectedCompany?.id],
    queryFn: () => BankHoursTypesService.getSummary(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Hook para criar tipo de banco de horas
 */
export function useCreateBankHoursType() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (type: BankHoursTypeForm) => 
      BankHoursTypesService.create(type, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'bank-hours-types'] });
    },
    onError: (error) => {
      console.error('Erro ao criar tipo de banco de horas:', error);
    },
  });
}

/**
 * Hook para atualizar tipo de banco de horas
 */
export function useUpdateBankHoursType() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: ({ id, type }: { id: string; type: Partial<BankHoursTypeForm> }) => 
      BankHoursTypesService.update(id, type, selectedCompany?.id || ''),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'bank-hours-types'] });
      queryClient.setQueryData(['rh', 'bank-hours-types', variables.id], data);
    },
    onError: (error) => {
      console.error('Erro ao atualizar tipo de banco de horas:', error);
    },
  });
}

/**
 * Hook para excluir tipo de banco de horas
 */
export function useDeleteBankHoursType() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (id: string) => 
      BankHoursTypesService.delete(id, selectedCompany?.id || ''),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'bank-hours-types'] });
      queryClient.removeQueries({ queryKey: ['rh', 'bank-hours-types', id] });
    },
    onError: (error) => {
      console.error('Erro ao excluir tipo de banco de horas:', error);
    },
  });
}

/**
 * Hook para definir tipo como padrão
 */
export function useSetDefaultBankHoursType() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: (id: string) => 
      BankHoursTypesService.setAsDefault(id, selectedCompany?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'bank-hours-types'] });
    },
    onError: (error) => {
      console.error('Erro ao definir tipo como padrão:', error);
    },
  });
}

export default useBankHoursTypes;
