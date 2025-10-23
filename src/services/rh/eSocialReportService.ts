import { ESocialEvent } from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE RELATÓRIOS PERSONALIZADOS eSOCIAL
// =====================================================

export interface ReportConfig {
  title: string;
  description: string;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  filters: ReportFilters;
  columns: ReportColumn[];
  grouping?: ReportGrouping;
  sorting?: ReportSorting;
  pagination?: ReportPagination;
}

export interface ReportFilters {
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  eventTypes?: string[];
  status?: string[];
  employees?: string[];
  departments?: string[];
  companies?: string[];
  customFilters?: Record<string, any>;
}

export interface ReportColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency';
  format?: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  visible: boolean;
}

export interface ReportGrouping {
  field: string;
  label: string;
  sortOrder: 'asc' | 'desc';
  showSubtotals: boolean;
  showGrandTotal: boolean;
}

export interface ReportSorting {
  field: string;
  order: 'asc' | 'desc';
}

export interface ReportPagination {
  page: number;
  pageSize: number;
  totalItems: number;
}

export interface ReportData {
  headers: string[];
  rows: any[][];
  summary: ReportSummary;
  metadata: ReportMetadata;
}

export interface ReportSummary {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  subtotals?: Record<string, any>;
  grandTotal?: any;
}

export interface ReportMetadata {
  generatedAt: string;
  generatedBy: string;
  reportConfig: ReportConfig;
  dataSource: string;
  version: string;
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'area' | 'scatter';
  title: string;
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string[];
      borderColor?: string[];
      borderWidth?: number;
    }[];
  };
  options?: any;
}

export interface DashboardData {
  summary: {
    totalEvents: number;
    pendingEvents: number;
    sentEvents: number;
    acceptedEvents: number;
    rejectedEvents: number;
    errorEvents: number;
    successRate: number;
    averageProcessingTime: number;
  };
  charts: ChartData[];
  tables: ReportData[];
  trends: TrendData[];
}

export interface TrendData {
  period: string;
  value: number;
  change: number;
  changePercent: number;
}

export class ESocialReportService {
  // =====================================================
  // GERAÇÃO DE RELATÓRIOS
  // =====================================================

  async generateReport(events: ESocialEvent[], config: ReportConfig): Promise<ReportData> {
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

      // 4. Aplicar paginação
      const paginatedData = config.pagination
        ? this.paginateData(sortedData, config.pagination)
        : sortedData;

      // 5. Gerar cabeçalhos
      const headers = config.columns
        .filter(col => col.visible)
        .map(col => col.label);

      // 6. Gerar linhas de dados
      const rows = paginatedData.map(event => 
        config.columns
          .filter(col => col.visible)
          .map(col => this.formatCellValue(event, col))
      );

      // 7. Calcular resumo
      const summary = this.calculateSummary(
        filteredEvents,
        config.pagination,
        groupedData.groups
      );

      // 8. Gerar metadados
      const metadata: ReportMetadata = {
        generatedAt: new Date().toISOString(),
        generatedBy: 'MultiWeave eSocial',
        reportConfig: config,
        dataSource: 'rh.esocial_events',
        version: '1.0.0'
      };

      return {
        headers,
        rows,
        summary,
        metadata
      };
    } catch (error) {
      throw new Error(`Erro na geração do relatório: ${(error as Error).message}`);
    }
  }

  // =====================================================
  // RELATÓRIOS PRÉ-DEFINIDOS
  // =====================================================

  async generateEventStatusReport(events: ESocialEvent[]): Promise<ReportData> {
    const config: ReportConfig = {
      title: 'Relatório de Status de Eventos eSocial',
      description: 'Relatório detalhado do status dos eventos eSocial',
      format: 'pdf',
      filters: {},
      columns: [
        { key: 'tipo_evento', label: 'Tipo de Evento', type: 'string', visible: true },
        { key: 'codigo_evento', label: 'Código', type: 'string', visible: true },
        { key: 'status', label: 'Status', type: 'string', visible: true },
        { key: 'numero_recibo', label: 'Protocolo', type: 'string', visible: true },
        { key: 'created_at', label: 'Data Criação', type: 'date', visible: true },
        { key: 'data_envio', label: 'Data Envio', type: 'date', visible: true },
        { key: 'data_processamento', label: 'Data Processamento', type: 'date', visible: true }
      ],
      grouping: {
        field: 'status',
        label: 'Status',
        sortOrder: 'asc',
        showSubtotals: true,
        showGrandTotal: true
      }
    };

    return await this.generateReport(events, config);
  }

  async generateEventTypeReport(events: ESocialEvent[]): Promise<ReportData> {
    const config: ReportConfig = {
      title: 'Relatório por Tipo de Evento eSocial',
      description: 'Distribuição dos eventos por tipo',
      format: 'excel',
      filters: {},
      columns: [
        { key: 'tipo_evento', label: 'Tipo de Evento', type: 'string', visible: true },
        { key: 'count', label: 'Quantidade', type: 'number', visible: true },
        { key: 'percentage', label: 'Percentual', type: 'number', format: '0.00%', visible: true },
        { key: 'accepted', label: 'Aceitos', type: 'number', visible: true },
        { key: 'rejected', label: 'Rejeitados', type: 'number', visible: true },
        { key: 'error', label: 'Erros', type: 'number', visible: true }
      ],
      grouping: {
        field: 'tipo_evento',
        label: 'Tipo de Evento',
        sortOrder: 'desc',
        showSubtotals: true,
        showGrandTotal: true
      }
    };

    // Agrupar eventos por tipo
    const groupedEvents = this.groupEventsByType(events);
    const reportData = Object.entries(groupedEvents).map(([tipo, eventList]) => ({
      tipo_evento: tipo,
      count: eventList.length,
      percentage: eventList.length / events.length,
      accepted: eventList.filter(e => e.status === 'accepted').length,
      rejected: eventList.filter(e => e.status === 'rejected').length,
      error: eventList.filter(e => e.status === 'error').length
    }));

    return await this.generateReport(reportData as any, config);
  }

  async generateProcessingTimeReport(events: ESocialEvent[]): Promise<ReportData> {
    const config: ReportConfig = {
      title: 'Relatório de Tempo de Processamento',
      description: 'Análise do tempo de processamento dos eventos',
      format: 'pdf',
      filters: {},
      columns: [
        { key: 'tipo_evento', label: 'Tipo de Evento', type: 'string', visible: true },
        { key: 'processing_time', label: 'Tempo (min)', type: 'number', format: '0.00', visible: true },
        { key: 'status', label: 'Status', type: 'string', visible: true },
        { key: 'created_at', label: 'Criado em', type: 'date', visible: true },
        { key: 'data_envio', label: 'Enviado em', type: 'date', visible: true }
      ],
      sorting: {
        field: 'processing_time',
        order: 'desc'
      }
    };

    // Calcular tempo de processamento
    const eventsWithProcessingTime = events
      .filter(e => e.created_at && e.data_envio)
      .map(event => ({
        ...event,
        processing_time: this.calculateProcessingTime(event.created_at!, event.data_envio!)
      }));

    return await this.generateReport(eventsWithProcessingTime, config);
  }

  async generateErrorReport(events: ESocialEvent[]): Promise<ReportData> {
    const config: ReportConfig = {
      title: 'Relatório de Erros eSocial',
      description: 'Eventos com erro ou rejeitados',
      format: 'excel',
      filters: {
        status: ['error', 'rejected']
      },
      columns: [
        { key: 'tipo_evento', label: 'Tipo de Evento', type: 'string', visible: true },
        { key: 'codigo_evento', label: 'Código', type: 'string', visible: true },
        { key: 'status', label: 'Status', type: 'string', visible: true },
        { key: 'error_message', label: 'Mensagem de Erro', type: 'string', visible: true },
        { key: 'created_at', label: 'Data Criação', type: 'date', visible: true },
        { key: 'data_envio', label: 'Data Envio', type: 'date', visible: true }
      ],
      sorting: {
        field: 'created_at',
        order: 'desc'
      }
    };

    return await this.generateReport(events, config);
  }

  // =====================================================
  // DASHBOARD E GRÁFICOS
  // =====================================================

  async generateDashboardData(events: ESocialEvent[]): Promise<DashboardData> {
    const summary = this.calculateEventSummary(events);
    const charts = await this.generateCharts(events);
    const tables = await this.generateDashboardTables(events);
    const trends = await this.generateTrends(events);

    return {
      summary,
      charts,
      tables,
      trends
    };
  }

  private async generateCharts(events: ESocialEvent[]): Promise<ChartData[]> {
    const charts: ChartData[] = [];

    // Gráfico de status
    const statusData = this.groupEventsByStatus(events);
    charts.push({
      type: 'pie',
      title: 'Distribuição por Status',
      data: {
        labels: Object.keys(statusData),
        datasets: [{
          label: 'Eventos',
          data: Object.values(statusData),
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#FF9F40'
          ]
        }]
      }
    });

    // Gráfico de tipos de evento
    const typeData = this.groupEventsByType(events);
    charts.push({
      type: 'bar',
      title: 'Eventos por Tipo',
      data: {
        labels: Object.keys(typeData),
        datasets: [{
          label: 'Quantidade',
          data: Object.values(typeData).map(events => events.length),
          backgroundColor: '#36A2EB'
        }]
      }
    });

    // Gráfico de tendência temporal
    const trendData = this.generateTemporalTrend(events);
    charts.push({
      type: 'line',
      title: 'Tendência Temporal',
      data: {
        labels: trendData.map(d => d.period),
        datasets: [{
          label: 'Eventos',
          data: trendData.map(d => d.value),
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54, 162, 235, 0.1)'
        }]
      }
    });

    return charts;
  }

  private async generateDashboardTables(events: ESocialEvent[]): Promise<ReportData[]> {
    const tables: ReportData[] = [];

    // Tabela de eventos recentes
    const recentEventsConfig: ReportConfig = {
      title: 'Eventos Recentes',
      description: 'Últimos eventos processados',
      format: 'json',
      filters: {},
      columns: [
        { key: 'tipo_evento', label: 'Tipo', type: 'string', visible: true },
        { key: 'status', label: 'Status', type: 'string', visible: true },
        { key: 'created_at', label: 'Criado', type: 'date', visible: true }
      ],
      sorting: { field: 'created_at', order: 'desc' },
      pagination: { page: 1, pageSize: 10, totalItems: events.length }
    };

    tables.push(await this.generateReport(events, recentEventsConfig));

    return tables;
  }

  private async generateTrends(events: ESocialEvent[]): Promise<TrendData[]> {
    const trendData = this.generateTemporalTrend(events);
    
    return trendData.map((data, index) => ({
      period: data.period,
      value: data.value,
      change: index > 0 ? data.value - trendData[index - 1].value : 0,
      changePercent: index > 0 
        ? ((data.value - trendData[index - 1].value) / trendData[index - 1].value) * 100 
        : 0
    }));
  }

  // =====================================================
  // MÉTODOS AUXILIARES
  // =====================================================

  private filterEvents(events: ESocialEvent[], filters: ReportFilters): ESocialEvent[] {
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

  private groupData(events: ESocialEvent[], grouping: ReportGrouping): { data: ESocialEvent[], groups: Record<string, any> } {
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

  private sortData(events: ESocialEvent[], sorting: ReportSorting): ESocialEvent[] {
    return [...events].sort((a, b) => {
      const aValue = (a as any)[sorting.field];
      const bValue = (b as any)[sorting.field];
      
      if (aValue < bValue) return sorting.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return sorting.order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private paginateData(events: ESocialEvent[], pagination: ReportPagination): ESocialEvent[] {
    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return events.slice(start, end);
  }

  private formatCellValue(event: any, column: ReportColumn): any {
    const value = event[column.key];
    
    if (value === null || value === undefined) {
      return '';
    }

    switch (column.type) {
      case 'date':
        return new Date(value).toLocaleDateString('pt-BR');
      case 'number':
        return column.format ? 
          new Intl.NumberFormat('pt-BR', { 
            style: 'decimal',
            minimumFractionDigits: 2 
          }).format(value) : value;
      case 'currency':
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value);
      case 'boolean':
        return value ? 'Sim' : 'Não';
      default:
        return String(value);
    }
  }

  private calculateSummary(
    events: ESocialEvent[], 
    pagination?: ReportPagination,
    groups?: Record<string, any>
  ): ReportSummary {
    const totalRecords = events.length;
    const totalPages = pagination ? Math.ceil(totalRecords / pagination.pageSize) : 1;
    const currentPage = pagination?.page || 1;

    return {
      totalRecords,
      totalPages,
      currentPage,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      subtotals: groups,
      grandTotal: totalRecords
    };
  }

  private calculateEventSummary(events: ESocialEvent[]) {
    const totalEvents = events.length;
    const pendingEvents = events.filter(e => e.status === 'pending').length;
    const sentEvents = events.filter(e => e.status === 'sent').length;
    const acceptedEvents = events.filter(e => e.status === 'accepted').length;
    const rejectedEvents = events.filter(e => e.status === 'rejected').length;
    const errorEvents = events.filter(e => e.status === 'error').length;
    const successRate = totalEvents > 0 ? (acceptedEvents / totalEvents) * 100 : 0;

    // Calcular tempo médio de processamento
    const processedEvents = events.filter(e => e.created_at && e.data_envio);
    const totalProcessingTime = processedEvents.reduce((sum, event) => {
      const created = new Date(event.created_at!);
      const sent = new Date(event.data_envio!);
      return sum + (sent.getTime() - created.getTime());
    }, 0);
    const averageProcessingTime = processedEvents.length > 0 
      ? totalProcessingTime / processedEvents.length 
      : 0;

    return {
      totalEvents,
      pendingEvents,
      sentEvents,
      acceptedEvents,
      rejectedEvents,
      errorEvents,
      successRate,
      averageProcessingTime
    };
  }

  private groupEventsByStatus(events: ESocialEvent[]): Record<string, number> {
    const groups: Record<string, number> = {};
    events.forEach(event => {
      groups[event.status] = (groups[event.status] || 0) + 1;
    });
    return groups;
  }

  private groupEventsByType(events: ESocialEvent[]): Record<string, ESocialEvent[]> {
    const groups: Record<string, ESocialEvent[]> = {};
    events.forEach(event => {
      if (!groups[event.tipo_evento]) {
        groups[event.tipo_evento] = [];
      }
      groups[event.tipo_evento].push(event);
    });
    return groups;
  }

  private generateTemporalTrend(events: ESocialEvent[]): { period: string, value: number }[] {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last30Days.map(period => ({
      period,
      value: events.filter(event => 
        event.created_at && event.created_at.startsWith(period)
      ).length
    }));
  }

  private calculateProcessingTime(createdAt: string, sentAt: string): number {
    const created = new Date(createdAt);
    const sent = new Date(sentAt);
    return (sent.getTime() - created.getTime()) / (1000 * 60); // em minutos
  }
}

// =====================================================
// INSTÂNCIA SINGLETON DO SERVIÇO
// =====================================================

let reportServiceInstance: ESocialReportService | null = null;

export function getESocialReportService(): ESocialReportService {
  if (!reportServiceInstance) {
    reportServiceInstance = new ESocialReportService();
  }
  return reportServiceInstance;
}
