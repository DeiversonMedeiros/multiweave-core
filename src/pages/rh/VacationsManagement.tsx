import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
} from '@/components/ui/dialog';
import { 
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Calendar, 
  Plus, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Users,
  FileText,
  Filter,
  Search
} from 'lucide-react';
import { useCompany } from '@/lib/company-context';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EntityService } from '@/services/generic/entityService';
import { FractionedVacationForm } from '@/components/rh/FractionedVacationForm';
import { useVacationYears } from '@/hooks/rh/useVacationYears';
import { useAuth } from '@/lib/auth-context';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { EmployeesService } from '@/services/rh/employeesService';
import { generateVacationReceiptHTML, generateVacationPaymentReceiptHTML, VacationPaymentEvent } from '@/services/rh/vacationReceiptService';
import { downloadFile } from '@/services/rh/timeRecordReportService';

import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

interface PendingVacation {
  id: string;
  employee_id: string;
  employee_nome: string;
  data_inicio: string;
  data_fim: string;
  dias_solicitados: number;
  tipo: string;
  observacoes: string;
  created_at: string;
}

interface VacationStats {
  total: number;
  pendentes: number;
  aprovadas: number;
  rejeitadas: number;
}

export default function VacationsManagement() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Estados
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isFractionedDialogOpen, setIsFractionedDialogOpen] = useState(false);
  const [selectedVacation, setSelectedVacation] = useState<PendingVacation | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  // Buscar lista de funcionários
  const { data: employeesData } = useEmployees({ ativo: true });
  const employees = employeesData?.data || [];

  // Buscar anos de férias quando funcionário for selecionado
  const { data: availableYears } = useVacationYears(selectedEmployeeId);

  // Buscar férias (todas ou filtradas por status)
  const { data: pendingVacations, isLoading: isLoadingPending } = useQuery({
    queryKey: ['pending-vacations', selectedCompany?.id, statusFilter],
    queryFn: async (): Promise<PendingVacation[]> => {
      if (!selectedCompany?.id) return [];
      
      try {
        // Preparar filtros baseado no statusFilter
        const filters: any = {};
        if (statusFilter !== 'all') {
          filters.status = statusFilter;
        }
        
        // Buscar férias usando EntityService
        const result = await EntityService.list({
          schema: 'rh',
          table: 'vacations',
          companyId: selectedCompany.id,
          filters,
          orderBy: 'created_at',
          orderDirection: 'DESC'
        });

        // Buscar períodos aquisitivos
        const entitlementsResult = await EntityService.list({
          schema: 'rh',
          table: 'vacation_entitlements',
          companyId: selectedCompany.id,
          filters: {}
        });

        // Buscar dados dos funcionários e períodos aquisitivos para cada férias
        const vacationsWithEmployees = await Promise.all(
          result.data.map(async (vacation) => {
            try {
              const employeeResult = await EntityService.getById(
                'rh',
                'employees',
                vacation.employee_id,
                selectedCompany.id
              );
              
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
                      ent.dias_gozados >= vacation.dias_solicitados
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
                employee_nome: employeeResult?.nome || 'Funcionário não encontrado',
                ano_aquisitivo: periodoAquisitivo?.ano_aquisitivo,
                periodo_aquisitivo_inicio: periodoAquisitivo?.data_inicio_periodo,
                periodo_aquisitivo_fim: periodoAquisitivo?.data_fim_periodo
              };
            } catch (error) {
              console.error('Erro ao buscar funcionário:', error);
              return {
                ...vacation,
                employee_nome: 'Funcionário não encontrado'
              };
            }
          })
        );

        return vacationsWithEmployees;
      } catch (error) {
        console.error('Erro ao buscar férias pendentes:', error);
        return [];
      }
    },
    enabled: !!selectedCompany?.id,
    refetchInterval: 30000, // Refetch a cada 30 segundos
  });

  // Buscar estatísticas
  const { data: stats } = useQuery({
    queryKey: ['vacation-stats', selectedCompany?.id],
    queryFn: async (): Promise<VacationStats> => {
      if (!selectedCompany?.id) return { total: 0, pendentes: 0, aprovadas: 0, rejeitadas: 0 };
      
      try {
        const [totalResult, pendentesResult, aprovadasResult, rejeitadasResult] = await Promise.all([
          EntityService.list({
            schema: 'rh',
            table: 'vacations',
            companyId: selectedCompany.id,
            pageSize: 1
          }),
          EntityService.list({
            schema: 'rh',
            table: 'vacations',
            companyId: selectedCompany.id,
            filters: { status: 'pendente' },
            pageSize: 1
          }),
          EntityService.list({
            schema: 'rh',
            table: 'vacations',
            companyId: selectedCompany.id,
            filters: { status: 'aprovado' },
            pageSize: 1
          }),
          EntityService.list({
            schema: 'rh',
            table: 'vacations',
            companyId: selectedCompany.id,
            filters: { status: 'rejeitado' },
            pageSize: 1
          }),
        ]);

        return {
          total: totalResult.totalCount || 0,
          pendentes: pendentesResult.totalCount || 0,
          aprovadas: aprovadasResult.totalCount || 0,
          rejeitadas: rejeitadasResult.totalCount || 0,
        };
      } catch (error) {
        console.error('Erro ao buscar estatísticas de férias:', error);
        return { total: 0, pendentes: 0, aprovadas: 0, rejeitadas: 0 };
      }
    },
    enabled: !!selectedCompany?.id,
  });

  /**
   * Gera e baixa o recibo/aviso de férias em HTML (imprimível em PDF)
   */
  const handleDownloadVacationReceipt = async (vacation: any) => {
    if (!selectedCompany?.id) {
      toast({
        title: 'Empresa não selecionada',
        description: 'Selecione uma empresa para gerar o recibo de férias.',
        variant: 'destructive',
      });
      return;
    }

    try {
      toast({
        title: 'Gerando recibo de férias...',
        description: 'Aguarde enquanto preparamos o recibo para download.',
      });

      // Buscar dados da empresa
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', selectedCompany.id)
        .single();

      if (companyError) {
        console.warn('Erro ao buscar dados da empresa para recibo de férias:', companyError);
      }

      // Buscar dados completos do funcionário
      const employeeData = await EmployeesService.getById(vacation.employee_id, selectedCompany.id);

      // Buscar cargo se houver cargo_id
      let cargoData: any = null;
      if (employeeData?.cargo_id) {
        cargoData = await EntityService.getById<any>({
          schema: 'rh',
          table: 'positions',
          id: employeeData.cargo_id,
          companyId: selectedCompany.id,
        });
      }

      const html = generateVacationReceiptHTML({
        company: companyData,
        employee: employeeData,
        positionName: cargoData?.nome,
        vacation: {
          data_inicio: vacation.data_inicio,
          data_fim: vacation.data_fim,
          dias_solicitados: vacation.dias_solicitados,
          tipo: vacation.tipo,
          ano_aquisitivo: vacation.ano_aquisitivo,
          periodo_aquisitivo_inicio: vacation.periodo_aquisitivo_inicio,
          periodo_aquisitivo_fim: vacation.periodo_aquisitivo_fim,
        },
      });

      const employeeNameForFile =
        (employeeData?.nome || vacation.employee_nome || 'funcionario').replace(/\s+/g, '_');
      const startDate = vacation.data_inicio ? new Date(vacation.data_inicio) : null;
      const startDateStr = startDate && !isNaN(startDate.getTime())
        ? `${String(startDate.getDate()).padStart(2, '0')}-${String(
            startDate.getMonth() + 1,
          ).padStart(2, '0')}-${startDate.getFullYear()}`
        : 'periodo';

      const filename = `Recibo_Ferias_${employeeNameForFile}_${startDateStr}.html`;

      downloadFile(html, filename, 'text/html');

      toast({
        title: 'Recibo gerado',
        description: 'Recibo de férias gerado com sucesso.',
      });
    } catch (error: any) {
      console.error('Erro ao gerar recibo de férias:', error);
      toast({
        title: 'Erro ao gerar recibo de férias',
        description: error?.message || 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    }
  };

  /**
   * Gera e baixa o RECIBO DE FÉRIAS (pagamento) em HTML, usando
   * os lançamentos de folha de pagamento relacionados às férias.
   */
  const handleDownloadVacationPaymentReceipt = async (vacation: any) => {
    if (!selectedCompany?.id) {
      toast({
        title: 'Empresa não selecionada',
        description: 'Selecione uma empresa para gerar o recibo de férias.',
        variant: 'destructive',
      });
      return;
    }

    try {
      toast({
        title: 'Gerando recibo de férias (pagamento)...',
        description: 'Aguarde enquanto buscamos os lançamentos de férias na folha.',
      });

      // Buscar dados da empresa
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', selectedCompany.id)
        .single();

      if (companyError) {
        console.warn('Erro ao buscar dados da empresa para recibo de férias (pagamento):', companyError);
      }

      // Buscar dados completos do funcionário
      const employeeData = await EmployeesService.getById(vacation.employee_id, selectedCompany.id);

      // Buscar cargo se houver cargo_id
      let cargoData: any = null;
      if (employeeData?.cargo_id) {
        cargoData = await EntityService.getById<any>({
          schema: 'rh',
          table: 'positions',
          id: employeeData.cargo_id,
          companyId: selectedCompany.id,
        });
      }

      // Determinar meses/anos que abrangem o período de gozo
      const startDate = vacation.data_inicio ? new Date(vacation.data_inicio) : null;
      const endDate = vacation.data_fim ? new Date(vacation.data_fim) : null;

      if (!startDate || isNaN(startDate.getTime()) || !endDate || isNaN(endDate.getTime())) {
        toast({
          title: 'Período inválido',
          description: 'Não foi possível determinar o período de gozo das férias para gerar o recibo.',
          variant: 'destructive',
        });
        return;
      }

      const months: { month: number; year: number }[] = [];
      const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const endCursor = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

      while (cursor <= endCursor) {
        months.push({ month: cursor.getMonth() + 1, year: cursor.getFullYear() });
        cursor.setMonth(cursor.getMonth() + 1);
      }

      // Buscar folhas de pagamento para cada mês/ano do período de gozo
      const { getPayrollEvents, getPayrolls } = await import('@/services/rh/payrollCalculationService');

      const allEvents: VacationPaymentEvent[] = [];

      for (const { month, year } of months) {
        const payrollsResult = await getPayrolls(selectedCompany.id, {
          employee_id: vacation.employee_id,
          mes_referencia: month,
          ano_referencia: year,
        });

        for (const payroll of payrollsResult.data || []) {
          const eventsResult = await getPayrollEvents(selectedCompany.id, payroll.id);
          const events = eventsResult.data || [];

          // Filtrar apenas rubricas claramente relacionadas a férias
          const vacationEvents = events.filter((ev: any) => {
            const desc = (ev.descricao_rubrica || '').toString().toLowerCase();
            const code = (ev.codigo_rubrica || '').toString().toLowerCase();
            return (
              desc.includes('ferias') ||
              desc.includes('férias') ||
              code.includes('ferias') ||
              code.includes('férias')
            );
          });

          // Mapear para estrutura usada pelo gerador de HTML
          vacationEvents.forEach((ev: any) => {
            let referencia = '';
            if (ev.percentual && ev.percentual !== 0) {
              const percent = ev.percentual > 1 ? ev.percentual : ev.percentual * 100;
              referencia = `${percent.toFixed(2).replace('.', ',')}%`;
            } else if (ev.quantidade && ev.quantidade !== 1) {
              referencia = String(ev.quantidade);
            }

            allEvents.push({
              codigo: ev.codigo_rubrica,
              descricao: ev.descricao_rubrica,
              referencia,
              valor: ev.valor_total || 0,
              tipo: ev.tipo_rubrica === 'desconto' ? 'desconto' : 'provento',
              mes_referencia: ev.mes_referencia || payroll.mes_referencia,
              ano_referencia: ev.ano_referencia || payroll.ano_referencia,
            });
          });
        }
      }

      if (allEvents.length === 0) {
        toast({
          title: 'Nenhum lançamento de férias encontrado',
          description: 'Não foram encontrados lançamentos de férias na folha de pagamento para este período.',
          variant: 'destructive',
        });
        return;
      }

      const totalProventos = allEvents
        .filter((ev) => ev.tipo === 'provento')
        .reduce((sum, ev) => sum + (ev.valor || 0), 0);

      const totalDescontos = allEvents
        .filter((ev) => ev.tipo === 'desconto')
        .reduce((sum, ev) => sum + (ev.valor || 0), 0);

      const liquido = totalProventos - totalDescontos;

      const html = generateVacationPaymentReceiptHTML({
        company: companyData,
        employee: employeeData,
        positionName: cargoData?.nome,
        vacation: {
          data_inicio: vacation.data_inicio,
          data_fim: vacation.data_fim,
          dias_solicitados: vacation.dias_solicitados,
          tipo: vacation.tipo,
          ano_aquisitivo: vacation.ano_aquisitivo,
          periodo_aquisitivo_inicio: vacation.periodo_aquisitivo_inicio,
          periodo_aquisitivo_fim: vacation.periodo_aquisitivo_fim,
        },
        events: allEvents,
        totals: {
          totalProventos,
          totalDescontos,
          liquido,
        },
      });

      const employeeNameForFile =
        (employeeData?.nome || vacation.employee_nome || 'funcionario').replace(/\s+/g, '_');

      const startDateStr = `${String(startDate.getDate()).padStart(2, '0')}-${String(
        startDate.getMonth() + 1,
      ).padStart(2, '0')}-${startDate.getFullYear()}`;

      const filename = `Recibo_Pagamento_Ferias_${employeeNameForFile}_${startDateStr}.html`;

      downloadFile(html, filename, 'text/html');

      toast({
        title: 'Recibo de férias gerado',
        description: 'Recibo de pagamento de férias gerado com sucesso.',
      });
    } catch (error: any) {
      console.error('Erro ao gerar recibo de férias (pagamento):', error);
      toast({
        title: 'Erro ao gerar recibo de férias',
        description: error?.message || 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    }
  };

  // Aprovar férias
  const approveMutation = useMutation({
    mutationFn: async (vacationId: string) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      const { data: result, error } = await (supabase as any).rpc('call_schema_rpc', {
        p_schema_name: 'rh',
        p_function_name: 'aprovar_ferias',
        p_params: {
          p_vacation_id: vacationId,
          p_aprovado_por: user.id
        }
      });

      if (error) {
        throw new Error(error.message || 'Erro ao aprovar férias');
      }

      // Verificar se há erro no resultado
      if (result && typeof result === 'object' && result.error) {
        throw new Error(result.message || 'Erro ao aprovar férias');
      }
    },
    onSuccess: () => {
      // Invalidar todas as queries relacionadas, incluindo diferentes statusFilters
      queryClient.invalidateQueries({ queryKey: ['pending-vacations'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-stats'] });
      // Forçar refetch imediato
      queryClient.refetchQueries({ queryKey: ['pending-vacations'] });
      queryClient.refetchQueries({ queryKey: ['vacation-stats'] });
      toast({
        title: 'Férias aprovada',
        description: 'A solicitação de férias foi aprovada com sucesso.',
      });
      setIsApprovalDialogOpen(false);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Ocorreu um erro ao aprovar a solicitação.';
      toast({
        title: 'Erro ao aprovar férias',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // Rejeitar férias
  const rejectMutation = useMutation({
    mutationFn: async ({ vacationId, reason }: { vacationId: string; reason?: string }) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      const { data: result, error } = await (supabase as any).rpc('call_schema_rpc', {
        p_schema_name: 'rh',
        p_function_name: 'rejeitar_ferias',
        p_params: {
          p_vacation_id: vacationId,
          p_aprovado_por: user.id,
          p_motivo_rejeicao: reason || null
        }
      });

      if (error) {
        throw new Error(error.message || 'Erro ao rejeitar férias');
      }

      // Verificar se há erro no resultado
      if (result && typeof result === 'object' && result.error) {
        throw new Error(result.message || 'Erro ao rejeitar férias');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-vacations'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-stats'] });
      toast({
        title: 'Férias rejeitada',
        description: 'A solicitação de férias foi rejeitada.',
      });
      setIsApprovalDialogOpen(false);
      setRejectionReason('');
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Ocorreu um erro ao rejeitar a solicitação.';
      toast({
        title: 'Erro ao rejeitar férias',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  // Filtrar férias
  const filteredVacations = pendingVacations?.filter(vacation =>
    vacation.employee_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vacation.observacoes?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleApprove = (vacation: PendingVacation) => {
    setSelectedVacation(vacation);
    setIsApprovalDialogOpen(true);
  };

  const handleReject = (vacation: PendingVacation) => {
    setSelectedVacation(vacation);
    setIsApprovalDialogOpen(true);
  };

  const confirmApproval = () => {
    if (selectedVacation) {
      approveMutation.mutate(selectedVacation.id);
    }
  };

  const confirmRejection = () => {
    if (selectedVacation) {
      rejectMutation.mutate({
        vacationId: selectedVacation.id,
        reason: rejectionReason
      });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    // Corrigir problema de timezone - tratar como data local
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('pt-BR');
    }
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejeitado':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <RequirePage pagePath="/rh/vacations*" action="read">
      <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Férias</h1>
          <p className="text-muted-foreground">
            Gerencie as solicitações de férias dos funcionários
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setIsFractionedDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Solicitação
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.pendentes || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Aprovadas</p>
                <p className="text-2xl font-bold text-green-600">{stats?.aprovadas || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-4 w-4 text-red-600" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Rejeitadas</p>
                <p className="text-2xl font-bold text-red-600">{stats?.rejeitadas || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por funcionário ou observações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="md:w-48">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">Todos</option>
                <option value="pendente">Pendentes</option>
                <option value="aprovado">Aprovadas</option>
                <option value="rejeitado">Rejeitadas</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Férias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className={`h-5 w-5 ${
              statusFilter === 'aprovado' ? 'text-green-600' :
              statusFilter === 'rejeitado' ? 'text-red-600' :
              'text-yellow-600'
            }`} />
            {statusFilter === 'all' ? 'Todas as Solicitações' :
             statusFilter === 'aprovado' ? 'Solicitações Aprovadas' :
             statusFilter === 'rejeitado' ? 'Solicitações Rejeitadas' :
             'Solicitações Pendentes'}
          </CardTitle>
          <CardDescription>
            {filteredVacations.length} solicitação(ões) {statusFilter === 'all' ? 'encontrada(s)' :
             statusFilter === 'aprovado' ? 'aprovada(s)' :
             statusFilter === 'rejeitado' ? 'rejeitada(s)' :
             'aguardando aprovação'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPending ? (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p>Carregando solicitações...</p>
            </div>
          ) : filteredVacations.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="text-muted-foreground">Nenhuma solicitação pendente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVacations.map((vacation) => (
                <Card key={vacation.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{vacation.employee_nome}</h4>
                        <Badge className={getStatusColor(vacation.status || 'pendente')}>
                          {vacation.status === 'aprovado' ? 'Aprovado' : 
                           vacation.status === 'rejeitado' ? 'Rejeitado' : 
                           vacation.status === 'em_andamento' ? 'Em Andamento' :
                           vacation.status === 'concluido' ? 'Concluído' :
                           'Pendente'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Período:</span>
                          <p>{formatDate(vacation.data_inicio)} - {formatDate(vacation.data_fim)}</p>
                        </div>
                        <div>
                          <span className="font-medium">Dias:</span>
                          <p>{vacation.dias_solicitados} dias</p>
                        </div>
                        <div>
                          <span className="font-medium">Tipo:</span>
                          <p className="capitalize">{vacation.tipo}</p>
                        </div>
                        <div>
                          <span className="font-medium">Solicitado em:</span>
                          <p>{formatDate(vacation.created_at)}</p>
                        </div>
                      </div>
                      {vacation.ano_aquisitivo && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <span className="font-medium">Ano de Referência:</span> {vacation.ano_aquisitivo}
                          {vacation.periodo_aquisitivo_inicio && vacation.periodo_aquisitivo_fim && (
                            <span className="ml-2 text-xs">
                              (Período: {formatDate(vacation.periodo_aquisitivo_inicio)} - {formatDate(vacation.periodo_aquisitivo_fim)})
                            </span>
                          )}
                        </div>
                      )}
                      
                      {vacation.observacoes && (
                        <div className="mt-2">
                          <span className="font-medium text-sm">Observações:</span>
                          <p className="text-sm text-muted-foreground">{vacation.observacoes}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadVacationReceipt(vacation)}
                        title="Baixar comunicado de férias (HTML imprimível em PDF)"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Comunicado
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadVacationPaymentReceipt(vacation)}
                        title="Baixar recibo de férias (pagamento, HTML imprimível em PDF)"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Recibo
                      </Button>

                      {vacation.status === 'pendente' && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(vacation)}
                            disabled={approveMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(vacation)}
                            disabled={rejectMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Rejeitar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Aprovação/Rejeição */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedVacation ? 'Processar Solicitação' : ''}
            </DialogTitle>
            <DialogDescription>
              {selectedVacation && (
                <>
                  Processar solicitação de férias de <strong>{selectedVacation.employee_nome}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedVacation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Período:</span>
                  <p>{formatDate(selectedVacation.data_inicio)} - {formatDate(selectedVacation.data_fim)}</p>
                </div>
                <div>
                  <span className="font-medium">Dias:</span>
                  <p>{selectedVacation.dias_solicitados} dias</p>
                </div>
              </div>
              
              <div>
                <Label htmlFor="rejection-reason">Motivo da rejeição (opcional)</Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Informe o motivo da rejeição..."
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApprovalDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRejection}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejeitando...' : 'Rejeitar'}
            </Button>
            <Button
              onClick={confirmApproval}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? 'Aprovando...' : 'Aprovar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Férias Fracionadas */}
      <Dialog open={isFractionedDialogOpen} onOpenChange={(open) => {
        setIsFractionedDialogOpen(open);
        if (!open) {
          setSelectedEmployeeId('');
        }
      }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Nova Solicitação de Férias</DialogTitle>
            <DialogDescription>
              Crie uma nova solicitação de férias para um funcionário
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[70vh] overflow-y-auto space-y-4">
            {/* Campo de seleção de funcionário */}
            <div className="grid gap-2">
              <Label htmlFor="employee-select">Funcionário</Label>
              <Select
                value={selectedEmployeeId}
                onValueChange={(value) => setSelectedEmployeeId(value)}
              >
                <SelectTrigger id="employee-select">
                  <SelectValue placeholder="Selecione um funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {employees.length > 0 ? (
                    employees.map((employee: any) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.nome} {employee.matricula ? `(${employee.matricula})` : ''}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="loading" disabled>Carregando funcionários...</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {employees.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum funcionário encontrado</p>
              )}
            </div>

            {selectedEmployeeId && (
              <FractionedVacationForm
                onSubmit={async (data) => {
                  if (!selectedCompany?.id || !selectedEmployeeId) {
                    toast({
                      title: 'Erro',
                      description: 'Empresa ou funcionário não selecionado',
                      variant: 'destructive',
                    });
                    return;
                  }

                  try {
                    // Formatar períodos para JSONB
                    const periodosFormatados = data.periodos.map((p: any) => ({
                      data_inicio: p.dataInicio,
                      data_fim: p.dataFim,
                      dias_ferias: p.diasFerias,
                      dias_abono: p.diasAbono || 0,
                      observacoes: p.observacoes || null
                    }));

                    const { data: result, error } = await (supabase as any).rpc('call_schema_rpc', {
                      p_schema_name: 'rh',
                      p_function_name: 'criar_ferias_fracionadas',
                      p_params: {
                        p_company_id: selectedCompany.id,
                        p_employee_id: selectedEmployeeId,
                        p_ano: data.ano,
                        p_periodos: periodosFormatados,
                        p_observacoes: data.observacoes || null
                      }
                    });

                    if (error) {
                      throw new Error(error.message || 'Erro ao criar solicitação de férias fracionadas');
                    }

                    // Verificar se há erro no resultado
                    if (result && typeof result === 'object' && result.error) {
                      throw new Error(result.message || 'Erro ao criar solicitação de férias fracionadas');
                    }

                    toast({
                      title: 'Solicitação criada',
                      description: 'A solicitação de férias foi criada com sucesso.',
                    });

                    // Invalidar queries relacionadas
                    queryClient.invalidateQueries({ queryKey: ['pending-vacations'] });
                    queryClient.invalidateQueries({ queryKey: ['vacation-stats'] });
                    queryClient.invalidateQueries({ queryKey: ['vacation-years'] });

                    setIsFractionedDialogOpen(false);
                    setSelectedEmployeeId('');
                  } catch (error: any) {
                    toast({
                      title: 'Erro ao criar solicitação',
                      description: error?.message || 'Ocorreu um erro ao criar a solicitação de férias.',
                      variant: 'destructive',
                    });
                  }
                }}
                onCancel={() => {
                  setIsFractionedDialogOpen(false);
                  setSelectedEmployeeId('');
                }}
                companyId={selectedCompany?.id || ''}
                employeeId={selectedEmployeeId}
                availableYears={availableYears || []}
              />
            )}

            {!selectedEmployeeId && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione um funcionário para continuar</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </RequirePage>
  );
}
