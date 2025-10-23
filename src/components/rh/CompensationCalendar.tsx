import React, { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCompensationRequests } from '@/hooks/rh/useCompensationRequests';
import { useCompany } from '@/lib/company-context';
import { CompensationRequest } from '@/integrations/supabase/rh-types';

// =====================================================
// COMPONENTE DE CALENDÁRIO DE COMPENSAÇÕES
// =====================================================

interface CalendarDayProps {
  day: Date;
  compensations: CompensationRequest[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onDayClick: (day: Date, compensations: CompensationRequest[]) => void;
}

const CalendarDay: React.FC<CalendarDayProps> = ({ 
  day, 
  compensations, 
  isCurrentMonth, 
  isToday, 
  onDayClick 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejeitado':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'realizado':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle className="h-3 w-3" />;
      case 'pendente':
        return <Clock className="h-3 w-3" />;
      case 'rejeitado':
        return <XCircle className="h-3 w-3" />;
      case 'realizado':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  return (
    <div
      className={`
        min-h-[100px] p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors
        ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
        ${isToday ? 'bg-blue-50 border-blue-300' : ''}
      `}
      onClick={() => onDayClick(day, compensations)}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''}`}>
          {format(day, 'd')}
        </span>
        {compensations.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {compensations.length}
          </Badge>
        )}
      </div>
      
      <div className="space-y-1">
        {compensations.slice(0, 2).map((compensation) => (
          <div
            key={compensation.id}
            className={`text-xs p-1 rounded border ${getStatusColor(compensation.status)}`}
          >
            <div className="flex items-center space-x-1">
              {getStatusIcon(compensation.status)}
              <span className="truncate">
                {compensation.quantidade_horas}h
              </span>
            </div>
          </div>
        ))}
        {compensations.length > 2 && (
          <div className="text-xs text-gray-500 text-center">
            +{compensations.length - 2} mais
          </div>
        )}
      </div>
    </div>
  );
};

interface CompensationDetailsProps {
  day: Date;
  compensations: CompensationRequest[];
  onClose: () => void;
}

const CompensationDetails: React.FC<CompensationDetailsProps> = ({ 
  day, 
  compensations, 
  onClose 
}) => {
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aprovado': return 'Aprovado';
      case 'pendente': return 'Pendente';
      case 'rejeitado': return 'Rejeitado';
      case 'realizado': return 'Realizado';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'text-green-600';
      case 'pendente': return 'text-yellow-600';
      case 'rejeitado': return 'text-red-600';
      case 'realizado': return 'text-blue-600';
      case 'cancelado': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card className="w-96">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {format(day, 'dd/MM/yyyy', { locale: ptBR })}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {compensations.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            Nenhuma compensação neste dia
          </p>
        ) : (
          <div className="space-y-3">
            {compensations.map((compensation) => (
              <div key={compensation.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">
                    {compensation.quantidade_horas}h
                  </span>
                  <span className={`text-sm font-medium ${getStatusColor(compensation.status)}`}>
                    {getStatusLabel(compensation.status)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {compensation.descricao}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Tipo: {compensation.tipo}</span>
                  <span>
                    {compensation.data_aprovacao && 
                      format(new Date(compensation.data_aprovacao), 'dd/MM/yyyy')
                    }
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export function CompensationCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedCompensations, setSelectedCompensations] = useState<CompensationRequest[]>([]);
  const { selectedCompany } = useCompany();
  const { data: compensations = [], isLoading } = useCompensationRequests();

  // Calcular dias do mês
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Adicionar dias do mês anterior para completar a primeira semana
  const firstDayOfWeek = monthStart.getDay();
  const previousMonthDays = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = new Date(monthStart);
    day.setDate(day.getDate() - i - 1);
    previousMonthDays.push(day);
  }

  // Adicionar dias do próximo mês para completar a última semana
  const lastDayOfWeek = monthEnd.getDay();
  const nextMonthDays = [];
  for (let i = 1; i <= 6 - lastDayOfWeek; i++) {
    const day = new Date(monthEnd);
    day.setDate(day.getDate() + i);
    nextMonthDays.push(day);
  }

  const allDays = [...previousMonthDays, ...monthDays, ...nextMonthDays];

  // Agrupar compensações por data
  const compensationsByDate = useMemo(() => {
    const grouped: { [key: string]: CompensationRequest[] } = {};
    
    compensations.forEach((compensation) => {
      const date = compensation.data_inicio;
      if (date) {
        const dateKey = format(new Date(date), 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(compensation);
      }
    });
    
    return grouped;
  }, [compensations]);

  const handleDayClick = (day: Date, dayCompensations: CompensationRequest[]) => {
    setSelectedDay(day);
    setSelectedCompensations(dayCompensations);
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleCloseDetails = () => {
    setSelectedDay(null);
    setSelectedCompensations([]);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando calendário...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              Calendário de Compensações
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-lg font-medium min-w-[200px] text-center">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <Button variant="outline" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
            {/* Cabeçalho dos dias da semana */}
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <div key={day} className="bg-gray-100 p-2 text-center text-sm font-medium text-gray-700">
                {day}
              </div>
            ))}
            
            {/* Dias do calendário */}
            {allDays.map((day, index) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayCompensations = compensationsByDate[dateKey] || [];
              
              return (
                <CalendarDay
                  key={index}
                  day={day}
                  compensations={dayCompensations}
                  isCurrentMonth={isSameMonth(day, currentDate)}
                  isToday={isToday(day)}
                  onDayClick={handleDayClick}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detalhes do dia selecionado */}
      {selectedDay && (
        <div className="flex justify-center">
          <CompensationDetails
            day={selectedDay}
            compensations={selectedCompensations}
            onClose={handleCloseDetails}
          />
        </div>
      )}
    </div>
  );
}
