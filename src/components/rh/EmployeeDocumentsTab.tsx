import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  File, 
  X, 
  Download, 
  Trash2, 
  AlertCircle,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/lib/company-context';
import { Badge } from '@/components/ui/badge';

interface EmployeeDocument {
  id: string;
  name: string;
  path: string;
  size: number;
  mime_type: string;
  created_at: string;
  url?: string;
}

interface EmployeeDocumentsTabProps {
  employeeId?: string | null;
  mode?: 'create' | 'edit' | 'view';
}

const BUCKET_NAME = 'employee-documents';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export function EmployeeDocumentsTab({ 
  employeeId, 
  mode = 'edit' 
}: EmployeeDocumentsTabProps) {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isReadOnly = mode === 'view';

  // Carregar documentos do funcionário
  useEffect(() => {
    if (employeeId && selectedCompany?.id) {
      loadDocuments();
    } else {
      setDocuments([]);
    }
  }, [employeeId, selectedCompany?.id]);

  const loadDocuments = async () => {
    if (!employeeId || !selectedCompany?.id) return;

    setLoading(true);
    try {
      const folderPath = `${selectedCompany.id}/${employeeId}`;
      
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(folderPath, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        // Se a pasta não existir, não é um erro crítico
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          setDocuments([]);
          return;
        }
        throw error;
      }

      // Gerar signed URLs para cada arquivo (bucket privado)
      const documentsList: EmployeeDocument[] = await Promise.all(
        (data || []).map(async (file) => {
          const filePath = `${folderPath}/${file.name}`;
          
          // Para bucket privado, usar signed URL
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(filePath, 3600); // URL válida por 1 hora

          // Fallback para public URL se signed URL falhar
          let fileUrl = '';
          if (signedUrlError || !signedUrlData) {
            const { data: publicUrlData } = supabase.storage
              .from(BUCKET_NAME)
              .getPublicUrl(filePath);
            fileUrl = publicUrlData.publicUrl;
          } else {
            fileUrl = signedUrlData.signedUrl;
          }

          return {
            id: file.id || file.name,
            name: file.name,
            path: filePath,
            size: file.metadata?.size || 0,
            mime_type: file.metadata?.mimetype || '',
            created_at: file.created_at || new Date().toISOString(),
            url: fileUrl
          };
        })
      );

      setDocuments(documentsList);
    } catch (error: any) {
      console.error('Erro ao carregar documentos:', error);
      toast({
        title: 'Erro ao carregar documentos',
        description: error.message || 'Não foi possível carregar os documentos.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!employeeId || !selectedCompany?.id) {
      toast({
        title: 'Atenção',
        description: 'É necessário salvar o funcionário antes de adicionar documentos.',
        variant: 'destructive'
      });
      return;
    }

    // Validar tamanho
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'Arquivo muito grande',
        description: `O arquivo excede o limite de 10MB. Tamanho atual: ${formatFileSize(file.size)}`,
        variant: 'destructive'
      });
      return;
    }

    // Validar tipo
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({
        title: 'Tipo de arquivo não permitido',
        description: 'Apenas PDF, imagens (JPG, PNG) e documentos (DOC, DOCX, XLS, XLSX) são permitidos.',
        variant: 'destructive'
      });
      return;
    }

    await uploadFile(file);
    
    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File) => {
    if (!employeeId || !selectedCompany?.id) return;

    setUploading(true);
    setProgress(0);

    try {
      // Sanitizar nome do arquivo
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const timestamp = Date.now();
      const fileName = `${timestamp}_${sanitizedName}`;
      const filePath = `${selectedCompany.id}/${employeeId}/${fileName}`;

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

      // Obter URL do arquivo (signed URL para bucket privado)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, 3600);
      
      let fileUrl = '';
      if (signedUrlError || !signedUrlData) {
        const { data: publicUrlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);
        fileUrl = publicUrlData.publicUrl;
      } else {
        fileUrl = signedUrlData.signedUrl;
      }

      const newDocument: EmployeeDocument = {
        id: fileName,
        name: file.name,
        path: filePath,
        size: file.size,
        mime_type: file.type,
        created_at: new Date().toISOString(),
        url: fileUrl
      };

      setDocuments(prev => [newDocument, ...prev]);

      toast({
        title: 'Documento enviado com sucesso',
        description: 'O documento foi anexado ao funcionário.',
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

  const handleDelete = async (document: EmployeeDocument) => {
    if (!confirm(`Tem certeza que deseja excluir o documento "${document.name}"?`)) {
      return;
    }

    setDeleting(document.id);
    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([document.path]);

      if (error) {
        throw error;
      }

      setDocuments(prev => prev.filter(doc => doc.id !== document.id));

      toast({
        title: 'Documento excluído',
        description: 'O documento foi removido com sucesso.',
      });
    } catch (error: any) {
      console.error('Erro ao excluir documento:', error);
      toast({
        title: 'Erro ao excluir documento',
        description: error.message || 'Não foi possível excluir o documento.',
        variant: 'destructive'
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (document: EmployeeDocument) => {
    if (!document.path) return;

    try {
      // Gerar signed URL para download (válida por 1 hora)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(document.path, 3600);

      if (signedUrlError || !signedUrlData) {
        throw new Error('Não foi possível gerar URL de download');
      }

      const response = await fetch(signedUrlData.signedUrl);
      if (!response.ok) {
        throw new Error('Erro ao baixar arquivo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Erro ao baixar documento:', error);
      toast({
        title: 'Erro ao baixar documento',
        description: error.message || 'Não foi possível baixar o documento.',
        variant: 'destructive'
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    if (mimeType.includes('image')) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    }
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Área de Upload */}
      {mode !== 'view' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Adicionar Documento</CardTitle>
            <CardDescription>
              Faça upload de documentos relacionados ao funcionário (PDF, imagens, documentos Word/Excel)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Clique para selecionar um arquivo ou arraste aqui
                  </p>
                  <p className="text-xs text-gray-500">
                    Tipos aceitos: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX | Tamanho máximo: 10MB
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || !employeeId}
                    className="mt-2"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar Arquivo
                  </Button>
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(',')}
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading || !employeeId}
                />
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Enviando arquivo...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}

              {!employeeId && mode === 'create' && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Salve o funcionário primeiro para poder adicionar documentos. Você pode voltar aqui após salvar.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Documentos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documentos Anexados</CardTitle>
          <CardDescription>
            {documents.length === 0 
              ? 'Nenhum documento anexado ainda'
              : `${documents.length} documento(s) anexado(s)`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando documentos...
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <File className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum documento foi anexado ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    {getFileIcon(document.mime_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{document.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {formatFileSize(document.size)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(document.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(document)}
                      title="Baixar documento"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {!isReadOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(document)}
                        disabled={deleting === document.id}
                        title="Excluir documento"
                        className="text-red-600 hover:text-red-700"
                      >
                        {deleting === document.id ? (
                          <div className="h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

