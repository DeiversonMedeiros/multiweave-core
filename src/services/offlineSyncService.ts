import { supabase } from '@/integrations/supabase/client';
import { EntityService } from '@/services/generic/entityService';

interface SyncQueue {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retries: number;
}

class OfflineSyncService {
  private queue: SyncQueue[] = [];
  private isProcessing = false;
  private maxRetries = 3;
  private retryDelay = 5000; // 5 segundos

  // Adicionar item à fila de sincronização
  addToQueue(type: string, data: any): string {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queueItem: SyncQueue = {
      id,
      type,
      data,
      timestamp: Date.now(),
      retries: 0
    };

    this.queue.push(queueItem);
    this.processQueue();
    
    return id;
  }

  // Processar fila de sincronização
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue[0];
      
      try {
        await this.syncItem(item);
        this.queue.shift(); // Remove item da fila após sucesso
      } catch (error) {
        console.error('Erro ao sincronizar item:', error);
        
        item.retries++;
        if (item.retries >= this.maxRetries) {
          console.error('Item removido da fila após máximo de tentativas:', item);
          this.queue.shift();
        } else {
          // Aguardar antes de tentar novamente
          await this.delay(this.retryDelay * item.retries);
        }
      }
    }

    this.isProcessing = false;
  }

  // Sincronizar item específico
  private async syncItem(item: SyncQueue) {
    switch (item.type) {
      case 'time_record':
        await this.syncTimeRecord(item.data);
        break;
      case 'vacation_request':
        await this.syncVacationRequest(item.data);
        break;
      case 'reimbursement_request':
        await this.syncReimbursementRequest(item.data);
        break;
      case 'medical_certificate':
        await this.syncMedicalCertificate(item.data);
        break;
      default:
        throw new Error(`Tipo de sincronização não suportado: ${item.type}`);
    }
  }

  // Sincronizar registro de ponto
  private async syncTimeRecord(data: any) {
    // Usar EntityService para sincronizar via RPC
    try {
      if (data.id) {
        // Atualizar registro existente
        return await EntityService.update({
          schema: 'rh',
          table: 'time_records',
          companyId: data.company_id,
          id: data.id,
          data: data
        });
      } else {
        // Criar novo registro
        return await EntityService.create({
          schema: 'rh',
          table: 'time_records',
          companyId: data.company_id,
          data: data
        });
      }
    } catch (error) {
      console.error('Erro ao sincronizar registro de ponto:', error);
      throw error;
    }
  }

  // Sincronizar solicitação de férias
  private async syncVacationRequest(data: any) {
    const { data: result, error } = await supabase
      .from('rh.vacations')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  // Sincronizar solicitação de reembolso
  private async syncReimbursementRequest(data: any) {
    const { data: result, error } = await supabase
      .from('financeiro.reimbursement_requests')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  // Sincronizar atestado médico
  private async syncMedicalCertificate(data: any) {
    const { data: result, error } = await supabase
      .from('rh.medical_certificates')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  // Utilitário para delay
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Obter status da fila
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      items: this.queue.map(item => ({
        id: item.id,
        type: item.type,
        retries: item.retries,
        timestamp: item.timestamp
      }))
    };
  }

  // Limpar fila
  clearQueue() {
    this.queue = [];
  }
}

// Instância singleton
export const offlineSyncService = new OfflineSyncService();
