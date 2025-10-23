// =====================================================
// HOOKS ESPECÍFICOS PARA FÉRIAS
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { VacationCalculationService, type VacationYear } from '@/services/rh/vacationCalculationService';
import { useCompany } from '@/lib/company-context';

/**
 * Hook para buscar anos de férias disponíveis
 */
export function useVacationYears(employeeId: string) {
  return useQuery({
    queryKey: ['vacation-years', employeeId],
    queryFn: async (): Promise<VacationYear[]> => {
      return await VacationCalculationService.getAvailableYears(employeeId);
    },
    enabled: !!employeeId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para calcular dias de férias disponíveis
 */
export function useAvailableVacationDays(employeeId: string, year: number) {
  return useQuery({
    queryKey: ['vacation-available-days', employeeId, year],
    queryFn: async (): Promise<number> => {
      return await VacationCalculationService.calculateAvailableDays(employeeId, year);
    },
    enabled: !!employeeId && !!year,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

/**
 * Hook para validar solicitação de férias
 */
export function useValidateVacationRequest(employeeId: string, year: number, requestedDays: number) {
  return useQuery({
    queryKey: ['vacation-validate', employeeId, year, requestedDays],
    queryFn: async () => {
      return await VacationCalculationService.validateVacationRequest(employeeId, year, requestedDays);
    },
    enabled: !!employeeId && !!year && requestedDays > 0,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

/**
 * Hook para criar período aquisitivo
 */
export function useCreateVacationEntitlement() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      admissionDate,
      year
    }: {
      employeeId: string;
      admissionDate: string;
      year: number;
    }) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      return await VacationCalculationService.createVacationEntitlement(
        employeeId,
        selectedCompany.id,
        admissionDate,
        year
      );
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['vacation-years'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-available-days'] });
    },
  });
}

/**
 * Hook para atualizar dias gozados
 */
export function useUpdateGozadosDays() {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      year,
      daysUsed
    }: {
      employeeId: string;
      year: number;
      daysUsed: number;
    }) => {
      if (!selectedCompany?.id) {
        throw new Error('Empresa não selecionada');
      }

      return await VacationCalculationService.updateGozadosDays(employeeId, year, daysUsed);
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['vacation-years'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-available-days'] });
      queryClient.invalidateQueries({ queryKey: ['rh', 'vacations'] });
    },
  });
}

/**
 * Hook para calcular férias
 */
export function useCalculateVacation() {
  return useMutation({
    mutationFn: async ({
      employeeId,
      period,
      vacationDays,
      cashAllowanceDays = 0
    }: {
      employeeId: string;
      period: string;
      vacationDays: number;
      cashAllowanceDays?: number;
    }) => {
      return await VacationCalculationService.calculateVacation(
        employeeId,
        period,
        vacationDays,
        cashAllowanceDays
      );
    },
  });
}
