import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useCompany } from '@/lib/company-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Play, 
  Pause, 
  Square, 
  Coffee,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { useEmployeeByUserId } from '@/hooks/rh/useEmployees';
import { EntityService } from '@/services/generic/entityService';

type TimeRecordType = 'entrada' | 'saida' | 'entrada_almoco' | 'saida_almoco' | 'entrada_extra1' | 'saida_extra1';

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
  status: string;
}

export default function RegistroPontoPage() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Atualizar relógio a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Monitorar conectividade
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Buscar funcionário
  const { data: employee } = useEmployeeByUserId(user?.id || '');

  // Buscar registro de hoje
  const { data: todayRecord, isLoading: recordLoading } = useQuery({
    queryKey: ['today-time-record', employee?.id],
    queryFn: async () => {
      if (!employee?.id || !selectedCompany?.id) return null;
      
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      console.log('🔍 Buscando registros de ponto para:', {
        employeeId: employee.id,
        companyId: selectedCompany.id,
        dataRegistro: today,
        currentTime: now.toISOString(),
        localDate: now.toLocaleDateString('pt-BR'),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      
      const result = await EntityService.list({
        schema: 'rh',
        table: 'time_records',
        companyId: selectedCompany.id,
        filters: {
          employee_id: employee.id,
          data_registro: today
        },
        pageSize: 1
      });
      
      console.log('📊 Resultado da consulta:', result);
      console.log('📅 Registro encontrado:', result.data[0] || 'Nenhum registro encontrado');
      
      return result.data[0] || null;
    },
    enabled: !!employee?.id && !!selectedCompany?.id
  });

  // Buscar escala de trabalho
  const { data: workSchedule } = useQuery({
    queryKey: ['work-schedule', employee?.id],
    queryFn: async () => {
      if (!employee?.work_schedule_id || !selectedCompany?.id) return null;
      
      const result = await EntityService.list({
        schema: 'rh',
        table: 'work_schedules',
        companyId: selectedCompany.id,
        filters: {
          id: employee.work_schedule_id
        },
        pageSize: 1
      });
      
      return result.data[0] || null;
    },
    enabled: !!employee?.work_schedule_id && !!selectedCompany?.id
  });

  // Mutação para registrar ponto
  const registerTimeMutation = useMutation({
    mutationFn: async (type: TimeRecordType) => {
      if (!employee?.id || !selectedCompany?.id) {
        throw new Error('Dados do funcionário ou empresa não encontrados');
      }

      const now = new Date();
      const timeString = now.toTimeString().split(' ')[0];
      const dateString = now.toISOString().split('T')[0];

      if (!todayRecord) {
        // Criar novo registro
        const data = await EntityService.create({
          schema: 'rh',
          table: 'time_records',
          companyId: selectedCompany.id,
          data: {
            employee_id: employee.id,
            data_registro: dateString,
            [type]: timeString,
            status: 'pendente'
          }
        });
        
        return data;
      } else {
        // Atualizar registro existente
        const data = await EntityService.update({
          schema: 'rh',
          table: 'time_records',
          companyId: selectedCompany.id,
          id: todayRecord.id,
          data: {
            [type]: timeString,
            updated_at: now.toISOString()
          }
        });
        
        return data;
      }
    },
    onSuccess: (data, type) => {
      queryClient.invalidateQueries({ queryKey: ['today-time-record', employee?.id] });
      
      const typeLabels = {
        entrada: 'Entrada',
        saida: 'Saída',
        entrada_almoco: 'Início do Almoço',
        saida_almoco: 'Fim do Almoço',
        entrada_extra1: 'Entrada Extra',
        saida_extra1: 'Saída Extra'
      };

      toast({
        title: "Ponto registrado!",
        description: `${typeLabels[type]} registrada às ${new Date().toLocaleTimeString('pt-BR')}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao registrar ponto",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  });

  // Determinar próximo tipo de registro
  const getNextRecordType = (): TimeRecordType | null => {
    if (!todayRecord) return 'entrada';
    
    const { entrada, saida, entrada_almoco, saida_almoco, entrada_extra1, saida_extra1 } = todayRecord;
    
    if (!entrada) return 'entrada';
    if (entrada && !entrada_almoco) return 'entrada_almoco';
    if (entrada_almoco && !saida_almoco) return 'saida_almoco';
    if (saida_almoco && !saida) return 'saida';
    if (saida && !entrada_extra1) return 'entrada_extra1';
    if (entrada_extra1 && !saida_extra1) return 'saida_extra1';
    
    return null; // Todos os registros feitos
  };

  const nextRecordType = getNextRecordType();
  const isAllRecordsDone = !nextRecordType;

  // Debug logs - apenas quando os dados mudam
  useEffect(() => {
    console.log('🐛 DEBUG - Estado atual:', {
      todayRecord,
      nextRecordType,
      isAllRecordsDone,
      employeeId: employee?.id,
      companyId: selectedCompany?.id,
      currentDate: new Date().toISOString().split('T')[0]
    });
  }, [todayRecord, nextRecordType, isAllRecordsDone, employee?.id, selectedCompany?.id]);

  const getRecordTypeInfo = (type: TimeRecordType) => {
    const types = {
      entrada: { label: 'Entrada', icon: Play, color: 'bg-green-500' },
      saida: { label: 'Saída', icon: Square, color: 'bg-red-500' },
      entrada_almoco: { label: 'Início do Almoço', icon: Coffee, color: 'bg-yellow-500' },
      saida_almoco: { label: 'Fim do Almoço', icon: Pause, color: 'bg-orange-500' },
      entrada_extra1: { label: 'Entrada Extra', icon: Play, color: 'bg-purple-500' },
      saida_extra1: { label: 'Saída Extra', icon: Square, color: 'bg-purple-600' }
    };
    return types[type];
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '--:--';
    return timeString.substring(0, 5);
  };

  if (recordLoading) {
    return (

    <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Registro de Ponto</h1>
          <p className="text-gray-600">
            {currentTime.toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <Badge variant="outline" className="text-green-600">
              <Wifi className="h-3 w-3 mr-1" />
              Online
            </Badge>
          ) : (
            <Badge variant="outline" className="text-red-600">
              <WifiOff className="h-3 w-3 mr-1" />
              Offline
            </Badge>
          )}
        </div>
      </div>

      {/* Relógio */}
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-6xl font-mono font-bold text-gray-900 mb-4">
            {currentTime.toLocaleTimeString('pt-BR')}
          </div>
          <p className="text-lg text-gray-600">
            {workSchedule?.nome || 'Escala padrão'}
          </p>
        </CardContent>
      </Card>

      {/* Status do dia */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Hoje</CardTitle>
          <CardDescription>
            Seus registros de ponto para hoje
            {!todayRecord && (
              <span className="text-orange-600 font-medium ml-2">
                (Nenhum registro encontrado para hoje)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!todayRecord ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">
                Nenhum registro de ponto encontrado para hoje
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Faça sua primeira marcação clicando no botão abaixo
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { key: 'entrada', label: 'Entrada', time: todayRecord?.entrada },
                { key: 'entrada_almoco', label: 'Início Almoço', time: todayRecord?.entrada_almoco },
                { key: 'saida_almoco', label: 'Fim Almoço', time: todayRecord?.saida_almoco },
                { key: 'saida', label: 'Saída', time: todayRecord?.saida },
                { key: 'entrada_extra1', label: 'Entrada Extra', time: todayRecord?.entrada_extra1 },
                { key: 'saida_extra1', label: 'Saída Extra', time: todayRecord?.saida_extra1 }
              ].map((record) => {
                const isCompleted = !!record.time;
                const isNext = nextRecordType === record.key;
                
                return (
                  
      <div
                    key={record.key}
                    className={`p-4 rounded-lg border-2 ${
                      isCompleted 
                        ? 'border-green-200 bg-green-50' 
                        : isNext 
                          ? 'border-blue-200 bg-blue-50' 
                          : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {record.label}
                      </span>
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : isNext ? (
                        <AlertCircle className="h-4 w-4 text-blue-500" />
                      ) : null}
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatTime(record.time)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botão de registro */}
      {!isAllRecordsDone && (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {!todayRecord ? 'Primeiro Registro' : 'Próximo Registro'}
              </h3>
              <p className="text-gray-600">
                {nextRecordType && getRecordTypeInfo(nextRecordType).label}
              </p>
            </div>
            
            <Button
              size="lg"
              className="w-full max-w-md"
              onClick={() => nextRecordType && registerTimeMutation.mutate(nextRecordType)}
              disabled={registerTimeMutation.isPending || !isOnline}
            >
              {registerTimeMutation.isPending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              ) : (
                <Clock className="h-5 w-5 mr-2" />
              )}
              Registrar {nextRecordType && getRecordTypeInfo(nextRecordType).label}
            </Button>
            
            {!isOnline && (
              <Alert className="mt-4">
                <WifiOff className="h-4 w-4" />
                <AlertDescription>
                  Você está offline. O registro será salvo localmente e sincronizado quando voltar online.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dia completo */}
      {isAllRecordsDone && (
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Dia Completo!
            </h3>
            <p className="text-gray-600">
              Todos os registros de ponto foram feitos hoje.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Informações da escala */}
      {workSchedule && (
        <Card>
          <CardHeader>
            <CardTitle>Informações da Escala</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Horário:</span>
                <p className="text-gray-600">
                  {workSchedule.horario_inicio} - {workSchedule.horario_fim}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Intervalo:</span>
                <p className="text-gray-600">
                  {workSchedule.intervalo_almoco} minutos
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Tolerância:</span>
                <p className="text-gray-600">
                  {workSchedule.tolerancia_entrada} min entrada / {workSchedule.tolerancia_saida} min saída
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    );
}
