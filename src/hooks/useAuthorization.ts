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

      // Carregar permissões de módulo (filtradas por empresa selecionada)
      console.log('[useAuthorization] Carregando permissões de módulo para usuário:', user.id, 'empresa:', currentCompanyId);
      
      // Tentar usar a nova função que filtra por empresa
      let permissionsData = null;
      let permissionsError = null;
      
      if (currentCompanyId) {
        const result = await supabase
          .rpc('get_user_permissions_by_company', { 
            p_user_id: user.id,
            p_company_id: currentCompanyId
          });
        permissionsData = result.data;
        permissionsError = result.error;
        
        // Se a nova função não existir ainda, usar a função antiga como fallback
        if (permissionsError && permissionsError.code === 'PGRST202') {
          console.warn('[useAuthorization] Função get_user_permissions_by_company não encontrada, usando fallback');
          const fallbackResult = await supabase
            .rpc('get_user_permissions_simple', { p_user_id: user.id });
          permissionsData = fallbackResult.data;
          permissionsError = fallbackResult.error;
        }
      } else {
        // Se não há empresa selecionada, usar a função antiga
        const result = await supabase
          .rpc('get_user_permissions_simple', { p_user_id: user.id });
        permissionsData = result.data;
        permissionsError = result.error;
      }

      if (permissionsError) {
        console.error('[useAuthorization] Erro ao carregar permissões de módulo:', permissionsError);
        setPermissions([]);
      } else {
        console.log('[useAuthorization] Permissões de módulo carregadas:', permissionsData);
        setPermissions(permissionsData || []);
      }

      // Carregar permissões de página (filtradas por empresa selecionada)
      console.log('[useAuthorization] Carregando permissões de página para usuário:', user.id, 'empresa:', currentCompanyId);
      
      // Tentar usar a nova função que filtra por empresa
      let pageData = null;
      let pageError = null;
      
      if (currentCompanyId) {
        const result = await supabase
          .rpc('get_user_page_permissions_by_company', { 
            p_user_id: user.id,
            p_company_id: currentCompanyId
          });
        pageData = result.data;
        pageError = result.error;
        
        // Se a nova função não existir ainda, usar a função antiga como fallback
        if (pageError && pageError.code === 'PGRST202') {
          console.warn('[useAuthorization] Função get_user_page_permissions_by_company não encontrada, usando fallback');
          const fallbackResult = await supabase
            .rpc('get_user_page_permissions_simple', { p_user_id: user.id });
          pageData = fallbackResult.data;
          pageError = fallbackResult.error;
        }
      } else {
        // Se não há empresa selecionada, usar a função antiga
        const result = await supabase
          .rpc('get_user_page_permissions_simple', { p_user_id: user.id });
        pageData = result.data;
        pageError = result.error;
      }

      if (pageError) {
        console.error('[useAuthorization] Erro ao carregar permissões de página:', pageError);
        setPagePermissions([]);
      } else {
        const trainingPerms = pageData?.filter(p => p.page_path.includes('training') || p.page_path.includes('treinamento')) || [];
        if (trainingPerms.length > 0) {
          console.log('[useAuthorization] ✅ TREINAMENTO - Permissões carregadas:', trainingPerms);
        } else {
          console.log('[useAuthorization] ❌ TREINAMENTO - Nenhuma permissão de treinamento encontrada');
        }
        setPagePermissions(pageData || []);
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
    console.log('[useAuthorization] hasModulePermission chamado:', {
      moduleName,
      action,
      isAdmin,
      permissionsCount: permissions.length
    });
    
    if (isAdmin) {
      console.log('[useAuthorization] Usuário é admin - permitindo módulo:', moduleName);
      return true;
    }
    
    if (!permissions.length) {
      console.log('[useAuthorization] Nenhuma permissão de módulo carregada - negando acesso');
      return false;
    }

    console.log('[useAuthorization] Permissões de módulo disponíveis:', permissions.map(p => p.module_name));
    const permission = permissions.find(p => p.module_name === moduleName);
    
    if (!permission) {
      console.log('[useAuthorization] Permissão não encontrada para módulo:', moduleName);
      return false;
    }

    const result = (() => {
      switch (action) {
        case 'read': return permission.can_read;
        case 'create': return permission.can_create;
        case 'edit': return permission.can_edit;
        case 'delete': return permission.can_delete;
        default: return false;
      }
    })();
    
    console.log('[useAuthorization] Resultado hasModulePermission:', {
      moduleName,
      action,
      permission: {
        can_read: permission.can_read,
        can_create: permission.can_create,
        can_edit: permission.can_edit,
        can_delete: permission.can_delete
      },
      result
    });

    return result;
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
    const isTrainingPath = pagePath.includes('treinamento') || pagePath.includes('training');
    
    if (isTrainingPath) {
      console.log('[useAuthorization] 🔍 TREINAMENTO - Verificando permissão:', {
        pagePath,
        action,
        isAdmin,
        pagePermissionsCount: pagePermissions.length,
        pagePermissions: pagePermissions.filter(p => p.page_path.includes('treinamento') || p.page_path.includes('training'))
      });
    }
    
    if (isAdmin) {
      return true;
    }
    
    if (!pagePermissions.length) {
      if (isTrainingPath) {
        console.log('[useAuthorization] ❌ TREINAMENTO - Nenhuma permissão de página carregada');
      }
      return false;
    }

    // Normalizar caminho (remove parâmetros de rota, mas mantém estrutura)
    const normalizePath = (path: string): string => {
      const hasWildcard = path.endsWith('*');
      let normalized = hasWildcard ? path.slice(0, -1) : path;
      
      normalized = normalized.replace(/\/[^/]+\/edit$/, '');
      normalized = normalized.replace(/\/[^/]+\/new$/, '');
      normalized = normalized.replace(/\/:[^/]+/g, '');
      
      if (hasWildcard) {
        normalized = normalized + '*';
      }
      
      return normalized;
    };

    const normalizedPath = normalizePath(pagePath);
    
    if (isTrainingPath) {
      console.log('[useAuthorization] 🔍 TREINAMENTO - Normalização:', {
        original: pagePath,
        normalized: normalizedPath
      });
    }

    // Buscar permissão - primeiro exata, depois com wildcard
    let permission = pagePermissions.find(p => {
      // Comparação exata (com ou sem wildcard)
      if (p.page_path === normalizedPath) {
        if (isTrainingPath) {
          console.log('[useAuthorization] ✅ TREINAMENTO - Match exato:', p.page_path);
        }
        return true;
      }
      
      // Se a permissão tem wildcard, verificar se o caminho normalizado começa com o padrão
      if (p.page_path.endsWith('*')) {
        const pattern = p.page_path.slice(0, -1);
        const pathWithoutWildcard = normalizedPath.replace(/\*$/, '');
        const matches = pathWithoutWildcard.startsWith(pattern);
        if (matches && isTrainingPath) {
          console.log('[useAuthorization] ✅ TREINAMENTO - Match wildcard (permissão):', p.page_path, 'para:', normalizedPath);
        }
        return matches;
      }
      
      // Se o caminho normalizado tem wildcard, verificar se a permissão começa com o padrão
      if (normalizedPath.endsWith('*')) {
        const pattern = normalizedPath.slice(0, -1);
        const permWithoutWildcard = p.page_path.replace(/\*$/, '');
        const matches = permWithoutWildcard.startsWith(pattern);
        if (matches && isTrainingPath) {
          console.log('[useAuthorization] ✅ TREINAMENTO - Match wildcard (caminho):', normalizedPath, 'para:', p.page_path);
        }
        return matches;
      }
      
      return false;
    });
    
    if (!permission) {
      if (isTrainingPath) {
        console.log('[useAuthorization] ❌ TREINAMENTO - Nenhuma permissão encontrada para:', normalizedPath);
        console.log('[useAuthorization] 🔍 TREINAMENTO - Permissões disponíveis:', pagePermissions.map(p => p.page_path));
      }
      return false;
    }

    const result = (() => {
      switch (action) {
        case 'read': return permission.can_read;
        case 'create': return permission.can_create;
        case 'edit': return permission.can_edit;
        case 'delete': return permission.can_delete;
        default: return false;
      }
    })();
    
    if (isTrainingPath) {
      console.log('[useAuthorization] ✅ TREINAMENTO - Resultado:', {
        permissionPath: permission.page_path,
        action,
        canRead: permission.can_read,
        result
      });
    }

    return result;
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

