// =====================================================
// COMPONENTE DE MAPA SIMPLIFICADO - SEM LEAFLET
// =====================================================
// Descrição: Componente de mapa usando imagem estática para máxima compatibilidade
//            Funciona em todos os navegadores, incluindo versões antigas
//            Alternativa leve ao Leaflet para registro de ponto

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimpleLocationMapProps {
  centerLat?: number;
  centerLon?: number;
  radius?: number; // em metros
  className?: string;
  height?: string;
  address?: string;
}

export function SimpleLocationMap({
  centerLat,
  centerLon,
  radius = 100,
  className = '',
  height = '250px',
  address
}: SimpleLocationMapProps) {
  
  // Gerar URL da imagem estática do mapa (sem necessidade de API key)
  const mapImageUrl = useMemo(() => {
    if (!centerLat || !centerLon) return null;
    
    // Usar múltiplas alternativas para garantir que funcione
    // 1. OpenStreetMap via Nominatim (mais confiável)
    // 2. Google Maps Static (requer API key, mas mais confiável)
    // 3. Fallback para link simples
    
    const zoom = radius > 1000 ? 14 : 16;
    const size = '600x300';
    
    // Tentar usar um serviço mais confiável - OpenStreetMap via tile server
    // Ou simplesmente mostrar coordenadas e link para Google Maps
    // Por enquanto, retornar null e mostrar apenas coordenadas + link
    return null; // Não usar imagem estática por enquanto - pode falhar em alguns ambientes
  }, [centerLat, centerLon, radius]);

  // URL para abrir no Google Maps
  const googleMapsUrl = useMemo(() => {
    if (!centerLat || !centerLon) return null;
    return `https://www.google.com/maps?q=${centerLat},${centerLon}`;
  }, [centerLat, centerLon]);

  if (!centerLat || !centerLon) {
    return (
      <Card className={className}>
        <CardContent className="p-0">
          <div style={{ height, position: 'relative' }} className="rounded-lg overflow-hidden flex items-center justify-center">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Coordenadas não disponíveis
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div style={{ minHeight: height }} className="space-y-3">
          {/* Informações de localização - sem mapa visual para máxima compatibilidade */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground mb-1">
                Localização GPS
              </div>
              <div className="text-xs text-muted-foreground break-words">
                {address || `Coordenadas: ${centerLat.toFixed(6)}, ${centerLon.toFixed(6)}`}
              </div>
              {radius > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  Raio permitido: {(radius / 1000).toFixed(2)} km
                </div>
              )}
            </div>
          </div>
          
          {/* Botão para abrir no Google Maps */}
          {googleMapsUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                try {
                  window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
                } catch (err) {
                  console.warn('[SimpleLocationMap] Erro ao abrir Google Maps:', err);
                }
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver no Google Maps
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

