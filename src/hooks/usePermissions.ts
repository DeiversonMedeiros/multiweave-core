import { useCallback } from 'react';
import { useAuthorization, PermissionAction } from './useAuthorization';

export const usePermissions = () => {
  const {
    isAdmin,
    hasModulePermission,
    hasAnyModulePermission,
    checkModulePermission,
    checkEntityPermission,
    checkCompanyAccess
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
    hasModulePermission(entityName, 'read'), [hasModulePermission]);

  const canCreateEntity = useCallback((entityName: string) => 
    hasModulePermission(entityName, 'create'), [hasModulePermission]);

  const canEditEntity = useCallback((entityName: string) => 
    hasModulePermission(entityName, 'edit'), [hasModulePermission]);

  const canDeleteEntity = useCallback((entityName: string) => 
    hasModulePermission(entityName, 'delete'), [hasModulePermission]);

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
    
    // Permissões de módulo
    canReadModule,
    canCreateModule,
    canEditModule,
    canDeleteModule,
    hasModuleAccess,
    
    // Permissões de entidade
    canReadEntity,
    canCreateEntity,
    canEditEntity,
    canDeleteEntity,
    
    // Verificações assíncronas
    checkPermission,
    hasCompanyAccess,
    
    // Funções originais
    checkModulePermission,
    checkEntityPermission,
    checkCompanyAccess
  };
};

