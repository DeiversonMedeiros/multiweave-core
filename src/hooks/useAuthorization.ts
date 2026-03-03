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

// Contador de instâncias para debug
let useAuthorizationCallCount = 0;
let useAuthorizationInstanceCount = 0;

export const useAuthorization = () => {
  useAuthorizationCallCount++;
  const instanceId = useRef(++useAuthorizationInstanceCount);
  const callId = useRef(useAuthorizationCallCount);
  
  console.log(`[useAuthorization] 🔄 CHAMADO [${instanceId.current}-${callId.current}]`, {
    timestamp: new Date().toISOString(),
    instanceId: instanceId.current,
    callCount: callId.current,
  });
  
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
  
  // Refs para rastrear mudanças
  const prevUserRef = useRef<any>(null);
  const prevSelectedCompanyRef = useRef<any>(null);
  
  // Log mudanças em user
  useEffect(() => {
    if (prevUserRef.current !== user) {
      console.log(`[useAuthorization] 👤 [${instanceId.current}] User mudou:`, {
        previous: prevUserRef.current?.id || null,
        current: user?.id || null,
        changed: prevUserRef.current?.id !== user?.id,
      });
      prevUserRef.current = user;
    }
  }, [user, instanceId]);
  
  // Log mudanças em selectedCompany
  useEffect(() => {
    if (prevSelectedCompanyRef.current !== selectedCompany) {
      console.log(`[useAuthorization] 🏢 [${instanceId.current}] SelectedCompany mudou:`, {
        previous: prevSelectedCompanyRef.current?.id || null,
        current: selectedCompany?.id || null,
        changed: prevSelectedCompanyRef.current?.id !== selectedCompany?.id,
      });
      prevSelectedCompanyRef.current = selectedCompany;
    }
  }, [selectedCompany, instanceId]);

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
    console.log(`[useAuthorization] 🔄 [${instanceId.current}] useEffect TRIGGERED`, {
      userId: user?.id || null,
      companyId: selectedCompany?.id || null,
      timestamp: new Date().toISOString(),
    });
    loadPermissions();
  }, [user?.id, selectedCompany?.id, loadPermissions, instanceId]);

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

  // Ref para contar chamadas de hasModulePermission por módulo
  const hasModulePermissionCallCountRef = useRef<Map<string, number>>(new Map());
  
  // Verificar permissão local (usando cache)
  const hasModulePermission = useCallback((
    moduleName: string, 
    action: PermissionAction
  ): boolean => {
    // Contador de chamadas por módulo para debug
    const callKey = `${moduleName}-${action}`;
    const currentCount = (hasModulePermissionCallCountRef.current.get(callKey) || 0) + 1;
    hasModulePermissionCallCountRef.current.set(callKey, currentCount);
    
    // Log apenas se for chamado muitas vezes (mais de 5x) ou primeira vez
    if (currentCount > 5) {
      console.log(`[useAuthorization] ⚠️ [${instanceId.current}] hasModulePermission chamado MUITAS VEZES:`, {
        moduleName,
        action,
        callCount: currentCount,
        isAdmin,
        permissionsCount: permissions.length,
        stackTrace: new Error().stack?.split('\n').slice(1, 4).join('\n')
      });
    } else if (currentCount <= 2) {
      console.log(`[useAuthorization] [${instanceId.current}] hasModulePermission chamado [${currentCount}x]:`, {
        moduleName,
        action,
        isAdmin,
        permissionsCount: permissions.length
      });
    }
    
    if (isAdmin) {
      console.log('[useAuthorization] Usuário é admin - permitindo módulo:', moduleName);
      return true;
    }
    
    if (!permissions.length) {
      console.log('[useAuthorization] Nenhuma permissão de módulo carregada - negando acesso');
      return false;
    }

    console.log('[useAuthorization] Permissões de módulo disponíveis:', permissions.map(p => p.module_name));

    // Buscar todas as permissões para este módulo (usuário pode ter mais de um perfil)
    const matchingPermissions = permissions.filter(p => p.module_name === moduleName);

    if (!matchingPermissions.length) {
      console.log('[useAuthorization] Permissão não encontrada para módulo:', moduleName);
      return false;
    }

    // Agregar permissões de todos os perfis: se qualquer perfil permitir, o módulo é permitido
    const aggregatedPermission = matchingPermissions.reduce((acc, p) => ({
      module_name: p.module_name,
      can_read: acc.can_read || p.can_read,
      can_create: acc.can_create || p.can_create,
      can_edit: acc.can_edit || p.can_edit,
      can_delete: acc.can_delete || p.can_delete
    }), { module_name: moduleName, can_read: false, can_create: false, can_edit: false, can_delete: false } as UserPermission);

    const result = (() => {
      switch (action) {
        case 'read': return aggregatedPermission.can_read;
        case 'create': return aggregatedPermission.can_create;
        case 'edit': return aggregatedPermission.can_edit;
        case 'delete': return aggregatedPermission.can_delete;
        default: return false;
      }
    })();
    
    console.log('[useAuthorization] Resultado hasModulePermission:', {
      moduleName,
      action,
      permission: {
        can_read: aggregatedPermission.can_read,
        can_create: aggregatedPermission.can_create,
        can_edit: aggregatedPermission.can_edit,
        can_delete: aggregatedPermission.can_delete
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

    // Considerar todas as permissões do módulo (multi-perfil)
    const matchingPermissions = permissions.filter(p => p.module_name === moduleName);
    if (!matchingPermissions.length) return false;

    return matchingPermissions.some(p =>
      p.can_read || p.can_create || p.can_edit || p.can_delete
    );
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

    // Buscar todas as permissões correspondentes (exata ou com wildcard)
    const matchingPermissions = pagePermissions.filter(p => {
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

    if (!matchingPermissions.length) {
      if (isTrainingPath) {
        console.log('[useAuthorization] ❌ TREINAMENTO - Nenhuma permissão encontrada para:', normalizedPath);
        console.log('[useAuthorization] 🔍 TREINAMENTO - Permissões disponíveis:', pagePermissions.map(p => p.page_path));
      }
      return false;
    }

    // Agregar permissões quando o usuário possui mais de um perfil
    const aggregatedPermission = matchingPermissions.reduce((acc, p) => ({
      can_read: acc.can_read || p.can_read,
      can_create: acc.can_create || p.can_create,
      can_edit: acc.can_edit || p.can_edit,
      can_delete: acc.can_delete || p.can_delete,
      page_path: acc.page_path || p.page_path
    }), { can_read: false, can_create: false, can_edit: false, can_delete: false, page_path: normalizedPath } as PagePermission);

    const result = (() => {
      switch (action) {
        case 'read': return aggregatedPermission.can_read;
        case 'create': return aggregatedPermission.can_create;
        case 'edit': return aggregatedPermission.can_edit;
        case 'delete': return aggregatedPermission.can_delete;
        default: return false;
      }
    })();
    
    if (isTrainingPath) {
      console.log('[useAuthorization] ✅ TREINAMENTO - Resultado:', {
        permissionPath: aggregatedPermission.page_path,
        action,
        canRead: aggregatedPermission.can_read,
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

