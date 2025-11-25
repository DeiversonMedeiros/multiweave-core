// =====================================================
// SERVIÇO DE GEOLOCALIZAÇÃO
// =====================================================
// Descrição: Serviço para obter localização GPS e converter coordenadas em endereços
//            usando APIs nativas do navegador e Reverse Geocoding gratuito

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface ReverseGeocodeResult {
  address: string;
  fullAddress?: string;
  components?: {
    road?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

// Cache simples em memória para reverse geocoding (coordenadas → endereço)
const reverseGeocodeCache = new Map<string, ReverseGeocodeResult>();
// Timestamp da última requisição para throttling (Nominatim recomenda no máx ~1 req/s)
let lastReverseGeocodeAt = 0;
// Janela mínima entre chamadas (ms)
const REVERSE_GEOCODE_MIN_INTERVAL_MS = 1100;
// Limite de entradas no cache
const REVERSE_GEOCODE_CACHE_LIMIT = 200;

function makeReverseKey(lat: number, lon: number): string {
  // Normalizar para 6 casas decimais para aumentar acerto do cache
  return `${lat.toFixed(6)}:${lon.toFixed(6)}`;
}

function maybeEvictReverseCache(): void {
  if (reverseGeocodeCache.size <= REVERSE_GEOCODE_CACHE_LIMIT) return;
  // Evict FIFO simples (não-LRU) para manter leve
  const firstKey = reverseGeocodeCache.keys().next().value;
  if (firstKey) reverseGeocodeCache.delete(firstKey);
}

export class GeolocationService {
  /**
   * Obter posição GPS atual do usuário
   */
  static async getCurrentPosition(
    options: GeolocationOptions = {}
  ): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada pelo navegador'));
        return;
      }

      const defaultOptions: PositionOptions = {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 10000, // 10 segundos
        maximumAge: options.maximumAge ?? 0 // Não usar cache
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy || 0
          });
        },
        (error) => {
          let errorMessage = 'Erro ao obter localização: ';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Permissão de localização negada pelo usuário';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Localização não disponível';
              break;
            case error.TIMEOUT:
              errorMessage += 'Tempo limite excedido ao obter localização';
              break;
            default:
              errorMessage += 'Erro desconhecido';
              break;
          }
          
          // Preservar o código do erro para tratamento adequado no componente
          const customError: any = new Error(errorMessage);
          customError.code = error.code;
          reject(customError);
        },
        defaultOptions
      );
    });
  }

  /**
   * Converter coordenadas em endereço textual (Reverse Geocoding)
   * Usa Nominatim API (OpenStreetMap) - Gratuita e sem limites de crédito
   * - Implementa cache em memória
   * - Implementa throttling de 1 requisição por ~1.1s
   */
  static async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<ReverseGeocodeResult> {
    const key = makeReverseKey(latitude, longitude);

    // Cache hit
    const cached = reverseGeocodeCache.get(key);
    if (cached) return cached;

    // Throttling: aguardar se necessário
    const now = Date.now();
    const elapsed = now - lastReverseGeocodeAt;
    if (elapsed < REVERSE_GEOCODE_MIN_INTERVAL_MS) {
      const waitMs = REVERSE_GEOCODE_MIN_INTERVAL_MS - elapsed;
      await new Promise((r) => setTimeout(r, waitMs));
    }

    try {
      lastReverseGeocodeAt = Date.now();
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Vision/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na API de geocodificação: ${response.status}`);
      }

      const data = await response.json();
      const result: ReverseGeocodeResult = {
        address: data.display_name || 'Endereço não disponível',
        fullAddress: data.address ? this.formatAddress(data.address) : undefined,
        components: data.address || undefined
      };

      // Armazenar no cache (com limite)
      maybeEvictReverseCache();
      reverseGeocodeCache.set(key, result);

      return result;
    } catch (error) {
      console.error('Erro no reverse geocoding:', error);
      throw error instanceof Error 
        ? error 
        : new Error('Erro ao converter coordenadas em endereço');
    }
  }

  /**
   * Calcular distância entre dois pontos geográficos (fórmula Haversine)
   * Retorna a distância em metros
   */
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Raio da Terra em metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distância em metros
  }

  /**
   * Verificar se uma posição está dentro de um raio (círculo)
   * Retorna true se a distância for menor ou igual ao raio
   */
  static isWithinRadius(
    centerLat: number,
    centerLon: number,
    pointLat: number,
    pointLon: number,
    radiusMeters: number
  ): boolean {
    const distance = this.calculateDistance(
      centerLat,
      centerLon,
      pointLat,
      pointLon
    );
    
    return distance <= radiusMeters;
  }

  /**
   * Limpar cache de reverse geocoding (útil para depuração/tests)
   */
  static clearReverseCache(): void {
    reverseGeocodeCache.clear();
  }

  /**
   * Formatar endereço completo a partir dos componentes
   */
  private static formatAddress(address: any): string {
    const parts: string[] = [];
    
    if (address.road) parts.push(address.road);
    if (address.neighbourhood || address.suburb) {
      parts.push(address.neighbourhood || address.suburb);
    }
    
    const city = address.city || address.town || address.village;
    if (city) parts.push(city);
    
    if (address.state) parts.push(address.state);
    if (address.postcode) parts.push(address.postcode);
    if (address.country) parts.push(address.country);
    
    return parts.filter(Boolean).join(', ');
  }
}

