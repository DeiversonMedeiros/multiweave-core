// =====================================================
// SERVIÇO DE OTIMIZAÇÃO DE IMAGENS
// Sistema ERP MultiWeave Core
// =====================================================

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface OptimizedImage {
  file: File;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  url: string;
}

/**
 * Comprime uma imagem usando Canvas API
 * 
 * @param file Arquivo de imagem original
 * @param options Opções de compressão
 * @returns Arquivo otimizado e informações de compressão
 */
export async function compressImage(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<OptimizedImage> {
  const opts = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.8,
    format: 'jpeg' as const,
    ...options
  };

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas não suportado'));
      return;
    }

    img.onload = () => {
      // Calcular dimensões mantendo proporção
      let { width, height } = img;

      if (width > opts.maxWidth!) {
        height = (height * opts.maxWidth!) / width;
        width = opts.maxWidth!;
      }

      if (height > opts.maxHeight!) {
        width = (width * opts.maxHeight!) / height;
        height = opts.maxHeight!;
      }

      // Configurar canvas
      canvas.width = width;
      canvas.height = height;

      // Desenhar imagem redimensionada
      ctx.drawImage(img, 0, 0, width, height);

      // Converter para blob com qualidade
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Erro ao comprimir imagem'));
            return;
          }

          const optimizedFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, `.${opts.format}`),
            { type: `image/${opts.format}` }
          );

          const compressionRatio = ((1 - (optimizedFile.size / file.size)) * 100);
          const url = URL.createObjectURL(optimizedFile);

          resolve({
            file: optimizedFile,
            originalSize: file.size,
            optimizedSize: optimizedFile.size,
            compressionRatio,
            url
          });
        },
        `image/${opts.format}`,
        opts.quality
      );
    };

    img.onerror = () => {
      reject(new Error('Erro ao carregar imagem'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Cria um thumbnail de uma imagem
 * 
 * @param file Arquivo de imagem
 * @param size Tamanho máximo do thumbnail (largura ou altura)
 * @returns Data URL do thumbnail
 */
export async function createThumbnail(
  file: File,
  size: number = 150
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas não suportado'));
      return;
    }

    img.onload = () => {
      // Calcular dimensões do thumbnail mantendo proporção
      let { width, height } = img;

      if (width > height) {
        height = (height * size) / width;
        width = size;
      } else {
        width = (width * size) / height;
        height = size;
      }

      canvas.width = width;
      canvas.height = height;

      // Desenhar thumbnail
      ctx.drawImage(img, 0, 0, width, height);

      // Converter para data URL
      const dataURL = canvas.toDataURL('image/jpeg', 0.7);
      resolve(dataURL);
    };

    img.onerror = () => {
      reject(new Error('Erro ao carregar imagem'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Verifica se uma imagem precisa ser comprimida
 */
export function shouldCompressImage(file: File, maxSizeMB: number = 1): boolean {
  const fileSizeMB = file.size / (1024 * 1024);
  return fileSizeMB > maxSizeMB;
}

/**
 * Cache de imagens em memória
 */
const imageCache = new Map<string, { url: string; timestamp: number }>();
const thumbnailCache = new Map<string, string>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Obtém URL de imagem do cache ou retorna URL original
 */
export function getCachedImageUrl(url: string): string {
  const cached = imageCache.get(url);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.url;
  }

  imageCache.set(url, { url, timestamp: now });
  return url;
}

/**
 * Obtém thumbnail do cache
 */
export function getCachedThumbnail(key: string): string | null {
  return thumbnailCache.get(key) || null;
}

/**
 * Armazena thumbnail no cache
 */
export function setCachedThumbnail(key: string, thumbnail: string): void {
  thumbnailCache.set(key, thumbnail);
}

/**
 * Limpa cache de imagens
 */
export function clearImageCache(): void {
  imageCache.clear();
  thumbnailCache.clear();
}

/**
 * Limpa cache expirado
 */
export function clearExpiredCache(): void {
  const now = Date.now();
  
  for (const [key, value] of imageCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      imageCache.delete(key);
    }
  }
}

