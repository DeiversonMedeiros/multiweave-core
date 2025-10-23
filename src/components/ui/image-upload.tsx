import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useImageUpload } from '@/hooks/useImageUpload';
import { STORAGE_BUCKETS, IMAGE_UPLOAD_CONFIG } from '@/config/storage';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  maxSize?: number; // em MB
  acceptedTypes?: string[];
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  disabled = false,
  label = "Upload de Imagem",
  description = "Clique para fazer upload de uma imagem",
  maxSize = 5, // 5MB por padrão
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  className = ""
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadImage, isUploading } = useImageUpload({
    bucket: STORAGE_BUCKETS.EMPLOYEE_PHOTOS,
    maxSize: maxSize || IMAGE_UPLOAD_CONFIG.MAX_SIZE_MB,
    acceptedTypes: acceptedTypes || IMAGE_UPLOAD_CONFIG.ACCEPTED_TYPES,
    onSuccess: (url) => {
      setPreview(url);
      onChange(url);
    }
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await uploadImage(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-sm font-medium">{label}</Label>
      
      <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
        <CardContent className="p-6">
          {preview ? (
            <div className="space-y-4">
              <div className="relative inline-block">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-32 h-32 object-cover rounded-lg border"
                />
                {!disabled && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={handleRemove}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="text-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClick}
                  disabled={disabled || isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Alterar Imagem
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                {isUploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4">{description}</p>
              <Button
                type="button"
                variant="outline"
                onClick={handleClick}
                disabled={disabled || isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar Imagem
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Formatos aceitos: JPG, PNG, WEBP (máx. {maxSize}MB)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}

export default ImageUpload;
