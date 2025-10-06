import { useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/lib/company-context';
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
  Handshake,
  DollarSign as CostCenterIcon,
  Clock,
  Gift,
  Calculator,
  TrendingUp,
  Calendar,
  FileText,
  UserPlus,
  GraduationCap,
  Stethoscope,
  Shield,
  Heart
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
}

export const useMenu = () => {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  
  // Por enquanto, vamos mostrar todos os itens para usuários autenticados
  // TODO: Implementar verificação de permissões quando o sistema estiver estável
  const isAdmin = false; // Temporariamente desabilitado para evitar loops
  const canReadModule = (moduleName: string) => true; // Temporariamente sempre true

  const menuItems: MenuItem[] = useMemo(() => [
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
      requiresPermission: { type: 'module', name: 'companies', action: 'read' },
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
          id: 'projetos',
          title: 'Projetos',
          url: '/cadastros/projetos',
          icon: FolderOpen,
          description: 'Gestão de projetos',
          requiresPermission: { type: 'module', name: 'projects', action: 'read' }
        },
        {
          id: 'materiais',
          title: 'Materiais',
          url: '/cadastros/materiais',
          icon: Package,
          description: 'Gestão de materiais',
          requiresPermission: { type: 'module', name: 'materials', action: 'read' }
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
          id: 'centros-custo',
          title: 'Centros de Custo',
          url: '/cadastros/centros-custo',
          icon: CostCenterIcon,
          description: 'Gestão de centros de custo',
          requiresPermission: { type: 'module', name: 'cost_centers', action: 'read' }
        }
      ]
    },
    {
      id: 'financeiro',
      title: 'Financeiro',
      url: '/financeiro',
      icon: DollarSign,
      description: 'Gestão financeira',
      requiresPermission: { type: 'module', name: 'financeiro', action: 'read' }
    },
    {
      id: 'compras',
      title: 'Compras',
      url: '/compras',
      icon: ShoppingCart,
      description: 'Gestão de compras',
      requiresPermission: { type: 'module', name: 'compras', action: 'read' }
    },
    {
      id: 'almoxarifado',
      title: 'Almoxarifado',
      url: '/almoxarifado',
      icon: Package,
      description: 'Gestão de estoque',
      requiresPermission: { type: 'module', name: 'almoxarifado', action: 'read' }
    },
    {
      id: 'frota',
      title: 'Frota',
      url: '/frota',
      icon: Truck,
      description: 'Gestão de frota',
      requiresPermission: { type: 'module', name: 'frota', action: 'read' }
    },
    {
      id: 'logistica',
      title: 'Logística',
      url: '/logistica',
      icon: MapPin,
      description: 'Gestão logística',
      requiresPermission: { type: 'module', name: 'logistica', action: 'read' }
    },
    {
      id: 'rh',
      title: 'Recursos Humanos',
      url: '/rh',
      icon: Users,
      description: 'Gestão de RH',
      requiresPermission: { type: 'module', name: 'rh', action: 'read' },
      children: [
        {
          id: 'rh-dashboard',
          title: 'Dashboard RH',
          url: '/rh',
          icon: LayoutDashboard,
          description: 'Painel principal do RH',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' }
        },
        {
          id: 'rh-funcionarios',
          title: 'Funcionários',
          url: '/rh/employees',
          icon: Users,
          description: 'Gestão de funcionários',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' }
        },
        {
          id: 'rh-cargos',
          title: 'Cargos',
          url: '/rh/positions',
          icon: UserCheck,
          description: 'Gestão de cargos e posições',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' }
        },
        {
          id: 'rh-departamentos',
          title: 'Departamentos',
          url: '/rh/units',
          icon: Building2,
          description: 'Gestão de departamentos',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' }
        },
        {
          id: 'rh-ponto',
          title: 'Controle de Ponto',
          url: '/rh/time-records',
          icon: Clock,
          description: 'Registro e controle de ponto',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' }
        },
        {
          id: 'rh-beneficios',
          title: 'Benefícios',
          url: '/rh/benefits',
          icon: Gift,
          description: 'Sistema de benefícios',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' }
        },
        {
          id: 'rh-folha',
          title: 'Folha de Pagamento',
          url: '/rh/payroll',
          icon: DollarSign,
          description: 'Folha de pagamento',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' }
        },
        {
          id: 'rh-rubricas',
          title: 'Rubricas',
          url: '/rh/rubricas',
          icon: Calculator,
          description: 'Configuração de rubricas',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' }
        },
        {
          id: 'rh-inss',
          title: 'Faixas INSS',
          url: '/rh/inss-brackets',
          icon: TrendingUp,
          description: 'Configuração de faixas INSS',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' }
        },
        {
          id: 'rh-irrf',
          title: 'Faixas IRRF',
          url: '/rh/irrf-brackets',
          icon: TrendingUp,
          description: 'Configuração de faixas IRRF',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' }
        },
        {
          id: 'rh-fgts',
          title: 'Configurações FGTS',
          url: '/rh/fgts-config',
          icon: Calculator,
          description: 'Configuração de FGTS',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' }
        },
        {
          id: 'rh-motor-calculo',
          title: 'Motor de Cálculo',
          url: '/rh/payroll-calculation',
          icon: Calculator,
          description: 'Engine de folha de pagamento',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' }
        },
        {
          id: 'rh-banco-horas',
          title: 'Banco de Horas',
          url: '/rh/time-bank',
          icon: Clock,
          description: 'Controle de horas extras e compensatórias',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' }
        },
        {
          id: 'rh-feriados',
          title: 'Feriados',
          url: '/rh/holidays',
          icon: Calendar,
          description: 'Gestão de feriados e pontos facultativos',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' }
        },
        {
          id: 'rh-exames-periodicos',
          title: 'Exames Periódicos',
          url: '/rh/periodic-exams',
          icon: Stethoscope,
          description: 'Controle de exames médicos ocupacionais',
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
          id: 'rh-premiacoes-produtividade',
          title: 'Premiações e Produtividade',
          url: '/rh/awards-productivity',
          icon: Gift,
          description: 'Gestão de premiações e pagamentos por produtividade',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' }
        },
        {
          id: 'rh-convenios-medicos',
          title: 'Convênios Médicos',
          url: '/rh/medical-agreements',
          icon: Heart,
          description: 'Gestão de convênios médicos e odontológicos',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' }
        },
        {
          id: 'rh-sindicatos',
          title: 'Sindicatos',
          url: '/rh/unions',
          icon: Handshake,
          description: 'Gestão sindical e negociações coletivas',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' }
        },
        {
          id: 'rh-ferias',
          title: 'Férias e Licenças',
          url: '/rh/vacations',
          icon: Calendar,
          description: 'Gestão de férias e licenças',
          requiresPermission: { type: 'module', name: 'rh', action: 'read' }
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
    {
      id: 'combustivel',
      title: 'Combustível',
      url: '/combustivel',
      icon: Fuel,
      description: 'Gestão de combustível',
      requiresPermission: { type: 'module', name: 'combustivel', action: 'read' }
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
      url: '/configuracoes',
      icon: Settings,
      description: 'Configurações do sistema',
      requiresPermission: { type: 'module', name: 'configuracoes', action: 'read' }
    }
  ], []);

  // Filtrar menu baseado nas permissões do usuário
  const filteredMenuItems = useMemo(() => {
    const filterItems = (items: MenuItem[]): MenuItem[] => {
      return items
        .map(item => {
          // Verificar se o item tem permissão
          if (item.requiresPermission) {
            const hasPermission = canReadModule(item.requiresPermission.name);
            
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
  }, [menuItems, canReadModule]);

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
