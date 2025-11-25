-- =====================================================
-- ADICIONAR CAMPOS DE LOCALIZAÇÃO E FOTO À TABELA TIME_RECORDS
-- =====================================================
-- Data: 2025-01-27
-- Descrição: Adiciona campos para armazenar localização GPS (latitude, longitude, endereço) 
--            e URL da foto capturada durante o registro de ponto

-- Adicionar campos de localização à tabela time_records
ALTER TABLE rh.time_records
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS endereco TEXT,
ADD COLUMN IF NOT EXISTS localizacao_type VARCHAR(20) DEFAULT 'gps' CHECK (localizacao_type IN ('gps', 'manual', 'wifi')),
ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Adicionar comentários aos novos campos
COMMENT ON COLUMN rh.time_records.latitude IS 'Latitude da localização GPS onde o ponto foi registrado';
COMMENT ON COLUMN rh.time_records.longitude IS 'Longitude da localização GPS onde o ponto foi registrado';
COMMENT ON COLUMN rh.time_records.endereco IS 'Endereço completo obtido via reverse geocoding';
COMMENT ON COLUMN rh.time_records.localizacao_type IS 'Tipo de localização: gps (GPS), manual (manual), wifi (WiFi)';
COMMENT ON COLUMN rh.time_records.foto_url IS 'URL da foto capturada durante o registro de ponto no Supabase Storage';

-- Criar índice GiST para busca espacial (requer extensão postgis)
-- Nota: Se postgis não estiver instalado, este índice não será criado
-- Pode ser criado manualmente após instalação da extensão postgis
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        CREATE INDEX IF NOT EXISTS idx_time_records_location_spatial 
        ON rh.time_records USING GIST (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326));
        
        COMMENT ON INDEX idx_time_records_location_spatial IS 'Índice espacial para busca por localização usando PostGIS';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Se postgis não estiver disponível, cria índice simples em coordenadas
        RAISE NOTICE 'PostGIS não disponível, pulando criação de índice espacial';
END $$;

-- Criar índice B-tree para busca por coordenadas (funciona sem postgis)
CREATE INDEX IF NOT EXISTS idx_time_records_latitude ON rh.time_records(latitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_time_records_longitude ON rh.time_records(longitude) WHERE longitude IS NOT NULL;

-- Criar índice para busca por tipo de localização
CREATE INDEX IF NOT EXISTS idx_time_records_localizacao_type ON rh.time_records(localizacao_type) WHERE localizacao_type IS NOT NULL;

COMMENT ON INDEX idx_time_records_latitude IS 'Índice para busca por latitude';
COMMENT ON INDEX idx_time_records_longitude IS 'Índice para busca por longitude';

