import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PenTool, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { TimeRecordSignature } from '@/services/rh/timeRecordSignatureService';

interface TimeRecordSignatureModalProps {
  signature: TimeRecordSignature;
  onClose: () => void;
  onSubmit: (signatureData: any) => void;
  isLoading?: boolean;
}

export function TimeRecordSignatureModal({
  signature,
  onClose,
  onSubmit,
  isLoading = false
}: TimeRecordSignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatureData, setSignatureData] = useState<any>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurar canvas
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Ajustar tamanho do canvas
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    setHasSignature(true);
    
    // Capturar dados da assinatura
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL();
    setSignatureData({
      dataURL,
      timestamp: new Date().toISOString(),
      coordinates: getSignatureCoordinates()
    });
  };

  const getSignatureCoordinates = () => {
    const canvas = canvasRef.current;
    if (!canvas) return [];

    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    // Esta é uma implementação simplificada
    // Em um sistema real, você capturaria os pontos de desenho
    return [];
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSignatureData(null);
  };

  const handleSubmit = () => {
    if (!hasSignature || !signatureData) {
      return;
    }

    onSubmit(signatureData);
  };

  const formatMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${monthNames[parseInt(month) - 1]} de ${year}`;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            Assinar Registros de Ponto
          </DialogTitle>
          <DialogDescription>
            Assine eletronicamente seus registros de ponto de {formatMonthYear(signature.month_year)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações da Assinatura */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <h3 className="font-semibold">Informações da Assinatura</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Período:</span>
                    <p className="font-medium">{formatMonthYear(signature.month_year)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vence em:</span>
                    <p className="font-medium">
                      {new Date(signature.expires_at!).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Área de Assinatura */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Assinatura Digital</h3>
                  {hasSignature && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSignature}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Limpar
                    </Button>
                  )}
                </div>
                
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-48 cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    style={{ touchAction: 'none' }}
                  />
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  Use o mouse para assinar na área acima
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Aviso Legal */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Aviso Legal:</strong> Ao assinar este documento, você declara estar ciente de que:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Os registros de ponto são verdadeiros e correspondem à sua jornada de trabalho</li>
                <li>A assinatura eletrônica tem validade legal conforme a Portaria 671/2021</li>
                <li>Você pode solicitar correções antes da assinatura através do sistema</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!hasSignature || isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Assinando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Assinatura
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
