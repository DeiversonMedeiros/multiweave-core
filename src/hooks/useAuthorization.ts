import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';

export type PermissionAction = 'read' | 'create' | 'edit' | 'delete';

export interface UserPermission {
  module_name: string;
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export const useAuthorization = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Carregar permissões do usuário
  const loadPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Verificar se é admin
      const { data: adminData, error: adminError } = await supabase
        .rpc('is_admin', { user_id: user.id });
      
      if (adminError) {
        console.error('Erro ao verificar admin:', adminError);
        setIsAdmin(false);
      } else {
        setIsAdmin(adminData || false);
      }

      // Carregar permissões específicas do usuário (mesmo para admins)
      const { data: permissionsData, error: permissionsError } = await supabase
        .rpc('get_user_permissions', { p_user_id: user.id });

      if (permissionsError) {
        console.error('Erro ao carregar permissões:', permissionsError);
        setPermissions([]);
      } else {
        setPermissions(permissionsData || []);
      }
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Carregar permissões quando o usuário mudar
  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // Verificar permissão de módulo
  const checkModulePermission = useCallback(async (
    moduleName: string, 
    action: PermissionAction
  ): Promise<boolean> => {
    if (!user) return false;
    if (isAdmin) return true;

    try {
      const { data, error } = await supabase
        .rpc('check_module_permission', {
          p_user_id: user.id,
          p_module_name: moduleName,
          p_permission: action
        });

      if (error) {
        console.error('Erro ao verificar permissão de módulo:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Erro ao verificar permissão de módulo:', error);
      return false;
    }
  }, [user, isAdmin]);

  // Verificar permissão de entidade
  const checkEntityPermission = useCallback(async (
    entityName: string, 
    action: PermissionAction
  ): Promise<boolean> => {
    if (!user) return false;
    if (isAdmin) return true;

    try {
      const { data, error } = await supabase
        .rpc('check_entity_permission', {
          p_user_id: user.id,
          p_entity_name: entityName,
          p_permission: action
        });

      if (error) {
        console.error('Erro ao verificar permissão de entidade:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Erro ao verificar permissão de entidade:', error);
      return false;
    }
  }, [user, isAdmin]);

  // Verificar acesso a empresa
  const checkCompanyAccess = useCallback(async (
    companyId: string
  ): Promise<boolean> => {
    if (!user) return false;
    if (isAdmin) return true;

    try {
      const { data, error } = await supabase
        .rpc('user_has_company_access_new', {
          p_user_id: user.id,
          p_company_id: companyId
        });

      if (error) {
        console.error('Erro ao verificar acesso à empresa:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Erro ao verificar acesso à empresa:', error);
      return false;
    }
  }, [user, isAdmin]);

  // Verificar permissão local (usando cache)
  const hasModulePermission = useCallback((
    moduleName: string, 
    action: PermissionAction
  ): boolean => {
    if (isAdmin) return true;
    if (!permissions.length) return false;

    const permission = permissions.find(p => p.module_name === moduleName);
    if (!permission) return false;

    switch (action) {
      case 'read': return permission.can_read;
      case 'create': return permission.can_create;
      case 'edit': return permission.can_edit;
      case 'delete': return permission.can_delete;
      default: return false;
    }
  }, [isAdmin, permissions]);

  // Verificar se tem permissão para qualquer ação do módulo
  const hasAnyModulePermission = useCallback((
    moduleName: string
  ): boolean => {
    if (isAdmin) return true;
    if (!permissions.length) return false;

    const permission = permissions.find(p => p.module_name === moduleName);
    if (!permission) return false;

    return permission.can_read || permission.can_create || 
           permission.can_edit || permission.can_delete;
  }, [isAdmin, permissions]);

  return {
    // Estado
    permissions,
    loading,
    isAdmin,
    
    // Funções de verificação
    checkModulePermission,
    checkEntityPermission,
    checkCompanyAccess,
    hasModulePermission,
    hasAnyModulePermission,
    
    // Utilitários
    loadPermissions
  };
};

