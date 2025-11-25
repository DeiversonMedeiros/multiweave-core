import { useMemo } from 'react';
import { useAuthorization } from './useAuthorization';

// Mapeamento de módulos para suas rotas padrão
const MODULE_ROUTE_MAP: Record<string, string> = {
  'dashboard': '/',
  'portal_colaborador': '/portal-colaborador',
  'portal_gestor': '/portal-gestor',
  'cadastros': '/cadastros',
  'financeiro': '/financeiro',
  'compras': '/compras',
  'almoxarifado': '/almoxarifado',
  'frota': '/frota',
  'rh': '/rh',
  'logistica': '/logistica',
  'configuracoes': '/permissoes',
  // Sub-módulos com rotas específicas
  'users': '/cadastros/usuarios',
  'companies': '/cadastros/empresas',
  'projects': '/cadastros/projetos',
  'partners': '/cadastros/parceiros',
  'cost_centers': '/cadastros/centros-custo',
};

// Ordem de prioridade para redirecionamento (portais primeiro, depois módulos principais)
const MODULE_PRIORITY_ORDER = [
  'portal_colaborador',
  'portal_gestor',
  'rh',
  'financeiro',
  'compras',
  'almoxarifado',
  'frota',
  'logistica',
  'cadastros',
  'users',
  'companies',
  'projects',
  'partners',
  'cost_centers',
  'configuracoes',
];

/**
 * Hook para determinar a rota padrão que o usuário deve ser redirecionado
 * baseado em suas permissões de módulo
 */
export const useDefaultRoute = () => {
  const { permissions, isAdmin, loading, hasModulePermission } = useAuthorization();

  const defaultRoute = useMemo(() => {
    // Se está carregando ou é admin, retorna dashboard
    if (loading || isAdmin) {
      return '/';
    }

    // Se não tem permissões, retorna dashboard (será bloqueado pelo RequireModule)
    if (!permissions || permissions.length === 0) {
      return '/';
    }

    // Verifica se tem acesso ao dashboard
    const hasDashboardAccess = hasModulePermission('dashboard', 'read');
    if (hasDashboardAccess) {
      return '/';
    }

    // Busca a primeira página que o usuário tem acesso
    // Seguindo a ordem de prioridade definida
    for (const moduleName of MODULE_PRIORITY_ORDER) {
      if (hasModulePermission(moduleName, 'read')) {
        const route = MODULE_ROUTE_MAP[moduleName];
        if (route) {
          return route;
        }
      }
    }

    // Se não encontrou nenhuma rota específica, busca em todas as permissões
    // na ordem que aparecem (pode ser qualquer ordem)
    for (const permission of permissions) {
      if (permission.can_read) {
        const route = MODULE_ROUTE_MAP[permission.module_name];
        if (route) {
          return route;
        }
      }
    }

    // Fallback: retorna dashboard (será bloqueado pelo RequireModule se não tiver acesso)
    return '/';
  }, [permissions, isAdmin, loading, hasModulePermission]);

  return {
    defaultRoute,
    hasDashboardAccess: useMemo(() => {
      if (loading || isAdmin) return true;
      return hasModulePermission('dashboard', 'read');
    }, [loading, isAdmin, hasModulePermission]),
    loading,
  };
};

