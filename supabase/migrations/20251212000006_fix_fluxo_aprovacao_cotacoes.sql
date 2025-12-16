-- =====================================================
-- MIGRAÇÃO: Corrigir Fluxo de Aprovação de Cotações
-- Data....: 2025-12-12
-- Descrição:
--   - Cria trigger para criar aprovações quando cotacao_ciclos é criado
--   - Atualiza função process_approval para lidar com cotacao_ciclos
--   - Garante que cotações entrem no fluxo de aprovação após serem geradas
-- =====================================================

-- =====================================================
-- 1. FUNÇÃO PARA CRIAR APROVAÇÕES EM COTAÇÃO_CICLOS
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_approvals_cotacao_ciclos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Criar aprovações automáticas para cotacao_ciclos
    -- Usar processo_tipo = 'cotacao_compra' e processo_id = cotacao_ciclos.id
    PERFORM public.create_approvals_for_process('cotacao_compra', NEW.id, NEW.company_id);
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_approvals_cotacao_ciclos() IS 
'Cria aprovações automáticas quando um ciclo de cotação é criado';

-- =====================================================
-- 2. TRIGGER PARA CRIAR APROVAÇÕES EM COTAÇÃO_CICLOS
-- =====================================================
DROP TRIGGER IF EXISTS trigger_create_approvals_cotacao_ciclos ON compras.cotacao_ciclos;

CREATE TRIGGER trigger_create_approvals_cotacao_ciclos
    AFTER INSERT ON compras.cotacao_ciclos
    FOR EACH ROW
    WHEN (NEW.workflow_state = 'em_aprovacao' OR NEW.status = 'em_aprovacao')
    EXECUTE FUNCTION public.create_approvals_cotacao_ciclos();

COMMENT ON TRIGGER trigger_create_approvals_cotacao_ciclos ON compras.cotacao_ciclos IS 
'Cria aprovações automáticas quando um ciclo de cotação é criado com status em_aprovacao';

-- =====================================================
-- 3. NOTA SOBRE process_approval
-- =====================================================
-- A função process_approval precisa ser atualizada para usar cotacao_ciclos
-- ao invés de cotacoes. Isso será feito em uma migração separada que atualiza
-- a função completa, pois ela é complexa e tem múltiplas versões.
-- 
-- Por enquanto, o trigger criado acima já garante que aprovações sejam criadas
-- quando cotacao_ciclos é criado com workflow_state = 'em_aprovacao'.
--
-- A atualização da função process_approval será feita na próxima migração
-- para evitar conflitos com versões existentes.
