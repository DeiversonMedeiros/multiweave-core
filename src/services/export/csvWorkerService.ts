// =====================================================
// SERVIÇO PARA USAR WEB WORKER NO PROCESSAMENTO DE CSV
// Sistema ERP MultiWeave Core
// =====================================================

import { WorkerMessage } from '@/workers/csvExport.worker';

export interface WorkerExportOptions {
  filename?: string;
  format?: 'csv' | 'json';
  onProgress?: (progress: number) => void;
}

/**
 * Exporta dados usando Web Worker (processamento em background)
 */
export function exportWithWorker(
  data: any[],
  options: WorkerExportOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const {
      filename = `export_${new Date().toISOString().split('T')[0]}.csv`,
      format = 'csv',
      onProgress
    } = options;

    // Verificar suporte a Web Workers
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers não suportados, usando processamento síncrono');
      return exportWithoutWorker(data, filename, format)
        .then(resolve)
        .catch(reject);
    }

    try {
      // Criar worker
      const worker = new Worker(
        new URL('@/workers/csvExport.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Notificar progresso inicial
      onProgress?.(0);

      // Enviar dados para processamento
      const messageType = format === 'csv' ? 'PROCESS_CSV' : 'PROCESS_JSON';
      worker.postMessage({
        type: messageType,
        data,
        filename
      } as WorkerMessage);

      // Processar resposta
      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, csv, error } = event.data;

        if (type === 'CSV_READY' && csv) {
          onProgress?.(100);
          
          // Fazer download
          downloadFile(csv, filename, format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json');
          
          worker.terminate();
          resolve();
        } else if (type === 'ERROR' || error) {
          worker.terminate();
          reject(new Error(error || 'Erro desconhecido no worker'));
        }
      };

      // Tratar erros do worker
      worker.onerror = (error) => {
        worker.terminate();
        reject(new Error(`Erro no worker: ${error.message}`));
      };
    } catch (error) {
      // Fallback para processamento síncrono se worker falhar
      console.warn('Erro ao criar worker, usando processamento síncrono:', error);
      return exportWithoutWorker(data, filename, format)
        .then(resolve)
        .catch(reject);
    }
  });
}

/**
 * Exporta dados sem Web Worker (fallback)
 */
function exportWithoutWorker(
  data: any[],
  filename: string,
  format: 'csv' | 'json'
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      let content: string;
      let mimeType: string;

      if (format === 'csv') {
        content = generateCSV(data);
        mimeType = 'text/csv;charset=utf-8;';
      } else {
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
      }

      downloadFile(content, filename, mimeType);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
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

