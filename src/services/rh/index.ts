// =====================================================
// ÍNDICE DOS SERVIÇOS eSOCIAL
// =====================================================

// Serviços principais
export { 
  ESocialService,
  getESocialService,
  initializeESocialService,
  defaultESocialConfig,
  type ESocialServiceConfig,
  type ProcessEventResult,
  type ProcessBatchResult,
  type ESocialStatistics
} from './eSocialService';

// Serviços de geração e validação
export {
  ESocialXMLService,
  getESocialXMLService,
  initializeESocialXMLService,
  type ESocialXMLConfig,
  type ESocialEventData
} from './eSocialXMLService';

export {
  ESocialValidationService,
  getESocialValidationService,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  type EmployeeData,
  type CompanyData
} from './eSocialValidationService';

// Serviços de envio e retorno
export {
  ESocialSendService,
  getESocialSendService,
  initializeESocialSendService,
  type ESocialConfig,
  type SendResult,
  type BatchSendResult,
  type EventSendResult
} from './eSocialSendService';

export {
  ESocialReturnService,
  getESocialReturnService,
  type ReturnData,
  type BatchReturnData,
  type ReturnProcessingResult,
  type ProcessingError,
  type ProcessingWarning
} from './eSocialReturnService';

// Serviços de auditoria e monitoramento
export {
  ESocialAuditService,
  getESocialAuditService,
  type AuditLog,
  type AuditFilter,
  type AuditStatistics,
  type SystemHealth,
  type ServiceStatus,
  type PerformanceMetrics
} from './eSocialAuditService';

// Serviços de relatórios e analytics
export {
  ESocialReportService,
  getESocialReportService,
  type ReportConfig,
  type ReportFilters,
  type ReportColumn,
  type ReportGrouping,
  type ReportSorting,
  type ReportPagination,
  type ReportData,
  type ReportSummary,
  type ReportMetadata,
  type ChartData,
  type DashboardData,
  type TrendData
} from './eSocialReportService';

// Serviços de alertas
export {
  ESocialAlertService,
  getESocialAlertService,
  type AlertRule,
  type AlertCondition,
  type AlertAction,
  type Alert,
  type AlertFilter,
  type AlertStatistics
} from './eSocialAlertService';

// Serviços de exportação
export {
  ESocialExportService,
  getESocialExportService,
  type ExportConfig,
  type ExportFilters,
  type ExportGrouping,
  type ExportSorting,
  type ExportResult,
  type ExportJob
} from './eSocialExportService';

// =====================================================
// CONFIGURAÇÃO PADRÃO COMPLETA
// =====================================================

export const defaultESocialServiceConfig = {
  xml: {
    companyId: '',
    cnpj: '',
    companyName: '',
    environment: 'testing' as const,
    version: '1.0.0'
  },
  send: {
    environment: 'testing' as const,
    apiUrl: 'https://api.esocial.gov.br',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  }
};

// =====================================================
// INICIALIZAÇÃO RÁPIDA
// =====================================================

export function initializeESocialServices(config: typeof defaultESocialServiceConfig) {
  const eSocialService = initializeESocialService(config);
  const reportService = getESocialReportService();
  const alertService = getESocialAlertService();
  const exportService = getESocialExportService();
  const auditService = getESocialAuditService();

  return {
    eSocialService,
    reportService,
    alertService,
    exportService,
    auditService
  };
}

// =====================================================
// UTILITÁRIOS
// =====================================================

export function getESocialServiceStatus() {
  return {
    services: {
      xml: 'available',
      validation: 'available',
      send: 'available',
      return: 'available',
      audit: 'available',
      report: 'available',
      alert: 'available',
      export: 'available'
    },
    version: '1.0.0',
    lastUpdate: new Date().toISOString()
  };
}
