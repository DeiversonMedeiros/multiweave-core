// =====================================================
// SERVIÇO DE CAPTURA DE FOTO VIA CÂMERA
// =====================================================
// Descrição: Serviço para capturar fotos usando a câmera do dispositivo
//            Suporta mobile (câmera frontal/traseira) e desktop (webcam)

export interface CameraOptions {
  width?: number;
  height?: number;
  quality?: number; // 0.1 a 1.0
  facingMode?: 'user' | 'environment'; // 'user' = frontal, 'environment' = traseira
  aspectRatio?: number;
}

export interface CameraCaptureResult {
  file: File;
  dataUrl?: string;
  blob?: Blob;
}

export class CameraService {
  /**
   * Capturar foto usando a câmera do dispositivo
   * Retorna um File object pronto para upload
   */
  static async capturePhoto(
    options: CameraOptions = {}
  ): Promise<File | null> {
    try {
      // Verificar se a API está disponível
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('API de câmera não suportada pelo navegador');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: options.facingMode || 'user',
          width: options.width || { ideal: 1280 },
          height: options.height || { ideal: 720 },
          aspectRatio: options.aspectRatio || { ideal: 16 / 9 }
        }
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;

      // Aguardar o vídeo carregar
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
        video.onerror = (error) => {
          stream.getTracks().forEach(track => track.stop());
          reject(new Error('Erro ao carregar vídeo da câmera'));
        };
      });

      // Criar canvas e capturar frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        stream.getTracks().forEach(track => track.stop());
        throw new Error('Erro ao acessar contexto do canvas');
      }

      // Desenhar frame do vídeo no canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Parar stream da câmera
      stream.getTracks().forEach(track => track.stop());

      // Converter canvas para blob
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Erro ao converter imagem'));
              return;
            }

            // Criar File object a partir do blob
            const file = new File(
              [blob], 
              `photo_${Date.now()}.jpg`, 
              { type: 'image/jpeg' }
            );
            resolve(file);
          },
          'image/jpeg',
          options.quality || 0.8 // Qualidade padrão 80%
        );
      });
    } catch (error) {
      console.error('Erro ao capturar foto:', error);
      
      if (error instanceof Error) {
        // Tratar erros específicos
        if (error.message.includes('Permission denied') || 
            error.message.includes('NotAllowedError')) {
          throw new Error('Permissão de câmera negada. Por favor, permita o acesso à câmera.');
        } else if (error.message.includes('NotFoundError') ||
                   error.message.includes('no camera')) {
          throw new Error('Câmera não encontrada no dispositivo.');
        } else {
          throw error;
        }
      }
      
      throw new Error('Erro desconhecido ao capturar foto');
    }
  }

  /**
   * Comprimir imagem antes do upload
   * Reduz o tamanho do arquivo mantendo qualidade aceitável
   */
  static async compressImage(
    file: File,
    maxWidth: number = 1920,
    maxHeight: number = 1080,
    quality: number = 0.8
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          // Calcular novas dimensões mantendo proporção
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }
          
          // Criar canvas com novas dimensões
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Erro ao acessar contexto do canvas'));
            return;
          }
          
          // Desenhar imagem redimensionada
          ctx.drawImage(img, 0, 0, width, height);
          
          // Converter para blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Erro ao comprimir imagem'));
                return;
              }
              
              const compressedFile = new File(
                [blob],
                file.name,
                { type: 'image/jpeg' }
              );
              
              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        };
        
        img.onerror = () => {
          reject(new Error('Erro ao carregar imagem'));
        };
        
        if (e.target?.result) {
          img.src = e.target.result as string;
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Erro ao ler arquivo'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Verificar se a câmera está disponível no dispositivo
   */
  static async isCameraAvailable(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('Erro ao verificar disponibilidade da câmera:', error);
      return false;
    }
  }
}

