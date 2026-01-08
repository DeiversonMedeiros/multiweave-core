import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, File, CheckCircle, AlertCircle, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company-context';
import { useToast } from '@/hooks/use-toast';
import { FilePreview } from './FilePreview';

interface TrainingFileUploadProps {
  trainingId: string;
  contentId?: string;
  fileType: 'video' | 'pdf' | 'text' | 'link_externo';
  onUploadComplete: (filePath: string, fileUrl: string) => void;
  onRemove?: () => void;
  currentFile?: string;
  maxSizeMB?: number;
}

const BUCKET_NAME = 'training-files';
const MAX_SIZE_VIDEO = 500; // 500MB para vídeos
const MAX_SIZE_PDF = 50; // 50MB para PDFs

export const TrainingFileUpload: React.FC<TrainingFileUploadProps> = ({
  trainingId,
  contentId,
  fileType,
  onUploadComplete,
  onRemove,
  currentFile,
  maxSizeMB
}) => {
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(currentFile || null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const getAcceptedTypes = () => {
    switch (fileType) {
      case 'video':
        return 'video/mp4,video/webm,video/ogg,video/quicktime';
      case 'pdf':
        return 'application/pdf';
      case 'text':
        return 'text/plain,text/html,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      default:
        return '*';
    }
  };

  const getMaxSize = () => {
    if (maxSizeMB) return maxSizeMB;
    return fileType === 'video' ? MAX_SIZE_VIDEO : MAX_SIZE_PDF;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamanho
    const maxSizeBytes = getMaxSize() * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`Arquivo muito grande. Tamanho máximo: ${getMaxSize()}MB`);
      return;
    }

    // Validar tipo
    const acceptedTypes = getAcceptedTypes().split(',');
    if (acceptedTypes[0] !== '*' && !acceptedTypes.includes(file.type)) {
      setError(`Tipo de arquivo não permitido. Tipos aceitos: ${acceptedTypes.join(', ')}`);
      return;
    }

    setError(null);
    
    // Mostrar preview antes de fazer upload
    setPreviewFile(file);
    setShowPreview(true);
  };

  const handleConfirmUpload = async () => {
    if (previewFile) {
      setShowPreview(false);
      await uploadFile(previewFile);
      setPreviewFile(null);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setPreviewFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File) => {
    if (!selectedCompany?.id) {
      setError('Empresa não selecionada');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split('.').pop();
      const fileName = `${timestamp}-${randomString}.${fileExtension}`;

      // Construir caminho: {company_id}/{training_id}/{content_id}/{filename}
      const filePath = contentId
        ? `${selectedCompany.id}/${trainingId}/${contentId}/${fileName}`
        : `${selectedCompany.id}/${trainingId}/${fileName}`;

      // Upload do arquivo
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública ou signed URL
      const { data: urlData, error: urlError } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, 31536000); // 1 ano de validade

      if (urlError) {
        throw urlError;
      }

      setUploadedFile(filePath);
      setUploadProgress(100);

      toast({
        title: 'Upload concluído!',
        description: 'Arquivo enviado com sucesso.',
      });

      onUploadComplete(filePath, urlData.signedUrl);
    } catch (err: any) {
      console.error('Erro no upload:', err);
      setError(err.message || 'Erro ao fazer upload do arquivo');
      toast({
        title: 'Erro no upload',
        description: err.message || 'Não foi possível fazer upload do arquivo',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!uploadedFile) return;

    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([uploadedFile]);

      if (error) {
        throw error;
      }

      setUploadedFile(null);
      if (onRemove) {
        onRemove();
      }

      toast({
        title: 'Arquivo removido',
        description: 'Arquivo excluído com sucesso.',
      });
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível remover o arquivo',
        variant: 'destructive'
      });
    }
  };

  const getFileIcon = () => {
    switch (fileType) {
      case 'video':
        return '🎥';
      case 'pdf':
        return '📄';
      case 'text':
        return '📝';
      default:
        return '📎';
    }
  };

  // Se estiver mostrando preview, renderizar componente de preview
  if (showPreview && previewFile) {
    return (
      <FilePreview
        file={previewFile}
        fileType={fileType}
        onRemove={handleCancelPreview}
        onConfirm={handleConfirmUpload}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>
          {fileType === 'video' ? 'Vídeo' : fileType === 'pdf' ? 'PDF' : 'Arquivo'} 
          {fileType === 'link_externo' && ' (URL Externa)'}
        </Label>
        
        {fileType !== 'link_externo' ? (
          <>
            {uploadedFile ? (
              <div className="flex items-center gap-4 p-4 border rounded-lg bg-green-50">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-2xl">{getFileIcon()}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm">Arquivo enviado</div>
                    <div className="text-xs text-muted-foreground">
                      {uploadedFile.split('/').pop()}
                    </div>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={getAcceptedTypes()}
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="hidden"
                  id={`file-upload-${trainingId}-${contentId || 'new'}`}
                />
                <label
                  htmlFor={`file-upload-${trainingId}-${contentId || 'new'}`}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col items-center gap-2">
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="text-sm text-muted-foreground">
                          Enviando... {uploadProgress}%
                        </p>
                        <Progress value={uploadProgress} className="w-full max-w-xs" />
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            Clique para fazer upload
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Tamanho máximo: {getMaxSize()}MB
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </label>
              </div>
            )}
          </>
        ) : (
          <Input
            type="url"
            placeholder="https://..."
            onChange={(e) => {
              if (e.target.value) {
                onUploadComplete('', e.target.value);
              }
            }}
            defaultValue={currentFile || ''}
          />
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {uploadedFile && !uploading && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Arquivo enviado com sucesso! O caminho será salvo automaticamente.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

