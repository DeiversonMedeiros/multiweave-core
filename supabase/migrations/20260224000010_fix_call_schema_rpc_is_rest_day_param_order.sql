-- =====================================================
-- CORREÇÃO: Ordem dos parâmetros e tipo DATE para is_rest_day e is_holiday
-- =====================================================
-- Problema: Na aba Resumo por Funcionário, finais de semana continuavam como
-- "Falta" mesmo após a migração do is_rest_day (fallback work_shift_id). A
-- função public.call_schema_rpc NÃO definia ordem dos parâmetros para
-- is_rest_day nem is_holiday, então os argumentos eram passados em ordem
-- alfabética (p_company_id, p_date, p_employee_id) em vez de
-- (p_employee_id, p_company_id, p_date), e p_date era enviado como TEXT em
-- vez de DATE. Com isso rh.is_rest_day recebia dados errados e retornava false.
-- Solução: Definir param_order para is_rest_day e is_holiday e tratar p_date
-- como DATE nessas funções.
-- =====================================================

CREATE OR REPLACE FUNCTION public.call_schema_rpc(
    p_schema_name TEXT,
    p_function_name TEXT,
    p_params JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sql TEXT;
    v_result JSONB;
    v_param_list TEXT;
    v_uuid_result UUID;
    v_int_result INTEGER;
    v_bool_result BOOLEAN;
    v_text_result TEXT;
    v_decimal_result DECIMAL;
BEGIN
    WITH ordered_params AS (
        SELECT 
            key,
            value,
            CASE 
                WHEN key = 'p_conta_pagar_id' AND (p_function_name = 'suspender_conta_pagar' OR p_function_name = 'reprovar_conta_pagar') THEN 1
                WHEN key = 'p_company_id' AND (p_function_name = 'suspender_conta_pagar' OR p_function_name = 'reprovar_conta_pagar') THEN 2
                WHEN key = 'p_suspenso_por' AND p_function_name = 'suspender_conta_pagar' THEN 3
                WHEN key = 'p_reprovado_por' AND p_function_name = 'reprovar_conta_pagar' THEN 3
                WHEN key = 'p_observacoes' AND (p_function_name = 'suspender_conta_pagar' OR p_function_name = 'reprovar_conta_pagar') THEN 4
                WHEN key = 'p_company_id' AND p_function_name = 'criar_ferias_fracionadas' THEN 1
                WHEN key = 'p_employee_id' AND p_function_name = 'criar_ferias_fracionadas' THEN 2
                WHEN key = 'p_ano' AND p_function_name = 'criar_ferias_fracionadas' THEN 3
                WHEN key = 'p_periodos' AND p_function_name = 'criar_ferias_fracionadas' THEN 4
                WHEN key = 'p_observacoes' AND p_function_name = 'criar_ferias_fracionadas' THEN 5
                WHEN key = 'p_vacation_id' AND (p_function_name = 'aprovar_ferias' OR p_function_name = 'rejeitar_ferias') THEN 1
                WHEN key = 'p_aprovado_por' AND (p_function_name = 'aprovar_ferias' OR p_function_name = 'rejeitar_ferias') THEN 2
                WHEN key = 'p_motivo_rejeicao' AND p_function_name = 'rejeitar_ferias' THEN 3
                WHEN key = 'p_employee_id' AND p_function_name = 'create_rest_day_and_deduct_hours' THEN 1
                WHEN key = 'p_company_id' AND p_function_name = 'create_rest_day_and_deduct_hours' THEN 2
                WHEN key = 'p_data_folga' AND p_function_name = 'create_rest_day_and_deduct_hours' THEN 3
                WHEN key = 'p_horas_descontar' AND p_function_name = 'create_rest_day_and_deduct_hours' THEN 4
                WHEN key = 'p_observacoes' AND p_function_name = 'create_rest_day_and_deduct_hours' THEN 5
                WHEN key = 'p_created_by' AND p_function_name = 'create_rest_day_and_deduct_hours' THEN 6
                -- rh.is_rest_day(p_employee_id, p_company_id, p_date)
                WHEN key = 'p_employee_id' AND p_function_name = 'is_rest_day' THEN 1
                WHEN key = 'p_company_id' AND p_function_name = 'is_rest_day' THEN 2
                WHEN key = 'p_date' AND p_function_name = 'is_rest_day' THEN 3
                -- rh.is_holiday(p_date, p_company_id)
                WHEN key = 'p_date' AND p_function_name = 'is_holiday' THEN 1
                WHEN key = 'p_company_id' AND p_function_name = 'is_holiday' THEN 2
                ELSE 99
            END as param_order
        FROM jsonb_each(p_params)
    )
    SELECT string_agg(
        CASE 
            WHEN key = 'p_periodos' THEN quote_literal(value::text) || '::JSONB'
            WHEN key = 'p_data_folga' AND p_function_name = 'create_rest_day_and_deduct_hours' THEN
                CASE WHEN value::text = 'null' OR jsonb_typeof(value) = 'null' THEN 'NULL::DATE'
                ELSE quote_literal(value #>> '{}') || '::DATE' END
            -- p_date como DATE para is_rest_day e is_holiday (resumo ponto: folga/DSR)
            WHEN key = 'p_date' AND (p_function_name = 'is_rest_day' OR p_function_name = 'is_holiday') THEN
                CASE WHEN value::text = 'null' OR jsonb_typeof(value) = 'null' THEN 'NULL::DATE'
                ELSE quote_literal(value #>> '{}') || '::DATE' END
            WHEN value::text = 'null' OR jsonb_typeof(value) = 'null' THEN 
                CASE WHEN key LIKE '%_id' OR key LIKE '%id' THEN 'NULL::UUID' ELSE 'NULL' END
            WHEN jsonb_typeof(value) = 'string' THEN 
                CASE 
                    WHEN (value #>> '{}') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                    THEN quote_literal(value #>> '{}') || '::UUID'
                    WHEN key LIKE '%_id' OR key LIKE '%id' OR key LIKE '%_por' THEN 
                        quote_literal(value #>> '{}') || '::UUID'
                    ELSE quote_literal(value #>> '{}') || '::TEXT'
                END
            WHEN jsonb_typeof(value) = 'number' THEN 
                CASE WHEN trunc((value::numeric)::numeric) = (value::numeric)::numeric 
                THEN value::text || '::INTEGER' ELSE value::text || '::NUMERIC' END
            WHEN jsonb_typeof(value) = 'boolean' THEN value::text || '::BOOLEAN'
            WHEN jsonb_typeof(value) = 'object' OR jsonb_typeof(value) = 'array' THEN quote_literal(value::text) || '::JSONB'
            ELSE quote_literal(value::text) || '::TEXT'
        END,
        ', '
        ORDER BY param_order, key
    ) INTO v_param_list
    FROM ordered_params;
    
    IF v_param_list IS NULL THEN
        v_param_list := '';
    END IF;
    
    v_sql := format(
        'SELECT %I.%I(%s)',
        p_schema_name,
        p_function_name,
        v_param_list
    );
    
    BEGIN
        EXECUTE v_sql INTO v_result;
        IF jsonb_typeof(v_result) = 'object' OR jsonb_typeof(v_result) = 'array' THEN
            RETURN jsonb_build_object('result', v_result);
        ELSE
            RETURN jsonb_build_object('result', v_result);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        BEGIN
            EXECUTE v_sql INTO v_uuid_result;
            RETURN jsonb_build_object('result', v_uuid_result::text);
        EXCEPTION WHEN OTHERS THEN
            BEGIN
                EXECUTE v_sql INTO v_int_result;
                RETURN jsonb_build_object('result', v_int_result);
            EXCEPTION WHEN OTHERS THEN
                BEGIN
                    EXECUTE v_sql INTO v_bool_result;
                    RETURN jsonb_build_object('result', v_bool_result);
                EXCEPTION WHEN OTHERS THEN
                    BEGIN
                        EXECUTE v_sql INTO v_text_result;
                        RETURN jsonb_build_object('result', v_text_result);
                    EXCEPTION WHEN OTHERS THEN
                        BEGIN
                            EXECUTE v_sql INTO v_decimal_result;
                            RETURN jsonb_build_object('result', v_decimal_result);
                        EXCEPTION WHEN OTHERS THEN
                            RETURN jsonb_build_object(
                                'error', true,
                                'message', SQLERRM,
                                'sqlstate', SQLSTATE,
                                'sql', v_sql
                            );
                        END;
                    END;
                END;
            END;
        END;
    END;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'error', true,
            'message', SQLERRM,
            'sqlstate', SQLSTATE,
            'sql', v_sql
        );
END;
$$;

GRANT EXECUTE ON FUNCTION public.call_schema_rpc(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.call_schema_rpc(TEXT, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.call_schema_rpc(TEXT, TEXT, JSONB) TO service_role;

COMMENT ON FUNCTION public.call_schema_rpc(TEXT, TEXT, JSONB) IS 
'Chama funções RPC de qualquer schema. Ordem de parâmetros: is_rest_day(p_employee_id, p_company_id, p_date), is_holiday(p_date, p_company_id).';
