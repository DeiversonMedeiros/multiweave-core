-- =====================================================
-- CRIAÇÃO DA TABELA DE ZONAS DE LOCALIZAÇÃO
-- =====================================================
-- Data: 2025-01-27
-- Descrição: Tabela para definir zonas geográficas onde é permitido registrar ponto.
--            Permite criar áreas delimitadas por coordenadas e raio para controle de presença.

-- Criar tabela de zonas de localização
CREATE TABLE IF NOT EXISTS rh.location_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  raio_metros INTEGER NOT NULL DEFAULT 100 CHECK (raio_metros > 0),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Validações
  CONSTRAINT valid_latitude CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT valid_longitude CHECK (longitude >= -180 AND longitude <= 180)
);

COMMENT ON TABLE rh.location_zones IS 'Zonas geográficas onde é permitido registrar ponto';
COMMENT ON COLUMN rh.location_zones.nome IS 'Nome da zona de localização (ex: "Escritório Central", "Obra A")';
COMMENT ON COLUMN rh.location_zones.descricao IS 'Descrição detalhada da zona';
COMMENT ON COLUMN rh.location_zones.latitude IS 'Latitude do ponto central da zona';
COMMENT ON COLUMN rh.location_zones.longitude IS 'Longitude do ponto central da zona';
COMMENT ON COLUMN rh.location_zones.raio_metros IS 'Raio permitido em metros a partir do ponto central';

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_location_zones_company_id ON rh.location_zones(company_id);
CREATE INDEX IF NOT EXISTS idx_location_zones_ativo ON rh.location_zones(ativo) WHERE ativo = true;

-- Criar índice espacial se PostGIS estiver disponível
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        CREATE INDEX IF NOT EXISTS idx_location_zones_spatial 
        ON rh.location_zones USING GIST (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326));
        
        COMMENT ON INDEX idx_location_zones_spatial IS 'Índice espacial para busca por localização usando PostGIS';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'PostGIS não disponível, pulando criação de índice espacial';
END $$;

-- Habilitar RLS (Row Level Security)
ALTER TABLE rh.location_zones ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem visualizar zonas de localização da sua empresa
CREATE POLICY "Users can view location zones of their company"
ON rh.location_zones FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM user_companies WHERE user_id = auth.uid()
  )
);

-- Política: Usuários com permissão de editar registros_ponto podem gerenciar zonas
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
)
WITH CHECK (
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

-- Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION rh.update_location_zones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_location_zones_updated_at
BEFORE UPDATE ON rh.location_zones
FOR EACH ROW
EXECUTE FUNCTION rh.update_location_zones_updated_at();

COMMENT ON POLICY "Users can view location zones of their company" ON rh.location_zones IS 'Permite que usuários vejam zonas de localização da sua empresa';
COMMENT ON POLICY "Admins can manage location zones" ON rh.location_zones IS 'Permite que administradores gerenciem zonas de localização se tiverem permissão de editar registros_ponto';

