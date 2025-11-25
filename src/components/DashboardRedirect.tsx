import { Navigate } from 'react-router-dom';
import { useDefaultRoute } from '@/hooks/useDefaultRoute';

/**
 * Componente que verifica se o usuário tem acesso ao Dashboard
 * e redireciona para a primeira página que ele tem acesso caso não tenha
 */
export const DashboardRedirect = () => {
  const { defaultRoute, hasDashboardAccess, loading } = useDefaultRoute();

  // Durante o carregamento, retorna null para evitar redirecionamento prematuro
  if (loading) {
    return null;
  }

  // Se não tem acesso ao dashboard, redireciona para a rota padrão
  if (!hasDashboardAccess && defaultRoute !== '/') {
    return <Navigate to={defaultRoute} replace />;
  }

  // Se tem acesso, retorna null para permitir renderização normal do Dashboard
  return null;
};

