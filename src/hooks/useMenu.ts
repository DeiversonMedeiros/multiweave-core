import { useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/lib/company-context';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  LayoutDashboard,
  Building2,
  DollarSign,
  ShoppingCart,
  Package,
  Truck,
  MapPin,
  Users,
  Fuel,
  Factory,
  Store,
  Workflow,
  Settings,
  FolderOpen,
  UserCheck,
  UserPlus,
  Handshake,
  DollarSign as CostCenterIcon,
  Clock,
  Gift,
  Calculator,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  Globe,
  Building,
  GraduationCap,
  Stethoscope,
  RefreshCw,
  Shield,
  Heart,
  UserX,
  Accessibility,
  Upload,
  BarChart3,
  User,
  UserCog,
  Banknote,
  Receipt,
  ClipboardList,
  History,
  Edit,
  AlertTriangle,
  Plug,
  Wrench,
  Laptop,
  Clock3,
  Inbox,
  BarChart3 as BarChart3Icon,
  Target,
  Route,
  Bell,
  Car
} from 'lucide-react';

export interface MenuItem {
  id: string;
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  children?: MenuItem[];
  requiresPermission?: {
    type: 'module' | 'entity';
    name: string;
    action: 'read' | 'create' | 'edit' | 'delete';
  };
  isPortal?: boolean;
}

export const useMenu = () => {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  
  // Verificação de permissões habilitada
  const { isAdmin, hasModulePermission, hasEntityPermission, loading } = usePermissions();
  const canReadModule = (moduleName: string) => {
    if (isAdmin) return true;
    if (loading || typeof hasModulePermission !== 'function') {
      return true; // Permitir acesso durante carregamento
    }
    return hasModulePermission(moduleName, 'read');
  };
  
  const canReadEntity = (entityName: string) => {
    if (isAdmin) return true;
    if (loading || typeof hasEntityPermission !== 'function') {
      return true; // Permitir acesso durante carregamento
    }
    return hasEntityPermission(entityName, 'read');
  };

  const menuItems: MenuItem[] = useMemo(() => [
    {
      id: 'portal-colaborador',
      title: 'Portal do Colaborador',
      url: '/portal-colaborador',
      icon: User,
      description: 'Portal para colaboradores',
      requiresPermission: { type: 'module', name: 'portal_colaborador', action: 'read' },
      isPortal: true,
      children: [
        {
          id: 'colaborador-dashboard',
          title: 'Dashboard',
          url: '/portal-colaborador',
          icon: LayoutDashboard,
          description: 'Painel principal do colaborador',
          requiresPermission: { type: 'module', name: 'portal_colaborador', action: 'read' }
        },
        {
          id: 'colaborador-registro-ponto',
          title: 'Registro de Ponto',
          url: '/portal-colaborador/registro-ponto',
          icon: Clock,
          description: 'Registro de ponto eletrônico',
          requiresPermission: { type: 'module', name: 'portal_colaborador', action: 'read' }
        },
        {
          id: 'colaborador-correcao-ponto',
          title: 'Correção de Ponto',
          url: '/portal-colaborador/correcao-ponto',
          icon: Edit,
          description: 'Corrija seus registros de ponto',
          requiresPermission: { type: 'module', name: 'portal_colaborador', action: 'read' }
        },
        {
          id: 'colaborador-assinatura-ponto',
          title: 'Assinatura de Ponto',
          url: '/portal-colaborador/assinatura-ponto',
          icon: FileText,
          description: 'Assine seus registros de ponto mensais',
          requiresPermission: { type: 'module', name: 'portal_colaborador', action: 'read' }
        },
        {
          id: 'colaborador-historico-marcacoes',
          title: 'Histórico de Marcações',
          url: '/portal-colaborador/historico-marcacoes',
          icon: History,
          description: 'Visualize todas as suas marcações de ponto',
          requiresPermission: { type: 'module', name: 'portal_colaborador', action: 'read' }
        },
        {
          id: 'colaborador-banco-horas',
          title: 'Banco de Horas',
          url: '/portal-colaborador/banco-horas',
          icon: Clock,
          description: 'Controle de banco de horas',
          requiresPermission: { type: 'module', name: 'portal_colaborador', action: 'read' }
        },
        {
          id: 'colaborador-ferias',
          title: 'Férias',
          url: '/portal-colaborador/ferias',
          icon: Calendar,
          description: 'Solicitação e acompanhamento de férias',
          requiresPermission: { type: 'module', name: 'portal_colaborador', action: 'read' }
        },
        {
          id: 'colaborador-holerites',
          title: 'Contracheques',
          url: '/portal-colaborador/holerites',
          icon: FileText,
          description: 'Visualização de contracheques',
          requiresPermission: { type: 'module', name: 'portal_colaborador', action: 'read' }
        },
        {
          id: 'colaborador-reembolsos',
          title: 'Reembolsos',
          url: '/portal-colaborador/reembolsos',
          icon: DollarSign,
          description: 'Solicitação de reembolsos',
          requiresPermission: { type: 'module', name: 'portal_colaborador', action: 'read' }
        },
        {
          id: 'colaborador-atestados',
          title: 'Atestados',
          url: '/portal-colaborador/atestados',
          icon: Stethoscope,
          description: 'Envio e acompanhamento de atestados',
          requiresPermission: { type: 'module', name: 'portal_colaborador', action: 'read' }
        },
        {
          id: 'colaborador-exames',
          title: 'Exames',
          url: '/portal-colaborador/exames',
          icon: Stethoscope,
          description: 'Acompanhamento de exames médicos',
          requiresPermission: { type: 'module', name: 'portal_colaborador', action: 'read' }
        },
        {
          id: 'colaborador-comprovantes',
          title: 'Comprovantes',
          url: '/portal-colaborador/comprovantes',
          icon: FileText,
          description: 'Comprovantes e documentos',
          requiresPermission: { type: 'module', name: 'portal_colaborador', action: 'read' }
        }
      ]
    },
    {
      id: 'portal-gestor',
      title: 'Portal do Gestor',
      url: '/portal-gestor',
      icon: UserCog,
      description: 'Portal para gestores e supervisores',
      requiresPermission: { type: 'module', name: 'portal_gestor', action: 'read' },
      isPortal: true,
      children: [
        {
          id: 'gestor-dashboard',
          title: 'Dashboard',
          url: '/portal-gestor',
          icon: LayoutDashboard,
          description: 'Painel principal do gestor',
          requiresPermission: { type: 'entity', name: 'manager_dashboard', action: 'read' }
        },
        {
          id: 'gestor-aprovacoes',
          title: 'Central de Aprovações',
          url: '/portal-gestor/aprovacoes',
          icon: FileText,
          description: 'Central unificada de aprovações',
          requiresPermission: { type: 'entity', name: 'approval_center', action: 'read' }
        },
        {
          id: 'gestor-aprovacoes-rh',
          title: 'Aprovações RH',
          url: '/portal-gestor/aprovacoes/rh',
          icon: UserCog,
          description: 'Aprovações específicas do RH',
          requiresPermission: { type: 'module', name: 'portal_gestor', action: 'read' }
        },
        {
          id: 'gestor-aprovacao-ferias',
          title: 'Aprovação de Férias',
          url: '/portal-gestor/aprovacoes/ferias',
          icon: Calendar,
          description: 'Gerencie solicitações de férias',
          requiresPermission: { type: 'entity', name: 'vacation_approvals', action: 'read' }
        },
        {
          id: 'gestor-aprovacao-compensacoes',
          title: 'Aprovação de Compensações',
          url: '/portal-gestor/aprovacoes/compensacoes',
          icon: Clock,
          description: 'Banco de horas e compensações',
          requiresPermission: { type: 'module', name: 'portal_gestor', action: 'read' }
        },
        {
          id: 'gestor-aprovacao-reembolsos',
          title: 'Aprovação de Reembolsos',
          url: '/portal-gestor/aprovacoes/reembolsos',
          icon: DollarSign,
          description: 'Solicitações de reembolso',
          requiresPermission: { type: 'module', name: 'portal_gestor', action: 'read' }
        },
        {
          id: 'gestor-aprovacao-atestados',
          title: 'Aprovação de Atestados',
          url: '/portal-gestor/aprovacoes/atestados',
          icon: Stethoscope,
          description: 'Atestados médicos',
          requiresPermission: { type: 'module', name: 'portal_gestor', action: 'read' }
        },
        {
          id: 'gestor-aprovacao-equipamentos',
          title: 'Aprovação de Equipamentos',
          url: '/portal-gestor/aprovacoes/equipamentos',
          icon: Laptop,
          description: 'Solicitações de equipamentos',
          requiresPermission: { type: 'module', name: 'portal_gestor', action: 'read' }
        },
        {
          id: 'gestor-correcoes-ponto',
          title: 'Correções de Ponto',
          url: '/portal-gestor/aprovacoes/correcoes-ponto',
          icon: Edit,
          description: 'Correções de registros',
          requiresPermission: { type: 'module', name: 'portal_gestor', action: 'read' }
        },
        {
          id: 'gestor-aprovacao-horas-extras',
          title: 'Aprovação de Horas Extras',
          url: '/portal-gestor/aprovacoes/horas-extras',
          icon: TrendingUp,
          description: 'Aprovar registros com hora extra',
          requiresPermission: { type: 'module', name: 'portal_gestor', action: 'read' }
        },
        {
          id: 'gestor-aprovacao-assinaturas-ponto',
          title: 'Aprovação de Assinaturas de Ponto',
          url: '/portal-gestor/aprovacoes/assinaturas-ponto',
          icon: FileText,
          description: 'Aprovar assinaturas de folha de ponto',
          requiresPermission: { type: 'module', name: 'portal_gestor', action: 'read' }
        },
        {
          id: 'gestor-acompanhamento',
          title: 'Acompanhamento',
          url: '#',
          icon: BarChart3,
          description: 'Acompanhamento e monitoramento',
          requiresPermission: { type: 'module', name: 'portal_gestor', action: 'read' },
          children: [
            {
              id: 'gestor-acompanhamento-ponto',
              title: 'Acompanhamento de Ponto',
              url: '/portal-gestor/acompanhamento/ponto',
              icon: Clock,
              description: 'Monitoramento de frequência',
              requiresPermission: { type: 'entity', name: 'time_tracking_management', action: 'read' }
            },
            {
              id: 'gestor-acompanhamento-exames',
              title: 'Acompanhamento de Exames',
              url: '/portal-gestor/acompanhamento/exames',
              icon: Stethoscope,
              description: 'Controle de exames médicos',
              requiresPermission: { type: 'entity', name: 'exam_management', action: 'read' }
            },
            {
              id: 'gestor-acompanhamento-banco-horas',
              title: 'Banco de Horas',
              url: '/portal-gestor/acompanhamento/banco-horas',
              icon: Clock3,
              description: 'Acompanhamento de banco de horas dos funcionários',
              requiresPermission: { type: 'module', name: 'portal_gestor', action: 'read' }
            }
          ]
        }
      ]
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      url: '/',
      icon: LayoutDashboard,
      description: 'Painel principal do sistema',
      requiresPermission: { type: 'module', name: 'dashboard', action: 'read' }
    },
    {
      id: 'cadastros',
      title: 'Cadastros',
      url: '/cadastros',
      icon: Building2,
      description: 'Gestão de cadastros básicos',
      requiresPermission: { type: 'module', name: 'cadastros', action: 'read' },
      children: [
        {
          id: 'empresas',
          title: 'Empresas',
          url: '/cadastros/empresas',
          icon: Building2,
          description: 'Gestão de empresas',
          requiresPermission: { type: 'module', name: 'companies', action: 'read' }
        },
        {
          id: 'usuarios',
          title: 'Usuários',
          url: '/cadastros/usuarios',
          icon: Users,
          description: 'Gestão de usuários',
          requiresPermission: { type: 'module', name: 'users', action: 'read' }
        },
        {
          id: 'perfis',
          title: 'Perfis de Acesso',
          url: '/cadastros/perfis',
          icon: Shield,
          description: 'Gerenciar perfis e permissões',
          requiresPermission: { type: 'module', name: 'configuracoes', action: 'read' }
        },
        {
          id: 'projetos',
          title: 'Projetos',
          url: '/cadastros/projetos',
          icon: FolderOpen,
          description: 'Gestão de projetos',
          requiresPermission: { type: 'module', name: 'projects', action: 'read' }
        },
        {
          id: 'parceiros',
          title: 'Parceiros',
          url: '/cadastros/parceiros',
          icon: Handshake,
          description: 'Gestão de parceiros',
          requiresPermission: { type: 'module', name: 'partners', action: 'read' }
        },
        {
          id: 'servicos',
          title: 'Serviços',
          url: '/cadastros/servicos',
          icon: Wrench,
          description: 'Cadastro de serviços vinculados a projetos e clientes',
          requiresPermission: { type: 'entity', name: 'services', action: 'read' }
        },
        {
          id: 'centros-custo',
          title: 'Centros de Custo',
          url: '/cadastros/centros-custo',
          icon: CostCenterIcon,
          description: 'Gestão de centros de custo',
          requiresPermission: { type: 'module', name: 'cost_centers', action: 'read' }
        },
        {
          id: 'vinculos-usuario-empresa',
          title: 'Vínculos Usuário-Empresa',
          url: '/cadastros/vinculos-usuario-empresa',
          icon: UserCheck,
          description: 'Gerenciar vínculos entre usuários, empresas e perfis',
          requiresPermission: { type: 'module', name: 'users', action: 'read' }
        }
      ]
    },
    {
      id: 'financeiro',
      title: 'Financeiro',
      url: '/financeiro',
      icon: DollarSign,
      description: 'Gestão financeira',
      requiresPermission: { type: 'module', name: 'financeiro', action: 'read' },
      children: [
        {
          id: 'financeiro-dashboard',
          title: 'Dashboard',
          url: '/financeiro',
          icon: LayoutDashboard,
          description: 'Painel principal financeiro',
          requiresPermission: { type: 'module', name: 'financeiro', action: 'read' }
        },
        {
          id: 'financeiro-contas-pagar',
          title: 'Contas a Pagar',
          url: '/financeiro/contas-pagar',
          icon: TrendingDown,
          description: 'Gestão de contas a pagar',
          requiresPermission: { type: 'entity', name: 'contas_pagar', action: 'read' }
        },
        {
          id: 'financeiro-contas-receber',
          title: 'Contas a Receber',
          url: '/financeiro/contas-receber',
          icon: TrendingUp,
          description: 'Gestão de contas a receber',
          requiresPermission: { type: 'entity', name: 'contas_receber', action: 'read' }
        },
        {
          id: 'financeiro-lotes-pagamento',
          title: 'Lotes de Pagamento',
          url: '/financeiro/lotes-pagamento',
          icon: Package,
          description: 'Agrupe títulos a pagar em lotes',
          requiresPermission: { type: 'module', name: 'financeiro', action: 'read' }
        },
        {
          id: 'financeiro-tesouraria',
          title: 'Tesouraria',
          url: '/financeiro/tesouraria',
          icon: Banknote,
          description: 'Fluxo de caixa e projeções',
          requiresPermission: { type: 'entity', name: 'fluxo_caixa', action: 'read' }
        },
        {
          id: 'financeiro-conciliacao-bancaria',
          title: 'Conciliação Bancária',
          url: '/financeiro/conciliacao-bancaria',
          icon: RefreshCw,
          description: 'Concilie movimentações bancárias com títulos',
          requiresPermission: { type: 'entity', name: 'conciliacoes_bancarias', action: 'read' }
        },
        {
          id: 'financeiro-parametrizacao-tributaria',
          title: 'Parametrização Tributária',
          url: '/financeiro/parametrizacao-tributaria',
          icon: Calculator,
          description: 'Configure regras de cálculo de tributos',
          requiresPermission: { type: 'module', name: 'financeiro', action: 'read' }
        },
        {
          id: 'financeiro-obrigacoes-fiscais',
          title: 'Obrigações Fiscais',
          url: '/financeiro/obrigacoes-fiscais',
          icon: Inbox,
          description: 'Caixa de entrada de obrigações fiscais',
          requiresPermission: { type: 'module', name: 'financeiro', action: 'read' }
        },
        {
          id: 'financeiro-governanca',
          title: 'Governança e Planejamento',
          url: '/financeiro/governanca',
          icon: Target,
          description: 'M7 - Mensurar organização de gestores e violações de SLA',
          requiresPermission: { type: 'module', name: 'financeiro', action: 'read' }
        },
        {
          id: 'financeiro-fiscal',
          title: 'Fiscal',
          url: '/financeiro/fiscal',
          icon: Receipt,
          description: 'Integração SEFAZ e NFS-e',
          requiresPermission: { type: 'module', name: 'financeiro', action: 'read' }
        },
        {
          id: 'financeiro-contabilidade',
          title: 'Contabilidade',
          url: '/financeiro/contabilidade',
          icon: Calculator,
          description: 'Plano de contas e lançamentos',
          requiresPermission: { type: 'entity', name: 'plano_contas', action: 'read' }
        },
        {
          id: 'financeiro-classes-financeiras',
          title: 'Classes Financeiras',
          url: '/financeiro/classes-financeiras',
          icon: FileText,
          description: 'Classes gerenciais e vinculação com contas contábeis',
          requiresPermission: { type: 'module', name: 'financeiro', action: 'read' }
        },
        {
          id: 'financeiro-sefaz',
          title: 'SEFAZ',
          url: '/financeiro/sefaz',
          icon: Globe,
          description: 'Configuração de integração SEFAZ',
          requiresPermission: { type: 'module', name: 'financeiro', action: 'read' }
        },
        {
          id: 'financeiro-bancaria',
          title: 'Bancária',
          url: '/financeiro/bancaria',
          icon: Building,
          description: 'Configuração de integrações bancárias',
          requiresPermission: { type: 'module', name: 'financeiro', action: 'read' }
        }
      ]
    },
    {
      id: 'compras',
      title: 'Compras',
      url: '/compras',
      icon: ShoppingCart,
      description: 'Gestão de compras',
      requiresPermission: { type: 'module', name: 'compras', action: 'read' },
      children: [
        {
          id: 'compras-requisicoes',
          title: 'Requisições de Compra',
          url: '/compras/requisicoes',
          icon: ClipboardList,
          description: 'Gestão de requisições de compra',
          requiresPermission: { type: 'module', name: 'compras', action: 'read' }
        },
        {
          id: 'compras-cotacoes',
          title: 'Cotações',
          url: '/compras/cotacoes',
          icon: FileText,
          description: 'Gestão de cotações de fornecedores',
          requiresPermission: { type: 'module', name: 'compras', action: 'read' }
        },
        {
          id: 'compras-pedidos',
          title: 'Pedidos de Compra',
          url: '/compras/pedidos',
          icon: ShoppingCart,
          description: 'Gestão de pedidos de compra',
          requiresPermission: { type: 'module', name: 'compras', action: 'read' }
        },
        {
          id: 'compras-fornecedores',
          title: 'Fornecedores e Avaliação',
          url: '/compras/fornecedores',
          icon: Handshake,
          description: 'Gestão de fornecedores e avaliações',
          requiresPermission: { type: 'entity', name: 'avaliacao_fornecedores', action: 'read' }
        },
        {
          id: 'compras-contratos',
          title: 'Contratos e Compras Recorrentes',
          url: '/compras/contratos',
          icon: RefreshCw,
          description: 'Gestão de contratos e compras automáticas',
          requiresPermission: { type: 'entity', name: 'contratos_compra', action: 'read' }
        },
        {
          id: 'compras-historico',
          title: 'Histórico de Compras',
          url: '/compras/historico',
          icon: History,
          description: 'Histórico e análises de compras',
          requiresPermission: { type: 'entity', name: 'historico_compras', action: 'read' }
        }
      ]
    },
    {
      id: 'almoxarifado',
      title: 'Almoxarifado',
      url: '/almoxarifado',
      icon: Package,
      description: 'Gestão de estoque',
      requiresPermission: { type: 'module', name: 'almoxarifado', action: 'read' },
      children: [
        {
          id: 'almoxarifado-dashboard',
          title: 'Dashboard de Estoque',
          url: '/almoxarifado/dashboard',
          icon: LayoutDashboard,
          description: 'Painel principal com KPIs de estoque',
          requiresPermission: { type: 'module', name: 'almoxarifado', action: 'read' }
        },
        {
          id: 'almoxarifado-estoque',
          title: 'Estoque Atual',
          url: '/almoxarifado/estoque',
          icon: Package,
          description: 'Visualizar todos os itens disponíveis em estoque',
          requiresPermission: { type: 'entity', name: 'estoque_atual', action: 'read' }
        },
        {
          id: 'almoxarifado-materiais-equipamentos',
          title: 'Materiais e Equipamentos',
          url: '/almoxarifado/materiais',
          icon: Package,
          description: 'Gestão de materiais e equipamentos',
          requiresPermission: { type: 'module', name: 'almoxarifado', action: 'read' }
        },
        {
          id: 'almoxarifado-almoxarifados',
          title: 'Almoxarifados',
          url: '/almoxarifado/almoxarifados',
          icon: Building2,
          description: 'Cadastro e gestão de almoxarifados',
          requiresPermission: { type: 'entity', name: 'almoxarifados', action: 'read' }
        },
        {
          id: 'almoxarifado-localizacoes',
          title: 'Localizações Físicas',
          url: '/almoxarifado/localizacoes',
          icon: MapPin,
          description: 'Gestão de localizações físicas dentro dos almoxarifados',
          requiresPermission: { type: 'entity', name: 'localizacoes_fisicas', action: 'read' }
        },
        {
          id: 'almoxarifado-entradas',
          title: 'Entradas de Materiais',
          url: '/almoxarifado/entradas',
          icon: TrendingUp,
          description: 'Controle de entradas de materiais',
          requiresPermission: { type: 'entity', name: 'entradas_materiais', action: 'read' }
        },
        {
          id: 'almoxarifado-saidas-transferencias',
          title: 'Saídas e Transferências',
          url: '/almoxarifado/saidas',
          icon: TrendingDown,
          description: 'Gestão de saídas e transferências',
          requiresPermission: { type: 'entity', name: 'transferencias', action: 'read' }
        },
        {
          id: 'almoxarifado-inventario',
          title: 'Inventário',
          url: '/almoxarifado/inventario',
          icon: ClipboardList,
          description: 'Controle de inventário',
          requiresPermission: { type: 'entity', name: 'inventarios', action: 'read' }
        },
        {
          id: 'almoxarifado-historico',
          title: 'Histórico de Movimentações',
          url: '/almoxarifado/historico',
          icon: History,
          description: 'Histórico de movimentações de estoque',
          requiresPermission: { type: 'entity', name: 'movimentacoes_estoque', action: 'read' }
        },
        {
          id: 'almoxarifado-relatorios',
          title: 'Relatórios',
          url: '/almoxarifado/relatorios',
          icon: BarChart3,
          description: 'Relatórios de estoque',
          requiresPermission: { type: 'module', name: 'almoxarifado', action: 'read' }
        }
      ]
    },
    {
      id: 'frota',
      title: 'Frota',
      url: '/frota',
      icon: Truck,
      description: 'Gestão de frota',
      requiresPermission: { type: 'module', name: 'frota', action: 'read' },
      children: [
        {
          id: 'frota-dashboard',
          title: 'Dashboard de Frota',
          url: '/frota/dashboard',
          icon: LayoutDashboard,
          description: 'Painel principal com KPIs da frota',
          requiresPermission: { type: 'module', name: 'frota', action: 'read' }
        },
        {
          id: 'frota-veiculos',
          title: 'Veículos',
          url: '/frota/veiculos',
          icon: Truck,
          description: 'Gestão de veículos da frota',
          requiresPermission: { type: 'module', name: 'frota', action: 'read' }
        },
        {
          id: 'frota-condutores',
          title: 'Condutores',
          url: '/frota/condutores',
          icon: Users,
          description: 'Gestão de condutores',
          requiresPermission: { type: 'module', name: 'frota', action: 'read' }
        },
        {
          id: 'frota-vistorias',
          title: 'Vistorias',
          url: '/frota/vistorias',
          icon: ClipboardList,
          description: 'Controle de vistorias dos veículos',
          requiresPermission: { type: 'module', name: 'frota', action: 'read' }
        },
        {
          id: 'frota-manutencoes',
          title: 'Manutenções',
          url: '/frota/manutencoes',
          icon: Settings,
          description: 'Gestão de manutenções preventivas e corretivas',
          requiresPermission: { type: 'module', name: 'frota', action: 'read' }
        },
        {
          id: 'frota-ocorrencias',
          title: 'Multas e Sinistros',
          url: '/frota/ocorrencias',
          icon: AlertTriangle,
          description: 'Registro de multas e sinistros',
          requiresPermission: { type: 'module', name: 'frota', action: 'read' }
        },
        {
          id: 'frota-solicitacoes',
          title: 'Solicitações e Devoluções',
          url: '/frota/solicitacoes',
          icon: FileText,
          description: 'Solicitações e devoluções de veículos',
          requiresPermission: { type: 'module', name: 'frota', action: 'read' }
        },
        {
          id: 'frota-alertas',
          title: 'Alertas',
          url: '/frota/alertas',
          icon: Bell,
          description: 'Alertas de documentos, manutenções e vencimentos',
          requiresPermission: { type: 'module', name: 'frota', action: 'read' }
        }
      ]
    },
    {
      id: 'logistica',
      title: 'Logística',
      url: '/logistica',
      icon: MapPin,
      description: 'Gestão logística',
      requiresPermission: { type: 'module', name: 'logistica', action: 'read' },
      children: [
        {
          id: 'logistica-dashboard',
          title: 'Dashboard',
          url: '/logistica/dashboard',
          icon: LayoutDashboard,
          description: 'Painel principal de logística',
          requiresPermission: { type: 'module', name: 'logistica', action: 'read' }
        },
        {
          id: 'logistica-calendario',
          title: 'Calendário',
          url: '/logistica/calendario',
          icon: Calendar,
          description: 'Calendário de disponibilidade de veículos',
          requiresPermission: { type: 'module', name: 'logistica', action: 'read' }
        },
        {
          id: 'logistica-viagens',
          title: 'Viagens',
          url: '/logistica/viagens',
          icon: Route,
          description: 'Gestão de viagens e entregas',
          requiresPermission: { type: 'module', name: 'logistica', action: 'read' }
        },
        {
          id: 'logistica-custos',
          title: 'Custos Logísticos',
          url: '/logistica/custos',
          icon: DollarSign,
          description: 'Gestão de custos logísticos',
          requiresPermission: { type: 'module', name: 'logistica', action: 'read' }
        }
      ]
    },
    {
      id: 'rh',
      title: 'Recursos Humanos',
      url: '/rh',
      icon: Users,
      description: 'Gestão de RH',
      requiresPermission: { type: 'module', name: 'rh', action: 'read' },
      children: [
        // Dashboard RH
        {
          id: 'rh-dashboard',
          title: 'Dashboard RH',
          url: '/rh',
          icon: LayoutDashboard,
          description: 'Painel principal do RH',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' }
        },
        
        // Estrutura Organizacional
        {
          id: 'rh-estrutura-organizacional',
          title: 'Estrutura Organizacional',
          url: '#',
          icon: Building2,
          description: 'Gestão da estrutura organizacional',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' },
          children: [
            {
              id: 'rh-funcionarios',
              title: 'Funcionários',
              url: '/rh/employees',
              icon: Users,
              description: 'Gestão de funcionários',
              requiresPermission: { type: 'entity', name: 'employees', action: 'read' }
            },
            {
              id: 'rh-cargos',
              title: 'Cargos',
              url: '/rh/positions',
              icon: UserCheck,
              description: 'Gestão de cargos e posições',
              requiresPermission: { type: 'entity', name: 'positions', action: 'read' }
            },
            {
              id: 'rh-departamentos',
              title: 'Departamentos',
              url: '/rh/units',
              icon: Building2,
              description: 'Gestão de departamentos',
              requiresPermission: { type: 'entity', name: 'units', action: 'read' }
            },
            {
              id: 'rh-dependentes',
              title: 'Dependentes',
              url: '/rh/dependents',
              icon: UserPlus,
              description: 'Gestão de dependentes dos funcionários',
              requiresPermission: { type: 'entity', name: 'dependents', action: 'read' }
            },
            {
              id: 'rh-sindicatos',
              title: 'Sindicatos',
              url: '/rh/unions',
              icon: Handshake,
              description: 'Gestão sindical e negociações coletivas',
              requiresPermission: { type: 'entity', name: 'unions', action: 'read' }
            },
            {
              id: 'rh-organograma',
              title: 'Organograma',
              url: '/rh/organograma',
              icon: BarChart3,
              description: 'Visualização e gestão da estrutura organizacional',
              requiresPermission: { type: 'module', name: 'rh', action: 'read' }
            },
            {
              id: 'rh-vinculos-funcionarios',
              title: 'Vínculos Funcionário-Usuário',
              url: '/rh/employee-user-links',
              icon: UserCheck,
              description: 'Gerenciar vínculos entre funcionários e usuários do sistema',
              requiresPermission: { type: 'module', name: 'rh', action: 'read' }
            }
          ]
        },
        
        // Gestão de Tempo
        {
          id: 'rh-gestao-tempo',
          title: 'Gestão de Tempo',
          url: '#',
          icon: Clock,
          description: 'Controle de tempo e escalas',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' },
          children: [
            {
              id: 'rh-turnos-trabalho',
              title: 'Turnos de Trabalho',
              url: '/rh/work-shifts',
              icon: Clock,
              description: 'Gestão de turnos e escalas de trabalho',
              requiresPermission: { type: 'entity', name: 'work_shifts', action: 'read' }
            },
            {
              id: 'rh-ponto',
              title: 'Controle de Ponto',
              url: '/rh/time-records',
              icon: Clock,
              description: 'Registro e controle de ponto',
              requiresPermission: { type: 'entity', name: 'time_records', action: 'read' }
            },
            {
              id: 'rh-banco-horas',
              title: 'Banco de Horas',
              url: '/rh/bank-hours',
              icon: Clock,
              description: 'Sistema avançado de banco de horas com configuração flexível',
              requiresPermission: { type: 'module', name: 'rh', action: 'read' }
            },
            {
              id: 'rh-feriados',
              title: 'Feriados',
              url: '/rh/holidays',
              icon: Calendar,
              description: 'Gestão de feriados e pontos facultativos',
              requiresPermission: { type: 'entity', name: 'holidays', action: 'read' }
            },
            {
              id: 'rh-solicitacoes-compensacao',
              title: 'Solicitações de Compensação',
              url: '/rh/compensation-requests',
              icon: Clock,
              description: 'Gestão de solicitações de compensação',
              requiresPermission: { type: 'module', name: 'rh', action: 'read' }
            },
            {
              id: 'rh-configuracao-correcao-ponto',
              title: 'Configuração de Correção de Ponto',
              url: '/rh/correcao-ponto-config',
              icon: Settings,
              description: 'Configure regras e permissões para correção de ponto',
              requiresPermission: { type: 'module', name: 'rh', action: 'write' }
            },
            {
              id: 'rh-configuracao-assinatura-ponto',
              title: 'Configuração de Assinatura de Ponto',
              url: '/rh/assinatura-ponto-config',
              icon: FileText,
              description: 'Configure as regras de assinatura de ponto',
              requiresPermission: { type: 'module', name: 'rh', action: 'write' }
            },
            {
              id: 'rh-configuracao-ponto-eletronico',
              title: 'Configurações de Ponto Eletrônico',
              url: '/rh/ponto-eletronico-config',
              icon: Clock,
              description: 'Configure a janela de tempo para marcações de ponto',
              requiresPermission: { type: 'module', name: 'rh', action: 'write' }
            },
            {
              id: 'rh-location-zones',
              title: 'Zonas de Localização',
              url: '/rh/location-zones',
              icon: MapPin,
              description: 'Configure zonas geográficas para registro de ponto',
              requiresPermission: { type: 'module', name: 'rh', action: 'read' }
            }
          ]
        },
        
        // Benefícios e Saúde
        {
          id: 'rh-beneficios-saude',
          title: 'Benefícios e Saúde',
          url: '#',
          icon: Gift,
          description: 'Benefícios e saúde dos funcionários',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' },
          children: [
            {
              id: 'rh-beneficios',
              title: 'Benefícios',
              url: '/rh/benefits',
              icon: Gift,
              description: 'Sistema de benefícios',
              requiresPermission: { type: 'entity', name: 'benefits', action: 'read' }
            },
            {
              id: 'rh-vinculos-beneficios',
              title: 'Vínculos de Benefícios',
              url: '/rh/employee-benefits',
              icon: UserCheck,
              description: 'Gerenciar vínculos de benefícios com funcionários',
              requiresPermission: { type: 'entity', name: 'benefits', action: 'read' }
            },
            {
              id: 'rh-convenios-medicos',
              title: 'Convênios Médicos',
              url: '/rh/medical-agreements',
              icon: Heart,
              description: 'Gestão de convênios médicos e odontológicos',
              requiresPermission: { type: 'entity', name: 'medical_agreements', action: 'read' }
            },
            {
              id: 'rh-servicos-medicos',
              title: 'Serviços Médicos',
              url: '/rh/medical-services',
              icon: Stethoscope,
              description: 'Registro de consultas, exames e cirurgias para coparticipação',
              requiresPermission: { type: 'module', name: 'rh', action: 'read' }
            },
            {
              id: 'rh-deducoes',
              title: 'Deduções',
              url: '/rh/employee-deductions',
              icon: DollarSign,
              description: 'Gestão de deduções: coparticipação, empréstimos, multas e avarias',
              requiresPermission: { type: 'module', name: 'rh', action: 'read' }
            },
            {
              id: 'rh-exames-periodicos',
              title: 'Exames Periódicos',
              url: '/rh/periodic-exams',
              icon: Stethoscope,
              description: 'Controle de exames médicos ocupacionais',
              requiresPermission: { type: 'entity', name: 'periodic_exams', action: 'read' }
            },
            {
              id: 'rh-atestados',
              title: 'Atestados Médicos',
              url: '/rh/medical-certificates',
              icon: FileText,
              description: 'Controle de atestados médicos',
              requiresPermission: { type: 'module', name: 'rh', action: 'read' }
            },
            {
              id: 'rh-premiacoes-produtividade',
              title: 'Premiações e Produtividade',
              url: '/rh/awards-productivity',
              icon: Gift,
              description: 'Gestão de premiações e pagamentos por produtividade',
              requiresPermission: { type: 'module', name: 'rh', action: 'read' }
            }
          ]
        },
        
        // Configurações Tributárias
        {
          id: 'rh-configuracoes-tributarias',
          title: 'Configurações Tributárias',
          url: '#',
          icon: Calculator,
          description: 'Configurações fiscais e tributárias',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' },
          children: [
            {
              id: 'rh-rubricas',
              title: 'Rubricas',
              url: '/rh/rubricas',
              icon: Calculator,
              description: 'Configuração de rubricas',
              requiresPermission: { type: 'entity', name: 'rubricas', action: 'read' }
            },
            {
              id: 'rh-inss',
              title: 'Faixas INSS',
              url: '/rh/inss-brackets',
              icon: TrendingUp,
              description: 'Configuração de faixas INSS',
              requiresPermission: { type: 'entity', name: 'inss_brackets', action: 'read' }
            },
            {
              id: 'rh-irrf',
              title: 'Faixas IRRF',
              url: '/rh/irrf-brackets',
              icon: TrendingUp,
              description: 'Configuração de faixas IRRF',
              requiresPermission: { type: 'entity', name: 'irrf_brackets', action: 'read' }
            },
            {
              id: 'rh-fgts',
              title: 'Configurações FGTS',
              url: '/rh/fgts-config',
              icon: Calculator,
              description: 'Configuração de FGTS',
              requiresPermission: { type: 'entity', name: 'fgts_config', action: 'read' }
            },
            {
              id: 'rh-financial-integration',
              title: 'Integração Financeira',
              url: '/rh/financial-integration-config',
              icon: Settings,
              description: 'Configuração de integração com módulo financeiro',
              requiresPermission: { type: 'module', name: 'rh', action: 'read' }
            }
          ]
        },
        
        // Parâmetros
        {
          id: 'rh-parametros',
          title: 'Parâmetros',
          url: '#',
          icon: Settings,
          description: 'Configurações e parâmetros do sistema',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' },
          children: [
            {
              id: 'rh-tipos-afastamento',
              title: 'Tipos de Afastamento',
              url: '/rh/absence-types',
              icon: UserX,
              description: 'Gestão de tipos de afastamento',
              requiresPermission: { type: 'entity', name: 'absence_types', action: 'read' }
            },
            {
              id: 'rh-motivos-atraso',
              title: 'Motivos de Atraso',
              url: '/rh/delay-reasons',
              icon: Clock,
              description: 'Gestão de motivos de atraso',
              requiresPermission: { type: 'entity', name: 'delay_reasons', action: 'read' }
            },
            {
              id: 'rh-codigos-cid',
              title: 'Códigos CID',
              url: '/rh/cid-codes',
              icon: Stethoscope,
              description: 'Gestão de códigos CID',
              requiresPermission: { type: 'entity', name: 'cid_codes', action: 'read' }
            },
            {
              id: 'rh-tipos-adicionais',
              title: 'Tipos de Adicionais',
              url: '/rh/allowance-types',
              icon: DollarSign,
              description: 'Gestão de tipos de adicionais',
              requiresPermission: { type: 'entity', name: 'allowance_types', action: 'read' }
            },
            {
              id: 'rh-tipos-deficiencia',
              title: 'Tipos de Deficiência',
              url: '/rh/deficiency-types',
              icon: Accessibility,
              description: 'Gestão de tipos de deficiência',
              requiresPermission: { type: 'entity', name: 'deficiency_types', action: 'read' }
            }
          ]
        },
        
        // Processamento
        {
          id: 'rh-processamento',
          title: 'Processamento',
          url: '#',
          icon: RefreshCw,
          description: 'Processamento da folha de pagamento',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' },
          children: [
            {
              id: 'rh-folha',
              title: 'Folha de Pagamento',
              url: '/rh/payroll',
              icon: DollarSign,
              description: 'Gere e gerencie a folha de pagamento dos funcionários',
              requiresPermission: { type: 'entity', name: 'payroll', action: 'read' }
            },
            {
              id: 'rh-pagamentos-mensais-alugueis',
              title: 'Pagamentos Mensais de Aluguéis',
              url: '/rh/equipment-rental-payments',
              icon: Receipt,
              description: 'Pagamentos mensais de aluguel de equipamentos e veículos',
              requiresPermission: { type: 'module', name: 'rh', action: 'read' }
            },
            {
              id: 'rh-solicitacoes-aluguel-equipamentos',
              title: 'Solicitações de Aluguel de Equipamentos',
              url: '/rh/equipment-rental-approvals',
              icon: Laptop,
              description: 'Gerenciar solicitações de aluguel de equipamentos',
              requiresPermission: { type: 'module', name: 'rh', action: 'read' }
            },
            {
              id: 'rh-folhas-individuais',
              title: 'Folhas Individuais',
              url: '/rh/payroll-individual',
              icon: FileText,
              description: 'Visualizar e gerenciar folhas individuais por funcionário',
              requiresPermission: { type: 'module', name: 'rh', action: 'read' }
            }
          ]
        },
        
        // Integrações
        {
          id: 'rh-integracoes',
          title: 'Integrações',
          url: '#',
          icon: Upload,
          description: 'Integrações com sistemas externos',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' },
          children: [
            {
              id: 'rh-esocial',
              title: 'eSocial',
              url: '/rh/esocial',
              icon: FileText,
              description: 'Gestão de eventos eSocial',
              requiresPermission: { type: 'entity', name: 'esocial', action: 'read' }
            },
            {
              id: 'rh-integracao-esocial',
              title: 'Integração eSocial',
              url: '/rh/esocial-integration',
              icon: Upload,
              description: 'Integração com eSocial',
              requiresPermission: { type: 'module', name: 'rh', action: 'read' }
            },
            {
              id: 'rh-configuracao-flash',
              title: 'Configuração Flash API',
              url: '/rh/configuracao-flash',
              icon: Plug,
              description: 'Configuração de integração com Flash API',
              requiresPermission: { type: 'module', name: 'rh', action: 'read' }
            }
          ]
        },
        
        // Gestão Operacional
        {
          id: 'rh-gestao-operacional',
          title: 'Gestão Operacional',
          url: '#',
          icon: Users,
          description: 'Gestão operacional de RH',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' },
          children: [
            {
              id: 'rh-ferias',
              title: 'Férias e Licenças',
              url: '/rh/vacations',
              icon: Calendar,
              description: 'Gestão de férias e licenças',
              requiresPermission: { type: 'module', name: 'rh', action: 'read' }
            },
            {
              id: 'rh-acoes-disciplinares',
              title: 'Ações Disciplinares',
              url: '/rh/disciplinary-actions',
              icon: Shield,
              description: 'Gestão de ações disciplinares e medidas corretivas',
              requiresPermission: { type: 'module', name: 'rh', action: 'read' }
            },
            {
              id: 'rh-recrutamento',
              title: 'Recrutamento',
              url: '/rh/recruitment',
              icon: UserPlus,
              description: 'Processo seletivo',
              requiresPermission: { type: 'module', name: 'rh', action: 'read' }
            },
            {
              id: 'rh-treinamentos',
              title: 'Treinamentos',
              url: '/rh/training',
              icon: GraduationCap,
              description: 'Gestão de treinamentos',
              requiresPermission: { type: 'module', name: 'rh', action: 'read' }
            }
          ]
        },
        
        // Relatórios
        {
          id: 'rh-relatorios',
          title: 'Relatórios',
          url: '/rh/analytics',
          icon: BarChart3,
          description: 'Análise de dados e relatórios',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' }
        }
      ]
    },
    {
      id: 'combustivel',
      title: 'Combustível',
      url: '/combustivel',
      icon: Fuel,
      description: 'Gestão de combustível',
      requiresPermission: { type: 'module', name: 'combustivel', action: 'read' },
      children: [
        {
          id: 'combustivel-dashboard',
          title: 'Dashboard',
          url: '/combustivel/dashboard',
          icon: LayoutDashboard,
          description: 'Visão geral do consumo e orçamento',
          requiresPermission: { type: 'module', name: 'combustivel', action: 'read' }
        },
        {
          id: 'combustivel-parametros',
          title: 'Parâmetros',
          url: '/combustivel/parametros',
          icon: Settings,
          description: 'Configurar tipos, postos e limites',
          requiresPermission: { type: 'module', name: 'combustivel', action: 'read' }
        },
        {
          id: 'combustivel-orcamento',
          title: 'Orçamento',
          url: '/combustivel/orcamento',
          icon: DollarSign,
          description: 'Orçamento de combustível',
          requiresPermission: { type: 'module', name: 'combustivel', action: 'read' }
        },
        {
          id: 'combustivel-solicitacoes',
          title: 'Solicitações',
          url: '/combustivel/solicitacoes',
          icon: FileText,
          description: 'Solicitações de abastecimento',
          requiresPermission: { type: 'module', name: 'combustivel', action: 'read' }
        },
        {
          id: 'combustivel-consumo-veiculo',
          title: 'Consumo por Veículo',
          url: '/combustivel/consumo/veiculo',
          icon: Car,
          description: 'Análise de consumo por veículo',
          requiresPermission: { type: 'module', name: 'combustivel', action: 'read' }
        },
        {
          id: 'combustivel-consumo-colaborador',
          title: 'Consumo por Colaborador',
          url: '/combustivel/consumo/colaborador',
          icon: Users,
          description: 'Análise de consumo por colaborador',
          requiresPermission: { type: 'module', name: 'combustivel', action: 'read' }
        },
        {
          id: 'combustivel-relatorios',
          title: 'Relatórios e Auditoria',
          url: '/combustivel/relatorios',
          icon: FileText,
          description: 'Relatórios e auditoria de combustível',
          requiresPermission: { type: 'module', name: 'combustivel', action: 'read' }
        }
      ]
    },
    {
      id: 'metalurgica',
      title: 'Metalúrgica',
      url: '/metalurgica',
      icon: Factory,
      description: 'Gestão metalúrgica',
      requiresPermission: { type: 'module', name: 'metalurgica', action: 'read' }
    },
    {
      id: 'comercial',
      title: 'Comercial',
      url: '/comercial',
      icon: Store,
      description: 'Gestão comercial',
      requiresPermission: { type: 'module', name: 'comercial', action: 'read' }
    },
    {
      id: 'implantacao',
      title: 'Implantação',
      url: '/implantacao',
      icon: Workflow,
      description: 'Gestão de implantações',
      requiresPermission: { type: 'module', name: 'implantacao', action: 'read' }
    },
    {
      id: 'configuracoes',
      title: 'Configurações',
      url: '#',
      icon: Settings,
      description: 'Configurações do sistema',
      requiresPermission: { type: 'module', name: 'configuracoes', action: 'read' },
      children: [
        {
          id: 'configuracoes-geral',
          title: 'Configurações Gerais',
          url: '/configuracoes',
          icon: Settings,
          description: 'Configurações gerais do sistema',
          requiresPermission: { type: 'module', name: 'configuracoes', action: 'read' }
        },
        {
          id: 'configuracoes-aprovacoes',
          title: 'Configurações de Aprovação',
          url: '/configuracoes/aprovacoes',
          icon: UserCheck,
          description: 'Configure fluxos de aprovação',
          requiresPermission: { type: 'module', name: 'approval_configs', action: 'read' }
        }
      ]
    }
  ], []);

  // Filtrar menu baseado nas permissões do usuário
  const filteredMenuItems = useMemo(() => {
    const filterItems = (items: MenuItem[]): MenuItem[] => {
      return items
        .map(item => {
          // Verificar se o item tem permissão
          if (item.requiresPermission) {
            let hasPermission = false;
            
            if (item.requiresPermission.type === 'module') {
              hasPermission = canReadModule(item.requiresPermission.name);
            } else if (item.requiresPermission.type === 'entity') {
              hasPermission = canReadEntity(item.requiresPermission.name);
            }
            
            if (!hasPermission) {
              return null;
            }
          }

          // Filtrar filhos se existirem
          const filteredChildren = item.children ? filterItems(item.children) : undefined;
          
          // Se tem filhos, só incluir se pelo menos um filho estiver disponível
          if (item.children && filteredChildren && filteredChildren.length === 0) {
            return null;
          }

          return {
            ...item,
            children: filteredChildren
          };
        })
        .filter((item): item is MenuItem => item !== null);
    };

    return filterItems(menuItems);
  }, [menuItems, canReadModule, canReadEntity]);

  // Obter itens de menu para o sidebar
  const sidebarItems = useMemo(() => {
    return filteredMenuItems.map(item => ({
      id: item.id,
      title: item.title,
      url: item.url,
      icon: item.icon,
      description: item.description
    }));
  }, [filteredMenuItems]);

  // Obter itens de menu para dropdown (com filhos)
  const dropdownItems = useMemo(() => {
    return filteredMenuItems.filter(item => item.children && item.children.length > 0);
  }, [filteredMenuItems]);

  // Obter itens de menu simples (sem filhos)
  const simpleItems = useMemo(() => {
    return filteredMenuItems.filter(item => !item.children || item.children.length === 0);
  }, [filteredMenuItems]);

  return {
    menuItems: filteredMenuItems,
    sidebarItems,
    dropdownItems,
    simpleItems,
    isAdmin
  };
};
