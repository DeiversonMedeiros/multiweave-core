import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Download,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  MapPin,
  Calendar,
  Coffee,
  Clock3,
  Clock4,
  Camera,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Users,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FormModal } from '@/components/rh/FormModal';
import { TimeClock } from '@/components/rh/TimeClock';
import { useTimeRecordsPaginated, useDeleteTimeRecord, useApproveTimeRecord, useRejectTimeRecord } from '@/hooks/rh/useTimeRecords';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { TimeRecord, Employee } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

import { RequirePage } from '@/components/RequireAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useTimeRecordEvents } from '@/hooks/rh/useTimeRecordEvents';
import { formatDateOnly } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TimeRecordsImportModal } from '@/components/rh/TimeRecordsImportModal';

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function TimeRecordsPage() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const { selectedCompany } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [employeeFilter, setEmployeeFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Aumentado para 90 dias para incluir mais registros
    end: new Date().toISOString().split('T')[0]
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TimeRecord | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [showTimeClock, setShowTimeClock] = useState(false);
  const [activeTab, setActiveTab] = useState('registros');
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const { data: eventsData } = useTimeRecordEvents(selectedRecord?.id || undefined);

  // Hooks
  const { data: employeesData } = useEmployees();
  const employees = employeesData?.data || [];
  
  // Usar paginação infinita otimizada
  const {
    data,
    fetchNextPage: originalFetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch
  } = useTimeRecordsPaginated({
    startDate: dateRange.start,
    endDate: dateRange.end,
    status: statusFilter || undefined,
    ...(employeeFilter && { employeeId: employeeFilter }),
    pageSize: 10, // Carregar 10 registros por vez
  });

  // Logs para rastrear mudanças de estado
  useEffect(() => {
    console.log('[TimeRecordsPage] 📊 Estado da paginação mudou:', {
      hasNextPage,
      isFetchingNextPage,
      isLoading,
      totalPages: data?.pages?.length || 0,
      totalRecords: data?.pages?.flatMap(p => p.data).length || 0,
      timestamp: new Date().toISOString(),
    });
    
    // Log quando isFetchingNextPage muda para true (indica que está carregando)
    if (isFetchingNextPage) {
      const stackTrace = new Error().stack;
      console.warn('[TimeRecordsPage] ⚠️ isFetchingNextPage = true - Carregamento iniciado!');
      console.warn('[TimeRecordsPage] 📍 Stack trace:', stackTrace);
    }
  }, [hasNextPage, isFetchingNextPage, isLoading, data]);

  // Wrapper para fetchNextPage que só permite chamadas explícitas do botão
  const fetchNextPage = useCallback(() => {
    const stackTrace = new Error().stack;
    console.log('[TimeRecordsPage] 🖱️ fetchNextPage chamado explicitamente');
    console.log('[TimeRecordsPage] 📍 Stack trace:', stackTrace);
    originalFetchNextPage();
  }, [originalFetchNextPage]);

  // Combinar todas as páginas em um único array
  const combineStartTime = performance.now();
  const timeRecords = data?.pages.flatMap(page => page.data) || [];
  const combineEndTime = performance.now();
  const combineDuration = combineEndTime - combineStartTime;
  
  const deleteRecordMutation = useDeleteTimeRecord();
  const approveRecordMutation = useApproveTimeRecord();
  const rejectRecordMutation = useRejectTimeRecord();

  // Filtrar dados apenas por busca de texto (filtros de data/status/employee já aplicados no servidor)
  const filterStartTime = performance.now();
  const filteredRecords = timeRecords.filter(record => {
    // Se não há termo de busca, mostrar todos os registros
    if (!searchTerm) return true;
    
    // Verificar se o termo de busca corresponde ao nome do funcionário, matrícula ou observações
    const employeeName = (record.employee_nome || '').toLowerCase();
    const employeeMatricula = (record.employee_matricula || '').toLowerCase();
    const observacoes = (record.observacoes || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return employeeName.includes(searchLower) || 
           employeeMatricula.includes(searchLower) ||
           observacoes.includes(searchLower);
  });
  const filterEndTime = performance.now();
  const filterDuration = filterEndTime - filterStartTime;

  // Log de performance quando dados mudarem
  useEffect(() => {
    if (timeRecords.length > 0) {
      console.log(`[TimeRecordsPage] 📊 Dados: ${timeRecords.length} registros | Combine: ${combineDuration.toFixed(2)}ms | Filtro: ${filterDuration.toFixed(2)}ms | Total filtrados: ${filteredRecords.length}`);
    }
  }, [timeRecords.length, filteredRecords.length]);

  // Agrupar registros por funcionário e calcular totais
  const employeeSummary = useMemo(() => {
    const grouped = new Map<string, {
      employeeId: string;
      employeeName: string;
      employeeMatricula?: string;
      records: TimeRecord[];
      totalHorasTrabalhadas: number;
      totalHorasNegativas: number;
      totalHorasExtras50: number;
      totalHorasExtras100: number;
      totalHorasNoturnas: number;
    }>();

    filteredRecords.forEach(record => {
      const employeeId = record.employee_id;
      const employeeName = record.employee_nome || 'Funcionário sem nome';
      const employeeMatricula = record.employee_matricula;

      if (!grouped.has(employeeId)) {
        grouped.set(employeeId, {
          employeeId,
          employeeName,
          employeeMatricula,
          records: [],
          totalHorasTrabalhadas: 0,
          totalHorasNegativas: 0,
          totalHorasExtras50: 0,
          totalHorasExtras100: 0,
          totalHorasNoturnas: 0,
        });
      }

      const summary = grouped.get(employeeId)!;
      summary.records.push(record);
      
      // Considerar apenas registros aprovados para o resumo
      // Registros pendentes não devem aparecer nos totais
      if (record.status !== 'aprovado') {
        return; // Pular registros não aprovados
      }
      
      summary.totalHorasTrabalhadas += record.horas_trabalhadas || 0;
      summary.totalHorasNegativas += record.horas_negativas || 0;
      summary.totalHorasExtras50 += record.horas_extras_50 || 0;
      summary.totalHorasExtras100 += record.horas_extras_100 || 0;
      summary.totalHorasNoturnas += record.horas_noturnas || 0;
    });

    return Array.from(grouped.values()).sort((a, b) => 
      a.employeeName.localeCompare(b.employeeName)
    );
  }, [filteredRecords]);

  const toggleEmployeeExpanded = (employeeId: string) => {
    setExpandedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  };

  // Refetch quando filtros mudarem
  useEffect(() => {
    refetch();
  }, [dateRange.start, dateRange.end, statusFilter, employeeFilter, refetch]);

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value === 'all' ? '' : value);
  };

  const handleEmployeeFilter = (value: string) => {
    setEmployeeFilter(value === 'all' ? '' : value);
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = () => {
    setSelectedRecord(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (record: TimeRecord) => {
    setSelectedRecord(record);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleView = (record: TimeRecord) => {
    setSelectedRecord(record);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDelete = async (record: TimeRecord) => {
    if (confirm(`Tem certeza que deseja excluir o registro de ${record.employee_nome || 'funcionário'}?`)) {
      try {
        await deleteRecordMutation.mutateAsync(record.id);
      } catch (error) {
        console.error('Erro ao excluir registro:', error);
      }
    }
  };

  const handleApprove = async (record: TimeRecord) => {
    try {
      await approveRecordMutation.mutateAsync({ id: record.id });
    } catch (error) {
      console.error('Erro ao aprovar registro:', error);
    }
  };

  const handleReject = async (record: TimeRecord) => {
    const reason = prompt('Motivo da rejeição:');
    if (reason) {
      try {
        await rejectRecordMutation.mutateAsync({ id: record.id, observacoes: reason });
      } catch (error) {
        console.error('Erro ao rejeitar registro:', error);
      }
    }
  };

  const handleExport = () => {
    console.log('Exportar registros de ponto');
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedRecord(null);
  };

  const handleModalSubmit = (data: any) => {
    console.log('Salvar registro:', data);
    handleModalClose();
  };

  // Funções auxiliares para formatação e visualização
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejeitado':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pendente':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock3 className="h-4 w-4 text-gray-500" />;
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
        return status || 'Desconhecido';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'bg-green-100 text-green-800';
      case 'rejeitado':
        return 'bg-red-100 text-red-800';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return '--:--';
    
    try {
      // Se for formato TIME do PostgreSQL (HH:MM:SS ou HH:MM:SS.microseconds)
      if (time.match(/^\d{1,2}:\d{2}(:\d{2})?(\.\d+)?$/)) {
        // Extrair apenas HH:MM
        const parts = time.split(':');
        if (parts.length >= 2) {
          const hours = parts[0].padStart(2, '0');
          const minutes = parts[1].padStart(2, '0');
          return `${hours}:${minutes}`;
        }
        return time;
      }
      
      // Se for timestamp completo (ISO string ou formato com timezone)
      // Exemplo: "2026-01-07 23:05:09.220196+00" ou "2026-01-07T23:05:09.635Z"
      if (time.includes('T') || time.includes(' ') || time.includes('+') || time.includes('-', 10)) {
        const date = new Date(time);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
          });
        }
      }
      
      // Se não conseguir converter, retornar como está
      return time;
    } catch {
      return time || '--:--';
    }
  };

  // Função para formatar horário com data - sempre mostra a data quando disponível
  const formatTimeWithDate = (time?: string, date?: string, baseDate?: string) => {
    if (!time) return '--:--';
    const timeOnly = formatTime(time);
    
    // Determinar qual data usar
    let dateToUse: string | undefined;
    if (date) {
      dateToUse = date;
    } else if (baseDate) {
      dateToUse = baseDate;
    } else {
      return timeOnly;
    }
    
    // SEMPRE mostrar a data quando disponível
    const [year, month, day] = dateToUse.split('-');
    if (year && month && day) {
      return `${timeOnly} (${day.padStart(2, '0')}/${month.padStart(2, '0')})`;
    }
    
    return timeOnly;
  };

  const calculateTotalHours = (record: TimeRecord) => {
    if (!record.entrada || !record.saida) return '--:--';
    
    const entrada = new Date(`2000-01-01T${record.entrada}`);
    const saida = new Date(`2000-01-01T${record.saida}`);
    
    // Subtrair tempo de almoço se existir
    let almocoTime = 0;
    if (record.entrada_almoco && record.saida_almoco) {
      const entradaAlmoco = new Date(`2000-01-01T${record.entrada_almoco}`);
      const saidaAlmoco = new Date(`2000-01-01T${record.saida_almoco}`);
      almocoTime = saidaAlmoco.getTime() - entradaAlmoco.getTime();
    }
    
    const totalMs = saida.getTime() - entrada.getTime() - almocoTime;
    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getLocationForRecord = (record: TimeRecord) => {
    // Prioridade: usar all_locations se disponível, senão usar campos diretos
    if (record.all_locations && Array.isArray(record.all_locations) && record.all_locations.length > 0) {
      const firstLocation = record.all_locations[0];
      return {
        latitude: firstLocation.latitude,
        longitude: firstLocation.longitude,
        endereco: firstLocation.endereco,
        hasCoords: Boolean(firstLocation.latitude && firstLocation.longitude),
        hasAddress: Boolean(firstLocation.endereco),
      };
    }
    
    // Fallback para campos diretos
    const lat = (record as any).entrada_latitude || (record as any).latitude;
    const lng = (record as any).entrada_longitude || (record as any).longitude;
    const addr = (record as any).entrada_endereco || record.endereco;
    
    return {
      latitude: lat,
      longitude: lng,
      endereco: addr,
      hasCoords: Boolean(lat && lng),
      hasAddress: Boolean(addr),
    };
  };

  const resetFilters = () => {
    setStatusFilter('');
    setEmployeeFilter('');
    setSearchTerm('');
    setDateRange({
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Aumentado para 90 dias
      end: new Date().toISOString().split('T')[0]
    });
  };


  return (
    <RequirePage pagePath="/portal-colaborador/historico-marcacoes*" action="read">
      <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Controle de Ponto</h1>
          <p className="text-muted-foreground">
            Gerencie os registros de ponto dos funcionários
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowTimeClock(!showTimeClock)}
          >
            <Clock className="h-4 w-4 mr-2" />
            {showTimeClock ? 'Ocultar Relógio' : 'Mostrar Relógio'}
          </Button>
          <Button 
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
          >
            <Download className="h-4 w-4 mr-2" />
            Importar em Massa
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Registro
          </Button>
        </div>
      </div>

      {/* Relógio de Ponto */}
      {showTimeClock && employees.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.slice(0, 6).map((employee) => (
            <TimeClock
              key={employee.id}
              employeeId={employee.id}
              employeeName={employee.nome}
            />
          ))}
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Funcionário ou observações..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={statusFilter || 'all'}
                onValueChange={handleStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Funcionário</label>
              <Select
                value={employeeFilter || 'all'}
                onValueChange={handleEmployeeFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os funcionários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os funcionários</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="w-full"
                >
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExport}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Inicial</label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Final</label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de Navegação */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="registros" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Registros de Ponto
          </TabsTrigger>
          <TabsTrigger value="resumo" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Resumo por Funcionário
          </TabsTrigger>
        </TabsList>

        {/* Aba: Registros de Ponto */}
        <TabsContent value="registros" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Registros de Ponto</CardTitle>
              <CardDescription>
                {isLoading 
                  ? 'Carregando registros...'
                  : filteredRecords && filteredRecords.length > 0 
                    ? `${filteredRecords.length} registro(s) encontrado(s) no período selecionado`
                    : 'Nenhum registro encontrado no período selecionado'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-2">
                <Clock className="h-6 w-6 animate-spin" />
                <span>Carregando registros de ponto...</span>
              </div>
            </div>
          ) : filteredRecords && filteredRecords.length > 0 ? (
            <div className="space-y-4">
              {filteredRecords.map((record) => {
                const location = getLocationForRecord(record);
                const mapHref = location.hasCoords
                  ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
                  : location.hasAddress
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.endereco || '')}`
                    : undefined;
                const photos = record.all_photos && Array.isArray(record.all_photos) ? record.all_photos : [];
                const firstPhoto = photos.length > 0 ? photos[0] : null;
                const hasMultiplePhotos = photos.length > 1;

                return (
                  <div
                    key={record.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {/* Cabeçalho do Card */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {formatDateOnly(record.data_registro)}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm font-semibold text-gray-700">
                              {record.employee_nome || 'Nome não encontrado'}
                            </p>
                            {record.employee_matricula && (
                              <span className="text-xs text-gray-500">
                                ({record.employee_matricula})
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            Criado em {format(new Date(record.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(record.status || '')}
                        <Badge className={getStatusColor(record.status || '')}>
                          {getStatusLabel(record.status || '')}
                        </Badge>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(record)}
                            className="h-8 w-8 p-0"
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEditPage('/rh/time-records*') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(record)}
                              className="h-8 w-8 p-0"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {record.status === 'pendente' && canEditPage('/rh/time-records*') && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApprove(record)}
                                className="h-8 w-8 p-0 text-green-600"
                                title="Aprovar"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReject(record)}
                                className="h-8 w-8 p-0 text-red-600"
                                title="Rejeitar"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {canDeletePage('/rh/time-records*') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(record)}
                              className="h-8 w-8 p-0 text-red-600"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Foto principal (se houver) - Lazy Loading */}
                    {firstPhoto && (
                      <div className="mb-3">
                        <div className="relative inline-block">
                          <img
                            key={`photo-${record.id}-${firstPhoto.id || firstPhoto.photo_url}`}
                            src={firstPhoto.photo_url}
                            alt={`Foto de ${record.employee_nome} em ${formatDateOnly(record.data_registro)}`}
                            className="h-32 w-auto rounded-lg border object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            loading="lazy"
                            onClick={() => window.open(firstPhoto.photo_url, '_blank')}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                            onLoad={(e) => {
                              // Garantir que a imagem não seja recarregada
                              (e.target as HTMLImageElement).style.opacity = '1';
                            }}
                          />
                          {hasMultiplePhotos && (
                            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                              <Camera className="h-3 w-3" />
                              {photos.length} foto{photos.length > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Horários */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock3 className="h-4 w-4 text-green-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Entrada</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTimeWithDate(record.entrada, record.entrada_date, record.base_date || record.data_registro)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Coffee className="h-4 w-4 text-orange-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Início Almoço</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTimeWithDate(record.entrada_almoco, record.entrada_almoco_date, record.base_date || record.data_registro)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Coffee className="h-4 w-4 text-orange-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Fim Almoço</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTimeWithDate(record.saida_almoco, record.saida_almoco_date, record.base_date || record.data_registro)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock4 className="h-4 w-4 text-red-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Saída</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTimeWithDate(record.saida, record.saida_date, record.base_date || record.data_registro)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock className="h-4 w-4 text-purple-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Entrada Extra</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTimeWithDate(record.entrada_extra1, record.entrada_extra1_date, record.base_date || record.data_registro)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock className="h-4 w-4 text-purple-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Saída Extra</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTimeWithDate(record.saida_extra1, record.saida_extra1_date, record.base_date || record.data_registro)}
                        </div>
                      </div>
                    </div>

                    {/* Total de horas e observações */}
                    <div className="flex items-center justify-between pt-3 border-t mb-3">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm">
                          <span className="text-gray-500">Total de horas: </span>
                          <span className="font-medium text-gray-900">
                            {calculateTotalHours(record)}
                          </span>
                        </div>
                        {/* Horas Extras ou Negativas */}
                        {((record.horas_extras_50 && record.horas_extras_50 > 0) || 
                          (record.horas_extras_100 && record.horas_extras_100 > 0)) ? (
                          <div className="flex items-center gap-2 text-sm">
                            {record.horas_extras_50 && record.horas_extras_50 > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Extras 50%:</span>
                                <span className="font-medium text-blue-600">
                                  +{record.horas_extras_50.toFixed(1)}h
                                </span>
                                <span className="text-xs text-gray-400">(Banco)</span>
                              </div>
                            )}
                            {record.horas_extras_100 && record.horas_extras_100 > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Extras 100%:</span>
                                <span className="font-medium text-orange-600">
                                  +{record.horas_extras_100.toFixed(1)}h
                                </span>
                                <span className="text-xs text-gray-400">(Pagamento)</span>
                              </div>
                            )}
                          </div>
                        ) : record.horas_extras != null && Number(record.horas_extras) > 0 ? (
                          // Fallback para registros antigos
                          <div className="text-sm">
                            <span className="text-gray-500">Extras: </span>
                            <span className="font-medium text-orange-600">
                              +{Number(record.horas_extras).toFixed(1)}h
                            </span>
                          </div>
                        ) : (record.horas_negativas && record.horas_negativas > 0) ? (
                          // Mostrar horas negativas
                          <div className="text-sm">
                            <span className="text-gray-500">Negativas: </span>
                            <span className="font-medium text-red-600">
                              -{record.horas_negativas.toFixed(2)}h
                            </span>
                          </div>
                        ) : null}
                      </div>
                      
                      {record.observacoes && (
                        <div className="text-sm text-gray-600 max-w-md">
                          <span className="text-gray-500">Observações: </span>
                          <span>{record.observacoes}</span>
                        </div>
                      )}
                    </div>

                    {/* Endereço e Localização */}
                    <div className="mt-3 flex items-start gap-2 text-sm border-t pt-3">
                      <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1 flex-1">
                        {/* Sempre mostrar endereço quando disponível */}
                        {location.hasAddress && (
                          <div className="text-gray-900 font-medium max-w-full break-words mb-1" title={location.endereco || ''}>
                            {location.endereco?.trim()}
                          </div>
                        )}
                        <div className="text-gray-500 flex items-center gap-2 flex-wrap">
                          {location.hasCoords && (
                            <span className="font-mono text-xs">
                              {location.latitude}, {location.longitude}
                            </span>
                          )}
                          {!location.hasAddress && location.hasCoords && (
                            <span className="text-gray-400 text-xs">(Sem endereço)</span>
                          )}
                          {mapHref && (
                            <a
                              href={mapHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                            >
                              <MapPin className="h-3 w-3" />
                              Ver no mapa
                            </a>
                          )}
                          {!location.hasCoords && !location.hasAddress && (
                            <span className="text-xs">Coordenadas não informadas</span>
                          )}
                          {record.localizacao_type && (
                            <span className="text-xs">• origem: {record.localizacao_type}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Galeria de fotos (se houver múltiplas) - Lazy Loading */}
                    {photos.length > 1 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2 mb-2">
                          <Camera className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            Fotos do dia ({photos.length})
                          </span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {photos.map((photo: any, idx: number) => (
                            <img
                              key={`photo-${record.id}-${photo.id || photo.event_id || idx}-${photo.photo_url}`}
                              src={photo.photo_url}
                              alt={`Foto ${idx + 1} de ${record.employee_nome}`}
                              className="h-20 w-auto rounded border object-cover cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0"
                              loading="lazy"
                              onClick={() => window.open(photo.photo_url, '_blank')}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                              onLoad={(e) => {
                                // Garantir que a imagem não seja recarregada
                                (e.target as HTMLImageElement).style.opacity = '1';
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Indicador de carregamento */}
              {isFetchingNextPage && (
                <div className="flex items-center justify-center py-4">
                  <Clock className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm text-gray-500">Carregando mais registros...</span>
                </div>
              )}
              
              {/* Botão "Carregar mais" */}
              {hasNextPage && !isFetchingNextPage && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      console.log('[TimeRecordsPage] 🖱️ Botão "Carregar mais" clicado');
                      fetchNextPage();
                    }}
                    className="w-full max-w-xs"
                  >
                    Carregar mais
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum registro encontrado</p>
              <p className="text-sm text-gray-500 mt-2">
                Ajuste os filtros ou registre os primeiros pontos
              </p>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Aba: Resumo por Funcionário */}
        <TabsContent value="resumo" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumo por Funcionário</CardTitle>
              <CardDescription>
                Visualize o resumo de horas trabalhadas, horas negativas, horas extras e horas noturnas por funcionário
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-6 w-6 animate-spin" />
                    <span>Carregando resumo...</span>
                  </div>
                </div>
              ) : employeeSummary.length > 0 ? (
                <div className="space-y-4">
                  {employeeSummary.map((summary) => {
                    const isExpanded = expandedEmployees.has(summary.employeeId);
                    return (
                      <Card key={summary.employeeId} className="overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">
                                {summary.employeeName}
                              </CardTitle>
                              {summary.employeeMatricula && (
                                <CardDescription>
                                  Matrícula: {summary.employeeMatricula}
                                </CardDescription>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleEmployeeExpanded(summary.employeeId)}
                              className="h-8 w-8 p-0"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Saldo do Banco de Horas */}
                          <EmployeeBankHoursBalance 
                            employeeId={summary.employeeId}
                            companyId={selectedCompany?.id}
                            startDate={dateRange.start}
                            endDate={dateRange.end}
                          />
                          
                          {/* Métricas de Horas */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Horas Trabalhadas</p>
                              <p className="text-2xl font-bold text-blue-600">
                                {summary.totalHorasTrabalhadas.toFixed(2)}h
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Horas Negativas</p>
                              <p className="text-2xl font-bold text-red-600">
                                {summary.totalHorasNegativas > 0 ? '-' : ''}{summary.totalHorasNegativas.toFixed(2)}h
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Extras 50%</p>
                              <p className="text-2xl font-bold text-orange-600">
                                {summary.totalHorasExtras50.toFixed(2)}h
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Extras 100%</p>
                              <p className="text-2xl font-bold text-purple-600">
                                {summary.totalHorasExtras100.toFixed(2)}h
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Horas Noturnas</p>
                              <p className="text-2xl font-bold text-indigo-600">
                                {summary.totalHorasNoturnas.toFixed(2)}h
                              </p>
                            </div>
                          </div>

                          {/* Tabela de detalhes quando expandido */}
                          {isExpanded && (
                            <div className="mt-6 border-t pt-4">
                              <h4 className="text-sm font-semibold mb-3">Registros Dia a Dia</h4>
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Data</TableHead>
                                      <TableHead>Horas Trabalhadas</TableHead>
                                      <TableHead>Horas Negativas</TableHead>
                                      <TableHead>Extras 50%</TableHead>
                                      <TableHead>Extras 100%</TableHead>
                                      <TableHead>Horas Noturnas</TableHead>
                                      <TableHead>Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {summary.records
                                      .sort((a, b) => 
                                        new Date(b.data_registro).getTime() - new Date(a.data_registro).getTime()
                                      )
                                      .map((record) => (
                                        <TableRow key={record.id}>
                                          <TableCell>
                                            {formatDateOnly(record.data_registro)}
                                          </TableCell>
                                          <TableCell>
                                            <span className="font-medium">
                                              {record.horas_trabalhadas?.toFixed(2) || '0.00'}h
                                            </span>
                                          </TableCell>
                                          <TableCell>
                                            {record.horas_negativas && record.horas_negativas > 0 ? (
                                              <span className="text-red-600 font-medium">
                                                -{record.horas_negativas.toFixed(2)}h
                                              </span>
                                            ) : (
                                              <span className="text-muted-foreground">0.00h</span>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {record.horas_extras_50 && record.horas_extras_50 > 0 ? (
                                              <span className="text-orange-600 font-medium">
                                                +{record.horas_extras_50.toFixed(2)}h
                                              </span>
                                            ) : (
                                              <span className="text-muted-foreground">0.00h</span>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {record.horas_extras_100 && record.horas_extras_100 > 0 ? (
                                              <span className="text-purple-600 font-medium">
                                                +{record.horas_extras_100.toFixed(2)}h
                                              </span>
                                            ) : (
                                              <span className="text-muted-foreground">0.00h</span>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            {record.horas_noturnas && record.horas_noturnas > 0 ? (
                                              <span className="text-indigo-600 font-medium">
                                                +{record.horas_noturnas.toFixed(2)}h
                                              </span>
                                            ) : (
                                              <span className="text-muted-foreground">0.00h</span>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            <Badge className={getStatusColor(record.status || '')}>
                                              {getStatusLabel(record.status || '')}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhum funcionário encontrado</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Ajuste os filtros ou registre os primeiros pontos
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Importação */}
      <TimeRecordsImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        companyId={selectedCompany?.id || ''}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={
          modalMode === 'create' ? 'Novo Registro de Ponto' :
          modalMode === 'edit' ? 'Editar Registro de Ponto' :
          'Detalhes do Registro'
        }
        description={
          modalMode === 'create' ? 'Preencha os dados do novo registro' :
          modalMode === 'edit' ? 'Atualize os dados do registro' :
          'Visualize os dados do registro'
        }
        onSubmit={handleModalSubmit}
        loading={false}
        size="lg"
        submitLabel={modalMode === 'view' ? undefined : 'Salvar'}
        cancelLabel="Fechar"
      >
        <div className="space-y-4">
          {modalMode === 'view' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Funcionário</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedRecord?.employee_nome || 'Nome não encontrado'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Data</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedRecord?.data_registro && 
                      formatDateOnly(selectedRecord.data_registro)
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Entrada</label>
                  <p className="text-sm text-muted-foreground font-mono">
                    {selectedRecord?.entrada || '--:--'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Saída</label>
                  <p className="text-sm text-muted-foreground font-mono">
                    {selectedRecord?.saida || '--:--'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedRecord?.status}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Horas Trabalhadas</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedRecord?.horas_trabalhadas ? 
                      `${selectedRecord.horas_trabalhadas.toFixed(1)}h` : '--'
                    }
                  </p>
                </div>
              </div>
              {selectedRecord?.observacoes && (
                <div>
                  <label className="text-sm font-medium">Observações</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedRecord.observacoes}
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Batidas do dia</label>
                <div className="rounded-md border p-3 space-y-2">
                  {(eventsData?.events || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma batida registrada.</p>
                  ) : (
                    (eventsData?.events || []).map((ev) => {
                      const mapHref = ev.latitude && ev.longitude
                        ? `https://www.google.com/maps?q=${ev.latitude},${ev.longitude}`
                        : ev.endereco
                          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.endereco || '')}`
                          : undefined;
                      const photo = ev.photos && ev.photos.length > 0 ? ev.photos[0] : undefined;
                      return (
                        <div key={ev.id} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {ev.event_type}
                            </span>
                            <span className="text-sm font-mono">
                              {new Date(ev.event_at).toLocaleTimeString('pt-BR', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                second: '2-digit',
                                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {mapHref ? (
                              <a href={mapHref} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                                Ver localização
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">Sem localização</span>
                            )}
                            {photo ? (
                              <a href={photo.photo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                                Ver foto
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">Sem foto</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Funcionário *</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um funcionário" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Data *</label>
                  <Input type="date" />
                </div>
                <div>
                  <label className="text-sm font-medium">Entrada</label>
                  <Input type="time" />
                </div>
                <div>
                  <label className="text-sm font-medium">Saída</label>
                  <Input type="time" />
                </div>
                <div>
                  <label className="text-sm font-medium">Almoço - Entrada</label>
                  <Input type="time" />
                </div>
                <div>
                  <label className="text-sm font-medium">Almoço - Saída</label>
                  <Input type="time" />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Observações</label>
                <textarea 
                  className="w-full p-2 border rounded-md"
                  placeholder="Observações sobre o registro"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>
      </FormModal>
    </div>
    </RequirePage>
  );
}

// Componente para exibir saldo mensal do banco de horas
interface EmployeeBankHoursBalanceProps {
  employeeId: string;
  companyId?: string;
  startDate: string;
  endDate: string;
}

function EmployeeBankHoursBalance({ 
  employeeId, 
  companyId, 
  startDate, 
  endDate 
}: EmployeeBankHoursBalanceProps) {
  // Sempre renderizar o componente, mesmo se os dados não estiverem disponíveis

  const monthlyBankHoursBalance = useQuery({
    queryKey: ['employee-bank-hours-balance', employeeId, companyId, startDate, endDate],
    queryFn: async () => {
      try {
        console.log('[EmployeeBankHoursBalance] 🔍 Calculando saldo usando função SQL:', { employeeId, companyId, startDate, endDate });
        
        // Extrair ano e mês do endDate (último dia do período)
        const endDateObj = new Date(endDate);
        const year = endDateObj.getFullYear();
        const month = endDateObj.getMonth() + 1;
        
        // Usar função SQL para calcular saldo mensal
        const { data, error } = await (supabase as any).rpc('get_monthly_bank_hours_balance', {
          p_employee_id: employeeId,
          p_company_id: companyId,
          p_year: year,
          p_month: month
        });

        if (error) {
          console.error('[EmployeeBankHoursBalance] ❌ Erro ao calcular saldo:', error);
          return 0;
        }

        const finalBalance = Number(data) || 0;
        console.log('[EmployeeBankHoursBalance] 💰 Saldo calculado:', finalBalance, { year, month });
        return finalBalance;
      } catch (error) {
        console.error('[EmployeeBankHoursBalance] ❌ Erro ao calcular saldo:', error);
        return 0;
      }
    },
    enabled: !!employeeId && !!companyId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: false
  });

  // Sempre renderizar o componente, mesmo se não houver dados
  const balance = monthlyBankHoursBalance.data ?? 0;
  const isLoading = monthlyBankHoursBalance.isLoading;
  const hasError = monthlyBankHoursBalance.isError;

  console.log('[EmployeeBankHoursBalance] 🎨 Renderizando componente:', { balance, isLoading, hasError, employeeId, companyId });

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg border-2 border-blue-200 dark:border-blue-800 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-foreground">Saldo Banco de Horas (Período)</p>
          {hasError && (
            <span className="text-xs text-red-500 bg-red-50 dark:bg-red-950 px-2 py-1 rounded">Erro ao carregar</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Carregando...</span>
            </span>
          ) : (
            <p className={`text-2xl font-bold ${
              balance > 0 ? 'text-green-600 dark:text-green-400' :
              balance < 0 ? 'text-red-600 dark:text-red-400' :
              'text-gray-500 dark:text-gray-400'
            }`}>
              {balance >= 0 ? '+' : ''}{balance.toFixed(2)}h
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
