-- =====================================================
-- CORREÇÃO: Ajustar constraint para permitir NULL em data_necessidade em qualquer status
-- Data: 2025-12-12
-- Descrição:
--   - FORÇA a remoção e recriação da constraint requisicoes_compra_check
--   - Permite NULL em data_necessidade em qualquer status
--   - Quando data_necessidade não é NULL, valida se é >= data_solicitacao (exceto rascunhos)
-- =====================================================

-- FORÇAR remoção da constraint antiga (mesmo que não exista)
ALTER TABLE compras.requisicoes_compra
    DROP CONSTRAINT IF EXISTS requisicoes_compra_check;

-- Adicionar a nova constraint que permite NULL em qualquer status
ALTER TABLE compras.requisicoes_compra
    ADD CONSTRAINT requisicoes_compra_check
    CHECK (
        -- Permite NULL em qualquer status (sempre válido - esta é a primeira condição para garantir que NULL sempre passe)
        data_necessidade IS NULL
        -- OU se for rascunho, permite qualquer data (incluindo no passado)
        OR status = 'rascunho'::compras.status_requisicao
        -- OU se não for NULL e não for rascunho, exige data_necessidade >= data_solicitacao
        OR data_necessidade >= data_solicitacao
    );

COMMENT ON CONSTRAINT requisicoes_compra_check ON compras.requisicoes_compra IS 
'Permite data_necessidade NULL em qualquer status. Para rascunhos, permite qualquer data. Para outros status, quando não NULL, exige data_necessidade >= data_solicitacao';
