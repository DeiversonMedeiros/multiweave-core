import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/lib/company-context';
import {
  getIrrfBrackets,
  getIrrfBracketById,
  createIrrfBracket,
  updateIrrfBracket,
  deleteIrrfBracket,
  getActiveIrrfBrackets,
  getCurrentIrrfBrackets,
  getIrrfBracketsByPeriod,
  IrrfBracketFilters,
  IrrfBracketCreateData,
  IrrfBracketUpdateData
} from '@/services/rh/irrfBracketsService';
import { IrrfBracket } from '@/integrations/supabase/rh-types';

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export function useIrrfBrackets(filters: IrrfBracketFilters = {}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['irrf-brackets', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      const result = await getIrrfBrackets(selectedCompany.id, filters);
      return {
        data: result.data,
        count: result.totalCount,
        hasMore: result.data.length >= 100
      };
    },
    enabled: !!selectedCompany?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// =====================================================
// HOOK PARA BUSCAR POR ID
// =====================================================

export function useIrrfBracket(id: string | undefined) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['irrf-bracket', selectedCompany?.id, id],
    queryFn: async () => {
      if (!selectedCompany?.id || !id) throw new Error('Parâmetros inválidos');
      return await getIrrfBracketById(selectedCompany.id, id);
    },
    enabled: !!selectedCompany?.id && !!id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// =====================================================
// HOOKS PARA MUTAÇÕES
// =====================================================

export function useCreateIrrfBracket() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: IrrfBracketCreateData) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await createIrrfBracket(selectedCompany.id, data);
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['irrf-brackets'] });
      queryClient.invalidateQueries({ queryKey: ['active-irrf-brackets'] });
      queryClient.invalidateQueries({ queryKey: ['current-irrf-brackets'] });
    },
  });
}

export function useUpdateIrrfBracket() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: IrrfBracketUpdateData) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await updateIrrfBracket(selectedCompany.id, data);
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['irrf-brackets'] });
      queryClient.invalidateQueries({ queryKey: ['irrf-bracket', data.id] });
      queryClient.invalidateQueries({ queryKey: ['active-irrf-brackets'] });
      queryClient.invalidateQueries({ queryKey: ['current-irrf-brackets'] });
    },
  });
}

export function useDeleteIrrfBracket() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await deleteIrrfBracket(selectedCompany.id, id);
    },
    onSuccess: (_, id) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['irrf-brackets'] });
      queryClient.invalidateQueries({ queryKey: ['irrf-bracket', id] });
      queryClient.invalidateQueries({ queryKey: ['active-irrf-brackets'] });
      queryClient.invalidateQueries({ queryKey: ['current-irrf-brackets'] });
    },
  });
}

// =====================================================
// HOOKS AUXILIARES
// =====================================================

export function useActiveIrrfBrackets(anoVigencia?: number, mesVigencia?: number) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['active-irrf-brackets', selectedCompany?.id, anoVigencia, mesVigencia],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await getActiveIrrfBrackets(selectedCompany.id, anoVigencia, mesVigencia);
    },
    enabled: !!selectedCompany?.id,
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

export function useCurrentIrrfBrackets() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['current-irrf-brackets', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await getCurrentIrrfBrackets(selectedCompany.id);
    },
    enabled: !!selectedCompany?.id,
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

export function useIrrfBracketsByPeriod(anoVigencia: number, mesVigencia: number) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['irrf-brackets-period', selectedCompany?.id, anoVigencia, mesVigencia],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await getIrrfBracketsByPeriod(selectedCompany.id, anoVigencia, mesVigencia);
    },
    enabled: !!selectedCompany?.id,
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

// =====================================================
// HOOKS PARA CÁLCULOS
// =====================================================

export function useIrrfCalculation(baseSalary: number, dependents: number = 0, deductions: number = 0) {
  const { data: brackets } = useCurrentIrrfBrackets();

  return {
    brackets: brackets || [],
    isLoading: !brackets,
    calculate: (salary: number, deps: number = 0, ded: number = 0) => {
      if (!brackets) return null;
      
      const { calculateIrrf } = require('@/services/rh/irrfBracketsService');
      return calculateIrrf(salary, deps, ded, brackets);
    }
  };
}
