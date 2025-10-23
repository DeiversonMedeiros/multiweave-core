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

export interface EntityPermission {
  id: string;
  profile_id: string;
  entity_name: string;
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
  updated_at: string;
}

export const useAuthorization = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [entityPermissions, setEntityPermissions] = useState<EntityPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Carregar permissões do usuário
  const loadPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setEntityPermissions([]);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Verificar se é admin
      const { data: adminData, error: adminError } = await supabase
        .rpc('is_admin_simple', { p_user_id: user.id });
      
      if (adminError) {
        console.error('Erro ao verificar admin:', adminError);
        setIsAdmin(false);
      } else {
        setIsAdmin(adminData || false);
      }

      // Carregar permissões de módulo
      const { data: permissionsData, error: permissionsError } = await supabase
        .rpc('get_user_permissions_simple', { p_user_id: user.id });

      if (permissionsError) {
        console.error('Erro ao carregar permissões de módulo:', permissionsError);
        setPermissions([]);
      } else {
        setPermissions(permissionsData || []);
      }

      // Carregar permissões de entidade através do perfil do usuário
      // Primeiro, buscar o perfil do usuário
      const { data: userCompanyData, error: userCompanyError } = await supabase
        .from('user_companies')
        .select('profile_id')
        .eq('user_id', user.id)
        .eq('ativo', true)
        .single();

      if (userCompanyError) {
        console.error('Erro ao buscar perfil do usuário:', userCompanyError);
        setEntityPermissions([]);
      } else if (userCompanyData?.profile_id) {
        // Agora buscar as permissões de entidade para esse perfil
        const { data: entityPermissionsData, error: entityPermissionsError } = await supabase
          .from('entity_permissions')
          .select('*')
          .eq('profile_id', userCompanyData.profile_id);

        if (entityPermissionsError) {
          console.error('Erro ao carregar permissões de entidade:', entityPermissionsError);
          setEntityPermissions([]);
        } else {
          console.log('✅ Permissões de entidade carregadas:', entityPermissionsData?.length || 0, 'registros');
          setEntityPermissions(entityPermissionsData || []);
        }
      } else {
        setEntityPermissions([]);
      }
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      setPermissions([]);
      setEntityPermissions([]);
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
          p_action: action
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
    
    // Verificar se os parâmetros são válidos
    if (!entityName || !action) {
      console.warn('⚠️ [WARNING] Parâmetros inválidos para verificação de permissão:', {
        entityName,
        action,
        userId: user.id
      });
      return false;
    }

    try {
      const params = {
        p_user_id: user.id,
        p_entity_name: entityName,
        p_action: action
      };
      
      console.log('🔍 [DEBUG] Verificando permissão de entidade:', {
        entityName,
        action,
        userId: user.id,
        params
      });

      const { data, error } = await supabase
        .rpc('check_entity_permission_v2', params);

      console.log('🔍 [DEBUG] Resposta da função check_entity_permission:', {
        data,
        error,
        hasError: !!error
      });

      if (error) {
        console.error('❌ Erro ao verificar permissão de entidade:', {
          error,
          entityName,
          action,
          userId: user.id,
          params
        });
        return false;
      }

      console.log('✅ Permissão verificada com sucesso:', {
        entityName,
        action,
        hasPermission: data || false
      });

      return data || false;
    } catch (error) {
      console.error('❌ Exceção ao verificar permissão de entidade:', {
        error,
        entityName,
        action,
        userId: user.id
      });
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
    entityPermissions,
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

