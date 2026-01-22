import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useEmployeeByUserId } from '@/hooks/rh/useEmployees';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Stethoscope, 
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

export default function ExamesPage() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();

  // Buscar funcionário
  const { data: employee } = useEmployeeByUserId(user?.id || '');

  // Buscar exames
  const { data: exams, isLoading } = useQuery({
    queryKey: ['periodic-exams', employee?.id],
    queryFn: async () => {
      if (!employee?.id || !selectedCompany?.id) return [];
      
      const result = await EntityService.list({
        schema: 'rh',
        table: 'periodic_exams',
        companyId: selectedCompany.id,
        filters: {
          employee_id: employee.id
        },
        orderBy: 'data_agendamento',
        orderDirection: 'ASC'
      });
      
      return result.data;
    },
    enabled: !!employee?.id && !!selectedCompany?.id
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'realizado':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'agendado':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'vencido':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'realizado':
        return 'Realizado';
      case 'agendado':
        return 'Agendado';
      case 'vencido':
        return 'Vencido';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'realizado':
        return 'bg-green-100 text-green-800';
      case 'agendado':
        return 'bg-blue-100 text-blue-800';
      case 'vencido':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (

    <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <RequirePage pagePath="/portal-colaborador/exames*" action="read">
      <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Exames</h1>
        <p className="text-gray-600">
          Acompanhe seus exames médicos
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendados</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {exams?.filter(e => e.status === 'agendado').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">exames agendados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Realizados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {exams?.filter(e => e.status === 'realizado').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">exames realizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {exams?.filter(e => e.status === 'vencido').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">exames vencidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de exames */}
      <Card>
        <CardHeader>
          <CardTitle>Seus Exames</CardTitle>
          <CardDescription>
            Histórico de exames médicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {exams && exams.length > 0 ? (
            <div className="space-y-4">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                      <Stethoscope className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {exam.tipo_exame}
                      </p>
                      <p className="text-sm text-gray-600">
                        Agendado para {new Date(exam.data_agendamento).toLocaleDateString('pt-BR')}
                      </p>
                      {exam.observacoes && (
                        <p className="text-xs text-gray-500">
                          {exam.observacoes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(exam.status)}
                    <Badge className={getStatusColor(exam.status)}>
                      {getStatusLabel(exam.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum exame encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </RequirePage>
  );
}
