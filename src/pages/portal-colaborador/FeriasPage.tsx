import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useEmployeeByUserId } from '@/hooks/rh/useEmployees';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Calendar, 
  Plus, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { FractionedVacationForm } from '@/components/rh/FractionedVacationForm';
import { useVacationYears } from '@/hooks/rh/useVacationYears';
import { validateIntegralVacation, calculateDaysBetween } from '@/lib/vacationValidation';

interface VacationRequest {
  id: string;
  employee_id: string;
  data_inicio: string;
  data_fim: string;
  dias_ferias: number;
  tipo: 'integral' | 'fracionada';
  status: 'pendente' | 'aprovado' | 'rejeitado';
  motivo_rejeicao?: string;
  created_at: string;
}

export default function FeriasPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFractionedDialogOpen, setIsFractionedDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vacationType, setVacationType] = useState<'integral' | 'fracionada'>('integral');
  const [reason, setReason] = useState('');
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  // Buscar funcionário
  const { data: employee, error: employeeError } = useEmployeeByUserId(user?.id || '');
  
  // Buscar anos de férias disponíveis
  const { data: availableYears, error: vacationYearsError } = useVacationYears(employee?.id || '');

  // Buscar solicitações de férias
  const { data: vacationRequests, isLoading, error: vacationRequestsError } = useQuery({
    queryKey: ['vacation-requests', employee?.id],
    queryFn: async () => {
      if (!employee?.id || !selectedCompany?.id) return [];
      
      const result = await EntityService.list({
        schema: 'rh',
        table: 'vacations',
        companyId: selectedCompany.id,
        filters: {
          employee_id: employee.id
        },
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });
      
      return result.data;
    },
    enabled: !!employee?.id && !!selectedCompany?.id
  });

  // Calcular dias disponíveis
  const availableDays = availableYears?.find(year => year.ano === new Date().getFullYear())?.dias_restantes || 0;

  // Validar férias integrais em tempo real
  const validateIntegral = () => {
    if (startDate && endDate) {
      const result = validateIntegralVacation(startDate, endDate, availableDays);
      setValidationResult(result);
    }
  };

  // Mutação para solicitar férias integrais
  const vacationMutation = useMutation({
    mutationFn: async () => {
      if (!employee?.id || !selectedCompany?.id) {
        throw new Error('Dados do funcionário ou empresa não encontrados');
      }
      
      const diasCalculados = calculateDaysBetween(startDate, endDate);
      
      const data = await EntityService.create({
        schema: 'rh',
        table: 'vacations',
        companyId: selectedCompany.id,
        data: {
          employee_id: employee.id,
          data_inicio: startDate,
          data_fim: endDate,
          dias_solicitados: diasCalculados,
          tipo: 'ferias',
          status: 'pendente',
          observacoes: reason
        }
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-requests', employee?.id] });
      queryClient.invalidateQueries({ queryKey: ['vacation-years'] });
      setIsDialogOpen(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      setValidationResult(null);
      
      toast({
        title: "Solicitação enviada!",
        description: "Sua solicitação de férias foi enviada para aprovação.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar solicitação",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  });

  // Mutação para solicitar férias fracionadas
  const fractionedVacationMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!employee?.id || !selectedCompany?.id) {
        throw new Error('Dados do funcionário ou empresa não encontrados');
      }

      const { data: result, error } = await supabase.rpc('criar_ferias_fracionadas', {
        p_company_id: selectedCompany.id,
        p_employee_id: employee.id,
        p_ano: data.ano,
        p_periodos: data.periodos,
        p_observacoes: data.observacoes
      }, { schema: 'rh' });

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-years'] });
      toast({
        title: 'Solicitação enviada',
        description: 'Sua solicitação de férias fracionadas foi enviada com sucesso.',
      });
      setIsFractionedDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Erro ao enviar solicitação',
        description: 'Ocorreu um erro ao enviar sua solicitação de férias.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (!startDate || !endDate) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha as datas de início e fim das férias.",
        variant: "destructive",
      });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (days > availableDays) {
      toast({
        title: "Dias insuficientes",
        description: `Você possui apenas ${availableDays} dias de férias disponíveis.`,
        variant: "destructive",
      });
      return;
    }

    vacationMutation.mutate();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejeitado':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pendente':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'Aprovado';
      case 'rejeitado':
        return 'Rejeitado';
      case 'pendente':
        return 'Pendente';
      default:
        return status;
    }
  };

  // Tratamento de erros
  if (employeeError || vacationYearsError || vacationRequestsError) {
    return (

    <div className="p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar dados</h2>
          <p className="text-gray-600 mb-4">
            {employeeError?.message || vacationYearsError?.message || vacationRequestsError?.message || 'Erro desconhecido'}
          </p>
          <Button onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Férias</h1>
          <p className="text-gray-600">
            Solicite e acompanhe suas férias
          </p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Férias Integrais
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Solicitar Férias</DialogTitle>
                <DialogDescription>
                  Solicite suas férias. Dias disponíveis: {availableDays}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Tipo de Férias</Label>
                  <select
                    id="type"
                    value={vacationType}
                    onChange={(e) => setVacationType(e.target.value as 'integral' | 'fracionada')}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="integral">Integral (30 dias)</option>
                    <option value="fracionada">Fracionada</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="start">Data de Início</Label>
                  <Input
                    id="start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end">Data de Fim</Label>
                  <Input
                    id="end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reason">Observações</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Motivo das férias (opcional)..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={vacationMutation.isPending}
                >
                  {vacationMutation.isPending ? 'Enviando...' : 'Enviar Solicitação'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={() => setIsFractionedDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Férias Fracionadas
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dias Disponíveis</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableDays}</div>
            <p className="text-xs text-muted-foreground">dias de férias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitações Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vacationRequests?.filter(r => r.status === 'pendente').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">aguardando aprovação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Férias Aprovadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vacationRequests?.filter(r => r.status === 'aprovado').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">neste ano</p>
          </CardContent>
        </Card>
      </div>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Solicitações</CardTitle>
          <CardDescription>
            Todas as suas solicitações de férias
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vacationRequests && vacationRequests.length > 0 ? (
            <div className="space-y-4">
              {vacationRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {request.tipo === 'integral' ? 'Férias Integrais' : 'Férias Fracionadas'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(request.data_inicio).toLocaleDateString('pt-BR')} - {new Date(request.data_fim).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {request.dias_ferias} dias • {new Date(request.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(request.status)}
                    <Badge variant="outline">
                      {getStatusLabel(request.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma solicitação encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para Férias Fracionadas */}
      <Dialog open={isFractionedDialogOpen} onOpenChange={setIsFractionedDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Férias Fracionadas</DialogTitle>
            <DialogDescription>
              Solicite férias em até 3 períodos diferentes
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[70vh] overflow-y-auto">
            <FractionedVacationForm
              onSubmit={(data) => {
                fractionedVacationMutation.mutate(data);
              }}
              onCancel={() => setIsFractionedDialogOpen(false)}
              isLoading={fractionedVacationMutation.isPending}
              companyId={selectedCompany?.id || ''}
              employeeId={employee?.id || ''}
              availableYears={availableYears || []}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
    );
}
