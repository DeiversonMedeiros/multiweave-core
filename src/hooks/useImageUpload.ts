import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { IMAGE_UPLOAD_CONFIG } from '@/config/storage';
import { compressImage, shouldCompressImage } from '@/lib/imageOptimization';

interface UseImageUploadOptions {
  bucket: string;
  maxSize?: number; // em MB
  acceptedTypes?: string[];
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
}

export function useImageUpload({
  bucket,
  maxSize = IMAGE_UPLOAD_CONFIG.MAX_SIZE_MB,
  acceptedTypes = IMAGE_UPLOAD_CONFIG.ACCEPTED_TYPES,
  onSuccess,
  onError
}: UseImageUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = async (file: File): Promise<string | null> => {
    // Validar tipo de arquivo
    if (!acceptedTypes.includes(file.type)) {
      const error = 'Tipo de arquivo não suportado. Use JPG, PNG ou WEBP.';
      onError?.(error);
      toast.error(error);
      return null;
    }

    // Validar tamanho do arquivo
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      const error = `Arquivo muito grande. Tamanho máximo: ${maxSize}MB`;
      onError?.(error);
      toast.error(error);
      return null;
    }

    setIsUploading(true);

    try {
      // Comprimir imagem se necessário (arquivos > 1MB)
      let fileToUpload = file;
      if (shouldCompressImage(file, 1)) {
        try {
          const optimized = await compressImage(file, {
            maxWidth: 1920,
            maxHeight: 1080,
            quality: 0.8,
            format: 'jpeg'
          });
          fileToUpload = optimized.file;
          
          const compressionInfo = `Imagem comprimida: ${(optimized.compressionRatio).toFixed(1)}% de redução`;
          console.log(compressionInfo);
        } catch (compressError) {
          console.warn('Erro ao comprimir imagem, usando original:', compressError);
          // Continuar com arquivo original se compressão falhar
        }
      }

      // Gerar nome único para o arquivo
      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${bucket}/${fileName}`;

      // Upload para o Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileToUpload, {
          cacheControl: IMAGE_UPLOAD_CONFIG.CACHE_CONTROL,
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Obter URL pública da imagem
      const { data: publicData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      const imageUrl = publicData.publicUrl;
      
      onSuccess?.(imageUrl);
      toast.success('Imagem enviada com sucesso!');
      
      return imageUrl;
    } catch (error) {
      console.error('Erro no upload:', error);
      const errorMessage = 'Erro ao fazer upload da imagem. Tente novamente.';
      onError?.(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteImage = async (filePath: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        throw error;
      }

      toast.success('Imagem removida com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao deletar imagem:', error);
      toast.error('Erro ao remover a imagem.');
      return false;
    }
  };

  return {
    uploadImage,
    deleteImage,
    isUploading
  };
}

export default useImageUpload;
