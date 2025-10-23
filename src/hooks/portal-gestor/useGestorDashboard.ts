import { useQuery } from '@tanstack/react-query';
import { useCompany } from '@/lib/company-context';
import { 
  getGestorDashboardStats, 
  getGestorRecentActivities,
  getGestorDashboardStatsDirect,
  getGestorRecentActivitiesDirect
} from '@/services/portal-gestor/gestorDashboardService';

// =====================================================
// HOOKS PARA DASHBOARD DO GESTOR
// =====================================================

/**
 * Hook para buscar estatísticas do dashboard do gestor
 */
export function useGestorDashboardStats() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';

  return useQuery({
    queryKey: ['gestor-dashboard-stats', companyId],
    queryFn: async () => {
      try {
        // Tentar primeiro com a função RPC
        return await getGestorDashboardStats(companyId);
      } catch (error) {
        console.warn('Função RPC não disponível, usando método direto:', error);
        // Fallback para queries diretas
        return await getGestorDashboardStatsDirect(companyId);
      }
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 5 * 60 * 1000, // Refetch a cada 5 minutos
  });
}

/**
 * Hook para buscar atividades recentes do gestor
 */
export function useGestorRecentActivities(limit: number = 10) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id || '';

  return useQuery({
    queryKey: ['gestor-recent-activities', companyId, limit],
    queryFn: async () => {
      try {
        // Tentar primeiro com a função RPC
        return await getGestorRecentActivities(companyId, limit);
      } catch (error) {
        console.warn('Função RPC não disponível, usando método direto:', error);
        // Fallback para queries diretas
        return await getGestorRecentActivitiesDirect(companyId, limit);
      }
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 2 * 60 * 1000, // Refetch a cada 2 minutos
  });
}

/**
 * Hook combinado para dashboard completo
 */
export function useGestorDashboard(limit: number = 10) {
  const stats = useGestorDashboardStats();
  const activities = useGestorRecentActivities(limit);

  return {
    stats,
    activities,
    isLoading: stats.isLoading || activities.isLoading,
    error: stats.error || activities.error,
    refetch: () => {
      stats.refetch();
      activities.refetch();
    }
  };
}
