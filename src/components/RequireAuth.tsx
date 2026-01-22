import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/hooks/usePermissions';

interface RequireAuthProps {
  children: React.ReactNode;
  requiredPermission?: {
    type: 'module' | 'page';
    name: string;
    action: 'read' | 'create' | 'edit' | 'delete';
  };
  fallback?: React.ReactNode;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ 
  children, 
  requiredPermission,
  fallback 
}) => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      signOut();
      navigate('/login');
    }
  }, [user, loading, signOut, navigate]);

  // Mostrar loading enquanto carrega
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Se não tem usuário, não renderiza nada (será redirecionado)
  if (!user) {
    return null;
  }

  // Verificação de permissões habilitada
  if (requiredPermission) {
    const { isAdmin, hasModulePermission, hasPagePermission, loading: permissionsLoading } = usePermissions();
    const location = useLocation();
    
    // Mostrar loading enquanto carrega permissões
    if (permissionsLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }
    
    if (isAdmin) {
      return <>{children}</>;
    }

    let hasPermission = false;
    if (requiredPermission.type === 'module') {
      hasPermission = hasModulePermission(requiredPermission.name, requiredPermission.action);
    } else if (requiredPermission.type === 'page') {
      // Para páginas, usar o caminho atual se não foi especificado
      const pagePath = requiredPermission.name || location.pathname;
      hasPermission = hasPagePermission(pagePath, requiredPermission.action);
    }

    if (!hasPermission) {
      return fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Acesso Negado
            </h1>
            <p className="text-gray-600 mb-4">
              Você não tem permissão para acessar esta página.
            </p>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Voltar
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

// Componente para proteger por módulo
interface RequireModuleProps {
  children: React.ReactNode;
  moduleName: string;
  action?: 'read' | 'create' | 'edit' | 'delete';
  fallback?: React.ReactNode;
}

export const RequireModule: React.FC<RequireModuleProps> = ({ 
  children, 
  moduleName, 
  action = 'read',
  fallback 
}) => {
  return (
    <RequireAuth 
      requiredPermission={{ type: 'module', name: moduleName, action }}
      fallback={fallback}
    >
      {children}
    </RequireAuth>
  );
};

// Componente para proteger por página
interface RequirePageProps {
  children: React.ReactNode;
  pagePath?: string; // Se não especificado, usa o caminho atual
  action?: 'read' | 'create' | 'edit' | 'delete';
  fallback?: React.ReactNode;
}

export const RequirePage: React.FC<RequirePageProps> = ({ 
  children, 
  pagePath,
  action = 'read',
  fallback 
}) => {
  const location = useLocation();
  const actualPath = pagePath || location.pathname;

  return (
    <RequireAuth 
      requiredPermission={{ type: 'page', name: actualPath, action }}
      fallback={fallback}
    >
      {children}
    </RequireAuth>
  );
};

