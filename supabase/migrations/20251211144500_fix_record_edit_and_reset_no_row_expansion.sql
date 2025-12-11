-- =====================================================
-- CORREÇÃO: record_edit_and_reset_approvals sem row expansion (*)
-- Data: 2025-12-11
-- Erro visto: "row expansion via '*' is not supported here"
-- Ajuste: evitar (ROW(OLD.*)).* e campos_alterados complexo; registrar campos_alterados vazio
-- =====================================================

CREATE OR REPLACE FUNCTION public.record_edit_and_reset_approvals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    processo_tipo TEXT;
    processo_id UUID;
    company_id UUID;
BEGIN
    processo_tipo := TG_ARGV[0];
    processo_id := NEW.id;

    IF processo_tipo = 'conta_pagar' THEN
        company_id := NEW.company_id;
    ELSIF processo_tipo = 'requisicao_compra' THEN
        company_id := NEW.company_id;
    ELSIF processo_tipo = 'cotacao_compra' THEN
        company_id := NEW.company_id;
    END IF;

    -- Se não houve mudança relevante, sair
    IF OLD IS NOT DISTINCT FROM NEW THEN
        RETURN NEW;
    END IF;

    -- Registrar histórico com campos_alterados vazio (evita row expansion)
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
        '[]'::jsonb,
        to_jsonb(OLD),
        to_jsonb(NEW)
    );

    -- Resetar aprovações se não estiver cancelado
    IF COALESCE(NEW.status, '') != 'cancelado' THEN
        PERFORM public.reset_approvals_after_edit(processo_tipo, processo_id, company_id);
    END IF;

    RETURN NEW;
END;
$$;

