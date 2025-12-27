// =====================================================
// COMPONENTE DE DOCUMENTOS DE VEÍCULOS
// Sistema ERP MultiWeave Core
// =====================================================

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Download,
  Calendar,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/lib/company-context';
import { useVehicleDocuments, useCreateDocument, useDeleteDocument } from '@/hooks/frota/useFrotaData';
import { VehicleDocument, DocumentType, DocumentStatus } from '@/types/frota';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BUCKET_NAME = 'vehicle-documents';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

interface VehicleDocumentsTabProps {
  vehicleId: string;
  mode?: 'create' | 'edit' | 'view';
}

export function VehicleDocumentsTab({ 
  vehicleId, 
  mode = 'edit' 
}: VehicleDocumentsTabProps) {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    tipo: '' as DocumentType | '',
    numero_documento: '',
    vencimento: '',
    observacoes: '',
  });

  const { data: documents = [], isLoading, refetch } = useVehicleDocuments(vehicleId);
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();

  const isReadOnly = mode === 'view';

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamanho
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'Arquivo muito grande',
        description: `O arquivo deve ter no máximo ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        variant: 'destructive',
      });
      return;
    }

    // Validar tipo
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({
        title: 'Tipo de arquivo não permitido',
        description: 'Apenas PDF, imagens e documentos Word são permitidos',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.tipo) {
      toast({
        title: 'Selecione o tipo de documento',
        description: 'Por favor, selecione o tipo de documento antes de fazer upload',
        variant: 'destructive',
      });
      return;
    }

    await uploadFile(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File) => {
    if (!vehicleId || !selectedCompany?.id) return;

    setUploading(true);
    setProgress(0);

    try {
      // Sanitizar nome do arquivo
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const timestamp = Date.now();
      const fileName = `${timestamp}_${sanitizedName}`;
      const filePath = `${selectedCompany.id}/${vehicleId}/${fileName}`;

      // Upload do arquivo
      const { data, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL do arquivo
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, 3600 * 24 * 365); // URL válida por 1 ano
      
      let fileUrl = '';
      if (signedUrlError || !signedUrlData) {
        const { data: publicUrlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);
        fileUrl = publicUrlData.publicUrl;
      } else {
        fileUrl = signedUrlData.signedUrl;
      }

      // Criar registro do documento
      await createDocument.mutateAsync({
        vehicle_id: vehicleId,
        tipo: formData.tipo as DocumentType,
        numero_documento: formData.numero_documento || undefined,
        vencimento: formData.vencimento || undefined,
        arquivo_url: fileUrl,
        observacoes: formData.observacoes || undefined,
      });

      // Limpar formulário
      setFormData({
        tipo: '' as DocumentType | '',
        numero_documento: '',
        vencimento: '',
        observacoes: '',
      });

      toast({
        title: 'Documento enviado com sucesso',
        description: 'O documento foi anexado ao veículo.',
      });

    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: 'Erro ao enviar documento',
        description: error.message || 'Não foi possível enviar o documento. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este documento?')) {
      return;
    }

    setDeleting(documentId);
    try {
      await deleteDocument.mutateAsync(documentId);
      toast({
        title: 'Documento excluído',
        description: 'O documento foi removido com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir documento',
        description: error.message || 'Não foi possível excluir o documento.',
        variant: 'destructive'
      });
    } finally {
      setDeleting(null);
    }
  };

  const getDocumentTypeLabel = (tipo: DocumentType) => {
    const labels = {
      crlv: 'CRLV',
      ipva: 'IPVA',
      seguro: 'Seguro',
      licenca: 'Licença',
      vistoria: 'Vistoria',
    };
    return labels[tipo] || tipo;
  };

  const getStatusBadge = (status: DocumentStatus, vencimento?: string) => {
    if (!vencimento) {
      return <Badge variant="outline">Sem data</Badge>;
    }

    const hoje = new Date();
    const venc = new Date(vencimento);
    const diasParaVencimento = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    if (diasParaVencimento < 0) {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Vencido
        </Badge>
      );
    } else if (diasParaVencimento <= 30) {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Vence em {diasParaVencimento} dias
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Válido
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6">
      {!isReadOnly && (
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Documento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo">Tipo de Documento *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value as DocumentType }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="crlv">CRLV</SelectItem>
                      <SelectItem value="ipva">IPVA</SelectItem>
                      <SelectItem value="seguro">Seguro</SelectItem>
                      <SelectItem value="licenca">Licença</SelectItem>
                      <SelectItem value="vistoria">Vistoria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="numero_documento">Número do Documento</Label>
                  <Input
                    id="numero_documento"
                    value={formData.numero_documento}
                    onChange={(e) => setFormData(prev => ({ ...prev, numero_documento: e.target.value }))}
                    placeholder="Número do documento"
                  />
                </div>

                <div>
                  <Label htmlFor="vencimento">Data de Vencimento</Label>
                  <Input
                    id="vencimento"
                    type="date"
                    value={formData.vencimento}
                    onChange={(e) => setFormData(prev => ({ ...prev, vencimento: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="arquivo">Arquivo *</Label>
                  <Input
                    id="arquivo"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    disabled={uploading}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo {MAX_FILE_SIZE / 1024 / 1024}MB. Formatos: PDF, JPG, PNG, DOC, DOCX
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Input
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Observações sobre o documento"
                />
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Enviando arquivo...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#049940] h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Documentos do Veículo</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#049940]"></div>
            </div>
          ) : documents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(documents as VehicleDocument[]).map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">
                      {getDocumentTypeLabel(doc.tipo)}
                    </TableCell>
                    <TableCell>{doc.numero_documento || 'N/A'}</TableCell>
                    <TableCell>
                      {doc.vencimento 
                        ? format(new Date(doc.vencimento), 'dd/MM/yyyy', { locale: ptBR })
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(doc.status, doc.vencimento)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {doc.observacoes || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {doc.arquivo_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(doc.arquivo_url, '_blank')}
                            title="Baixar documento"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        {!isReadOnly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(doc.id)}
                            disabled={deleting === doc.id}
                            className="text-red-600 hover:text-red-700"
                            title="Excluir documento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum documento encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

