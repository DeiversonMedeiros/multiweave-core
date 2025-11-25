import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/lib/company-context';
import { useEmployeeByUserId } from '@/hooks/rh/useEmployeeByUserId';
import { useEmployeeCorrectionStatusSimple } from '@/hooks/rh/useEmployeeCorrectionStatus';
import { useMonthlyTimeRecords } from '@/hooks/rh/useMonthlyTimeRecords';
import { useDelayReasons } from '@/hooks/rh/useDelayReasons';
import { useEmployeeAttendanceCorrections } from '@/hooks/rh/useAttendanceCorrections';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, AlertTriangle, CheckCircle, Edit, Plus } from 'lucide-react';
import { MonthlyTimeRecordsCalendar } from '@/components/rh/MonthlyTimeRecordsCalendar';
import { TimeRecordEditModal } from '@/components/rh/TimeRecordEditModal';
import { cn } from '@/lib/utils';

export default function CorrecaoPontoPage() {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Buscar funcionário
  const { data: employee, isLoading: employeeLoading } = useEmployeeByUserId(user?.id || '');

  // Verificar status de correção
  const { 
    correctionEnabled, 
    isLoading: statusLoading, 
    error: statusError,
    configuracoes 
  } = useEmployeeCorrectionStatusSimple(selectedYear, selectedMonth);

  // Buscar registros mensais
  const { 
    data: monthlyRecords,
    isLoading: recordsLoading, 
    error: recordsError 
  } = useMonthlyTimeRecords(selectedYear, selectedMonth);

  // Buscar correções pendentes do funcionário para o mês
  const { data: pendingCorrections } = useEmployeeAttendanceCorrections(
    employee?.id || '', 
    selectedYear, 
    selectedMonth
  );

  // Criar mapa de correções pendentes por data
  const pendingCorrectionsByDate = new Map<string, boolean>();
  pendingCorrections?.forEach(correction => {
    if (correction.status === 'pendente') {
      pendingCorrectionsByDate.set(correction.data_original, true);
    }
  });

  // Desestruturar dados
  const recordsByDate = monthlyRecords?.recordsByDate || {};

  // Debug
  console.log('📅 [DEBUG] CorrecaoPontoPage - monthlyRecords:', monthlyRecords);
  console.log('📅 [DEBUG] CorrecaoPontoPage - recordsByDate:', recordsByDate);
  console.log('📅 [DEBUG] CorrecaoPontoPage - recordsKeys:', Object.keys(recordsByDate));

  // Buscar motivos de atraso
  const { data: delayReasons, isLoading: reasonsLoading } = useDelayReasons(selectedCompany?.id || '');

  // Gerar opções de anos (últimos 2 anos + ano atual + próximo ano)
  const yearOptions = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 2 + i);

  // Gerar opções de meses
  const monthOptions = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const handleDateClick = (date: string, hasRecord: boolean) => {
    setSelectedDate(date);
    // Na página de correção de ponto, sempre criar correção (não registro direto)
    setIsCreating(false);
    setIsEditModalOpen(true);
  };

  const handleModalClose = () => {
    setIsEditModalOpen(false);
    setSelectedDate(null);
    setIsCreating(false);
  };

  const getStatusBadge = () => {
    if (statusLoading) {
      return <Badge variant="secondary">Verificando...</Badge>;
    }

    if (statusError) {
      return <Badge variant="destructive">Erro ao verificar status</Badge>;
    }

    if (correctionEnabled) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Correção Liberada
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Correção Bloqueada
      </Badge>
    );
  };

  const getStatusMessage = () => {
    if (statusLoading) return null;

    if (correctionEnabled) {
      return (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Você pode fazer correções de ponto para {monthOptions[selectedMonth - 1]?.label} de {selectedYear}.
            {configuracoes?.exigir_justificativa && ' Justificativas são obrigatórias.'}
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          Correções não estão liberadas para {monthOptions[selectedMonth - 1]?.label} de {selectedYear}.
          {configuracoes?.dias_liberacao_correcao && 
            ` Prazo de liberação: ${configuracoes.dias_liberacao_correcao} dias após o mês.`}
        </AlertDescription>
      </Alert>
    );
  };

  if (employeeLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Funcionário não encontrado. Entre em contato com o RH.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Correção de Ponto</h1>
          <p className="text-gray-600">
            Corrija seus registros de ponto para {monthOptions[selectedMonth - 1]?.label} de {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
        </div>
      </div>

      {/* Status Message */}
      {getStatusMessage()}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Período</CardTitle>
          <CardDescription>
            Selecione o mês e ano para visualizar e corrigir seus registros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ano
              </label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mês
              </label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendário de Registros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Registros de Ponto
          </CardTitle>
          <CardDescription>
            Clique em um dia para editar ou criar um registro de ponto
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recordsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : recordsError ? (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Erro ao carregar registros: {recordsError.message}
              </AlertDescription>
            </Alert>
          ) : (
            <MonthlyTimeRecordsCalendar
              year={selectedYear}
              month={selectedMonth}
              records={recordsByDate}
              onDateClick={handleDateClick}
              disabled={!correctionEnabled}
              pendingCorrectionsByDate={pendingCorrectionsByDate}
            />
          )}
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      {configuracoes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configurações de Correção</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>Prazo de liberação: {configuracoes.dias_liberacao_correcao} dias</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-gray-500" />
                <span>Justificativa obrigatória: {configuracoes.exigir_justificativa ? 'Sim' : 'Não'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>Correção futura: {configuracoes.permitir_correcao_futura ? 'Permitida' : 'Bloqueada'}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-gray-500" />
                <span>Limite de correção: {configuracoes.dias_limite_correcao} dias</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Edição */}
      {isEditModalOpen && selectedDate && (
        <TimeRecordEditModal
          isOpen={isEditModalOpen}
          onClose={handleModalClose}
          date={selectedDate}
          isCreating={isCreating}
          employeeId={employee.id}
          delayReasons={delayReasons || []}
          onSuccess={() => {
            // Invalidar queries para atualizar o calendário e correções pendentes
            queryClient.invalidateQueries({ queryKey: ['monthly-time-records'] });
            queryClient.invalidateQueries({ queryKey: ['employee-attendance-corrections'] });
          }}
        />
      )}
    </div>
  );
}
