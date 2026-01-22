import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Clock, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  DollarSign,
  Stethoscope,
  Laptop,
  Edit,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useGestorDashboard } from '@/hooks/portal-gestor/useGestorDashboard';

interface DashboardStats {
  total_funcionarios: number;
  solicitacoes_pendentes: number;
  ferias_pendentes: number;
  compensacoes_pendentes: number;
  atestados_pendentes: number;
  reembolsos_pendentes: number;
  equipamentos_pendentes: number;
  correcoes_pendentes: number;
}

interface RecentActivity {
  id: string;
  tipo: string;
  funcionario_nome: string;
  data_solicitacao: string;
  status: string;
  descricao: string;
}

const GestorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { stats, activities, isLoading, error } = useGestorDashboard();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'rejeitado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'ferias': return <Calendar className="h-4 w-4" />;
      case 'compensacao': return <Clock className="h-4 w-4" />;
      case 'atestado': return <Stethoscope className="h-4 w-4" />;
      case 'reembolso': return <DollarSign className="h-4 w-4" />;
      case 'equipamento': return <Laptop className="h-4 w-4" />;
      case 'correcao_ponto': return <Edit className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando dashboard...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar dashboard</h3>
          <p className="text-gray-600 mb-4">Não foi possível carregar os dados do dashboard.</p>
          <Button onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  // Fallback para dados vazios
  const statsData = stats?.data || {
    total_funcionarios: 0,
    solicitacoes_pendentes: 0,
    ferias_pendentes: 0,
    compensacoes_pendentes: 0,
    atestados_pendentes: 0,
    reembolsos_pendentes: 0,
    equipamentos_pendentes: 0,
    correcoes_pendentes: 0
  };

  const activitiesData = activities?.data || [];

  return (
    <RequirePage pagePath="/portal-gestor*" action="read">
      <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Portal do Gestor</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Gerencie aprovações e acompanhe sua equipe
          </p>
        </div>
        <Button onClick={() => navigate('/portal-gestor/aprovacoes')} className="w-fit">
          Ver Todas as Aprovações
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Total de Funcionários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.total_funcionarios}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Funcionários ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Solicitações Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{statsData.solicitacoes_pendentes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aguardando aprovação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Férias Pendentes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.ferias_pendentes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Solicitações de férias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Compensações Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.compensacoes_pendentes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Banco de horas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Atestados</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.atestados_pendentes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Reembolsos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.reembolsos_pendentes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Equipamentos</CardTitle>
            <Laptop className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.equipamentos_pendentes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pendentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">Correções de Ponto</CardTitle>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsData.correcoes_pendentes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pendentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
          <CardDescription>
            Últimas solicitações da sua equipe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {activitiesData.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-6 border rounded-lg">
                <div className="flex items-center space-x-4">
                  {getTipoIcon(activity.tipo)}
                  <div>
                    <p className="font-medium">{activity.funcionario_nome}</p>
                    <p className="text-sm text-muted-foreground mt-1">{activity.descricao}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(activity.data_solicitacao).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge className={getStatusColor(activity.status)}>
                    {activity.status}
                  </Badge>
                  <Button variant="outline" size="sm">
                    Ver Detalhes
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Acesso rápido às principais funcionalidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Button 
              variant="outline" 
              className="h-24 flex flex-col space-y-3 p-6"
              onClick={() => navigate('/portal-gestor/aprovacoes/ferias')}
            >
              <Calendar className="h-6 w-6" />
              <span>Aprovar Férias</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-24 flex flex-col space-y-3 p-6"
              onClick={() => navigate('/portal-gestor/aprovacoes/compensacoes')}
            >
              <Clock className="h-6 w-6" />
              <span>Aprovar Compensações</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-24 flex flex-col space-y-3 p-6"
              onClick={() => navigate('/portal-gestor/aprovacoes/atestados')}
            >
              <Stethoscope className="h-6 w-6" />
              <span>Aprovar Atestados</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-24 flex flex-col space-y-3 p-6"
              onClick={() => navigate('/portal-gestor/aprovacoes/reembolsos')}
            >
              <DollarSign className="h-6 w-6" />
              <span>Aprovar Reembolsos</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-24 flex flex-col space-y-3 p-6"
              onClick={() => navigate('/portal-gestor/acompanhamento/ponto')}
            >
              <Edit className="h-6 w-6" />
              <span>Acompanhar Ponto</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-24 flex flex-col space-y-3 p-6"
              onClick={() => navigate('/portal-gestor/acompanhamento/exames')}
            >
              <Stethoscope className="h-6 w-6" />
              <span>Acompanhar Exames</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </RequirePage>
  );
};

export default GestorDashboard;
