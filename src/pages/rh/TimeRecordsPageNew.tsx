import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  MapPin,
  Calendar,
  Coffee,
  Clock3,
  Clock4,
  Camera,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  ChevronDown,
  ChevronUp,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FormModal } from '@/components/rh/FormModal';
import { TableActions } from '@/components/rh/TableActions';
import { TimeRecord } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { usePermissions } from '@/hooks/usePermissions';
import { useTimeRecordsPaginated, useDeleteTimeRecord, useApproveTimeRecord, useRejectTimeRecord } from '@/hooks/rh/useTimeRecords';
import { useCreateEntity, useUpdateEntity, useDeleteEntity } from '@/hooks/generic/useEntityData';
import { RequireEntity } from '@/components/RequireAuth';
import { TimeRecordForm } from '@/components/rh/TimeRecordForm';
import { useTimeRecordEvents } from '@/hooks/rh/useTimeRecordEvents';
import { useEmployees } from '@/hooks/rh/useEmployees';
import { formatDateOnly } from '@/lib/utils';

// =====================================================
// COMPONENTE PRINCIPAL - NOVA ABORDAGEM
// =====================================================

export default function TimeRecordsPageNew() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState<any>({
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 dias atrás
    endDate: new Date().toISOString().split('T')[0] // Hoje
  });
  const [searchTerm, setSearchTerm] = useState('');
  // Estado separado para o filtro de funcionário (como na página antiga)
  const [employeeFilter, setEmployeeFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TimeRecord | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('registros');
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [summaryMonth, setSummaryMonth] = useState<string>('');
  const [summaryYear, setSummaryYear] = useState<string>('');
  // Estado para controlar quais cards têm endereços expandidos
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(new Set());
  const { data: eventsData } = useTimeRecordEvents(selectedRecord?.id || undefined);
  
  // Carregar lista de funcionários para o filtro
  const { data: employeesData, isLoading: isLoadingEmployees } = useEmployees();
  const employees = Array.isArray(employeesData) ? employeesData : [];

  // Log para verificar se os funcionários estão sendo carregados
  useEffect(() => {
    console.group('[TimeRecordsPageNew] 👥 Funcionários');
    console.log('📊 employeesData:', employeesData);
    console.log('👥 employees (processado):', employees);
    console.log('📈 Total de funcionários:', employees.length);
    console.log('⏳ isLoadingEmployees:', isLoadingEmployees);
    if (employees.length > 0) {
      console.log('👤 Primeiros 3 funcionários:', employees.slice(0, 3).map(e => ({ id: e.id, nome: e.nome })));
    }
    console.groupEnd();
  }, [employeesData, employees, isLoadingEmployees]);

  // Monitorar mudanças no employeeFilter
  useEffect(() => {
    console.group('[TimeRecordsPageNew] 🔍 employeeFilter mudou');
    console.log('👤 employeeFilter:', employeeFilter);
    console.log('👤 Tipo:', typeof employeeFilter);
    console.log('👤 Valor para Select:', employeeFilter || 'all');
    console.groupEnd();
  }, [employeeFilter]);

  // Monitorar mudanças no estado filters
  useEffect(() => {
    console.group('[TimeRecordsPageNew] 📊 Estado filters mudou');
    console.log('🔍 Estado completo:', filters);
    console.log('👤 employeeId:', filters.employeeId);
    console.log('📅 startDate:', filters.startDate);
    console.log('📅 endDate:', filters.endDate);
    console.log('📊 status:', filters.status);
    console.log('🔍 search:', filters.search);
    console.groupEnd();
  }, [filters]);

  // Calcular datas do mês/ano selecionado para o resumo
  const summaryDateRange = useMemo(() => {
    if (summaryMonth && summaryYear) {
      const month = parseInt(summaryMonth);
      const year = parseInt(summaryYear);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Último dia do mês
      return {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      };
    }
    return null;
  }, [summaryMonth, summaryYear]);

  // Calcular datas para a query baseado na aba ativa
  const dateRangeForQuery = useMemo(() => {
    if (activeTab === 'resumo' && summaryMonth && summaryYear) {
      const month = parseInt(summaryMonth);
      const year = parseInt(summaryYear);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Último dia do mês
      return {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      };
    }
    return { start: filters.startDate, end: filters.endDate };
  }, [activeTab, summaryMonth, summaryYear, filters.startDate, filters.endDate]);

  // Preparar parâmetros para a query
  const queryParams = useMemo(() => {
    console.group('[TimeRecordsPageNew] 📋 Calculando queryParams');
    console.log('📊 filters atual:', filters);
    console.log('👤 filters.employeeId:', filters.employeeId);
    console.log('📅 dateRangeForQuery:', dateRangeForQuery);
    
    const params: {
      startDate: string;
      endDate: string;
      status?: string;
      pageSize: number;
      employeeId?: string;
    } = {
      startDate: dateRangeForQuery.start,
      endDate: dateRangeForQuery.end,
      status: filters.status !== 'all' ? filters.status : undefined,
      pageSize: activeTab === 'resumo' && summaryMonth && summaryYear ? 100 : 10,
    };
    
    // Adicionar employeeId apenas se estiver definido (exatamente como na página antiga)
    if (employeeFilter) {
      params.employeeId = employeeFilter;
      console.log('✅ employeeId adicionado aos params:', employeeFilter);
    } else {
      console.log('⚠️ employeeId não está definido, não será incluído nos params');
    }
    
    console.log('📦 Parâmetros finais:', params);
    console.groupEnd();
    
    return params;
  }, [dateRangeForQuery.start, dateRangeForQuery.end, filters.status, employeeFilter, activeTab, summaryMonth, summaryYear]);

  // Usar paginação infinita otimizada
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    error
  } = useTimeRecordsPaginated(queryParams);

  // Combinar todas as páginas em um único array
  const records = data?.pages.flatMap(page => page.data) || [];
  const createRecord = useCreateEntity<TimeRecord>('rh', 'time_records', selectedCompany?.id || '');
  const updateRecord = useUpdateEntity<TimeRecord>('rh', 'time_records', selectedCompany?.id || '');
  const deleteRecordMutation = useDeleteTimeRecord();
  const approveRecordMutation = useApproveTimeRecord();
  const rejectRecordMutation = useRejectTimeRecord();

  // Removido IntersectionObserver - agora só carrega ao clicar no botão "Carregar mais"

  // Refetch quando filtros mudarem ou quando mudar a aba/mês/ano (exatamente como na página antiga)
  useEffect(() => {
    console.log('[TimeRecordsPageNew] 🔄 Refetch disparado por mudança nos filtros:', {
      employeeFilter,
      status: filters.status,
      startDate: filters.startDate,
      endDate: filters.endDate
    });
    refetch();
  }, [filters.startDate, filters.endDate, filters.status, employeeFilter, activeTab, summaryMonth, summaryYear, dateRangeForQuery.start, dateRangeForQuery.end, refetch]);

  // Carregar todas as páginas quando estiver na aba de resumo e tiver mês/ano selecionado
  useEffect(() => {
    if (activeTab === 'resumo' && summaryMonth && summaryYear && hasNextPage && !isFetchingNextPage && !isLoading) {
      // Carregar todas as páginas disponíveis
      const loadAllPages = async () => {
        let attempts = 0;
        while (hasNextPage && !isFetchingNextPage && attempts < 50) { // Limite de segurança
          await fetchNextPage();
          attempts++;
          // Pequeno delay para evitar muitas requisições simultâneas
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      };
      loadAllPages();
    }
  }, [activeTab, summaryMonth, summaryYear, hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  // Filtrar registros por termo de busca
  const filteredRecords = useMemo(() => {
    if (!searchTerm) return records;
    const searchLower = searchTerm.toLowerCase();
    return records.filter(record => {
      const employeeName = (record.employee_nome || '').toLowerCase();
      const employeeMatricula = (record.employee_matricula || '').toLowerCase();
      const observacoes = (record.observacoes || '').toLowerCase();
      return employeeName.includes(searchLower) || 
             employeeMatricula.includes(searchLower) ||
             observacoes.includes(searchLower);
    });
  }, [records, searchTerm]);

  // Filtrar registros por mês e ano para o resumo
  const filteredRecordsForSummary = useMemo(() => {
    if (!summaryMonth || !summaryYear) {
      return [];
    }

    const month = parseInt(summaryMonth);
    const year = parseInt(summaryYear);

    return filteredRecords.filter(record => {
      const recordDate = new Date(record.data_registro);
      return recordDate.getMonth() + 1 === month && recordDate.getFullYear() === year;
    });
  }, [filteredRecords, summaryMonth, summaryYear]);

  // Agrupar registros por funcionário e calcular totais
  const employeeSummary = useMemo(() => {
    if (!summaryMonth || !summaryYear) {
      return [];
    }

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

    filteredRecordsForSummary.forEach(record => {
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
      // Converter para número e garantir que não seja NaN
      const horasTrabalhadas = Number(record.horas_trabalhadas) || 0;
      const horasNegativas = Number(record.horas_negativas) || 0;
      const horasExtras50 = Number(record.horas_extras_50) || 0;
      const horasExtras100 = Number(record.horas_extras_100) || 0;
      
      summary.totalHorasTrabalhadas += horasTrabalhadas;
      summary.totalHorasNegativas += horasNegativas;
      summary.totalHorasExtras50 += horasExtras50;
      summary.totalHorasExtras100 += horasExtras100;
      // Nota: horas_noturnas não existe no tipo, mas vamos deixar preparado caso seja adicionado
      // summary.totalHorasNoturnas += (record as any).horas_noturnas || 0;
    });

    const result = Array.from(grouped.values()).sort((a, b) => 
      a.employeeName.localeCompare(b.employeeName)
    );
    
    // Debug: Log dos resultados
    console.log('[TimeRecordsPageNew] Resumo calculado:', {
      totalFuncionarios: result.length,
      totalRegistros: filteredRecordsForSummary.length,
      mes: summaryMonth,
      ano: summaryYear,
      exemplos: result.slice(0, 3).map(s => ({
        nome: s.employeeName,
        totalHoras: s.totalHorasTrabalhadas,
        totalExtras50: s.totalHorasExtras50,
        totalExtras100: s.totalHorasExtras100,
        totalNegativas: s.totalHorasNegativas,
        qtdRegistros: s.records.length
      }))
    });
    
    return result;
  }, [filteredRecordsForSummary, summaryMonth, summaryYear]);

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

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleFilterChange = (key: string, value: string) => {
    console.group(`[TimeRecordsPageNew] 🔄 handleFilterChange - ${key}`);
    console.log('📥 Parâmetros recebidos:', { key, value });
    const newValue = value === 'all' ? undefined : value;
    console.log('🔄 Valor processado:', { original: value, processed: newValue });
    
    setFilters(prev => {
      console.log('📊 Estado anterior:', prev);
      const updated = {
        ...prev,
        [key]: newValue
      };
      console.log('✅ Estado atualizado:', updated);
      console.log('🔍 employeeId no estado:', updated.employeeId);
      console.groupEnd();
      return updated;
    });
  };

  // Handler específico para o filtro de funcionário (exatamente como na página antiga)
  const handleEmployeeFilter = (value: string) => {
    console.group('[TimeRecordsPageNew] 👤 handleEmployeeFilter');
    console.log('📥 Valor recebido:', value);
    console.log('📥 Tipo do valor:', typeof value);
    const newFilter = value === 'all' ? '' : value;
    console.log('🔄 Novo filtro:', newFilter);
    console.log('🔄 Tipo do novo filtro:', typeof newFilter);
    setEmployeeFilter(newFilter);
    console.log('✅ employeeFilter atualizado');
    console.groupEnd();
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
    if (window.confirm(`Tem certeza que deseja excluir este registro de ponto?`)) {
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

  const handleModalSubmit = async (data: Partial<TimeRecord>) => {
    try {
      if (modalMode === 'create') {
        await createRecord.mutateAsync({
          ...data,
          company_id: selectedCompany?.id
        });
      } else if (modalMode === 'edit' && selectedRecord) {
        await updateRecord.mutateAsync({
          id: selectedRecord.id,
          data: data
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar registro:', error);
    }
  };

  const handleExportCsv = () => {
    console.log('Exportando registros de ponto para CSV...');
  };

  const handleClockIn = () => {
    // TODO: Implementar registro de entrada
    console.log('Registrando entrada...');
  };

  const handleClockOut = () => {
    // TODO: Implementar registro de saída
    console.log('Registrando saída...');
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
    return time;
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
      // Buscar primeiro evento do tipo 'entrada'
      const entradaLocation = record.all_locations.find((loc: any) => loc.event_type === 'entrada');
      
      if (entradaLocation) {
        return {
          latitude: entradaLocation.latitude,
          longitude: entradaLocation.longitude,
          endereco: entradaLocation.endereco,
          hasCoords: Boolean(entradaLocation.latitude && entradaLocation.longitude),
          hasAddress: Boolean(entradaLocation.endereco),
        };
      }
      
      // Se não encontrar entrada, usar primeira localização disponível
      const firstLocation = record.all_locations[0];
      if (firstLocation && (firstLocation.latitude || firstLocation.longitude || firstLocation.endereco)) {
        return {
          latitude: firstLocation.latitude,
          longitude: firstLocation.longitude,
          endereco: firstLocation.endereco,
          hasCoords: Boolean(firstLocation.latitude && firstLocation.longitude),
          hasAddress: Boolean(firstLocation.endereco),
        };
      }
    }
    
    // Fallback para campos diretos
    const lat = record.entrada_latitude || (record as any).latitude;
    const lng = record.entrada_longitude || (record as any).longitude;
    const addr = record.entrada_endereco || (record as any).endereco || record.endereco;
    
    return {
      latitude: lat,
      longitude: lng,
      endereco: addr,
      hasCoords: Boolean(lat && lng),
      hasAddress: Boolean(addr),
    };
  };

  const resetFilters = () => {
    setFilters({
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });
    setEmployeeFilter('');
    setSearchTerm('');
  };

  // Colunas e actions removidas - agora usamos visualização em cards

  if (error) {
    return (
      <RequireEntity entityName="time_records" action="read">
        <div className="p-6">
          <div className="text-red-500">Erro ao carregar registros de ponto: {error.message}</div>
        </div>
      </RequireEntity>
    );
  }

  return (
    <RequireEntity entityName="time_records" action="read">
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Controle de Ponto</h1>
          <p className="text-muted-foreground">
            Gerencie os registros de ponto dos funcionários
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleClockIn} className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Entrada
          </Button>
          <Button onClick={handleClockOut} variant="outline" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Saída
          </Button>
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Registro
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
              <label className="text-sm font-medium">Funcionário</label>
              <Select
                value={employeeFilter || 'all'}
                onValueChange={(value) => {
                  console.log('🎯 [Select] onValueChange disparado com valor:', value);
                  handleEmployeeFilter(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os funcionários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os funcionários</SelectItem>
                  {employees.length > 0 ? (
                    employees.map((employee) => (
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
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => handleFilterChange('status', value)}
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
              <label className="text-sm font-medium">Data Inicial</label>
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Final</label>
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={resetFilters}
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCsv}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
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
                    ? `${filteredRecords.length} registro(s) encontrado(s)`
                    : 'Nenhum registro encontrado'
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
                
                // Processar fotos - buscar de múltiplas fontes
                // Prioridade: all_photos (vindas de time_record_event_photos via RPC) > first_event_photo_url > foto_url
                let allPhotos = (record as any).all_photos;
                
                if (typeof allPhotos === 'string') {
                  try {
                    allPhotos = JSON.parse(allPhotos);
                  } catch (e) {
                    allPhotos = null;
                  }
                }
                
                let photos: Array<any> = [];
                
                // Prioridade 1: Usar all_photos se disponível (vem de time_record_event_photos)
                if (allPhotos && Array.isArray(allPhotos) && allPhotos.length > 0) {
                  photos = allPhotos;
                } else {
                  // Prioridade 2: Fallback para first_event_photo_url (primeira foto do primeiro evento)
                  const fallbackPhotoUrl = record.first_event_photo_url || (record as any).foto_url || record.foto_url;
                  if (fallbackPhotoUrl) {
                    photos = [{
                      photo_url: fallbackPhotoUrl,
                      signed_thumb_url: (record as any).first_event_thumb_url || (record as any).foto_thumb_url,
                      signed_full_url: (record as any).first_event_full_url || (record as any).foto_full_url,
                    }];
                  }
                }
                
                const firstPhoto = photos.length > 0 ? photos[0] : null;
                const hasMultiplePhotos = photos.length > 1;

                // Helper para obter URL da foto
                const getPhotoUrl = (photo: any) => {
                  if (!photo || !photo.photo_url) return '';
                  
                  // Priorizar signed URLs se disponível
                  if (photo.signed_thumb_url) return photo.signed_thumb_url;
                  if (photo.signed_full_url) return photo.signed_full_url;
                  
                  // Se já é uma URL completa HTTP/HTTPS, retornar como está
                  if (photo.photo_url.includes('http://') || photo.photo_url.includes('https://')) {
                    return photo.photo_url;
                  }
                  
                  // Construir URL do Supabase Storage (bucket pode ser público ou privado)
                  const supabaseUrl = (import.meta as any)?.env?.VITE_SUPABASE_URL || '';
                  if (!supabaseUrl) return photo.photo_url;
                  
                  // Remover barras iniciais e query params para construir o caminho
                  const cleanPath = photo.photo_url.replace(/^\//, '').split('?')[0];
                  
                  // Se já contém /storage/v1/, retornar como está
                  if (photo.photo_url.includes('/storage/v1/')) {
                    return photo.photo_url;
                  }
                  
                  // Construir URL pública do bucket time-record-photos
                  return `${supabaseUrl}/storage/v1/object/public/time-record-photos/${cleanPath}`;
                };

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
                          {canEditEntity && (
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
                          {canDeleteEntity && (
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

                    {/* Horários */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock3 className="h-4 w-4 text-green-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Entrada</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(record.entrada)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Coffee className="h-4 w-4 text-orange-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Início Almoço</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(record.entrada_almoco)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Coffee className="h-4 w-4 text-orange-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Fim Almoço</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(record.saida_almoco)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock4 className="h-4 w-4 text-red-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Saída</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(record.saida)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock className="h-4 w-4 text-purple-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Entrada Extra</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(record.entrada_extra1)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock className="h-4 w-4 text-purple-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Saída Extra</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(record.saida_extra1)}
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

                    {/* Endereços e Localizações */}
                    <div className="mt-3 border-t pt-3">
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div className="space-y-2 flex-1">
                          {/* Botão para expandir/recolher */}
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Localização</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => {
                                const newExpanded = new Set(expandedAddresses);
                                if (newExpanded.has(record.id)) {
                                  newExpanded.delete(record.id);
                                } else {
                                  newExpanded.add(record.id);
                                }
                                setExpandedAddresses(newExpanded);
                              }}
                            >
                              {expandedAddresses.has(record.id) ? (
                                <>
                                  <ChevronUp className="h-4 w-4 mr-1" />
                                  <span className="text-xs">Recolher</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4 mr-1" />
                                  <span className="text-xs">Expandir</span>
                                </>
                              )}
                            </Button>
                          </div>
                          
                          {/* Conteúdo das localizações (mostrar apenas se expandido) */}
                          {expandedAddresses.has(record.id) && (
                            <div>
                          {/* Buscar todas as localizações do registro */}
                          {(() => {
                            let allLocations = (record as any).all_locations;
                            
                            if (typeof allLocations === 'string') {
                              try {
                                allLocations = JSON.parse(allLocations);
                              } catch (e) {
                                allLocations = null;
                              }
                            }
                            
                            // Se tiver all_locations, mostrar todas
                            if (allLocations && Array.isArray(allLocations) && allLocations.length > 0) {
                              return (
                                <div className="space-y-2">
                                  {allLocations.map((loc: any, idx: number) => {
                                    const locLat = loc.latitude;
                                    const locLng = loc.longitude;
                                    const locAddr = loc.endereco || '';
                                    const locHasCoords = Boolean(locLat && locLng);
                                    const locHasAddress = Boolean(locAddr);
                                    const locMapHref = locHasCoords
                                      ? `https://www.google.com/maps?q=${locLat},${locLng}`
                                      : locHasAddress
                                        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locAddr)}`
                                        : undefined;
                                    
                                    const getEventTypeLabel = (eventType?: string) => {
                                      const labels: Record<string, string> = {
                                        'entrada': 'Entrada',
                                        'saida': 'Saída',
                                        'entrada_almoco': 'Almoço E',
                                        'saida_almoco': 'Almoço S',
                                        'extra_inicio': 'Extra E',
                                        'extra_fim': 'Extra S',
                                        'manual': 'Manual'
                                      };
                                      return labels[eventType || ''] || eventType || '';
                                    };
                                    
                                    const eventLabel = loc.event_type ? getEventTypeLabel(loc.event_type) : '';
                                    
                                    return (
                                      <div key={loc.id || idx} className="border-l-2 border-blue-200 pl-2">
                                        {eventLabel && (
                                          <div className="text-xs font-medium text-blue-600 mb-1">{eventLabel}</div>
                                        )}
                                        <div className="text-gray-900 font-medium max-w-full break-words">
                                          {locAddr.trim() || (locHasCoords ? `${locLat}, ${locLng}` : 'Sem endereço')}
                                        </div>
                                        <div className="text-gray-500 flex items-center gap-2 flex-wrap mt-1">
                                          {locHasCoords && (
                                            <span className="font-mono text-xs">
                                              ({locLat}, {locLng})
                                            </span>
                                          )}
                                          {locMapHref && (
                                            <a
                                              href={locMapHref}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                                            >
                                              <MapPin className="h-3 w-3" />
                                              Ver no mapa
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }
                            
                            // Fallback: usar localização única da função getLocationForRecord
                            if (location.hasAddress || location.hasCoords) {
                              return (
                                <div>
                                  <div className="text-gray-900 font-medium max-w-full break-words" title={location.endereco || ''}>
                                    {location.endereco?.trim() || (location.hasCoords ? `${location.latitude}, ${location.longitude}` : 'Endereço não informado')}
                                  </div>
                                  <div className="text-gray-500 flex items-center gap-2 flex-wrap mt-1">
                                    {location.hasCoords && (
                                      <span className="font-mono text-xs">
                                        ({location.latitude}, {location.longitude})
                                      </span>
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
                                    {record.localizacao_type && (
                                      <span className="text-xs">• origem: {record.localizacao_type}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                            
                            // Sem localização
                            return (
                              <div className="text-gray-500 text-xs">Coordenadas e endereço não informados</div>
                            );
                          })()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Galeria de fotos (sempre que houver fotos) */}
                    {photos.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center gap-2 mb-2">
                          <Camera className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            Fotos do dia ({photos.length})
                          </span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {photos.map((photo: any, idx: number) => {
                            const photoUrl = getPhotoUrl(photo);
                            if (!photoUrl) return null;
                            return (
                              <img
                                key={photo.id || photo.event_id || idx}
                                src={photoUrl}
                                alt={`Foto ${idx + 1} de ${record.employee_nome}`}
                                className="h-20 w-auto rounded border object-cover cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0"
                                onClick={() => {
                                  const fullUrl = photo.signed_full_url || photo.photo_url || photoUrl;
                                  setSelectedPhotoUrl(fullUrl);
                                  setPhotoModalOpen(true);
                                }}
                                onError={(e) => {
                                  console.error('[TimeRecordsPageNew] Erro ao carregar foto na galeria:', {
                                    photoUrl,
                                    photo
                                  });
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            );
                          })}
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
                      console.log('[TimeRecordsPageNew] 🖱️ Botão "Carregar mais" clicado');
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
          {/* Filtros de Mês e Ano */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Filtros</span>
              </CardTitle>
              <CardDescription>
                Selecione o mês e o ano para visualizar o resumo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mês</label>
                  <Select
                    value={summaryMonth}
                    onValueChange={setSummaryMonth}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Janeiro</SelectItem>
                      <SelectItem value="2">Fevereiro</SelectItem>
                      <SelectItem value="3">Março</SelectItem>
                      <SelectItem value="4">Abril</SelectItem>
                      <SelectItem value="5">Maio</SelectItem>
                      <SelectItem value="6">Junho</SelectItem>
                      <SelectItem value="7">Julho</SelectItem>
                      <SelectItem value="8">Agosto</SelectItem>
                      <SelectItem value="9">Setembro</SelectItem>
                      <SelectItem value="10">Outubro</SelectItem>
                      <SelectItem value="11">Novembro</SelectItem>
                      <SelectItem value="12">Dezembro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ano</label>
                  <Select
                    value={summaryYear}
                    onValueChange={setSummaryYear}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo por Funcionário</CardTitle>
              <CardDescription>
                {summaryMonth && summaryYear 
                  ? `Resumo de ${new Date(parseInt(summaryYear), parseInt(summaryMonth) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`
                  : 'Visualize o resumo de horas trabalhadas, horas negativas, horas extras e horas noturnas por funcionário'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!summaryMonth || !summaryYear ? (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium mb-2">Selecione o mês e o ano</p>
                  <p className="text-sm text-gray-500">
                    Por favor, selecione o mês e o ano nos filtros acima para visualizar o resumo
                  </p>
                </div>
              ) : isLoading ? (
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
                        <CardContent>
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
                                            <span className="text-indigo-600 font-medium">
                                              {/* Nota: horas_noturnas não existe no tipo ainda */}
                                              0.00h
                                            </span>
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
                  <p className="text-gray-600">Nenhum registro encontrado</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Não há registros de ponto para {summaryMonth && summaryYear 
                      ? new Date(parseInt(summaryYear), parseInt(summaryMonth) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                      : 'o período selecionado'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          modalMode === 'create' ? 'Novo Registro de Ponto' :
          modalMode === 'edit' ? 'Editar Registro de Ponto' :
          'Visualizar Registro de Ponto'
        }
        loading={createRecord.isPending || updateRecord.isPending}
        size="lg"
        submitLabel={modalMode === 'create' ? 'Criar Registro' : 'Salvar Alterações'}
      >
        {modalMode === 'view' ? (
          <div className="space-y-4">
            <TimeRecordForm
              timeRecord={selectedRecord}
              onSubmit={handleModalSubmit}
              mode={modalMode}
            />
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
                            {new Date(ev.event_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
          <TimeRecordForm
            timeRecord={selectedRecord}
            onSubmit={handleModalSubmit}
            mode={modalMode}
          />
        )}
      </FormModal>

      {/* Modal de visualização de foto */}
      <Dialog open={photoModalOpen} onOpenChange={setPhotoModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogTitle className="sr-only">Foto do Registro de Ponto</DialogTitle>
          <DialogDescription className="sr-only">Visualização ampliada da foto capturada durante o registro de ponto</DialogDescription>
          {selectedPhotoUrl && (
            <div className="relative w-full h-full flex items-center justify-center bg-black/90 rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPhotoUrl}
                alt="Foto do registro de ponto"
                className="max-w-full max-h-[90vh] object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  console.error('[TimeRecordsPageNew] Erro ao carregar foto no modal', { selectedPhotoUrl });
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </RequireEntity>
  );
}
