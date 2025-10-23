import { ESocialEvent } from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE EXPORTAÇÃO DE DADOS eSOCIAL
// =====================================================

export interface ExportConfig {
  format: 'csv' | 'excel' | 'pdf' | 'json' | 'xml';
  filename?: string;
  includeHeaders: boolean;
  encoding: 'utf-8' | 'latin1' | 'ascii';
  delimiter?: string;
  dateFormat: string;
  numberFormat: string;
  currencyFormat: string;
  filters?: ExportFilters;
  columns?: string[];
  grouping?: ExportGrouping;
  sorting?: ExportSorting;
}

export interface ExportFilters {
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  eventTypes?: string[];
  status?: string[];
  employees?: string[];
  departments?: string[];
  companies?: string[];
}

export interface ExportGrouping {
  field: string;
  label: string;
  sortOrder: 'asc' | 'desc';
  showSubtotals: boolean;
  showGrandTotal: boolean;
}

export interface ExportSorting {
  field: string;
  order: 'asc' | 'desc';
}

export interface ExportResult {
  success: boolean;
  filename: string;
  fileSize: number;
  mimeType: string;
  downloadUrl?: string;
  message: string;
  errors?: string[];
}

export interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalRecords: number;
  processedRecords: number;
  filename: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  config: ExportConfig;
}

export class ESocialExportService {
  private jobs: ExportJob[] = [];
  private maxJobs: number = 100;

  // =====================================================
  // EXPORTAÇÃO DE DADOS
  // =====================================================

  async exportData(
    events: ESocialEvent[],
    config: ExportConfig,
    userId: string = 'SYSTEM'
  ): Promise<ExportResult> {
    try {
      // 1. Filtrar dados
      const filteredEvents = this.filterEvents(events, config.filters);

      // 2. Aplicar agrupamento
      const groupedData = config.grouping 
        ? this.groupData(filteredEvents, config.grouping)
        : { data: filteredEvents, groups: {} };

      // 3. Aplicar ordenação
      const sortedData = config.sorting
        ? this.sortData(groupedData.data, config.sorting)
        : groupedData.data;

      // 4. Selecionar colunas
      const selectedData = config.columns
        ? this.selectColumns(sortedData, config.columns)
        : sortedData;

      // 5. Gerar arquivo
      const result = await this.generateFile(selectedData, config);

      return result;
    } catch (error) {
      return {
        success: false,
        filename: '',
        fileSize: 0,
        mimeType: '',
        message: 'Erro na exportação: ' + (error as Error).message,
        errors: [(error as Error).message]
      };
    }
  }

  // =====================================================
  // EXPORTAÇÃO ASSÍNCRONA
  // =====================================================

  async createExportJob(
    events: ESocialEvent[],
    config: ExportConfig,
    userId: string = 'SYSTEM'
  ): Promise<ExportJob> {
    const job: ExportJob = {
      id: this.generateJobId(),
      status: 'pending',
      progress: 0,
      totalRecords: events.length,
      processedRecords: 0,
      filename: config.filename || this.generateFilename(config.format),
      createdAt: new Date().toISOString(),
      config
    };

    this.jobs.push(job);

    // Manter apenas os jobs mais recentes
    if (this.jobs.length > this.maxJobs) {
      this.jobs = this.jobs.slice(0, this.maxJobs);
    }

    // Processar job em background
    this.processExportJob(job, events, userId);

    return job;
  }

  async getExportJob(jobId: string): Promise<ExportJob | null> {
    return this.jobs.find(job => job.id === jobId) || null;
  }

  async getExportJobs(userId?: string): Promise<ExportJob[]> {
    return userId 
      ? this.jobs.filter(job => job.config.filename?.includes(userId))
      : this.jobs;
  }

  private async processExportJob(job: ExportJob, events: ESocialEvent[], userId: string): Promise<void> {
    try {
      job.status = 'processing';
      job.startedAt = new Date().toISOString();
      job.progress = 10;

      // Simular processamento em lotes
      const batchSize = 100;
      const totalBatches = Math.ceil(events.length / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, events.length);
        const batch = events.slice(start, end);

        // Processar lote
        await this.processBatch(batch, job.config);

        job.processedRecords = end;
        job.progress = Math.round((end / events.length) * 90) + 10;

        // Simular delay
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.progress = 100;

    } catch (error) {
      job.status = 'failed';
      job.error = (error as Error).message;
      job.completedAt = new Date().toISOString();
    }
  }

  private async processBatch(events: ESocialEvent[], config: ExportConfig): Promise<void> {
    // Simular processamento do lote
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // =====================================================
  // GERAÇÃO DE ARQUIVOS
  // =====================================================

  private async generateFile(data: any[], config: ExportConfig): Promise<ExportResult> {
    const filename = config.filename || this.generateFilename(config.format);
    let content: string;
    let mimeType: string;

    switch (config.format) {
      case 'csv':
        content = this.generateCSV(data, config);
        mimeType = 'text/csv';
        break;
      case 'excel':
        content = this.generateExcel(data, config);
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'pdf':
        content = this.generatePDF(data, config);
        mimeType = 'application/pdf';
        break;
      case 'json':
        content = this.generateJSON(data, config);
        mimeType = 'application/json';
        break;
      case 'xml':
        content = this.generateXML(data, config);
        mimeType = 'application/xml';
        break;
      default:
        throw new Error(`Formato não suportado: ${config.format}`);
    }

    const fileSize = new Blob([content]).size;

    return {
      success: true,
      filename,
      fileSize,
      mimeType,
      message: 'Exportação concluída com sucesso'
    };
  }

  // =====================================================
  // GERAÇÃO DE FORMATOS ESPECÍFICOS
  // =====================================================

  private generateCSV(data: any[], config: ExportConfig): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [];

    if (config.includeHeaders) {
      csvRows.push(headers.join(config.delimiter || ','));
    }

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        
        // Escapar aspas duplas
        const stringValue = String(value).replace(/"/g, '""');
        
        // Adicionar aspas se contém delimitador ou quebra de linha
        if (stringValue.includes(config.delimiter || ',') || stringValue.includes('\n')) {
          return `"${stringValue}"`;
        }
        
        return stringValue;
      });
      
      csvRows.push(values.join(config.delimiter || ','));
    });

    return csvRows.join('\n');
  }

  private generateExcel(data: any[], config: ExportConfig): string {
    // Simular geração de Excel (em produção, usar biblioteca como xlsx)
    const headers = Object.keys(data[0]);
    let excelContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
    excelContent += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">\n';
    excelContent += '<Worksheet>\n';
    excelContent += '<Table>\n';

    if (config.includeHeaders) {
      excelContent += '<Row>\n';
      headers.forEach(header => {
        excelContent += `<Cell><Data>${header}</Data></Cell>\n`;
      });
      excelContent += '</Row>\n';
    }

    data.forEach(row => {
      excelContent += '<Row>\n';
      headers.forEach(header => {
        const value = row[header] || '';
        excelContent += `<Cell><Data>${value}</Data></Cell>\n`;
      });
      excelContent += '</Row>\n';
    });

    excelContent += '</Table>\n';
    excelContent += '</Worksheet>\n';
    excelContent += '</Workbook>';

    return excelContent;
  }

  private generatePDF(data: any[], config: ExportConfig): string {
    // Simular geração de PDF (em produção, usar biblioteca como jsPDF)
    let pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 100
>>
stream
BT
/F1 12 Tf
100 700 Td
(Relatório eSocial) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
304
%%EOF`;

    return pdfContent;
  }

  private generateJSON(data: any[], config: ExportConfig): string {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        totalRecords: data.length,
        format: config.format,
        version: '1.0.0'
      },
      data
    };

    return JSON.stringify(exportData, null, 2);
  }

  private generateXML(data: any[], config: ExportConfig): string {
    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xmlContent += '<eSocialExport>\n';
    xmlContent += '<metadata>\n';
    xmlContent += `<exportedAt>${new Date().toISOString()}</exportedAt>\n`;
    xmlContent += `<totalRecords>${data.length}</totalRecords>\n`;
    xmlContent += `<format>${config.format}</format>\n`;
    xmlContent += '</metadata>\n';
    xmlContent += '<events>\n';

    data.forEach((item, index) => {
      xmlContent += `<event id="${index}">\n`;
      Object.entries(item).forEach(([key, value]) => {
        xmlContent += `<${key}>${value || ''}</${key}>\n`;
      });
      xmlContent += '</event>\n';
    });

    xmlContent += '</events>\n';
    xmlContent += '</eSocialExport>';

    return xmlContent;
  }

  // =====================================================
  // MÉTODOS AUXILIARES
  // =====================================================

  private filterEvents(events: ESocialEvent[], filters?: ExportFilters): ESocialEvent[] {
    if (!filters) return events;

    let filtered = [...events];

    if (filters.dateRange) {
      const startDate = new Date(filters.dateRange.startDate);
      const endDate = new Date(filters.dateRange.endDate);
      
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.created_at || '');
        return eventDate >= startDate && eventDate <= endDate;
      });
    }

    if (filters.eventTypes && filters.eventTypes.length > 0) {
      filtered = filtered.filter(event => 
        filters.eventTypes!.includes(event.tipo_evento)
      );
    }

    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(event => 
        filters.status!.includes(event.status)
      );
    }

    if (filters.employees && filters.employees.length > 0) {
      filtered = filtered.filter(event => 
        event.employee_id && filters.employees!.includes(event.employee_id)
      );
    }

    return filtered;
  }

  private groupData(events: ESocialEvent[], grouping: ExportGrouping): { data: ESocialEvent[], groups: Record<string, any> } {
    const groups: Record<string, ESocialEvent[]> = {};
    
    events.forEach(event => {
      const groupKey = (event as any)[grouping.field] || 'N/A';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(event);
    });

    const sortedGroups = Object.keys(groups).sort((a, b) => 
      grouping.sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
    );

    const data: ESocialEvent[] = [];
    sortedGroups.forEach(key => {
      data.push(...groups[key]);
    });

    return { data, groups };
  }

  private sortData(events: ESocialEvent[], sorting: ExportSorting): ESocialEvent[] {
    return [...events].sort((a, b) => {
      const aValue = (a as any)[sorting.field];
      const bValue = (b as any)[sorting.field];
      
      if (aValue < bValue) return sorting.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return sorting.order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private selectColumns(data: any[], columns: string[]): any[] {
    return data.map(item => {
      const selectedItem: any = {};
      columns.forEach(column => {
        if (item.hasOwnProperty(column)) {
          selectedItem[column] = item[column];
        }
      });
      return selectedItem;
    });
  }

  private generateFilename(format: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    return `esocial-export-${timestamp}.${format}`;
  }

  private generateJobId(): string {
    return 'export_' + Math.random().toString(36).substring(2, 15);
  }

  // =====================================================
  // MÉTODOS DE UTILIDADE
  // =====================================================

  async getSupportedFormats(): Promise<string[]> {
    return ['csv', 'excel', 'pdf', 'json', 'xml'];
  }

  async getFormatInfo(format: string): Promise<{
    name: string;
    description: string;
    mimeType: string;
    extension: string;
    maxRecords?: number;
  }> {
    const formats: Record<string, any> = {
      'csv': {
        name: 'CSV',
        description: 'Arquivo de texto separado por vírgulas',
        mimeType: 'text/csv',
        extension: 'csv',
        maxRecords: 1000000
      },
      'excel': {
        name: 'Excel',
        description: 'Planilha do Microsoft Excel',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: 'xlsx',
        maxRecords: 1000000
      },
      'pdf': {
        name: 'PDF',
        description: 'Documento PDF',
        mimeType: 'application/pdf',
        extension: 'pdf',
        maxRecords: 10000
      },
      'json': {
        name: 'JSON',
        description: 'Arquivo JSON',
        mimeType: 'application/json',
        extension: 'json',
        maxRecords: 1000000
      },
      'xml': {
        name: 'XML',
        description: 'Arquivo XML',
        mimeType: 'application/xml',
        extension: 'xml',
        maxRecords: 1000000
      }
    };

    return formats[format] || {
      name: 'Unknown',
      description: 'Formato não reconhecido',
      mimeType: 'application/octet-stream',
      extension: 'bin'
    };
  }

  async cleanupOldJobs(daysToKeep: number = 7): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    const initialCount = this.jobs.length;
    
    this.jobs = this.jobs.filter(job => 
      new Date(job.createdAt) >= cutoffDate
    );
    
    return initialCount - this.jobs.length;
  }
}

// =====================================================
// INSTÂNCIA SINGLETON DO SERVIÇO
// =====================================================

let exportServiceInstance: ESocialExportService | null = null;

export function getESocialExportService(): ESocialExportService {
  if (!exportServiceInstance) {
    exportServiceInstance = new ESocialExportService();
  }
  return exportServiceInstance;
}
