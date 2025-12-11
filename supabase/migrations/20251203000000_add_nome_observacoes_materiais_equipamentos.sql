-- =====================================================
-- MIGRAÇÃO: Adicionar campos nome e observacoes aos materiais
-- Data: 2025-12-03
-- Descrição: Adiciona campos nome e observacoes na tabela materiais_equipamentos
-- =====================================================

-- Adicionar campo nome (nome do item)
ALTER TABLE almoxarifado.materiais_equipamentos 
ADD COLUMN IF NOT EXISTS nome VARCHAR(255);

-- Adicionar campo observacoes
ALTER TABLE almoxarifado.materiais_equipamentos 
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Adicionar comentários nos novos campos
COMMENT ON COLUMN almoxarifado.materiais_equipamentos.nome IS 'Nome do item/material';
COMMENT ON COLUMN almoxarifado.materiais_equipamentos.observacoes IS 'Observações e informações adicionais sobre o material/equipamento';

-- Criar índice para o campo nome para melhorar buscas
CREATE INDEX IF NOT EXISTS idx_materiais_equipamentos_nome ON almoxarifado.materiais_equipamentos(nome);


