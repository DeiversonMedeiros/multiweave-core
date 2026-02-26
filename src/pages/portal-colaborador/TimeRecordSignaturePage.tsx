import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, FileText, Clock, CheckCircle, XCircle, AlertTriangle, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { timeRecordSignatureService, TimeRecordSignature } from '@/services/rh/timeRecordSignatureService';
import { useMultiTenancy } from '@/hooks/useMultiTenancy';
import { useEmployeeByUserId } from '@/hooks/rh/useEmployeeByUserId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMonthlyTimeRecords, TimeRecord } from '@/hooks/rh/useMonthlyTimeRecords';
import { EntityService } from '@/services/generic/entityService';
import { getMonthDaysInfo, completeRecordsWithRestDays } from '@/services/rh/timeRecordReportService';
import { TimeRecordSignatureModal } from '@/components/rh/TimeRecordSignatureModal';

// Removido interface duplicada - usando a do service

export default function TimeRecordSignaturePage() {
  const [signatures, setSignatures] = useState<TimeRecordSignature[]>([]);
  const [monthLockedMap, setMonthLockedMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [signatureToSign, setSignatureToSign] = useState<TimeRecordSignature | null>(null);
  const [signingLoading, setSigningLoading] = useState(false);
  const { toast } = useToast();
  const { currentCompany } = useMultiTenancy();

  // Buscar usuário logado
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  // Buscar funcionário pelo user_id
  const { data: employee, isLoading: employeeLoading } = useEmployeeByUserId(user?.id || '');
  
  // Debug: Log para verificar dados
  useEffect(() => {
    console.log('🔍 [TimeRecordSignaturePage] Debug:', {
      userId: user?.id,
      currentCompanyId: currentCompany?.id,
      employee: employee,
      employeeLoading,
      selectedCompanyFromHook: employee ? 'found' : 'not found'
    });
  }, [user?.id, currentCompany?.id, employee, employeeLoading]);

  const loadSignatures = useCallback(async () => {
    try {
      setLoading(true);
      
      const companyId = currentCompany?.id;
      const employeeId = employee?.id;
      
      if (!companyId) {
        toast({
          title: 'Erro',
          description: 'Empresa não selecionada.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (!employeeId) {
        toast({
          title: 'Erro',
          description: 'Funcionário não encontrado.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      console.log('📡 [TimeRecordSignaturePage] Buscando assinaturas:', { employeeId, companyId });

      // Verificar configuração primeiro
      const config = await timeRecordSignatureService.getConfig(companyId);
      console.log('🔍 [TimeRecordSignaturePage] Configuração:', {
        isEnabled: config.is_enabled,
        signaturePeriodDays: config.signature_period_days,
        autoCloseMonth: config.auto_close_month
      });

      // Buscar assinaturas reais do banco
      const signaturesData = await timeRecordSignatureService.getEmployeeSignatures(
        employeeId,
        companyId
      );

      console.log('✅ [TimeRecordSignaturePage] Assinaturas recebidas:', {
        count: signaturesData.length,
        signatures: signaturesData.map(s => ({
          id: s.id,
          month_year: s.month_year,
          status: s.status,
          expires_at: s.expires_at
        }))
      });

      // Se não há assinaturas e a funcionalidade está habilitada, verificar se precisa criar
      if (signaturesData.length === 0 && config.is_enabled) {
        console.log('⚠️ [TimeRecordSignaturePage] Nenhuma assinatura encontrada, mas funcionalidade está habilitada');
        console.log('💡 [TimeRecordSignaturePage] Pode ser necessário chamar create_monthly_signature_records para o mês atual');
        
        // Tentar criar assinaturas para o mês atual e anterior
        try {
          const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          const lastMonthStr = lastMonth.toISOString().slice(0, 7);
          
          console.log('🔄 [TimeRecordSignaturePage] Tentando criar assinaturas para:', { currentMonth, lastMonthStr });
          
          // Chamar RPC para criar assinaturas (se a função existir)
          const { data: currentResult, error: currentError } = await (supabase.rpc as any)('create_monthly_signature_records', {
            p_company_id: companyId,
            p_month_year: currentMonth
          });
          
          console.log('📊 [TimeRecordSignaturePage] Resultado criação mês atual:', { data: currentResult, error: currentError });
          
          // Tentar mês anterior também
          const { data: lastResult, error: lastError } = await (supabase.rpc as any)('create_monthly_signature_records', {
            p_company_id: companyId,
            p_month_year: lastMonthStr
          });
          
          console.log('📊 [TimeRecordSignaturePage] Resultado criação mês anterior:', { data: lastResult, error: lastError });
          
          // Se criou assinaturas, buscar novamente e carregar status de bloqueio por mês
          if (currentResult || lastResult) {
            console.log('🔄 [TimeRecordSignaturePage] Assinaturas criadas, buscando novamente...');
            const newSignatures = await timeRecordSignatureService.getEmployeeSignatures(employeeId, companyId);
            console.log('✅ [TimeRecordSignaturePage] Novas assinaturas encontradas:', newSignatures.length);
            const uniqueMonthYears = [...new Set(newSignatures.map((s) => s.month_year))];
            const lockedMap: Record<string, boolean> = {};
            await Promise.all(
              uniqueMonthYears.map(async (my) => {
                try {
                  const status = await timeRecordSignatureService.getMonthStatus(companyId, my);
                  lockedMap[my] = status?.is_locked === true;
                } catch {
                  lockedMap[my] = false;
                }
              })
            );
            setMonthLockedMap(lockedMap);
            setSignatures(newSignatures);
            return;
          }
        } catch (error) {
          console.error('❌ [TimeRecordSignaturePage] Erro ao tentar criar assinaturas:', error);
        }
      }

      // Controle por mês/ano tem prioridade: buscar status (liberado/bloqueado) de cada mês
      const uniqueMonthYears = [...new Set(signaturesData.map((s) => s.month_year))];
      const lockedMap: Record<string, boolean> = {};
      await Promise.all(
        uniqueMonthYears.map(async (my) => {
          try {
            const status = await timeRecordSignatureService.getMonthStatus(companyId, my);
            lockedMap[my] = status?.is_locked === true;
          } catch {
            lockedMap[my] = false;
          }
        })
      );
      setMonthLockedMap(lockedMap);
      setSignatures(signaturesData);
    } catch (error) {
      console.error('❌ [TimeRecordSignaturePage] Erro ao carregar assinaturas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as assinaturas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCompany?.id, employee?.id]);

  // Usar useRef para rastrear se já carregou para evitar loops
  const hasLoadedRef = useRef(false);
  const lastCompanyIdRef = useRef<string | null>(null);
  const lastEmployeeIdRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    // Se ainda está carregando o employee, aguardar
    if (employeeLoading) {
      console.log('⏳ [TimeRecordSignaturePage] Aguardando employee carregar...');
      return;
    }

    // Se não há company ou employee, finalizar loading
    if (!currentCompany?.id || !employee?.id) {
      console.log('⚠️ [TimeRecordSignaturePage] Dados faltando:', {
        company: currentCompany?.id,
        employee: employee?.id
      });
      setLoading(false);
      hasLoadedRef.current = false;
      lastCompanyIdRef.current = null;
      lastEmployeeIdRef.current = null;
      return;
    }

    // Verificar se os IDs mudaram (nova empresa ou novo employee)
    const companyChanged = lastCompanyIdRef.current !== currentCompany.id;
    const employeeChanged = lastEmployeeIdRef.current !== employee.id;
    const shouldLoad = (companyChanged || employeeChanged || !hasLoadedRef.current) && 
                       currentCompany?.id && 
                       employee?.id && 
                       !isLoadingRef.current;

    console.log('🔍 [TimeRecordSignaturePage] Verificando se deve carregar:', {
      companyChanged,
      employeeChanged,
      hasLoaded: hasLoadedRef.current,
      isLoading: isLoadingRef.current,
      shouldLoad,
      companyId: currentCompany.id,
      employeeId: employee.id
    });

    // Se os IDs mudaram ou ainda não carregou, e não está carregando, carregar assinaturas
    if (shouldLoad) {
      console.log('✅ [TimeRecordSignaturePage] Carregando assinaturas...');
      hasLoadedRef.current = true;
      lastCompanyIdRef.current = currentCompany.id;
      lastEmployeeIdRef.current = employee.id;
      isLoadingRef.current = true;
      
      loadSignatures().finally(() => {
        isLoadingRef.current = false;
        console.log('✅ [TimeRecordSignaturePage] Assinaturas carregadas');
      });
    } else {
      console.log('⏭️ [TimeRecordSignaturePage] Pulando carregamento (já carregado ou em progresso)');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCompany?.id, employee?.id, employeeLoading]);

  const handleSign = (signatureId: string) => {
    const signature = signatures.find((s) => s.id === signatureId);
    if (signature) {
      setSignatureToSign(signature);
    }
  };

  const handleCloseSignatureModal = () => {
    if (!signingLoading) {
      setSignatureToSign(null);
    }
  };

  const handleSubmitSignature = async (signatureData: any) => {
    if (!signatureToSign || !currentCompany?.id) return;

    try {
      setSigningLoading(true);
      const ipAddress = undefined; // opcional; pode integrar com serviço de IP se necessário
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;

      await timeRecordSignatureService.signRecord(
        signatureToSign.id,
        signatureData,
        currentCompany.id,
        ipAddress,
        userAgent
      );

      toast({
        title: 'Assinatura registrada',
        description: 'Seus registros de ponto foram assinados com sucesso.',
      });

      setSignatureToSign(null);
      loadSignatures();
    } catch (error) {
      console.error('Erro ao assinar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível processar a assinatura. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSigningLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'signed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'signed':
        return 'Assinado';
      case 'expired':
        return 'Expirado';
      case 'rejected':
        return 'Rejeitado';
      case 'approved':
        return 'Aprovado';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'signed':
        return 'default';
      case 'expired':
        return 'destructive';
      case 'rejected':
        return 'destructive';
      case 'approved':
        return 'default';
      default:
        return 'outline';
    }
  };

  const formatMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${monthNames[parseInt(month) - 1]} de ${year}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  // Primeira assinatura pendente (para botão fixo no mobile)
  const firstPendingSignature = useMemo(() => (
    signatures.find(
      (s) =>
        s.status === 'pending' &&
        !isExpired(s.expires_at) &&
        monthLockedMap[s.month_year] !== true
    ) ?? null
  ), [signatures, monthLockedMap]);

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Assinatura de Ponto</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Assine seus registros de ponto mensais
          </p>
        </div>
      </div>

      {signatures.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma assinatura pendente</h3>
            <p className="text-muted-foreground text-center">
              Não há registros de ponto para assinar no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {signatures.map((signature) => (
            <SignatureCardWithRecords 
              key={signature.id} 
              signature={signature}
              employeeId={employee?.id}
              companyId={currentCompany?.id}
              onSign={handleSign}
              formatMonthYear={formatMonthYear}
              formatDate={formatDate}
              getStatusIcon={getStatusIcon}
              getStatusText={getStatusText}
              getStatusVariant={getStatusVariant}
              isExpired={isExpired}
              isMonthLocked={monthLockedMap[signature.month_year] === true}
            />
          ))}
        </div>
      )}

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> Você tem até a data de expiração para assinar seus registros de ponto. 
          Após o vencimento, não será mais possível assinar e será necessário entrar em contato com o RH.
        </AlertDescription>
      </Alert>

      {/* Botão fixo no mobile para assinatura sempre visível */}
      {firstPendingSignature && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-background border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:hidden">
          <Button
            className="w-full"
            size="lg"
            onClick={() => handleSign(firstPendingSignature.id)}
          >
            <FileText className="mr-2 h-4 w-4" />
            Assinar Folha de Ponto
          </Button>
        </div>
      )}
      {/* Espaço para não ficar escondido atrás do botão fixo no mobile */}
      {firstPendingSignature && <div className="h-16 md:h-0" aria-hidden />}

      {signatureToSign && (
        <TimeRecordSignatureModal
          signature={signatureToSign}
          onClose={handleCloseSignatureModal}
          onSubmit={handleSubmitSignature}
          isLoading={signingLoading}
        />
      )}
    </div>
  );
}

// Componente para exibir card de assinatura com registros
interface SignatureCardWithRecordsProps {
  signature: TimeRecordSignature;
  employeeId?: string;
  companyId?: string;
  onSign: (signatureId: string) => void;
  formatMonthYear: (monthYear: string) => string;
  formatDate: (dateString: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusText: (status: string) => string;
  getStatusVariant: (status: string) => "default" | "secondary" | "destructive" | "outline";
  isExpired: (expiresAt: string) => boolean;
  /** Quando true, o mês está bloqueado pelo RH e o colaborador não pode assinar (prioridade sobre config/expiração) */
  isMonthLocked?: boolean;
}

function SignatureCardWithRecords({
  signature,
  employeeId,
  companyId,
  onSign,
  formatMonthYear,
  formatDate,
  getStatusIcon,
  getStatusText,
  getStatusVariant,
  isExpired,
  isMonthLocked = false,
}: SignatureCardWithRecordsProps) {
  const [showRecords, setShowRecords] = useState(true);
  const [year, month] = signature.month_year.split('-').map(Number);
  
  const { data: monthlyRecords, isLoading: recordsLoading } = useMonthlyTimeRecords(year, month);
  
  // Estado para armazenar informações dos dias do mês e registros completos
  const [daysInfo, setDaysInfo] = useState<Map<string, import('@/services/rh/timeRecordReportService').DayInfo>>(new Map());
  const [isLoadingDaysInfo, setIsLoadingDaysInfo] = useState(false);
  const [completeRecords, setCompleteRecords] = useState<TimeRecord[]>([]);
  
  // Buscar informações dos dias do mês
  useEffect(() => {
    if (!employeeId || !companyId) {
      return;
    }
    
    setIsLoadingDaysInfo(true);
    getMonthDaysInfo(
      employeeId,
      companyId,
      month,
      year
    ).then(info => {
      setDaysInfo(info);
      setIsLoadingDaysInfo(false);
    }).catch(err => {
      console.error('[SignatureCardWithRecords] Erro ao buscar informações dos dias:', err);
      setIsLoadingDaysInfo(false);
    });
  }, [employeeId, companyId, month, year]);
  
  // Completar registros com dias de folga quando necessário
  useEffect(() => {
    if (daysInfo.size === 0 || !monthlyRecords || !employeeId || !companyId) {
      // Se não tem daysInfo ou monthlyRecords, usar apenas os registros originais
      const recordsArray = monthlyRecords 
        ? Object.entries(monthlyRecords.recordsByDate)
            .map(([date, record]) => ({ ...record, data_registro: date }))
            .sort((a, b) => a.data_registro.localeCompare(b.data_registro))
        : [];
      setCompleteRecords(recordsArray);
      return;
    }
    
    // Converter recordsByDate para array
    const recordsArray = Object.entries(monthlyRecords.recordsByDate)
      .map(([date, record]) => ({ ...record, data_registro: date }))
      .sort((a, b) => a.data_registro.localeCompare(b.data_registro));
    
    // Completar com DSR, Férias, Atestado, Compensação
    // Converter para o formato esperado por completeRecordsWithRestDays
    const recordsForCompletion = recordsArray.map(record => ({
      ...record,
      // Garantir que todos os campos opcionais estejam presentes
      horas_trabalhadas: record.horas_trabalhadas || 0,
      horas_extras: record.horas_extras || 0,
      horas_extras_50: record.horas_extras_50 || 0,
      horas_extras_100: record.horas_extras_100 || 0,
      horas_negativas: record.horas_negativas || 0,
      horas_noturnas: record.horas_noturnas || 0,
      horas_faltas: record.horas_faltas || 0,
      is_feriado: (record as any).is_feriado || false,
      is_domingo: (record as any).is_domingo || false,
      is_dia_folga: (record as any).is_dia_folga || false,
    })) as any[];
    
    completeRecordsWithRestDays(
      recordsForCompletion,
      month,
      year,
      daysInfo,
      employeeId,
      companyId
    ).then(completed => {
      setCompleteRecords(completed as TimeRecord[]);
    }).catch(err => {
      console.error('[SignatureCardWithRecords] Erro ao completar registros:', err);
      setCompleteRecords(recordsArray);
    });
  }, [monthlyRecords, daysInfo, month, year, employeeId, companyId]);

  // Calcular saldo mensal do banco de horas usando função SQL
  // O cálculo é feito no banco de dados para garantir consistência
  const monthlyBankHoursBalance = useQuery({
    queryKey: ['monthly-bank-hours-balance', employeeId, companyId, year, month],
    queryFn: async () => {
      if (!employeeId || !companyId) return 0;

      try {
        // Usar função SQL para calcular saldo mensal
        const { data, error } = await (supabase as any).rpc('get_monthly_bank_hours_balance', {
          p_employee_id: employeeId,
          p_company_id: companyId,
          p_year: year,
          p_month: month
        });

        if (error) {
          console.error('Erro ao calcular saldo mensal do banco de horas:', error);
          return 0;
        }

        const balance = Number(data) || 0;
        console.log('[Saldo Banco de Horas]', {
          balance,
          mes: `${year}-${month}`,
          employeeId,
          companyId
        });

        return balance;
      } catch (error) {
        console.error('Erro ao calcular saldo mensal do banco de horas:', error);
        return 0;
      }
    },
    enabled: !!employeeId && !!companyId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: false
  });

  // Função para formatar horário com data - sempre mostra a data quando disponível
  const formatTimeWithDate = (time?: string, date?: string, baseDate?: string) => {
    if (!time) return '-';
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
    if (!time) return '-';
    try {
      // Se for formato TIME do PostgreSQL (HH:MM:SS ou HH:MM:SS.microseconds)
      // ou formato simples (HH:MM), retornar apenas HH:MM
      if (time.match(/^\d{1,2}:\d{2}(:\d{2})?(\.\d+)?$/)) {
        // Extrair apenas HH:MM
        const parts = time.split(':');
        if (parts.length >= 2) {
          const hours = parts[0].padStart(2, '0');
          const minutes = parts[1].padStart(2, '0');
          return `${hours}:${minutes}`;
        }
        return time;
      }
      // Se for timestamp completo (ISO string), extrair apenas hora
      const date = new Date(time);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }
      // Se não conseguir converter, retornar como está
      return time;
    } catch {
      return time || '-';
    }
  };

  const formatHours = (hours?: number) => {
    if (!hours && hours !== 0) return '-';
    return `${hours.toFixed(2)}h`;
  };

  const formatDateShort = (dateString: string) => {
    try {
      // Se já estiver no formato YYYY-MM-DD, formatar diretamente
      if (dateString && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}`;
      }
      // Tentar converter para Date
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit'
        });
      }
      return dateString || '-';
    } catch {
      return dateString || '-';
    }
  };

  const getDayOfWeek = (dateString: string) => {
    try {
      // Se já estiver no formato YYYY-MM-DD, usar diretamente
      if (dateString && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(dateString + 'T00:00:00');
        if (!isNaN(date.getTime())) {
          const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
          return days[date.getDay()];
        }
      }
      // Tentar converter para Date
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        return days[date.getDay()];
      }
      return '';
    } catch {
      return '';
    }
  };

  // Usar registros completos (com DSR, Férias, etc.) se disponível, senão usar os originais
  const recordsArray = completeRecords.length > 0 
    ? completeRecords
    : (monthlyRecords 
        ? Object.entries(monthlyRecords.recordsByDate)
            .map(([date, record]) => ({ ...record, data_registro: date }))
            .sort((a, b) => a.data_registro.localeCompare(b.data_registro))
        : []);

  // Calcular métricas consolidadas (igual à página time-records)
  const summaryMetrics = useMemo(() => {
    if (!recordsArray || recordsArray.length === 0) {
      return {
        totalHorasTrabalhadas: 0,
        totalHorasNegativas: 0,
        totalHorasExtras50: 0,
        totalHorasExtras100: 0,
        totalHorasNoturnas: 0,
      };
    }

    return recordsArray.reduce(
      (acc, record) => {
        // Considerar apenas registros aprovados para o resumo
        // Registros pendentes não devem aparecer nos totais
        if (record.status !== 'aprovado') {
          return acc;
        }
        
        acc.totalHorasTrabalhadas += record.horas_trabalhadas || 0;
        acc.totalHorasNegativas += record.horas_negativas || 0;
        acc.totalHorasExtras50 += record.horas_extras_50 || 0;
        acc.totalHorasExtras100 += record.horas_extras_100 || 0;
        acc.totalHorasNoturnas += record.horas_noturnas || 0;
        return acc;
      },
      {
        totalHorasTrabalhadas: 0,
        totalHorasNegativas: 0,
        totalHorasExtras50: 0,
        totalHorasExtras100: 0,
        totalHorasNoturnas: 0,
      }
    );
  }, [recordsArray]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {formatMonthYear(signature.month_year)}
          </CardTitle>
          <Badge variant={getStatusVariant(signature.status)}>
            {getStatusIcon(signature.status)}
            <span className="ml-1">{getStatusText(signature.status)}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Status:</span>
            <span className="ml-2">{getStatusText(signature.status)}</span>
          </div>
          <div>
            <span className="font-medium">Expira em:</span>
            <span className="ml-2">{formatDate(signature.expires_at)}</span>
          </div>
          {signature.signature_timestamp && (
            <div>
              <span className="font-medium">Assinado em:</span>
              <span className="ml-2">{formatDate(signature.signature_timestamp)}</span>
            </div>
          )}
          {signature.manager_approved_at && (
            <div>
              <span className="font-medium">Aprovado em:</span>
              <span className="ml-2">{formatDate(signature.manager_approved_at)}</span>
            </div>
          )}
        </div>

        {/* Resumo do mês - igual à página time-records */}
        {monthlyRecords && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 bg-muted rounded-lg">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Horas Trabalhadas</p>
              <p className="text-2xl font-bold text-blue-600">
                {summaryMetrics.totalHorasTrabalhadas.toFixed(2)}h
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Horas Negativas</p>
              <p className="text-2xl font-bold text-red-600">
                {summaryMetrics.totalHorasNegativas > 0 ? '-' : ''}{summaryMetrics.totalHorasNegativas.toFixed(2)}h
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Extras 50%</p>
              <p className="text-2xl font-bold text-orange-600">
                {summaryMetrics.totalHorasExtras50.toFixed(2)}h
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Extras 100%</p>
              <p className="text-2xl font-bold text-purple-600">
                {summaryMetrics.totalHorasExtras100.toFixed(2)}h
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Horas Noturnas</p>
              <p className="text-2xl font-bold text-indigo-600">
                {summaryMetrics.totalHorasNoturnas.toFixed(2)}h
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Saldo Banco de Horas</p>
              {monthlyBankHoursBalance.isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Carregando...</span>
                </div>
              ) : (
                <p className={`text-2xl font-bold ${
                  (monthlyBankHoursBalance.data || 0) > 0 ? 'text-green-600' :
                  (monthlyBankHoursBalance.data || 0) < 0 ? 'text-red-600' :
                  'text-gray-500'
                }`}>
                  {(monthlyBankHoursBalance.data || 0) >= 0 ? '+' : ''}{(monthlyBankHoursBalance.data || 0).toFixed(2)}h
                </p>
              )}
            </div>
          </div>
        )}

        {/* Botão para mostrar/ocultar registros */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRecords(!showRecords)}
          className="w-full"
        >
          {showRecords ? (
            <>
              <ChevronUp className="mr-2 h-4 w-4" />
              Ocultar Registros
            </>
          ) : (
            <>
              <ChevronDown className="mr-2 h-4 w-4" />
              Mostrar Registros ({recordsArray.length})
            </>
          )}
        </Button>

        {/* Tabela de registros */}
        {showRecords && (
          <div className="border rounded-lg min-w-0">
            {recordsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Carregando registros...</span>
              </div>
            ) : recordsArray.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                <FileText className="h-8 w-8 mb-2" />
                <p>Nenhum registro de ponto encontrado para este mês.</p>
              </div>
            ) : (
              <div 
                className="w-full min-w-0 overflow-x-auto [-webkit-overflow-scrolling:touch]"
                style={{ maxWidth: '100%' }}
              >
                <Table className="min-w-[800px] w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Entrada Almoço</TableHead>
                      <TableHead>Saída Almoço</TableHead>
                      <TableHead>Saída</TableHead>
                      <TableHead>Horas</TableHead>
                      <TableHead>Horas Negativas</TableHead>
                      <TableHead>Extras</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recordsArray.map((record) => {
                      // Verificar se é registro virtual (DSR, Férias, Atestado, Compensação)
                      const isVirtual = record.id?.startsWith('virtual-');
                      const isDSR = isVirtual && record.is_dia_folga;
                      const isVacation = isVirtual && record.observacoes === 'Férias';
                      const isMedicalCertificate = isVirtual && record.observacoes === 'Atestado Médico';
                      const isCompensation = isVirtual && record.observacoes?.startsWith('Comp.');
                      
                      // Determinar cor de fundo e estilo baseado no tipo
                      let rowClassName = '';
                      let statusBadge = null;
                      
                      if (isDSR) {
                        rowClassName = 'bg-blue-50 hover:bg-blue-100';
                        statusBadge = <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">DSR</Badge>;
                      } else if (isVacation) {
                        rowClassName = 'bg-green-50 hover:bg-green-100';
                        statusBadge = <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Férias</Badge>;
                      } else if (isMedicalCertificate) {
                        rowClassName = 'bg-yellow-50 hover:bg-yellow-100';
                        statusBadge = <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Atestado</Badge>;
                      } else if (isCompensation) {
                        rowClassName = 'bg-purple-50 hover:bg-purple-100';
                        statusBadge = <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">{record.observacoes || 'Compensação'}</Badge>;
                      } else {
                        statusBadge = (
                          <Badge 
                            variant={
                              record.status === 'aprovado' ? 'default' :
                              record.status === 'rejeitado' ? 'destructive' :
                              'secondary'
                            }
                          >
                            {record.status || 'Pendente'}
                          </Badge>
                        );
                      }
                      
                      return (
                        <TableRow key={record.id || record.data_registro} className={rowClassName}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {formatDateShort(record.data_registro)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {getDayOfWeek(record.data_registro)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isVirtual && !record.entrada ? (
                              <span className="text-muted-foreground text-sm">-</span>
                            ) : (
                              formatTimeWithDate(record.entrada, record.entrada_date, record.base_date || record.data_registro)
                            )}
                          </TableCell>
                          <TableCell>
                            {isVirtual && !record.entrada_almoco ? (
                              <span className="text-muted-foreground text-sm">-</span>
                            ) : (
                              formatTimeWithDate(record.entrada_almoco, record.entrada_almoco_date, record.base_date || record.data_registro)
                            )}
                          </TableCell>
                          <TableCell>
                            {isVirtual && !record.saida_almoco ? (
                              <span className="text-muted-foreground text-sm">-</span>
                            ) : (
                              formatTimeWithDate(record.saida_almoco, record.saida_almoco_date, record.base_date || record.data_registro)
                            )}
                          </TableCell>
                          <TableCell>
                            {isVirtual && !record.saida ? (
                              <span className="text-muted-foreground text-sm">-</span>
                            ) : (
                              formatTimeWithDate(record.saida, record.saida_date, record.base_date || record.data_registro)
                            )}
                          </TableCell>
                          <TableCell>
                            {isVirtual ? (
                              <span className="text-muted-foreground text-sm">-</span>
                            ) : (
                              formatHours(record.horas_trabalhadas)
                            )}
                          </TableCell>
                          <TableCell>
                            {isVirtual ? (
                              <span className="text-muted-foreground text-sm">-</span>
                            ) : record.horas_negativas && record.horas_negativas > 0 ? (
                              <span className="text-red-600 font-medium">
                                -{formatHours(record.horas_negativas)}
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {isVirtual ? (
                              <span className="text-muted-foreground text-sm">-</span>
                            ) : record.horas_extras ? (
                              <span className="text-green-600 font-medium">
                                {formatHours(record.horas_extras)}
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {statusBadge}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {signature.rejection_reason && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Motivo da rejeição:</strong> {signature.rejection_reason}
            </AlertDescription>
          </Alert>
        )}

        {isMonthLocked && signature.status === 'pending' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Este mês está bloqueado para assinatura pelo RH. Entre em contato para mais informações.
            </AlertDescription>
          </Alert>
        )}

        {isExpired(signature.expires_at) && signature.status === 'pending' && !isMonthLocked && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Esta assinatura expirou e não pode mais ser assinada.
            </AlertDescription>
          </Alert>
        )}

        {signature.status === 'pending' && !isExpired(signature.expires_at) && !isMonthLocked && (
          <div className="flex gap-2">
            <Button onClick={() => onSign(signature.id)}>
              <FileText className="mr-2 h-4 w-4" />
              Assinar Registro
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}