-- MIGRAÇÃO: Adicionar coluna updated_by nas tabelas de Compras
-- Data: 2025-12-11
-- Motivo: Triggers de histórico/reset de aprovações usam NEW.updated_by
--         e falhavam com "record \"new\" has no field \"updated_by\""
-- =====================================================

-- Requisições de compra
ALTER TABLE compras.requisicoes_compra
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id);

-- Cotações de compra
ALTER TABLE compras.cotacoes
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id);

COMMENT ON COLUMN compras.requisicoes_compra.updated_by IS 'Último usuário que editou a requisição';
COMMENT ON COLUMN compras.cotacoes.updated_by IS 'Último usuário que editou a cotação';

