-- =====================================================
-- ADICIONAR CAMPO "ENTRA NO CÁLCULO DA FOLHA" EM BENEFÍCIOS
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Adiciona campo para controlar se benefício entra no cálculo da folha de pagamento

-- Adicionar coluna na tabela de configurações de benefícios
ALTER TABLE rh.benefit_configurations 
ADD COLUMN IF NOT EXISTS entra_no_calculo_folha BOOLEAN DEFAULT true;

-- Comentário da coluna
COMMENT ON COLUMN rh.benefit_configurations.entra_no_calculo_folha IS 'Se o benefício deve ser incluído no cálculo da folha de pagamento';

-- Atualizar registros existentes para manter compatibilidade (todos os benefícios existentes entram no cálculo)
UPDATE rh.benefit_configurations 
SET entra_no_calculo_folha = true 
WHERE entra_no_calculo_folha IS NULL;

-- Criar índice para performance em consultas de folha de pagamento
CREATE INDEX IF NOT EXISTS idx_benefit_configurations_entra_no_calculo_folha ON rh.benefit_configurations(entra_no_calculo_folha);

-- Adicionar constraint para garantir que o campo não seja nulo
ALTER TABLE rh.benefit_configurations 
ALTER COLUMN entra_no_calculo_folha SET NOT NULL;
