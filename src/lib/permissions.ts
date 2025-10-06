// Configuração centralizada de permissões
export const PERMISSION_CONFIG = {
  // Mapeamento de módulos para itens de menu
  MODULE_TO_MENU: {
    'dashboard': ['dashboard'],
    'users': ['users'],
    'companies': ['companies'],
    'projects': ['projects'],
    'materials': ['materials'],
    'partners': ['partners'],
    'cost_centers': ['cost_centers'],
    'configuracoes': ['configuracoes'],
  },
  
  // Ações disponíveis para cada entidade
  ENTITY_ACTIONS: {
    'users': ['read', 'create', 'edit', 'delete'],
    'companies': ['read', 'create', 'edit', 'delete'],
    'profiles': ['read', 'create', 'edit', 'delete'],
    'projects': ['read', 'create', 'edit', 'delete'],
    'materials': ['read', 'create', 'edit', 'delete'],
    'partners': ['read', 'create', 'edit', 'delete'],
    'cost_centers': ['read', 'create', 'edit', 'delete'],
  },
  
  // Perfis especiais e suas permissões
  SPECIAL_PROFILES: {
    'Super Admin': {
      hasAllPermissions: true,
      description: 'Acesso total ao sistema'
    },
    'Administrador': {
      modules: ['dashboard', 'users', 'companies', 'projects', 'materials', 'partners', 'cost_centers', 'configuracoes'],
      entities: ['users', 'companies', 'profiles', 'projects', 'materials', 'partners', 'cost_centers'],
      description: 'Acesso administrativo completo'
    },
    'Usuário': {
      modules: ['dashboard'],
      entities: [],
      description: 'Acesso básico ao sistema'
    },
  },
  
  // Módulos do sistema
  MODULES: {
    'dashboard': {
      name: 'Dashboard',
      description: 'Painel principal do sistema',
      icon: 'Home',
      path: '/dashboard'
    },
    'users': {
      name: 'Usuários',
      description: 'Gestão de usuários do sistema',
      icon: 'Users',
      path: '/cadastros/usuarios'
    },
    'companies': {
      name: 'Empresas',
      description: 'Gestão de empresas',
      icon: 'Building',
      path: '/cadastros/empresas'
    },
    'projects': {
      name: 'Projetos',
      description: 'Gestão de projetos',
      icon: 'Folder',
      path: '/cadastros/projetos'
    },
    'materials': {
      name: 'Materiais',
      description: 'Gestão de materiais',
      icon: 'Package',
      path: '/cadastros/materiais'
    },
    'partners': {
      name: 'Parceiros',
      description: 'Gestão de parceiros',
      icon: 'Handshake',
      path: '/cadastros/parceiros'
    },
    'cost_centers': {
      name: 'Centros de Custo',
      description: 'Gestão de centros de custo',
      icon: 'DollarSign',
      path: '/cadastros/centros-custo'
    },
    'configuracoes': {
      name: 'Configurações',
      description: 'Configurações do sistema e permissões',
      icon: 'Settings',
      path: '/permissoes'
    },
  },
  
  // Entidades do sistema
  ENTITIES: {
    'users': {
      name: 'Usuários',
      description: 'Entidade de usuários',
      table: 'users'
    },
    'companies': {
      name: 'Empresas',
      description: 'Entidade de empresas',
      table: 'companies'
    },
    'profiles': {
      name: 'Perfis',
      description: 'Entidade de perfis de acesso',
      table: 'profiles'
    },
    'projects': {
      name: 'Projetos',
      description: 'Entidade de projetos',
      table: 'projects'
    },
    'materials': {
      name: 'Materiais',
      description: 'Entidade de materiais',
      table: 'materials'
    },
    'partners': {
      name: 'Parceiros',
      description: 'Entidade de parceiros',
      table: 'partners'
    },
    'cost_centers': {
      name: 'Centros de Custo',
      description: 'Entidade de centros de custo',
      table: 'cost_centers'
    },
  },
  
  // Ações disponíveis
  ACTIONS: {
    'read': {
      name: 'Visualizar',
      description: 'Permite visualizar dados',
      icon: 'Eye'
    },
    'create': {
      name: 'Criar',
      description: 'Permite criar novos registros',
      icon: 'Plus'
    },
    'edit': {
      name: 'Editar',
      description: 'Permite editar registros existentes',
      icon: 'Edit'
    },
    'delete': {
      name: 'Excluir',
      description: 'Permite excluir registros',
      icon: 'Trash'
    },
  }
};

// Função para verificar se um módulo está disponível
export const isModuleAvailable = (moduleName: string): boolean => {
  return moduleName in PERMISSION_CONFIG.MODULES;
};

// Função para verificar se uma entidade está disponível
export const isEntityAvailable = (entityName: string): boolean => {
  return entityName in PERMISSION_CONFIG.ENTITIES;
};

// Função para obter informações de um módulo
export const getModuleInfo = (moduleName: string) => {
  return PERMISSION_CONFIG.MODULES[moduleName as keyof typeof PERMISSION_CONFIG.MODULES];
};

// Função para obter informações de uma entidade
export const getEntityInfo = (entityName: string) => {
  return PERMISSION_CONFIG.ENTITIES[entityName as keyof typeof PERMISSION_CONFIG.ENTITIES];
};

// Função para obter informações de uma ação
export const getActionInfo = (action: string) => {
  return PERMISSION_CONFIG.ACTIONS[action as keyof typeof PERMISSION_CONFIG.ACTIONS];
};

// Função para obter todos os módulos disponíveis
export const getAllModules = () => {
  return Object.entries(PERMISSION_CONFIG.MODULES).map(([key, value]) => ({
    key,
    ...value
  }));
};

// Função para obter todas as entidades disponíveis
export const getAllEntities = () => {
  return Object.entries(PERMISSION_CONFIG.ENTITIES).map(([key, value]) => ({
    key,
    ...value
  }));
};

// Função para obter todas as ações disponíveis
export const getAllActions = () => {
  return Object.entries(PERMISSION_CONFIG.ACTIONS).map(([key, value]) => ({
    key,
    ...value
  }));
};

