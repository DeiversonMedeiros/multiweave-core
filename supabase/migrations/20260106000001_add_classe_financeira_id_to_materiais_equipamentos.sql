-- =====================================================
-- MIGRAÇÃO: Adicionar campo classe_financeira_id aos materiais
-- Data: 2026-01-06
-- Descrição: Adiciona campo classe_financeira_id na tabela materiais_equipamentos
--            para vincular materiais a classes financeiras
-- =====================================================

-- Adicionar campo classe_financeira_id
ALTER TABLE almoxarifado.materiais_equipamentos 
ADD COLUMN IF NOT EXISTS classe_financeira_id UUID REFERENCES financeiro.classes_financeiras(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_materiais_equipamentos_classe_financeira_id 
ON almoxarifado.materiais_equipamentos(classe_financeira_id);

-- Adicionar comentário no campo
COMMENT ON COLUMN almoxarifado.materiais_equipamentos.classe_financeira_id IS 'Referência à classe financeira gerencial do material';

