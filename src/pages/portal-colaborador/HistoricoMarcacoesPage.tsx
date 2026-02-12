import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// Log de render para debug
let renderCount = 0;
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/lib/company-context';
import { useTimeRecordsPaginated } from '@/hooks/rh/useTimeRecords';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Clock, 
  Calendar,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock3,
  Clock4,
  Coffee,
  ArrowUpDown,
  MapPin,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { RequirePage } from '@/components/RequireAuth';
import { useEmployeeByUserId } from '@/hooks/rh/useEmployees';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getMonthDaysInfo, completeRecordsWithRestDays } from '@/services/rh/timeRecordReportService';
import { TimeRecord } from '@/integrations/supabase/rh-types';

type TimeRecordStatus = 'pendente' | 'aprovado' | 'rejeitado';

interface TimeRecord {
  id: string;
  employee_id: string;
  data_registro: string;
  entrada?: string;
  saida?: string;
  entrada_almoco?: string;
  saida_almoco?: string;
  entrada_extra1?: string;
  saida_extra1?: string;
  status: TimeRecordStatus;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  // Novos campos opcionais
  latitude?: number | string;
  longitude?: number | string;
  endereco?: string;
  localizacao_type?: 'gps' | 'manual' | 'wifi';
}

export default function HistoricoMarcacoesPage() {
  renderCount++;
  const renderId = useRef(renderCount);
  
  console.log(`[HistoricoMarcacoesPage] 🔄 RENDER #${renderId.current}`, {
    timestamp: new Date().toISOString(),
    renderCount,
  });
  
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  
  // Refs para rastrear mudanças
  const prevUserRef = useRef<any>(null);
  const prevSelectedCompanyRef = useRef<any>(null);
  const prevEmployeeRef = useRef<any>(null);
  const prevFiltersRef = useRef<any>(null);
  const prevDataRef = useRef<any>(null);
  
  const [filters, setFilters] = useState({
    startDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'all' as string
  });

  // Buscar dados do funcionário
  const { data: employee } = useEmployeeByUserId(user?.id || '');
  
  // Log mudanças em employee
  useEffect(() => {
    if (prevEmployeeRef.current !== employee) {
      console.log(`[HistoricoMarcacoesPage] 👷 Employee mudou:`, {
        renderId: renderId.current,
        previous: prevEmployeeRef.current?.id || null,
        current: employee?.id || null,
        changed: prevEmployeeRef.current?.id !== employee?.id,
      });
      prevEmployeeRef.current = employee;
    }
  }, [employee]);

  // Buscar histórico de marcações com paginação otimizada
  const {
    data,
    fetchNextPage: originalFetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useTimeRecordsPaginated({
    employeeId: employee?.id,
    startDate: filters.startDate,
    endDate: filters.endDate,
    status: filters.status !== 'all' ? filters.status : undefined,
    pageSize: 10, // Carregar 10 registros por vez
  });
  
  // Combinar todas as páginas em um único array
  // Memoizar para evitar recriações desnecessárias que causam loops
  const rawTimeRecords = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.data);
  }, [data?.pages]);
  
  // Log mudanças em data
  useEffect(() => {
    const dataChanged = prevDataRef.current !== data;
    const pagesChanged = prevDataRef.current?.pages?.length !== data?.pages?.length;
    const totalRecordsChanged = prevDataRef.current?.pages?.flatMap((p: any) => p.data).length !== data?.pages?.flatMap((p: any) => p.data).length;
    
    if (dataChanged || pagesChanged || totalRecordsChanged) {
      console.log(`[HistoricoMarcacoesPage] 📊 Data mudou:`, {
        renderId: renderId.current,
        dataReferenceChanged: dataChanged,
        pagesChanged,
        totalRecordsChanged,
        previousPages: prevDataRef.current?.pages?.length || 0,
        currentPages: data?.pages?.length || 0,
        previousRecords: prevDataRef.current?.pages?.flatMap((p: any) => p.data).length || 0,
        currentRecords: data?.pages?.flatMap((p: any) => p.data).length || 0,
      });
      prevDataRef.current = data;
    }
  }, [data]);
  
  // Log mudanças em filters
  useEffect(() => {
    const filtersChanged = JSON.stringify(prevFiltersRef.current) !== JSON.stringify(filters);
    if (filtersChanged) {
      console.log(`[HistoricoMarcacoesPage] 🔍 Filters mudou:`, {
        renderId: renderId.current,
        previous: prevFiltersRef.current,
        current: filters,
      });
      prevFiltersRef.current = filters;
    }
  }, [filters]);
  
  // Log quando hasNextPage muda (apenas quando realmente muda para evitar spam)
  const prevHasNextPageRef = useRef<boolean | undefined>(undefined);
  const prevDataPagesLengthRef = useRef<number>(0);
  useEffect(() => {
    const currentDataPagesLength = data?.pages?.length || 0;
    const dataPagesChanged = prevDataPagesLengthRef.current !== currentDataPagesLength;
    const hasNextPageChanged = prevHasNextPageRef.current !== hasNextPage;
    
    // Só logar se realmente mudou algo relevante
    if (hasNextPageChanged || dataPagesChanged) {
      console.log(`[HistoricoMarcacoesPage] 📊 Estado da query mudou:`, {
        renderId: renderId.current,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        dataPages: currentDataPagesLength,
        totalRecords: rawTimeRecords.length,
        timestamp: new Date().toISOString(),
      });
      prevHasNextPageRef.current = hasNextPage;
      prevDataPagesLengthRef.current = currentDataPagesLength;
    }
  }, [hasNextPage, isFetchingNextPage, isLoading, data?.pages?.length, rawTimeRecords.length]);
  
  // Estado para armazenar informações dos dias do mês
  const [daysInfo, setDaysInfo] = useState<Map<string, import('@/services/rh/timeRecordReportService').DayInfo>>(new Map());
  const [isLoadingDaysInfo, setIsLoadingDaysInfo] = useState(false);
  
  // Buscar informações dos dias do mês quando o período for um mês completo
  useEffect(() => {
    if (!employee?.id || !selectedCompany?.id || !filters.startDate || !filters.endDate) {
      return;
    }
    
    // Verificar se o período é um mês completo
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    const isFullMonth = start.getDate() === 1 && 
                        end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate() &&
                        start.getMonth() === end.getMonth() &&
                        start.getFullYear() === end.getFullYear();
    
    if (isFullMonth) {
      setIsLoadingDaysInfo(true);
      getMonthDaysInfo(
        employee.id,
        selectedCompany.id,
        start.getMonth() + 1,
        start.getFullYear()
      ).then(info => {
        setDaysInfo(info);
        setIsLoadingDaysInfo(false);
      }).catch(err => {
        console.error('[HistoricoMarcacoesPage] Erro ao buscar informações dos dias:', err);
        setIsLoadingDaysInfo(false);
      });
    } else {
      setDaysInfo(new Map());
    }
  }, [employee?.id, selectedCompany?.id, filters.startDate, filters.endDate]);
  
  // Estado para armazenar registros completos (com DSR)
  // Importante: não inicializar com rawTimeRecords diretamente para evitar “capturar”
  // referência instável e causar loops de render.
  // Usar rawTimeRecords diretamente no render (igual à página AcompanhamentoPonto que funciona)
  const baseTimeRecords = rawTimeRecords as TimeRecord[];
  
  // Processar registros com DSR de forma assíncrona quando necessário (sem causar loops)
  const [processedRecords, setProcessedRecords] = useState<TimeRecord[]>([]);
  const processingKeyRef = useRef<string>('');
  
  // Completar registros com dias de folga quando necessário (sem causar loops)
  useEffect(() => {
    // Criar chave única baseada nos dados para evitar processamento duplicado
    const recordsKey = rawTimeRecords.map(r => r.id).join('|');
    const fullKey = `${recordsKey}-${daysInfo.size}-${filters.startDate}-${filters.endDate}-${employee?.id}`;
    
    // Se a chave não mudou, não processar novamente
    if (processingKeyRef.current === fullKey) {
      return;
    }
    
    // Se não for mês completo ou não tiver daysInfo, limpar processedRecords
    if (daysInfo.size === 0 || !filters.startDate || !filters.endDate || !employee?.id || !selectedCompany?.id) {
      setProcessedRecords([]);
      processingKeyRef.current = fullKey;
      return;
    }
    
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    const isFullMonth = start.getDate() === 1 && 
                        end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate() &&
                        start.getMonth() === end.getMonth() &&
                        start.getFullYear() === end.getFullYear();
    
    if (isFullMonth) {
      processingKeyRef.current = fullKey;
      completeRecordsWithRestDays(
        rawTimeRecords as TimeRecord[],
        start.getMonth() + 1,
        start.getFullYear(),
        daysInfo,
        employee.id,
        selectedCompany.id
      ).then(completeRecords => {
        // Verificar se a chave ainda é a mesma antes de atualizar
        const currentKey = `${rawTimeRecords.map(r => r.id).join('|')}-${daysInfo.size}-${filters.startDate}-${filters.endDate}-${employee?.id}`;
        if (currentKey === fullKey) {
          setProcessedRecords(completeRecords);
        }
      }).catch(err => {
        console.error('[HistoricoMarcacoesPage] Erro ao completar registros:', err);
        setProcessedRecords([]);
      });
    } else {
      setProcessedRecords([]);
      processingKeyRef.current = fullKey;
    }
  }, [rawTimeRecords, daysInfo, filters.startDate, filters.endDate, employee?.id, selectedCompany?.id]);
  
  // Usar processedRecords se disponível e não vazio, senão usar baseTimeRecords
  const timeRecords = processedRecords.length > 0 ? processedRecords : baseTimeRecords;

  // Wrapper para fetchNextPage que só permite chamadas explícitas do botão
  const fetchNextPage = useCallback(() => {
    const stackTrace = new Error().stack;
    console.log('[HistoricoMarcacoesPage] 🖱️ Botão "Carregar mais" clicado');
    console.log('[HistoricoMarcacoesPage] 📍 Stack trace:', stackTrace);
    originalFetchNextPage();
  }, [originalFetchNextPage]);

  const getStatusIcon = (status: TimeRecordStatus) => {
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

  const getStatusLabel = (status: TimeRecordStatus) => {
    switch (status) {
      case 'aprovado':
        return 'Aprovado';
      case 'rejeitado':
        return 'Rejeitado';
      case 'pendente':
        return 'Pendente';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusColor = (status: TimeRecordStatus) => {
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

  // Função para formatar horário com data - sempre mostra a data quando disponível
  const formatTimeWithDate = (time?: string, date?: string, baseDate?: string) => {
    if (!time) return '--:--';
    const timeOnly = time.substring(0, 5);
    
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

  const formatDate = (dateString: string) => {
    // Parse a data manualmente para evitar problemas de timezone
    // dateString vem no formato 'YYYY-MM-DD'
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  };

  const calculateTotalHours = (record: TimeRecord) => {
    if (!record.entrada || !record.saida) return '--:--';
    
    // CORREÇÃO: Usar campos *_date quando disponíveis para calcular corretamente quando cruza meia-noite
    // Determinar datas a usar
    const entradaDate = record.entrada_date || record.base_date || record.data_registro;
    const saidaDate = record.saida_date || record.base_date || record.data_registro;
    
    // Se saída (hora) < entrada (hora) e as datas são iguais, assumir saída no dia seguinte
    const entradaTime = record.entrada.substring(0, 5); // HH:MM
    const saidaTime = record.saida.substring(0, 5); // HH:MM
    const saidaTimeNum = parseInt(saidaTime.split(':')[0]) * 60 + parseInt(saidaTime.split(':')[1]);
    const entradaTimeNum = parseInt(entradaTime.split(':')[0]) * 60 + parseInt(entradaTime.split(':')[1]);
    
    let saidaDateToUse = saidaDate;
    if (saidaTimeNum < entradaTimeNum && entradaDate === saidaDate) {
      // Saída cruzou meia-noite: usar dia seguinte
      const saidaDateObj = new Date(saidaDate);
      saidaDateObj.setDate(saidaDateObj.getDate() + 1);
      saidaDateToUse = saidaDateObj.toISOString().split('T')[0];
    }
    
    const entrada = new Date(`${entradaDate}T${record.entrada}`);
    const saida = new Date(`${saidaDateToUse}T${record.saida}`);
    
    // Subtrair tempo de almoço se existir
    let almocoTime = 0;
    if (record.entrada_almoco && record.saida_almoco) {
      const entradaAlmocoDate = record.entrada_almoco_date || entradaDate;
      const saidaAlmocoDate = record.saida_almoco_date || entradaDate;
      const entradaAlmoco = new Date(`${entradaAlmocoDate}T${record.entrada_almoco}`);
      const saidaAlmoco = new Date(`${saidaAlmocoDate}T${record.saida_almoco}`);
      almocoTime = saidaAlmoco.getTime() - entradaAlmoco.getTime();
    }
    
    const totalMs = saida.getTime() - entrada.getTime() - almocoTime;
    
    // Se ainda deu negativo, tentar com saída no dia seguinte
    if (totalMs < 0 && entradaDate === saidaDate) {
      const saidaNextDay = new Date(`${saidaDateToUse}T${record.saida}`);
      const totalMsFixed = saidaNextDay.getTime() - entrada.getTime() - almocoTime;
      if (totalMsFixed > 0) {
        const hours = Math.floor(totalMsFixed / (1000 * 60 * 60));
        const minutes = Math.floor((totalMsFixed % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }
    
    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    
    // Se deu negativo, retornar formato negativo
    if (totalMs < 0) {
      return `-${Math.abs(hours).toString().padStart(2, '0')}:${Math.abs(minutes).toString().padStart(2, '0')}`;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      startDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'all'
    });
  };

  // Estado para controlar quais cards têm endereços expandidos
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(new Set());

  // Função para obter localização do registro
  const getLocationForRecord = (record: TimeRecord) => {
    let allLocations = (record as any).all_locations;
    
    if (typeof allLocations === 'string') {
      try {
        allLocations = JSON.parse(allLocations);
      } catch (e) {
        allLocations = null;
      }
    }
    
    // Buscar localização da ENTRADA em all_locations
    if (allLocations && Array.isArray(allLocations) && allLocations.length > 0) {
      const entradaLocation = allLocations.find((loc: any) => loc.event_type === 'entrada');
      if (entradaLocation) {
        return {
          latitude: entradaLocation.latitude,
          longitude: entradaLocation.longitude,
          endereco: entradaLocation.endereco,
          hasCoords: Boolean(entradaLocation.latitude && entradaLocation.longitude),
          hasAddress: Boolean(entradaLocation.endereco),
          allLocations: allLocations,
        };
      }
      
      // Se não encontrar entrada, usar primeira localização disponível
      const firstLocation = allLocations[0];
      if (firstLocation && (firstLocation.latitude || firstLocation.longitude || firstLocation.endereco)) {
        return {
          latitude: firstLocation.latitude,
          longitude: firstLocation.longitude,
          endereco: firstLocation.endereco,
          hasCoords: Boolean(firstLocation.latitude && firstLocation.longitude),
          hasAddress: Boolean(firstLocation.endereco),
          allLocations: allLocations,
        };
      }
    }
    
    // Fallback para campos diretos
    const lat = (record as any).entrada_latitude || record.latitude;
    const lng = (record as any).entrada_longitude || record.longitude;
    const addr = (record as any).entrada_endereco || record.endereco;
    
    return {
      latitude: lat,
      longitude: lng,
      endereco: addr,
      hasCoords: Boolean(lat && lng),
      hasAddress: Boolean(addr),
      allLocations: null,
    };
  };

  if (isLoading) {
    return (
      <RequirePage pagePath="/portal-colaborador/historico-marcacoes*" action="read">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2">
              <Clock className="h-6 w-6 animate-spin" />
              <span>Carregando histórico de marcações...</span>
            </div>
          </div>
        </div>
      </RequirePage>
    );
  }

  if (error) {
    return (
      <RequirePage pagePath="/portal-colaborador/historico-marcacoes*" action="read">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">Erro ao carregar histórico de marcações</p>
              <p className="text-sm text-gray-500 mt-2">Tente novamente em alguns instantes</p>
            </div>
          </div>
        </div>
      </RequirePage>
    );
  }

  return (
    <RequirePage pagePath="/portal-colaborador/historico-marcacoes*" action="read">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Histórico de Marcações</h1>
          <p className="text-gray-600">
            Visualize todas as suas marcações de ponto
          </p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endDate">Data Final</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="w-full"
                >
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de marcações */}
        <Card>
          <CardHeader>
            <CardTitle>Suas Marcações</CardTitle>
            <CardDescription>
              {timeRecords && timeRecords.length > 0 
                ? `${timeRecords.length} marcação(ões) encontrada(s) no período selecionado`
                : 'Nenhuma marcação encontrada no período selecionado'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {timeRecords && timeRecords.length > 0 ? (
              <div className="space-y-4">
                {timeRecords.map((record) => {
                  const isVirtual = record.id.startsWith('virtual-');
                  const isRestDay = (record as any).is_dia_folga || (isVirtual && record.id.includes('-dsr'));
                  const isVacation = isVirtual && record.id.includes('-ferias');
                  const isMedicalCertificate = isVirtual && record.id.includes('-atestado');
                  const isCompensation = isVirtual && record.id.includes('-compensacao');
                  const hasNoMarks = !record.entrada && !record.saida && !record.entrada_almoco && !record.saida_almoco;
                  
                  // Determinar cor e label baseado no tipo
                  let virtualBgColor = 'bg-blue-50 border-blue-200';
                  let virtualBadgeColor = 'bg-blue-100 text-blue-800';
                  let virtualIconColor = 'bg-blue-200 text-blue-700';
                  let virtualLabel = 'DSR';
                  let virtualDescription = 'Dia de Descanso Semanal Remunerado';
                  
                  if (isVacation) {
                    virtualBgColor = 'bg-green-50 border-green-200';
                    virtualBadgeColor = 'bg-green-100 text-green-800';
                    virtualIconColor = 'bg-green-200 text-green-700';
                    virtualLabel = 'Férias';
                    virtualDescription = 'Período de Férias';
                  } else if (isMedicalCertificate) {
                    virtualBgColor = 'bg-yellow-50 border-yellow-200';
                    virtualBadgeColor = 'bg-yellow-100 text-yellow-800';
                    virtualIconColor = 'bg-yellow-200 text-yellow-700';
                    virtualLabel = 'Atestado';
                    virtualDescription = 'Atestado Médico';
                  } else if (isCompensation) {
                    virtualBgColor = 'bg-purple-50 border-purple-200';
                    virtualBadgeColor = 'bg-purple-100 text-purple-800';
                    virtualIconColor = 'bg-purple-200 text-purple-700';
                    virtualLabel = 'Compensação';
                    virtualDescription = record.observacoes || 'Compensação de Horas';
                  }
                  
                  return (
                  <div
                    key={record.id}
                    className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors ${isVirtual ? virtualBgColor : ''}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${isVirtual ? virtualIconColor : 'bg-blue-100 text-blue-600'}`}>
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {formatDate(record.data_registro)}
                            {isVirtual && <span className={`ml-2 font-semibold ${isVacation ? 'text-green-600' : isMedicalCertificate ? 'text-yellow-600' : isCompensation ? 'text-purple-600' : 'text-blue-600'}`}>
                              ({virtualLabel})
                            </span>}
                          </h3>
                          {!isVirtual && (
                            <p className="text-sm text-gray-500">
                              Criado em {format(parseISO(record.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          )}
                          {isVirtual && (
                            <p className={`text-sm font-medium ${isVacation ? 'text-green-600' : isMedicalCertificate ? 'text-yellow-600' : isCompensation ? 'text-purple-600' : 'text-blue-600'}`}>
                              {virtualDescription}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!isVirtual && getStatusIcon(record.status)}
                        {isVirtual ? (
                          <Badge className={virtualBadgeColor}>
                            {virtualLabel}
                          </Badge>
                        ) : (
                          <Badge className={getStatusColor(record.status)}>
                            {getStatusLabel(record.status)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Horários */}
                    {isVirtual && hasNoMarks ? (
                      <div className={`text-center py-4 rounded-lg ${isVacation ? 'bg-green-50' : isMedicalCertificate ? 'bg-yellow-50' : isCompensation ? 'bg-purple-50' : 'bg-blue-50'}`}>
                        <p className={`font-semibold ${isVacation ? 'text-green-700' : isMedicalCertificate ? 'text-yellow-700' : isCompensation ? 'text-purple-700' : 'text-blue-700'}`}>
                          {virtualDescription}
                        </p>
                        <p className={`text-sm mt-1 ${isVacation ? 'text-green-600' : isMedicalCertificate ? 'text-yellow-600' : isCompensation ? 'text-purple-600' : 'text-blue-600'}`}>
                          {isVacation ? 'Período de férias - sem marcações' : 
                           isMedicalCertificate ? 'Atestado médico - sem marcações' :
                           isCompensation ? 'Compensação de horas - sem marcações' :
                           'Dia de folga - sem marcações'}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
                        <div className="text-center">
                          <div className="flex items-center justify-center mb-1">
                            <Clock3 className="h-4 w-4 text-green-600 mr-1" />
                            <span className="text-sm font-medium text-gray-700">Entrada</span>
                          </div>
                          <div className="text-lg font-bold text-gray-900">
                            {isRestDay && !record.entrada ? 'DSR' : formatTimeWithDate(record.entrada, record.entrada_date, record.base_date || record.data_registro)}
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
                    )}
                    
                    {/* Total de horas e observações - apenas se não for virtual */}
                    {!isVirtual && (
                    <div className="flex items-center justify-between pt-3 border-t mb-3">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm">
                          <span className="text-gray-500">Total de horas: </span>
                          <span className="font-medium text-gray-900">
                            {calculateTotalHours(record)}
                          </span>
                        </div>
                        {/* Horas Extras ou Negativas */}
                        {(((record as any).horas_extras_50 && (record as any).horas_extras_50 > 0) || 
                          ((record as any).horas_extras_100 && (record as any).horas_extras_100 > 0)) ? (
                          <div className="flex items-center gap-2 text-sm">
                            {(record as any).horas_extras_50 && (record as any).horas_extras_50 > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Extras 50%:</span>
                                <span className="font-medium text-blue-600">
                                  +{(record as any).horas_extras_50.toFixed(1)}h
                                </span>
                                <span className="text-xs text-gray-400">(Banco)</span>
                              </div>
                            )}
                            {(record as any).horas_extras_100 && (record as any).horas_extras_100 > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Extras 100%:</span>
                                <span className="font-medium text-orange-600">
                                  +{(record as any).horas_extras_100.toFixed(1)}h
                                </span>
                                <span className="text-xs text-gray-400">(Pagamento)</span>
                              </div>
                            )}
                          </div>
                        ) : (record as any).horas_extras != null && Number((record as any).horas_extras) > 0 ? (
                          // Fallback para registros antigos
                          <div className="text-sm">
                            <span className="text-gray-500">Extras: </span>
                            <span className="font-medium text-orange-600">
                              +{Number((record as any).horas_extras).toFixed(1)}h
                            </span>
                          </div>
                        ) : (() => {
                          // CORREÇÃO: Não mostrar horas negativas para dias futuros
                          const recordDate = new Date(record.data_registro);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const isFutureDate = recordDate > today;
                          
                          // Se tem horas negativas e não é dia futuro, mostrar
                          if ((record as any).horas_negativas && (record as any).horas_negativas > 0 && !isFutureDate) {
                            return (
                              <div className="text-sm">
                                <span className="text-gray-500">Negativas: </span>
                                <span className="font-medium text-red-600">
                                  -{(record as any).horas_negativas.toFixed(2)}h
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      
                      {record.observacoes && (
                        <div className="text-sm text-gray-600 max-w-md">
                          <span className="text-gray-500">Observações: </span>
                          <span>{record.observacoes}</span>
                        </div>
                      )}
                    </div>
                    )}

                    {/* Endereços e Localizações - apenas se não for virtual */}
                    {!isVirtual && (
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
                              {(() => {
                                const location = getLocationForRecord(record);
                                const mapHref = location.hasCoords
                                  ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
                                  : location.hasAddress
                                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.endereco || '')}`
                                    : undefined;
                                
                                let allLocations = location.allLocations;
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
                                            {/* Sempre mostrar endereço quando disponível */}
                                            {locHasAddress && (
                                              <div className="text-gray-900 font-medium max-w-full break-words mb-1">
                                                {locAddr.trim()}
                                              </div>
                                            )}
                                            <div className="text-gray-500 flex items-center gap-2 flex-wrap mt-1">
                                              {locHasCoords && (
                                                <span className="font-mono text-xs">
                                                  {locLat}, {locLng}
                                                </span>
                                              )}
                                              {!locHasAddress && locHasCoords && (
                                                <span className="text-gray-400 text-xs">(Sem endereço)</span>
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
                                
                                // Fallback: usar localização única
                                if (location.hasAddress || location.hasCoords) {
                                  return (
                                    <div>
                                      {/* Sempre mostrar endereço quando disponível */}
                                      {location.hasAddress && (
                                        <div className="text-gray-900 font-medium max-w-full break-words mb-1" title={location.endereco || ''}>
                                          {location.endereco?.trim()}
                                        </div>
                                      )}
                                      <div className="text-gray-500 flex items-center gap-2 flex-wrap mt-1">
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
                      onClick={fetchNextPage}
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
                <p className="text-gray-600">Nenhuma marcação encontrada</p>
                <p className="text-sm text-gray-500 mt-2">
                  Ajuste os filtros ou registre suas primeiras marcações
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RequirePage>
  );
}
