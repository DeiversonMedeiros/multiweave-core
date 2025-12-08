// =====================================================
// HOOK PARA UPLOAD DE FOTO DE REGISTRO DE PONTO
// =====================================================
// Descrição: Hook para fazer upload de fotos capturadas durante registro de ponto
//            Segue o padrão do sistema usando Supabase Storage diretamente
//            (Storage operations são permitidas diretamente, não via EntityService)

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { STORAGE_BUCKETS, IMAGE_UPLOAD_CONFIG } from '@/config/storage';
import { useCompany } from '@/lib/company-context';
import { compressImage, shouldCompressImage } from '@/lib/imageOptimization';

export interface UseTimeRecordPhotoOptions {
  employeeId?: string;
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
}

export function useTimeRecordPhoto(options: UseTimeRecordPhotoOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { selectedCompany } = useCompany();
  const { employeeId, onSuccess, onError } = options;

  /**
   * Fazer upload de foto para o bucket time-record-photos
   * Estrutura do caminho: {company_id}/{employee_id}/{timestamp}.jpg
   */
  const uploadPhoto = async (file: File): Promise<string | null> => {
    if (!selectedCompany?.id) {
      const error = 'Empresa não selecionada';
      toast({
        title: 'Erro',
        description: error,
        variant: 'destructive'
      });
      onError?.(error);
      return null;
    }

    if (!employeeId) {
      const error = 'ID do funcionário não fornecido';
      toast({
        title: 'Erro',
        description: error,
        variant: 'destructive'
      });
      onError?.(error);
      return null;
    }

    // Validar tipo de arquivo
    if (!IMAGE_UPLOAD_CONFIG.ACCEPTED_TYPES.includes(file.type)) {
      const error = 'Tipo de arquivo não suportado. Use JPG ou PNG.';
      toast({
        title: 'Erro',
        description: error,
        variant: 'destructive'
      });
      onError?.(error);
      return null;
    }

    // Validar tamanho
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > IMAGE_UPLOAD_CONFIG.MAX_SIZE_MB) {
      const error = `Arquivo muito grande. Tamanho máximo: ${IMAGE_UPLOAD_CONFIG.MAX_SIZE_MB}MB`;
      toast({
        title: 'Erro',
        description: error,
        variant: 'destructive'
      });
      onError?.(error);
      return null;
    }

    setUploading(true);

    try {
      // Comprimir e otimizar imagem antes do upload para reduzir egress
      let fileToUpload = file;
      try {
        // Sempre comprimir para otimizar tamanho e reduzir egress
        const optimized = await compressImage(file, {
          maxWidth: 1280,  // Resolução adequada para fotos de registro de ponto
          maxHeight: 1280,
          quality: 0.75,   // Qualidade balanceada (75%)
          format: 'jpeg'   // JPEG é mais eficiente para fotos
        });
        fileToUpload = optimized.file;
        
        const compressionInfo = `Imagem otimizada: ${(optimized.compressionRatio).toFixed(1)}% de redução (${(optimized.originalSize / 1024 / 1024).toFixed(2)}MB → ${(optimized.optimizedSize / 1024 / 1024).toFixed(2)}MB)`;
        console.log('[useTimeRecordPhoto]', compressionInfo);
      } catch (compressError) {
        console.warn('[useTimeRecordPhoto] Erro ao comprimir imagem, usando original:', compressError);
        // Continuar com arquivo original se compressão falhar
      }

      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 9);
      const fileName = `${timestamp}_${randomString}.jpg`;
      
      // Estrutura: {company_id}/{employee_id}/{filename}
      const filePath = `${selectedCompany.id}/${employeeId}/${fileName}`;

      // Upload para o Supabase Storage (imagem já otimizada)
      const { data, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.TIME_RECORD_PHOTOS)
        .upload(filePath, fileToUpload, {
          cacheControl: IMAGE_UPLOAD_CONFIG.CACHE_CONTROL,
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL do arquivo (bucket privado, usar signed URL se necessário)
      // Para bucket privado, usar getPublicUrl não funcionará, então retornamos o path
      // O frontend precisará usar signed URL ou configurar o bucket como público se necessário
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS.TIME_RECORD_PHOTOS)
        .getPublicUrl(filePath);

      // Se o bucket for privado, getPublicUrl retornará uma URL, mas pode não ser acessível
      // Em produção, considerar usar signed URLs temporárias
      const photoUrl = urlData.publicUrl;
      
      toast({
        title: 'Foto enviada com sucesso',
        description: 'A foto foi salva com sucesso.',
      });

      onSuccess?.(photoUrl);
      return photoUrl;
    } catch (error: any) {
      console.error('Erro no upload da foto:', error);
      const errorMessage = error.message || 'Erro ao fazer upload da foto. Tente novamente.';
      
      toast({
        title: 'Erro ao fazer upload',
        description: errorMessage,
        variant: 'destructive'
      });
      
      onError?.(errorMessage);
      return null;
    } finally {
      setUploading(false);
    }
  };

  /**
   * Deletar foto do storage
   */
  const deletePhoto = async (filePath: string): Promise<boolean> => {
    try {
      // Se filePath for uma URL completa, extrair o path
      let pathToDelete = filePath;
      
      // Se for URL, extrair o path após o bucket name
      if (filePath.includes(STORAGE_BUCKETS.TIME_RECORD_PHOTOS)) {
        const parts = filePath.split(`${STORAGE_BUCKETS.TIME_RECORD_PHOTOS}/`);
        if (parts.length > 1) {
          pathToDelete = parts[1];
        }
      }

      const { error } = await supabase.storage
        .from(STORAGE_BUCKETS.TIME_RECORD_PHOTOS)
        .remove([pathToDelete]);

      if (error) {
        throw error;
      }

      toast({
        title: 'Foto removida',
        description: 'A foto foi removida com sucesso.',
      });

      return true;
    } catch (error: any) {
      console.error('Erro ao deletar foto:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao remover a foto.',
        variant: 'destructive'
      });
      return false;
    }
  };

  /**
   * Obter URL assinada (signed URL) para acessar foto privada
   * Útil quando o bucket é privado
   */
  const getSignedUrl = async (filePath: string, expiresIn: number = 3600): Promise<string | null> => {
    try {
      // Extrair path se for URL completa
      let path = filePath;
      if (filePath.includes(STORAGE_BUCKETS.TIME_RECORD_PHOTOS)) {
        const parts = filePath.split(`${STORAGE_BUCKETS.TIME_RECORD_PHOTOS}/`);
        if (parts.length > 1) {
          path = parts[1];
        }
      }

      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.TIME_RECORD_PHOTOS)
        .createSignedUrl(path, expiresIn);

      if (error) {
        throw error;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Erro ao criar signed URL:', error);
      return null;
    }
  };

  return {
    uploadPhoto,
    deletePhoto,
    getSignedUrl,
    uploading
  };
}

