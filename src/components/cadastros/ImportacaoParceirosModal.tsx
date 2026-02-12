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
  FileSpreadsheet,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  parseParceirosExcel,
  parseParceirosCSV,
  importParceiros,
  generateParceirosExcelTemplate,
  generateParceirosCSVTemplate,
  ParceiroImportRow,
  ParceirosImportResult,
} from '@/services/cadastros/parceirosImportService';
import { toast } from 'sonner';

interface ImportacaoParceirosModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onSuccess?: () => void;
}

export function ImportacaoParceirosModal({
  isOpen,
  onClose,
  companyId,
  onSuccess,
}: ImportacaoParceirosModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<ParceirosImportResult | null>(null);
  const [fileType, setFileType] = useState<'excel' | 'csv' | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileName = selectedFile.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCSV = fileName.endsWith('.csv');

    if (!isExcel && !isCSV) {
      toast.error('Formato não suportado. Use Excel (.xlsx, .xls) ou CSV (.csv)');
      return;
    }

    setFile(selectedFile);
    setFileType(isExcel ? 'excel' : 'csv');
    setImportResult(null);
  };

  const handleDownloadTemplate = (type: 'excel' | 'csv') => {
    try {
      if (type === 'excel') {
        generateParceirosExcelTemplate();
        toast.success('Template Excel baixado com sucesso!');
      } else {
        generateParceirosCSVTemplate();
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
      let rows: ParceiroImportRow[];
      if (fileType === 'excel') {
        rows = await parseParceirosExcel(file);
      } else {
        rows = await parseParceirosCSV(file);
      }

      if (rows.length === 0) {
        toast.error(
          'Nenhum parceiro válido encontrado. Verifique razão social, CNPJ (14 dígitos) e o formato do arquivo.'
        );
        setIsProcessing(false);
        return;
      }

      const result = await importParceiros(companyId, rows);
      setImportResult(result);

      if (result.errors.length === 0) {
        toast.success(`Importação concluída! ${result.created} parceiro(s) criado(s).`);
        onSuccess?.();
        setTimeout(() => handleClose(), 2000);
      } else if (result.created > 0) {
        toast.warning(
          `Importação parcial: ${result.created} criado(s), ${result.errors.length} erro(s). Verifique os detalhes.`
        );
      } else {
        toast.error(`Importação falhou. ${result.errors.length} erro(s). Verifique o arquivo e o template.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao importar arquivo');
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
          <DialogTitle>Importação em massa de parceiros</DialogTitle>
          <DialogDescription>
            Importe vários parceiros (clientes, fornecedores, transportadores) a partir de um arquivo Excel ou CSV.
            Baixe o template para ver o formato esperado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Baixar template</Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => handleDownloadTemplate('excel')} className="flex-1">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Template Excel
              </Button>
              <Button type="button" variant="outline" onClick={() => handleDownloadTemplate('csv')} className="flex-1">
                <FileText className="h-4 w-4 mr-2" />
                Template CSV
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Obrigatórios: razão social, CNPJ (14 dígitos). Tipo: cliente, fornecedor e/ou transportador.
              Dados bancários (opcional): banco_codigo, banco_nome, agencia, conta, tipo_conta (corrente ou poupanca), pix_tipo (cpf_cnpj, email, telefone, chave_aleatoria), pix_valor.
            </p>
          </div>

          <div className="space-y-3">
            <Label htmlFor="file-upload-parceiros">Selecionar arquivo</Label>
            <Input
              id="file-upload-parceiros"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              disabled={isProcessing}
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {fileType === 'excel' ? <FileSpreadsheet className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                <span>{file.name}</span>
                <span className="text-xs">({(file.size / 1024).toFixed(2)} KB)</span>
              </div>
            )}
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1 text-sm">
                <p>
                  <strong>CNPJ:</strong> apenas números, 14 dígitos (o sistema remove pontuação automaticamente).
                </p>
                <p>
                  <strong>tipo:</strong> um ou mais: cliente, fornecedor, transportador (ex: cliente,fornecedor).
                </p>
                <p>
                  <strong>Dados bancários (opcional):</strong> banco_codigo (ex: 341), agencia, conta, tipo_conta (corrente ou poupanca). <strong>PIX:</strong> pix_tipo (cpf_cnpj, email, telefone, chave_aleatoria) e pix_valor.
                </p>
                <p>
                  <strong>ativo:</strong> Sim ou Não (padrão: Sim).
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {importResult && (
            <div className="space-y-2">
              <Label>Resultado da importação</Label>
              <div className="flex items-center gap-2 text-sm">
                {importResult.errors.length === 0 ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-amber-600" />
                )}
                <span>
                  {importResult.created} criado(s) · {importResult.processed} processado(s)
                  {importResult.errors.length > 0 && ` · ${importResult.errors.length} erro(s)`}
                </span>
              </div>
              {importResult.errors.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded border bg-muted/50 p-2 text-xs">
                  {importResult.errors.map((err, idx) => (
                    <div key={idx} className="text-destructive">
                      Linha {err.row}: {err.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Fechar
          </Button>
          <Button type="button" onClick={handleImport} disabled={!file || isProcessing || !companyId}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
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
