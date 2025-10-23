import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Clock, 
  Calendar, 
  FileText, 
  TrendingUp, 
  AlertCircle,
  Plus,
  Eye,
  Edit,
  Download
} from 'lucide-react';
import { useEmployeeStats } from '@/hooks/rh/useEmployees';
import { useCompany } from '@/lib/company-context';
import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function RHDashboard() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { selectedCompany } = useCompany();
  const { data: stats, isLoading: statsLoading } = useEmployeeStats();

  // Dados mockados para demonstração
  const recentActivities = [
    {
      id: 1,
      type: 'employee',
      title: 'Novo funcionário cadastrado',
      description: 'João Silva foi cadastrado como Desenvolvedor',
      time: '2 horas atrás',
      status: 'success'
    },
    {
      id: 2,
      type: 'time_record',
      title: 'Registro de ponto pendente',
      description: 'Maria Santos tem registro pendente de aprovação',
      time: '4 horas atrás',
      status: 'warning'
    },
    {
      id: 3,
      type: 'vacation',
      title: 'Solicitação de férias',
      description: 'Pedro Costa solicitou 15 dias de férias',
      time: '1 dia atrás',
      status: 'info'
    },
    {
      id: 4,
      type: 'payroll',
      title: 'Folha de pagamento processada',
      description: 'Folha de dezembro foi processada com sucesso',
      time: '2 dias atrás',
      status: 'success'
    }
  ];

  const pendingItems = [
    {
      title: 'Registros de ponto pendentes',
      count: 12,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Solicitações de férias',
      count: 5,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Atestados médicos',
      count: 3,
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Aprovações pendentes',
      count: 8,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    }
  ];

  const quickActions = [
    {
      title: 'Cadastrar Funcionário',
      description: 'Adicionar novo funcionário ao sistema',
      icon: Plus,
      href: '/rh/employees/new',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'Registrar Ponto',
      description: 'Registrar entrada/saída de funcionário',
      icon: Clock,
      href: '/rh/time-records/new',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: 'Processar Folha',
      description: 'Processar folha de pagamento',
      icon: FileText,
      href: '/rh/payroll/process',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      title: 'Relatórios',
      description: 'Gerar relatórios e análises',
      icon: TrendingUp,
      href: '/rh/analytics',
      color: 'bg-orange-500 hover:bg-orange-600'
    }
  ];

  if (statsLoading) {
    return (

    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard RH</h1>
            <p className="text-muted-foreground">
              Visão geral do módulo de Recursos Humanos
            </p>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="h-4 bg-muted animate-pulse rounded w-24" />
                </CardTitle>
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded w-16 mb-2" />
                <div className="h-3 bg-muted animate-pulse rounded w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <RequireEntity entityName="employees" action="read">
      <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard RH</h1>
          <p className="text-muted-foreground">
            Visão geral do módulo de Recursos Humanos - {selectedCompany?.name}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Ação Rápida
          </Button>
        </div>
      </div>

      {/* Estatísticas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Funcionários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.by_status?.ativo || 0} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funcionários Ativos</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.by_status?.ativo || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.by_status?.inativo || 0} inativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratações Recentes</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.recent_hires || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departamentos</CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {Object.keys(stats?.by_department || {}).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {Object.keys(stats?.by_position || {}).length} cargos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Itens Pendentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Itens Pendentes</CardTitle>
            <CardDescription>
              Ações que requerem sua atenção
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${item.bgColor}`}>
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                  </div>
                </div>
                <Badge variant="secondary">{item.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Atividades Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atividades Recentes</CardTitle>
            <CardDescription>
              Últimas ações no sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.status === 'success' ? 'bg-green-500' :
                  activity.status === 'warning' ? 'bg-yellow-500' :
                  activity.status === 'info' ? 'bg-blue-500' : 'bg-gray-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Ações Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            <CardDescription>
              Acesso rápido às funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start h-auto p-4"
                asChild
              >
                <a href={action.href}>
                  <action.icon className="h-4 w-4 mr-3" />
                  <div className="text-left">
                    <p className="font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </a>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Resumo por Departamento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Funcionários por Departamento</CardTitle>
          <CardDescription>
            Distribuição de funcionários por departamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats?.by_department || {}).map(([deptId, count]) => (
              <div key={deptId} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-sm font-medium">
                    Departamento {deptId}
                  </span>
                </div>
                <Badge variant="outline">{count} funcionários</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
    </RequireEntity>
  );
}
