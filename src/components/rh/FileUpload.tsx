import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  onUpload: (url: string) => void;
  onRemove?: () => void;
  maxSize?: number; // em MB
  acceptedTypes?: string[];
  bucket?: string;
  folder?: string;
  currentFile?: string | null;
  disabled?: boolean;
}

export function FileUpload({
  onUpload,
  onRemove,
  maxSize = 10,
  acceptedTypes = ['.pdf'],
  bucket = 'exam-results',
  folder = 'periodic-exams',
  currentFile,
  disabled = false
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<string | null>(currentFile || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamanho
    if (file.size > maxSize * 1024 * 1024) {
      setError(`Arquivo muito grande. Tamanho máximo: ${maxSize}MB`);
      return;
    }

    // Validar tipo
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      setError(`Tipo de arquivo não permitido. Tipos aceitos: ${acceptedTypes.join(', ')}`);
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(0);

    try {
      // Gerar nome único para o arquivo
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${folder}/${fileName}`;

      // Upload com progresso
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setUploadedFile(publicUrl);
      onUpload(publicUrl);
      
      toast({
        title: "Arquivo enviado com sucesso",
        description: "O arquivo foi enviado e está disponível.",
      });

    } catch (error: any) {
      console.error('Erro no upload:', error);
      setError(error.message || 'Erro ao fazer upload do arquivo');
      
      toast({
        title: "Erro no upload",
        description: error.message || 'Erro ao fazer upload do arquivo',
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleRemove = async () => {
    if (!uploadedFile) return;

    try {
      // Extrair path do arquivo da URL
      const url = new URL(uploadedFile);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(-2).join('/'); // bucket/folder/filename

      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        console.error('Erro ao remover arquivo:', error);
      }

      setUploadedFile(null);
      onRemove?.();
      
      toast({
        title: "Arquivo removido",
        description: "O arquivo foi removido com sucesso.",
      });

    } catch (error: any) {
      console.error('Erro ao remover arquivo:', error);
      toast({
        title: "Erro ao remover arquivo",
        description: "Erro ao remover o arquivo.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="file-upload">Anexar Arquivo</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Tipos aceitos: {acceptedTypes.join(', ')} | Tamanho máximo: {maxSize}MB
            </p>
          </div>

          {!uploadedFile ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Clique para selecionar um arquivo ou arraste aqui
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || uploading}
                >
                  Selecionar Arquivo
                </Button>
              </div>
              <Input
                ref={fileInputRef}
                type="file"
                accept={acceptedTypes.join(',')}
                onChange={handleFileSelect}
                className="hidden"
                disabled={disabled || uploading}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <File className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Arquivo enviado com sucesso
                  </p>
                  <p className="text-xs text-green-600">
                    {uploadedFile.split('/').pop()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Enviando arquivo...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
