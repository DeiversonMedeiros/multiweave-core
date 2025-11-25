-- =====================================================
-- CRIAÇÃO DA TABELA DE RELACIONAMENTO EMPLOYEE-LOCATION_ZONES
-- =====================================================
-- Data: 2025-11-08
-- Descrição: Tabela de relacionamento many-to-many entre funcionários e zonas de localização
--            Permite que um funcionário tenha múltiplas zonas de localização para registro de ponto

-- Criar tabela de relacionamento
CREATE TABLE IF NOT EXISTS rh.employee_location_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
  location_zone_id UUID NOT NULL REFERENCES rh.location_zones(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir que não haja duplicatas
  UNIQUE(employee_id, location_zone_id)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_employee_location_zones_employee_id ON rh.employee_location_zones(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_location_zones_location_zone_id ON rh.employee_location_zones(location_zone_id);

-- Adicionar comentários para documentação
COMMENT ON TABLE rh.employee_location_zones IS 'Relacionamento many-to-many entre funcionários e zonas de localização para registro de ponto';
COMMENT ON COLUMN rh.employee_location_zones.employee_id IS 'ID do funcionário';
COMMENT ON COLUMN rh.employee_location_zones.location_zone_id IS 'ID da zona de localização permitida';

-- Habilitar RLS
ALTER TABLE rh.employee_location_zones ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: usuários podem ver relacionamentos de funcionários da sua empresa
CREATE POLICY "Users can view employee location zones from their company"
ON rh.employee_location_zones FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM rh.employees e
    INNER JOIN user_companies uc ON e.company_id = uc.company_id
    WHERE e.id = rh.employee_location_zones.employee_id
    AND uc.user_id = auth.uid()
  )
);

-- Política para INSERT: usuários podem criar relacionamentos para funcionários da sua empresa
CREATE POLICY "Users can insert employee location zones for their company"
ON rh.employee_location_zones FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rh.employees e
    INNER JOIN user_companies uc ON e.company_id = uc.company_id
    WHERE e.id = rh.employee_location_zones.employee_id
    AND uc.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM rh.location_zones lz
    INNER JOIN user_companies uc ON lz.company_id = uc.company_id
    WHERE lz.id = rh.employee_location_zones.location_zone_id
    AND uc.user_id = auth.uid()
  )
);

-- Política para UPDATE: usuários podem atualizar relacionamentos de funcionários da sua empresa
CREATE POLICY "Users can update employee location zones for their company"
ON rh.employee_location_zones FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM rh.employees e
    INNER JOIN user_companies uc ON e.company_id = uc.company_id
    WHERE e.id = rh.employee_location_zones.employee_id
    AND uc.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rh.employees e
    INNER JOIN user_companies uc ON e.company_id = uc.company_id
    WHERE e.id = rh.employee_location_zones.employee_id
    AND uc.user_id = auth.uid()
  )
);

-- Política para DELETE: usuários podem deletar relacionamentos de funcionários da sua empresa
CREATE POLICY "Users can delete employee location zones from their company"
ON rh.employee_location_zones FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM rh.employees e
    INNER JOIN user_companies uc ON e.company_id = uc.company_id
    WHERE e.id = rh.employee_location_zones.employee_id
    AND uc.user_id = auth.uid()
  )
);

