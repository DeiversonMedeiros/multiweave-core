import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionAction } from '@/hooks/useAuthorization';
import { Button, ButtonProps } from '@/components/ui/button';

interface PermissionGuardProps {
  children: React.ReactNode;
  module?: string;
  entity?: string;
  entityName?: string; // Alias para entity para compatibilidade
  action?: PermissionAction;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  module,
  entity,
  entityName,
  action = 'read',
  fallback,
  showFallback = true
}) => {
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
    isAdmin
  } = usePermissions();

  // Usar entityName se fornecido, caso contrário usar entity
  const entityToCheck = entityName || entity;

  const checkPermission = () => {
    // Super admin tem acesso a tudo
    if (isAdmin) return true;

    // Verificar permissão de módulo
    if (module) {
      switch (action) {
        case 'read':
          return canReadModule(module);
        case 'create':
          return canCreateModule(module);
        case 'edit':
          return canEditModule(module);
        case 'delete':
          return canDeleteModule(module);
        default:
          return hasModuleAccess(module);
      }
    }

    // Verificar permissão de entidade
    if (entityToCheck) {
      switch (action) {
        case 'read':
          return canReadEntity(entityToCheck);
        case 'create':
          return canCreateEntity(entityToCheck);
        case 'edit':
          return canEditEntity(entityToCheck);
        case 'delete':
          return canDeleteEntity(entityToCheck);
        default:
          return canReadEntity(entityToCheck);
      }
    }

    return false;
  };

  const hasPermission = checkPermission();

  if (!hasPermission) {
    if (showFallback && fallback) {
      return <>{fallback}</>;
    }
    return null;
  }

  return <>{children}</>;
};

// Componente para proteger botões
interface PermissionButtonProps extends Omit<ButtonProps, 'onClick'> {
  children: React.ReactNode;
  module?: string;
  entity?: string;
  entityName?: string; // Alias para entity para compatibilidade
  action?: PermissionAction;
  onClick?: () => void;
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  children,
  module,
  entity,
  entityName,
  action = 'read',
  disabled = false,
  className = '',
  onClick,
  ...buttonProps
}) => {
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
    isAdmin
  } = usePermissions();

  // Usar entityName se fornecido, caso contrário usar entity
  const entityToCheck = entityName || entity;

  const checkPermission = () => {
    if (isAdmin) return true;

    if (module) {
      switch (action) {
        case 'read':
          return canReadModule(module);
        case 'create':
          return canCreateModule(module);
        case 'edit':
          return canEditModule(module);
        case 'delete':
          return canDeleteModule(module);
        default:
          return hasModuleAccess(module);
      }
    }

    if (entityToCheck) {
      switch (action) {
        case 'read':
          return canReadEntity(entityToCheck);
        case 'create':
          return canCreateEntity(entityToCheck);
        case 'edit':
          return canEditEntity(entityToCheck);
        case 'delete':
          return canDeleteEntity(entityToCheck);
        default:
          return canReadEntity(entityToCheck);
      }
    }

    return false;
  };

  const hasPermission = checkPermission();

  if (!hasPermission) {
    return null;
  }

  return (
    <Button
      className={className}
      disabled={disabled}
      onClick={onClick}
      {...buttonProps}
    >
      {children}
    </Button>
  );
};

// Componente para proteger links
interface PermissionLinkProps {
  children: React.ReactNode;
  to: string;
  module?: string;
  entity?: string;
  action?: PermissionAction;
  className?: string;
}

export const PermissionLink: React.FC<PermissionLinkProps> = ({
  children,
  to,
  module,
  entity,
  action = 'read',
  className = ''
}) => {
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
    isAdmin
  } = usePermissions();

  const checkPermission = () => {
    if (isAdmin) return true;

    if (module) {
      switch (action) {
        case 'read':
          return canReadModule(module);
        case 'create':
          return canCreateModule(module);
        case 'edit':
          return canEditModule(module);
        case 'delete':
          return canDeleteModule(module);
        default:
          return hasModuleAccess(module);
      }
    }

    if (entity) {
      switch (action) {
        case 'read':
          return canReadEntity(entity);
        case 'create':
          return canCreateEntity(entity);
        case 'edit':
          return canEditEntity(entity);
        case 'delete':
          return canDeleteEntity(entity);
        default:
          return canReadEntity(entity);
      }
    }

    return false;
  };

  const hasPermission = checkPermission();

  if (!hasPermission) {
    return null;
  }

  return (
    <a href={to} className={className}>
      {children}
    </a>
  );
};

