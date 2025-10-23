-- =====================================================
-- ADICIONAR CAMPOS DE CONVÊNIOS MÉDICOS NA FOLHA DE PAGAMENTO
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Adiciona campos específicos para convênios médicos na tabela de folha de pagamento

-- Adicionar campos para convênios médicos na tabela de folha
ALTER TABLE rh.payroll 
ADD COLUMN IF NOT EXISTS total_beneficios_convenios_medicos DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_descontos_convenios_medicos DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_beneficios_tradicionais DECIMAL(10,2) DEFAULT 0;

-- Renomear campo existente para maior clareza
ALTER TABLE rh.payroll 
RENAME COLUMN total_beneficios TO total_beneficios_geral;

-- Comentários das colunas
COMMENT ON COLUMN rh.payroll.total_beneficios_convenios_medicos IS 'Total de benefícios de convênios médicos (proventos)';
COMMENT ON COLUMN rh.payroll.total_descontos_convenios_medicos IS 'Total de descontos de convênios médicos';
COMMENT ON COLUMN rh.payroll.total_beneficios_tradicionais IS 'Total de benefícios tradicionais (VR, VA, etc.)';
COMMENT ON COLUMN rh.payroll.total_beneficios_geral IS 'Total geral de todos os benefícios';

-- Atualizar registros existentes para manter compatibilidade
UPDATE rh.payroll 
SET total_beneficios_tradicionais = COALESCE(total_beneficios_geral, 0),
    total_beneficios_convenios_medicos = 0,
    total_descontos_convenios_medicos = 0
WHERE total_beneficios_tradicionais IS NULL;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_payroll_beneficios_convenios_medicos ON rh.payroll(total_beneficios_convenios_medicos);
CREATE INDEX IF NOT EXISTS idx_payroll_descontos_convenios_medicos ON rh.payroll(total_descontos_convenios_medicos);
CREATE INDEX IF NOT EXISTS idx_payroll_beneficios_tradicionais ON rh.payroll(total_beneficios_tradicionais);
