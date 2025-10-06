import { useState, useEffect } from 'react';
import { usePermissions } from './usePermissions';
import { PermissionAction } from './useAuthorization';

interface PermissionCheckOptions {
  module?: string;
  entity?: string;
  action?: PermissionAction;
  companyId?: string;
}

export const usePermissionCheck = (options: PermissionCheckOptions) => {
  const {
    canReadModule,
    canCreateModule,
    canEditModule,
    canDeleteModule,
    canReadEntity,
    canCreateEntity,
    canEditEntity,
    canDeleteEntity,
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

        // Verificar permissão de módulo
        if (options.module && options.action) {
          switch (options.action) {
            case 'read':
              permission = canReadModule(options.module);
              break;
            case 'create':
              permission = canCreateModule(options.module);
              break;
            case 'edit':
              permission = canEditModule(options.module);
              break;
            case 'delete':
              permission = canDeleteModule(options.module);
              break;
          }
        }

        // Verificar permissão de entidade
        if (options.entity && options.action) {
          switch (options.action) {
            case 'read':
              permission = canReadEntity(options.entity);
              break;
            case 'create':
              permission = canCreateEntity(options.entity);
              break;
            case 'edit':
              permission = canEditEntity(options.entity);
              break;
            case 'delete':
              permission = canDeleteEntity(options.entity);
              break;
          }
        }

        // Verificar acesso a empresa
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
      canReadEntity, canCreateEntity, canEditEntity, canDeleteEntity, 
      hasModuleAccess, hasCompanyAccess]);

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

// Hook para verificar acesso a entidade
export const useEntityAccess = (entityName: string, action: PermissionAction = 'read') => {
  return usePermissionCheck({ entity: entityName, action });
};

// Hook para verificar acesso a empresa
export const useCompanyAccess = (companyId: string) => {
  return usePermissionCheck({ companyId });
};

