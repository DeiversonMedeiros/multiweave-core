import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompany } from '@/lib/company-context';
import {
  getFgtsConfigs,
  getFgtsConfigById,
  createFgtsConfig,
  updateFgtsConfig,
  deleteFgtsConfig,
  getActiveFgtsConfigs,
  getCurrentFgtsConfig,
  getFgtsConfigByPeriod,
  FgtsConfigFilters,
  FgtsConfigCreateData,
  FgtsConfigUpdateData
} from '@/services/rh/fgtsConfigService';
import { FgtsConfig } from '@/integrations/supabase/rh-types';

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export function useFgtsConfigs(filters: FgtsConfigFilters = {}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['fgts-configs', selectedCompany?.id, filters],
    queryFn: async () => {
      console.log('🔍 [useFgtsConfigs] Buscando configurações FGTS:', { 
        companyId: selectedCompany?.id, 
        filters 
      });
      
      if (!selectedCompany?.id) {
        console.warn('⚠️ [useFgtsConfigs] Empresa não selecionada');
        throw new Error('Empresa não selecionada');
      }
      
      try {
        const result = await getFgtsConfigs(selectedCompany.id, filters);
        
        console.log('✅ [useFgtsConfigs] Resultado recebido:', {
          hasData: !!result.data,
          dataLength: result.data?.length || 0,
          totalCount: result.totalCount
        });
        
        if (result.data && result.data.length > 0) {
          console.log('📊 [useFgtsConfigs] Primeiras configurações:', result.data.slice(0, 2).map(c => ({
            id: c.id,
            codigo: c.codigo,
            descricao: c.descricao,
            company_id: c.company_id
          })));
        } else {
          console.warn('⚠️ [useFgtsConfigs] Nenhuma configuração encontrada para companyId:', selectedCompany.id);
          console.warn('⚠️ [useFgtsConfigs] result completo:', {
            hasData: !!result.data,
            dataType: typeof result.data,
            isArray: Array.isArray(result.data),
            dataLength: result.data?.length,
            totalCount: result.totalCount,
            resultKeys: Object.keys(result)
          });
        }
        
        const returnData = {
          data: result.data,
          count: result.totalCount,
          hasMore: result.data.length >= 100
        };
        
        console.log('🔄 [useFgtsConfigs] Retornando do hook:', {
          hasData: !!returnData.data,
          dataLength: returnData.data?.length || 0,
          count: returnData.count,
          firstItem: returnData.data?.[0] ? { id: returnData.data[0].id, codigo: returnData.data[0].codigo } : null
        });
        
        return returnData;
      } catch (error) {
        console.error('❌ [useFgtsConfigs] Erro na busca:', error);
        throw error;
      }
    },
    enabled: !!selectedCompany?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// =====================================================
// HOOK PARA BUSCAR POR ID
// =====================================================

export function useFgtsConfig(id: string | undefined) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['fgts-config', selectedCompany?.id, id],
    queryFn: async () => {
      if (!selectedCompany?.id || !id) throw new Error('Parâmetros inválidos');
      return await getFgtsConfigById(selectedCompany.id, id);
    },
    enabled: !!selectedCompany?.id && !!id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// =====================================================
// HOOKS PARA MUTAÇÕES
// =====================================================

export function useCreateFgtsConfig() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: FgtsConfigCreateData) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await createFgtsConfig(selectedCompany.id, data);
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['fgts-configs'] });
      queryClient.invalidateQueries({ queryKey: ['active-fgts-configs'] });
      queryClient.invalidateQueries({ queryKey: ['current-fgts-config'] });
    },
  });
}

export function useUpdateFgtsConfig() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: FgtsConfigUpdateData) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await updateFgtsConfig(selectedCompany.id, data);
    },
    onSuccess: (data) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['fgts-configs'] });
      queryClient.invalidateQueries({ queryKey: ['fgts-config', data.id] });
      queryClient.invalidateQueries({ queryKey: ['active-fgts-configs'] });
      queryClient.invalidateQueries({ queryKey: ['current-fgts-config'] });
    },
  });
}

export function useDeleteFgtsConfig() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await deleteFgtsConfig(selectedCompany.id, id);
    },
    onSuccess: (_, id) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['fgts-configs'] });
      queryClient.invalidateQueries({ queryKey: ['fgts-config', id] });
      queryClient.invalidateQueries({ queryKey: ['active-fgts-configs'] });
      queryClient.invalidateQueries({ queryKey: ['current-fgts-config'] });
    },
  });
}

// =====================================================
// HOOKS AUXILIARES
// =====================================================

export function useActiveFgtsConfigs(anoVigencia?: number, mesVigencia?: number) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['active-fgts-configs', selectedCompany?.id, anoVigencia, mesVigencia],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await getActiveFgtsConfigs(selectedCompany.id, anoVigencia, mesVigencia);
    },
    enabled: !!selectedCompany?.id,
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

export function useCurrentFgtsConfig() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['current-fgts-config', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await getCurrentFgtsConfig(selectedCompany.id);
    },
    enabled: !!selectedCompany?.id,
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

export function useFgtsConfigByPeriod(anoVigencia: number, mesVigencia: number) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['fgts-config-period', selectedCompany?.id, anoVigencia, mesVigencia],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await getFgtsConfigByPeriod(selectedCompany.id, anoVigencia, mesVigencia);
    },
    enabled: !!selectedCompany?.id,
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

// =====================================================
// HOOKS PARA CÁLCULOS
// =====================================================

export function useFgtsCalculation(baseSalary: number) {
  const { data: config } = useCurrentFgtsConfig();

  return {
    config,
    isLoading: !config,
    calculate: (salary: number) => {
      if (!config) return null;
      
      const { calculateFgts } = require('@/services/rh/fgtsConfigService');
      return calculateFgts(salary, config);
    }
  };
}
