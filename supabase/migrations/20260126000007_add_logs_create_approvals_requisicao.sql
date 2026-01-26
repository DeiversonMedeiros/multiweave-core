-- =====================================================
-- MIGRAÇÃO: Adicionar logs na função create_approvals_on_insert para requisições
-- Data....: 2026-01-26
-- Descrição:
--   - Adiciona logs detalhados na função create_approvals_on_insert
--   - Facilita diagnóstico de problemas na criação de aprovações
--   - Especialmente útil para requisições com destino_almoxarifado_id
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_approvals_on_insert()
RETURNS TRIGGER0
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    processo_tipo VARCHAR(50);
    company_id UUID;
BEGIN
    RAISE NOTICE '[create_approvals_on_insert] INÍCIO - TG_TABLE_NAME=%, NEW.id=%', TG_TABLE_NAME, NEW.id;

    -- Determinar o tipo de processo baseado na tabela
    IF TG_TABLE_NAME = 'contas_pagar' THEN
        processo_tipo := 'conta_pagar';
        company_id := NEW.company_id;
    ELSIF TG_TABLE_NAME = 'requisicoes_compra' THEN
        processo_tipo := 'requisicao_compra';
        company_id := NEW.company_id;
        
        RAISE NOTICE '[create_approvals_on_insert] Requisição detectada: id=%, company_id=%, status=%, workflow_state=%, destino_almoxarifado_id=%', 
            NEW.id, NEW.company_id, NEW.status, NEW.workflow_state, NEW.destino_almoxarifado_id;
    ELSIF TG_TABLE_NAME = 'cotacoes' THEN
        processo_tipo := 'cotacao_compra';
        -- Buscar company_id da requisição relacionada
        SELECT r.company_id INTO company_id
        FROM compras.requisicoes_compra r
        WHERE r.id = NEW.requisicao_id;
    ELSIF TG_TABLE_NAME = 'solicitacoes_saida_materiais' THEN
        processo_tipo := 'solicitacao_saida_material';
        company_id := NEW.company_id;
    ELSIF TG_TABLE_NAME = 'transferencias' THEN
        processo_tipo := 'solicitacao_transferencia_material';
        company_id := NEW.company_id;
    ELSE
        RAISE NOTICE '[create_approvals_on_insert] Tabela não suportada: %', TG_TABLE_NAME;
        RETURN NEW;
    END IF;

    -- Criar aprovações automáticas apenas se company_id foi encontrado
    IF company_id IS NOT NULL THEN
        RAISE NOTICE '[create_approvals_on_insert] Chamando create_approvals_for_process: processo_tipo=%, processo_id=%, company_id=%', 
            processo_tipo, NEW.id, company_id;
        
        PERFORM public.create_approvals_for_process(processo_tipo, NEW.id, company_id);
        
        RAISE NOTICE '[create_approvals_on_insert] create_approvals_for_process concluído';
    ELSE
        RAISE WARNING '[create_approvals_on_insert] ⚠️ company_id é NULL para processo_tipo=%, processo_id=%. Aprovações não serão criadas.', 
            processo_tipo, NEW.id;
    END IF;

    RAISE NOTICE '[create_approvals_on_insert] FIM - TG_TABLE_NAME=%, NEW.id=%', TG_TABLE_NAME, NEW.id;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_approvals_on_insert() IS 
'Cria aprovações automáticas em novas solicitações. Adiciona logs detalhados para facilitar diagnóstico. 
Atualizado em 2026-01-26 para incluir logs sobre criação de aprovações para requisições com destino_almoxarifado_id.';
