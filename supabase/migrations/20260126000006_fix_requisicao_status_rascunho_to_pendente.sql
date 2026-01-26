-- =====================================================
-- MIGRAÇÃO: Corrigir status de requisições em rascunho com workflow pendente_aprovacao
-- Data....: 2026-01-26
-- Descrição:
--   - Corrige requisições que estão com status 'rascunho' mas workflow_state 'pendente_aprovacao'
--   - Atualiza o status para 'pendente_aprovacao' para que apareçam nas aprovações
--   - Garante que o trigger funcione corretamente após a correção
-- =====================================================

-- 1. ATUALIZAR REQUISIÇÕES COM STATUS INCORRETO
-- =====================================================
-- Atualizar requisições que estão em 'rascunho' mas deveriam estar em 'pendente_aprovacao'
-- porque têm workflow_state = 'pendente_aprovacao' e aprovações pendentes

UPDATE compras.requisicoes_compra
SET status = 'pendente_aprovacao'::compras.status_requisicao
WHERE status = 'rascunho'::compras.status_requisicao
AND workflow_state = 'pendente_aprovacao'
AND id IN (
    SELECT DISTINCT processo_id 
    FROM public.aprovacoes_unificada 
    WHERE processo_tipo = 'requisicao_compra'
    AND status = 'pendente'
);

-- 2. GARANTIR QUE O TRIGGER FUNCIONE CORRETAMENTE
-- =====================================================
-- O trigger trigger_ensure_requisicao_status já existe e deveria garantir isso,
-- mas vamos reforçar a lógica para garantir que funcione mesmo quando destino_almoxarifado_id é preenchido

CREATE OR REPLACE FUNCTION compras.ensure_requisicao_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Se status é 'rascunho' mas workflow_state é 'pendente_aprovacao',
    -- mudar status para 'pendente_aprovacao'
    -- Isso deve funcionar independentemente de outros campos como destino_almoxarifado_id
    IF NEW.status = 'rascunho'::compras.status_requisicao 
       AND NEW.workflow_state = 'pendente_aprovacao' THEN
        NEW.status := 'pendente_aprovacao'::compras.status_requisicao;
        
        RAISE NOTICE '[ensure_requisicao_status] Status atualizado de rascunho para pendente_aprovacao para requisição %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION compras.ensure_requisicao_status IS 
'Garante que requisições com workflow_state pendente_aprovacao tenham status pendente_aprovacao, 
independentemente de outros campos como destino_almoxarifado_id. Atualizado em 2026-01-26.';

-- 3. VERIFICAR SE O TRIGGER ESTÁ ATIVO
-- =====================================================
-- Garantir que o trigger está ativo tanto para INSERT quanto para UPDATE

DROP TRIGGER IF EXISTS trigger_ensure_requisicao_status ON compras.requisicoes_compra;

CREATE TRIGGER trigger_ensure_requisicao_status
    BEFORE INSERT OR UPDATE ON compras.requisicoes_compra
    FOR EACH ROW
    EXECUTE FUNCTION compras.ensure_requisicao_status();

COMMENT ON TRIGGER trigger_ensure_requisicao_status ON compras.requisicoes_compra IS 
'Garante que requisições com workflow_state pendente_aprovacao sempre tenham status pendente_aprovacao. 
Atualizado em 2026-01-26 para funcionar corretamente mesmo com destino_almoxarifado_id preenchido.';
