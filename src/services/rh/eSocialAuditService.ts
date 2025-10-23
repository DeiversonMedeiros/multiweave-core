import { ESocialEvent } from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE LOGS E AUDITORIA eSOCIAL
// =====================================================

export interface AuditLog {
  id: string;
  eventId: string;
  action: string;
  description: string;
  userId: string;
  userName: string;
  timestamp: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'event' | 'batch' | 'system' | 'user' | 'integration';
}

export interface AuditFilter {
  eventId?: string;
  userId?: string;
  action?: string;
  category?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditStatistics {
  totalLogs: number;
  logsByCategory: Record<string, number>;
  logsBySeverity: Record<string, number>;
  logsByAction: Record<string, number>;
  recentActivity: AuditLog[];
  errorRate: number;
  averageResponseTime: number;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  services: ServiceStatus[];
  lastCheck: string;
  uptime: number;
  performance: PerformanceMetrics;
}

export interface ServiceStatus {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  lastCheck: string;
  error?: string;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
  throughput: number;
}

export class ESocialAuditService {
  private logs: AuditLog[] = [];
  private maxLogs: number = 10000;

  // =====================================================
  // LOGGING DE EVENTOS
  // =====================================================

  async logEvent(
    eventId: string,
    action: string,
    description: string,
    userId: string,
    userName: string,
    details: any = {},
    severity: 'info' | 'warning' | 'error' | 'critical' = 'info',
    category: 'event' | 'batch' | 'system' | 'user' | 'integration' = 'event'
  ): Promise<void> {
    const log: AuditLog = {
      id: this.generateLogId(),
      eventId,
      action,
      description,
      userId,
      userName,
      timestamp: new Date().toISOString(),
      details,
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent(),
      severity,
      category
    };

    this.logs.unshift(log);

    // Manter apenas os logs mais recentes
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Em produção, aqui seria salvo no banco de dados
    console.log('Audit Log:', log);
  }

  // =====================================================
  // LOGGING DE OPERAÇÕES DE EVENTO
  // =====================================================

  async logEventCreation(event: ESocialEvent, userId: string, userName: string): Promise<void> {
    await this.logEvent(
      event.id,
      'CREATE_EVENT',
      `Evento eSocial criado: ${event.tipo_evento}`,
      userId,
      userName,
      {
        eventType: event.tipo_evento,
        eventCode: event.codigo_evento,
        description: event.descricao,
        status: event.status
      },
      'info',
      'event'
    );
  }

  async logEventUpdate(event: ESocialEvent, changes: any, userId: string, userName: string): Promise<void> {
    await this.logEvent(
      event.id,
      'UPDATE_EVENT',
      `Evento eSocial atualizado: ${event.tipo_evento}`,
      userId,
      userName,
      {
        eventType: event.tipo_evento,
        changes,
        previousStatus: changes.previousStatus,
        newStatus: event.status
      },
      'info',
      'event'
    );
  }

  async logEventDeletion(eventId: string, eventType: string, userId: string, userName: string): Promise<void> {
    await this.logEvent(
      eventId,
      'DELETE_EVENT',
      `Evento eSocial excluído: ${eventType}`,
      userId,
      userName,
      {
        eventType
      },
      'warning',
      'event'
    );
  }

  async logEventSend(event: ESocialEvent, userId: string, userName: string, result: any): Promise<void> {
    await this.logEvent(
      event.id,
      'SEND_EVENT',
      `Evento eSocial enviado: ${event.tipo_evento}`,
      userId,
      userName,
      {
        eventType: event.tipo_evento,
        protocolNumber: result.protocolNumber,
        success: result.success,
        message: result.message
      },
      result.success ? 'info' : 'error',
      'integration'
    );
  }

  // =====================================================
  // LOGGING DE OPERAÇÕES DE LOTE
  // =====================================================

  async logBatchCreation(batchId: string, eventCount: number, userId: string, userName: string): Promise<void> {
    await this.logEvent(
      batchId,
      'CREATE_BATCH',
      `Lote eSocial criado com ${eventCount} eventos`,
      userId,
      userName,
      {
        batchId,
        eventCount
      },
      'info',
      'batch'
    );
  }

  async logBatchSend(batchId: string, eventCount: number, userId: string, userName: string, result: any): Promise<void> {
    await this.logEvent(
      batchId,
      'SEND_BATCH',
      `Lote eSocial enviado: ${batchId}`,
      userId,
      userName,
      {
        batchId,
        eventCount,
        sentEvents: result.sentEvents,
        failedEvents: result.failedEvents,
        success: result.success
      },
      result.success ? 'info' : 'error',
      'integration'
    );
  }

  async logBatchProcessing(batchId: string, status: string, userId: string, userName: string, details: any): Promise<void> {
    await this.logEvent(
      batchId,
      'PROCESS_BATCH',
      `Lote eSocial processado: ${status}`,
      userId,
      userName,
      {
        batchId,
        status,
        ...details
      },
      status === 'completed' ? 'info' : 'warning',
      'batch'
    );
  }

  // =====================================================
  // LOGGING DE SISTEMA
  // =====================================================

  async logSystemError(error: Error, context: string, userId?: string, userName?: string): Promise<void> {
    await this.logEvent(
      'SYSTEM',
      'SYSTEM_ERROR',
      `Erro do sistema: ${error.message}`,
      userId || 'SYSTEM',
      userName || 'System',
      {
        error: error.message,
        stack: error.stack,
        context
      },
      'critical',
      'system'
    );
  }

  async logIntegrationError(service: string, error: Error, context: string, userId?: string, userName?: string): Promise<void> {
    await this.logEvent(
      'INTEGRATION',
      'INTEGRATION_ERROR',
      `Erro de integração com ${service}: ${error.message}`,
      userId || 'SYSTEM',
      userName || 'System',
      {
        service,
        error: error.message,
        stack: error.stack,
        context
      },
      'error',
      'integration'
    );
  }

  async logUserAction(action: string, description: string, userId: string, userName: string, details: any = {}): Promise<void> {
    await this.logEvent(
      'USER',
      action,
      description,
      userId,
      userName,
      details,
      'info',
      'user'
    );
  }

  // =====================================================
  // CONSULTA DE LOGS
  // =====================================================

  async getLogs(filter: AuditFilter = {}): Promise<AuditLog[]> {
    let filteredLogs = [...this.logs];

    // Aplicar filtros
    if (filter.eventId) {
      filteredLogs = filteredLogs.filter(log => log.eventId === filter.eventId);
    }

    if (filter.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filter.userId);
    }

    if (filter.action) {
      filteredLogs = filteredLogs.filter(log => log.action === filter.action);
    }

    if (filter.category) {
      filteredLogs = filteredLogs.filter(log => log.category === filter.category);
    }

    if (filter.severity) {
      filteredLogs = filteredLogs.filter(log => log.severity === filter.severity);
    }

    if (filter.startDate) {
      const startDate = new Date(filter.startDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= startDate);
    }

    if (filter.endDate) {
      const endDate = new Date(filter.endDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= endDate);
    }

    // Aplicar paginação
    const offset = filter.offset || 0;
    const limit = filter.limit || 100;

    return filteredLogs.slice(offset, offset + limit);
  }

  async getLogById(logId: string): Promise<AuditLog | null> {
    return this.logs.find(log => log.id === logId) || null;
  }

  // =====================================================
  // ESTATÍSTICAS DE AUDITORIA
  // =====================================================

  async getAuditStatistics(): Promise<AuditStatistics> {
    const totalLogs = this.logs.length;
    
    // Estatísticas por categoria
    const logsByCategory: Record<string, number> = {};
    this.logs.forEach(log => {
      logsByCategory[log.category] = (logsByCategory[log.category] || 0) + 1;
    });

    // Estatísticas por severidade
    const logsBySeverity: Record<string, number> = {};
    this.logs.forEach(log => {
      logsBySeverity[log.severity] = (logsBySeverity[log.severity] || 0) + 1;
    });

    // Estatísticas por ação
    const logsByAction: Record<string, number> = {};
    this.logs.forEach(log => {
      logsByAction[log.action] = (logsByAction[log.action] || 0) + 1;
    });

    // Atividade recente (últimas 24 horas)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = this.logs.filter(log => 
      new Date(log.timestamp) >= oneDayAgo
    ).slice(0, 10);

    // Taxa de erro
    const errorLogs = this.logs.filter(log => 
      log.severity === 'error' || log.severity === 'critical'
    ).length;
    const errorRate = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;

    // Tempo médio de resposta (simulado)
    const averageResponseTime = this.calculateAverageResponseTime();

    return {
      totalLogs,
      logsByCategory,
      logsBySeverity,
      logsByAction,
      recentActivity,
      errorRate,
      averageResponseTime
    };
  }

  // =====================================================
  // MONITORAMENTO DE SAÚDE DO SISTEMA
  // =====================================================

  async getSystemHealth(): Promise<SystemHealth> {
    const services: ServiceStatus[] = [
      {
        name: 'eSocial API',
        status: 'up',
        responseTime: 150,
        lastCheck: new Date().toISOString()
      },
      {
        name: 'Database',
        status: 'up',
        responseTime: 50,
        lastCheck: new Date().toISOString()
      },
      {
        name: 'XML Generator',
        status: 'up',
        responseTime: 25,
        lastCheck: new Date().toISOString()
      },
      {
        name: 'Validation Service',
        status: 'up',
        responseTime: 30,
        lastCheck: new Date().toISOString()
      }
    ];

    const performance: PerformanceMetrics = {
      averageResponseTime: this.calculateAverageResponseTime(),
      successRate: this.calculateSuccessRate(),
      errorRate: this.calculateErrorRate(),
      throughput: this.calculateThroughput()
    };

    const overallStatus = this.determineOverallStatus(services, performance);

    return {
      status: overallStatus,
      services,
      lastCheck: new Date().toISOString(),
      uptime: this.calculateUptime(),
      performance
    };
  }

  // =====================================================
  // MÉTODOS AUXILIARES
  // =====================================================

  private generateLogId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private getClientIP(): string {
    // Em produção, obter IP real do cliente
    return '127.0.0.1';
  }

  private getUserAgent(): string {
    // Em produção, obter User-Agent real
    return 'MultiWeave-eSocial/1.0.0';
  }

  private calculateAverageResponseTime(): number {
    // Simular cálculo de tempo médio de resposta
    return Math.random() * 200 + 50; // 50-250ms
  }

  private calculateSuccessRate(): number {
    const successLogs = this.logs.filter(log => 
      log.severity === 'info' && 
      (log.action.includes('SEND') || log.action.includes('CREATE'))
    ).length;
    
    const totalActionLogs = this.logs.filter(log => 
      log.action.includes('SEND') || log.action.includes('CREATE')
    ).length;

    return totalActionLogs > 0 ? (successLogs / totalActionLogs) * 100 : 100;
  }

  private calculateErrorRate(): number {
    const errorLogs = this.logs.filter(log => 
      log.severity === 'error' || log.severity === 'critical'
    ).length;

    return this.logs.length > 0 ? (errorLogs / this.logs.length) * 100 : 0;
  }

  private calculateThroughput(): number {
    // Simular cálculo de throughput (eventos por minuto)
    return Math.random() * 100 + 50; // 50-150 eventos/min
  }

  private calculateUptime(): number {
    // Simular cálculo de uptime (em segundos)
    return Math.random() * 86400 + 3600; // 1-25 horas
  }

  private determineOverallStatus(services: ServiceStatus[], performance: PerformanceMetrics): 'healthy' | 'warning' | 'critical' {
    const downServices = services.filter(service => service.status === 'down').length;
    const degradedServices = services.filter(service => service.status === 'degraded').length;

    if (downServices > 0 || performance.errorRate > 10) {
      return 'critical';
    } else if (degradedServices > 0 || performance.errorRate > 5) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  // =====================================================
  // MÉTODOS DE LIMPEZA
  // =====================================================

  async cleanOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    const initialCount = this.logs.length;
    
    this.logs = this.logs.filter(log => new Date(log.timestamp) >= cutoffDate);
    
    return initialCount - this.logs.length;
  }

  async exportLogs(filter: AuditFilter = {}): Promise<string> {
    const logs = await this.getLogs(filter);
    
    // Exportar como JSON
    return JSON.stringify(logs, null, 2);
  }

  async exportLogsAsCSV(filter: AuditFilter = {}): Promise<string> {
    const logs = await this.getLogs(filter);
    
    const headers = ['ID', 'Event ID', 'Action', 'Description', 'User ID', 'User Name', 'Timestamp', 'Severity', 'Category'];
    const csvRows = [headers.join(',')];
    
    logs.forEach(log => {
      const row = [
        log.id,
        log.eventId,
        log.action,
        `"${log.description.replace(/"/g, '""')}"`,
        log.userId,
        log.userName,
        log.timestamp,
        log.severity,
        log.category
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }
}

// =====================================================
// INSTÂNCIA SINGLETON DO SERVIÇO
// =====================================================

let auditServiceInstance: ESocialAuditService | null = null;

export function getESocialAuditService(): ESocialAuditService {
  if (!auditServiceInstance) {
    auditServiceInstance = new ESocialAuditService();
  }
  return auditServiceInstance;
}
