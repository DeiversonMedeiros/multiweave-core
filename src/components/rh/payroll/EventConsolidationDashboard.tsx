import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Filter, 
  Search, 
  Download, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  BarChart3,
  Users,
  Calendar,
  FileText
} from 'lucide-react';
import { useCompany } from '@/lib/company-context';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { useEventConsolidations } from '@/hooks/rh/useEventConsolidation';
import { usePayrollEventsByPeriod } from '@/hooks/rh/usePayrollCalculation';
import { calculatePayroll } from '@/services/rh/payrollCalculationService';
import { toast } from 'sonner';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface EventFilters {
  period: string;
  employee: string;
  eventType: string;
  status: string;
  dateRange: {
    start: string;
    end: string;
  };
}

interface PayrollEvent {
  id: string;
  employee_id: string;
  employee_name: string;
  event_type: 'time_record' | 'benefit' | 'absence' | 'allowance' | 'manual' | 'calculation';
  description: string;
  value: number;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  created_at: string;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
}

interface ConsolidationStats {
  totalEvents: number;
  pendingEvents: number;
  approvedEvents: number;
  rejectedEvents: number;
  processedEvents: number;
  totalValue: number;
  averageValue: number;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

interface EventConsolidationDashboardProps {
  companyId: string;
  onConsolidate?: (eventIds: string[]) => Promise<void>;
  onApprove?: (eventIds: string[]) => Promise<void>;
  onReject?: (eventIds: string[], reason: string) => Promise<void>;
}

export function EventConsolidationDashboard({ 
  companyId, 
  onConsolidate, 
  onApprove, 
  onReject 
}: EventConsolidationDashboardProps) {
  const { selectedCompany } = useCompany();
  const { data: employees = [], isLoading: employeesLoading } = useEmployees();
  const { data: eventConsolidations = [] } = useEventConsolidations();
  
  // Estados
  const [filters, setFilters] = useState<EventFilters>({
    period: '',
    employee: 'all',
    eventType: 'all',
    status: 'all',
    dateRange: {
      start: '',
      end: ''
    }
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [events, setEvents] = useState<PayrollEvent[]>([]);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [isGeneratingEvents, setIsGeneratingEvents] = useState(false);
  
  // Extrair mês e ano do período selecionado
  const periodData = useMemo(() => {
    if (!filters.period || filters.period === 'all') return null;
    const match = filters.period.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      return {
        year: parseInt(match[1], 10),
        month: parseInt(match[2], 10)
      };
    }
    return null;
  }, [filters.period]);
  
  // Buscar eventos do banco de dados quando período for selecionado
  const { data: payrollEventsData, isLoading: isLoadingEvents, refetch: refetchEvents } = usePayrollEventsByPeriod(
    periodData?.month || 0,
    periodData?.year || 0
  );

  // Dados mockados para demonstração
  const mockEvents: PayrollEvent[] = [
    {
      id: '1',
      employee_id: 'emp1',
      employee_name: 'João Silva',
      event_type: 'time_record',
      description: 'Horas Extras - 2h',
      value: 150.00,
      status: 'pending',
      created_at: '2024-01-15T10:00:00Z'
    },
    {
      id: '2',
      employee_id: 'emp2',
      employee_name: 'Maria Santos',
      event_type: 'benefit',
      description: 'Vale Refeição',
      value: 500.00,
      status: 'approved',
      created_at: '2024-01-15T10:00:00Z',
      approved_by: 'admin',
      approved_at: '2024-01-15T11:00:00Z'
    },
    {
      id: '3',
      employee_id: 'emp1',
      employee_name: 'João Silva',
      event_type: 'absence',
      description: 'Falta - 1 dia',
      value: -200.00,
      status: 'rejected',
      created_at: '2024-01-15T10:00:00Z',
      notes: 'Justificativa não aceita'
    }
  ];

  // Calcular estatísticas
  const stats: ConsolidationStats = useMemo(() => {
    if (!events || !Array.isArray(events)) {
      return {
        totalEvents: 0,
        pendingEvents: 0,
        approvedEvents: 0,
        rejectedEvents: 0,
        processedEvents: 0,
        totalValue: 0,
        averageValue: 0
      };
    }

    const filteredEvents = events.filter(event => {
      const matchesSearch = event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.employee_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEmployee = filters.employee === 'all' || event.employee_id === filters.employee;
      const matchesType = filters.eventType === 'all' || event.event_type === filters.eventType;
      const matchesStatus = filters.status === 'all' || event.status === filters.status;
      
      return matchesSearch && matchesEmployee && matchesType && matchesStatus;
    });

    return {
      totalEvents: filteredEvents.length,
      pendingEvents: filteredEvents.filter(e => e.status === 'pending').length,
      approvedEvents: filteredEvents.filter(e => e.status === 'approved').length,
      rejectedEvents: filteredEvents.filter(e => e.status === 'rejected').length,
      processedEvents: filteredEvents.filter(e => e.status === 'processed').length,
      totalValue: filteredEvents.reduce((sum, e) => sum + e.value, 0),
      averageValue: filteredEvents.length > 0 ? filteredEvents.reduce((sum, e) => sum + e.value, 0) / filteredEvents.length : 0
    };
  }, [events, searchTerm, filters]);

  // Eventos filtrados
  const filteredEvents = useMemo(() => {
    if (!events || !Array.isArray(events)) {
      return [];
    }
    
    return events.filter(event => {
      const matchesSearch = event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.employee_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEmployee = filters.employee === 'all' || event.employee_id === filters.employee;
      const matchesType = filters.eventType === 'all' || event.event_type === filters.eventType;
      const matchesStatus = filters.status === 'all' || event.status === filters.status;
      
      // Filtrar por período se selecionado
      let matchesPeriod = true;
      if (filters.period && filters.period !== 'all') {
        const eventDate = new Date(event.created_at);
        const eventYear = eventDate.getFullYear();
        const eventMonth = String(eventDate.getMonth() + 1).padStart(2, '0');
        const eventPeriod = `${eventYear}-${eventMonth}`;
        matchesPeriod = eventPeriod === filters.period;
      }
      
      return matchesSearch && matchesEmployee && matchesType && matchesStatus && matchesPeriod;
    });
  }, [events, searchTerm, filters]);

  // Handlers
  const handleFilterChange = (key: keyof EventFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSelectEvent = (eventId: string, selected: boolean) => {
    if (selected) {
      setSelectedEvents(prev => [...prev, eventId]);
    } else {
      setSelectedEvents(prev => prev.filter(id => id !== eventId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedEvents(filteredEvents.map(e => e.id));
    } else {
      setSelectedEvents([]);
    }
  };

  const handleConsolidate = async () => {
    // Se não houver eventos selecionados, consolidar todos os eventos filtrados
    const eventsToConsolidate = selectedEvents.length > 0 ? selectedEvents : filteredEvents.map(e => e.id);
    
    if (eventsToConsolidate.length === 0) {
      toast.error('Não há eventos para consolidar');
      return;
    }

    setIsConsolidating(true);
    try {
      await onConsolidate?.(eventsToConsolidate);
      toast.success(`${eventsToConsolidate.length} eventos consolidados com sucesso`);
      setSelectedEvents([]);
      // Recarregar eventos após consolidação
      await refetchEvents();
    } catch (error) {
      toast.error('Erro ao consolidar eventos');
    } finally {
      setIsConsolidating(false);
    }
  };

  const handleApprove = async () => {
    if (selectedEvents.length === 0) {
      toast.error('Selecione pelo menos um evento para aprovar');
      return;
    }

    try {
      await onApprove?.(selectedEvents);
      toast.success(`${selectedEvents.length} eventos aprovados com sucesso`);
      setSelectedEvents([]);
    } catch (error) {
      toast.error('Erro ao aprovar eventos');
    }
  };

  const handleReject = async () => {
    if (selectedEvents.length === 0) {
      toast.error('Selecione pelo menos um evento para rejeitar');
      return;
    }

    if (!rejectReason.trim()) {
      toast.error('Informe o motivo da rejeição');
      return;
    }

    try {
      await onReject?.(selectedEvents, rejectReason);
      toast.success(`${selectedEvents.length} eventos rejeitados com sucesso`);
      setSelectedEvents([]);
      setIsRejectDialogOpen(false);
      setRejectReason('');
    } catch (error) {
      toast.error('Erro ao rejeitar eventos');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processed':
        return <BarChart3 className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { variant: 'outline' as const, label: 'Pendente' },
      approved: { variant: 'default' as const, label: 'Aprovado' },
      rejected: { variant: 'destructive' as const, label: 'Rejeitado' },
      processed: { variant: 'secondary' as const, label: 'Processado' }
    };
    
    const statusConfig = config[status as keyof typeof config] || config.pending;
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  const getEventTypeLabel = (type: string) => {
    const labels = {
      time_record: 'Controle de Ponto',
      benefit: 'Benefício',
      absence: 'Ausência',
      allowance: 'Adicional',
      manual: 'Manual',
      calculation: 'Cálculo'
    };
    return labels[type as keyof typeof labels] || type;
  };

  // Função para gerar períodos dinamicamente
  const generatePeriods = useMemo(() => {
    const periodsMap = new Map<string, { value: string; label: string }>();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth() retorna 0-11
    
    // Nomes dos meses em português
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    // Adicionar períodos existentes no banco de dados
    eventConsolidations.forEach(consolidation => {
      if (consolidation.periodo) {
        // Formato esperado: YYYY/MM ou YYYY-MM
        // Normalizar para YYYY-MM para uso interno
        const normalizedPeriod = consolidation.periodo.replace(/\//g, '-');
        const periodMatch = normalizedPeriod.match(/^(\d{4})-(\d{2})$/);
        if (periodMatch) {
          const [, year, month] = periodMatch;
          const yearNum = parseInt(year, 10);
          const monthNum = parseInt(month, 10);
          
          if (yearNum >= 2024 && monthNum >= 1 && monthNum <= 12) {
            const periodValue = `${year}-${month}`;
            const periodLabel = `${monthNames[monthNum - 1]} ${year}`;
            periodsMap.set(periodValue, { value: periodValue, label: periodLabel });
          }
        }
      }
    });
    
    // Gerar períodos desde janeiro de 2024 até o mês atual
    const startYear = 2024;
    
    for (let year = startYear; year <= currentYear; year++) {
      const startMonth = year === startYear ? 1 : 1;
      const endMonth = year === currentYear ? currentMonth : 12;
      
      for (let month = startMonth; month <= endMonth; month++) {
        const periodValue = `${year}-${String(month).padStart(2, '0')}`;
        const periodLabel = `${monthNames[month - 1]} ${year}`;
        periodsMap.set(periodValue, { value: periodValue, label: periodLabel });
      }
    }
    
    // Converter Map para Array e ordenar do mais recente para o mais antigo
    const periods = Array.from(periodsMap.values());
    periods.sort((a, b) => {
      // Comparar por valor (YYYY-MM) em ordem decrescente
      return b.value.localeCompare(a.value);
    });
    
    return periods;
  }, [eventConsolidations]);

  // Converter eventos de folha para o formato PayrollEvent do dashboard
  React.useEffect(() => {
    if (payrollEventsData?.data && periodData) {
      const convertedEvents: PayrollEvent[] = payrollEventsData.data.map((event: any) => {
        // Buscar nome do funcionário
        const employee = employees.find(emp => emp.id === event.employee_id);
        const employeeName = employee?.nome || 'Funcionário não encontrado';
        
        return {
          id: event.id,
          employee_id: event.employee_id,
          employee_name: employeeName,
          event_type: event.tipo_rubrica === 'provento' ? 'benefit' : 
                      event.tipo_rubrica === 'desconto' ? 'absence' : 'calculation',
          description: event.descricao_rubrica || 'Evento de folha',
          value: event.tipo_rubrica === 'provento' ? event.valor_total : -event.valor_total,
          status: 'pending', // TODO: Mapear status real do evento
          created_at: event.created_at || new Date().toISOString()
        };
      });
      setEvents(convertedEvents);
    } else if (!periodData) {
      // Se não houver período selecionado, usar dados mockados
      setEvents(mockEvents);
    } else if (isLoadingEvents) {
      // Manter eventos anteriores enquanto carrega
      // Não limpar eventos
    } else {
      // Se não houver eventos e não estiver carregando, limpar
      setEvents([]);
    }
  }, [payrollEventsData, periodData, employees, isLoadingEvents]);
  
  // Função para gerar eventos de todos os funcionários
  const handleGenerateAllEvents = async () => {
    console.log('🎯 [handleGenerateAllEvents] Iniciando geração de eventos...');
    console.log('📅 [handleGenerateAllEvents] Período:', periodData);
    console.log('🏢 [handleGenerateAllEvents] Empresa:', selectedCompany?.id);
    
    if (!periodData || !selectedCompany?.id) {
      console.error('❌ [handleGenerateAllEvents] Período ou empresa não selecionados');
      toast.error('Selecione um período primeiro');
      return;
    }
    
    setIsGeneratingEvents(true);
    try {
      console.log('🚀 [handleGenerateAllEvents] Chamando calculatePayroll...');
      toast.info('Gerando eventos para todos os funcionários...');
      
      const result = await calculatePayroll({
        companyId: selectedCompany.id,
        mesReferencia: periodData.month,
        anoReferencia: periodData.year,
        tipoProcesso: 'folha_mensal'
      });
      
      console.log('📊 [handleGenerateAllEvents] Resultado do calculatePayroll:', result);
      
      if (result.status === 'sucesso') {
        console.log(`✅ [handleGenerateAllEvents] Sucesso! ${result.eventosCalculados} eventos criados para ${result.funcionariosProcessados} funcionários`);
        toast.success(`Eventos gerados com sucesso! ${result.eventosCalculados} eventos criados para ${result.funcionariosProcessados} funcionários`);
        // Recarregar eventos
        console.log('🔄 [handleGenerateAllEvents] Recarregando eventos...');
        await refetchEvents();
        console.log('✅ [handleGenerateAllEvents] Eventos recarregados');
      } else {
        console.error('❌ [handleGenerateAllEvents] Erro no resultado:', result.erros);
        toast.error(`Erro ao gerar eventos: ${result.erros.join(', ')}`);
      }
    } catch (error: any) {
      console.error('❌ [handleGenerateAllEvents] Erro capturado:', error);
      console.error('❌ [handleGenerateAllEvents] Stack:', error?.stack);
      console.error('❌ [handleGenerateAllEvents] Mensagem:', error?.message);
      toast.error(`Erro ao gerar eventos: ${error?.message || 'Erro desconhecido'}`);
    } finally {
      console.log('🏁 [handleGenerateAllEvents] Finalizando (finally)');
      setIsGeneratingEvents(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Consolidação de Eventos</h2>
          <p className="text-muted-foreground">
            Gerencie e consolide eventos da folha de pagamento
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar eventos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={filters.period} onValueChange={(value) => handleFilterChange('period', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                  {generatePeriods.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Funcionário</Label>
              <Select value={filters.employee} onValueChange={(value) => handleFilterChange('employee', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os funcionários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {employees?.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de Evento</Label>
              <Select value={filters.eventType} onValueChange={(value) => handleFilterChange('eventType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="time_record">Controle de Ponto</SelectItem>
                  <SelectItem value="benefit">Benefício</SelectItem>
                  <SelectItem value="absence">Ausência</SelectItem>
                  <SelectItem value="allowance">Adicional</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="calculation">Cálculo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total de Eventos</p>
                <p className="text-2xl font-bold">{stats.totalEvents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{stats.pendingEvents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Aprovados</p>
                <p className="text-2xl font-bold">{stats.approvedEvents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">R$ {stats.totalValue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Conteúdo */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="events">Eventos</TabsTrigger>
          <TabsTrigger value="consolidation">Consolidação</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumo da Consolidação</CardTitle>
              <CardDescription>
                Estatísticas gerais dos eventos para o período selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Progresso de Aprovação</span>
                  <span>{Math.round((stats.approvedEvents / stats.totalEvents) * 100)}%</span>
                </div>
                <Progress value={(stats.approvedEvents / stats.totalEvents) * 100} />
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Eventos Rejeitados</p>
                    <p className="text-lg font-semibold">{stats.rejectedEvents}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Médio</p>
                    <p className="text-lg font-semibold">R$ {stats.averageValue.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Lista de Eventos</CardTitle>
                  <CardDescription>
                    {filteredEvents.length} eventos encontrados
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAll(true)}
                    disabled={filteredEvents.length === 0}
                  >
                    Selecionar Todos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAll(false)}
                    disabled={selectedEvents.length === 0}
                  >
                    Desmarcar Todos
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedEvents.length === filteredEvents.length && filteredEvents.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedEvents.includes(event.id)}
                          onCheckedChange={(checked) => handleSelectEvent(event.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>{event.employee_name}</TableCell>
                      <TableCell>{getEventTypeLabel(event.event_type)}</TableCell>
                      <TableCell>{event.description}</TableCell>
                      <TableCell className={event.value < 0 ? 'text-red-500' : 'text-green-500'}>
                        R$ {event.value.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(event.status)}
                          {getStatusBadge(event.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(event.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="consolidation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ações de Consolidação</CardTitle>
              <CardDescription>
                {selectedEvents.length} eventos selecionados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Botão para gerar eventos de todos os funcionários */}
                {periodData && (
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Gerar Eventos do Período</p>
                      <p className="text-sm text-muted-foreground">
                        Gere eventos de folha para todos os funcionários do período {periodData.month}/{periodData.year}
                      </p>
                    </div>
                    <Button
                      onClick={handleGenerateAllEvents}
                      disabled={isGeneratingEvents || !periodData}
                      variant="outline"
                    >
                      {isGeneratingEvents ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Gerar Eventos
                        </>
                      )}
                    </Button>
                  </div>
                )}
                
                {/* Botões de consolidação */}
                <div className="flex gap-4">
                  <Button
                    onClick={handleConsolidate}
                    disabled={(selectedEvents.length === 0 && filteredEvents.length === 0) || isConsolidating}
                  >
                    {isConsolidating ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Consolidando...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Consolidar Eventos
                      </>
                    )}
                  </Button>
                
                  <Button
                    variant="default"
                    onClick={handleApprove}
                    disabled={selectedEvents.length === 0}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprovar Selecionados
                  </Button>
                  
                  <Button
                    variant="destructive"
                    onClick={() => setIsRejectDialogOpen(true)}
                    disabled={selectedEvents.length === 0}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeitar Selecionados
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Rejeição */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Eventos</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição para {selectedEvents.length} eventos selecionados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-reason">Motivo da Rejeição</Label>
              <Input
                id="reject-reason"
                placeholder="Descreva o motivo da rejeição..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Rejeitar Eventos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
