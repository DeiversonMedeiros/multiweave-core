// =====================================================
// SERVIÇO DE REGISTRO DE PONTO - VERSÃO SIMPLIFICADA
// =====================================================
// Versão: 2.0.0
// Data: 2025-01-07
// Descrição: Implementação limpa e determinística do registro de ponto
//            - Fluxo linear, sem race conditions
//            - Sem setTimeout/requestAnimationFrame desnecessários
//            - Compatível com qualquer navegador/dispositivo
//            - Baseado nos princípios: fluxo linear, função orquestradora única, estados atômicos

import { EntityService } from '@/services/generic/entityService';
import { supabase } from '@/integrations/supabase/client';
import { compressImage } from '@/lib/imageOptimization';
import { STORAGE_BUCKETS } from '@/config/storage';
import { saveOfflineRecord } from '@/services/offline/offlineQueueService';

export type TimeRecordType = 'entrada' | 'saida' | 'entrada_almoco' | 'saida_almoco' | 'entrada_extra1' | 'saida_extra1';

export interface TimeRecordRegistrationParams {
  employeeId: string;
  companyId: string;
  type: TimeRecordType;
  videoElement: HTMLVideoElement;
}

export interface TimeRecordRegistrationResult {
  success: boolean;
  timeRecordId?: string;
  eventId?: string;
  photoUrl?: string;
  error?: string;
  offline?: boolean;
  offlineId?: string;
  localDate?: string;
  localTimestamp?: string;
}

/**
 * Captura foto diretamente do elemento de vídeo
 * Aguarda o vídeo estar pronto antes de capturar
 */
function capturePhotoFromVideo(video: HTMLVideoElement): Promise<string> {
  return new Promise((resolve, reject) => {
    // Função para tentar capturar
    const attemptCapture = () => {
      try {
        // Verificar se o vídeo tem dimensões válidas
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          reject(new Error('Vídeo ainda não tem dimensões válidas. Aguarde um momento.'));
          return;
        }

        // Vídeo está pronto - capturar
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas não suportado'));
          return;
        }

        // Desenhar frame do vídeo no canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Converter diretamente para base64 (sem blob intermediário)
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        resolve(base64);
      } catch (err: any) {
        reject(new Error(err.message || 'Erro ao capturar foto'));
      }
    };

    // Verificar se vídeo já está pronto
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      // Aguardar próximo frame para garantir que está renderizando
      requestAnimationFrame(() => {
        attemptCapture();
      });
      return;
    }

    // Aguardar vídeo estar pronto
    let resolved = false;
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('playing', onReady);
    };

    const onReady = () => {
      if (resolved) return;
      
      // Aguardar um frame para garantir renderização
      requestAnimationFrame(() => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          resolved = true;
          cleanup();
          attemptCapture();
        }
      });
    };

    // Adicionar listeners
    video.addEventListener('loadedmetadata', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('playing', onReady);

    // Timeout de segurança (3 segundos)
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error('Timeout aguardando vídeo carregar. Verifique se a câmera está funcionando.'));
      }
    }, 3000);
  });
}

/**
 * Captura localização GPS
 * COM timeout controlado (10 segundos)
 */
function getLocation(): Promise<{ lat: number; lng: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não suportada'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 0
        });
      },
      (err) => {
        let message = 'Erro ao obter localização: ';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message += 'Permissão negada';
            break;
          case err.POSITION_UNAVAILABLE:
            message += 'Localização indisponível';
            break;
          case err.TIMEOUT:
            message += 'Tempo limite excedido';
            break;
          default:
            message += 'Erro desconhecido';
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: false, // Reduzir precisão para acelerar
        timeout: 15000, // Aumentar timeout para 15 segundos
        maximumAge: 60000 // Aceitar localização com até 1 minuto de idade
      }
    );
  });
}

/**
 * Faz upload da foto para o Supabase Storage
 * Retorna a URL pública da foto
 */
export async function uploadPhoto(
  base64Data: string,
  employeeId: string,
  companyId: string
): Promise<string> {
  try {
    // Converter base64 para blob
    const response = await fetch(base64Data);
    const blob = await response.blob();
    
    // Criar File object
    const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });

    // Comprimir imagem se necessário
    let fileToUpload = file;
    try {
      const optimized = await compressImage(file, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.75,
        format: 'jpeg'
      });
      fileToUpload = optimized.file;
    } catch (compressError) {
      console.warn('[timeRecordRegistrationService] Erro ao comprimir, usando original:', compressError);
      // Continuar com arquivo original
    }

    // Gerar nome único
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 9);
    const fileName = `${timestamp}_${randomString}.jpg`;
    const filePath = `${companyId}/${employeeId}/${fileName}`;

    // Upload para Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.TIME_RECORD_PHOTOS)
      .upload(filePath, fileToUpload, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Obter URL pública
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKETS.TIME_RECORD_PHOTOS)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error: any) {
    console.error('[timeRecordRegistrationService] Erro no upload da foto:', error);
    throw new Error(`Erro ao fazer upload da foto: ${error.message || 'Erro desconhecido'}`);
  }
}

/**
 * Função orquestradora principal
 * Executa todo o fluxo de forma linear e determinística
 */
export async function registerTimeRecord(
  params: TimeRecordRegistrationParams
): Promise<TimeRecordRegistrationResult> {
  const { employeeId, companyId, type, videoElement } = params;

  try {
    // 1. Validar parâmetros
    if (!employeeId || !companyId || !type || !videoElement) {
      throw new Error('Parâmetros obrigatórios não fornecidos');
    }

    // IMPORTANTE: Capturar o timestamp ANTES de qualquer operação assíncrona
    // para garantir que o horário seja o momento exato do registro
    const now = new Date();
    
    // Criar timestamp UTC sem milissegundos (formato: YYYY-MM-DDTHH:MM:SSZ)
    // Remover milissegundos: "2026-01-08T00:06:38.954Z" -> "2026-01-08T00:06:38Z"
    const timestampUtc = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
    
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; // Timezone do navegador
    
    console.log('[timeRecordRegistrationService] 📅 Timestamp capturado:', {
      local: now.toLocaleString('pt-BR', { timeZone: timezone }),
      localTime: now.toLocaleTimeString('pt-BR', { timeZone: timezone, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      utc: timestampUtc,
      timezone: timezone
    });

    // 2. Capturar foto e localização em paralelo
    // Geolocalização é opcional - se falhar, continua sem localização
    const [photoBase64, location] = await Promise.allSettled([
      capturePhotoFromVideo(videoElement),
      getLocation().catch((err) => {
        console.warn('[timeRecordRegistrationService] Geolocalização falhou, continuando sem localização:', err.message);
        return null; // Retorna null se geolocalização falhar
      })
    ]);

    // Verificar se foto foi capturada com sucesso
    if (photoBase64.status === 'rejected') {
      throw new Error(`Erro ao capturar foto: ${photoBase64.reason?.message || 'Erro desconhecido'}`);
    }

    const photoBase64Value = photoBase64.value;
    const locationValue = location.status === 'fulfilled' ? location.value : null;

    // 3. Preparar payload com timestamp UTC e timezone (já capturado acima)

    // Mapear tipo para event_type
    const eventTypeMap: Record<TimeRecordType, string> = {
      entrada: 'entrada',
      saida: 'saida',
      entrada_almoco: 'entrada_almoco',
      saida_almoco: 'saida_almoco',
      entrada_extra1: 'extra_inicio',
      saida_extra1: 'extra_fim'
    };
    const eventType = eventTypeMap[type];

    // Limitar accuracy_meters para numeric(6,2) - máximo 9999.99
    let accuracyMeters: number | null = null;
    if (locationValue && locationValue.accuracy) {
      accuracyMeters = Math.min(locationValue.accuracy, 9999.99);
      accuracyMeters = Math.round(accuracyMeters * 100) / 100;
    }

    // Preparar payload para RPC ou fila offline
    const payload = {
      employeeId: employeeId,
      companyId: companyId,
      eventType: eventType,
      timestampUtc: timestampUtc,
      timezone: timezone,
      latitude: locationValue ? locationValue.lat : null,
      longitude: locationValue ? locationValue.lng : null,
      accuracyMeters: accuracyMeters,
      photoBase64: photoBase64Value // Salvar base64 para upload depois
    };

    // 4. Verificar se está online
    if (!navigator.onLine) {
      // Salvar offline
      console.log('[timeRecordRegistrationService] 📴 Modo offline - salvando na fila');
      const offlineId = await saveOfflineRecord(payload);
      
      return {
        success: true,
        offline: true,
        offlineId
      };
    }

    // 5. Fazer upload da foto (apenas se online)
    const photoUrl = await uploadPhoto(photoBase64Value, employeeId, companyId);

    // 6. Chamar RPC para registrar ponto (backend decide o dia)
    const { data: rpcResult, error: rpcError } = await supabase.rpc('register_time_record', {
      p_employee_id: employeeId,
      p_company_id: companyId,
      p_event_type: eventType,
      p_timestamp_utc: timestampUtc,
      p_timezone: timezone,
      p_latitude: locationValue ? locationValue.lat : null,
      p_longitude: locationValue ? locationValue.lng : null,
      p_accuracy_meters: accuracyMeters,
      p_photo_url: photoUrl
    } as any); // Type assertion temporário até tipagem do RPC ser atualizada

    if (rpcError) {
      throw new Error(`Erro ao registrar ponto: ${rpcError.message}`);
    }

    const result = rpcResult as any; // Type assertion temporário
    if (!result || !result.success) {
      throw new Error(result?.error || 'Erro desconhecido ao registrar ponto');
    }

    const timeRecordId = result.time_record_id;
    const eventId = result.event_id;

    return {
      success: true,
      timeRecordId,
      eventId,
      photoUrl,
      localDate: result.local_date,
      localTimestamp: result.local_timestamp
    };
  } catch (error: any) {
    console.error('[timeRecordRegistrationService] Erro ao registrar ponto:', error);
    return {
      success: false,
      error: error.message || 'Erro desconhecido ao registrar ponto'
    };
  }
}

