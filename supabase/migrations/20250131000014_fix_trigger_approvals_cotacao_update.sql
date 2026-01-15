-- =====================================================
-- CORREÇÃO: Trigger para criar aprovações em UPDATE também
-- Data: 2025-01-31
-- Descrição:
--   - O trigger atual só dispara em INSERT quando workflow_state = 'em_aprovacao'
--   - Mas o ciclo é criado como 'aberta'/'rascunho' e depois atualizado para 'em_aprovacao'
--   - Precisamos que o trigger também dispare em UPDATE quando workflow_state muda para 'em_aprovacao'
--   - E garantir que aprovações só sejam criadas se ainda não existirem
-- =====================================================

-- =====================================================
-- 1. ATUALIZAR FUNÇÃO DO TRIGGER PARA VERIFICAR SE JÁ EXISTEM APROVAÇÕES
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_approvals_cotacao_ciclos()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_aprovacoes_existentes INTEGER;
BEGIN
    -- Verificar se já existem aprovações para este ciclo
    -- Isso evita criar aprovações duplicadas
    SELECT COUNT(*) INTO v_aprovacoes_existentes
    FROM public.aprovacoes_unificada
    WHERE processo_tipo = 'cotacao_compra'
      AND processo_id = NEW.id
      AND company_id = NEW.company_id;
    
    -- Se já existem aprovações, não criar novamente
    IF v_aprovacoes_existentes > 0 THEN
        RAISE NOTICE '[create_approvals_cotacao_ciclos] Aprovações já existem para ciclo %. Total: %', NEW.id, v_aprovacoes_existentes;
        RETURN NEW;
    END IF;
    
    -- Verificar se workflow_state ou status é 'em_aprovacao'
    -- Só criar aprovações se estiver em aprovação
    IF (NEW.workflow_state = 'em_aprovacao' OR NEW.status = 'em_aprovacao') THEN
        RAISE NOTICE '[create_approvals_cotacao_ciclos] Criando aprovações para ciclo % (processo_tipo: cotacao_compra, processo_id: %, company_id: %)', 
            NEW.id, NEW.id, NEW.company_id;
        
        BEGIN
            -- Criar aprovações automáticas para cotacao_ciclos
            -- Usar processo_tipo = 'cotacao_compra' e processo_id = cotacao_ciclos.id
            -- A função create_approvals_for_process verifica internamente se há configuração
            PERFORM public.create_approvals_for_process('cotacao_compra', NEW.id, NEW.company_id);
            
            RAISE NOTICE '[create_approvals_cotacao_ciclos] ✅ Aprovações criadas com sucesso para ciclo %', NEW.id;
        EXCEPTION
            WHEN OTHERS THEN
                -- Logar erro mas não falhar - pode não haver configuração de aprovação
                RAISE WARNING '[create_approvals_cotacao_ciclos] ⚠️ Erro ao criar aprovações para ciclo %: % (SQLSTATE: %)', 
                    NEW.id, SQLERRM, SQLSTATE;
        END;
    ELSE
        RAISE NOTICE '[create_approvals_cotacao_ciclos] Ciclo % não está em aprovação (workflow_state: %, status: %). Não criando aprovações.', 
            NEW.id, NEW.workflow_state, NEW.status;
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_approvals_cotacao_ciclos() IS 
'Cria aprovações automáticas quando um ciclo de cotação é criado ou atualizado com workflow_state = em_aprovacao. Verifica se já existem aprovações para evitar duplicatas.';

-- =====================================================
-- 2. RECRIAR TRIGGER PARA DISPARAR EM INSERT E UPDATE
-- =====================================================
DROP TRIGGER IF EXISTS trigger_create_approvals_cotacao_ciclos ON compras.cotacao_ciclos;

-- Trigger para INSERT (quando ciclo é criado com em_aprovacao)
CREATE TRIGGER trigger_create_approvals_cotacao_ciclos_insert
    AFTER INSERT ON compras.cotacao_ciclos
    FOR EACH ROW
    WHEN (NEW.workflow_state = 'em_aprovacao' OR NEW.status = 'em_aprovacao')
    EXECUTE FUNCTION public.create_approvals_cotacao_ciclos();

COMMENT ON TRIGGER trigger_create_approvals_cotacao_ciclos_insert ON compras.cotacao_ciclos IS 
'Cria aprovações automáticas quando um ciclo de cotação é criado com status em_aprovacao';

-- Trigger para UPDATE (quando ciclo é atualizado para em_aprovacao)
CREATE TRIGGER trigger_create_approvals_cotacao_ciclos_update
    AFTER UPDATE ON compras.cotacao_ciclos
    FOR EACH ROW
    WHEN (
        -- Disparar apenas quando workflow_state ou status mudar PARA 'em_aprovacao'
        (NEW.workflow_state = 'em_aprovacao' OR NEW.status = 'em_aprovacao')
        AND (OLD.workflow_state IS DISTINCT FROM NEW.workflow_state OR OLD.status IS DISTINCT FROM NEW.status)
        -- Não disparar se já estava em em_aprovacao
        AND (OLD.workflow_state != 'em_aprovacao' AND OLD.status != 'em_aprovacao')
    )
    EXECUTE FUNCTION public.create_approvals_cotacao_ciclos();

COMMENT ON TRIGGER trigger_create_approvals_cotacao_ciclos_update ON compras.cotacao_ciclos IS 
'Cria aprovações automáticas quando um ciclo de cotação é atualizado para status em_aprovacao (se ainda não tiver aprovações)';
