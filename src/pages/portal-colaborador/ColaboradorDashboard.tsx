import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/lib/company-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Calendar, 
  FileText, 
  CreditCard, 
  Stethoscope, 
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Clock3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useEmployeeByUserId } from '@/hooks/rh/useEmployees';
import { useBankHours } from '@/hooks/useBankHoursMain';
import { VacationsService } from '@/services/rh/vacationsService';
import { PeriodicExamsService } from '@/services/rh/periodicExamsService';

export default function ColaboradorDashboard() {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();

  // Buscar dados do funcionário
  const { data: employee, isLoading: employeeLoading, error: employeeError } = useEmployeeByUserId(user?.id || '');

  // Hook do sistema novo de banco de horas
  const { getEmployeeBalance } = useBankHours(selectedCompany?.id || '');

  // Buscar saldo do banco de horas
  const { data: bankHoursBalance } = useQuery({
    queryKey: ['bank-hours-balance', employee?.id],
    queryFn: async () => {
      if (!employee?.id || !selectedCompany?.id) return { current_balance: 0, has_bank_hours: false };
      return await getEmployeeBalance(employee.id);
    },
    enabled: !!employee?.id && !!selectedCompany?.id
  });

  // Buscar próximas férias
  const { data: upcomingVacations } = useQuery({
    queryKey: ['upcoming-vacations', employee?.id],
    queryFn: async () => {
      if (!employee?.id || !selectedCompany?.id) return [];
      return await VacationsService.getUpcoming(employee.id, selectedCompany.id);
    },
    enabled: !!employee?.id && !!selectedCompany?.id
  });

  // Buscar exames pendentes
  const { data: pendingExams } = useQuery({
    queryKey: ['pending-exams', employee?.id],
    queryFn: async () => {
      if (!employee?.id || !selectedCompany?.id) return [];
      return await PeriodicExamsService.getPending(employee.id, selectedCompany.id);
    },
    enabled: !!employee?.id && !!selectedCompany?.id
  });

  // Buscar solicitações pendentes
  const { data: pendingRequests } = useQuery({
    queryKey: ['pending-requests', employee?.id],
    queryFn: async () => {
      if (!employee?.id || !selectedCompany?.id) return { vacations: [], reimbursements: [] };
      
      const vacations = await VacationsService.getPending(employee.id, selectedCompany.id);
      
      return {
        vacations: vacations.slice(0, 3),
        reimbursements: [] // TODO: Implementar serviço de reembolsos
      };
    },
    enabled: !!employee?.id && !!selectedCompany?.id
  });

  if (employeeLoading) {
    return (

    <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (employeeError) {
    console.error('🚨 Erro ao carregar dados do funcionário:', employeeError);
    return (
      
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Erro ao carregar dados</h3>
          <p className="text-red-600 text-sm mt-1">
            {employeeError.message || 'Erro desconhecido'}
          </p>
          <details className="mt-2">
            <summary className="text-red-600 text-xs cursor-pointer">Detalhes do erro</summary>
            <pre className="text-xs text-red-500 mt-1 overflow-auto">
              {JSON.stringify(employeeError, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Funcionário não encontrado</h2>
            <p className="text-gray-600">
              Não foi possível encontrar seus dados de funcionário. 
              Entre em contato com o RH.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const quickActions = [
    {
      title: 'Registrar Ponto',
      description: 'Registre sua entrada ou saída',
      icon: Clock,
      href: '/portal-colaborador/registro-ponto',
      color: 'bg-blue-500'
    },
    {
      title: 'Banco de Horas',
      description: 'Consulte seu saldo',
      icon: Calendar,
      href: '/portal-colaborador/banco-horas',
      color: 'bg-green-500'
    },
    {
      title: 'Solicitar Férias',
      description: 'Faça uma nova solicitação',
      icon: Calendar,
      href: '/portal-colaborador/ferias',
      color: 'bg-purple-500'
    },
    {
      title: 'Reembolsos',
      description: 'Solicite reembolso',
      icon: CreditCard,
      href: '/portal-colaborador/reembolsos',
      color: 'bg-orange-500'
    }
  ];

  return (
    
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Olá, {employee.nome.split(' ')[0]}!
          </h1>
          <p className="text-gray-600">
            {employee.position?.nome} • {employee.unit?.nome}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {employee.status}
        </Badge>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Saldo do Banco de Horas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Banco de Horas</CardTitle>
            <Clock3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bankHoursBalance?.current_balance?.toFixed(1) || '0.0'}h
            </div>
            <p className="text-xs text-muted-foreground">
              Saldo atual
            </p>
          </CardContent>
        </Card>

        {/* Próximas Férias */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas Férias</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {upcomingVacations?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {upcomingVacations?.length > 0 
                ? `Próxima: ${new Date(upcomingVacations[0].data_inicio).toLocaleDateString('pt-BR')}`
                : 'Nenhuma agendada'
              }
            </p>
          </CardContent>
        </Card>

        {/* Exames Pendentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exames Pendentes</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingExams?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingExams?.length > 0 
                ? `Próximo: ${new Date(pendingExams[0].data_agendada).toLocaleDateString('pt-BR')}`
                : 'Nenhum pendente'
              }
            </p>
          </CardContent>
        </Card>

        {/* Solicitações Pendentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitações</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(pendingRequests?.vacations?.length || 0) + (pendingRequests?.reimbursements?.length || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando aprovação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Acesse rapidamente as funcionalidades mais utilizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.href}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start space-y-2"
                  onClick={() => navigate(action.href)}
                >
                  
      <div className={`p-2 rounded-lg ${action.color} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{action.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {action.description}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-auto" />
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Solicitações Recentes */}
      {(pendingRequests?.vacations?.length > 0 || pendingRequests?.reimbursements?.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Solicitações Pendentes</CardTitle>
            <CardDescription>
              Suas solicitações aguardando aprovação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRequests?.vacations?.map((vacation) => (
                <div key={vacation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Solicitação de Férias</p>
                      <p className="text-sm text-gray-600">
                        {new Date(vacation.data_inicio).toLocaleDateString('pt-BR')} - {new Date(vacation.data_fim).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">Pendente</Badge>
                </div>
              ))}
              
              {pendingRequests?.reimbursements?.map((reimbursement) => (
                <div key={reimbursement.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Reembolso - {reimbursement.categoria}</p>
                      <p className="text-sm text-gray-600">
                        R$ {reimbursement.valor.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">Pendente</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    );
}
