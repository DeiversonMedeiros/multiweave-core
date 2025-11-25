import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock, 
  User, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  MapPin,
  Clock3,
  Clock4,
  Coffee,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useTimeRecords } from '@/hooks/rh/useTimeRecords';
import { TimeRecord } from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/utils';

const AcompanhamentoPonto: React.FC = () => {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [periodoFilter, setPeriodoFilter] = useState<string>('mes_atual');
  // Estado para controlar quais cards têm endereços expandidos
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(new Set());

  // Calcular período baseado no filtro
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (periodoFilter) {
      case 'hoje':
        return { start: today.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
      case 'semana_atual': {
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        return { start: start.toISOString().split('T')[0], end: today.toISOString().split('T')[0] };
      }
      case 'mes_atual': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
      }
      case 'mes_anterior': {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 0);
        return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
      }
      default:
        return { start: undefined, end: undefined };
    }
  };

  const dateRange = getDateRange();
  const { data: pontoData = [], isLoading } = useTimeRecords({
    startDate: dateRange.start,
    endDate: dateRange.end,
    status: statusFilter !== 'todos' ? statusFilter : undefined,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'rejeitado': return 'bg-red-100 text-red-800';
      case 'corrigido': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pendente': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'rejeitado': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'corrigido': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <Clock3 className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aprovado': return 'Aprovado';
      case 'pendente': return 'Pendente';
      case 'rejeitado': return 'Rejeitado';
      case 'corrigido': return 'Corrigido';
      default: return status || 'Desconhecido';
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
    const lat = record.entrada_latitude || (record as any).latitude;
    const lng = record.entrada_longitude || (record as any).longitude;
    const addr = record.entrada_endereco || (record as any).endereco || record.endereco;
    
    return {
      latitude: lat,
      longitude: lng,
      endereco: addr,
      hasCoords: Boolean(lat && lng),
      hasAddress: Boolean(addr),
      allLocations: null,
    };
  };

  const filteredPontoData = pontoData.filter((ponto: TimeRecord) => {
    const matchesSearch = (ponto.employee_nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (ponto.employee_matricula || '').includes(searchTerm);
    const matchesStatus = statusFilter === 'todos' || ponto.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getEstatisticas = () => {
    const total = pontoData.length;
    const aprovados = pontoData.filter((p: TimeRecord) => p.status === 'aprovado').length;
    const pendentes = pontoData.filter((p: TimeRecord) => p.status === 'pendente').length;
    const rejeitados = pontoData.filter((p: TimeRecord) => p.status === 'rejeitado').length;
    const totalHoras = pontoData.reduce((acc, p: TimeRecord) => acc + (Number(p.horas_trabalhadas) || 0), 0);
    const totalExtras = pontoData.reduce((acc, p: TimeRecord) => acc + (Number(p.horas_extras) || 0), 0);
    const totalFaltas = pontoData.reduce((acc, p: TimeRecord) => acc + (Number(p.horas_faltas) || 0), 0);

    return {
      total,
      aprovados,
      pendentes,
      rejeitados,
      totalHoras,
      totalExtras,
      totalFaltas,
      taxaAprovacao: total > 0 ? (aprovados / total) * 100 : 0
    };
  };

  const stats = getEstatisticas();

  return (
    <RequireEntity entityName="time_tracking_management" action="read">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Acompanhamento de Ponto</h1>
          <p className="text-muted-foreground">
            Monitore registros de ponto e frequência da sua equipe
          </p>
        </div>
        <Button onClick={() => navigate('/portal-gestor/dashboard')}>
          Voltar ao Dashboard
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Registros no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Aprovação</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.taxaAprovacao.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.aprovados} de {stats.total} aprovados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHoras.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Total no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Extras</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalExtras.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Acumuladas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <Input
                placeholder="Funcionário ou matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  <SelectItem value="corrigido">Corrigido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="semana_atual">Semana Atual</SelectItem>
                  <SelectItem value="mes_atual">Mês Atual</SelectItem>
                  <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span>Alertas e Irregularidades</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.pendentes > 0 && (
              <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  {stats.pendentes} registro(s) de ponto pendente(s) de aprovação
                </span>
              </div>
            )}
            {stats.totalFaltas > 0 && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800">
                  {stats.totalFaltas.toFixed(1)} hora(s) de falta registrada(s)
                </span>
              </div>
            )}
            {stats.totalExtras > 0 && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800">
                  {stats.totalExtras.toFixed(1)} hora(s) extra(s) registrada(s)
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Registros */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Ponto</CardTitle>
          <CardDescription>
            {filteredPontoData.length} registro(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando registros...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPontoData.map((ponto: TimeRecord) => {
                const location = getLocationForRecord(ponto);
                const mapHref = location.hasCoords
                  ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
                  : location.hasAddress
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.endereco || '')}`
                    : undefined;

                return (
                  <div
                    key={ponto.id}
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
                            {formatDateOnly(ponto.data_registro)}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm font-semibold text-gray-700">
                              {ponto.employee_nome || 'Nome não encontrado'}
                            </p>
                            {ponto.employee_matricula && (
                              <span className="text-xs text-gray-500">
                                ({ponto.employee_matricula})
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            Criado em {format(new Date(ponto.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(ponto.status || 'pendente')}
                        <Badge className={getStatusColor(ponto.status || 'pendente')}>
                          {getStatusLabel(ponto.status || 'pendente')}
                        </Badge>
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
                          {formatTime(ponto.entrada)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Coffee className="h-4 w-4 text-orange-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Início Almoço</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(ponto.entrada_almoco)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Coffee className="h-4 w-4 text-orange-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Fim Almoço</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(ponto.saida_almoco)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock4 className="h-4 w-4 text-red-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Saída</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(ponto.saida)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock className="h-4 w-4 text-purple-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Entrada Extra</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(ponto.entrada_extra1)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Clock className="h-4 w-4 text-purple-600 mr-1" />
                          <span className="text-sm font-medium text-gray-700">Saída Extra</span>
                        </div>
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(ponto.saida_extra1)}
                        </div>
                      </div>
                    </div>

                    {/* Total de horas e observações */}
                    <div className="flex items-center justify-between pt-3 border-t mb-3">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm">
                          <span className="text-gray-500">Total de horas: </span>
                          <span className="font-medium text-gray-900">
                            {calculateTotalHours(ponto)}
                          </span>
                        </div>
                        {ponto.horas_extras != null && Number(ponto.horas_extras) > 0 && (
                          <div className="text-sm">
                            <span className="text-gray-500">Extras: </span>
                            <span className="font-medium text-orange-600">
                              +{Number(ponto.horas_extras).toFixed(1)}h
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {ponto.observacoes && (
                        <div className="text-sm text-gray-600 max-w-md">
                          <span className="text-gray-500">Observações: </span>
                          <span>{ponto.observacoes}</span>
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
                                if (newExpanded.has(ponto.id)) {
                                  newExpanded.delete(ponto.id);
                                } else {
                                  newExpanded.add(ponto.id);
                                }
                                setExpandedAddresses(newExpanded);
                              }}
                            >
                              {expandedAddresses.has(ponto.id) ? (
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
                          {expandedAddresses.has(ponto.id) && (
                            <div>
                              {(() => {
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
                                
                                // Fallback: usar localização única
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
                                        {(ponto as any).localizacao_type && (
                                          <span className="text-xs">• origem: {(ponto as any).localizacao_type}</span>
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

                    {/* Ações */}
                    <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t">
                      <Button variant="outline" size="sm">
                        <Clock className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                      
                      {(ponto.status === 'pendente' || !ponto.status) && (
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button variant="destructive" size="sm">
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredPontoData.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum registro encontrado</p>
              <p className="text-sm text-gray-500 mt-2">
                Ajuste os filtros ou aguarde novos registros
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </RequireEntity>
  );
};

export default AcompanhamentoPonto;
