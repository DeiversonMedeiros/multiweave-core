-- =====================================================
-- TRIGGERS PARA RESET AUTOMÁTICO DE APROVAÇÕES
-- =====================================================

-- 1. FUNÇÃO GENÉRICA PARA REGISTRAR EDIÇÕES E RESETAR APROVAÇÕES
-- =====================================================
CREATE OR REPLACE FUNCTION public.record_edit_and_reset_approvals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    processo_tipo VARCHAR(50);
    processo_id UUID;
    company_id UUID;
    campos_alterados TEXT[] := '{}';
    valores_anteriores JSONB := '{}';
    valores_novos JSONB := '{}';
    campo TEXT;
    valor_anterior TEXT;
    valor_novo TEXT;
BEGIN
    -- Determinar o tipo de processo baseado na tabela
    IF TG_TABLE_NAME = 'contas_pagar' THEN
        processo_tipo := 'conta_pagar';
        processo_id := COALESCE(NEW.id, OLD.id);
        company_id := COALESCE(NEW.company_id, OLD.company_id);
    ELSIF TG_TABLE_NAME = 'requisicoes_compra' THEN
        processo_tipo := 'requisicao_compra';
        processo_id := COALESCE(NEW.id, OLD.id);
        company_id := COALESCE(NEW.company_id, OLD.company_id);
    ELSIF TG_TABLE_NAME = 'cotacoes' THEN
        processo_tipo := 'cotacao_compra';
        processo_id := COALESCE(NEW.id, OLD.id);
        company_id := COALESCE(NEW.company_id, OLD.company_id);
    ELSIF TG_TABLE_NAME = 'solicitacoes_saida_materiais' THEN
        processo_tipo := 'solicitacao_saida_material';
        processo_id := COALESCE(NEW.id, OLD.id);
        company_id := COALESCE(NEW.company_id, OLD.company_id);
    ELSIF TG_TABLE_NAME = 'transferencias' THEN
        processo_tipo := 'solicitacao_transferencia_material';
        processo_id := COALESCE(NEW.id, OLD.id);
        company_id := COALESCE(NEW.company_id, OLD.company_id);
    ELSE
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Se for INSERT, não há edição para registrar
    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    END IF;

    -- Se for DELETE, não resetar aprovações
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    -- Verificar se houve mudanças significativas
    -- Campos que não devem triggerar reset
    DECLARE
        campos_ignorados TEXT[] := ARRAY['updated_at', 'created_at', 'aprovado_por', 'data_aprovacao', 'status'];
    BEGIN
        -- Comparar campos relevantes
        FOR campo IN 
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = TG_TABLE_NAME 
            AND table_schema = TG_TABLE_SCHEMA
            AND column_name != ALL(campos_ignorados)
        LOOP
            -- Obter valores
            EXECUTE format('SELECT ($1).%I::text', campo) INTO valor_anterior USING OLD;
            EXECUTE format('SELECT ($1).%I::text', campo) INTO valor_novo USING NEW;
            
            -- Se os valores são diferentes
            IF valor_anterior IS DISTINCT FROM valor_novo THEN
                campos_alterados := array_append(campos_alterados, campo);
                valores_anteriores := valores_anteriores || jsonb_build_object(campo, valor_anterior);
                valores_novos := valores_novos || jsonb_build_object(campo, valor_novo);
            END IF;
        END LOOP;
    END;

    -- Se não houve mudanças significativas, não fazer nada
    IF array_length(campos_alterados, 1) IS NULL THEN
        RETURN NEW;
    END IF;

    -- Registrar a edição no histórico
    INSERT INTO public.historico_edicoes_solicitacoes (
        company_id,
        processo_tipo,
        processo_id,
        usuario_editor_id,
        data_edicao,
        campos_alterados,
        valores_anteriores,
        valores_novos
    ) VALUES (
        company_id,
        processo_tipo,
        processo_id,
        COALESCE(NEW.updated_by, NEW.created_by, (SELECT current_setting('app.current_user_id', true)::uuid)),
        NOW(),
        campos_alterados,
        valores_anteriores,
        valores_novos
    );

    -- Resetar aprovações se a solicitação não estiver cancelada
    IF COALESCE(NEW.status, '') != 'cancelado' THEN
        PERFORM public.reset_approvals_after_edit(processo_tipo, processo_id, company_id);
    END IF;

    RETURN NEW;
END;
$$;

-- 2. TRIGGERS PARA CONTAS A PAGAR
-- =====================================================
CREATE OR REPLACE TRIGGER trigger_reset_approvals_contas_pagar
    AFTER UPDATE ON financeiro.contas_pagar
    FOR EACH ROW
    EXECUTE FUNCTION public.record_edit_and_reset_approvals();

-- 3. TRIGGERS PARA REQUISIÇÕES DE COMPRA
-- =====================================================
CREATE OR REPLACE TRIGGER trigger_reset_approvals_requisicoes_compra
    AFTER UPDATE ON compras.requisicoes_compra
    FOR EACH ROW
    EXECUTE FUNCTION public.record_edit_and_reset_approvals();

-- 4. TRIGGERS PARA COTAÇÕES DE COMPRA
-- =====================================================
CREATE OR REPLACE TRIGGER trigger_reset_approvals_cotacoes
    AFTER UPDATE ON compras.cotacoes
    FOR EACH ROW
    EXECUTE FUNCTION public.record_edit_and_reset_approvals();

-- 5. TRIGGERS PARA SAÍDAS DE MATERIAIS
-- =====================================================
CREATE OR REPLACE TRIGGER trigger_reset_approvals_saidas_materiais
    AFTER UPDATE ON public.solicitacoes_saida_materiais
    FOR EACH ROW
    EXECUTE FUNCTION public.record_edit_and_reset_approvals();

-- 6. TRIGGERS PARA TRANSFERÊNCIAS DE MATERIAIS
-- =====================================================
CREATE OR REPLACE TRIGGER trigger_reset_approvals_transferencias
    AFTER UPDATE ON almoxarifado.transferencias
    FOR EACH ROW
    EXECUTE FUNCTION public.record_edit_and_reset_approvals();

-- 7. FUNÇÃO PARA CRIAR APROVAÇÕES AUTOMÁTICAS EM NOVAS SOLICITAÇÕES
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_approvals_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    processo_tipo VARCHAR(50);
BEGIN
    -- Determinar o tipo de processo baseado na tabela
    IF TG_TABLE_NAME = 'contas_pagar' THEN
        processo_tipo := 'conta_pagar';
    ELSIF TG_TABLE_NAME = 'requisicoes_compra' THEN
        processo_tipo := 'requisicao_compra';
    ELSIF TG_TABLE_NAME = 'cotacoes' THEN
        processo_tipo := 'cotacao_compra';
    ELSIF TG_TABLE_NAME = 'solicitacoes_saida_materiais' THEN
        processo_tipo := 'solicitacao_saida_material';
    ELSIF TG_TABLE_NAME = 'transferencias' THEN
        processo_tipo := 'solicitacao_transferencia_material';
    ELSE
        RETURN NEW;
    END IF;

    -- Criar aprovações automáticas
    PERFORM public.create_approvals_for_process(processo_tipo, NEW.id, NEW.company_id);

    RETURN NEW;
END;
$$;

-- 8. TRIGGERS PARA CRIAR APROVAÇÕES EM NOVAS SOLICITAÇÕES
-- =====================================================
CREATE OR REPLACE TRIGGER trigger_create_approvals_contas_pagar
    AFTER INSERT ON financeiro.contas_pagar
    FOR EACH ROW
    EXECUTE FUNCTION public.create_approvals_on_insert();

CREATE OR REPLACE TRIGGER trigger_create_approvals_requisicoes_compra
    AFTER INSERT ON compras.requisicoes_compra
    FOR EACH ROW
    EXECUTE FUNCTION public.create_approvals_on_insert();

CREATE OR REPLACE TRIGGER trigger_create_approvals_cotacoes
    AFTER INSERT ON compras.cotacoes
    FOR EACH ROW
    EXECUTE FUNCTION public.create_approvals_on_insert();

CREATE OR REPLACE TRIGGER trigger_create_approvals_saidas_materiais
    AFTER INSERT ON public.solicitacoes_saida_materiais
    FOR EACH ROW
    EXECUTE FUNCTION public.create_approvals_on_insert();

CREATE OR REPLACE TRIGGER trigger_create_approvals_transferencias
    AFTER INSERT ON almoxarifado.transferencias
    FOR EACH ROW
    EXECUTE FUNCTION public.create_approvals_on_insert();

-- 9. FUNÇÃO PARA VERIFICAR SE PODE EDITAR (NÃO CANCELADO)
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_edit_permission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    processo_tipo VARCHAR(50);
    processo_id UUID;
    can_edit BOOLEAN;
BEGIN
    -- Determinar o tipo de processo baseado na tabela
    IF TG_TABLE_NAME = 'contas_pagar' THEN
        processo_tipo := 'conta_pagar';
        processo_id := COALESCE(NEW.id, OLD.id);
    ELSIF TG_TABLE_NAME = 'requisicoes_compra' THEN
        processo_tipo := 'requisicao_compra';
        processo_id := COALESCE(NEW.id, OLD.id);
    ELSIF TG_TABLE_NAME = 'cotacoes' THEN
        processo_tipo := 'cotacao_compra';
        processo_id := COALESCE(NEW.id, OLD.id);
    ELSIF TG_TABLE_NAME = 'solicitacoes_saida_materiais' THEN
        processo_tipo := 'solicitacao_saida_material';
        processo_id := COALESCE(NEW.id, OLD.id);
    ELSIF TG_TABLE_NAME = 'transferencias' THEN
        processo_tipo := 'solicitacao_transferencia_material';
        processo_id := COALESCE(NEW.id, OLD.id);
    ELSE
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Verificar se pode editar
    SELECT public.can_edit_solicitation(processo_tipo, processo_id) INTO can_edit;

    -- Se não pode editar, lançar erro
    IF NOT can_edit THEN
        RAISE EXCEPTION 'Esta solicitação foi cancelada e não pode mais ser editada';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 10. TRIGGERS PARA VERIFICAR PERMISSÃO DE EDIÇÃO
-- =====================================================
CREATE OR REPLACE TRIGGER trigger_check_edit_permission_contas_pagar
    BEFORE UPDATE ON financeiro.contas_pagar
    FOR EACH ROW
    EXECUTE FUNCTION public.check_edit_permission();

CREATE OR REPLACE TRIGGER trigger_check_edit_permission_requisicoes_compra
    BEFORE UPDATE ON compras.requisicoes_compra
    FOR EACH ROW
    EXECUTE FUNCTION public.check_edit_permission();

CREATE OR REPLACE TRIGGER trigger_check_edit_permission_cotacoes
    BEFORE UPDATE ON compras.cotacoes
    FOR EACH ROW
    EXECUTE FUNCTION public.check_edit_permission();

CREATE OR REPLACE TRIGGER trigger_check_edit_permission_saidas_materiais
    BEFORE UPDATE ON public.solicitacoes_saida_materiais
    FOR EACH ROW
    EXECUTE FUNCTION public.check_edit_permission();

CREATE OR REPLACE TRIGGER trigger_check_edit_permission_transferencias
    BEFORE UPDATE ON almoxarifado.transferencias
    FOR EACH ROW
    EXECUTE FUNCTION public.check_edit_permission();
