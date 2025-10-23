import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/lib/company-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';
import { 
  Menu, 
  X, 
  LayoutDashboard,
  FileText,
  Calendar,
  Clock,
  DollarSign,
  Stethoscope,
  Laptop,
  Edit,
  BarChart3,
  UserCog,
  LogOut,
  Building2,
  Bell,
  CheckCircle,
  AlertTriangle,
  Settings,
  Package,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  {
    title: 'Dashboard',
    href: '/portal-gestor/dashboard',
    icon: LayoutDashboard,
    description: 'Visão geral e estatísticas'
  },
  {
    title: 'Central de Aprovações',
    href: '/portal-gestor/aprovacoes',
    icon: FileText,
    description: 'Todas as solicitações pendentes',
    badge: '12' // Mock - em produção virá do contexto
  },
  {
    title: 'Aprovações RH',
    href: '/portal-gestor/aprovacoes/rh',
    icon: UserCog,
    description: 'Aprovações específicas do RH',
    badge: '8'
  },
  {
    title: 'Aprovação de Férias',
    href: '/portal-gestor/aprovacoes/ferias',
    icon: Calendar,
    description: 'Gerencie solicitações de férias',
    badge: '3'
  },
  {
    title: 'Aprovação de Compensações',
    href: '/portal-gestor/aprovacoes/compensacoes',
    icon: Clock,
    description: 'Banco de horas e compensações',
    badge: '2'
  },
  {
    title: 'Aprovação de Reembolsos',
    href: '/portal-gestor/aprovacoes/reembolsos',
    icon: DollarSign,
    description: 'Solicitações de reembolso',
    badge: '4'
  },
  {
    title: 'Aprovação de Atestados',
    href: '/portal-gestor/aprovacoes/atestados',
    icon: Stethoscope,
    description: 'Atestados médicos',
    badge: '1'
  },
  {
    title: 'Aprovação de Equipamentos',
    href: '/portal-gestor/aprovacoes/equipamentos',
    icon: Laptop,
    description: 'Solicitações de equipamentos',
    badge: '1'
  },
  {
    title: 'Correções de Ponto',
    href: '/portal-gestor/aprovacoes/correcoes-ponto',
    icon: Edit,
    description: 'Correções de registros',
    badge: '1'
  },
  {
    title: 'Acompanhamento de Ponto',
    href: '/portal-gestor/acompanhamento/ponto',
    icon: Clock,
    description: 'Monitoramento de frequência'
  },
  {
    title: 'Acompanhamento de Exames',
    href: '/portal-gestor/acompanhamento/exames',
    icon: Stethoscope,
    description: 'Controle de exames médicos'
  }
];

export default function PortalGestorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { selectedCompany } = useCompany();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (href: string) => {
    if (href === '/portal-gestor/dashboard') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  const getTotalPending = () => {
    return menuItems
      .filter(item => item.badge)
      .reduce((total, item) => total + parseInt(item.badge || '0'), 0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent 
          side="left" 
          className="w-80 p-0"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
          }}
        >
          <SheetTitle className="sr-only">Menu de Navegação do Portal do Gestor</SheetTitle>
          <SheetDescription className="sr-only">
            Menu lateral de navegação do portal do gestor com acesso às funcionalidades de aprovação e acompanhamento
          </SheetDescription>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900">
                  Portal do Gestor
                </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600">{user?.email}</p>
                <p className="text-xs text-gray-500">{selectedCompany?.nome_fantasia}</p>
              </div>
              <div className="mt-3 flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-600">
                  {getTotalPending()} solicitações pendentes
                </span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-3 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.href}
                    variant={isActive(item.href) ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start h-auto p-4 relative",
                      isActive(item.href) && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => {
                      navigate(item.href);
                      setSidebarOpen(false);
                    }}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    <div className="text-left flex-1">
                      <div className="font-medium flex items-center justify-between">
                        <span>{item.title}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs opacity-70 mt-1">{item.description}</div>
                    </div>
                  </Button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start p-4"
                onClick={handleLogout}
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop layout */}
      <div className="flex h-screen">
        {/* Desktop sidebar */}
        <div className="hidden lg:flex lg:w-80 lg:flex-col lg:fixed lg:inset-y-0">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center space-x-2">
                <UserCog className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold text-gray-900">
                  Portal do Gestor
                </h1>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600">{user?.email}</p>
                <p className="text-xs text-gray-500">{selectedCompany?.nome_fantasia}</p>
              </div>
              <div className="mt-3 flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-600">
                  {getTotalPending()} solicitações pendentes
                </span>
              </div>
            </div>

            {/* Navigation */}
            <nav 
              className="flex-1 p-4 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" 
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.href}
                    variant={isActive(item.href) ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start h-auto p-4 relative",
                      isActive(item.href) && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => navigate(item.href)}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    <div className="text-left flex-1">
                      <div className="font-medium flex items-center justify-between">
                        <span>{item.title}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs opacity-70 mt-1">{item.description}</div>
                    </div>
                  </Button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start p-4"
                onClick={handleLogout}
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:pl-80 flex flex-col flex-1">
          {/* Mobile header */}
          <div className="lg:hidden flex items-center justify-between p-6 bg-white border-b">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="left" 
                className="w-80 p-0"
                onOpenAutoFocus={(e) => {
                  e.preventDefault();
                }}
                onCloseAutoFocus={(e) => {
                  e.preventDefault();
                }}
              >
                <SheetTitle className="sr-only">Menu de Navegação do Portal do Gestor</SheetTitle>
                <SheetDescription className="sr-only">
                  Menu lateral de navegação do portal do gestor com acesso às funcionalidades de aprovação e acompanhamento
                </SheetDescription>
                <div className="flex h-full flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center space-x-2">
                      <UserCog className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold">Portal do Gestor</h2>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Navigation */}
                  <nav 
                    className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" 
                    style={{ maxHeight: 'calc(100vh - 200px)' }}
                  >
                    <div className="space-y-3">
                      {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        
                        return (
                          <Button
                            key={item.href}
                            variant={isActive ? "secondary" : "ghost"}
                            className="w-full justify-start p-4"
                            onClick={() => {
                              navigate(item.href);
                              setSidebarOpen(false);
                            }}
                          >
                            <Icon className="mr-3 h-4 w-4" />
                            <div className="flex flex-col items-start flex-1">
                              <div className="flex items-center justify-between w-full">
                                <span className="font-medium">{item.title}</span>
                                {item.badge && (
                                  <Badge variant="secondary" className="ml-2 text-xs">
                                    {item.badge}
                                  </Badge>
                                )}
                              </div>
                              {item.description && (
                                <span className="text-xs text-muted-foreground mt-1">
                                  {item.description}
                                </span>
                              )}
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </nav>

                  {/* Footer */}
                  <div className="p-4 border-t">
                    <Button
                      variant="ghost"
                      className="w-full justify-start p-4"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      Sair
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center space-x-2">
              <UserCog className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Portal do Gestor</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-yellow-600">
                {getTotalPending()} Pendentes
              </Badge>
              <Button variant="ghost" size="sm">
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
