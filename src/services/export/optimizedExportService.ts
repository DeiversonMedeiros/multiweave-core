// =====================================================
// SERVIÇO DE EXPORTAÇÃO OTIMIZADO
// Sistema ERP MultiWeave Core
// =====================================================

import { supabase } from '@/integrations/supabase/client';

export interface ExportProgress {
  total: number;
  loaded: number;
  percentage: number;
  currentBatch: number;
}

export interface ExportOptions {
  batchSize?: number;
  onProgress?: (progress: ExportProgress) => void;
  delayBetweenBatches?: number;
  format?: 'csv' | 'json';
}

export interface ExportResult {
  success: boolean;
  filename: string;
  fileSize: number;
  mimeType: string;
  message: string;
  error?: string;
}

/**
 * Exporta funcionários usando função RPC otimizada
 */
export async function exportEmployeesOptimized(
  companyId: string,
  options: ExportOptions = {}
): Promise<ExportResult> {
  const {
    batchSize = 500,
    onProgress,
    delayBetweenBatches = 100,
    format = 'csv'
  } = options;

  try {
    let lastId: string | null = null;
    const allData: any[] = [];
    let totalLoaded = 0;
    let batchNumber = 0;

    // Buscar dados em lotes usando cursor-based pagination
    while (true) {
      batchNumber++;
      
      const { data, error } = await (supabase as any).rpc('get_employees_for_export', {
        p_company_id: companyId,
        p_status: null,
        p_department_id: null,
        p_last_id: lastId,
        p_limit: batchSize
      });

      if (error) {
        throw new Error(`Erro ao buscar dados: ${error.message}`);
      }

      if (!data || data.length === 0) {
        break;
      }

      allData.push(...data);
      totalLoaded += data.length;
      lastId = data[data.length - 1]?.id || null;

      // Notificar progresso
      if (onProgress) {
        onProgress({
          total: totalLoaded, // Estimativa
          loaded: totalLoaded,
          percentage: Math.min(100, (totalLoaded / (totalLoaded + batchSize)) * 100),
          currentBatch: batchNumber
        });
      }

      // Se retornou menos que o batch size, chegou ao fim
      if (data.length < batchSize) {
        break;
      }

      // Pequeno delay para não sobrecarregar
      if (delayBetweenBatches > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    // Gerar arquivo
    const filename = `funcionarios_${new Date().toISOString().split('T')[0]}.${format}`;
    let content: string;
    let mimeType: string;

    if (format === 'csv') {
      content = generateCSV(allData);
      mimeType = 'text/csv;charset=utf-8;';
    } else {
      content = JSON.stringify(allData, null, 2);
      mimeType = 'application/json';
    }

    const fileSize = new Blob([content]).size;

    // Download
    downloadFile(content, filename, mimeType);

    return {
      success: true,
      filename,
      fileSize,
      mimeType,
      message: `Exportação concluída: ${totalLoaded} registros exportados`
    };
  } catch (error) {
    return {
      success: false,
      filename: '',
      fileSize: 0,
      mimeType: '',
      message: 'Erro na exportação',
      error: (error as Error).message
    };
  }
}

/**
 * Exporta registros de ponto usando função RPC otimizada
 */
export async function exportTimeRecordsOptimized(
  companyId: string,
  startDate?: string,
  endDate?: string,
  employeeId?: string,
  options: ExportOptions = {}
): Promise<ExportResult> {
  const {
    batchSize = 500,
    onProgress,
    delayBetweenBatches = 100,
    format = 'csv'
  } = options;

  try {
    let lastId: string | null = null;
    const allData: any[] = [];
    let totalLoaded = 0;
    let batchNumber = 0;

    // Buscar dados em lotes usando cursor-based pagination
    while (true) {
      batchNumber++;
      
      const { data, error } = await (supabase as any).rpc('get_time_records_for_export', {
        p_company_id: companyId,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
        p_employee_id: employeeId || null,
        p_last_id: lastId,
        p_limit: batchSize
      });

      if (error) {
        throw new Error(`Erro ao buscar dados: ${error.message}`);
      }

      if (!data || data.length === 0) {
        break;
      }

      allData.push(...data);
      totalLoaded += data.length;
      lastId = data[data.length - 1]?.id || null;

      // Notificar progresso
      if (onProgress) {
        onProgress({
          total: totalLoaded,
          loaded: totalLoaded,
          percentage: Math.min(100, (totalLoaded / (totalLoaded + batchSize)) * 100),
          currentBatch: batchNumber
        });
      }

      // Se retornou menos que o batch size, chegou ao fim
      if (data.length < batchSize) {
        break;
      }

      // Pequeno delay para não sobrecarregar
      if (delayBetweenBatches > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    // Gerar arquivo
    const dateRange = startDate && endDate 
      ? `${startDate}_${endDate}` 
      : new Date().toISOString().split('T')[0];
    const filename = `registros_ponto_${dateRange}.${format}`;
    let content: string;
    let mimeType: string;

    if (format === 'csv') {
      content = generateTimeRecordsCSV(allData);
      mimeType = 'text/csv;charset=utf-8;';
    } else {
      content = JSON.stringify(allData, null, 2);
      mimeType = 'application/json';
    }

    const fileSize = new Blob([content]).size;

    // Download
    downloadFile(content, filename, mimeType);

    return {
      success: true,
      filename,
      fileSize,
      mimeType,
      message: `Exportação concluída: ${totalLoaded} registros exportados`
    };
  } catch (error) {
    return {
      success: false,
      filename: '',
      fileSize: 0,
      mimeType: '',
      message: 'Erro na exportação',
      error: (error as Error).message
    };
  }
}

/**
 * Gera CSV a partir de dados
 */
function generateCSV(data: any[]): string {
  if (data.length === 0) return '';

  // Obter cabeçalhos
  const headers = Object.keys(data[0]);
  const headerRow = headers.map(h => escapeCSVValue(h)).join(',');

  // Gerar linhas
  const rows = data.map(item => {
    return headers.map(header => {
      const value = item[header];
      return escapeCSVValue(value);
    }).join(',');
  });

  return [headerRow, ...rows].join('\n');
}

/**
 * Gera CSV específico para registros de ponto
 */
function generateTimeRecordsCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = [
    'ID',
    'Funcionário',
    'Data',
    'Entrada',
    'Saída',
    'Horas Trabalhadas',
    'Status',
    'Empresa'
  ];

  const headerRow = headers.join(',');

  const rows = data.map(item => {
    return [
      escapeCSVValue(item.id || ''),
      escapeCSVValue(item.employee_name || ''),
      escapeCSVValue(item.data_registro || ''),
      escapeCSVValue(item.entrada || ''),
      escapeCSVValue(item.saida || ''),
      escapeCSVValue(item.horas_trabalhadas || ''),
      escapeCSVValue(item.status || ''),
      escapeCSVValue(item.company_name || '')
    ].join(',');
  });

  return [headerRow, ...rows].join('\n');
}

/**
 * Escapa valores para CSV
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);
  
  // Se contém vírgula, aspas ou quebra de linha, precisa ser envolvido em aspas
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Faz download do arquivo
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporta dados genéricos usando cursor-based pagination
 */
export async function exportGenericDataOptimized(
  schema: string,
  table: string,
  companyId: string,
  options: ExportOptions & {
    filters?: Record<string, any>;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
  } = {}
): Promise<ExportResult> {
  const {
    batchSize = 500,
    onProgress,
    delayBetweenBatches = 100,
    format = 'csv',
    filters = {},
    orderBy = 'id',
    orderDirection = 'DESC'
  } = options;

  try {
    let lastId: string | null = null;
    const allData: any[] = [];
    let totalLoaded = 0;
    let batchNumber = 0;

    // Buscar dados em lotes usando cursor-based pagination
    while (true) {
      batchNumber++;
      
      const { data, error } = await (supabase as any).rpc('get_entity_data_cursor', {
        schema_name: schema,
        table_name: table,
        company_id_param: companyId,
        last_id: lastId,
        limit_param: batchSize,
        order_by: orderBy,
        order_direction: orderDirection,
        filters: filters
      });

      if (error) {
        throw new Error(`Erro ao buscar dados: ${error.message}`);
      }

      if (!data || data.length === 0) {
        break;
      }

      // Extrair dados do JSONB
      const items = data.map((row: any) => row.data);
      allData.push(...items);
      totalLoaded += items.length;
      
      const lastRow = data[data.length - 1];
      lastId = lastRow?.next_cursor || null;

      // Notificar progresso
      if (onProgress) {
        onProgress({
          total: totalLoaded,
          loaded: totalLoaded,
          percentage: lastRow?.has_more ? Math.min(100, (totalLoaded / (totalLoaded + batchSize)) * 100) : 100,
          currentBatch: batchNumber
        });
      }

      // Se não há mais dados, parar
      if (!lastRow?.has_more || items.length < batchSize) {
        break;
      }

      // Pequeno delay para não sobrecarregar
      if (delayBetweenBatches > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    // Gerar arquivo
    const filename = `${table}_${new Date().toISOString().split('T')[0]}.${format}`;
    let content: string;
    let mimeType: string;

    if (format === 'csv') {
      content = generateCSV(allData);
      mimeType = 'text/csv;charset=utf-8;';
    } else {
      content = JSON.stringify(allData, null, 2);
      mimeType = 'application/json';
    }

    const fileSize = new Blob([content]).size;

    // Download
    downloadFile(content, filename, mimeType);

    return {
      success: true,
      filename,
      fileSize,
      mimeType,
      message: `Exportação concluída: ${totalLoaded} registros exportados`
    };
  } catch (error) {
    return {
      success: false,
      filename: '',
      fileSize: 0,
      mimeType: '',
      message: 'Erro na exportação',
      error: (error as Error).message
    };
  }
}

