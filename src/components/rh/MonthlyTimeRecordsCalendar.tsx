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
  pendingCorrectionsByDate?: Map<string, boolean>;
}

export function MonthlyTimeRecordsCalendar({
  year,
  month,
  records,
  onDateClick,
  disabled = false,
  pendingCorrectionsByDate = new Map()
}: MonthlyTimeRecordsCalendarProps) {
  console.log('📅 [DEBUG] MonthlyTimeRecordsCalendar - Props:', { year, month, disabled });
  console.log('📅 [DEBUG] MonthlyTimeRecordsCalendar - records:', records);
  console.log('📅 [DEBUG] MonthlyTimeRecordsCalendar - records keys:', Object.keys(records || {}));
  
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

  console.log('📅 [DEBUG] MonthlyTimeRecordsCalendar - Date info:', {
    firstDay: firstDay.toISOString().split('T')[0],
    lastDay: lastDay.toISOString().split('T')[0],
    daysInMonth,
    startDayOfWeek
  });

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
    
    // Log apenas se tiver registro
    if (record) {
      console.log(`📅 [DEBUG] Day ${day} (${dateString}) has record:`, record);
    }
    
    days.push({
      day,
      date: dateString,
      record,
      isToday: date.toDateString() === new Date().toDateString(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6
    });
  }

  console.log('📅 [DEBUG] MonthlyTimeRecordsCalendar - Total days created:', days.length);
  console.log('📅 [DEBUG] MonthlyTimeRecordsCalendar - Days with records:', days.filter(d => d && d.record).length);

  // Função auxiliar para verificar se tem as 4 marcações obrigatórias
  const hasAllRequiredMarks = (record: TimeRecord): boolean => {
    // As 4 marcações obrigatórias são: entrada, entrada_almoco, saida_almoco, saida
    const hasEntrada = !!record.entrada;
    const hasEntradaAlmoco = !!record.entrada_almoco;
    const hasSaidaAlmoco = !!record.saida_almoco;
    const hasSaida = !!record.saida;
    
    return hasEntrada && hasEntradaAlmoco && hasSaidaAlmoco && hasSaida;
  };

  // Função auxiliar para verificar marcações ímpares (hora extra)
  const hasOddMarks = (record: TimeRecord): boolean => {
    // Marcações ímpares: entrada_extra1 sem saida_extra1 ou vice-versa
    const hasEntradaExtra = !!record.entrada_extra1;
    const hasSaidaExtra = !!record.saida_extra1;
    
    // Se tem entrada_extra mas não tem saida_extra, ou vice-versa, é ímpar
    return (hasEntradaExtra && !hasSaidaExtra) || (!hasEntradaExtra && hasSaidaExtra);
  };

  const getRecordStatus = (record?: TimeRecord, date?: string) => {
    // PRIORIDADE 1: Se há correção pendente para esta data, SEMPRE mostrar como pendente
    // (independente de ter registro completo ou não)
    if (date) {
      const hasPendingCorrection = pendingCorrectionsByDate.has(date);
      if (hasPendingCorrection) {
        console.log(`✅ [MonthlyTimeRecordsCalendar] Data ${date} tem correção pendente - Status: pending_correction`);
      }
      if (hasPendingCorrection) {
        return 'pending_correction';
      }
    }
    
    if (!record) {
      return 'empty';
    }
    
    // Verificar se faltam marcações obrigatórias ou se há marcações ímpares
    const allMarksPresent = hasAllRequiredMarks(record);
    const hasOdd = hasOddMarks(record);
    
    // Se faltam marcações ou há marcações ímpares, não pode estar completo/aprovado
    if (!allMarksPresent || hasOdd) {
      // Se está aprovado mas faltam marcações, mostrar como incompleto
      if (record.status === 'aprovado') {
        return 'approved_incomplete';
      }
      // Outros status mantêm a lógica original
      if (record.status === 'rejeitado') return 'rejected';
      if (record.status === 'corrigido') return 'corrected';
      return 'incomplete';
    }
    
    // Se tem todas as marcações e não há ímpares, verificar status normal
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
      case 'approved_incomplete':
        return <AlertTriangle className="w-3 h-3 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="w-3 h-3 text-red-600" />;
      case 'corrected':
        return <Edit className="w-3 h-3 text-blue-600" />;
      case 'pending_correction':
        return <Clock className="w-3 h-3 text-orange-600" />;
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
      case 'approved_incomplete':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'rejected':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'corrected':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'pending_correction':
        return 'bg-orange-50 border-orange-200 text-orange-800';
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
      case 'approved_incomplete':
        return 'Aprovado - Faltam Marcações';
      case 'rejected':
        return 'Rejeitado';
      case 'corrected':
        return 'Corrigido';
      case 'pending_correction':
        return 'Aguardando Aprovação';
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
          const status = getRecordStatus(record, date);
          const hasRecord = !!record;
          
          // Debug: Log apenas quando tem registro para não poluir o console
          if (hasRecord) {
            console.log(`📅 [DEBUG] Rendering day ${day} with record:`, { status, hasRecord, record });
          }

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
                          <span>{formatTimeWithDate(record.entrada, record.entrada_date, record.base_date || record.data_registro)}</span>
                        </div>
                      )}
                      {record.saida && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-2 h-2" />
                          <span>{formatTimeWithDate(record.saida, record.saida_date, record.base_date || record.data_registro)}</span>
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
                        status === 'pending_correction' ? 'bg-orange-100 text-orange-800' :
                        status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      )}
                    >
                      {getStatusText(status)}
                    </Badge>
                  </div>
                )}

                {/* Indicador para dias sem registro ou com correção pendente sem registro */}
                {!record && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-1">
                    {status === 'pending_correction' ? (
                      <>
                        <Clock className="w-4 h-4 text-orange-600" />
                        <Badge
                          variant="secondary"
                          className="text-xs px-1 py-0 bg-orange-100 text-orange-800"
                        >
                          {getStatusText(status)}
                        </Badge>
                      </>
                    ) : (
                      <Plus className="w-4 h-4 text-gray-400" />
                    )}
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
          <Clock className="w-3 h-3 text-orange-600" />
          <span>Aguardando Aprovação</span>
        </div>
        <div className="flex items-center gap-1">
          <Plus className="w-3 h-3 text-gray-400" />
          <span>Sem registro</span>
        </div>
      </div>
    </div>
  );
}
