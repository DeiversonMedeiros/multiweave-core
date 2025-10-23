import { useCallback } from 'react';
import { useAuthorization, PermissionAction } from './useAuthorization';

export const usePermissions = () => {
  const {
    isAdmin,
    permissions,
    entityPermissions,
    hasModulePermission,
    hasAnyModulePermission,
    checkModulePermission,
    checkEntityPermission,
    checkCompanyAccess,
    loading
  } = useAuthorization();

  // Verificar permissão de módulo (síncrono)
  const canReadModule = useCallback((moduleName: string) => 
    hasModulePermission(moduleName, 'read'), [hasModulePermission]);

  const canCreateModule = useCallback((moduleName: string) => 
    hasModulePermission(moduleName, 'create'), [hasModulePermission]);

  const canEditModule = useCallback((moduleName: string) => 
    hasModulePermission(moduleName, 'edit'), [hasModulePermission]);

  const canDeleteModule = useCallback((moduleName: string) => 
    hasModulePermission(moduleName, 'delete'), [hasModulePermission]);

  // Verificar permissão de entidade (síncrono)
  const canReadEntity = useCallback((entityName: string) => 
    checkEntityPermission(entityName, 'read'), [checkEntityPermission]);

  const canCreateEntity = useCallback((entityName: string) => 
    checkEntityPermission(entityName, 'create'), [checkEntityPermission]);

  const canEditEntity = useCallback((entityName: string) => 
    checkEntityPermission(entityName, 'edit'), [checkEntityPermission]);

  const canDeleteEntity = useCallback((entityName: string) => 
    checkEntityPermission(entityName, 'delete'), [checkEntityPermission]);

  // Função síncrona para verificar permissão de entidade
  const hasEntityPermission = useCallback((entityName: string, action: PermissionAction) => {
    if (isAdmin) return true;
    if (!entityPermissions.length) return false;

    const permission = entityPermissions.find(p => p.entity_name === entityName);
    if (!permission) return false;

    switch (action) {
      case 'read': return permission.can_read;
      case 'create': return permission.can_create;
      case 'edit': return permission.can_edit;
      case 'delete': return permission.can_delete;
      default: return false;
    }
  }, [isAdmin, entityPermissions]);

  // Verificar se tem qualquer permissão no módulo
  const hasModuleAccess = useCallback((moduleName: string) => 
    hasAnyModulePermission(moduleName), [hasAnyModulePermission]);

  // Verificar se é super admin
  const isSuperAdmin = useCallback(() => isAdmin, [isAdmin]);

  // Verificar permissão específica (assíncrono)
  const checkPermission = useCallback(async (
    type: 'module' | 'entity',
    name: string,
    action: PermissionAction
  ) => {
    if (type === 'module') {
      return await checkModulePermission(name, action);
    } else {
      return await checkEntityPermission(name, action);
    }
  }, [checkModulePermission, checkEntityPermission]);

  // Verificar acesso a empresa
  const hasCompanyAccess = useCallback(async (companyId: string) => 
    await checkCompanyAccess(companyId), [checkCompanyAccess]);

  return {
    // Estado
    isAdmin,
    isSuperAdmin,
    loading,
    
    // Permissões de módulo
    canReadModule,
    canCreateModule,
    canEditModule,
    canDeleteModule,
    hasModuleAccess,
    hasModulePermission, // Adicionado para compatibilidade
    
    // Permissões de entidade
    canReadEntity,
    canCreateEntity,
    canEditEntity,
    canDeleteEntity,
    hasEntityPermission, // Função síncrona para verificar permissões de entidade
    
    // Verificações assíncronas
    checkPermission,
    hasCompanyAccess,
    
    // Funções originais
    checkModulePermission,
    checkEntityPermission,
    checkCompanyAccess
  };
};

