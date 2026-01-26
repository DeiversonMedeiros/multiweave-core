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
import { RequirePage } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { useEmployeeByUserId } from '@/hooks/rh/useEmployees';
import { EntityService } from '@/services/generic/entityService';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { offlineSyncService } from '@/services/offlineSyncService';
import { useOfflineAuth } from '@/hooks/useOfflineAuth';
import { TimeRecordRegistrationModalV2 } from '@/components/rh/TimeRecordRegistrationModalV2';
import { useTimeRecordSettings, calculateTimeRemaining } from '@/hooks/rh/useTimeRecordSettings';
import { formatDateOnly } from '@/lib/utils';

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
  latitude?: number;
  longitude?: number;
  endereco?: string;
  foto_url?: string;
  localizacao_type?: string;
  outside_zone?: boolean;
  // Campos adicionais para datas reais quando diferentes de base_date
  base_date?: string;
  window_hours?: number;
  saida_date?: string;
  entrada_almoco_date?: string;
  saida_almoco_date?: string;
  entrada_extra1_date?: string;
  saida_extra1_date?: string;
}

// Função auxiliar para obter data local no formato YYYY-MM-DD
const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function RegistroPontoPage() {
  const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineRecords, setOfflineRecords] = useState<any[]>([]);
  const { isReady, saveOfflineRecord, getOfflineRecords, markAsSynced } = useOfflineStorage();
  const { isOfflineAuthenticated, getOfflineUser } = useOfflineAuth();
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [pendingRegistrationType, setPendingRegistrationType] = useState<TimeRecordType | null>(null);

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

    window.addEventListener('online', () => { console.log('[PONTO] ⚡ online event'); handleOnline(); });
    window.addEventListener('offline', () => { console.log('[PONTO] ⚡ offline event'); handleOffline(); });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Buscar funcionário (deve vir antes de qualquer uso de "employee")
  const { data: employee } = useEmployeeByUserId(user?.id || '');

  // Cache de dados offline
  const [offlineEmployee, setOfflineEmployee] = useState<any>(null);
  const [offlineTodayRecord, setOfflineTodayRecord] = useState<TimeRecord | null>(null);
  const [offlineWorkSchedule, setOfflineWorkSchedule] = useState<any>(null);

  // Usar dados em cache quando offline, dados online quando online
  const currentEmployee = isOnline ? employee : offlineEmployee;
  const hasEmployee = !!currentEmployee?.id;

  useEffect(() => {
    console.log('[PONTO][EMPLOYEE] estado alterado:', {
      userId: user?.id,
      selectedCompanyId: selectedCompany?.id,
      employeeFromQuery: employee ? { id: employee.id, nome: employee.nome, company_id: employee.company_id } : null,
      offlineEmployee: offlineEmployee ? { id: offlineEmployee.id, nome: offlineEmployee.nome, company_id: offlineEmployee.company_id } : null,
      usingOffline: !isOnline,
      hasEmployee
    });
  }, [employee, offlineEmployee, user?.id, selectedCompany?.id, isOnline, hasEmployee]);

  useEffect(() => {
    console.log('[PONTO][MODAL] estado atualizado:', {
      registrationModalOpen,
      pendingRegistrationType,
      currentEmployeeId: currentEmployee?.id
    });
  }, [registrationModalOpen, pendingRegistrationType, currentEmployee?.id]);
  
  // Buscar configurações de ponto eletrônico
  const { data: timeRecordSettings } = useTimeRecordSettings();
  const windowHours = timeRecordSettings?.janela_tempo_marcacoes ?? 24;

  // Buscar registro de hoje usando função RPC consolidada (apenas quando online)
  const { data: todayRecord, isLoading: recordLoading } = useQuery({
    queryKey: ['today-time-record-consolidated', employee?.id, selectedCompany?.id, windowHours],
    queryFn: async () => {
      if (!employee?.id || !selectedCompany?.id) return null;
      
      // Usar data local ao invés de UTC para evitar problemas de timezone
      const now = new Date();
      const today = getLocalDateString(now);
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      console.log('🔍 Buscando registro consolidado de ponto para:', {
        employeeId: employee.id,
        companyId: selectedCompany.id,
        targetDate: today,
        timezone,
        windowHours
      });
      
      try {
        // Usar a nova função RPC que consolida registros considerando a janela de tempo
        const { data, error } = await supabase.rpc('get_consolidated_time_record_by_window', {
          p_employee_id: employee.id,
          p_company_id: selectedCompany.id,
          p_target_date: today,
          p_timezone: timezone
        });

        if (error) {
          console.error('❌ Erro ao buscar registro consolidado:', error);
          return null;
        }

        if (!data) {
          console.log('📅 Nenhum registro encontrado para hoje');
          return null;
        }

        console.log('✅ Registro consolidado encontrado:', {
          id: data.id,
          base_date: data.base_date,
          entrada: data.entrada,
          entrada_almoco: data.entrada_almoco,
          saida_almoco: data.saida_almoco,
          saida: data.saida,
          saida_date: data.saida_date,
          entrada_extra1: data.entrada_extra1,
          entrada_extra1_date: data.entrada_extra1_date,
          saida_extra1: data.saida_extra1,
          saida_extra1_date: data.saida_extra1_date,
          window_hours: data.window_hours
        });

        return data as TimeRecord;
      } catch (error) {
        console.error('❌ Erro ao buscar registro consolidado:', error);
        return null;
      }
    },
    enabled: isOnline && !!employee?.id && !!selectedCompany?.id,
    retry: 2,
    staleTime: 0 // Sempre buscar dados frescos
  });

  // Usar registro em cache quando offline, registro online quando online
  const currentTodayRecord = isOnline ? todayRecord : offlineTodayRecord;
  useEffect(() => {
    if (!currentTodayRecord) {
      console.log('[PONTO][STATE] currentTodayRecord ausente após busca', {
        isOnline,
        windowHours,
        employeeId: currentEmployee?.id,
        companyId: selectedCompany?.id
      });
      return;
    }

    console.log('[PONTO][STATE] currentTodayRecord atualizado', {
      id: currentTodayRecord.id,
      dataRegistro: currentTodayRecord.data_registro,
      entrada: currentTodayRecord.entrada,
      entradaAlmoco: currentTodayRecord.entrada_almoco,
      saidaAlmoco: currentTodayRecord.saida_almoco,
      saida: currentTodayRecord.saida,
      entradaExtra: currentTodayRecord.entrada_extra1,
      saidaExtra: currentTodayRecord.saida_extra1,
      windowHours,
      isOnline
    });
  }, [currentTodayRecord, windowHours, isOnline, currentEmployee?.id, selectedCompany?.id]);
  
  const todayLocalDate = getLocalDateString(currentTime);

  const getRecordWindowState = (record: TimeRecord | null) => {
    if (!record) return null;

    // Se a data já é de hoje, sempre mostrar
    if (record.data_registro === todayLocalDate) {
      return {
        isWithinWindow: true,
        reason: 'same-day',
        hoursElapsed: 0,
        firstMark: record.entrada || record.entrada_almoco || record.saida_almoco || record.saida || record.entrada_extra1 || record.saida_extra1 || null
      };
    }

    const firstMark =
      record.entrada ||
      record.entrada_almoco ||
      record.saida_almoco ||
      record.saida ||
      record.entrada_extra1 ||
      record.saida_extra1 ||
      null;

    if (!firstMark) {
      return {
        isWithinWindow: false,
        reason: 'missing-first-mark',
        hoursElapsed: null,
        firstMark: null
      };
    }

    const firstMarkDate = new Date(`${record.data_registro}T${firstMark}`);
    if (Number.isNaN(firstMarkDate.getTime())) {
      return {
        isWithinWindow: false,
        reason: 'invalid-first-mark',
        hoursElapsed: null,
        firstMark
      };
    }

    const hoursElapsed = (currentTime.getTime() - firstMarkDate.getTime()) / (1000 * 60 * 60);
    return {
      isWithinWindow: hoursElapsed <= windowHours,
      reason: hoursElapsed <= windowHours ? 'inside-window' : 'window-expired',
      hoursElapsed,
      firstMark
    };
  };

  const recordWindowState = getRecordWindowState(currentTodayRecord);
  const displayTodayRecord = recordWindowState?.isWithinWindow ? currentTodayRecord : null;
  const showPreviousDayBanner = !!currentTodayRecord && currentTodayRecord.data_registro !== todayLocalDate && recordWindowState?.isWithinWindow;
  
  useEffect(() => {
    if (currentTodayRecord && !recordWindowState?.isWithinWindow) {
      console.log('[PONTO][STATE] Registro atual não será exibido em "Registros de Hoje"', {
        recordId: currentTodayRecord.id,
        dataRegistro: currentTodayRecord.data_registro,
        todayLocalDate,
        windowHours,
        reason: recordWindowState?.reason,
        hoursElapsed: recordWindowState?.hoursElapsed,
        firstMark: recordWindowState?.firstMark
      });
    }
  }, [currentTodayRecord, recordWindowState, todayLocalDate, windowHours]);
  
  // Calcular tempo restante na janela (se houver primeira marcação)
  const firstMarkTime = displayTodayRecord?.entrada 
    ? new Date(`${displayTodayRecord.data_registro}T${displayTodayRecord.entrada}`)
    : null;
  
  const timeRemaining = calculateTimeRemaining(
    firstMarkTime,
    windowHours
  );

  // Buscar escala de trabalho (apenas quando online)
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
    enabled: isOnline && !!employee?.work_schedule_id && !!selectedCompany?.id
  });

  // Usar escala em cache quando offline, escala online quando online
  const currentWorkSchedule = isOnline ? workSchedule : offlineWorkSchedule;

  // Salvar dados no cache quando carregados online
  useEffect(() => {
    if (isOnline && employee) {
      try {
        localStorage.setItem('cached_employee', JSON.stringify(employee));
        setOfflineEmployee(employee);
      } catch (error) {
        console.error('Erro ao salvar funcionário no cache:', error);
      }
    }
  }, [employee, isOnline]);

  useEffect(() => {
    if (isOnline && todayRecord) {
      try {
        localStorage.setItem('cached_today_record', JSON.stringify(todayRecord));
        setOfflineTodayRecord(todayRecord);
      } catch (error) {
        console.error('Erro ao salvar registro no cache:', error);
      }
    }
  }, [todayRecord, isOnline]);

  useEffect(() => {
    if (isOnline && workSchedule) {
      try {
        localStorage.setItem('cached_work_schedule', JSON.stringify(workSchedule));
        setOfflineWorkSchedule(workSchedule);
      } catch (error) {
        console.error('Erro ao salvar escala no cache:', error);
      }
    }
  }, [workSchedule, isOnline]);

  // Carregar dados do cache quando offline (apenas uma vez quando fica offline)
  useEffect(() => {
    if (!isOnline && !offlineEmployee && !offlineTodayRecord) {
      try {
        const cachedEmployee = localStorage.getItem('cached_employee');
        const cachedRecord = localStorage.getItem('cached_today_record');
        const cachedSchedule = localStorage.getItem('cached_work_schedule');
        
        if (cachedEmployee && !offlineEmployee) {
          setOfflineEmployee(JSON.parse(cachedEmployee));
        }
        if (cachedRecord && !offlineTodayRecord) {
          setOfflineTodayRecord(JSON.parse(cachedRecord));
        }
        if (cachedSchedule && !offlineWorkSchedule) {
          setOfflineWorkSchedule(JSON.parse(cachedSchedule));
        }
      } catch (error) {
        console.error('[PONTO] Erro ao carregar dados do cache:', error);
      }
    }
  }, [isOnline, offlineEmployee, offlineTodayRecord, offlineWorkSchedule]);

  // Carregar registros offline (apenas quando isReady muda)
  useEffect(() => {
    if (!isReady) return;
    
    const loadOfflineRecords = async () => {
      try {
        console.log('[PONTO] 🔎 loading offline records...');
        const records = await getOfflineRecords('time_record');
        console.log('[PONTO] 📦 offline records loaded:', records);
        // Filtrar apenas registros não sincronizados para exibição
        const unsyncedRecords = records.filter(r => !r.synced);
        console.log('[PONTO] 📦 unsynced offline records:', unsyncedRecords);
        setOfflineRecords(unsyncedRecords);
      } catch (error) {
        console.error('[PONTO] ❌ erro ao carregar registros offline:', error);
      }
    };

    loadOfflineRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]); // Removido getOfflineRecords das dependências para evitar loop

  // Sincronizar registros offline quando voltar online
  useEffect(() => {
    const syncOfflineRecords = async () => {
      console.log('[PONTO] 🔁 syncOfflineRecords triggered:', { isOnline, isReady });
      if (!isOnline || !isReady) { console.log('[PONTO] ⏭️ sync skipped'); return; }

      try {
        const offlineRecords = await getOfflineRecords('time_record');
        console.log('[PONTO] 📋 offlineRecords for sync:', offlineRecords);
        const unsyncedRecords = offlineRecords.filter(r => !r.synced);
        console.log('[PONTO] 📋 unsyncedRecords:', unsyncedRecords);
        
        if (unsyncedRecords.length === 0) return;

        console.log(`🔄 Sincronizando ${unsyncedRecords.length} registro(s) offline...`);

        // Agrupar registros por data e funcionário para consolidar
        const groupedRecords = new Map<string, any[]>();
        
        unsyncedRecords.forEach(record => {
          const key = `${record.data.data_registro}_${record.data.employee_id}`;
          if (!groupedRecords.has(key)) {
            groupedRecords.set(key, []);
          }
          groupedRecords.get(key)!.push(record);
        });

        // Processar cada grupo (geralmente será apenas um grupo)
        for (const [key, records] of groupedRecords.entries()) {
          try {
            // Consolidar múltiplas marcações do mesmo dia em um único registro
            const consolidatedData = { ...records[0].data };
            console.log('[PONTO] 🧩 consolidating group', key, records, '=> base:', consolidatedData);
            
            // Adicionar todas as marcações dos registros offline
            records.forEach(record => {
              if (record.data.entrada && !consolidatedData.entrada) consolidatedData.entrada = record.data.entrada;
              if (record.data.entrada_almoco && !consolidatedData.entrada_almoco) consolidatedData.entrada_almoco = record.data.entrada_almoco;
              if (record.data.saida_almoco && !consolidatedData.saida_almoco) consolidatedData.saida_almoco = record.data.saida_almoco;
              if (record.data.saida && !consolidatedData.saida) consolidatedData.saida = record.data.saida;
              if (record.data.entrada_extra1 && !consolidatedData.entrada_extra1) consolidatedData.entrada_extra1 = record.data.entrada_extra1;
              if (record.data.saida_extra1 && !consolidatedData.saida_extra1) consolidatedData.saida_extra1 = record.data.saida_extra1;
              // Preservar ID se algum registro tiver
              if (record.data.id && !consolidatedData.id) consolidatedData.id = record.data.id;
            });

            // Adicionar à fila de sincronização
            console.log('[PONTO] 🚀 enqueue consolidated record to sync:', consolidatedData);
            offlineSyncService.addToQueue('time_record', consolidatedData);
            
            // Marcar todos os registros do grupo como sincronizados
            for (const record of records) {
              await markAsSynced(record.id);
              console.log('[PONTO] ✅ marked as synced (local):', record.id);
            }
            
            console.log(`✅ ${records.length} registro(s) consolidado(s) e adicionado(s) à fila de sincronização`);
          } catch (error) {
            console.error('[PONTO] ❌ erro ao consolidar/sincronizar grupo:', error);
          }
        }
        
        // Aguardar um pouco antes de recarregar para dar tempo da sincronização iniciar
        setTimeout(async () => {
          const allRecords = await getOfflineRecords('time_record');
          // Filtrar apenas registros não sincronizados
          const unsyncedRecords = allRecords.filter(r => !r.synced);
          console.log('[PONTO] 🔄 refreshed offline records after enqueue:', {
            total: allRecords.length,
            unsynced: unsyncedRecords.length,
            records: unsyncedRecords
          });
          setOfflineRecords(unsyncedRecords);
        }, 1000);
        
      } catch (error) {
        console.error('[PONTO] ❌ erro no syncOfflineRecords:', error);
      }
    };

    syncOfflineRecords();
  }, [isOnline, isReady, getOfflineRecords, markAsSynced]);

  // Handler para confirmação do modal de registro (com foto e localização)
  const handleRegistrationConfirm = async (type: TimeRecordType, registrationData: {
    photoUrl: string;
    latitude: number;
    longitude: number;
    address: string;
    localizacao_type: 'gps' | 'manual' | 'wifi';
    outsideZone: boolean;
  }) => {
    console.log('[PONTO][CONFIRM] ✅ handleRegistrationConfirm chamado', {
      type,
      hasPhotoUrl: !!registrationData.photoUrl,
      latitude: registrationData.latitude,
      longitude: registrationData.longitude,
      address: registrationData.address,
      localizacao_type: registrationData.localizacao_type,
      outsideZone: registrationData.outsideZone,
      employeeId: currentEmployee?.id,
      companyId: selectedCompany?.id,
      timestamp: new Date().toISOString()
    });
    
    // Fechar modal primeiro
    console.log('[PONTO][CONFIRM] 🔒 Fechando modal...');
    setRegistrationModalOpen(false);
    
    // Executar registro com os dados do modal
    console.log('[PONTO][CONFIRM] 📤 Chamando registerTimeMutation.mutate');
    registerTimeMutation.mutate({
      type,
      registrationData
    });
  };

  // Mutação para registrar ponto
  const registerTimeMutation = useMutation({
    mutationFn: async (params: {
      type: TimeRecordType;
      registrationData?: {
        photoUrl: string;
        latitude: number;
        longitude: number;
        address: string;
        localizacao_type: 'gps' | 'manual' | 'wifi';
        outsideZone: boolean;
      };
    }) => {
      const { type, registrationData } = params;
      console.log('[PONTO][MUTATION] 🚀 registerTimeMutation iniciada', {
        type,
        isOnline,
        hasRegistrationData: !!registrationData,
        employeeId: currentEmployee?.id,
        companyId: selectedCompany?.id,
        timestamp: new Date().toISOString()
      });
      
      if (!currentEmployee?.id || !selectedCompany?.id) {
        console.error('[PONTO][MUTATION] ❌ Dados ausentes', {
          hasEmployee: !!currentEmployee?.id,
          hasCompany: !!selectedCompany?.id
        });
        throw new Error('Dados do funcionário ou empresa não encontrados');
      }

      const now = new Date();
      const timeString = now.toTimeString().split(' ')[0];
      const dateString = getLocalDateString(now); // Usar data local ao invés de UTC
      
      console.log('[PONTO][MUTATION] 📅 Timestamps gerados', {
        dateString,
        timeString,
        nowISO: now.toISOString()
      });
      
      // Helper: Criar timestamp UTC literal preservando horário local
      // Isso evita conversão de timezone (ex: 21:37 local não vira 00:37 UTC)
      const createUTCTimestamp = (date: Date): string => {
        const localDateStr = getLocalDateString(date);
        const localTimeStr = date.toTimeString().split(' ')[0];
        return `${localDateStr}T${localTimeStr}Z`; // Adicionar 'Z' para indicar UTC literal
      };
      
      const utcTimestamp = createUTCTimestamp(now);

      const recordData: any = {
        employee_id: currentEmployee.id,
        data_registro: dateString,
        [type]: timeString,
        status: 'pendente',
        company_id: selectedCompany.id,
        created_at: utcTimestamp,  // Usar UTC literal para preservar horário local
        updated_at: utcTimestamp,  // Usar UTC literal para preservar horário local
        outside_zone: registrationData?.outsideZone ?? false,
        ...(currentTodayRecord && { id: currentTodayRecord.id })
      };
      
      console.log('[PONTO] 🔧 Criando novo registro com timestamps:', {
        created_at: recordData.created_at,
        updated_at: recordData.updated_at,
        horario_local: `${dateString} ${timeString}`
      });

      // Adicionar dados de localização e foto se fornecidos (modo online com validações)
      if (registrationData) {
        console.log('[PONTO][MUTATION] 📍 Adicionando dados de localização e foto', {
          latitude: registrationData.latitude,
          longitude: registrationData.longitude,
          address: registrationData.address,
          localizacao_type: registrationData.localizacao_type,
          outsideZone: registrationData.outsideZone,
          hasPhotoUrl: !!registrationData.photoUrl
        });
        
        recordData.latitude = registrationData.latitude;
        recordData.longitude = registrationData.longitude;
        recordData.endereco = registrationData.address;
        recordData.foto_url = registrationData.photoUrl;
        recordData.localizacao_type = registrationData.localizacao_type;
      }

      const saveLocally = async () => {
        console.log('[PONTO] 💾 saving locally (offline path)');
        try {
          await saveOfflineRecord('time_record', recordData);
          console.log('[PONTO] 💾 IndexedDB saved:', recordData);
        } catch (e) {
          try {
            const raw = localStorage.getItem('offline_backup_queue');
            const queue = raw ? JSON.parse(raw) : [];
            queue.push(recordData);
            localStorage.setItem('offline_backup_queue', JSON.stringify(queue));
            console.warn('[PONTO] 💾 fallback localStorage queue used:', queue.length);
          } catch {}
        }
        // Atualiza cache visual
      if (displayTodayRecord) {
        const updatedRecord = { 
          ...displayTodayRecord, 
            [type]: timeString,
          outside_zone: registrationData?.outsideZone ?? displayTodayRecord?.outside_zone ?? false
          } as any;
          setOfflineTodayRecord(updatedRecord);
          localStorage.setItem('cached_today_record', JSON.stringify(updatedRecord));
          console.log('[PONTO] 🖼️ updated cached_today_record (existing):', updatedRecord);
        } else {
          const newRecord = {
            id: `temp_${Date.now()}`,
            employee_id: currentEmployee.id,
            data_registro: dateString,
            [type]: timeString,
            status: 'pendente',
            outside_zone: registrationData?.outsideZone ?? false
          };
          setOfflineTodayRecord(newRecord as TimeRecord);
          localStorage.setItem('cached_today_record', JSON.stringify(newRecord));
          console.log('[PONTO] 🖼️ created cached_today_record (new):', newRecord);
        }
        return { offline: true, type, data: recordData } as any;
      };

      if (!isOnline) {
        console.log('[PONTO][MUTATION] 📴 Modo offline - salvando localmente');
        const res = await saveLocally();
        console.log('[PONTO][MUTATION] ✅ Registro salvo offline com sucesso', {
          type,
          offline: res.offline,
          timestamp: new Date().toISOString()
        });
        return res;
      }
      
      console.log('[PONTO][MUTATION] 🌐 Modo online - processando registro remoto');

      try {
        let timeRecordId: string;
        let timeRecordResult: any;

        // Mapear tipo de registro para event_type
        const eventTypeMap: Record<TimeRecordType, string> = {
          entrada: 'entrada',
          saida: 'saida',
          entrada_almoco: 'entrada_almoco',
          saida_almoco: 'saida_almoco',
          entrada_extra1: 'extra_inicio',
          saida_extra1: 'extra_fim'
        };
        const eventType = eventTypeMap[type];

        // Validar janela de tempo antes de criar/atualizar
        let validDate = dateString;
        let shouldCreateNew = !currentTodayRecord;
        
        if (currentTodayRecord) {
          try {
            const { TimeRecordSettingsService } = await import('@/services/rh/timeRecordSettingsService');
            const validation = await TimeRecordSettingsService.validateTimeWindow(
              currentEmployee.id,
              selectedCompany.id,
              dateString,
              timeString
            );

            if (validation) {
              validDate = validation.valid_date;
              shouldCreateNew = validation.is_new_record;
              
              console.log('[PONTO] 🔍 Validação de janela:', {
                validDate,
                shouldCreateNew,
                hoursElapsed: validation.hours_elapsed,
                windowHours: validation.window_hours,
                firstMarkTime: validation.first_mark_time
              });

              // Se está fora da janela, atualizar data_registro
              if (shouldCreateNew && validDate !== dateString) {
                recordData.data_registro = validDate;
                console.log('[PONTO] ⚠️ Fora da janela de tempo, criando novo registro para:', validDate);
              }
            }
          } catch (windowErr) {
            console.warn('[PONTO] ⚠️ Erro ao validar janela de tempo, continuando com lógica padrão:', windowErr);
          }
        }

        if (shouldCreateNew) {
          // Criar novo registro (pode ser porque não existe ou porque está fora da janela)
          console.log('[PONTO][MUTATION] ➕ Criando novo registro', {
            recordData: {
              ...recordData,
              foto_url: recordData.foto_url ? recordData.foto_url.substring(0, 50) + '...' : null
            }
          });
          
          const createStartTime = performance.now();
          timeRecordResult = await EntityService.create({
            schema: 'rh',
            table: 'time_records',
            companyId: selectedCompany.id,
            data: recordData
          });
          const createElapsed = performance.now() - createStartTime;
          
          console.log('[PONTO][MUTATION] ✅ Registro criado com sucesso', {
            result: timeRecordResult,
            elapsed: `${createElapsed.toFixed(2)}ms`,
            timestamp: new Date().toISOString()
          });
          
          timeRecordId = timeRecordResult.id || timeRecordResult.data?.id;
        } else {
          // Atualizar registro existente
          console.log('[PONTO][MUTATION] 🔄 Atualizando registro existente', {
            recordId: currentTodayRecord.id,
            type,
            timeString
          });
          
          // IMPORTANTE: Usar UTC literal para preservar horário local
          const updateData: any = {
            [type]: timeString,
            updated_at: utcTimestamp,  // Usar UTC literal ao invés de now.toISOString()
            outside_zone: registrationData?.outsideZone ?? currentTodayRecord?.outside_zone ?? false
          };
          
          console.log('[PONTO][MUTATION] 🔧 updated_at usando UTC literal:', {
            horario_local: `${dateString} ${timeString}`,
            timestamp_enviado: utcTimestamp,
            comparacao: {
              toISOString: now.toISOString(),
              utcLiteral: utcTimestamp,
              diferenca: 'UTC literal preserva horário, toISOString() converte para UTC'
            }
          });

          // Adicionar dados de localização e foto se fornecidos
          if (registrationData) {
            console.log('[PONTO][MUTATION] 📍 Adicionando dados de localização e foto ao update', {
              latitude: registrationData.latitude,
              longitude: registrationData.longitude,
              address: registrationData.address,
              localizacao_type: registrationData.localizacao_type,
              hasPhotoUrl: !!registrationData.photoUrl
            });
            
            updateData.latitude = registrationData.latitude;
            updateData.longitude = registrationData.longitude;
            updateData.endereco = registrationData.address;
            updateData.foto_url = registrationData.photoUrl;
            updateData.localizacao_type = registrationData.localizacao_type;
          }

          const updateStartTime = performance.now();
          timeRecordResult = await EntityService.update({
            schema: 'rh',
            table: 'time_records',
            companyId: selectedCompany.id,
            id: currentTodayRecord.id,
            data: updateData
          });
          const updateElapsed = performance.now() - updateStartTime;
          
          console.log('[PONTO][MUTATION] ✅ Registro atualizado com sucesso', {
            result: timeRecordResult,
            elapsed: `${updateElapsed.toFixed(2)}ms`,
            timestamp: new Date().toISOString()
          });
          
          timeRecordId = currentTodayRecord.id;
        }

        // Criar evento nas novas tabelas (sempre criar, mesmo sem foto/localização)
        if (timeRecordId) {
          try {
            console.log('[PONTO] 📝 Criando evento nas novas tabelas:', { 
              timeRecordId, 
              eventType, 
              hasRegistrationData: !!registrationData,
              registrationDataKeys: registrationData ? Object.keys(registrationData) : []
            });

            // Criar data/hora combinada para event_at usando horário local
            // O problema: JavaScript converte para UTC ao fazer toISOString()
            // Solução: Criar string ISO com timezone offset local preservado
            const [year, month, day] = dateString.split('-').map(Number);
            const [hour, minute, second] = timeString.split(':').map(Number);
            
            // Criar data no timezone local
            const localDate = new Date();
            localDate.setFullYear(year, month - 1, day);
            localDate.setHours(hour, minute, second || 0, 0);
            
            // Obter offset do timezone local (em minutos)
            // getTimezoneOffset() retorna positivo para timezones ATRÁS de UTC (ex: UTC-3 = 180)
            const offsetMinutes = localDate.getTimezoneOffset();
            // Converter para horas e minutos, invertendo o sinal (positivo = atrás de UTC = negativo)
            const offsetHours = Math.floor(offsetMinutes / 60);
            const offsetMins = offsetMinutes % 60;
            
            // Criar string ISO com offset preservando o horário local
            // Para UTC-3: offsetMinutes = 180, offsetHours = 3, sign = '-', str = "-03:00"
            // Para UTC+5: offsetMinutes = -300, offsetHours = -5, sign = '+', str = "+05:00"
            const offsetSign = offsetHours <= 0 ? '+' : '-';
            const offsetHoursAbs = Math.abs(offsetHours);
            const offsetMinsAbs = Math.abs(offsetMins);
            const offsetStr = `${offsetSign}${offsetHoursAbs.toString().padStart(2, '0')}:${offsetMinsAbs.toString().padStart(2, '0')}`;
            
            // Criar string ISO: "2025-10-30T21:29:00-03:00"
            const isoStringWithOffset = `${dateString}T${timeString}${offsetStr}`;
            
            // Criar Date object que preserva o horário local quando enviado ao banco
            const eventAt = new Date(isoStringWithOffset);
            
            // Log detalhado para debug de timezone
            console.group('[PONTO] 📅 DEBUG TIMEZONE - event_at calculado');
            console.log('📌 Inputs:', {
              inputDate: dateString,
              inputTime: timeString,
              horarioDigitado: `${dateString} ${timeString}`,
            });
            console.log('🌍 Timezone Info:', {
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              offsetMinutes,
              offsetHours,
              offsetStr,
            });
            console.log('📝 Strings geradas:', {
              isoStringWithOffset,
              eventAtISO: eventAt.toISOString(),
              eventAtUTC: eventAt.toISOString(),
            });
            console.log('🕐 Conversões:', {
              localDateStr: localDate.toLocaleString('pt-BR'),
              eventAtLocalBR: eventAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
              eventAtLocalUTC: eventAt.toLocaleString('pt-BR', { timeZone: 'UTC' }),
            });
            console.log('⚠️ PROBLEMA: Se enviarmos com offset (-03:00), PostgreSQL converte para UTC');
            console.log('   Enviado:', isoStringWithOffset);
            console.log('   Esperado no banco (UTC):', eventAt.toISOString());
            console.log('   O que o usuário vê no banco será convertido de volta para timezone local');
            console.groupEnd();
            
            // PROBLEMA: PostgreSQL timestamptz sempre armazena em UTC
            // Se enviarmos '2025-10-30T21:37:25-03:00', ele converte para UTC: '2025-10-31T00:37:25+00:00'
            // SOLUÇÃO: Enviar o horário já como UTC, mas ajustado para que o horário "literal" seja preservado
            // Estratégia: Criar uma data como se o horário digitado já fosse UTC
            // Exemplo: usuário digitou 21:37 -> enviar como '2025-10-30T21:37:25Z' (UTC)
            // O PostgreSQL vai armazenar como UTC, e quando exibirmos, vai mostrar 21:37 (assumindo UTC como base)
            const eventAtAsUTC = `${dateString}T${timeString}Z`; // Adicionar 'Z' para indicar UTC
            
            console.log('[PONTO] 🔧 Estratégia de Timezone:', {
              problema: 'PostgreSQL timestamptz converte para UTC',
              solucao: 'Enviar horário como se já fosse UTC (preserva horário literal)',
              horario_digitado: `${dateString} ${timeString}`,
              enviando_como: eventAtAsUTC,
              diferenca: 'Enviar sem offset faz PostgreSQL tratar como UTC literal'
            });
            
            // Criar registro em time_record_events
            const eventData: any = {
              time_record_id: timeRecordId,
              employee_id: currentEmployee.id,
              company_id: selectedCompany.id,
              event_type: eventType,
              event_at: eventAtAsUTC,  // Enviar como UTC para preservar horário literal
              outside_zone: registrationData?.outsideZone ?? false
            };

            // Adicionar dados de localização se disponíveis
            if (registrationData) {
              if (registrationData.latitude !== undefined && registrationData.longitude !== undefined) {
                eventData.latitude = registrationData.latitude;
                eventData.longitude = registrationData.longitude;
                console.log('[PONTO] 📍 Localização adicionada:', { lat: eventData.latitude, lon: eventData.longitude });
                
                // Sempre adicionar endereço: usar o address se disponível, senão usar coordenadas como fallback
                if (registrationData.address) {
                  eventData.endereco = registrationData.address;
                  console.log('[PONTO] 🏠 Endereço adicionado:', eventData.endereco);
                } else {
                  // Fallback: usar coordenadas como endereço se não houver address
                  eventData.endereco = `Coordenadas: ${registrationData.latitude.toFixed(6)}, ${registrationData.longitude.toFixed(6)}`;
                  console.log('[PONTO] 🏠 Endereço (fallback coordenadas):', eventData.endereco);
                }
              }
              if (registrationData.localizacao_type) {
                eventData.source = registrationData.localizacao_type;
                console.log('[PONTO] 📡 Tipo de localização:', eventData.source);
              }
            } else {
              console.log('[PONTO] ⚠️ Sem registrationData - criando evento sem localização/foto');
            }

            console.log('[PONTO] 📤 Enviando dados do evento:', {
              ...eventData,
              event_at_detalhado: {
                valor_enviado: eventData.event_at,
                interpretacao: 'PostgreSQL vai converter para UTC antes de salvar',
                valor_esperado_em_utc: eventAt.toISOString()
              }
            });

            // ✅ ESTRATÉGIA CORRETA: Usar EntityService (que usa RPC internamente)
            // Nunca usar .from('rh.time_record_events') diretamente
            const eventResult = await EntityService.create({
              schema: 'rh',
              table: 'time_record_events',
              companyId: selectedCompany.id,
              data: eventData
            });
            console.log('[PONTO] ✅ time_record_event created:', eventResult);
            console.log('[PONTO] 📊 Verificação de timezone:', {
              enviado: eventData.event_at,
              retornado_do_banco: eventResult.event_at || eventResult.data?.event_at,
              horario_digitado_original: `${dateString} ${timeString}`,
              conversao_ocorrida: eventData.event_at !== (eventResult.event_at || eventResult.data?.event_at) ? 'SIM' : 'NÃO'
            });

            const eventId = eventResult.id || eventResult.data?.id;
            if (!eventId) {
              console.error('[PONTO] ❌ Evento criado mas sem ID retornado:', eventResult);
              throw new Error('Evento criado mas ID não retornado');
            }
            console.log('[PONTO] 🆔 Event ID:', eventId);

            // Criar registro em time_record_event_photos se houver foto
            // ✅ ESTRATÉGIA CORRETA: Usar RPC (não .from('rh.time_record_event_photos'))
            // Nota: time_record_event_photos não tem company_id, então usamos função RPC específica
            // que valida acesso através do company_id do evento relacionado
            if (eventId && registrationData?.photoUrl) {
              console.log('[PONTO] 📸 Criando registro de foto:', { eventId, photoUrl: registrationData.photoUrl });

              try {
                // ✅ Padrão correto: RPC function ao invés de acesso direto via REST API
                const { data: photoResult, error: photoError } = await supabase.rpc(
                  'insert_time_record_event_photo',
                  {
                    p_event_id: eventId,
                    p_photo_url: registrationData.photoUrl
                  }
                );

                if (photoError) {
                  console.error('[PONTO] ❌ Erro ao criar foto:', photoError);
                  throw photoError;
                }

                console.log('[PONTO] ✅ time_record_event_photo created:', photoResult);
              } catch (photoError: any) {
                console.error('[PONTO] ❌ Erro ao criar foto (catch):', photoError);
                // Não relançar para não quebrar o fluxo principal
              }
            } else {
              console.log('[PONTO] ℹ️ Sem foto para registrar:', { eventId, hasPhotoUrl: !!registrationData?.photoUrl });
            }
          } catch (eventError) {
            // Log erro mas não falha o registro principal
            console.error('[PONTO] ❌ ERRO ao criar evento/foto:', eventError);
            console.error('[PONTO] ❌ Detalhes do erro:', {
              message: eventError instanceof Error ? eventError.message : String(eventError),
              stack: eventError instanceof Error ? eventError.stack : undefined
            });
            // Não relançar o erro para não quebrar o registro principal
          }
        } else {
          console.warn('[PONTO] ⚠️ Não foi possível criar evento: timeRecordId não encontrado');
        }

        return timeRecordResult;
      } catch {
        console.warn('[PONTO] ⚠️ remote register failed, falling back to local');
        const res = await saveLocally();
        console.log('[PONTO] ✅ registerTimeMutation done (fallback path):', res);
        return res;
      }
    },
    onSuccess: async (data, params) => {
      const { type } = params;
      console.log('[PONTO][MUTATION][SUCCESS] ✅ onSuccess chamado', {
        type,
        isOffline: data.offline,
        hasData: !!data,
        employeeId: currentEmployee?.id,
        timestamp: new Date().toISOString()
      });
      
      // Se foi salvo offline, não invalidar queries
      if (data.offline) {
        console.log('[PONTO][MUTATION][SUCCESS] 📴 Registro offline - atualizando interface local');
        toast({
          title: "Ponto registrado offline!",
          description: `Sincronizando quando a conexão voltar...`,
        });
        
        // Recarregar registros offline para atualizar interface
        const allRecords = await getOfflineRecords('time_record');
        const unsyncedRecords = allRecords.filter(r => !r.synced);
        console.log('[PONTO][MUTATION][SUCCESS] 🔄 Registros offline atualizados', {
          total: allRecords.length,
          unsynced: unsyncedRecords.length,
          records: unsyncedRecords
        });
        setOfflineRecords(unsyncedRecords);
        return;
      }

      console.log('[PONTO][MUTATION][SUCCESS] 🌐 Registro online - invalidando queries');
      
      // Invalidar e refetch a query para garantir que os dados mais recentes sejam carregados
      await queryClient.invalidateQueries({ queryKey: ['today-time-record-consolidated', currentEmployee?.id] });
      console.log('[PONTO][MUTATION][SUCCESS] 🔄 Queries invalidadas');
      
      // Aguardar um pouco para garantir que a query seja refetch
      setTimeout(() => {
        console.log('[PONTO][MUTATION][SUCCESS] 🔄 Refazendo fetch das queries');
        queryClient.refetchQueries({ queryKey: ['today-time-record-consolidated', currentEmployee?.id] });
      }, 500);
      
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
    onError: (error, params) => {
      console.error('[PONTO][MUTATION][ERROR] ❌ onError chamado', {
        error,
        errorMessage: error?.message,
        errorStack: error?.stack,
        params: {
          type: params.type,
          hasRegistrationData: !!params.registrationData
        },
        employeeId: currentEmployee?.id,
        companyId: selectedCompany?.id,
        isOnline,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Erro ao registrar ponto",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    }
  });

  // Determinar próximo tipo de registro considerando registros offline
  const getNextRecordType = (): TimeRecordType | null => {
    // Combinar registros online/em cache e offline
    const combinedRecord = { ...(displayTodayRecord || {}) } as TimeRecord | Record<string, any>;
    
    // Adicionar registros offline pendentes ao registro combinado
    offlineRecords.forEach(record => {
      if (!record.synced && record.data) {
        const { entrada, saida, entrada_almoco, saida_almoco, entrada_extra1, saida_extra1 } = record.data;
        if (entrada && !combinedRecord.entrada) combinedRecord.entrada = entrada;
        if (saida && !combinedRecord.saida) combinedRecord.saida = saida;
        if (entrada_almoco && !combinedRecord.entrada_almoco) combinedRecord.entrada_almoco = entrada_almoco;
        if (saida_almoco && !combinedRecord.saida_almoco) combinedRecord.saida_almoco = saida_almoco;
        if (entrada_extra1 && !combinedRecord.entrada_extra1) combinedRecord.entrada_extra1 = entrada_extra1;
        if (saida_extra1 && !combinedRecord.saida_extra1) combinedRecord.saida_extra1 = saida_extra1;
      }
    });
    
    const { entrada, saida, entrada_almoco, saida_almoco, entrada_extra1, saida_extra1 } = combinedRecord;
    
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
      todayRecord: currentTodayRecord,
      nextRecordType,
      isAllRecordsDone,
      employeeId: currentEmployee?.id,
      companyId: selectedCompany?.id,
      currentDate: new Date().toISOString().split('T')[0],
      offlineRecordsCount: offlineRecords.length,
      isOnline
    });
  }, [currentTodayRecord, nextRecordType, isAllRecordsDone, currentEmployee?.id, selectedCompany?.id, offlineRecords.length, isOnline]);

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

  // Handler dedicado para clique quando OFFLINE: salva imediato e não usa a mutação (evita spinner preso)
  const handleRegisterClick = async (type: TimeRecordType | null) => {
    if (!type) return;
    console.log('[PONTO] 🟢 handleRegisterClick:', { isOnline, type });

    if (!currentEmployee?.id) {
      console.warn('[PONTO][MODAL] tentativa de abrir modal sem employee');
      toast({
        title: 'Colaborador não encontrado',
        description: 'Não foi possível carregar seu cadastro. Recarregue a página ou contate o RH.',
        variant: 'destructive'
      });
      return;
    }

    if (isOnline) {
      console.log('[PONTO] 🌐 online path → abrindo modal de registro');
      console.log('[PONTO][MODAL] setando pendingRegistrationType e abrindo modal');
      // Quando online, abrir modal para capturar foto e localização
      setPendingRegistrationType(type);
      setRegistrationModalOpen(true);
      return;
    }

    // OFFLINE: salvar direto
    try {
      if (!currentEmployee?.id || !selectedCompany?.id) {
        console.error('[PONTO] ❗ dados ausentes para salvar offline', { emp: currentEmployee?.id, comp: selectedCompany?.id });
        toast({ title: 'Erro', description: 'Dados do funcionário/empresa ausentes', variant: 'destructive' });
        return;
      }

      const now = new Date();
      const timeString = now.toTimeString().split(' ')[0];
      const dateString = getLocalDateString(now); // Usar data local ao invés de UTC
      const recordData: any = {
        employee_id: currentEmployee.id,
        data_registro: dateString,
        [type]: timeString,
        status: 'pendente',
        company_id: selectedCompany.id,
        outside_zone: false,
        ...(displayTodayRecord && { id: displayTodayRecord.id })
      };

      console.log('[PONTO] 💾 offline quick save - payload:', recordData);

      try {
        await saveOfflineRecord('time_record', recordData);
        console.log('[PONTO] 💾 offline quick save - IndexedDB ok');
      } catch (e) {
        console.warn('[PONTO] 💾 offline quick save - IndexedDB falhou, usando localStorage fallback', e);
        try {
          const raw = localStorage.getItem('offline_backup_queue');
          const queue = raw ? JSON.parse(raw) : [];
          queue.push(recordData);
          localStorage.setItem('offline_backup_queue', JSON.stringify(queue));
          console.log('[PONTO] 💾 offline quick save - fallback queue size:', queue.length);
        } catch (ee) {
          console.error('[PONTO] 💾 offline quick save - fallback também falhou', ee);
          toast({ title: 'Erro ao salvar offline', description: 'Tente novamente.', variant: 'destructive' });
          return;
        }
      }

      // Atualizar UI (otimista)
      if (displayTodayRecord) {
        const updated = { ...displayTodayRecord, [type]: timeString, outside_zone: false } as any;
        setOfflineTodayRecord(updated);
        localStorage.setItem('cached_today_record', JSON.stringify(updated));
        console.log('[PONTO] 🖼️ offline quick save - UI updated (existing):', updated);
      } else {
        const newRec = { id: `temp_${Date.now()}`, employee_id: currentEmployee.id, data_registro: dateString, [type]: timeString, status: 'pendente', outside_zone: false } as any;
        setOfflineTodayRecord(newRec);
        localStorage.setItem('cached_today_record', JSON.stringify(newRec));
        console.log('[PONTO] 🖼️ offline quick save - UI updated (new):', newRec);
      }

      // Atualiza lista local para banner de pendências
      try {
        const allRecords = await getOfflineRecords('time_record');
        const unsyncedRecords = allRecords.filter(r => !r.synced);
        setOfflineRecords(unsyncedRecords);
        console.log('[PONTO] 📦 offline records after quick save:', {
          total: allRecords.length,
          unsynced: unsyncedRecords.length,
          records: unsyncedRecords
        });
      } catch {}

      toast({ title: 'Ponto registrado offline!', description: 'Será sincronizado quando voltar a conexão.' });
    } catch (err) {
      console.error('[PONTO] ❌ handleRegisterClick offline error:', err);
      toast({ title: 'Erro ao registrar ponto', description: 'Tente novamente.', variant: 'destructive' });
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '--:--';
    return timeString.substring(0, 5);
  };

  // Função para formatar data e hora - sempre mostra a data
  const formatTimeWithDate = (timeString?: string, dateString?: string, baseDate?: string) => {
    if (!timeString) return '--:--';
    const time = timeString.substring(0, 5);
    
    // Determinar qual data usar
    let dateToUse: string | undefined;
    if (dateString) {
      // Se tem data específica da marcação, usar ela
      dateToUse = dateString;
    } else if (baseDate) {
      // Se não tem data específica, usar a data base
      dateToUse = baseDate;
    } else {
      // Se não tem nenhuma data, retornar apenas o horário
      return time;
    }
    
    // Formatar data
    const date = new Date(dateToUse);
    const formattedDate = date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit' 
    });
    
    return `${time} (${formattedDate})`;
  };

  if (recordLoading && isOnline) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se estiver offline e não autenticado, mostrar mensagem
  if (!isOnline && !isOfflineAuthenticated()) {
    return (
      <div className="p-6 space-y-6">
        <Alert className="bg-red-50 border-red-200">
          <WifiOff className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Acesso Offline Não Disponível</strong>
            <br />
            <br />
            Para usar o sistema offline, você precisa fazer login online primeiro.
            <br />
            <br />
            <strong>Como resolver:</strong>
            <br />
            1. Conecte-se à internet
            <br />
            2. Faça login no sistema
            <br />
            3. Depois poderá usar offline
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Verificar se o funcionário não precisa registrar ponto (Artigo 62 da CLT)
  const requerRegistroPonto = currentEmployee?.requer_registro_ponto !== false; // Default true se não definido
  
  if (!requerRegistroPonto) {
    return (
      <div className="p-6 space-y-6">
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Registro de Ponto Não Obrigatório</strong>
            <br />
            <br />
            De acordo com o Artigo 62 da CLT, seu cargo não requer registro de ponto.
            <br />
            <br />
            Se você acredita que isso está incorreto, entre em contato com o departamento de RH.
          </AlertDescription>
        </Alert>
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

      {/* Indicador de registros pendentes */}
      {(() => {
        // Filtrar apenas registros não sincronizados
        const unsyncedRecords = offlineRecords.filter(r => !r.synced);
        
        if (unsyncedRecords.length === 0) return null;
        
        return (
          <Card className={isOnline ? "bg-blue-50 border-blue-200" : "bg-yellow-50 border-yellow-200"}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className={`h-5 w-5 ${isOnline ? 'text-blue-600' : 'text-yellow-600'}`} />
                <div>
                  <p className={`font-medium ${isOnline ? 'text-blue-800' : 'text-yellow-800'}`}>
                    {unsyncedRecords.length} registro(s) offline pendente(s)
                  </p>
                  <p className={`text-sm ${isOnline ? 'text-blue-700' : 'text-yellow-700'}`}>
                    {isOnline 
                      ? 'Sincronizando automaticamente...' 
                      : 'Serão sincronizados automaticamente quando voltar online'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Aviso de janela de tempo próxima do limite */}
      {displayTodayRecord?.entrada && timeRemaining.isNearLimit && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div className="flex-1">
                <p className="font-medium text-orange-800">
                  Atenção: Janela de tempo próxima do limite
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  Restam aproximadamente {Math.round(timeRemaining.hoursRemaining * 10) / 10} horas 
                  para registrar marcações do dia {formatDateOnly(displayTodayRecord.data_registro)}.
                  Após esse período, a próxima marcação será considerada como primeira do dia seguinte.
                </p>
                {timeRemaining.hoursRemaining <= 0 && (
                  <p className="text-sm font-semibold text-orange-900 mt-2">
                    ⚠️ A janela de tempo expirou. A próxima marcação será do dia atual.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Aviso de registro do dia anterior ainda dentro da janela */}
      {showPreviousDayBanner && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-800">
                  Exibindo marcações do dia {formatDateOnly(currentTodayRecord.data_registro)}
                </p>
                <p className="text-sm text-blue-700">
                  Ainda restam aproximadamente {Math.max(0, windowHours - (recordWindowState?.hoursElapsed ?? 0)).toFixed(1)} horas dentro da janela configurada.
                  Nova marcação será do dia atual assim que a janela expirar.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relógio */}
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-6xl font-mono font-bold text-gray-900 mb-4">
            {currentTime.toLocaleTimeString('pt-BR')}
          </div>
          <p className="text-lg text-gray-600">
            {currentWorkSchedule?.nome || 'Escala padrão'}
          </p>
        </CardContent>
      </Card>

      {/* Status do dia */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Hoje</CardTitle>
          <CardDescription>
            Seus registros de ponto para hoje
            {!displayTodayRecord && (
              <span className="text-orange-600 font-medium ml-2">
                (Nenhum registro encontrado para hoje)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!displayTodayRecord ? (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { 
                  key: 'entrada', 
                  label: 'Entrada', 
                  time: displayTodayRecord?.entrada,
                  date: displayTodayRecord?.base_date || displayTodayRecord?.data_registro // Entrada sempre usa a data base
                },
                { 
                  key: 'entrada_almoco', 
                  label: 'Início Almoço', 
                  time: displayTodayRecord?.entrada_almoco,
                  date: displayTodayRecord?.entrada_almoco_date || displayTodayRecord?.base_date || displayTodayRecord?.data_registro
                },
                { 
                  key: 'saida_almoco', 
                  label: 'Fim Almoço', 
                  time: displayTodayRecord?.saida_almoco,
                  date: displayTodayRecord?.saida_almoco_date || displayTodayRecord?.base_date || displayTodayRecord?.data_registro
                },
                { 
                  key: 'saida', 
                  label: 'Saída', 
                  time: displayTodayRecord?.saida,
                  date: displayTodayRecord?.saida_date || displayTodayRecord?.base_date || displayTodayRecord?.data_registro
                },
                { 
                  key: 'entrada_extra1', 
                  label: 'Entrada Extra', 
                  time: displayTodayRecord?.entrada_extra1,
                  date: displayTodayRecord?.entrada_extra1_date || displayTodayRecord?.base_date || displayTodayRecord?.data_registro
                },
                { 
                  key: 'saida_extra1', 
                  label: 'Saída Extra', 
                  time: displayTodayRecord?.saida_extra1,
                  date: displayTodayRecord?.saida_extra1_date || displayTodayRecord?.base_date || displayTodayRecord?.data_registro
                }
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
                      {formatTimeWithDate(
                        record.time, 
                        record.date, 
                        displayTodayRecord?.base_date || displayTodayRecord?.data_registro
                      )}
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
                {!displayTodayRecord ? 'Primeiro Registro' : 'Próximo Registro'}
              </h3>
              <p className="text-gray-600">
                {nextRecordType && getRecordTypeInfo(nextRecordType).label}
              </p>
            </div>
            
            <Button
              size="lg"
              className="w-full max-w-md"
              onClick={() => handleRegisterClick(nextRecordType)}
              disabled={registerTimeMutation.isPending && isOnline}
            >
              {registerTimeMutation.isPending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              ) : (
                <Clock className="h-5 w-5 mr-2" />
              )}
              Registrar {nextRecordType && getRecordTypeInfo(nextRecordType).label}
            </Button>
            
            {!isOnline && (
              <Alert className="mt-4 bg-blue-50 border-blue-200">
                <WifiOff className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Você está offline. O registro será salvo localmente e sincronizado automaticamente quando a conexão voltar.
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
      {currentWorkSchedule && (
        <Card>
          <CardHeader>
            <CardTitle>Informações da Escala</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Horário:</span>
                <p className="text-gray-600">
                  {currentWorkSchedule.horario_inicio} - {currentWorkSchedule.horario_fim}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Intervalo:</span>
                <p className="text-gray-600">
                  {currentWorkSchedule.intervalo_almoco} minutos
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Tolerância:</span>
                <p className="text-gray-600">
                  {currentWorkSchedule.tolerancia_entrada} min entrada / {currentWorkSchedule.tolerancia_saida} min saída
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de registro com validações */}
      {!hasEmployee && !recordLoading && isOnline && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Colaborador não encontrado</strong>
            <br />
            Não localizamos seu cadastro de funcionário para a empresa selecionada.
            <br />
            Verifique se o acesso foi liberado para esta empresa ou contate o RH.
          </AlertDescription>
        </Alert>
      )}

      {hasEmployee && pendingRegistrationType && selectedCompany && (
        <TimeRecordRegistrationModalV2
          isOpen={registrationModalOpen}
          onClose={() => {
            setRegistrationModalOpen(false);
            setPendingRegistrationType(null);
          }}
          onSuccess={async () => {
            // Fechar modal primeiro
            setRegistrationModalOpen(false);
            setPendingRegistrationType(null);
            
            // Invalidar e refetch a query correta para atualizar os dados
            // Usar a mesma estrutura da query key definida na linha 137
            const employeeId = currentEmployee?.id || employee?.id;
            if (employeeId && selectedCompany?.id) {
              const queryKey = ['today-time-record-consolidated', employeeId, selectedCompany.id, windowHours];
              
              console.log('[RegistroPontoPage] 🔄 Invalidando query após registro:', {
                queryKey,
                employeeId,
                companyId: selectedCompany.id,
                windowHours,
                timestamp: new Date().toISOString()
              });
              
              // Invalidar apenas a query específica (não todas as queries relacionadas)
              // para evitar refetches desnecessários que causam "piscar" nas fotos
              await queryClient.invalidateQueries({ 
                queryKey,
                exact: true
              });
              
              console.log('[RegistroPontoPage] ✅ Query invalidada, aguardando 300ms para refetch');
              
              // Refetch apenas a query específica após um pequeno delay
              // para dar tempo do banco processar o registro
              setTimeout(async () => {
                console.log('[RegistroPontoPage] 🔄 Fazendo refetch da query:', { queryKey });
                await queryClient.refetchQueries({ 
                  queryKey,
                  type: 'active'
                });
                console.log('[RegistroPontoPage] ✅ Refetch concluído');
              }, 300);
            }
            
            toast({
              title: 'Ponto registrado',
              description: 'Seu ponto foi registrado com sucesso.',
            });
          }}
          type={pendingRegistrationType}
          typeLabel={getRecordTypeInfo(pendingRegistrationType).label}
          employeeId={currentEmployee.id}
          companyId={selectedCompany.id}
        />
      )}
    </div>
    );
}

