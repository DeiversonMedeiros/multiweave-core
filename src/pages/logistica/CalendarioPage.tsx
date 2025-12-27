// =====================================================
// CALENDÁRIO DE VEÍCULOS
// Sistema ERP MultiWeave Core
// =====================================================

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, Truck, CheckCircle, XCircle, Plus } from 'lucide-react';
import { useVehicleAvailability } from '@/hooks/logistica/useLogisticaData';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useVehicles } from '@/hooks/frota/useFrotaData';
import { SolicitarLogisticaModal } from '@/components/logistica/SolicitarLogisticaModal';

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedVehicle, setSelectedVehicle] = useState<string | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined);
  
  const { data: vehicles } = useVehicles();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  const { data: availability, isLoading } = useVehicleAvailability(
    format(monthStart, 'yyyy-MM-dd'),
    format(monthEnd, 'yyyy-MM-dd'),
    selectedVehicle
  );

  // Calcular os dias do mês com espaços vazios no início e fim para alinhar corretamente
  const calendarDays = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const firstDayOfWeek = getDay(monthStart); // 0 = domingo, 1 = segunda, etc.
    const lastDayOfWeek = getDay(monthEnd); // 0 = domingo, 1 = segunda, etc.
    
    // Criar array com células vazias no início
    const emptyCellsStart = Array(firstDayOfWeek).fill(null);
    
    // Criar array com células vazias no final para completar a última semana
    // Se o último dia é sábado (6), não precisa de células vazias
    // Se o último dia é domingo (0), precisa de 6 células vazias
    // Se o último dia é segunda (1), precisa de 5 células vazias, etc.
    const emptyCellsEnd = Array(6 - lastDayOfWeek).fill(null);
    
    // Combinar células vazias com os dias do mês
    return [...emptyCellsStart, ...days, ...emptyCellsEnd];
  }, [monthStart, monthEnd]);

  const availabilityByVehicleAndDate = useMemo(() => {
    const map = new Map<string, { disponivel: boolean; trip_id?: string; trip_status?: string }>();
    (availability || []).forEach(item => {
      const key = `${item.vehicle_id}-${item.data}`;
      map.set(key, {
        disponivel: item.disponivel,
        trip_id: item.trip_id,
        trip_status: item.trip_status
      });
    });
    return map;
  }, [availability]);

  const uniqueVehicles = useMemo(() => {
    const vehicleMap = new Map<string, { id: string; placa: string; modelo?: string }>();
    (availability || []).forEach(item => {
      if (!vehicleMap.has(item.vehicle_id)) {
        vehicleMap.set(item.vehicle_id, {
          id: item.vehicle_id,
          placa: item.vehicle_placa,
          modelo: item.vehicle_modelo
        });
      }
    });
    return Array.from(vehicleMap.values());
  }, [availability]);

  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendário de Veículos</h1>
          <p className="text-muted-foreground mt-2">
            Visualize a disponibilidade de veículos por período
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={goToToday}>
            Hoje
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mês/Ano</label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 text-center font-medium">
                  {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
                </div>
                <Button variant="outline" size="icon" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Veículo</label>
              <Select value={selectedVehicle || 'all'} onValueChange={(v) => setSelectedVehicle(v === 'all' ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os veículos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os veículos</SelectItem>
                  {uniqueVehicles.map(vehicle => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.placa} {vehicle.modelo && `- ${vehicle.modelo}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendário */}
      <Card>
        <CardHeader>
          <CardTitle>Disponibilidade</CardTitle>
          <CardDescription>
            Verde = Disponível | Vermelho = Indisponível
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#049940]"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Cabeçalho dos dias da semana */}
              <div className="grid grid-cols-7 gap-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Dias do mês */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, index) => {
                  // Se for célula vazia (null), renderizar célula vazia
                  if (day === null) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="min-h-[80px] p-2 border rounded-lg bg-gray-50 opacity-30"
                      />
                    );
                  }

                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isTodayDate = isToday(day);
                  const dayStr = format(day, 'yyyy-MM-dd');
                  
                  // Agrupar disponibilidade por veículo para este dia
                  const dayAvailability = uniqueVehicles.map(vehicle => {
                    const key = `${vehicle.id}-${dayStr}`;
                    const avail = availabilityByVehicleAndDate.get(key);
                    return {
                      vehicle: vehicle.placa,
                      disponivel: avail?.disponivel ?? true,
                      trip_id: avail?.trip_id,
                      trip_status: avail?.trip_status
                    };
                  });

                  const allAvailable = dayAvailability.every(a => a.disponivel);
                  const someUnavailable = dayAvailability.some(a => !a.disponivel);

                  return (
                    <div
                      key={dayStr}
                      className={`
                        min-h-[80px] p-2 border rounded-lg flex flex-col
                        ${!isCurrentMonth ? 'opacity-30' : ''}
                        ${isTodayDate ? 'border-[#049940] border-2' : ''}
                        ${allAvailable ? 'bg-green-50' : someUnavailable ? 'bg-red-50' : 'bg-gray-50'}
                      `}
                    >
                      <div className={`
                        text-sm font-medium mb-1
                        ${isTodayDate ? 'text-[#049940]' : ''}
                      `}>
                        {format(day, 'd')}
                      </div>
                      {selectedVehicle ? (
                        <div className="text-xs mb-2">
                          {dayAvailability[0]?.disponivel ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-600" />
                          )}
                        </div>
                      ) : (
                        <div className="text-xs space-y-1 mb-2">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-2 w-2 text-green-600" />
                            <span>{dayAvailability.filter(a => a.disponivel).length}</span>
                          </div>
                          {someUnavailable && (
                            <div className="flex items-center gap-1">
                              <XCircle className="h-2 w-2 text-red-600" />
                              <span>{dayAvailability.filter(a => !a.disponivel).length}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {isCurrentMonth && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-auto h-6 text-xs"
                          onClick={() => {
                            setSelectedDate(day);
                            setSelectedVehicleId(selectedVehicle);
                            setIsModalOpen(true);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Solicitar
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legenda */}
      <Card>
        <CardHeader>
          <CardTitle>Legenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
              <span className="text-sm">Disponível</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
              <span className="text-sm">Indisponível</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-[#049940] rounded"></div>
              <span className="text-sm">Hoje</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Solicitação */}
      <SolicitarLogisticaModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDate(undefined);
          setSelectedVehicleId(undefined);
        }}
        selectedDate={selectedDate}
        selectedVehicleId={selectedVehicleId}
      />
    </div>
  );
}
