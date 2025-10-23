import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, AlertTriangle, XCircle, Edit, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimeRecord } from '@/hooks/rh/useMonthlyTimeRecords';

interface MonthlyTimeRecordsCalendarProps {
  year: number;
  month: number;
  records: Record<string, TimeRecord>;
  onDateClick: (date: string, hasRecord: boolean) => void;
  disabled?: boolean;
}

export function MonthlyTimeRecordsCalendar({
  year,
  month,
  records,
  onDateClick,
  disabled = false
}: MonthlyTimeRecordsCalendarProps) {
  // Nomes dos dias da semana
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  // Nomes dos meses
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Gerar dias do mês
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  // Criar array de dias
  const days = [];
  
  // Adicionar dias vazios do início
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null);
  }
  
  // Adicionar dias do mês
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateString = date.toISOString().split('T')[0];
    const record = records?.[dateString];
    
    days.push({
      day,
      date: dateString,
      record,
      isToday: date.toDateString() === new Date().toDateString(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6
    });
  }

  const getRecordStatus = (record?: TimeRecord) => {
    if (!record) return 'empty';
    
    if (record.status === 'aprovado') return 'approved';
    if (record.status === 'rejeitado') return 'rejected';
    if (record.status === 'corrigido') return 'corrected';
    if (record.entrada && record.saida) return 'complete';
    if (record.entrada && !record.saida) return 'partial';
    
    return 'incomplete';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-3 h-3 text-red-600" />;
      case 'corrected':
        return <Edit className="w-3 h-3 text-blue-600" />;
      case 'complete':
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'partial':
        return <AlertTriangle className="w-3 h-3 text-yellow-600" />;
      case 'incomplete':
        return <XCircle className="w-3 h-3 text-red-600" />;
      default:
        return <Plus className="w-3 h-3 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'complete':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'rejected':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'corrected':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'partial':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'incomplete':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprovado';
      case 'rejected':
        return 'Rejeitado';
      case 'corrected':
        return 'Corrigido';
      case 'complete':
        return 'Completo';
      case 'partial':
        return 'Parcial';
      case 'incomplete':
        return 'Incompleto';
      default:
        return 'Sem registro';
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    return time.substring(0, 5); // HH:MM
  };

  const calculateWorkHours = (record: TimeRecord) => {
    if (!record.entrada || !record.saida) return 0;
    
    const entrada = new Date(`2000-01-01T${record.entrada}`);
    const saida = new Date(`2000-01-01T${record.saida}`);
    
    let diffMs = saida.getTime() - entrada.getTime();
    
    // Subtrair horário de almoço se existir
    if (record.entrada_almoco && record.saida_almoco) {
      const entradaAlmoco = new Date(`2000-01-01T${record.entrada_almoco}`);
      const saidaAlmoco = new Date(`2000-01-01T${record.saida_almoco}`);
      const almocoMs = saidaAlmoco.getTime() - entradaAlmoco.getTime();
      diffMs -= almocoMs;
    }
    
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  };

  return (
    <div className="space-y-4">
      {/* Header do calendário */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">
          {monthNames[month - 1]} de {year}
        </h3>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-gray-500 bg-gray-50 rounded"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendário */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((dayData, index) => {
          if (!dayData) {
            return <div key={index} className="h-24" />;
          }

          const { day, date, record, isToday, isWeekend } = dayData;
          const status = getRecordStatus(record);
          const hasRecord = !!record;

          return (
            <Card
              key={date}
              className={cn(
                "h-24 p-2 cursor-pointer transition-all duration-200 hover:shadow-md",
                getStatusColor(status),
                disabled && "opacity-50 cursor-not-allowed",
                isToday && "ring-2 ring-blue-500",
                isWeekend && "bg-gray-100"
              )}
              onClick={() => !disabled && onDateClick(date, hasRecord)}
            >
              <CardContent className="p-0 h-full flex flex-col">
                {/* Número do dia */}
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-sm font-medium",
                    isToday && "text-blue-600 font-bold"
                  )}>
                    {day}
                  </span>
                  {getStatusIcon(status)}
                </div>

                {/* Informações do registro */}
                {record && (
                  <div className="flex-1 space-y-1">
                    {/* Horários */}
                    <div className="text-xs space-y-0.5">
                      {record.entrada && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-2 h-2" />
                          <span>{formatTime(record.entrada)}</span>
                        </div>
                      )}
                      {record.saida && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-2 h-2" />
                          <span>{formatTime(record.saida)}</span>
                        </div>
                      )}
                    </div>

                    {/* Horas trabalhadas */}
                    {record.entrada && record.saida && (
                      <div className="text-xs font-medium">
                        {calculateWorkHours(record)}h
                      </div>
                    )}

                    {/* Status */}
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs px-1 py-0",
                        status === 'approved' || status === 'complete' ? 'bg-green-100 text-green-800' :
                        status === 'rejected' ? 'bg-red-100 text-red-800' :
                        status === 'corrected' ? 'bg-blue-100 text-blue-800' :
                        status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      )}
                    >
                      {getStatusText(status)}
                    </Badge>
                  </div>
                )}

                {/* Indicador para dias sem registro */}
                {!record && (
                  <div className="flex-1 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-green-600" />
          <span>Completo/Aprovado</span>
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-yellow-600" />
          <span>Parcial</span>
        </div>
        <div className="flex items-center gap-1">
          <XCircle className="w-3 h-3 text-red-600" />
          <span>Incompleto/Rejeitado</span>
        </div>
        <div className="flex items-center gap-1">
          <Edit className="w-3 h-3 text-blue-600" />
          <span>Corrigido</span>
        </div>
        <div className="flex items-center gap-1">
          <Plus className="w-3 h-3 text-gray-400" />
          <span>Sem registro</span>
        </div>
      </div>
    </div>
  );
}
