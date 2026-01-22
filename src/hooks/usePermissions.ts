import { useCallback } from 'react';
import { useAuthorization, PermissionAction } from './useAuthorization';

export const usePermissions = () => {
  const {
    isAdmin,
    permissions,
    pagePermissions,
    hasModulePermission,
    hasAnyModulePermission,
    hasPagePermission,
    checkModulePermission,
    checkPagePermission,
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


  // Verificar se tem qualquer permissão no módulo
  const hasModuleAccess = useCallback((moduleName: string) => 
    hasAnyModulePermission(moduleName), [hasAnyModulePermission]);

  // Verificar se é super admin
  const isSuperAdmin = useCallback(() => isAdmin, [isAdmin]);

  // Verificar permissão de página (síncrono)
  const canReadPage = useCallback((pagePath: string) => 
    hasPagePermission(pagePath, 'read'), [hasPagePermission]);

  const canCreatePage = useCallback((pagePath: string) => 
    hasPagePermission(pagePath, 'create'), [hasPagePermission]);

  const canEditPage = useCallback((pagePath: string) => 
    hasPagePermission(pagePath, 'edit'), [hasPagePermission]);

  const canDeletePage = useCallback((pagePath: string) => 
    hasPagePermission(pagePath, 'delete'), [hasPagePermission]);

  // Verificar permissão específica (assíncrono)
  const checkPermission = useCallback(async (
    type: 'module' | 'page',
    name: string,
    action: PermissionAction
  ) => {
    if (type === 'module') {
      return await checkModulePermission(name, action);
    } else {
      return await checkPagePermission(name, action);
    }
  }, [checkModulePermission, checkPagePermission]);

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
    hasModulePermission,
    
    // Permissões de página
    canReadPage,
    canCreatePage,
    canEditPage,
    canDeletePage,
    hasPagePermission,
    
    // Verificações assíncronas
    checkPermission,
    hasCompanyAccess,
    
    // Funções originais
    checkModulePermission,
    checkPagePermission,
    checkCompanyAccess
  };
};

