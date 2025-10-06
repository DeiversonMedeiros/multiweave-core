import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';

interface RequireAuthProps {
  children: React.ReactNode;
  requiredPermission?: {
    type: 'module' | 'entity';
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

  // Temporariamente permitir acesso para todos os usuários autenticados
  // TODO: Implementar verificação de permissões quando o sistema estiver estável
  // if (requiredPermission) {
  //   const hasPermission = requiredPermission.type === 'module' 
  //     ? hasModulePermission(requiredPermission.name, requiredPermission.action)
  //     : hasModulePermission(requiredPermission.name, requiredPermission.action);

  //   if (!hasPermission) {
  //     return fallback || (
  //       <div className="flex items-center justify-center min-h-screen">
  //         <div className="text-center">
  //           <h1 className="text-2xl font-bold text-gray-900 mb-4">
  //             Acesso Negado
  //           </h1>
  //           <p className="text-gray-600 mb-4">
  //             Você não tem permissão para acessar esta página.
  //           </p>
  //           <button
  //             onClick={() => navigate(-1)}
  //             className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
  //           >
  //             Voltar
  //           </button>
  //         </div>
  //       </div>
  //     );
  //   }
  // }

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

// Componente para proteger por entidade
interface RequireEntityProps {
  children: React.ReactNode;
  entityName: string;
  action?: 'read' | 'create' | 'edit' | 'delete';
  fallback?: React.ReactNode;
}

export const RequireEntity: React.FC<RequireEntityProps> = ({ 
  children, 
  entityName, 
  action = 'read',
  fallback 
}) => {
  return (
    <RequireAuth 
      requiredPermission={{ type: 'entity', name: entityName, action }}
      fallback={fallback}
    >
      {children}
    </RequireAuth>
  );
};

