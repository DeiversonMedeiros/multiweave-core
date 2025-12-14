-- =====================================================
-- MIGRAÇÃO: ADICIONAR CLASSE FINANCEIRA A BENEFÍCIOS
-- =====================================================
-- Data: 2025-12-12
-- Descrição: Adiciona campo classe_financeira_id na tabela benefit_configurations
--            para vincular benefícios a classes financeiras gerenciais
-- Autor: Sistema MultiWeave Core

-- Adicionar coluna classe_financeira_id
ALTER TABLE rh.benefit_configurations
ADD COLUMN IF NOT EXISTS classe_financeira_id UUID REFERENCES financeiro.classes_financeiras(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_benefit_configurations_classe_financeira_id 
ON rh.benefit_configurations(classe_financeira_id);

-- Comentário na coluna
COMMENT ON COLUMN rh.benefit_configurations.classe_financeira_id IS 'Referência à classe financeira gerencial associada ao benefício';
