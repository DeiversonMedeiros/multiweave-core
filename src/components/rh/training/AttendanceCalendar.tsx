import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  MinusCircle,
  Clock
} from 'lucide-react';
import { useAttendance, useApprovedEnrollments } from '@/hooks/rh/useAttendance';
import { useTraining } from '@/hooks/rh/useTraining';
import { useCompany } from '@/lib/company-context';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AttendanceCalendarProps {
  trainingId?: string;
  onDateSelect: (date: string) => void;
  onBulkEdit: (trainingId: string, date: string) => void;
}

interface TrainingAttendance {
  id: string;
  enrollment_id: string;
  data_presenca: string;
  presente: boolean;
  tipo_presenca: 'presente' | 'atrasado' | 'saida_antecipada' | 'ausente';
  hora_entrada?: string;
  hora_saida?: string;
  observacoes?: string;
  enrollment?: {
    id: string;
    employee_id: string;
    employee?: {
      id: string;
      nome: string;
      email: string;
    };
  };
}

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ 
  trainingId, 
  onDateSelect, 
  onBulkEdit 
}) => {
  const { selectedCompany } = useCompany();
  const { trainings } = useTraining(selectedCompany?.id || '');
  const { attendanceRecords } = useAttendance(selectedCompany?.id || '');
  const { enrollments } = useApprovedEnrollments(trainingId || '');
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedTraining, setSelectedTraining] = useState<string>(trainingId || '');

  // Buscar treinamento selecionado
  const training = trainings?.find(t => t.id === selectedTraining);

  // Filtrar presenças do treinamento selecionado
  const trainingAttendance = attendanceRecords?.filter(
    a => !selectedTraining || a.enrollment?.training_id === selectedTraining
  ) || [];

  // Calcular estatísticas por data
  const getDateStats = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayAttendance = trainingAttendance.filter(a => a.data_presenca === dateStr);
    
    const total = dayAttendance.length;
    const present = dayAttendance.filter(a => a.presente).length;
    const absent = total - present;
    
    return { total, present, absent };
  };

  // Obter cor do dia baseado na presença
  const getDateColor = (date: Date) => {
    const stats = getDateStats(date);
    
    if (stats.total === 0) return 'text-gray-400';
    if (stats.present === stats.total) return 'text-green-600';
    if (stats.present === 0) return 'text-red-600';
    return 'text-yellow-600';
  };

  // Obter ícone do dia baseado na presença
  const getDateIcon = (date: Date) => {
    const stats = getDateStats(date);
    
    if (stats.total === 0) return null;
    if (stats.present === stats.total) return <CheckCircle className="h-3 w-3" />;
    if (stats.present === 0) return <XCircle className="h-3 w-3" />;
    return <AlertCircle className="h-3 w-3" />;
  };

  // Verificar se o dia tem presenças registradas
  const hasAttendance = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return trainingAttendance.some(a => a.data_presenca === dateStr);
  };

  // Obter presenças do dia selecionado
  const selectedDateAttendance = trainingAttendance.filter(
    a => a.data_presenca === format(selectedDate, 'yyyy-MM-dd')
  );

  // Calcular percentual de presença do dia
  const getDayAttendancePercentage = (date: Date) => {
    const stats = getDateStats(date);
    if (stats.total === 0) return 0;
    return Math.round((stats.present / stats.total) * 100);
  };

  // Navegar para o mês anterior
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  // Navegar para o próximo mês
  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  // Obter dias do mês
  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  // Obter estatísticas do mês
  const getMonthStats = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    const monthAttendance = trainingAttendance.filter(a => {
      const attendanceDate = new Date(a.data_presenca);
      return attendanceDate >= monthStart && attendanceDate <= monthEnd;
    });

    const totalDays = monthDays.length;
    const daysWithAttendance = monthDays.filter(day => hasAttendance(day)).length;
    const totalRecords = monthAttendance.length;
    const presentRecords = monthAttendance.filter(a => a.presente).length;
    
    return {
      totalDays,
      daysWithAttendance,
      totalRecords,
      presentRecords,
      attendanceRate: totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0
    };
  };

  const monthStats = getMonthStats();

  return (
    <div className="space-y-6">
      {/* Header com Seleção de Treinamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Calendário de Presença</span>
            <div className="flex items-center gap-2">
              <Select value={selectedTraining} onValueChange={setSelectedTraining}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Selecione um treinamento" />
                </SelectTrigger>
                <SelectContent>
                  {trainings?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Estatísticas do Mês */}
      {selectedTraining && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Dias do Mês</p>
                  <p className="text-2xl font-bold">{monthStats.totalDays}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Dias com Presença</p>
                  <p className="text-2xl font-bold">{monthStats.daysWithAttendance}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Registros de Presença</p>
                  <p className="text-2xl font-bold">{monthStats.presentRecords}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Taxa de Presença</p>
                  <p className="text-2xl font-bold">{monthStats.attendanceRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calendário */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendário Visual */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {/* Cabeçalho dos dias da semana */}
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
              
              {/* Dias do mês */}
              {monthDays.map(day => {
                const isSelected = isSameDay(day, selectedDate);
                const hasData = hasAttendance(day);
                const percentage = getDayAttendancePercentage(day);
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`
                      p-2 text-center text-sm cursor-pointer rounded-lg border
                      ${isSelected ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-50'}
                      ${hasData ? 'border-green-200' : 'border-gray-200'}
                    `}
                    onClick={() => setSelectedDate(day)}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className={getDateColor(day)}>
                        {day.getDate()}
                      </span>
                      {hasData && (
                        <div className="flex items-center gap-1">
                          {getDateIcon(day)}
                          <span className="text-xs text-gray-500">
                            {percentage}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Detalhes do Dia Selecionado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateAttendance.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhuma presença registrada</p>
                <p className="text-sm">para este dia</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Estatísticas do dia */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <span className="ml-2 font-medium">{selectedDateAttendance.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Presentes:</span>
                      <span className="ml-2 font-medium text-green-600">
                        {selectedDateAttendance.filter(a => a.presente).length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lista de presenças */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedDateAttendance.map(attendance => (
                    <div key={attendance.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium text-sm">
                          {attendance.enrollment?.employee?.nome}
                        </div>
                        <div className="text-xs text-gray-500">
                          {attendance.hora_entrada && attendance.hora_saida ? 
                            `${attendance.hora_entrada} - ${attendance.hora_saida}` :
                            attendance.hora_entrada || '-'
                          }
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {attendance.presente ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <Badge 
                          variant={attendance.presente ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {attendance.tipo_presenca === 'presente' ? 'Presente' :
                           attendance.tipo_presenca === 'atrasado' ? 'Atrasado' :
                           attendance.tipo_presenca === 'saida_antecipada' ? 'Saída Antecipada' : 'Ausente'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botão de edição em lote */}
                {selectedTraining && (
                  <Button 
                    className="w-full" 
                    onClick={() => onBulkEdit(selectedTraining, format(selectedDate, 'yyyy-MM-dd'))}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Editar Presenças
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AttendanceCalendar;
