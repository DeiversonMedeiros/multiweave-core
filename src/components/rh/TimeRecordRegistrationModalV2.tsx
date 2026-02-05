// =====================================================
// MODAL DE REGISTRO DE PONTO - VERSÃO 2.0 (SIMPLIFICADA)
// =====================================================
// Versão: 2.0.0
// Data: 2025-01-07
// Descrição: Implementação limpa e determinística do registro de ponto
//            - Fluxo linear, sem race conditions
//            - Compatível com qualquer navegador/dispositivo
//            - React apenas como UI, não controla fluxo crítico

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Camera, AlertCircle } from 'lucide-react';
import { registerTimeRecord, TimeRecordType } from '@/services/rh/timeRecordRegistrationService';
import { useToast } from '@/hooks/use-toast';

interface TimeRecordRegistrationModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (payload?: { type: TimeRecordType; localDate?: string; localTimestamp?: string }) => void;
  type: TimeRecordType;
  typeLabel: string;
  employeeId: string;
  companyId: string;
}

export function TimeRecordRegistrationModalV2({
  isOpen,
  onClose,
  onSuccess,
  type,
  typeLabel,
  employeeId,
  companyId
}: TimeRecordRegistrationModalV2Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // Iniciar câmera quando modal abrir
  useEffect(() => {
    if (!isOpen) {
      // Limpar stream quando fechar
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        setStream(null);
      }
      setIsVideoReady(false);
      setError(null);
      return;
    }

    // Iniciar câmera
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });

        streamRef.current = mediaStream;
        setStream(mediaStream);
        
        // Atribuir stream ao vídeo quando disponível
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {
            // Ignorar erro de play - será tratado pelos eventos
          });
        }
      } catch (err: any) {
        setError(`Erro ao acessar câmera: ${err.message || 'Verifique as permissões.'}`);
      }
    };

    startCamera();

    // Cleanup ao desmontar ou fechar
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  // Atribuir stream ao vídeo quando ambos estiverem disponíveis
  useEffect(() => {
    if (stream && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {
        // Ignorar erro de play
      });
    }
  }, [stream]);

  const handleRegister = async () => {
    if (!videoRef.current || !isVideoReady) {
      setError('Aguardando câmera carregar...');
      return;
    }

    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      setError('Câmera ainda não está pronta.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await registerTimeRecord({
        employeeId,
        companyId,
        type,
        videoElement: videoRef.current
      });

      if (result.success) {
        toast({
          title: 'Ponto registrado com sucesso',
          description: `${typeLabel} registrado com sucesso.`,
        });
        
        onClose();
        onSuccess({ type, localDate: result.localDate, localTimestamp: result.localTimestamp });
      } else {
        throw new Error(result.error || 'Erro desconhecido ao registrar ponto');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar ponto. Tente novamente.');
      toast({
        title: 'Erro ao registrar ponto',
        description: err.message || 'Erro desconhecido',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (isProcessing) {
      return;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }
    
    setError(null);
    setIsVideoReady(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar {typeLabel}</DialogTitle>
          <DialogDescription>
            Posicione-se em frente à câmera e clique em "Registrar" para confirmar o ponto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview da câmera */}
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
            {stream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                onLoadedMetadata={(e) => {
                  const video = e.currentTarget;
                  if (video.videoWidth > 0 && video.videoHeight > 0) {
                    setIsVideoReady(true);
                  }
                }}
                onCanPlay={(e) => {
                  const video = e.currentTarget;
                  if (video.videoWidth > 0 && video.videoHeight > 0) {
                    setIsVideoReady(true);
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                {error ? (
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-sm">{error}</p>
                  </div>
                ) : (
                  <Loader2 className="w-12 h-12 animate-spin" />
                )}
              </div>
            )}
          </div>

          {/* Mensagem de erro */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Botões */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRegister}
              disabled={isProcessing || !stream || !isVideoReady || !videoRef.current}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Registrar {typeLabel}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
