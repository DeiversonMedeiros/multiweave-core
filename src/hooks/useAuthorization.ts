import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/lib/company-context';

export type PermissionAction = 'read' | 'create' | 'edit' | 'delete';

export interface UserPermission {
  module_name: string;
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface PagePermission {
  page_path: string;
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export const useAuthorization = () => {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [pagePermissions, setPagePermissions] = useState<PagePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Usar refs para rastrear o último carregamento e evitar loops
  const lastUserIdRef = useRef<string | null>(null);
  const lastCompanyIdRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  // Carregar permissões do usuário
  const loadPermissions = useCallback(async () => {
    // Evitar múltiplas chamadas simultâneas
    if (isLoadingRef.current) {
      return;
    }

    const currentUserId = user?.id || null;
    const currentCompanyId = selectedCompany?.id || null;

    // Se não mudou nada, não recarregar
    if (
      lastUserIdRef.current === currentUserId &&
      lastCompanyIdRef.current === currentCompanyId &&
      !loading
    ) {
      return;
    }

    if (!user) {
      setPermissions([]);
      setPagePermissions([]);
      setIsAdmin(false);
      setLoading(false);
      lastUserIdRef.current = null;
      lastCompanyIdRef.current = null;
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      
      // Atualizar refs antes de carregar
      lastUserIdRef.current = currentUserId;
      lastCompanyIdRef.current = currentCompanyId;
      
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

      // Carregar permissões de página
      if (selectedCompany?.id) {
        const { data: pageData, error: pageError } = await supabase
          .rpc('get_user_page_permissions_simple', { p_user_id: user.id });

        if (pageError) {
          console.error('Erro ao carregar permissões de página:', pageError);
          setPagePermissions([]);
        } else {
          setPagePermissions(pageData || []);
        }
      } else {
        setPagePermissions([]);
      }
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      setPermissions([]);
      setPagePermissions([]);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [user?.id, selectedCompany?.id]);

  // Carregar permissões quando o usuário ou empresa mudar
  useEffect(() => {
    loadPermissions();
  }, [user?.id, selectedCompany?.id]);

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

  // Verificar permissão de página (assíncrono)
  const checkPagePermission = useCallback(async (
    pagePath: string,
    action: PermissionAction
  ): Promise<boolean> => {
    if (!user) return false;
    if (isAdmin) return true;

    try {
      const { data, error } = await supabase
        .rpc('check_page_permission', {
          p_user_id: user.id,
          p_page_path: pagePath,
          p_action: action
        });

      if (error) {
        console.error('Erro ao verificar permissão de página:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Erro ao verificar permissão de página:', error);
      return false;
    }
  }, [user, isAdmin]);

  // Verificar permissão de página local (usando cache)
  const hasPagePermission = useCallback((
    pagePath: string,
    action: PermissionAction
  ): boolean => {
    if (isAdmin) return true;
    if (!pagePermissions.length) return false;

    // Normalizar caminho (remove parâmetros)
    const normalizePath = (path: string): string => {
      // Remove parâmetros de rota (/:id, /:id/edit, etc)
      let normalized = path.replace(/\/[^/]+$/, ''); // Remove último segmento
      normalized = normalized.replace(/\/[^/]+\/edit$/, ''); // Remove /:id/edit
      normalized = normalized.replace(/\/[^/]+\/new$/, ''); // Remove /:id/new
      normalized = normalized.replace(/\/:[^/]+/g, ''); // Remove parâmetros restantes
      return normalized;
    };

    const normalizedPath = normalizePath(pagePath);

    // Buscar permissão exata primeiro
    let permission = pagePermissions.find(p => p.page_path === normalizedPath);

    // Se não encontrou, buscar com wildcard
    if (!permission) {
      permission = pagePermissions.find(p => {
        if (p.page_path.endsWith('*')) {
          const pattern = p.page_path.replace('*', '');
          return normalizedPath.startsWith(pattern);
        }
        return false;
      });
    }

    if (!permission) return false;

    switch (action) {
      case 'read': return permission.can_read;
      case 'create': return permission.can_create;
      case 'edit': return permission.can_edit;
      case 'delete': return permission.can_delete;
      default: return false;
    }
  }, [isAdmin, pagePermissions]);

  return {
    // Estado
    permissions,
    pagePermissions,
    loading,
    isAdmin,
    
    // Funções de verificação
    checkModulePermission,
    checkPagePermission,
    checkCompanyAccess,
    hasModulePermission,
    hasAnyModulePermission,
    hasPagePermission,
    
    // Utilitários
    loadPermissions
  };
};

