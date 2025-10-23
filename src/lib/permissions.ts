// Configuração centralizada de permissões
export const PERMISSION_CONFIG = {
  // Mapeamento de módulos para itens de menu
  MODULE_TO_MENU: {
    'dashboard': ['dashboard'],
    'users': ['users'],
    'companies': ['companies'],
    'projects': ['projects'],
    'materials_equipment': ['materiais_equipamentos'],
    'partners': ['partners'],
    'cost_centers': ['cost_centers'],
    'cadastros': ['cadastros'],
    'configuracoes': ['configuracoes'],
    'portal_colaborador': ['portal_colaborador'],
    'portal_gestor': ['portal_gestor'],
    'financeiro': ['financeiro'],
    'compras': ['compras'],
    'almoxarifado': ['almoxarifado'],
    'frota': ['frota'],
    'logistica': ['logistica'],
    'rh': ['rh'],
    'recruitment': ['recruitment'],
    'treinamento': ['treinamento'],
    'combustivel': ['combustivel'],
    'metalurgica': ['metalurgica'],
    'comercial': ['comercial'],
    'implantacao': ['implantacao']
  },
  
  // Ações disponíveis para cada entidade
  ENTITY_ACTIONS: {
    // Entidades básicas
    'usuarios': ['read', 'create', 'edit', 'delete'],
    'empresas': ['read', 'create', 'edit', 'delete'],
    'perfis': ['read', 'create', 'edit', 'delete'],
    'projetos': ['read', 'create', 'edit', 'delete'],
    'materiais_equipamentos': ['read', 'create', 'edit', 'delete'],
    'parceiros': ['read', 'create', 'edit', 'delete'],
    'centros_custo': ['read', 'create', 'edit', 'delete'],
    'unidades': ['read', 'create', 'edit', 'delete'],
    
    // Entidades RH
    'funcionarios': ['read', 'create', 'edit', 'delete'],
    'cargos': ['read', 'create', 'edit', 'delete'],
    'registros_ponto': ['read', 'create', 'edit', 'delete'],
    'ferias': ['read', 'create', 'edit', 'delete'],
    'reembolsos': ['read', 'create', 'edit', 'delete'],
    'exames_periodicos': ['read', 'create', 'edit', 'delete'],
    'acoes_disciplinares': ['read', 'create', 'edit', 'delete'],
    'treinamentos': ['read', 'create', 'edit', 'delete'],
    
    // Entidades Financeiras
    'contas_pagar': ['read', 'create', 'edit', 'delete'],
    'contas_receber': ['read', 'create', 'edit', 'delete'],
    'borderos': ['read', 'create', 'edit', 'delete'],
    'remessas_bancarias': ['read', 'create', 'edit', 'delete'],
    'retornos_bancarios': ['read', 'create', 'edit', 'delete'],
    'contas_bancarias': ['read', 'create', 'edit', 'delete'],
    'conciliacoes_bancarias': ['read', 'create', 'edit', 'delete'],
    'fluxo_caixa': ['read', 'create', 'edit', 'delete'],
    'nfe': ['read', 'create', 'edit', 'delete'],
    'nfse': ['read', 'create', 'edit', 'delete'],
    'plano_contas': ['read', 'create', 'edit', 'delete'],
    'lancamentos_contabeis': ['read', 'create', 'edit', 'delete'],
    'configuracoes_aprovacao': ['read', 'create', 'edit', 'delete'],
    'aprovacoes': ['read', 'create', 'edit', 'delete'],
    
    // Entidades Almoxarifado
    'estoque_atual': ['read', 'create', 'edit', 'delete'],
    'movimentacoes_estoque': ['read', 'create', 'edit', 'delete'],
    'entradas_materiais': ['read', 'create', 'edit', 'delete'],
    'entrada_itens': ['read', 'create', 'edit', 'delete'],
    'checklist_recebimento': ['read', 'create', 'edit', 'delete'],
    'transferencias': ['read', 'create', 'edit', 'delete'],
    'transferencia_itens': ['read', 'create', 'edit', 'delete'],
    'inventarios': ['read', 'create', 'edit', 'delete'],
    'inventario_itens': ['read', 'create', 'edit', 'delete'],
    'almoxarifados': ['read', 'create', 'edit', 'delete'],
    'materiais_equipamentos': ['read', 'create', 'edit', 'delete'],
    
    // Entidades do Processo de Compras
    'solicitacoes_compra': ['read', 'create', 'edit', 'delete'],
    'cotacoes': ['read', 'create', 'edit', 'delete'],
    'pedidos_compra': ['read', 'create', 'edit', 'delete'],
    'aprovacoes_compra': ['read', 'create', 'edit', 'delete'],
    'fornecedores': ['read', 'create', 'edit', 'delete'],
    'contratos_compra': ['read', 'create', 'edit', 'delete'],
    'historico_compras': ['read', 'create', 'edit', 'delete'],
    'avaliacao_fornecedores': ['read', 'create', 'edit', 'delete']
  },
  
  // Perfis especiais e suas permissões
  SPECIAL_PROFILES: {
    'Super Admin': {
      hasAllPermissions: true,
      description: 'Acesso total ao sistema'
    },
    'Administrador': {
      modules: ['dashboard', 'users', 'companies', 'projects', 'materials_equipment', 'partners', 'cost_centers', 'configuracoes'],
      entities: ['users', 'companies', 'profiles', 'projects', 'materials_equipment', 'partners', 'cost_centers'],
      description: 'Acesso administrativo completo'
    },
    'Usuário': {
      modules: ['dashboard'],
      entities: [],
      description: 'Acesso básico ao sistema'
    },
    'Colaborador': {
      modules: ['portal_colaborador'],
      entities: ['employees', 'time_records', 'vacations', 'reimbursements'],
      description: 'Acesso ao portal do colaborador'
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
    'materials_equipment': {
      name: 'Materiais e Equipamentos',
      description: 'Gestão de materiais e equipamentos do almoxarifado',
      icon: 'Package',
      path: '/almoxarifado/materiais'
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
    'cadastros': {
      name: 'Cadastros',
      description: 'Módulo de cadastros gerais',
      icon: 'FileText',
      path: '/cadastros'
    },
    'configuracoes': {
      name: 'Configurações',
      description: 'Configurações do sistema e permissões',
      icon: 'Settings',
      path: '/permissoes'
    },
    'portal_colaborador': {
      name: 'Portal do Colaborador',
      description: 'Portal para colaboradores',
      icon: 'User',
      path: '/portal-colaborador'
    },
  },
  
  // Entidades do sistema
  ENTITIES: {
    'usuarios': {
      name: 'Usuários',
      description: 'Entidade de usuários',
      table: 'users'
    },
    'empresas': {
      name: 'Empresas',
      description: 'Entidade de empresas',
      table: 'companies'
    },
    'perfis': {
      name: 'Perfis',
      description: 'Entidade de perfis de acesso',
      table: 'profiles'
    },
    'projetos': {
      name: 'Projetos',
      description: 'Entidade de projetos',
      table: 'projects'
    },
    'materiais_equipamentos': {
      name: 'Materiais e Equipamentos',
      description: 'Entidade de materiais e equipamentos do almoxarifado',
      table: 'materiais_equipamentos'
    },
    'parceiros': {
      name: 'Parceiros',
      description: 'Entidade de parceiros',
      table: 'partners'
    },
    'centros_custo': {
      name: 'Centros de Custo',
      description: 'Entidade de centros de custo',
      table: 'cost_centers'
    },
    'unidades': {
      name: 'Departamentos',
      description: 'Entidade de departamentos/unidades',
      table: 'units'
    },
    
    // Entidades do Processo de Compras
    'solicitacoes_compra': {
      name: 'Solicitações de Compra',
      description: 'Entidade de solicitações de compra',
      table: 'solicitacoes_compra'
    },
    'cotacoes': {
      name: 'Cotações',
      description: 'Entidade de cotações de preços',
      table: 'cotacoes'
    },
    'pedidos_compra': {
      name: 'Pedidos de Compra',
      description: 'Entidade de pedidos de compra',
      table: 'pedidos_compra'
    },
    'aprovacoes_compra': {
      name: 'Aprovações de Compra',
      description: 'Entidade de aprovações de compra',
      table: 'aprovacoes_compra'
    },
    'fornecedores': {
      name: 'Fornecedores',
      description: 'Entidade de fornecedores',
      table: 'fornecedores'
    },
    'contratos_compra': {
      name: 'Contratos de Compra',
      description: 'Entidade de contratos de compra',
      table: 'contratos_compra'
    },
    'historico_compras': {
      name: 'Histórico de Compras',
      description: 'Entidade de histórico de compras',
      table: 'historico_compras'
    },
    'avaliacao_fornecedores': {
      name: 'Avaliação de Fornecedores',
      description: 'Entidade de avaliação de fornecedores',
      table: 'avaliacao_fornecedores'
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

