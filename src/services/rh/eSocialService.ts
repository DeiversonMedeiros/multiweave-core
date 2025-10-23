import { ESocialEvent } from '@/integrations/supabase/rh-types';
import { 
  ESocialXMLService, 
  ESocialXMLConfig, 
  ESocialEventData 
} from './eSocialXMLService';
import { 
  ESocialValidationService, 
  ValidationResult, 
  EmployeeData, 
  CompanyData 
} from './eSocialValidationService';
import { 
  ESocialSendService, 
  ESocialConfig, 
  SendResult, 
  BatchSendResult, 
  EventSendResult 
} from './eSocialSendService';
import { 
  ESocialReturnService, 
  ReturnData, 
  BatchReturnData, 
  ReturnProcessingResult 
} from './eSocialReturnService';
import { 
  ESocialAuditService, 
  AuditLog, 
  AuditFilter, 
  AuditStatistics, 
  SystemHealth 
} from './eSocialAuditService';

// =====================================================
// SERVIÇO PRINCIPAL INTEGRADO eSOCIAL
// =====================================================

export interface ESocialServiceConfig {
  xml: ESocialXMLConfig;
  send: ESocialConfig;
}

export interface ProcessEventResult {
  success: boolean;
  event: ESocialEvent;
  xml?: string;
  protocolNumber?: string;
  message: string;
  errors?: string[];
  warnings?: string[];
}

export interface ProcessBatchResult {
  success: boolean;
  batchId: string;
  totalEvents: number;
  processedEvents: number;
  successfulEvents: number;
  failedEvents: number;
  results: ProcessEventResult[];
  message: string;
}

export interface ESocialStatistics {
  totalEvents: number;
  pendingEvents: number;
  sentEvents: number;
  acceptedEvents: number;
  rejectedEvents: number;
  errorEvents: number;
  successRate: number;
  averageProcessingTime: number;
  lastProcessedAt?: string;
}

export class ESocialService {
  private xmlService: ESocialXMLService;
  private validationService: ESocialValidationService;
  private sendService: ESocialSendService;
  private returnService: ESocialReturnService;
  private auditService: ESocialAuditService;

  constructor(config: ESocialServiceConfig) {
    this.xmlService = new ESocialXMLService(config.xml);
    this.validationService = new ESocialValidationService();
    this.sendService = new ESocialSendService(config.xml, config.send);
    this.returnService = new ESocialReturnService();
    this.auditService = new ESocialAuditService();
  }

  // =====================================================
  // PROCESSAMENTO DE EVENTO INDIVIDUAL
  // =====================================================

  async processEvent(
    event: ESocialEvent,
    employeeData?: EmployeeData,
    companyData?: CompanyData,
    userId: string = 'SYSTEM',
    userName: string = 'System'
  ): Promise<ProcessEventResult> {
    try {
      // 1. Log de início do processamento
      await this.auditService.logEvent(
        event.id,
        'PROCESS_EVENT_START',
        `Iniciando processamento do evento ${event.tipo_evento}`,
        userId,
        userName,
        { eventType: event.tipo_evento, eventCode: event.codigo_evento },
        'info',
        'event'
      );

      // 2. Validar dados do evento
      const validationResult = await this.validationService.validateEvent(event, employeeData, companyData);
      
      if (!validationResult.isValid) {
        await this.auditService.logEvent(
          event.id,
          'PROCESS_EVENT_VALIDATION_FAILED',
          `Validação falhou para evento ${event.tipo_evento}`,
          userId,
          userName,
          { errors: validationResult.errors },
          'error',
          'event'
        );

        return {
          success: false,
          event,
          message: 'Evento não passou na validação',
          errors: validationResult.errors.map(e => e.message),
          warnings: validationResult.warnings.map(w => w.warning)
        };
      }

      // 3. Gerar XML do evento
      const eventData: ESocialEventData = {
        event,
        employee: employeeData,
        company: companyData
      };

      const xml = await this.xmlService.generateEventXML(eventData);

      // 4. Validar XML
      const xmlValidation = await this.xmlService.validateXML(xml);
      if (!xmlValidation.isValid) {
        await this.auditService.logEvent(
          event.id,
          'PROCESS_EVENT_XML_VALIDATION_FAILED',
          `XML inválido para evento ${event.tipo_evento}`,
          userId,
          userName,
          { errors: xmlValidation.errors },
          'error',
          'event'
        );

        return {
          success: false,
          event,
          message: 'XML inválido',
          errors: xmlValidation.errors
        };
      }

      // 5. Enviar para eSocial
      const sendResult = await this.sendService.sendEvent(event, employeeData, companyData);

      if (sendResult.success) {
        await this.auditService.logEvent(
          event.id,
          'PROCESS_EVENT_SUCCESS',
          `Evento ${event.tipo_evento} processado com sucesso`,
          userId,
          userName,
          { protocolNumber: sendResult.protocolNumber },
          'info',
          'event'
        );

        return {
          success: true,
          event: {
            ...event,
            status: 'sent',
            numero_recibo: sendResult.protocolNumber,
            data_envio: new Date().toISOString()
          },
          xml,
          protocolNumber: sendResult.protocolNumber,
          message: 'Evento processado com sucesso'
        };
      } else {
        await this.auditService.logEvent(
          event.id,
          'PROCESS_EVENT_SEND_FAILED',
          `Falha no envio do evento ${event.tipo_evento}`,
          userId,
          userName,
          { errors: sendResult.errors },
          'error',
          'event'
        );

        return {
          success: false,
          event: {
            ...event,
            status: 'error',
            error_message: sendResult.message
          },
          xml,
          message: sendResult.message,
          errors: sendResult.errors
        };
      }
    } catch (error) {
      await this.auditService.logSystemError(
        error as Error,
        `Processamento do evento ${event.id}`,
        userId,
        userName
      );

      return {
        success: false,
        event: {
          ...event,
          status: 'error',
          error_message: (error as Error).message
        },
        message: 'Erro interno no processamento',
        errors: [(error as Error).message]
      };
    }
  }

  // =====================================================
  // PROCESSAMENTO DE LOTE
  // =====================================================

  async processBatch(
    events: ESocialEvent[],
    employeeDataMap?: Map<string, EmployeeData>,
    companyData?: CompanyData,
    userId: string = 'SYSTEM',
    userName: string = 'System'
  ): Promise<ProcessBatchResult> {
    const batchId = this.generateBatchId();
    const results: ProcessEventResult[] = [];
    let processedEvents = 0;
    let successfulEvents = 0;
    let failedEvents = 0;

    try {
      // 1. Log de início do processamento do lote
      await this.auditService.logBatchCreation(batchId, events.length, userId, userName);

      // 2. Validar lote
      const validationResult = await this.validationService.validateBatch(events, employeeDataMap, companyData);
      
      if (!validationResult.isValid) {
        await this.auditService.logEvent(
          batchId,
          'PROCESS_BATCH_VALIDATION_FAILED',
          `Validação do lote falhou`,
          userId,
          userName,
          { errors: validationResult.errors },
          'error',
          'batch'
        );

        return {
          success: false,
          batchId,
          totalEvents: events.length,
          processedEvents: 0,
          successfulEvents: 0,
          failedEvents: events.length,
          results: events.map(event => ({
            success: false,
            event,
            message: 'Lote não passou na validação',
            errors: validationResult.errors.map(e => e.message)
          })),
          message: 'Lote não passou na validação'
        };
      }

      // 3. Processar cada evento individualmente
      for (const event of events) {
        const employeeData = employeeDataMap?.get(event.employee_id || '');
        const result = await this.processEvent(event, employeeData, companyData, userId, userName);
        
        results.push(result);
        processedEvents++;

        if (result.success) {
          successfulEvents++;
        } else {
          failedEvents++;
        }
      }

      // 4. Log do resultado do lote
      await this.auditService.logBatchProcessing(
        batchId,
        'completed',
        userId,
        userName,
        {
          totalEvents: events.length,
          successfulEvents,
          failedEvents
        }
      );

      return {
        success: failedEvents === 0,
        batchId,
        totalEvents: events.length,
        processedEvents,
        successfulEvents,
        failedEvents,
        results,
        message: `Lote processado: ${successfulEvents} sucessos, ${failedEvents} falhas`
      };
    } catch (error) {
      await this.auditService.logSystemError(
        error as Error,
        `Processamento do lote ${batchId}`,
        userId,
        userName
      );

      return {
        success: false,
        batchId,
        totalEvents: events.length,
        processedEvents,
        successfulEvents,
        failedEvents,
        results,
        message: 'Erro interno no processamento do lote'
      };
    }
  }

  // =====================================================
  // PROCESSAMENTO DE RETORNOS
  // =====================================================

  async processReturns(events: ESocialEvent[], userId: string = 'SYSTEM', userName: string = 'System'): Promise<ReturnProcessingResult> {
    try {
      const results: ReturnProcessingResult = {
        success: true,
        processedEvents: 0,
        updatedEvents: 0,
        errors: [],
        warnings: []
      };

      for (const event of events) {
        if (event.numero_recibo) {
          try {
            // Simular retorno do eSocial
            const returnData = await this.returnService.simulateReturn(event.numero_recibo);
            
            // Processar retorno
            const processResult = await this.returnService.processEventReturn(event, returnData);
            
            if (processResult.success) {
              results.updatedEvents++;
              
              // Log do retorno processado
              await this.auditService.logEvent(
                event.id,
                'PROCESS_RETURN_SUCCESS',
                `Retorno processado para evento ${event.tipo_evento}`,
                userId,
                userName,
                { 
                  protocolNumber: returnData.protocolNumber,
                  status: returnData.status 
                },
                'info',
                'integration'
              );
            } else {
              results.errors.push(...processResult.errors);
              results.warnings.push(...processResult.warnings);
            }
            
            results.processedEvents++;
          } catch (error) {
            results.errors.push({
              eventId: event.id,
              error: (error as Error).message,
              code: 'RETURN_PROCESSING_ERROR',
              severity: 'error'
            });
          }
        }
      }

      results.success = results.errors.length === 0;

      return results;
    } catch (error) {
      await this.auditService.logSystemError(
        error as Error,
        'Processamento de retornos',
        userId,
        userName
      );

      return {
        success: false,
        processedEvents: 0,
        updatedEvents: 0,
        errors: [{
          eventId: 'BATCH',
          error: (error as Error).message,
          code: 'BATCH_RETURN_ERROR',
          severity: 'error'
        }],
        warnings: []
      };
    }
  }

  // =====================================================
  // ESTATÍSTICAS E RELATÓRIOS
  // =====================================================

  async getStatistics(events: ESocialEvent[]): Promise<ESocialStatistics> {
    const stats = {
      totalEvents: events.length,
      pendingEvents: 0,
      sentEvents: 0,
      acceptedEvents: 0,
      rejectedEvents: 0,
      errorEvents: 0,
      successRate: 0,
      averageProcessingTime: 0,
      lastProcessedAt: undefined as string | undefined
    };

    let totalProcessingTime = 0;
    let processedCount = 0;

    events.forEach(event => {
      switch (event.status) {
        case 'pending':
          stats.pendingEvents++;
          break;
        case 'sent':
          stats.sentEvents++;
          break;
        case 'accepted':
          stats.acceptedEvents++;
          break;
        case 'rejected':
          stats.rejectedEvents++;
          break;
        case 'error':
          stats.errorEvents++;
          break;
      }

      // Calcular tempo de processamento (simulado)
      if (event.data_envio && event.created_at) {
        const created = new Date(event.created_at);
        const sent = new Date(event.data_envio);
        const processingTime = sent.getTime() - created.getTime();
        totalProcessingTime += processingTime;
        processedCount++;
      }

      // Último processamento
      if (event.data_envio && (!stats.lastProcessedAt || event.data_envio > stats.lastProcessedAt)) {
        stats.lastProcessedAt = event.data_envio;
      }
    });

    stats.successRate = stats.totalEvents > 0 ? (stats.acceptedEvents / stats.totalEvents) * 100 : 0;
    stats.averageProcessingTime = processedCount > 0 ? totalProcessingTime / processedCount : 0;

    return stats;
  }

  async getAuditStatistics(): Promise<AuditStatistics> {
    return await this.auditService.getAuditStatistics();
  }

  async getSystemHealth(): Promise<SystemHealth> {
    return await this.auditService.getSystemHealth();
  }

  // =====================================================
  // CONSULTA DE LOGS
  // =====================================================

  async getAuditLogs(filter: AuditFilter = {}): Promise<AuditLog[]> {
    return await this.auditService.getLogs(filter);
  }

  async exportAuditLogs(filter: AuditFilter = {}): Promise<string> {
    return await this.auditService.exportLogs(filter);
  }

  async exportAuditLogsAsCSV(filter: AuditFilter = {}): Promise<string> {
    return await this.auditService.exportLogsAsCSV(filter);
  }

  // =====================================================
  // MÉTODOS DE UTILIDADE
  // =====================================================

  async testConnection(): Promise<boolean> {
    try {
      return await this.sendService.testConnection();
    } catch (error) {
      await this.auditService.logSystemError(
        error as Error,
        'Teste de conexão',
        'SYSTEM',
        'System'
      );
      return false;
    }
  }

  async getAvailableEventTypes(): Promise<string[]> {
    return await this.sendService.getAvailableEvents();
  }

  async validateEventData(event: ESocialEvent, employeeData?: EmployeeData, companyData?: CompanyData): Promise<ValidationResult> {
    return await this.validationService.validateEvent(event, employeeData, companyData);
  }

  async generateEventXML(event: ESocialEvent, employeeData?: EmployeeData, companyData?: CompanyData): Promise<string> {
    const eventData: ESocialEventData = {
      event,
      employee: employeeData,
      company: companyData
    };

    return await this.xmlService.generateEventXML(eventData);
  }

  // =====================================================
  // MÉTODOS AUXILIARES
  // =====================================================

  private generateBatchId(): string {
    const now = new Date();
    const timestamp = now.getTime().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `BATCH_${timestamp}_${random}`.toUpperCase();
  }

  // =====================================================
  // CONFIGURAÇÃO E INICIALIZAÇÃO
  // =====================================================

  updateConfig(newConfig: Partial<ESocialServiceConfig>): void {
    if (newConfig.xml) {
      this.xmlService = new ESocialXMLService(newConfig.xml);
    }
    if (newConfig.send) {
      this.sendService.updateConfig(newConfig.send);
    }
  }

  getConfig(): ESocialServiceConfig {
    return {
      xml: this.xmlService['config'],
      send: this.sendService.getConfig()
    };
  }
}

// =====================================================
// INSTÂNCIA SINGLETON DO SERVIÇO
// =====================================================

let eSocialServiceInstance: ESocialService | null = null;

export function getESocialService(config?: ESocialServiceConfig): ESocialService {
  if (!eSocialServiceInstance && config) {
    eSocialServiceInstance = new ESocialService(config);
  }
  
  if (!eSocialServiceInstance) {
    throw new Error('ESocialService não foi inicializado. Forneça a configuração necessária.');
  }
  
  return eSocialServiceInstance;
}

export function initializeESocialService(config: ESocialServiceConfig): ESocialService {
  eSocialServiceInstance = new ESocialService(config);
  return eSocialServiceInstance;
}

// =====================================================
// CONFIGURAÇÃO PADRÃO
// =====================================================

export const defaultESocialConfig: ESocialServiceConfig = {
  xml: {
    companyId: '',
    cnpj: '',
    companyName: '',
    environment: 'testing',
    version: '1.0.0'
  },
  send: {
    environment: 'testing',
    apiUrl: 'https://api.esocial.gov.br',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  }
};