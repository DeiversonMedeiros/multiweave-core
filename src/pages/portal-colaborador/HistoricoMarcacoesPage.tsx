import { useState, useEffect, useRef } from 'react';
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
import { RequireEntity } from '@/components/RequireAuth';
import { useEmployeeByUserId } from '@/hooks/rh/useEmployees';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const [filters, setFilters] = useState({
    startDate: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    status: 'all' as string
  });

  // Buscar dados do funcionário
  const { data: employee } = useEmployeeByUserId(user?.id || '');

  // Buscar histórico de marcações com paginação otimizada
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useTimeRecordsPaginated({
    employeeId: employee?.id,
    startDate: filters.startDate,
    endDate: filters.endDate,
    status: filters.status !== 'all' ? filters.status : undefined,
    pageSize: 30, // Carregar 30 registros por vez
  });

  // Combinar todas as páginas em um único array
  const timeRecords = data?.pages.flatMap(page => page.data) || [];

  // Observer para scroll infinito
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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

  const formatDate = (dateString: string) => {
    // Parse a data manualmente para evitar problemas de timezone
    // dateString vem no formato 'YYYY-MM-DD'
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
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
      <RequireEntity entityName="time_records" action="read">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2">
              <Clock className="h-6 w-6 animate-spin" />
              <span>Carregando histórico de marcações...</span>
            </div>
          </div>
        </div>
      </RequireEntity>
    );
  }

  if (error) {
    return (
      <RequireEntity entityName="time_records" action="read">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">Erro ao carregar histórico de marcações</p>
              <p className="text-sm text-gray-500 mt-2">Tente novamente em alguns instantes</p>
            </div>
          </div>
        </div>
      </RequireEntity>
    );
  }

  return (
    <RequireEntity entityName="time_records" action="read">
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
                {timeRecords.map((record) => (
                  <div
                    key={record.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {formatDate(record.data_registro)}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Criado em {format(parseISO(record.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(record.status)}
                        <Badge className={getStatusColor(record.status)}>
                          {getStatusLabel(record.status)}
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
                        {/* Horas Extras - Mostrar separadamente se disponível */}
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
                  </div>
                ))}
                
                {/* Observer para scroll infinito */}
                <div ref={observerTarget} className="h-4" />
                
                {/* Indicador de carregamento */}
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center py-4">
                    <Clock className="h-5 w-5 animate-spin mr-2" />
                    <span className="text-sm text-gray-500">Carregando mais registros...</span>
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
    </RequireEntity>
  );
}
