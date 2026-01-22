import { useState, useEffect } from 'react';
import { usePermissions } from './usePermissions';
import { PermissionAction } from './useAuthorization';

const ENTITY_TO_PAGE: Record<string, string> = {
  users: '/cadastros/usuarios*', companies: '/cadastros/empresas*', profiles: '/cadastros/perfis*',
  projects: '/cadastros/projetos*', partners: '/cadastros/parceiros*', cost_centers: '/cadastros/centros-custo*',
  services: '/cadastros/servicos*', employees: '/rh/employees*', cotacoes: '/compras/cotacoes*',
  solicitacoes_compra: '/compras/requisicoes*', pedidos_compra: '/compras/pedidos*'
};

interface PermissionCheckOptions {
  module?: string;
  entity?: string;
  page?: string;
  action?: PermissionAction;
  companyId?: string;
}

export const usePermissionCheck = (options: PermissionCheckOptions) => {
  const {
    canReadModule,
    canCreateModule,
    canEditModule,
    canDeleteModule,
    canReadPage,
    canCreatePage,
    canEditPage,
    canDeletePage,
    hasModuleAccess,
    hasCompanyAccess,
    isAdmin
  } = usePermissions();

  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      setLoading(true);

      try {
        let permission = false;
        const action = options.action;

        if (options.module && action) {
          switch (action) {
            case 'read': permission = canReadModule(options.module); break;
            case 'create': permission = canCreateModule(options.module); break;
            case 'edit': permission = canEditModule(options.module); break;
            case 'delete': permission = canDeleteModule(options.module); break;
          }
        }

        const pagePath = options.page || (options.entity ? ENTITY_TO_PAGE[options.entity] : null);
        if (pagePath && action) {
          switch (action) {
            case 'read': permission = permission || canReadPage(pagePath); break;
            case 'create': permission = permission || canCreatePage(pagePath); break;
            case 'edit': permission = permission || canEditPage(pagePath); break;
            case 'delete': permission = permission || canDeletePage(pagePath); break;
          }
        }

        if (options.companyId) {
          const companyAccess = await hasCompanyAccess(options.companyId);
          permission = permission && companyAccess;
        }

        setHasPermission(permission);
      } catch (error) {
        console.error('Erro ao verificar permissão:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [options, canReadModule, canCreateModule, canEditModule, canDeleteModule,
      canReadPage, canCreatePage, canEditPage, canDeletePage, hasModuleAccess, hasCompanyAccess]);

  return {
    hasPermission,
    loading,
    isAdmin
  };
};

// Hook para verificar acesso a módulo
export const useModuleAccess = (moduleName: string, action: PermissionAction = 'read') => {
  return usePermissionCheck({ module: moduleName, action });
};

/** @deprecated Use usePermissionCheck({ page: '/path*', action }) ou usePageAccess */
export const useEntityAccess = (entityName: string, action: PermissionAction = 'read') => {
  return usePermissionCheck({ entity: entityName, action });
};

export const usePageAccess = (pagePath: string, action: PermissionAction = 'read') => {
  return usePermissionCheck({ page: pagePath, action });
};

// Hook para verificar acesso a empresa
export const useCompanyAccess = (companyId: string) => {
  return usePermissionCheck({ companyId });
};

