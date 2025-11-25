# Avaliação e Plano de Implementação - Funcionalidades de Registro de Ponto

## Data: 2025-01-27

## 📋 Resumo Executivo

Este documento avalia a viabilidade de implementação de três novas funcionalidades no sistema de registro de ponto:
1. **Armazenamento de localização** (latitude, longitude e endereço via Reverse Geocoding)
2. **Definição de raio geográfico** para registro de ponto
3. **Captura de foto** via câmera (mobile e desktop) com armazenamento em bucket

**Conclusão:** ✅ **TOTALMENTE VIÁVEL** - O sistema possui toda a infraestrutura necessária para implementação.

---

## 🔍 1. Análise do Estado Atual

### 1.1 Estrutura do Banco de Dados

**Tabela `rh.time_records`:**
```sql
CREATE TABLE rh.time_records (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL,
  company_id UUID NOT NULL,
  data_registro DATE NOT NULL,
  entrada TIME,
  saida TIME,
  entrada_almoco TIME,
  saida_almoco TIME,
  -- ... outros campos de horário
  status VARCHAR(20) DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

**Observação:** A tabela atual **NÃO possui** campos para:
- ❌ Coordenadas geográficas (latitude/longitude)
- ❌ Endereço de localização
- ❌ Referência a foto do registro
- ❌ Configuração de raio permitido

### 1.2 Infraestrutura Existente

✅ **Supabase Storage:**
- Bucket Workplace: já existem buckets configurados (`employee-photos`, `documents`)
- Sistema de upload: `FileUpload.tsx` e `useImageUpload.ts` já implementados
- Políticas RLS: já configuradas para buckets

✅ **API de Geolocalização:**
- Browser API: `navigator.geolocation` disponível (nativo do navegador)
- Não requer bibliotecas externas

✅ **Captura de Mídia:**
- MediaDevices API: `navigator.mediaDevices.getUserMedia()` disponível
- Suporte nativo para câmera em mobile e desktop

✅ **Sistema de Permissões:**
- Sistema de RLS (Row Level Security) implementado
- Controle de acesso por empresa e perfil

✅ **Funcionalidade Offline:**
- Sistema PWA já implementado
- Armazenamento local via IndexedDB
- Sincronização automática quando volta online

### 1.3 Tecnologias Utilizadas

- **Frontend:** React 18.3 + TypeScript + Vite
- **UI:** Radix UI + TailwindCSS + Shadcn/ui
- **Backend:** Supabase (PostgreSQL + Storage)
- **Estado:** TanStack Query (React Query)
- **Geolocalização:** API nativa do navegador
- **Maps:** ❌ Não implementado (precisa adicionar)

---

## ✅ 2. Viabilidade das Funcionalidades

### 2.1 Funcionalidade 1: Armazenamento de Localização

**Status:** ✅ **VIÁVEL**

**Requisitos:**
- ✅ Geolocalização nativa do navegador disponível
- ✅ API gratuita de Reverse Geocoding disponível (OpenStreetMap Nominatim API)
- ✅ Estrutura de banco pode ser estendida

**Alterações Necessárias:**
1. **Banco de Dados:** Adicionar campos à tabela `rh.time_records`:
   - `latitude DECIMAL(10, 8)`
   - `longitude DECIMAL(11, 8)`
   - `endereco TEXT`
   - `localizacao_type VARCHAR(20)` (opcional: 'manual', 'gps', 'wifi')

2. **Frontend:** 
   - Integrar `navigator.geolocation.getCurrentPosition()`
   - Integrar API de Reverse Geocoding (Nominatim - gratuita)

**API Gratuita Recomendada:**
- **Nominatim (OpenStreetMap):** 
  - ✅ Gratuita e sem limite de créditos
  - ✅ Endpoint: `https://nominatim.openstreetmap.org/reverse`
  - ⚠️ Requer User-Agent no header (política de uso)

**Alternativas:**
- Google Geocoding API (requer chave, tem limites gratuitos)
- Mapbox Geocoding API (requer chave, tem limites gratuitos)

### 2.2 Funcionalidade 2: Raio Geográfico para Registro

**Status:** ✅ **VIÁVEL**

**Requisitos:**
- ✅ Biblioteca de mapas (precisa adicionar)
- ✅ Cálculo de distância entre coordenadas (fórmula Haversine)
- ✅ Interface para configurar ponto central e raio

**Alterações Necessárias:**
1. **Banco de Dados:** Nova tabela `rh.location_zones`:
   ```sql
   CREATE TABLE rh.location_zones (
     id UUID PRIMARY KEY,
     company_id UUID NOT NULL,
     nome VARCHAR(255) NOT NULL,
     latitude DECIMAL(10, 8) NOT NULL,
     longitude DECIMAL(11, 8) NOT NULL,
     raio_metros INTEGER NOT NULL DEFAULT 100,
     ativo BOOLEAN DEFAULT true,
     created_at TIMESTAMP WITH TIME ZONE,
     updated_at TIMESTAMP WITH TIME ZONE
   );
   ```

2. **Frontend:**
   - Adicionar biblioteca de mapas (Leaflet ou Google Maps)
   - Componente para visualizar e configurar zonas
   - Validação de distância antes de registrar ponto

**Bibliotecas Recomendadas:**
- **Leaflet.js** (gratuita, open-source): ✅ Recomendado
  - Integração com OpenStreetMap (mapas gratuitos)
  - Leve e performática
- **React Leaflet:** Wrapper React para Leaflet

### 2.3 Funcionalidade 3: Captura de Foto

**Status:** ✅ **VIÁVEL**

**Requisitos:**
- ✅ Supabase Storage configurado
- ✅ MediaDevices API disponível
- ✅ Sistema de upload já implementado

**Alterações Necessárias:**
1. **Banco de Dados:** Adicionar campo à tabela `rh.time_records`:
   - `foto_url TEXT` (URL da imagem no bucket)

2. **Storage:** Criar novo bucket `time-record-photos`:
   - Limite de tamanho: 5MB por foto
   - Tipos permitidos: image/jpeg, image/png
   - Estrutura: `time-record-photos/{company_id}/{employee_id}/{timestamp}.jpg`

3. **Frontend:**
   - Componente de captura de foto usando `getUserMedia()`
   - Compressão de imagem antes do upload
   - Preview da foto antes de confirmar

**Implementação:**
- Usar `navigator.mediaDevices.getUserMedia({ video: true })`
- Capturar frame do vídeo como imagem
- Comprimir usando Canvas API
- Upload para Supabase Storage

---

## 📋 3. Plano de Implementação Detalhado

### FASE 1: Preparação do Banco de Dados (2-3 horas)

#### 3.1.1 Migração: Adicionar campos de localização
**Arquivo:** `supabase/migrations/[timestamp]_add_location_fields_to_time_records.sql`

```sql
-- Adicionar campos de localização à tabela time_records
ALTER TABLE rh.time_records
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS endereco TEXT,
ADD COLUMN IF NOT EXISTS localizacao_type VARCHAR(20) DEFAULT 'gps',
ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Adicionar índice para busca por localização (opcional)
CREATE INDEX IF NOT EXISTS idx_time_records_location 
ON rh.time_records USING GIST (point(longitude, latitude));
```

#### 3.1.2 Migração: Criar tabela de zonas de localização
**Arquivo:** `supabase/migrations/[timestamp]_create_location_zones.sql`

```sql
CREATE TABLE IF NOT EXISTS rh.location_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  raio_metros INTEGER NOT NULL DEFAULT 100,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE rh.location_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view location zones of their company"
ON rh.location_zones FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage location zones"
ON rh.location_zones FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_companies uc
    JOIN entity_permissions ep ON ep.profile_id = uc.profile_id
    WHERE uc.user_id = auth.uid()
    AND uc.company_id = rh.location_zones.company_id
    AND ep.entity_name = 'registros_ponto'
    AND ep.can_edit = true
  )
);
```

#### 3.1.3 Migração: Criar bucket para fotos de registro
**Arquivo:** `supabase/migrations/[timestamp]_create_time_record_photos_bucket.sql`

```sql
-- Criar bucket para fotos de registro de ponto
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'time-record-photos',
  'time-record-photos',
  false, -- Não público por padrão (privado)
  5242880, -- 5MB limite
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
) ON CONFLICT (id) DO NOTHING;

-- Política RLS: Grande acesso para upload
CREATE POLICY "Authenticated users can upload time record photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'time-record-photos'
  AND auth.role() = 'authenticated'
);

-- Política RLS: Acesso apenas para própria empresa
CREATE POLICY "Users can view time record photos of their company"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'time-record-photos'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM companies
    WHERE id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  )
);
```

---

### FASE 2: Implementação de Serviços (4-5 horas)

#### 3.2.1 Serviço de Geolocalização
**Arquivo:** `src/services/geolocationService.ts`

```typescript
interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface ReverseGeocodeResult {
  address: string;
  fullAddress?: string;
}

export class GeolocationService {
  // Obter posição GPS atual
  static async getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy || 0
          });
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  // Converter coordenadas em endereço (Reverse Geocoding)
  static async reverseGeocode(
    latitude: number, 
    longitude: number
  ): Promise<ReverseGeocodeResult> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        {
          headers: {
            'User-Agent': 'Multiweave-Core/1.0' // Obrigatório para Nominatim
          }
        }
      );

      if (!response.ok) throw new Error('Erro na API de geocodificação');

      const data = await response.json();
      
      return {
        address: data.display_name || 'Endereço não disponível',
        fullAddress: data.address ? this.formatAddress(data.address) : undefined
      };
    } catch (error) {
      console.error('Erro no reverse geocoding:', error);
      throw error;
    }
  }

  // Calcular distância entre dois pontos (fórmula Haversine)
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

  private static formatAddress(address: any): string {
    const parts = [];
    if (address.road) parts.push(address.road);
    if (address.neighbourhood) parts.push(address.neighbourhood);
    if (address.city || address.town || address.village) {
      parts.push(address.city || address.town || address.village);
    }
    if (address.state) parts.push(address.state);
    if (address.postcode) parts.push(address.postcode);
    
    return parts.join(', ');
  }
}
```

#### 3.2.2 Serviço de Captura de Foto
**Arquivo:** `src/services/cameraService.ts`

```typescript
interface CameraOptions {
  width?: number;
  height?: number;
  quality?: number; // 0.1 a 1.0
}

export class CameraService {
  static async capturePhoto(options: CameraOptions = {}): Promise<File | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // 'user' para front, 'environment' para back
          width: options.width || 1280,
          height: options.height || 720
        }
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      return new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Erro ao acessar canvas'));
            return;
          }

          ctx.drawImage(video, 0, 0);
          
          // Parar stream
          stream.getTracks().forEach(track => track.stop());

          // Converter para blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Erro ao converter imagem'));
                return;
              }

              const file = new File(
                [blob], 
                `photo_${Date.now()}.jpg`, 
                { type: 'image/jpeg' }
              );
              resolve(file);
            },
            'image/jpeg',
            options.quality || 0.8
          );
        };

        video.onerror = (error) => {
          stream.getTracks().forEach(track => track.stop());
          reject(error);
        };
      });
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      throw error;
    }
  }
}
```

#### 3.2.3 Hook para Upload de Foto de Registro
**Arquivo:** `src/hooks/useTimeRecordPhoto.ts`

```typescript
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useTimeRecordPhoto(companyId: string, employeeId: string) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadPhoto = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `${companyId}/${employeeId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('time-record-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('time-record-photos')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: 'Erro ao fazer upload da foto',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadPhoto, uploading };
}
```

---

### FASE 3: Componentes de UI (6-8 horas)

#### 3.3.1 Componente de Captura de Foto
**Arquivo:** `src/components/rh/PhotoCapture.tsx`

```typescript
// Componente para capturar foto via câmera
// - Preview da câmera
// - Botão de captura
// - Preview da foto capturada
// - Botão para refazer
```

#### 3.3.2 Componente de Mapa de Zonas
**Arquivo:** `src/components/rh/LocationZoneMap.tsx`

```typescript
// Componente usando Leaflet para:
// - Visualizar zona de localização no mapa
// - Mostrar raio permitido (círculo)
// - Mostrar posição atual do usuário
// - Indicar se está dentro ou fora da zona
```

#### 3.3.3 Modal de Configuração de Zona
**Arquivo:** `src/components/rh/LocationZoneConfigModal.tsx`

```typescript
// Modal para:
// - Criar/editar zona de localização
// - Definir ponto central (clique no mapa)
// - Definir raio em metros
// - Visualizar área permitida
```

---

### FASE 4: Integração na Página de Registro (4-5 horas)

#### 3.4.1 Modificar `RegistroPontoPage.tsx`

**Alterações principais:**

1. **Ao registrar ponto:**
   ```typescript
   // 1. Obter localização GPS
   const position = await GeolocationService.getCurrentPosition();
   
   // 2. Verificar se está dentro da zona permitida
   const zone = await getLocationZone(companyId);
   const distance = GeolocationService.calculateDistance(
     position.latitude,
     position.longitude,
     zone.latitude,
     zone.longitude
   );
   
   if (distance > zone.raio_metros) {
     toast.error('Você está fora da zona permitida para registro');
     return;
   }
   
   // 3. Converter para endereço
   const address = await GeolocationService.reverseGeocode(
     position.latitude,
     position.longitude
   );
   
   // 4. Capturar foto
   const photoFile = await CameraService.capturePhoto();
   const photoUrl = await uploadPhoto(photoFile);
   
   // 5. Registrar ponto com todos os dados
   await EntityService.create({
     schema: 'rh',
     table: 'time_records',
     data: {
       // ... campos existentes
       latitude: position.latitude,
       longitude: position.longitude,
       endereco: address.address,
       foto_url: photoUrl
     }
   });
   ```

2. **UI:**
   - Mostrar status de localização (dentro/fora da zona)
   - Preview da foto antes de confirmar
   - Indicador visual no mapa

---

### FASE 5: Página de Configuração de Zonas (3-4 horas)

#### 3.5.1 Página de Gerenciamento
**Arquivo:** `src/pages/rh/LocationZonesPage.tsx`

- Lista de zonas cadastradas
- CRUD completo de zonas
- Visualização no mapa
- Teste de zona (marcar ponto no mapa)

---

### FASE 6: Melhorias e Validações (2-3 horas)

- Tratamento de erros
- Validações de permissões
- Fallbacks quando GPS indisponível
- Feedback visual durante captura
- Testes de integração

---

## 📦 4. Dependências a Instalar

```bash
npm install leaflet react-leaflet
npm install --save-dev @types/leaflet
```

**Arquivos de configuração:**
- Adicionar CSS do Leaflet em `index.html` ou `main.tsx`:
```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
```

---

## ⚠️ 5. Considerações Importantes

### 5.1 Permissões do Navegador

- **Geolocalização:** Requer permissão do usuário (HTTPS obrigatório em produção)
- **Câmera:** Requer permissão do usuário
- **Fallback:** Implementar modo "manual" caso permissões sejam negadas

### 5.2 Privacidade e LGPD

- ✅ Dados de localização são sensíveis - considerar anonimização
- ✅ Implementar políticas de retenção de dados
- ✅ Permitir que usuários vejam/editem seus dados de localização

### 5.3 Performance

- ✅ Comprimir imagens antes do upload (reduzir de ~2MB para ~200KB)
- ✅ Cache de endereços (evitar chamadas repetidas à API)
- ✅ Lazy load do mapa (carregar apenas quando necessário)

### 5.4 Offline

- ✅ Armazenar localização e foto localmente quando offline
- ✅ Sincronizar ao voltar online
- ⚠️ Reverse geocoding só funciona online (armazenar apenas coordenadas offline)

### 5.5 Limites da API Nominatim

- ⚠️ **Rate limit:** 1 requisição por segundo (sem chave)
- ⚠️ **User-Agent obrigatório**
- ✅ **Solução:** Implementar cache de endereços e throttle de requisições

---

## 📊 6. Estimativa de Tempo Total

| Fase | Descrição | Tempo Estimado |
|------|-----------|----------------|
| Fase 1 | Banco de Dados | 2-3 horas |
| Fase 2 | Serviços | 4-5 horas |
| Fase 3 | Componentes UI | 6-8 horas |
| Fase 4 | Integração Registro | 4-5 horas |
| Fase 5 | Configuração Zonas | 3-4 horas |
| Fase 6 | Melhorias | 2-3 horas |
| **TOTAL** | | **21-28 horas** |

---

## ✅ 7. Checklist de Implementação

### Banco de Dados
- [ ] Criar migração para campos de localização
- [ ] Criar tabela `location_zones`
- [ ] Criar bucket `time-record-photos`
- [ ] Configurar RLS policies
- [ ] Criar índices para performance

### Backend/Serviços
- [ ] Implementar `GeolocationService`
- [ ] Implementar `CameraService`
- [ ] Criarasmine hook `useTimeRecordPhoto`
- [ ] Criar service para gerenciar zonas

### Frontend/UI
- [ ] Componente `PhotoCapture`
- [ ] Componente `LocationZoneMap` (Leaflet)
- [ ] Modal `LocationZoneConfigModal`
- [ ] Integrar na página de registro
- [ ] Criar página de gerenciamento de zonas

### Testes e Validações
- [ ] Testar captura de foto (mobile/desktop)
- [ ] Testar geolocalização
- [ ] Testar validação de raio
- [ ] Testar funcionamento offline
- [ ] Testar permissões negadas

---

## 🎯 8. Conclusão

✅ **IMPLEMENTAÇÃO TOTALMENTE VIÁVEL**

O sistema já possui:
- ✅ Infraestrutura de storage
- ✅ Sistema de permissões
- ✅ Funcionalidade offline
- ✅ APIs nativas do navegador disponíveis

**Principais desafios:**
1. **Mínimos:** Adição de biblioteca de mapas (Leaflet)
2. **Simples:** Gerenciamento de permissões de GPS/câmera
3. **Importante:** Implementar cache para API de geocoding

**Recomendação:** Implementar em fases, começando pela funcionalidade de localização básica, depois adicionar zonas e por último a captura de foto.

---

## 📚 9. Referências

- [Leaflet.js Documentation](https://leafletjs.com/)
- [React Leaflet](https://react-leaflet.js.org/)
- [Nominatim API](https://nominatim.org/release-docs/develop/api/Reverse/)
- [MediaDevices.getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)

---

**Documento criado em:** 2025-01-27  
**Autor:** Sistema de Avaliação Automática  
**Versão:** 1.0

