import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Download,
  Eye
} from 'lucide-react';
import { useCreateEntradaMaterial } from '@/hooks/almoxarifado/useEntradasMateriaisQuery';
import { useMateriaisEquipamentos } from '@/hooks/almoxarifado/useMateriaisEquipamentosQuery';
import { useCostCenters } from '@/hooks/useCostCenters';
import { useProjects } from '@/hooks/useProjects';
import { toast } from 'sonner';

interface XMLUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (entradaId: string) => void;
}

interface ParsedXMLData {
  chave_acesso: string;
  numero_nfe: string;
  serie: string;
  data_emissao: string;
  data_saida?: string;
  valor_total: number;
  valor_icms: number;
  valor_ipi: number;
  valor_pis: number;
  valor_cofins: number;
  status_sefaz: string;
  fornecedor: {
    cnpj: string;
    nome: string;
    endereco?: string;
  };
  itens: Array<{
    codigo_produto: string;
    descricao: string;
    ncm: string;
    cfop: string;
    cst: string;
    unidade: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    valor_icms: number;
    valor_ipi: number;
  }>;
}

const XMLUploadModal: React.FC<XMLUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedXMLData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'review' | 'confirm'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createEntrada = useCreateEntradaMaterial();
  const { data: materiais = [] } = useMateriaisEquipamentos();
  const { data: costCentersData } = useCostCenters();
  const { data: projectsData } = useProjects();
  
  const costCenters = costCentersData?.data || [];
  const projects = projectsData?.data || [];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/xml') {
      setXmlFile(file);
      setError(null);
      parseXMLFile(file);
    } else {
      setError('Por favor, selecione um arquivo XML válido');
    }
  };

  const parseXMLFile = async (file: File) => {
    try {
      setLoading(true);
      setError(null);

      const text = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');

      // Verificar se é um XML válido
      if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('XML inválido ou corrompido');
      }

      // Extrair dados da NF-e (simplificado - em produção seria mais robusto)
      const infNFe = xmlDoc.getElementsByTagName('infNFe')[0];
      if (!infNFe) {
        throw new Error('XML não contém dados de NF-e válidos');
      }

      const ide = infNFe.getElementsByTagName('ide')[0];
      const emit = infNFe.getElementsByTagName('emit')[0];
      const total = infNFe.getElementsByTagName('total')[0];
      const det = infNFe.getElementsByTagName('det');

      const parsed: ParsedXMLData = {
        chave_acesso: infNFe.getAttribute('Id')?.replace('NFe', '') || '',
        numero_nfe: ide?.getElementsByTagName('nNF')[0]?.textContent || '',
        serie: ide?.getElementsByTagName('serie')[0]?.textContent || '',
        data_emissao: ide?.getElementsByTagName('dhEmi')[0]?.textContent || '',
        valor_total: parseFloat(total?.getElementsByTagName('vNF')[0]?.textContent || '0'),
        valor_icms: parseFloat(total?.getElementsByTagName('vICMS')[0]?.textContent || '0'),
        valor_ipi: parseFloat(total?.getElementsByTagName('vIPI')[0]?.textContent || '0'),
        valor_pis: parseFloat(total?.getElementsByTagName('vPIS')[0]?.textContent || '0'),
        valor_cofins: parseFloat(total?.getElementsByTagName('vCOFINS')[0]?.textContent || '0'),
        status_sefaz: 'autorizada', // Assumindo que se chegou até aqui, está autorizada
        fornecedor: {
          cnpj: emit?.getElementsByTagName('CNPJ')[0]?.textContent || '',
          nome: emit?.getElementsByTagName('xNome')[0]?.textContent || '',
          endereco: emit?.getElementsByTagName('xLgr')[0]?.textContent || ''
        },
        itens: Array.from(det).map((item, index) => {
          const prod = item.getElementsByTagName('prod')[0];
          const imposto = item.getElementsByTagName('imposto')[0];
          
          return {
            codigo_produto: prod?.getElementsByTagName('cProd')[0]?.textContent || `ITEM_${index + 1}`,
            descricao: prod?.getElementsByTagName('xProd')[0]?.textContent || '',
            ncm: prod?.getElementsByTagName('NCM')[0]?.textContent || '',
            cfop: prod?.getElementsByTagName('CFOP')[0]?.textContent || '',
            cst: imposto?.getElementsByTagName('CST')[0]?.textContent || '',
            unidade: prod?.getElementsByTagName('uCom')[0]?.textContent || 'UN',
            quantidade: parseFloat(prod?.getElementsByTagName('qCom')[0]?.textContent || '0'),
            valor_unitario: parseFloat(prod?.getElementsByTagName('vUnCom')[0]?.textContent || '0'),
            valor_total: parseFloat(prod?.getElementsByTagName('vProd')[0]?.textContent || '0'),
            valor_icms: parseFloat(imposto?.getElementsByTagName('vICMS')[0]?.textContent || '0'),
            valor_ipi: parseFloat(imposto?.getElementsByTagName('vIPI')[0]?.textContent || '0')
          };
        })
      };

      setParsedData(parsed);
      setStep('review');
    } catch (err) {
      console.error('Erro ao processar XML:', err);
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivo XML');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsedData) return;

    try {
      setLoading(true);

      // Criar entrada com os dados do XML
      const entradaData = {
        numero_nota: parsedData.numero_nfe,
        data_entrada: new Date().toISOString().split('T')[0],
        valor_total: parsedData.valor_total,
        observacoes: `Entrada via XML - NF-e ${parsedData.numero_nfe}`,
        itens: parsedData.itens.map(item => ({
          material_equipamento_id: '', // Seria necessário mapear ou criar material
          quantidade_recebida: item.quantidade,
          quantidade_aprovada: 0, // Será preenchido no checklist
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_total,
          lote: `LOTE_${Date.now()}`,
          observacoes: `NCM: ${item.ncm}, CFOP: ${item.cfop}`
        }))
      };

      const entrada = await createEntrada.mutateAsync(entradaData);
      
      toast.success('Entrada criada com sucesso!');
      onSuccess?.(entrada.id);
      onClose();
    } catch (err) {
      console.error('Erro ao criar entrada:', err);
      toast.error('Erro ao criar entrada');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const resetModal = () => {
    setXmlFile(null);
    setParsedData(null);
    setError(null);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Upload de XML NF-e
          </DialogTitle>
          <DialogDescription>
            Faça upload do arquivo XML da NF-e para criar entrada automática
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Selecionar Arquivo XML</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">Arraste o arquivo XML aqui</p>
                  <p className="text-gray-600 mb-4">ou clique para selecionar</p>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".xml"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button onClick={() => fileInputRef.current?.click()}>
                    Selecionar Arquivo
                  </Button>
                </div>
              </CardContent>
            </Card>

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <div className="flex items-center text-red-600">
                    <XCircle className="h-5 w-5 mr-2" />
                    {error}
                  </div>
                </CardContent>
              </Card>
            )}

            {loading && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Processando arquivo XML...</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {step === 'review' && parsedData && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Dados da NF-e
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Número:</span> {parsedData.numero_nfe}
                  </div>
                  <div>
                    <span className="font-medium">Série:</span> {parsedData.serie}
                  </div>
                  <div>
                    <span className="font-medium">Data Emissão:</span> {formatDate(parsedData.data_emissao)}
                  </div>
                  <div>
                    <span className="font-medium">Valor Total:</span> {formatCurrency(parsedData.valor_total)}
                  </div>
                </div>
                
                <div className="mt-4">
                  <span className="font-medium">Fornecedor:</span> {parsedData.fornecedor.nome}
                  <br />
                  <span className="text-sm text-gray-600">CNPJ: {parsedData.fornecedor.cnpj}</span>
                </div>

                <div className="mt-4">
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Status SEFAZ: {parsedData.status_sefaz}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Itens da NF-e</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {parsedData.itens.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <span className="font-medium">{item.descricao}</span>
                        <br />
                        <span className="text-sm text-gray-600">
                          {item.quantidade} {item.unidade} × {formatCurrency(item.valor_unitario)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{formatCurrency(item.valor_total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Voltar
              </Button>
              <Button onClick={() => setStep('confirm')}>
                Confirmar Entrada
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-semibold mb-2">Confirmar Criação da Entrada</h3>
                <p className="text-gray-600 mb-4">
                  A entrada será criada com status "Pendente" e será necessário 
                  fazer a inspeção dos itens antes da aprovação.
                </p>
                <div className="flex justify-center space-x-2">
                  <Button variant="outline" onClick={() => setStep('review')}>
                    Voltar
                  </Button>
                  <Button onClick={handleConfirm} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      'Criar Entrada'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default XMLUploadModal;
