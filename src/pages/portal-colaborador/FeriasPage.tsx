import { useState, useEffect } from 'react';
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
import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { FractionedVacationForm } from '@/components/rh/FractionedVacationForm';
import { useVacationYears } from '@/hooks/rh/useVacationYears';
import { validateIntegralVacation, calculateDaysBetween } from '@/lib/vacationValidation';
import { formatDateString } from '@/utils/dateUtils';

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
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFractionedDialogOpen, setIsFractionedDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
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

  // Garantir que o ano selecionado seja válido quando os anos disponíveis mudarem
  useEffect(() => {
    if (availableYears && availableYears.length > 0) {
      const currentYearExists = availableYears.some(year => year.ano === selectedYear);
      if (!currentYearExists) {
        setSelectedYear(availableYears[0].ano);
      }
    }
  }, [availableYears, selectedYear]);

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
      
      // Buscar períodos aquisitivos
      const entitlementsResult = await EntityService.list({
        schema: 'rh',
        table: 'vacation_entitlements',
        companyId: selectedCompany.id,
        filters: {
          employee_id: employee.id
        }
      });
      
      // Adicionar período aquisitivo a cada férias
      const vacationsWithPeriods = result.data.map((vacation: any) => {
        // Buscar período aquisitivo relacionado às férias
        let periodoAquisitivo: any = null;
        if (vacation.data_inicio) {
          const employeeEntitlements = entitlementsResult.data?.filter((ent: any) => 
            ent.employee_id === vacation.employee_id
          ) || [];
          
          // Se a férias já foi aprovada, buscar o período que tem dias_gozados correspondentes
          if (vacation.status === 'aprovado' && vacation.aprovado_em) {
            // Buscar período que tem dias_gozados >= dias_solicitados (indicando que foi usado)
            const periodosComDiasGozados = employeeEntitlements.filter((ent: any) => 
              ent.dias_gozados > 0
            );
            
            if (periodosComDiasGozados.length > 0) {
              // Ordenar por updated_at mais recente (mais provável de ser o período usado)
              periodosComDiasGozados.sort((a: any, b: any) => {
                const dateA = new Date(a.updated_at || 0).getTime();
                const dateB = new Date(b.updated_at || 0).getTime();
                return dateB - dateA;
              });
              
              // Verificar se algum período tem dias_gozados que corresponde aos dias solicitados
              const periodoCorrespondente = periodosComDiasGozados.find((ent: any) => 
                ent.dias_gozados >= (vacation.dias_solicitados || vacation.dias_ferias || 0)
              );
              
              if (periodoCorrespondente) {
                periodoAquisitivo = periodoCorrespondente;
              } else {
                // Se não encontrou correspondência exata, usar o mais recente com dias gozados
                periodoAquisitivo = periodosComDiasGozados[0];
              }
            }
          }
          
          // Se ainda não encontrou, buscar período que contém a data de início
          if (!periodoAquisitivo) {
            const matchingEntitlements = employeeEntitlements.filter((ent: any) => 
              ent.data_inicio_periodo <= vacation.data_inicio &&
              ent.data_fim_periodo >= vacation.data_inicio
            );
            
            if (matchingEntitlements.length > 0) {
              periodoAquisitivo = matchingEntitlements[0];
            }
          }
          
          // Se ainda não encontrou, buscar o período mais recente do funcionário
          if (!periodoAquisitivo && employeeEntitlements.length > 0) {
            employeeEntitlements.sort((a: any, b: any) => b.ano_aquisitivo - a.ano_aquisitivo);
            periodoAquisitivo = employeeEntitlements[0];
          }
        }
        
        return {
          ...vacation,
          ano_aquisitivo: periodoAquisitivo?.ano_aquisitivo,
          periodo_aquisitivo_inicio: periodoAquisitivo?.data_inicio_periodo,
          periodo_aquisitivo_fim: periodoAquisitivo?.data_fim_periodo
        };
      });
      
      return vacationsWithPeriods;
    },
    enabled: !!employee?.id && !!selectedCompany?.id
  });

  // Calcular dias disponíveis baseado no ano selecionado
  const selectedYearData = availableYears?.find(year => year.ano === selectedYear);
  const availableDays = selectedYearData?.dias_restantes || 0;
  const dataFimPeriodo = selectedYearData?.data_fim_periodo;
  
  // Calcular data mínima permitida (data_fim_periodo + 1 dia)
  const minStartDate = dataFimPeriodo 
    ? new Date(new Date(dataFimPeriodo).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    : undefined;

  // Calcular automaticamente a data de fim quando a data de início for selecionada (30 dias para férias integrais)
  useEffect(() => {
    if (startDate) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 29); // 30 dias incluindo o dia inicial (0-29 = 30 dias)
      
      // Formatar a data no formato YYYY-MM-DD
      const formattedEndDate = end.toISOString().split('T')[0];
      setEndDate(formattedEndDate);
    } else {
      setEndDate('');
    }
  }, [startDate]);

  // Validar férias integrais em tempo real
  useEffect(() => {
    if (startDate && endDate) {
      const result = validateIntegralVacation(startDate, endDate, availableDays);
      
      // Adicionar validação de data mínima (após término do período aquisitivo)
      if (dataFimPeriodo && startDate) {
        const fimPeriodo = new Date(dataFimPeriodo);
        const inicioFerias = new Date(startDate);
        const dataMinima = new Date(fimPeriodo);
        dataMinima.setDate(dataMinima.getDate() + 1); // +1 dia após o término do período
        
        if (inicioFerias <= fimPeriodo) {
          result.isValid = false;
          result.errors.push(
            `A data de início das férias deve ser após o término do período aquisitivo. Período termina em ${formatDateString(fimPeriodo.toISOString().split('T')[0])}, férias podem começar a partir de ${formatDateString(dataMinima.toISOString().split('T')[0])}.`
          );
        }
      }
      
      setValidationResult(result);
    } else {
      setValidationResult(null);
    }
  }, [startDate, endDate, availableDays, dataFimPeriodo]);

  // Mutação para solicitar férias integrais
  const vacationMutation = useMutation({
    mutationFn: async () => {
      if (!employee?.id || !selectedCompany?.id) {
        throw new Error('Dados do funcionário ou empresa não encontrados');
      }
      
      if (!selectedYear) {
        throw new Error('Ano de referência não selecionado');
      }
      
      // Usar função RPC para criar férias integrais com validação do período aquisitivo
      const { data, error } = await (supabase as any).rpc('call_schema_rpc', {
        p_schema_name: 'rh',
        p_function_name: 'criar_ferias_integrais',
        p_params: {
          p_company_id: selectedCompany.id,
          p_employee_id: employee.id,
          p_ano: selectedYear,
          p_data_inicio: startDate,
          p_data_fim: endDate,
          p_observacoes: reason || null
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Erro ao criar solicitação de férias');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-requests', employee?.id] });
      queryClient.invalidateQueries({ queryKey: ['vacation-years'] });
      setIsDialogOpen(false);
      setStartDate('');
      setEndDate('');
      setSelectedYear(new Date().getFullYear());
      setReason('');
      setValidationResult(null);
      
      toast({
        title: "Solicitação enviada!",
        description: "Sua solicitação de férias foi enviada para aprovação.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || error?.error?.message || 'Erro desconhecido ao enviar solicitação';
      toast({
        title: "Erro ao enviar solicitação",
        description: errorMessage,
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

      // Formatar períodos para JSONB
      const periodosFormatados = data.periodos.map((p: any) => ({
        data_inicio: p.dataInicio,
        data_fim: p.dataFim,
        dias_ferias: p.diasFerias,
        dias_abono: p.diasAbono || 0,
        observacoes: p.observacoes || null
      }));

      console.log('[FractionedVacation] Dados enviados:', {
        company_id: selectedCompany.id,
        employee_id: employee.id,
        ano: data.ano,
        periodos: periodosFormatados,
        observacoes: data.observacoes
      });

      const { data: result, error } = await (supabase as any).rpc('call_schema_rpc', {
        p_schema_name: 'rh',
        p_function_name: 'criar_ferias_fracionadas',
        p_params: {
          p_company_id: selectedCompany.id,
          p_employee_id: employee.id,
          p_ano: data.ano,
          p_periodos: periodosFormatados,
          p_observacoes: data.observacoes || null
        }
      });

      console.log('[FractionedVacation] Resultado:', { result, error });

      if (error) {
        console.error('[FractionedVacation] Erro na chamada RPC:', error);
        throw new Error(error.message || 'Erro ao criar solicitação de férias fracionadas');
      }

      // Verificar se há erro no resultado (call_schema_rpc retorna JSONB com error: true)
      if (result && typeof result === 'object' && result.error) {
        console.error('[FractionedVacation] Erro na função:', result);
        throw new Error(result.message || 'Erro ao criar solicitação de férias fracionadas');
      }
      
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
    onError: (error: any) => {
      const errorMessage = error?.message || error?.error?.message || 'Ocorreu um erro ao enviar sua solicitação de férias.';
      toast({
        title: 'Erro ao enviar solicitação',
        description: errorMessage,
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

    // Validar que não exceda 30 dias
    if (days > 30) {
      toast({
        title: "Período inválido",
        description: "As férias integrais devem ter exatamente 30 dias.",
        variant: "destructive",
      });
      return;
    }

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
                  Solicite suas férias integrais
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="ano">Ano de Referência</Label>
                  <select
                    id="ano"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {availableYears?.map(year => (
                      <option key={year.ano} value={year.ano}>
                        {year.ano} - {year.dias_restantes} dias disponíveis
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="start">Data de Início</Label>
                  <Input
                    id="start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={minStartDate}
                  />
                  {dataFimPeriodo && (
                    <p className="text-xs text-gray-500">
                      Período aquisitivo termina em {formatDateString(dataFimPeriodo)}. 
                      Férias podem começar a partir de {minStartDate ? formatDateString(minStartDate) : ''}.
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end">Data de Fim</Label>
                  <Input
                    id="end"
                    type="date"
                    value={endDate}
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500">
                    Calculado automaticamente (30 dias a partir da data de início)
                  </p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        {formatDateString(request.data_inicio)} - {formatDateString(request.data_fim)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {request.dias_solicitados || request.dias_ferias} dias • {formatDateString(request.created_at)}
                        {request.ano_aquisitivo && (
                          <span className="ml-2">• Ano de Referência: {request.ano_aquisitivo}</span>
                        )}
                      </p>
                      {request.periodo_aquisitivo_inicio && request.periodo_aquisitivo_fim && (
                        <p className="text-xs text-gray-400 mt-1">
                          Período Aquisitivo: {formatDateString(request.periodo_aquisitivo_inicio)} - {formatDateString(request.periodo_aquisitivo_fim)}
                        </p>
                      )}
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
