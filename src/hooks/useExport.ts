// =====================================================
// HOOK PARA EXPORTAÇÃO COM PROGRESSO
// Sistema ERP MultiWeave Core
// =====================================================

import { useState, useCallback } from 'react';
import { 
  exportEmployeesOptimized, 
  exportTimeRecordsOptimized,
  exportGenericDataOptimized,
  ExportProgress,
  ExportResult
} from '@/services/export/optimizedExportService';
import { exportWithWorker } from '@/services/export/csvWorkerService';
import { toast } from 'sonner';

export interface UseExportOptions {
  useWorker?: boolean;
  batchSize?: number;
  delayBetweenBatches?: number;
  format?: 'csv' | 'json';
}

export interface UseExportReturn {
  isExporting: boolean;
  progress: ExportProgress | null;
  exportEmployees: (companyId: string, options?: UseExportOptions) => Promise<ExportResult>;
  exportTimeRecords: (
    companyId: string,
    startDate?: string,
    endDate?: string,
    employeeId?: string,
    options?: UseExportOptions
  ) => Promise<ExportResult>;
  exportGenericData: (
    schema: string,
    table: string,
    companyId: string,
    filters?: Record<string, any>,
    options?: UseExportOptions
  ) => Promise<ExportResult>;
  cancel: () => void;
}

/**
 * Hook para exportação com feedback de progresso
 * 
 * @example
 * const { exportEmployees, isExporting, progress } = useExport();
 * 
 * const handleExport = async () => {
 *   const result = await exportEmployees(companyId);
 *   if (result.success) {
 *     toast.success(result.message);
 *   }
 * };
 */
export function useExport(): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [cancelToken, setCancelToken] = useState<AbortController | null>(null);

  const exportEmployees = useCallback(async (
    companyId: string,
    options: UseExportOptions = {}
  ): Promise<ExportResult> => {
    setIsExporting(true);
    setProgress({ total: 0, loaded: 0, percentage: 0, currentBatch: 0 });
    
    const controller = new AbortController();
    setCancelToken(controller);

    try {
      const result = await exportEmployeesOptimized(companyId, {
        batchSize: options.batchSize || 500,
        onProgress: (prog) => {
          if (!controller.signal.aborted) {
            setProgress(prog);
          }
        },
        delayBetweenBatches: options.delayBetweenBatches || 100,
        format: options.format || 'csv'
      });

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error || 'Erro na exportação');
      }

      return result;
    } catch (error) {
      const errorMessage = (error as Error).message;
      toast.error(`Erro na exportação: ${errorMessage}`);
      return {
        success: false,
        filename: '',
        fileSize: 0,
        mimeType: '',
        message: 'Erro na exportação',
        error: errorMessage
      };
    } finally {
      setIsExporting(false);
      setProgress(null);
      setCancelToken(null);
    }
  }, []);

  const exportTimeRecords = useCallback(async (
    companyId: string,
    startDate?: string,
    endDate?: string,
    employeeId?: string,
    options: UseExportOptions = {}
  ): Promise<ExportResult> => {
    setIsExporting(true);
    setProgress({ total: 0, loaded: 0, percentage: 0, currentBatch: 0 });
    
    const controller = new AbortController();
    setCancelToken(controller);

    try {
      const result = await exportTimeRecordsOptimized(
        companyId,
        startDate,
        endDate,
        employeeId,
        {
          batchSize: options.batchSize || 500,
          onProgress: (prog) => {
            if (!controller.signal.aborted) {
              setProgress(prog);
            }
          },
          delayBetweenBatches: options.delayBetweenBatches || 100,
          format: options.format || 'csv'
        }
      );

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error || 'Erro na exportação');
      }

      return result;
    } catch (error) {
      const errorMessage = (error as Error).message;
      toast.error(`Erro na exportação: ${errorMessage}`);
      return {
        success: false,
        filename: '',
        fileSize: 0,
        mimeType: '',
        message: 'Erro na exportação',
        error: errorMessage
      };
    } finally {
      setIsExporting(false);
      setProgress(null);
      setCancelToken(null);
    }
  }, []);

  const exportGenericData = useCallback(async (
    schema: string,
    table: string,
    companyId: string,
    filters?: Record<string, any>,
    options: UseExportOptions = {}
  ): Promise<ExportResult> => {
    setIsExporting(true);
    setProgress({ total: 0, loaded: 0, percentage: 0, currentBatch: 0 });
    
    const controller = new AbortController();
    setCancelToken(controller);

    try {
      const result = await exportGenericDataOptimized(
        schema,
        table,
        companyId,
        {
          batchSize: options.batchSize || 500,
          onProgress: (prog) => {
            if (!controller.signal.aborted) {
              setProgress(prog);
            }
          },
          delayBetweenBatches: options.delayBetweenBatches || 100,
          format: options.format || 'csv',
          filters: filters || {}
        }
      );

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error || 'Erro na exportação');
      }

      return result;
    } catch (error) {
      const errorMessage = (error as Error).message;
      toast.error(`Erro na exportação: ${errorMessage}`);
      return {
        success: false,
        filename: '',
        fileSize: 0,
        mimeType: '',
        message: 'Erro na exportação',
        error: errorMessage
      };
    } finally {
      setIsExporting(false);
      setProgress(null);
      setCancelToken(null);
    }
  }, []);

  const cancel = useCallback(() => {
    if (cancelToken) {
      cancelToken.abort();
      setIsExporting(false);
      setProgress(null);
      setCancelToken(null);
      toast.info('Exportação cancelada');
    }
  }, [cancelToken]);

  return {
    isExporting,
    progress,
    exportEmployees,
    exportTimeRecords,
    exportGenericData,
    cancel
  };
}

