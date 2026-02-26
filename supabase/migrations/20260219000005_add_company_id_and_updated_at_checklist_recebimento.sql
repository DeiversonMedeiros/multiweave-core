-- Migration: Adiciona company_id e updated_at em almoxarifado.checklist_recebimento
-- Motivo: O RPC update_entity_data sempre adiciona updated_at ao SET e usa company_id no WHERE
-- quando company_id_param é informado. Sem essas colunas, o update falha com "column does not exist".

-- 1. Adicionar coluna company_id (nullable inicialmente para permitir backfill)
ALTER TABLE almoxarifado.checklist_recebimento
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 2. Preencher company_id a partir da entrada associada
UPDATE almoxarifado.checklist_recebimento c
SET company_id = e.company_id
FROM almoxarifado.entradas_materiais e
WHERE c.entrada_id = e.id
  AND c.company_id IS NULL;

-- 3. Tornar company_id NOT NULL (apenas se não houver linhas com NULL)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM almoxarifado.checklist_recebimento WHERE company_id IS NULL) THEN
    ALTER TABLE almoxarifado.checklist_recebimento
      ALTER COLUMN company_id SET NOT NULL;
  END IF;
END $$;

-- 4. Adicionar coluna updated_at (exigida pelo RPC update_entity_data)
ALTER TABLE almoxarifado.checklist_recebimento
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. Índice para filtros por company_id (isolamento multi-tenant)
CREATE INDEX IF NOT EXISTS idx_checklist_recebimento_company_id
  ON almoxarifado.checklist_recebimento(company_id);

COMMENT ON COLUMN almoxarifado.checklist_recebimento.company_id IS 'ID da empresa para isolamento multi-tenant (RPC update_entity_data)';
COMMENT ON COLUMN almoxarifado.checklist_recebimento.updated_at IS 'Atualizado automaticamente pelo RPC update_entity_data';
