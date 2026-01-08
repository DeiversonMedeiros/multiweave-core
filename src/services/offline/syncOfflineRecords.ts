// =====================================================
// SERVIÇO DE SINCRONIZAÇÃO DE REGISTROS OFFLINE
// =====================================================
// Versão: 1.0.0
// Descrição: Sincroniza registros offline quando volta online

import { supabase } from '@/integrations/supabase/client';
import { 
  getPendingRecords, 
  markAsSynced, 
  removeSyncedRecord 
} from './offlineQueueService';
import { uploadPhoto } from '../rh/timeRecordRegistrationService';

/**
 * Faz upload da foto e retorna URL
 */
async function uploadPhotoFromBase64(
  base64Data: string,
  employeeId: string,
  companyId: string
): Promise<string> {
  // Usar a função uploadPhoto do serviço principal
  return await uploadPhoto(base64Data, employeeId, companyId);
}

/**
 * Sincroniza um registro offline
 */
async function syncSingleRecord(record: any): Promise<boolean> {
  try {
    const { payload } = record;

    // Upload da foto se houver
    let photoUrl: string | null = null;
    if (payload.photoBase64) {
      try {
        photoUrl = await uploadPhotoFromBase64(
          payload.photoBase64,
          payload.employeeId,
          payload.companyId
        );
      } catch (photoError) {
        console.warn('[syncOfflineRecords] Erro ao fazer upload da foto:', photoError);
        // Continuar sem foto
      }
    }

    // Chamar RPC para registrar ponto
    const { data: rpcResult, error: rpcError } = await supabase.rpc('register_time_record', {
      p_employee_id: payload.employeeId,
      p_company_id: payload.companyId,
      p_event_type: payload.eventType,
      p_timestamp_utc: payload.timestampUtc,
      p_timezone: payload.timezone,
      p_latitude: payload.latitude,
      p_longitude: payload.longitude,
      p_accuracy_meters: payload.accuracyMeters,
      p_photo_url: photoUrl
    } as any); // Type assertion temporário até tipagem do RPC ser atualizada

    if (rpcError) {
      throw new Error(rpcError.message);
    }

    const result = rpcResult as any; // Type assertion temporário
    if (!result || !result.success) {
      throw new Error(result?.error || 'Erro desconhecido');
    }

    // Marcar como sincronizado e remover da fila
    await markAsSynced(record.id);
    await removeSyncedRecord(record.id);

    return true;
  } catch (error: any) {
    console.error('[syncOfflineRecords] Erro ao sincronizar registro:', error);
    return false;
  }
}

/**
 * Sincroniza todos os registros pendentes
 */
export async function syncOfflineRecords(): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) {
    console.log('[syncOfflineRecords] ⚠️ Sem conexão - sincronização cancelada');
    return { synced: 0, failed: 0 };
  }

  const records = await getPendingRecords();
  
  if (records.length === 0) {
    return { synced: 0, failed: 0 };
  }

  console.log(`[syncOfflineRecords] 🔄 Sincronizando ${records.length} registro(s) pendente(s)`);

  let synced = 0;
  let failed = 0;

  // Sincronizar um por vez para evitar sobrecarga
  for (const record of records) {
    const success = await syncSingleRecord(record);
    if (success) {
      synced++;
    } else {
      failed++;
      // Se falhar, parar para evitar loop infinito
      // O próximo sync tentará novamente
      break;
    }
  }

  console.log(`[syncOfflineRecords] ✅ Sincronização concluída: ${synced} sucesso(s), ${failed} falha(s)`);

  return { synced, failed };
}

/**
 * Inicializa listeners de sincronização
 */
export function initSyncListeners(): void {
  // Sincronizar quando voltar online
  window.addEventListener('online', () => {
    console.log('[syncOfflineRecords] 🌐 Conexão restaurada - iniciando sincronização');
    syncOfflineRecords();
  });

  // Sincronizar periodicamente (a cada 30 segundos se online)
  setInterval(() => {
    if (navigator.onLine) {
      syncOfflineRecords();
    }
  }, 30000);
}

