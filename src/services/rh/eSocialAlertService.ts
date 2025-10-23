import { ESocialEvent } from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE ALERTAS eSOCIAL
// =====================================================

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertAction[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'system' | 'business' | 'compliance' | 'performance';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface AlertAction {
  type: 'email' | 'sms' | 'webhook' | 'notification' | 'log';
  config: {
    recipients?: string[];
    subject?: string;
    message?: string;
    url?: string;
    headers?: Record<string, string>;
  };
}

export interface Alert {
  id: string;
  ruleId: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  category: string;
  source: string;
  data: any;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface AlertFilter {
  status?: string[];
  severity?: string[];
  category?: string[];
  source?: string[];
  startDate?: string;
  endDate?: string;
  acknowledged?: boolean;
  resolved?: boolean;
}

export interface AlertStatistics {
  totalAlerts: number;
  activeAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  alertsBySeverity: Record<string, number>;
  alertsByCategory: Record<string, number>;
  alertsBySource: Record<string, number>;
  averageResolutionTime: number;
  topRules: Array<{
    ruleId: string;
    ruleName: string;
    alertCount: number;
  }>;
}

export class ESocialAlertService {
  private rules: AlertRule[] = [];
  private alerts: Alert[] = [];
  private maxAlerts: number = 10000;

  constructor() {
    this.initializeDefaultRules();
  }

  // =====================================================
  // GESTÃO DE REGRAS DE ALERTA
  // =====================================================

  async createRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertRule> {
    const newRule: AlertRule = {
      ...rule,
      id: this.generateRuleId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.rules.push(newRule);
    return newRule;
  }

  async updateRule(ruleId: string, updates: Partial<AlertRule>): Promise<AlertRule | null> {
    const ruleIndex = this.rules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex === -1) return null;

    this.rules[ruleIndex] = {
      ...this.rules[ruleIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return this.rules[ruleIndex];
  }

  async deleteRule(ruleId: string): Promise<boolean> {
    const ruleIndex = this.rules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex === -1) return false;

    this.rules.splice(ruleIndex, 1);
    return true;
  }

  async getRules(): Promise<AlertRule[]> {
    return [...this.rules];
  }

  async getRule(ruleId: string): Promise<AlertRule | null> {
    return this.rules.find(rule => rule.id === ruleId) || null;
  }

  // =====================================================
  // AVALIAÇÃO DE ALERTAS
  // =====================================================

  async evaluateAlerts(events: ESocialEvent[]): Promise<Alert[]> {
    const newAlerts: Alert[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      for (const event of events) {
        if (this.evaluateRule(rule, event)) {
          const alert = await this.createAlert(rule, event);
          if (alert) {
            newAlerts.push(alert);
          }
        }
      }
    }

    return newAlerts;
  }

  private evaluateRule(rule: AlertRule, event: ESocialEvent): boolean {
    let result = true;
    let logicalOperator: 'AND' | 'OR' = 'AND';

    for (const condition of rule.conditions) {
      const conditionResult = this.evaluateCondition(condition, event);
      
      if (logicalOperator === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }

      logicalOperator = condition.logicalOperator || 'AND';
    }

    return result;
  }

  private evaluateCondition(condition: AlertCondition, event: ESocialEvent): boolean {
    const fieldValue = this.getFieldValue(event, condition.field);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'not_contains':
        return !String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      default:
        return false;
    }
  }

  private getFieldValue(event: ESocialEvent, field: string): any {
    const fieldMap: Record<string, any> = {
      'tipo_evento': event.tipo_evento,
      'status': event.status,
      'codigo_evento': event.codigo_evento,
      'employee_id': event.employee_id,
      'created_at': event.created_at,
      'data_envio': event.data_envio,
      'data_processamento': event.data_processamento,
      'error_message': event.error_message,
      'numero_recibo': event.numero_recibo
    };

    return fieldMap[field] || null;
  }

  // =====================================================
  // CRIAÇÃO DE ALERTAS
  // =====================================================

  private async createAlert(rule: AlertRule, event: ESocialEvent): Promise<Alert | null> {
    // Verificar se já existe um alerta ativo para esta regra e evento
    const existingAlert = this.alerts.find(alert => 
      alert.ruleId === rule.id && 
      alert.status === 'active' &&
      alert.data.eventId === event.id
    );

    if (existingAlert) return null;

    const alert: Alert = {
      id: this.generateAlertId(),
      ruleId: rule.id,
      title: this.generateAlertTitle(rule, event),
      message: this.generateAlertMessage(rule, event),
      severity: this.mapPriorityToSeverity(rule.priority),
      status: 'active',
      category: rule.category,
      source: 'eSocial',
      data: {
        eventId: event.id,
        eventType: event.tipo_evento,
        eventStatus: event.status,
        ruleName: rule.name
      },
      createdAt: new Date().toISOString()
    };

    this.alerts.unshift(alert);

    // Manter apenas os alertas mais recentes
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(0, this.maxAlerts);
    }

    // Executar ações da regra
    await this.executeAlertActions(alert, rule);

    return alert;
  }

  private generateAlertTitle(rule: AlertRule, event: ESocialEvent): string {
    return `${rule.name} - ${event.tipo_evento}`;
  }

  private generateAlertMessage(rule: AlertRule, event: ESocialEvent): string {
    return `${rule.description}\n\nEvento: ${event.tipo_evento}\nStatus: ${event.status}\nCódigo: ${event.codigo_evento}`;
  }

  private mapPriorityToSeverity(priority: string): 'info' | 'warning' | 'error' | 'critical' {
    const mapping: Record<string, 'info' | 'warning' | 'error' | 'critical'> = {
      'low': 'info',
      'medium': 'warning',
      'high': 'error',
      'critical': 'critical'
    };
    return mapping[priority] || 'info';
  }

  // =====================================================
  // EXECUÇÃO DE AÇÕES
  // =====================================================

  private async executeAlertActions(alert: Alert, rule: AlertRule): Promise<void> {
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'email':
            await this.sendEmailAlert(alert, action.config);
            break;
          case 'sms':
            await this.sendSMSAlert(alert, action.config);
            break;
          case 'webhook':
            await this.sendWebhookAlert(alert, action.config);
            break;
          case 'notification':
            await this.sendNotificationAlert(alert, action.config);
            break;
          case 'log':
            await this.logAlert(alert, action.config);
            break;
        }
      } catch (error) {
        console.error(`Erro ao executar ação ${action.type}:`, error);
      }
    }
  }

  private async sendEmailAlert(alert: Alert, config: any): Promise<void> {
    // Simular envio de email
    console.log('Email Alert:', {
      to: config.recipients,
      subject: config.subject || alert.title,
      message: config.message || alert.message
    });
  }

  private async sendSMSAlert(alert: Alert, config: any): Promise<void> {
    // Simular envio de SMS
    console.log('SMS Alert:', {
      to: config.recipients,
      message: config.message || alert.message
    });
  }

  private async sendWebhookAlert(alert: Alert, config: any): Promise<void> {
    // Simular envio de webhook
    console.log('Webhook Alert:', {
      url: config.url,
      headers: config.headers,
      data: alert
    });
  }

  private async sendNotificationAlert(alert: Alert, config: any): Promise<void> {
    // Simular notificação interna
    console.log('Notification Alert:', {
      message: config.message || alert.message,
      severity: alert.severity
    });
  }

  private async logAlert(alert: Alert, config: any): Promise<void> {
    // Log do alerta
    console.log('Alert Log:', {
      alertId: alert.id,
      ruleId: alert.ruleId,
      severity: alert.severity,
      message: alert.message
    });
  }

  // =====================================================
  // GESTÃO DE ALERTAS
  // =====================================================

  async getAlerts(filter: AlertFilter = {}): Promise<Alert[]> {
    let filteredAlerts = [...this.alerts];

    if (filter.status && filter.status.length > 0) {
      filteredAlerts = filteredAlerts.filter(alert => 
        filter.status!.includes(alert.status)
      );
    }

    if (filter.severity && filter.severity.length > 0) {
      filteredAlerts = filteredAlerts.filter(alert => 
        filter.severity!.includes(alert.severity)
      );
    }

    if (filter.category && filter.category.length > 0) {
      filteredAlerts = filteredAlerts.filter(alert => 
        filter.category!.includes(alert.category)
      );
    }

    if (filter.source && filter.source.length > 0) {
      filteredAlerts = filteredAlerts.filter(alert => 
        filter.source!.includes(alert.source)
      );
    }

    if (filter.startDate) {
      const startDate = new Date(filter.startDate);
      filteredAlerts = filteredAlerts.filter(alert => 
        new Date(alert.createdAt) >= startDate
      );
    }

    if (filter.endDate) {
      const endDate = new Date(filter.endDate);
      filteredAlerts = filteredAlerts.filter(alert => 
        new Date(alert.createdAt) <= endDate
      );
    }

    if (filter.acknowledged !== undefined) {
      filteredAlerts = filteredAlerts.filter(alert => 
        filter.acknowledged ? alert.acknowledgedAt : !alert.acknowledgedAt
      );
    }

    if (filter.resolved !== undefined) {
      filteredAlerts = filteredAlerts.filter(alert => 
        filter.resolved ? alert.resolvedAt : !alert.resolvedAt
      );
    }

    return filteredAlerts;
  }

  async acknowledgeAlert(alertId: string, userId: string, userName: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert || alert.status !== 'active') return false;

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = userName;

    return true;
  }

  async resolveAlert(alertId: string, userId: string, userName: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert || alert.status === 'resolved') return false;

    alert.status = 'resolved';
    alert.resolvedAt = new Date().toISOString();
    alert.resolvedBy = userName;

    return true;
  }

  async suppressAlert(alertId: string, userId: string, userName: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;

    alert.status = 'suppressed';
    alert.resolvedAt = new Date().toISOString();
    alert.resolvedBy = userName;

    return true;
  }

  // =====================================================
  // ESTATÍSTICAS
  // =====================================================

  async getAlertStatistics(): Promise<AlertStatistics> {
    const totalAlerts = this.alerts.length;
    const activeAlerts = this.alerts.filter(a => a.status === 'active').length;
    const acknowledgedAlerts = this.alerts.filter(a => a.status === 'acknowledged').length;
    const resolvedAlerts = this.alerts.filter(a => a.status === 'resolved').length;

    // Estatísticas por severidade
    const alertsBySeverity: Record<string, number> = {};
    this.alerts.forEach(alert => {
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
    });

    // Estatísticas por categoria
    const alertsByCategory: Record<string, number> = {};
    this.alerts.forEach(alert => {
      alertsByCategory[alert.category] = (alertsByCategory[alert.category] || 0) + 1;
    });

    // Estatísticas por fonte
    const alertsBySource: Record<string, number> = {};
    this.alerts.forEach(alert => {
      alertsBySource[alert.source] = (alertsBySource[alert.source] || 0) + 1;
    });

    // Tempo médio de resolução
    const resolvedAlertsWithTime = this.alerts.filter(a => 
      a.status === 'resolved' && a.createdAt && a.resolvedAt
    );
    const averageResolutionTime = resolvedAlertsWithTime.length > 0
      ? resolvedAlertsWithTime.reduce((sum, alert) => {
          const created = new Date(alert.createdAt);
          const resolved = new Date(alert.resolvedAt!);
          return sum + (resolved.getTime() - created.getTime());
        }, 0) / resolvedAlertsWithTime.length
      : 0;

    // Top regras
    const ruleCounts: Record<string, number> = {};
    this.alerts.forEach(alert => {
      ruleCounts[alert.ruleId] = (ruleCounts[alert.ruleId] || 0) + 1;
    });

    const topRules = Object.entries(ruleCounts)
      .map(([ruleId, count]) => {
        const rule = this.rules.find(r => r.id === ruleId);
        return {
          ruleId,
          ruleName: rule?.name || 'Unknown',
          alertCount: count
        };
      })
      .sort((a, b) => b.alertCount - a.alertCount)
      .slice(0, 10);

    return {
      totalAlerts,
      activeAlerts,
      acknowledgedAlerts,
      resolvedAlerts,
      alertsBySeverity,
      alertsByCategory,
      alertsBySource,
      averageResolutionTime,
      topRules
    };
  }

  // =====================================================
  // REGRAS PADRÃO
  // =====================================================

  private initializeDefaultRules(): void {
    // Regra para eventos com erro
    this.rules.push({
      id: 'error-events',
      name: 'Eventos com Erro',
      description: 'Alerta quando um evento eSocial apresenta erro',
      enabled: true,
      conditions: [
        { field: 'status', operator: 'equals', value: 'error' }
      ],
      actions: [
        {
          type: 'email',
          config: {
            recipients: ['admin@empresa.com'],
            subject: 'Erro em Evento eSocial',
            message: 'Um evento eSocial apresentou erro e requer atenção.'
          }
        },
        {
          type: 'notification',
          config: {
            message: 'Evento eSocial com erro detectado'
          }
        }
      ],
      priority: 'high',
      category: 'system',
      createdBy: 'SYSTEM',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Regra para eventos rejeitados
    this.rules.push({
      id: 'rejected-events',
      name: 'Eventos Rejeitados',
      description: 'Alerta quando um evento eSocial é rejeitado',
      enabled: true,
      conditions: [
        { field: 'status', operator: 'equals', value: 'rejected' }
      ],
      actions: [
        {
          type: 'email',
          config: {
            recipients: ['rh@empresa.com'],
            subject: 'Evento eSocial Rejeitado',
            message: 'Um evento eSocial foi rejeitado pelo eSocial.'
          }
        }
      ],
      priority: 'medium',
      category: 'compliance',
      createdBy: 'SYSTEM',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Regra para tempo de processamento alto
    this.rules.push({
      id: 'slow-processing',
      name: 'Processamento Lento',
      description: 'Alerta quando eventos demoram muito para serem processados',
      enabled: true,
      conditions: [
        { field: 'status', operator: 'equals', value: 'pending' },
        { field: 'created_at', operator: 'less_than', value: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }
      ],
      actions: [
        {
          type: 'notification',
          config: {
            message: 'Evento eSocial pendente há mais de 24 horas'
          }
        }
      ],
      priority: 'medium',
      category: 'performance',
      createdBy: 'SYSTEM',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // =====================================================
  // MÉTODOS AUXILIARES
  // =====================================================

  private generateRuleId(): string {
    return 'rule_' + Math.random().toString(36).substring(2, 15);
  }

  private generateAlertId(): string {
    return 'alert_' + Math.random().toString(36).substring(2, 15);
  }
}

// =====================================================
// INSTÂNCIA SINGLETON DO SERVIÇO
// =====================================================

let alertServiceInstance: ESocialAlertService | null = null;

export function getESocialAlertService(): ESocialAlertService {
  if (!alertServiceInstance) {
    alertServiceInstance = new ESocialAlertService();
  }
  return alertServiceInstance;
}
