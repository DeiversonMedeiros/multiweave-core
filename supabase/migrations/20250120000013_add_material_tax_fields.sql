-- =====================================================
-- MIGRAÇÃO: Adicionar campos fiscais aos materiais
-- Data: 2025-01-20
-- Descrição: Adiciona campos NCM, CFOP, CST e atualiza tipo para incluir Produto/Serviço/Equipamento
-- =====================================================

-- Adicionar novos campos na tabela materiais_equipamentos
ALTER TABLE almoxarifado.materiais_equipamentos 
ADD COLUMN IF NOT EXISTS ncm VARCHAR(20),
ADD COLUMN IF NOT EXISTS cfop VARCHAR(10),
ADD COLUMN IF NOT EXISTS cst VARCHAR(10);

-- Atualizar constraint do campo tipo para incluir as novas opções
ALTER TABLE almoxarifado.materiais_equipamentos 
DROP CONSTRAINT IF EXISTS materiais_equipamentos_tipo_check;

ALTER TABLE almoxarifado.materiais_equipamentos 
ADD CONSTRAINT materiais_equipamentos_tipo_check 
CHECK (tipo IN ('produto', 'servico', 'equipamento'));

-- Adicionar comentários nos novos campos
COMMENT ON COLUMN almoxarifado.materiais_equipamentos.ncm IS 'Código NCM (Nomenclatura Comum do Mercosul)';
COMMENT ON COLUMN almoxarifado.materiais_equipamentos.cfop IS 'Código Fiscal de Operações e Prestações';
COMMENT ON COLUMN almoxarifado.materiais_equipamentos.cst IS 'Código de Situação Tributária';

-- Criar índices para os novos campos
CREATE INDEX IF NOT EXISTS idx_materiais_equipamentos_ncm ON almoxarifado.materiais_equipamentos(ncm);
CREATE INDEX IF NOT EXISTS idx_materiais_equipamentos_cfop ON almoxarifado.materiais_equipamentos(cfop);
CREATE INDEX IF NOT EXISTS idx_materiais_equipamentos_cst ON almoxarifado.materiais_equipamentos(cst);
