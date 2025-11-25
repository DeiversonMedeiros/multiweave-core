-- =====================================================
-- ADICIONAR CAMPOS DE LOCALIZAÇÃO NA TABELA HOLIDAYS
-- Data: 2025-11-11
-- Descrição: Adiciona campos UF e município para diferenciar
--            feriados estaduais e municipais quando empresa atua
--            em múltiplos estados/municípios
-- =====================================================

-- Adicionar campos de localização
ALTER TABLE rh.holidays 
ADD COLUMN IF NOT EXISTS uf VARCHAR(2),
ADD COLUMN IF NOT EXISTS municipio VARCHAR(100);

-- Adicionar comentários
COMMENT ON COLUMN rh.holidays.uf IS 'UF (sigla do estado) - obrigatório para feriados estaduais e municipais';
COMMENT ON COLUMN rh.holidays.municipio IS 'Nome do município - obrigatório para feriados municipais';

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_holidays_uf ON rh.holidays(uf) WHERE uf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_holidays_municipio ON rh.holidays(municipio) WHERE municipio IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_holidays_tipo_uf ON rh.holidays(tipo, uf) WHERE uf IS NOT NULL;

-- Adicionar constraint para validação
-- Feriados estaduais devem ter UF
ALTER TABLE rh.holidays
ADD CONSTRAINT holidays_estadual_uf_check 
CHECK (
  (tipo != 'estadual') OR (tipo = 'estadual' AND uf IS NOT NULL AND LENGTH(TRIM(uf)) = 2)
);

-- Feriados municipais devem ter UF e município
ALTER TABLE rh.holidays
ADD CONSTRAINT holidays_municipal_location_check 
CHECK (
  (tipo != 'municipal') OR (tipo = 'municipal' AND uf IS NOT NULL AND LENGTH(TRIM(uf)) = 2 AND municipio IS NOT NULL AND LENGTH(TRIM(municipio)) > 0)
);

-- Feriados nacionais não devem ter UF ou município
ALTER TABLE rh.holidays
ADD CONSTRAINT holidays_nacional_location_check 
CHECK (
  (tipo != 'nacional') OR (tipo = 'nacional' AND uf IS NULL AND municipio IS NULL)
);

-- Atualizar constraint UNIQUE para incluir localização quando aplicável
-- Remover constraint antiga se existir
ALTER TABLE rh.holidays DROP CONSTRAINT IF EXISTS holidays_company_id_data_nome_key;

-- Criar nova constraint que considera localização
-- Para feriados nacionais: company_id + data + nome
-- Para feriados estaduais: company_id + data + nome + uf
-- Para feriados municipais: company_id + data + nome + uf + municipio
CREATE UNIQUE INDEX holidays_unique_nacional 
ON rh.holidays(company_id, data, nome) 
WHERE tipo = 'nacional' AND (uf IS NULL AND municipio IS NULL);

CREATE UNIQUE INDEX holidays_unique_estadual 
ON rh.holidays(company_id, data, nome, uf) 
WHERE tipo = 'estadual' AND uf IS NOT NULL;

CREATE UNIQUE INDEX holidays_unique_municipal 
ON rh.holidays(company_id, data, nome, uf, municipio) 
WHERE tipo = 'municipal' AND uf IS NOT NULL AND municipio IS NOT NULL;

CREATE UNIQUE INDEX holidays_unique_outros 
ON rh.holidays(company_id, data, nome) 
WHERE tipo IN ('pontos_facultativos', 'outros');

