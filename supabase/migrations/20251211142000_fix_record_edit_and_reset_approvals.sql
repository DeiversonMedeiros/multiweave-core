-- =====================================================
-- CORREÇÃO: record_edit_and_reset_approvals - cast de campos_alterados
-- Data: 2025-12-11
-- Erro observado: "column \"campos_alterados\" is of type jsonb but expression is of type text[]"
-- Ajuste: converter campos_alterados para JSONB ao inserir no histórico
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
    campos_alterados TEXT[];
    valores_anteriores JSONB;
    valores_novos JSONB;
BEGIN
    -- Identificar entidade e empresa
    processo_tipo := TG_ARGV[0];
    processo_id := NEW.id;

    IF processo_tipo = 'conta_pagar' THEN
        company_id := NEW.company_id;
    ELSEIF processo_tipo = 'requisicao_compra' THEN
        company_id := NEW.company_id;
    ELSEIF processo_tipo = 'cotacao_compra' THEN
        company_id := NEW.company_id;
    END IF;

    -- Comparar campos para saber quais mudaram
    campos_alterados := ARRAY(
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = TG_TABLE_SCHEMA
          AND table_name = TG_TABLE_NAME
          AND column_name NOT IN ('updated_at') -- evite updated_at
          AND (ROW(OLD.*)).* IS DISTINCT FROM (ROW(NEW.*)).*
    );

    -- Se nada mudou, retorna
    IF array_length(campos_alterados, 1) IS NULL THEN
        RETURN NEW;
    END IF;

    -- Montar valores anteriores e novos como JSONB
    valores_anteriores := to_jsonb(OLD);
    valores_novos := to_jsonb(NEW);

    -- Inserir no histórico com cast de campos_alterados -> jsonb
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
        to_jsonb(campos_alterados),
        valores_anteriores,
        valores_novos
    );

    -- Resetar aprovações se não estiver cancelado
    IF COALESCE(NEW.status, '') != 'cancelado' THEN
        PERFORM public.reset_approvals_after_edit(processo_tipo, processo_id, company_id);
    END IF;

    RETURN NEW;
END;
$$;



