// =====================================================
// COMPONENTE DE CAPTURA DE FOTO
// =====================================================
// Descrição: Componente para capturar foto via câmera do dispositivo
//            Suporta mobile e desktop com preview e opção de refazer

import { useState, useRef, useEffect } from 'react';
import { CameraService } from '@/services/cameraService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, X, RotateCcw, Check, AlertCircle, Upload } from 'lucide-react';

interface PhotoCaptureProps {
  onCapture: (file: File) => void;
  onCancel?: () => void;
  required?: boolean;
  disabled?: boolean;
  allowUploadFallback?: boolean;
}

export function PhotoCapture({ 
  onCapture, 
  onCancel,
  required = false,
  disabled = false,
  allowUploadFallback = true,
}: PhotoCaptureProps) {
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  // Atualizar ref quando previewUrl mudar
  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    console.log('[PhotoCapture][LIFECYCLE] 🎬 Componente montando');
    isMountedRef.current = true;
    
    // Verificar disponibilidade da câmera
    CameraService.isCameraAvailable().then(setIsAvailable);
    
    return () => {
      const unmountTime = performance.now();
      console.log('[PhotoCapture][LIFECYCLE] 🧹 Componente desmontando - iniciando limpeza', {
        hasStream: !!streamRef.current,
        hasVideo: !!videoRef.current,
        hasPreviewUrl: !!previewUrlRef.current,
        timestamp: new Date().toISOString()
      });
      isMountedRef.current = false;
      
      // Limpar imediatamente (sem requestAnimationFrame) para dispositivos antigos
      // Isso evita que o React tente remover nós que já foram limpos
      try {
        // Limpar stream ao desmontar
        if (streamRef.current) {
          try {
            console.log('[PhotoCapture][CLEANUP] 🎥 Parando stream da câmera');
            const tracks = streamRef.current.getTracks();
            tracks.forEach(track => {
              try {
                track.stop();
              } catch (err) {
                // Ignorar erros individuais de track
              }
            });
            streamRef.current = null;
            console.log('[PhotoCapture][CLEANUP] ✅ Stream parado');
          } catch (err) {
            // Ignorar erros ao limpar stream
            console.warn('[PhotoCapture][CLEANUP] ⚠️ Erro ao limpar stream:', err);
          }
        }
        
        // Limpar vídeo ref de forma mais agressiva
        if (videoRef.current) {
          try {
            console.log('[PhotoCapture][CLEANUP] 📹 Limpando videoRef');
            const video = videoRef.current;
            
            // Pausar e limpar de forma segura
            try {
              video.pause();
            } catch (e) {
              // Ignorar erro de pause
            }
            
            // Remover srcObject primeiro
            try {
              if (video.srcObject) {
                const stream = video.srcObject as MediaStream;
                if (stream && stream.getTracks) {
                  stream.getTracks().forEach(track => {
                    try {
                      track.stop();
                    } catch (e) {
                      // Ignorar
                    }
                  });
                }
                video.srcObject = null;
              }
            } catch (e) {
              // Ignorar erro
            }
            
            // Limpar src
            try {
              if (video.src) {
                video.src = '';
                video.removeAttribute('src');
              }
            } catch (e) {
              // Ignorar erro
            }
            
            // Remover do DOM se ainda estiver conectado
            try {
              if (video.parentNode) {
                // Não remover do DOM aqui - deixar o React fazer isso
                // video.parentNode.removeChild(video);
              }
            } catch (e) {
              // Ignorar erro
            }
            
            console.log('[PhotoCapture][CLEANUP] ✅ videoRef limpo');
          } catch (err) {
            // Ignorar erros
            console.warn('[PhotoCapture][CLEANUP] ⚠️ Erro ao limpar videoRef:', err);
          }
        }
        
        // Limpar preview URL
        if (previewUrlRef.current) {
          try {
            console.log('[PhotoCapture][CLEANUP] 🖼️ Revogando preview URL', {
              previewUrl: previewUrlRef.current ? 'existe' : 'null',
              timestamp: new Date().toISOString()
            });
            URL.revokeObjectURL(previewUrlRef.current);
            previewUrlRef.current = null;
            console.log('[PhotoCapture][CLEANUP] ✅ Preview URL revogada');
          } catch (err) {
            // Ignorar erros
            console.warn('[PhotoCapture][CLEANUP] ⚠️ Erro ao revogar preview URL:', err);
          }
        }
        
        const cleanupTime = performance.now() - unmountTime;
        console.log('[PhotoCapture][CLEANUP] ✅ Limpeza concluída', {
          cleanupTime: `${cleanupTime.toFixed(2)}ms`,
          timestamp: new Date().toISOString()
        });
        
        console.log('[PhotoCapture][LIFECYCLE] ✅ Limpeza concluída');
      } catch (err) {
        console.warn('[PhotoCapture][LIFECYCLE] ⚠️ Erro geral na limpeza:', err);
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      setIsCapturing(true);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('API de câmera não suportada pelo navegador');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      
      if (videoRef.current && isMountedRef.current) {
        videoRef.current.srcObject = stream;
        
        // Aguardar o vídeo estar pronto antes de fazer play
        try {
          // Aguardar metadata carregar
          await new Promise<void>((resolve, reject) => {
            if (!videoRef.current) {
              reject(new Error('Video ref não disponível'));
              return;
            }
            
            const video = videoRef.current;
            
            const onLoadedMetadata = () => {
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              resolve();
            };
            
            const onError = (e: Event) => {
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              reject(new Error('Erro ao carregar vídeo'));
            };
            
            video.addEventListener('loadedmetadata', onLoadedMetadata);
            video.addEventListener('error', onError);
            
            // Se já tem metadata, resolver imediatamente
            if (video.readyState >= 1) {
              onLoadedMetadata();
            }
          });
          
          // Verificar se ainda está montado antes de fazer play
          if (!isMountedRef.current || !videoRef.current) {
            return;
          }
          
          // Fazer play de forma segura
          const playPromise = videoRef.current.play();
          
          if (playPromise !== undefined) {
            await playPromise.catch((err: Error) => {
              // Ignorar AbortError - é esperado quando o vídeo é interrompido
              if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
                console.warn('[PhotoCapture] Erro ao fazer play do vídeo:', err);
              }
            });
          }
        } catch (err: any) {
          // Ignorar AbortError - é esperado quando o vídeo é interrompido
          if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
            console.warn('[PhotoCapture] Erro ao inicializar vídeo:', err);
          }
        }
      }
    } catch (err: any) {
      console.error('Erro ao iniciar câmera:', err);
      setError(
        err.message?.includes('Permission denied')
          ? 'Permissão de câmera negada. Por favor, permita o acesso à câmera nas configurações do navegador.'
          : 'Erro ao acessar câmera. Verifique se o dispositivo possui câmera e se as permissões estão habilitadas.'
      );
      setIsCapturing(false);
    }
  };

  const capturePhoto = async () => {
    try {
      setError(null);
      
      if (!videoRef.current) {
        throw new Error('Vídeo não disponível');
      }

      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Erro ao acessar canvas');
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Parar stream
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        } catch (err) {
          console.warn('Erro ao parar stream:', err);
        }
      }

      // Limpar vídeo ref de forma segura
      if (videoRef.current) {
        try {
          // Pausar antes de limpar para evitar AbortError
          const video = videoRef.current;
          if (!video.paused) {
            try {
              video.pause();
            } catch (pauseErr) {
              // Ignorar erro de pause
            }
          }
          
          // Limpar srcObject
          if (video.srcObject) {
            const stream = video.srcObject as MediaStream;
            if (stream && stream.getTracks) {
              stream.getTracks().forEach(track => {
                try {
                  track.stop();
                } catch (trackErr) {
                  // Ignorar erro ao parar track
                }
              });
            }
            video.srcObject = null;
          }
        } catch (err: any) {
          // Ignorar AbortError - é esperado quando o vídeo é interrompido
          if (err.name !== 'AbortError') {
            console.warn('[PhotoCapture] Erro ao limpar videoRef:', err);
          }
        }
      }

      // Converter para blob e criar File
      canvas.toBlob((blob) => {
        if (!blob || !isMountedRef.current) {
          if (!blob) {
            setError('Erro ao capturar foto');
          }
          return;
        }

        const file = new File([blob], `photo_${Date.now()}.jpg`, { 
          type: 'image/jpeg' 
        });

        // Criar preview
        const url = URL.createObjectURL(blob);
        if (isMountedRef.current) {
          setPreviewUrl(url);
          setCapturedPhoto(file);
          setIsCapturing(false);
        } else {
          // Se componente foi desmontado, limpar URL imediatamente
          URL.revokeObjectURL(url);
        }
      }, 'image/jpeg', 0.8);
    } catch (err: any) {
      console.error('Erro ao capturar foto:', err);
      setError(err.message || 'Erro ao capturar foto');
      setIsCapturing(false);
    }
  };

  const retakePhoto = () => {
    if (previewUrlRef.current) {
      try {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      } catch (err) {
        console.warn('Erro ao revogar preview URL no retake:', err);
      }
    }
    setPreviewUrl(null);
    setCapturedPhoto(null);
    setError(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
    }
  };

  const handleCancel = () => {
    // Limpar stream
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      } catch (err) {
        console.warn('Erro ao limpar stream no cancel:', err);
      }
    }
    // Limpar vídeo ref
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch (err) {
        console.warn('Erro ao limpar videoRef no cancel:', err);
      }
    }
    // Limpar preview
    if (previewUrlRef.current) {
      try {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      } catch (err) {
        console.warn('Erro ao revogar preview URL no cancel:', err);
      }
    }
    setPreviewUrl(null);
    setCapturedPhoto(null);
    setIsCapturing(false);
    setError(null);
    onCancel?.();
  };

  const handleUploadFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem válido.');
      return;
    }
    setError(null);
    setCapturedPhoto(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  if (isAvailable === false && !allowUploadFallback) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Câmera não disponível neste dispositivo.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {!isCapturing && !capturedPhoto && (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <Camera className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {required ? 'Foto obrigatória para registro' : 'Capture uma foto para o registro de ponto'}
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                <Button
                  onClick={startCamera}
                  disabled={disabled || isAvailable === false}
                  type="button"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Abrir Câmera
                </Button>
                {allowUploadFallback && isAvailable === false && (
                  <label className="inline-flex items-center">
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadFallback} />
                    <span className="inline-flex items-center px-4 py-2 border rounded-md cursor-pointer text-sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Enviar Imagem
                    </span>
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {isCapturing && !capturedPhoto && (
          <div className="space-y-4">
            <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={capturePhoto}
                type="button"
                size="lg"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capturar
              </Button>
              <Button
                onClick={handleCancel}
                type="button"
                variant="outline"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {capturedPhoto && previewUrl && (
          <div className="space-y-4">
            <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video">
              <img
                src={previewUrl}
                alt="Foto capturada"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={confirmPhoto}
                type="button"
                size="lg"
              >
                <Check className="h-4 w-4 mr-2" />
                Confirmar Foto
              </Button>
              <Button
                onClick={retakePhoto}
                type="button"
                variant="outline"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Refazer
              </Button>
              {onCancel && (
                <Button
                  onClick={handleCancel}
                  type="button"
                  variant="ghost"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
}

