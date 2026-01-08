import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, File, Video, FileText, Image, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FilePreviewProps {
  file: File;
  fileType: 'video' | 'pdf' | 'text' | 'image';
  onRemove: () => void;
  onConfirm: () => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  file,
  fileType,
  onRemove,
  onConfirm
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createPreview = () => {
      try {
        if (fileType === 'video') {
          const url = URL.createObjectURL(file);
          setPreviewUrl(url);
          setLoading(false);
        } else if (fileType === 'image') {
          const url = URL.createObjectURL(file);
          setPreviewUrl(url);
          setLoading(false);
        } else if (fileType === 'pdf') {
          // Para PDF, criar URL para visualização
          const url = URL.createObjectURL(file);
          setPreviewUrl(url);
          setLoading(false);
        } else {
          // Para texto, ler conteúdo
          const reader = new FileReader();
          reader.onload = (e) => {
            setPreviewUrl(e.target?.result as string);
            setLoading(false);
          };
          reader.onerror = () => {
            setError('Erro ao ler arquivo');
            setLoading(false);
          };
          reader.readAsText(file);
        }
      } catch (err) {
        setError('Erro ao criar preview');
        setLoading(false);
      }
    };

    createPreview();

    // Cleanup
    return () => {
      if (previewUrl && (fileType === 'video' || fileType === 'image' || fileType === 'pdf')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file, fileType]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    switch (fileType) {
      case 'video':
        return <Video className="h-8 w-8 text-red-500" />;
      case 'pdf':
        return <FileText className="h-8 w-8 text-red-500" />;
      case 'image':
        return <Image className="h-8 w-8 text-blue-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    switch (fileType) {
      case 'video':
        return (
          <div className="w-full bg-black rounded-lg overflow-hidden">
            <video
              src={previewUrl || undefined}
              controls
              className="w-full h-auto max-h-[400px]"
            />
          </div>
        );

      case 'image':
        return (
          <div className="w-full flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={previewUrl || undefined}
              alt="Preview"
              className="max-w-full max-h-[400px] object-contain"
            />
          </div>
        );

      case 'pdf':
        return (
          <div className="w-full h-[400px] border rounded-lg overflow-hidden">
            <iframe
              src={previewUrl || undefined}
              className="w-full h-full"
              title="PDF Preview"
            />
          </div>
        );

      case 'text':
        return (
          <div className="w-full h-[400px] border rounded-lg overflow-auto p-4 bg-gray-50">
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {previewUrl}
            </pre>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              {getFileIcon()}
              <p className="mt-2 text-sm text-muted-foreground">
                Preview não disponível para este tipo de arquivo
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getFileIcon()}
            <div>
              <CardTitle className="text-base">{file.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {renderPreview()}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onRemove}>
            Cancelar
          </Button>
          <Button onClick={onConfirm}>
            Confirmar Upload
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};



