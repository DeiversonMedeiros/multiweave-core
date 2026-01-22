import React from 'react';
import { useLocation } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionAction } from '@/hooks/useAuthorization';
import { Button, ButtonProps } from '@/components/ui/button';

interface PermissionGuardProps {
  children: React.ReactNode;
  module?: string;
  page?: string; // Caminho da página (se não especificado, usa o caminho atual)
  action?: PermissionAction;
  fallback?: React.ReactNode;
  showFallback?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  module,
  page,
  action = 'read',
  fallback,
  showFallback = true
}) => {
  const location = useLocation();
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
    isAdmin
  } = usePermissions();

  // Usar page especificado ou caminho atual
  const pageToCheck = page || location.pathname;

  const checkPermission = () => {
    // Super admin tem acesso a tudo
    if (isAdmin) return true;

    // Verificar permissão de página (prioridade mais alta)
    if (page !== undefined || (!module)) {
      switch (action) {
        case 'read':
          return canReadPage(pageToCheck);
        case 'create':
          return canCreatePage(pageToCheck);
        case 'edit':
          return canEditPage(pageToCheck);
        case 'delete':
          return canDeletePage(pageToCheck);
        default:
          return canReadPage(pageToCheck);
      }
    }

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
  page?: string; // Caminho da página
  action?: PermissionAction;
  onClick?: () => void;
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  children,
  module,
  page,
  action = 'read',
  disabled = false,
  className = '',
  onClick,
  ...buttonProps
}) => {
  const location = useLocation();
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
    isAdmin
  } = usePermissions();

  // Usar page especificado ou caminho atual
  const pageToCheck = page || location.pathname;

  const checkPermission = () => {
    if (isAdmin) return true;

    // Verificar permissão de página (prioridade mais alta)
    if (page !== undefined || (!module)) {
      switch (action) {
        case 'read':
          return canReadPage(pageToCheck);
        case 'create':
          return canCreatePage(pageToCheck);
        case 'edit':
          return canEditPage(pageToCheck);
        case 'delete':
          return canDeletePage(pageToCheck);
        default:
          return canReadPage(pageToCheck);
      }
    }

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
  page?: string;
  action?: PermissionAction;
  className?: string;
}

export const PermissionLink: React.FC<PermissionLinkProps> = ({
  children,
  to,
  module,
  page,
  action = 'read',
  className = ''
}) => {
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
    isAdmin
  } = usePermissions();

  // Usar page especificado ou caminho do link
  const pageToCheck = page || to;

  const checkPermission = () => {
    if (isAdmin) return true;

    // Verificar permissão de página (prioridade mais alta)
    if (page !== undefined || (!module)) {
      switch (action) {
        case 'read':
          return canReadPage(pageToCheck);
        case 'create':
          return canCreatePage(pageToCheck);
        case 'edit':
          return canEditPage(pageToCheck);
        case 'delete':
          return canDeletePage(pageToCheck);
        default:
          return canReadPage(pageToCheck);
      }
    }

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

