// =====================================================
// COMPONENTE DE MAPA PARA ZONAS DE LOCALIZAÇÃO
// =====================================================
// Descrição: Componente de mapa usando Leaflet para visualizar e configurar zonas de localização
//            Mostra ponto central, raio permitido e posição atual do usuário

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GeolocationService } from '@/services/geolocationService';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Navigation, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { MapErrorBoundary } from './MapErrorBoundary';

// Fix para ícones padrão do Leaflet (problema comum em React)
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LocationZoneMapProps {
  centerLat?: number;
  centerLon?: number;
  radius?: number; // em metros
  onLocationSelect?: (lat: number, lon: number) => void;
  showCurrentLocation?: boolean;
  editable?: boolean;
  className?: string;
  height?: string;
}

// Componente para invalidar tamanho do mapa quando necessário
function MapSizeInvalidator({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();

  useEffect(() => {
    // Salvar referência do mapa
    if (map) {
      mapRef.current = map;
    }
    
    let mounted = true;
    const startTime = performance.now();
    
    // Invalidar tamanho após um pequeno delay para garantir que o DOM esteja estável
    const timer = setTimeout(() => {
      const elapsed = performance.now() - startTime;
      if (mounted && map) {
        try {
          // Verificar se o mapa ainda está conectado ao DOM
          const container = map.getContainer();
          if (!container || !container.parentNode) {
            console.warn('[LocationZoneMap][DEBUG] ⚠️ Mapa não está mais conectado ao DOM');
            return;
          }
          
          if (map && typeof map.invalidateSize === 'function') {
            console.log('[LocationZoneMap][DEBUG] 📏 Invalidando tamanho do mapa', {
              elapsed: `${elapsed.toFixed(2)}ms`
            });
            map.invalidateSize();
          } else {
            console.warn('[LocationZoneMap][DEBUG] ⚠️ Map ou invalidateSize não disponível', {
              hasMap: !!map,
              hasInvalidateSize: map && typeof map.invalidateSize === 'function'
            });
          }
        } catch (err) {
          // Ignorar erros de DOM que podem ocorrer em dispositivos antigos
          const errorMessage = err instanceof Error ? err.message : String(err);
          if (errorMessage.includes('removeChild') || errorMessage.includes('not a child')) {
            console.warn('[LocationZoneMap][DEBUG] ⚠️ Erro de removeChild ignorado (comum em dispositivos antigos)');
          } else {
            console.error('[LocationZoneMap][DEBUG] ❌ Erro ao invalidar tamanho do mapa', {
              error: err,
              elapsed: `${elapsed.toFixed(2)}ms`
            });
          }
        }
      } else {
        console.warn('[LocationZoneMap][DEBUG] ⚠️ Componente desmontado antes de invalidar tamanho');
      }
    }, 100);
    
    return () => {
      const cleanupTime = performance.now() - startTime;
      console.log('[LocationZoneMap][DEBUG] 🧹 Cleanup MapSizeInvalidator', {
        cleanupTime: `${cleanupTime.toFixed(2)}ms`
      });
      mounted = false;
      clearTimeout(timer);
    };
  }, [map, mapRef]);

  return null;
}

// Componente para atualizar o mapa quando center/radius mudarem
function MapUpdater({ centerLat, centerLon, radius }: { 
  centerLat?: number; 
  centerLon?: number; 
  radius?: number;
}) {
  const map = useMap();

  useEffect(() => {
    let mounted = true;
    if (centerLat && centerLon && mounted) {
      // Pequeno delay para garantir que o mapa esteja totalmente inicializado
      const timer = setTimeout(() => {
        if (!mounted) return;
        
        try {
          // Verificar se o mapa ainda está válido e conectado ao DOM
          const container = map?.getContainer();
          if (!container || !container.parentNode) {
            console.warn('[LocationZoneMap][DEBUG] ⚠️ Mapa não está mais conectado ao DOM');
            return;
          }
          
          if (map && typeof map.setView === 'function') {
            const zoom = radius && radius > 1000 ? 13 : 15;
            console.log('[LocationZoneMap][DEBUG] 🔄 Atualizando visualização do mapa', {
              centerLat,
              centerLon,
              radius,
              zoom
            });
            map.setView([centerLat, centerLon], zoom);
          } else {
            console.warn('[LocationZoneMap][DEBUG] ⚠️ Map ou setView não disponível', {
              hasMap: !!map,
              hasSetView: map && typeof map.setView === 'function'
            });
          }
        } catch (err) {
          // Ignorar erros de removeChild
          const errorMsg = err instanceof Error ? err.message : String(err);
          if (!errorMsg.includes('removeChild') && !errorMsg.includes('not a child')) {
            console.error('[LocationZoneMap][DEBUG] ❌ Erro ao atualizar visualização do mapa', {
              error: err,
              centerLat,
              centerLon,
              radius
            });
          }
        }
      }, 50);
      
      return () => {
        mounted = false;
        clearTimeout(timer);
      };
    }
    return () => {
      mounted = false;
    };
  }, [centerLat, centerLon, radius, map]);

  return null;
}

// Componente para capturar cliques no mapa
function LocationClickHandler({ onLocationSelect }: { 
  onLocationSelect?: (lat: number, lon: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

export function LocationZoneMap({
  centerLat,
  centerLon,
  radius = 100,
  onLocationSelect,
  showCurrentLocation = false,
  editable = false,
  className = '',
  height = '400px'
}: LocationZoneMapProps) {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  // Key única para esta instância do mapa (mantida durante toda a vida do componente)
  const instanceKeyRef = useRef<string>(`map-instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // Marcar componente como montado e limpar mapa ao desmontar
  useEffect(() => {
    const componentId = `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('[LocationZoneMap][DEBUG] 🎬 Componente montando', {
      componentId,
      centerLat,
      centerLon,
      radius,
      showCurrentLocation,
      timestamp: new Date().toISOString()
    });
    
    let mounted = true;
    setIsMounted(true);
    
    return () => {
      console.log('[LocationZoneMap][DEBUG] 🧹 Componente desmontando', {
        componentId,
        mounted,
        timestamp: new Date().toISOString()
      });
      mounted = false;
      setIsMounted(false);
      
      // UNMOUNT SEGURO DO LEAFLET - Previne erros de removeChild em dispositivos antigos
      if (mapRef.current) {
        try {
          const map = mapRef.current;
          
          // Desabilitar todos os eventos antes de remover
          try {
            map.off(); // Remove todos os event listeners
          } catch (e) {
            // Ignorar erros ao desabilitar eventos
            console.warn('[LocationZoneMap][DEBUG] ⚠️ Erro ao desabilitar eventos (ignorado):', e);
          }
          
          // Remover layers explicitamente antes de remover o mapa
          // Isso reduz a chance de Leaflet já ter removido nós internamente
          try {
            map.eachLayer((layer) => {
              try {
                map.removeLayer(layer);
              } catch (e) {
                // Ignorar erros ao remover layers individuais
              }
            });
          } catch (e) {
            // Ignorar erros ao iterar/remover layers
            console.warn('[LocationZoneMap][DEBUG] ⚠️ Erro ao remover layers (ignorado):', e);
          }
          
          // Verificar se o mapa ainda é válido antes de tentar remover
          try {
            const container = map.getContainer();
            if (!container) {
              console.log('[LocationZoneMap][DEBUG] ⚠️ Container não encontrado, limpando referência');
              mapRef.current = null;
              return;
            }
            
            // Verificar se o container ainda está no DOM
            if (container.parentNode) {
              // Verificar se este mapa ainda está associado ao container
              const containerMapId = (container as any)._leaflet_id;
              const mapId = (map as any)._leaflet_id;
              
              // Só remover se o mapa ainda estiver associado ao container
              if (containerMapId === mapId) {
                console.log('[LocationZoneMap][DEBUG] 🗑️ Removendo mapa do Leaflet de forma segura');
                try {
                  // Remover o mapa de forma segura
                  map.remove();
                  console.log('[LocationZoneMap][DEBUG] ✅ Mapa removido com sucesso');
                } catch (err) {
                  const errorMsg = err instanceof Error ? err.message : String(err);
                  // Ignorar erros de removeChild que são comuns em dispositivos antigos
                  if (errorMsg.includes('removeChild') || 
                      errorMsg.includes('not a child') || 
                      errorMsg.includes('reused')) {
                    console.warn('[LocationZoneMap][DEBUG] ⚠️ Erro de removeChild ignorado (comum em dispositivos antigos)');
                  } else {
                    console.warn('[LocationZoneMap][DEBUG] ⚠️ Erro ao remover mapa (ignorado):', err);
                  }
                }
              } else {
                console.warn('[LocationZoneMap][DEBUG] ⚠️ Mapa não está mais associado ao container, limpando referência');
              }
            } else {
              console.log('[LocationZoneMap][DEBUG] ⚠️ Container não está mais no DOM, limpando referência');
            }
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            // Ignorar erros de removeChild que são comuns em dispositivos antigos
            if (errorMsg.includes('removeChild') || 
                errorMsg.includes('not a child') || 
                errorMsg.includes('reused')) {
              console.warn('[LocationZoneMap][DEBUG] ⚠️ Erro de removeChild ignorado (comum em dispositivos antigos)');
            } else {
              console.warn('[LocationZoneMap][DEBUG] ⚠️ Erro ao acessar container (ignorado):', err);
            }
          }
          
          // Sempre limpar a referência
          mapRef.current = null;
        } catch (err) {
          // Ignorar erros de removeChild e reutilização que podem ocorrer em dispositivos antigos
          const errorMsg = err instanceof Error ? err.message : String(err);
          if (errorMsg.includes('removeChild') || 
              errorMsg.includes('not a child') || 
              errorMsg.includes('reused')) {
            console.warn('[LocationZoneMap][DEBUG] ⚠️ Erro de removeChild ignorado (comum em dispositivos antigos)');
          } else {
            console.warn('[LocationZoneMap][DEBUG] ⚠️ Erro geral ao limpar mapa (ignorado):', err);
          }
          mapRef.current = null;
        }
      }
    };
  }, []);

  // Buscar localização atual se solicitado
  useEffect(() => {
    if (showCurrentLocation && isMounted) {
      setIsLoadingLocation(true);
      let cancelled = false;
      let mounted = true;
      
      GeolocationService.getCurrentPosition()
        .then((position) => {
          if (!cancelled && mounted && isMounted) {
            setCurrentLocation({
              lat: position.latitude,
              lon: position.longitude
            });
            setLocationError(null);
          }
        })
        .catch((error) => {
          if (!cancelled && mounted && isMounted) {
            setLocationError(error.message);
            setCurrentLocation(null);
          }
        })
        .finally(() => {
          if (!cancelled && mounted && isMounted) {
            setIsLoadingLocation(false);
          }
        });
      
      return () => {
        cancelled = true;
        mounted = false;
      };
    }
  }, [showCurrentLocation, isMounted]);

  // Usar localização atual ou coordenadas fornecidas
  const mapCenter = currentLocation && !centerLat && !centerLon
    ? [currentLocation.lat, currentLocation.lon]
    : centerLat && centerLon
    ? [centerLat, centerLon]
    : [-15.7975, -47.8919]; // Brasília como padrão

  const [mapLat, mapLon] = mapCenter;

  // Não renderizar o mapa até o componente estar montado e ter um pequeno delay
  const [canRenderMap, setCanRenderMap] = useState(false);

  useEffect(() => {
    if (isMounted) {
      // Pequeno delay adicional para garantir que o DOM esteja estável
      let mounted = true;
      const startTime = performance.now();
      
      console.log('[LocationZoneMap][DEBUG] ⏱️ Agendando renderização do mapa', {
        isMounted,
        centerLat,
        centerLon,
        timestamp: new Date().toISOString()
      });
      
      const timer = setTimeout(() => {
        const elapsed = performance.now() - startTime;
        console.log('[LocationZoneMap][DEBUG] ⏱️ Timer de renderização executado', {
          elapsed: `${elapsed.toFixed(2)}ms`,
          mounted,
          willRender: mounted
        });
        
        if (mounted) {
          setCanRenderMap(true);
          console.log('[LocationZoneMap][DEBUG] ✅ Mapa pode ser renderizado');
        } else {
          console.warn('[LocationZoneMap][DEBUG] ⚠️ Componente desmontado antes de permitir renderização');
        }
      }, 150);
      
      return () => {
        const cleanupTime = performance.now() - startTime;
        console.log('[LocationZoneMap][DEBUG] 🧹 Cleanup do timer de renderização', {
          cleanupTime: `${cleanupTime.toFixed(2)}ms`,
          mounted: mounted
        });
        mounted = false;
        clearTimeout(timer);
        setCanRenderMap(false);
      };
    } else {
      console.log('[LocationZoneMap][DEBUG] ⏸️ Componente não montado, não renderizando mapa');
      setCanRenderMap(false);
    }
  }, [isMounted, centerLat, centerLon]);

  if (!isMounted || !canRenderMap) {
    console.log('[LocationZoneMap][DEBUG] ⏳ Aguardando renderização', {
      isMounted,
      canRenderMap,
      centerLat,
      centerLon
    });
    return (
      <Card className={className}>
        <CardContent className="p-0">
          <div style={{ height, position: 'relative' }} className="rounded-lg overflow-hidden flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Carregando mapa...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Usar key única da instância para evitar reutilização de container
  const mapKey = instanceKeyRef.current;
  
  console.log('[LocationZoneMap][DEBUG] 🗺️ Renderizando MapContainer', {
    mapKey,
    instanceKey: instanceKeyRef.current,
    centerLat,
    centerLon,
    mapLat,
    mapLon,
    radius,
    timestamp: new Date().toISOString()
  });

  return (
    <MapErrorBoundary
      fallback={
        <Card className={className}>
          <CardContent className="p-0">
            <div style={{ height, position: 'relative' }} className="rounded-lg overflow-hidden flex items-center justify-center">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Não foi possível carregar o mapa. O registro de ponto continuará funcionando normalmente.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      }
    >
      <Card className={className}>
        <CardContent className="p-0">
          <div style={{ height, position: 'relative' }} className="rounded-lg overflow-hidden">
            <MapContainer
              key={mapKey}
              center={[mapLat, mapLon]}
              zoom={centerLat && centerLon ? (radius > 1000 ? 13 : 15) : 13}
              style={{ height: '100%', width: '100%', zIndex: 0 }}
              className="rounded-lg"
            >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Invalidar tamanho do mapa quando montado */}
            <MapSizeInvalidator mapRef={mapRef} />

            {/* Atualizar centro do mapa quando props mudarem */}
            <MapUpdater centerLat={centerLat} centerLon={centerLon} radius={radius} />

            {/* Capturar cliques no mapa se editável */}
            {editable && <LocationClickHandler onLocationSelect={onLocationSelect} />}

            {/* Círculo representando o raio permitido */}
            {centerLat && centerLon && radius > 0 && (
              <Circle
                center={[centerLat, centerLon]}
                radius={radius}
                pathOptions={{
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.2,
                  weight: 2
                }}
              />
            )}

            {/* Marcador do ponto central */}
            {centerLat && centerLon && (
              <Marker position={[centerLat, centerLon]}>
                {/* Você pode adicionar Popup aqui se necessário */}
              </Marker>
            )}

            {/* Marcador da localização atual */}
            {currentLocation && (
              <Marker 
                position={[currentLocation.lat, currentLocation.lon]}
                icon={L.icon({
                  ...DefaultIcon.options,
                  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
                      <circle cx="12.5" cy="12.5" r="10" fill="#10b981" stroke="white" stroke-width="2"/>
                    </svg>
                  `)
                })}
              >
                {/* Você pode adicionar Popup aqui se necessário */}
              </Marker>
            )}
            </MapContainer>

            {/* Botão para localizar usuário */}
          {showCurrentLocation && (
            <div className="absolute top-2 right-2 z-[1000]">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (!isMounted) return;
                  let mounted = true;
                  setIsLoadingLocation(true);
                  GeolocationService.getCurrentPosition()
                    .then((position) => {
                      if (mounted && isMounted) {
                        setCurrentLocation({
                          lat: position.latitude,
                          lon: position.longitude
                        });
                        setLocationError(null);
                      }
                    })
                    .catch((error) => {
                      if (mounted && isMounted) {
                        setLocationError(error.message);
                      }
                    })
                    .finally(() => {
                      if (mounted && isMounted) {
                        setIsLoadingLocation(false);
                      }
                    });
                }}
                disabled={isLoadingLocation}
              >
                <Navigation className="h-4 w-4 mr-2" />
                {isLoadingLocation ? 'Buscando...' : 'Minha Localização'}
              </Button>
            </div>
          )}
          </div>

          {/* Mensagem de erro de localização */}
          {locationError && (
            <Alert variant="destructive" className="mt-2 m-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{locationError}</AlertDescription>
            </Alert>
          )}

          {/* Informações da zona */}
          {centerLat && centerLon && (
            <div className="p-4 space-y-2 border-t">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Coordenadas: {centerLat.toFixed(6)}, {centerLon.toFixed(6)}
                </span>
              </div>
              {radius > 0 && (
                <div className="text-sm text-muted-foreground">
                  Raio permitido: {(radius / 1000).toFixed(2)} km
                </div>
              )}
              {currentLocation && centerLat && centerLon && (
                <div className="text-sm">
                  {GeolocationService.isWithinRadius(
                    centerLat,
                    centerLon,
                    currentLocation.lat,
                    currentLocation.lon,
                    radius
                  ) ? (
                    <span className="text-green-600 font-medium">
                      ✓ Você está dentro da zona permitida
                    </span>
                  ) : (
                    <span className="text-red-600 font-medium">
                      ✗ Você está fora da zona permitida
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </MapErrorBoundary>
  );
}

