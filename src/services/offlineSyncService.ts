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
    console.log('[SYNC] addToQueue:', { type, data });
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queueItem: SyncQueue = {
      id,
      type,
      data,
      timestamp: Date.now(),
      retries: 0
    };

    this.queue.push(queueItem);
    console.log('[SYNC] queue length:', this.queue.length);
    this.processQueue();
    
    return id;
  }

  // Processar fila de sincronização
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) { console.log('[SYNC] processQueue skipped', { isProcessing: this.isProcessing, length: this.queue.length }); return; }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue[0];
      
      try {
        console.log('[SYNC] processing item:', item);
        await this.syncItem(item);
        this.queue.shift(); // Remove item da fila após sucesso
        console.log('[SYNC] item processed and removed, remaining:', this.queue.length);
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
    console.log('[SYNC] syncItem type:', item.type);
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
      console.log('[SYNC] syncTimeRecord data:', data);
      // Se o ID começa com "temp_", é um ID temporário offline - buscar registro existente
      let existingId = data.id;
      if (existingId && existingId.startsWith('temp_')) {
        // Buscar registro existente para essa data e funcionário
        const existingRecords = await EntityService.list({
          schema: 'rh',
          table: 'time_records',
          companyId: data.company_id,
          filters: {
            employee_id: data.employee_id,
            data_registro: data.data_registro
          },
          pageSize: 1
        });
        
        if (existingRecords.data && existingRecords.data.length > 0) {
          existingId = existingRecords.data[0].id;
        } else {
          existingId = null;
        }
      }

      if (existingId && !existingId.startsWith('temp_')) {
        // Atualizar registro existente - apenas com os campos que mudaram
        const updateData: any = {
          updated_at: new Date().toISOString()
        };
        
        // Adicionar apenas os campos que existem nos dados consolidados
        if (data.entrada) updateData.entrada = data.entrada;
        if (data.entrada_almoco) updateData.entrada_almoco = data.entrada_almoco;
        if (data.saida_almoco) updateData.saida_almoco = data.saida_almoco;
        if (data.saida) updateData.saida = data.saida;
        if (data.entrada_extra1) updateData.entrada_extra1 = data.entrada_extra1;
        if (data.saida_extra1) updateData.saida_extra1 = data.saida_extra1;
        if (data.status) updateData.status = data.status;
        
        const result = await EntityService.update({
          schema: 'rh',
          table: 'time_records',
          companyId: data.company_id,
          id: existingId,
          data: updateData
        });
        console.log('[SYNC] updated time_record:', result);
        return result;
      } else {
        // Criar novo registro
        const insertData: any = {
          employee_id: data.employee_id,
          data_registro: data.data_registro,
          status: data.status || 'pendente'
        };
        
        // Adicionar apenas os campos que existem
        if (data.entrada) insertData.entrada = data.entrada;
        if (data.entrada_almoco) insertData.entrada_almoco = data.entrada_almoco;
        if (data.saida_almoco) insertData.saida_almoco = data.saida_almoco;
        if (data.saida) insertData.saida = data.saida;
        if (data.entrada_extra1) insertData.entrada_extra1 = data.entrada_extra1;
        if (data.saida_extra1) insertData.saida_extra1 = data.saida_extra1;
        
        const created = await EntityService.create({
          schema: 'rh',
          table: 'time_records',
          companyId: data.company_id,
          data: insertData
        });
        console.log('[SYNC] created time_record:', created);
        return created;
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
    // Nota: reimbursement_requests pode não existir no schema financeiro
    // Usar EntityService se a tabela existir, caso contrário criar uma tabela ou usar outra estrutura
    // Por enquanto, vamos usar EntityService
    const { EntityService } = await import('@/services/generic/entityService');
    
    const result = await EntityService.create({
      schema: 'financeiro',
      table: 'reimbursement_requests', // Verificar se esta tabela existe
      companyId: data.company_id,
      data: data
    });

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
