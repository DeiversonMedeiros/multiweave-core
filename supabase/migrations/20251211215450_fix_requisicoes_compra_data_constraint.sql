-- =====================================================
-- MIGRAÇÃO: Corrigir constraint de data_necessidade
-- Data....: 2025-12-11
-- Descrição:
--   - Ajusta a constraint requisicoes_compra_check para permitir
--     datas no passado quando o status for 'rascunho'
--   - Permite NULL em data_necessidade para rascunhos
-- =====================================================

-- Remover a constraint antiga
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'requisicoes_compra_check'
          AND table_schema = 'compras'
          AND table_name = 'requisicoes_compra'
    ) THEN
        ALTER TABLE compras.requisicoes_compra
            DROP CONSTRAINT requisicoes_compra_check;
    END IF;
END$$;

-- Adicionar a nova constraint que permite datas no passado para rascunhos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'requisicoes_compra_check'
          AND table_schema = 'compras'
          AND table_name = 'requisicoes_compra'
    ) THEN
        ALTER TABLE compras.requisicoes_compra
            ADD CONSTRAINT requisicoes_compra_check
            CHECK (
                data_necessidade IS NULL 
                OR status = 'rascunho'::compras.status_requisicao
                OR data_necessidade >= data_solicitacao
            );
    END IF;
END$$;

COMMENT ON CONSTRAINT requisicoes_compra_check ON compras.requisicoes_compra IS 
'Permite data_necessidade NULL ou no passado para rascunhos. Para outros status, exige data_necessidade >= data_solicitacao';

