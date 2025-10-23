import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company-context';
import { EntityService } from '@/services/generic/entityService';
import { useAuth } from '@/lib/auth-context';

// =====================================================
// HOOKS DE AUDITORIA
// =====================================================

export interface AuditLog {
  id: string;
  company_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  created_at: string;
  user_name?: string;
}

export interface AuditFilters {
  entity_type?: string;
  entity_id?: string;
  action?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface AuditConfig {
  id: string;
  company_id: string;
  entity_type: string;
  is_enabled: boolean;
  log_level: 'all' | 'changes' | 'critical';
  retention_days: number;
  created_at: string;
  updated_at: string;
}

/**
 * Hook para buscar logs de auditoria
 */
export function useAuditLogs(
  filters: AuditFilters = {},
  limit: number = 50,
  offset: number = 0
) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['audit-logs', selectedCompany?.id, filters, limit, offset],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];

      const { data, error } = await supabase.rpc('get_audit_logs', {
        p_company_id: selectedCompany.id,
        p_entity_type: filters.entity_type || null,
        p_entity_id: filters.entity_id || null,
        p_action: filters.action || null,
        p_user_id: filters.user_id || null,
        p_start_date: filters.start_date || null,
        p_end_date: filters.end_date || null,
        p_limit: limit,
        p_offset: offset
      });

      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!selectedCompany?.id,
  });
}

/**
 * Hook para buscar configurações de auditoria
 */
export function useAuditConfig() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['audit-config', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];

      const result = await EntityService.list({
        schema: 'rh',
        table: 'audit_config',
        companyId: selectedCompany.id,
        orderBy: 'entity_type'
      });

      return result.data as AuditConfig[];
    },
    enabled: !!selectedCompany?.id,
  });
}

/**
 * Hook para atualizar configuração de auditoria
 */
export function useUpdateAuditConfig() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: Partial<AuditConfig>) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

      const result = await EntityService.upsert({
        schema: 'rh',
        table: 'audit_config',
        companyId: selectedCompany.id,
        data: {
          ...data,
          company_id: selectedCompany.id
        }
      });

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['audit-config', selectedCompany?.id]
      });
    },
  });
}

/**
 * Hook para buscar logs de uma entidade específica
 */
export function useEntityAuditLogs(
  entityType: string,
  entityId: string,
  limit: number = 20
) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['audit-logs', 'entity', selectedCompany?.id, entityType, entityId],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];

      const { data, error } = await supabase.rpc('get_audit_logs', {
        p_company_id: selectedCompany.id,
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_limit: limit,
        p_offset: 0
      });

      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!selectedCompany?.id && !!entityType && !!entityId,
  });
}

/**
 * Hook para buscar logs de um usuário específico
 */
export function useUserAuditLogs(
  userId: string,
  limit: number = 50
) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['audit-logs', 'user', selectedCompany?.id, userId],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];

      const { data, error } = await supabase.rpc('get_audit_logs', {
        p_company_id: selectedCompany.id,
        p_user_id: userId,
        p_limit: limit,
        p_offset: 0
      });

      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!selectedCompany?.id && !!userId,
  });
}

/**
 * Hook para buscar estatísticas de auditoria
 */
export function useAuditStats() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['audit-stats', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return null;

      // Buscar estatísticas dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase.rpc('get_audit_logs', {
        p_company_id: selectedCompany.id,
        p_start_date: thirtyDaysAgo.toISOString(),
        p_limit: 1000,
        p_offset: 0
      });

      if (error) throw error;

      const logs = data as AuditLog[];
      
      // Calcular estatísticas
      const stats = {
        total_actions: logs.length,
        actions_by_type: logs.reduce((acc, log) => {
          acc[log.action] = (acc[log.action] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        entities_by_type: logs.reduce((acc, log) => {
          acc[log.entity_type] = (acc[log.entity_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        users_by_action: logs.reduce((acc, log) => {
          const key = `${log.user_name || 'Sistema'}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        daily_activity: logs.reduce((acc, log) => {
          const date = new Date(log.created_at).toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      return stats;
    },
    enabled: !!selectedCompany?.id,
  });
}

/**
 * Hook para limpeza de logs antigos
 */
export function useCleanupAuditLogs() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');

      const { error } = await supabase.rpc('cleanup_old_audit_logs');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['audit-logs', selectedCompany?.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['audit-stats', selectedCompany?.id]
      });
    },
  });
}
