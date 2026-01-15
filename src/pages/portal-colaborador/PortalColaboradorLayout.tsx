import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/lib/company-context';
import { Button } from '@/components/ui/button';
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
  Clock, 
  Calendar, 
  FileText, 
  CreditCard, 
  Receipt, 
  Stethoscope, 
  Download,
  User,
  LogOut,
  Building2,
  Bell,
  History,
  Edit,
  Fuel,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationCenter } from '@/components/NotificationCenter';

const menuItems = [
  {
    title: 'Dashboard',
    href: '/portal-colaborador',
    icon: User,
    description: 'Visão geral dos seus dados'
  },
  {
    title: 'Registro de Ponto',
    href: '/portal-colaborador/registro-ponto',
    icon: Clock,
    description: 'Registre sua entrada e saída'
  },
  {
    title: 'Correção de Ponto',
    href: '/portal-colaborador/correcao-ponto',
    icon: Edit,
    description: 'Corrija seus registros de ponto'
  },
  {
    title: 'Assinatura de Ponto',
    href: '/portal-colaborador/assinatura-ponto',
    icon: FileText,
    description: 'Assine seus registros de ponto mensais'
  },
  {
    title: 'Histórico de Marcações',
    href: '/portal-colaborador/historico-marcacoes',
    icon: History,
    description: 'Visualize todas as suas marcações de ponto'
  },
  {
    title: 'Banco de Horas',
    href: '/portal-colaborador/banco-horas',
    icon: Calendar,
    description: 'Consulte seu saldo de horas'
  },
  {
    title: 'Férias',
    href: '/portal-colaborador/ferias',
    icon: Calendar,
    description: 'Solicite e acompanhe suas férias'
  },
  {
    title: 'Contracheques',
    href: '/portal-colaborador/holerites',
    icon: FileText,
    description: 'Visualize seus contracheques'
  },
  {
    title: 'Reembolsos',
    href: '/portal-colaborador/reembolsos',
    icon: CreditCard,
    description: 'Solicite reembolsos'
  },
  {
    title: 'Atestados',
    href: '/portal-colaborador/atestados',
    icon: Stethoscope,
    description: 'Envie atestados médicos'
  },
  {
    title: 'Exames',
    href: '/portal-colaborador/exames',
    icon: Stethoscope,
    description: 'Acompanhe seus exames'
  },
  {
    title: 'Comprovantes',
    href: '/portal-colaborador/comprovantes',
    icon: Download,
    description: 'Baixe comprovantes de rendimentos'
  },
  {
    title: 'Registro de Abastecimento',
    href: '/portal-colaborador/registro-abastecimento',
    icon: Fuel,
    description: 'Registre abastecimentos de combustível'
  },
  {
    title: 'Treinamentos',
    href: '/portal-colaborador/treinamentos',
    icon: BookOpen,
    description: 'Acesse seus treinamentos online'
  }
];

export default function PortalColaboradorLayout() {
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
    if (href === '/portal-colaborador') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent 
          side="left" 
          className="w-[85vw] max-w-80 p-0"
          onOpenAutoFocus={(e) => {
            // Previne conflitos de foco com aria-hidden
            e.preventDefault();
          }}
          onCloseAutoFocus={(e) => {
            // Garante que o foco retorne ao trigger quando fechado
            e.preventDefault();
          }}
        >
          <SheetTitle className="sr-only">Menu de Navegação do Portal do Colaborador</SheetTitle>
          <SheetDescription className="sr-only">
            Menu lateral de navegação do portal do colaborador com acesso às funcionalidades
          </SheetDescription>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900">
                  Portal do Colaborador
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
            </div>

            {/* Navigation */}
            <nav 
              className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" 
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.href}
                    variant={isActive(item.href) ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start h-auto p-3",
                      isActive(item.href) && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => {
                      navigate(item.href);
                      setSidebarOpen(false);
                    }}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    <div className="text-left">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs opacity-70">{item.description}</div>
                    </div>
                  </Button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start"
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
        <div className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
            {/* Header */}
            <div className="p-6 border-b">
              <h1 className="text-xl font-bold text-gray-900">
                Portal do Colaborador
              </h1>
              <div className="mt-4">
                <p className="text-sm text-gray-600">{user?.email}</p>
                <p className="text-xs text-gray-500">{selectedCompany?.nome_fantasia}</p>
              </div>
            </div>

            {/* Navigation */}
            <nav 
              className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" 
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.href}
                    variant={isActive(item.href) ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start h-auto p-3",
                      isActive(item.href) && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => navigate(item.href)}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    <div className="text-left">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs opacity-70">{item.description}</div>
                    </div>
                  </Button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={handleLogout}
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:pl-72 flex flex-col flex-1">
          {/* Desktop header */}
          <div className="hidden lg:flex items-center justify-between p-4 bg-white border-b">
            <h1 className="text-lg font-semibold">Portal do Colaborador</h1>
            <NotificationCenter />
          </div>

          {/* Mobile header */}
          <div className="lg:hidden flex items-center justify-between px-3 py-3 sm:px-4 sm:py-4 bg-white border-b">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="left" 
                className="w-[85vw] max-w-80 p-0"
                onOpenAutoFocus={(e) => {
                  // Previne conflitos de foco com aria-hidden
                  e.preventDefault();
                }}
                onCloseAutoFocus={(e) => {
                  // Garante que o foco retorne ao trigger quando fechado
                  e.preventDefault();
                }}
              >
                <SheetTitle className="sr-only">Menu de Navegação do Portal do Colaborador</SheetTitle>
                <SheetDescription className="sr-only">
                  Menu lateral de navegação do portal do colaborador com acesso às funcionalidades
                </SheetDescription>
                <div className="flex h-full flex-col">
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">Portal do Colaborador</h2>
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
                    <div className="space-y-2">
                      {menuItems.map((item) => {
                        const Icon = item.icon;
                        const itemIsActive = isActive(item.href);
                        
                        return (
                          <Button
                            key={item.href}
                            variant={itemIsActive ? "secondary" : "ghost"}
                            className="w-full justify-start"
                            onClick={() => {
                              navigate(item.href);
                              setSidebarOpen(false);
                            }}
                          >
                            <Icon className="mr-3 h-4 w-4" />
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{item.title}</span>
                              {item.description && (
                                <span className="text-xs text-muted-foreground">
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
                      className="w-full justify-start"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      Sair
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold">Portal do Colaborador</h1>
            <NotificationCenter />
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
