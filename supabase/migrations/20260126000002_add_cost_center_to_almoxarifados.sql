-- =====================================================
-- MIGRAÇÃO: Adicionar Centro de Custo aos Almoxarifados
-- Data: 2026-01-26
-- Descrição: Adiciona campo cost_center_id na tabela almoxarifado.almoxarifados
-- =====================================================

-- Adicionar coluna cost_center_id
ALTER TABLE almoxarifado.almoxarifados
  ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_almoxarifados_cost_center_id 
  ON almoxarifado.almoxarifados(cost_center_id);

-- Adicionar comentário
COMMENT ON COLUMN almoxarifado.almoxarifados.cost_center_id IS 'Centro de custo associado ao almoxarifado';
