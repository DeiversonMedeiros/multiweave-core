-- =====================================================
-- ADICIONA CAMPO TIPO_CONTRATO NA TABELA FGTS_CONFIG
-- Permite configurações específicas de FGTS por tipo de contrato
-- =====================================================

-- Adicionar coluna tipo_contrato (opcional, NULL = configuração geral)
ALTER TABLE rh.fgts_config
ADD COLUMN IF NOT EXISTS tipo_contrato VARCHAR(50);

-- Atualizar constraint unique para incluir tipo_contrato
-- Se tipo_contrato for NULL, é configuração geral
-- Se tipo_contrato tiver valor, é configuração específica
ALTER TABLE rh.fgts_config
DROP CONSTRAINT IF EXISTS unique_fgts_config_company_ano_mes_codigo;

-- Nova constraint: permite uma configuração geral (tipo_contrato NULL) 
-- e múltiplas configurações específicas por tipo de contrato
-- Usar índice único parcial para permitir NULL como valor único
CREATE UNIQUE INDEX IF NOT EXISTS unique_fgts_config_company_ano_mes_codigo_tipo 
ON rh.fgts_config(company_id, ano_vigencia, mes_vigencia, codigo, tipo_contrato);

-- Criar índice para busca por tipo_contrato
CREATE INDEX IF NOT EXISTS idx_fgts_config_tipo_contrato 
ON rh.fgts_config(company_id, ano_vigencia, mes_vigencia, tipo_contrato) 
WHERE tipo_contrato IS NOT NULL;

-- Comentário
COMMENT ON COLUMN rh.fgts_config.tipo_contrato IS 'Tipo de contrato específico (CLT, Menor Aprendiz, etc.). NULL = configuração geral aplicável a todos os tipos';

