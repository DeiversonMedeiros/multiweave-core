import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import {
  parseExcelFile,
  parseCSVFile,
  importTimeRecords,
  generateExcelTemplate,
  generateCSVTemplate,
  ImportResult
} from '@/services/rh/timeRecordsImportService';
import { toast } from 'sonner';

interface TimeRecordsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onSuccess?: () => void;
}

export function TimeRecordsImportModal({
  isOpen,
  onClose,
  companyId,
  onSuccess
}: TimeRecordsImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [fileType, setFileType] = useState<'excel' | 'csv' | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileName = selectedFile.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCSV = fileName.endsWith('.csv');

    if (!isExcel && !isCSV) {
      toast.error('Formato de arquivo não suportado. Use Excel (.xlsx, .xls) ou CSV (.csv)');
      return;
    }

    setFile(selectedFile);
    setFileType(isExcel ? 'excel' : 'csv');
    setImportResult(null);
  };

  const handleDownloadTemplate = (type: 'excel' | 'csv') => {
    try {
      if (type === 'excel') {
        generateExcelTemplate();
        toast.success('Template Excel baixado com sucesso!');
      } else {
        generateCSVTemplate();
        toast.success('Template CSV baixado com sucesso!');
      }
    } catch (error) {
      toast.error('Erro ao gerar template');
      console.error(error);
    }
  };

  const handleImport = async () => {
    if (!file || !fileType) {
      toast.error('Selecione um arquivo para importar');
      return;
    }

    setIsProcessing(true);
    setImportResult(null);

    try {
      // Parsear arquivo
      let rows;
      if (fileType === 'excel') {
        rows = await parseExcelFile(file);
      } else {
        rows = await parseCSVFile(file);
      }

      if (rows.length === 0) {
        toast.error('Nenhum registro encontrado no arquivo');
        setIsProcessing(false);
        return;
      }

      // Importar registros
      const result = await importTimeRecords(companyId, rows);

      setImportResult(result);

      if (result.success) {
        toast.success(
          `Importação concluída! ${result.created} criados, ${result.updated} atualizados`
        );
        onSuccess?.();
        
        // Fechar modal após 2 segundos
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        toast.warning(
          `Importação concluída com erros. ${result.processed} processados, ${result.errors.length} erros`
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao importar arquivo'
      );
      console.error('Erro na importação:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setFileType(null);
    setImportResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Registros de Ponto em Massa</DialogTitle>
          <DialogDescription>
            Importe registros de ponto de um arquivo Excel ou CSV. 
            Baixe o template para ver o formato esperado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Seção de Download de Template */}
          <div className="space-y-3">
            <Label>Baixar Template</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDownloadTemplate('excel')}
                className="flex-1"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Template Excel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDownloadTemplate('csv')}
                className="flex-1"
              >
                <FileText className="h-4 w-4 mr-2" />
                Template CSV
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              O template contém exemplos de como preencher os dados. 
              Use Matrícula ou CPF para identificar o funcionário.
            </p>
          </div>

          {/* Seção de Upload */}
          <div className="space-y-3">
            <Label htmlFor="file-upload">Selecionar Arquivo</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={isProcessing}
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {fileType === 'excel' ? (
                  <FileSpreadsheet className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span>{file.name}</span>
                <span className="text-xs">
                  ({(file.size / 1024).toFixed(2)} KB)
                </span>
              </div>
            )}
          </div>

          {/* Instruções */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1 text-sm">
                <p><strong>Formato de Data:</strong> DD/MM/YYYY ou YYYY-MM-DD</p>
                <p><strong>Formato de Hora:</strong> HH:MM (ex: 08:00, 17:30)</p>
                <p><strong>Identificação:</strong> Use Matrícula ou CPF (sem pontuação)</p>
                <p><strong>Status:</strong> pendente, aprovado, rejeitado ou corrigido (opcional, padrão: pendente)</p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Resultado da Importação */}
          {importResult && (
            <div className="space-y-3">
              <Label>Resultado da Importação</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <span className="text-sm font-medium">Total de Linhas:</span>
                  <span className="text-sm font-bold">{importResult.totalRows}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <span className="text-sm font-medium">Processadas:</span>
                  <span className="text-sm font-bold text-blue-600">
                    {importResult.processed}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-md">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Criados:
                  </span>
                  <span className="text-sm font-bold text-green-600">
                    {importResult.created}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    Atualizados:
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {importResult.updated}
                  </span>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-md">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        Erros:
                      </span>
                      <span className="text-sm font-bold text-red-600">
                        {importResult.errors.length}
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {importResult.errors.map((error, index) => (
                        <Alert key={index} variant="destructive" className="py-2">
                          <AlertDescription className="text-xs">
                            <strong>Linha {error.row}:</strong> {error.message}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
          >
            {importResult ? 'Fechar' : 'Cancelar'}
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!file || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
