// =====================================================
// WEB WORKER PARA PROCESSAMENTO DE CSV
// Sistema ERP MultiWeave Core
// =====================================================

export interface WorkerMessage {
  type: 'PROCESS_CSV' | 'PROCESS_JSON' | 'CSV_READY' | 'ERROR';
  data?: any[];
  csv?: string;
  filename?: string;
  error?: string;
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
 * Processa mensagens do worker
 */
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, data, filename } = event.data;

  try {
    if (type === 'PROCESS_CSV') {
      if (!data || data.length === 0) {
        self.postMessage({
          type: 'ERROR',
          error: 'Nenhum dado fornecido para processamento'
        } as WorkerMessage);
        return;
      }

      // Processar CSV em chunks para não bloquear
      const csv = generateCSV(data);

      self.postMessage({
        type: 'CSV_READY',
        csv,
        filename: filename || `export_${new Date().toISOString().split('T')[0]}.csv`
      } as WorkerMessage);
    } else if (type === 'PROCESS_JSON') {
      if (!data || data.length === 0) {
        self.postMessage({
          type: 'ERROR',
          error: 'Nenhum dado fornecido para processamento'
        } as WorkerMessage);
        return;
      }

      const json = JSON.stringify(data, null, 2);

      self.postMessage({
        type: 'CSV_READY', // Reutilizando tipo para simplicidade
        csv: json,
        filename: filename || `export_${new Date().toISOString().split('T')[0]}.json`
      } as WorkerMessage);
    } else {
      self.postMessage({
        type: 'ERROR',
        error: `Tipo de mensagem não suportado: ${type}`
      } as WorkerMessage);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: (error as Error).message
    } as WorkerMessage);
  }
};

