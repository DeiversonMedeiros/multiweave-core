-- =====================================================
-- SCRIPT ESPECIFICO PARA COPIAR CONFIGURACOES FGTS
-- =====================================================
-- Empresa de Referencia: AXISENG LTDA (dc060329-50cd-4114-922f-624a6ab036d6)
-- Empresas Destino:
--   - ESTRATEGIC CONSTRUTORA (ce390408-1c18-47fc-bd7d-76379ec488b7)
--   - TECHSTEEL METAL LTDA (ce92d32f-0503-43ca-b3cc-fb09a462b839)
--   - SMARTVIEW RENT LTDA (f83704f6-3278-4d59-81ca-45925a1ab855)
-- =====================================================

-- Criar funcao para copiar apenas FGTS (bypass RLS)
CREATE OR REPLACE FUNCTION public.copy_fgts_config_to_companies(
    p_reference_company_id UUID,
    p_target_company_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, rh
AS $$
DECLARE
    v_target_company_id UUID;
    v_total INTEGER;
    v_copied INTEGER;
    v_result JSONB := '{}'::jsonb;
    v_company_result JSONB;
BEGIN
    -- Verificar dados na empresa de referencia
    SELECT COUNT(*) INTO v_total FROM rh.fgts_config WHERE company_id = p_reference_company_id;
    
    IF v_total = 0 THEN
        RAISE EXCEPTION 'Nenhuma configuracao FGTS encontrada na empresa de referencia: %', p_reference_company_id;
    END IF;
    
    -- Loop atraves de cada empresa destino
    FOREACH v_target_company_id IN ARRAY p_target_company_ids
    LOOP
        -- Copiar configuracoes FGTS
        INSERT INTO rh.fgts_config (
            company_id, codigo, descricao, ano_vigencia, mes_vigencia,
            aliquota_fgts, aliquota_multa, aliquota_juros, teto_salario,
            valor_minimo_contribuicao, multa_rescisao, tipo_contrato, ativo, created_at, updated_at
        )
        SELECT 
            v_target_company_id,
            fc.codigo,
            fc.descricao,
            fc.ano_vigencia,
            fc.mes_vigencia,
            fc.aliquota_fgts,
            COALESCE(fc.aliquota_multa, 0),
            COALESCE(fc.aliquota_juros, 0),
            fc.teto_salario,
            COALESCE(fc.valor_minimo_contribuicao, 0),
            COALESCE(fc.multa_rescisao, 0),
            fc.tipo_contrato,
            COALESCE(fc.ativo, true),
            NOW(),
            NOW()
        FROM rh.fgts_config fc
        WHERE fc.company_id = p_reference_company_id
        ON CONFLICT (company_id, ano_vigencia, mes_vigencia, codigo, tipo_contrato) DO UPDATE SET
            descricao = EXCLUDED.descricao,
            aliquota_fgts = EXCLUDED.aliquota_fgts,
            aliquota_multa = EXCLUDED.aliquota_multa,
            aliquota_juros = EXCLUDED.aliquota_juros,
            teto_salario = EXCLUDED.teto_salario,
            valor_minimo_contribuicao = EXCLUDED.valor_minimo_contribuicao,
            multa_rescisao = EXCLUDED.multa_rescisao,
            ativo = EXCLUDED.ativo,
            updated_at = NOW();
        
        GET DIAGNOSTICS v_copied = ROW_COUNT;
        
        -- Verificar quantos registros foram inseridos/atualizados
        SELECT COUNT(*) INTO v_total FROM rh.fgts_config WHERE company_id = v_target_company_id;
        
        v_company_result := jsonb_build_object(
            'reference_total', (SELECT COUNT(*) FROM rh.fgts_config WHERE company_id = p_reference_company_id),
            'copied', v_copied,
            'final_total', v_total
        );
        
        v_result := jsonb_set(v_result, ARRAY[v_target_company_id::text], v_company_result);
    END LOOP;
    
    RETURN v_result;
END;
$$;

-- Executar a copia
SELECT public.copy_fgts_config_to_companies(
    'dc060329-50cd-4114-922f-624a6ab036d6'::UUID,
    ARRAY[
        'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID,
        'ce92d32f-0503-43ca-b3cc-fb09a462b839'::UUID,
        'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID
    ]
) as resultado;

-- =====================================================
-- VERIFICACAO FINAL
-- =====================================================
SELECT 
    'Configuracoes FGTS' as tabela,
    CASE company_id
        WHEN 'dc060329-50cd-4114-922f-624a6ab036d6' THEN 'Referencia (AXISENG)'
        WHEN 'ce390408-1c18-47fc-bd7d-76379ec488b7' THEN 'ESTRATEGIC'
        WHEN 'ce92d32f-0503-43ca-b3cc-fb09a462b839' THEN 'TECHSTEEL'
        WHEN 'f83704f6-3278-4d59-81ca-45925a1ab855' THEN 'SMARTVIEW'
    END as empresa,
    COUNT(*) as total_registros,
    COUNT(DISTINCT codigo) as codigos_distintos,
    COUNT(DISTINCT ano_vigencia) as anos_distintos
FROM rh.fgts_config 
WHERE company_id IN (
    'dc060329-50cd-4114-922f-624a6ab036d6',
    'ce390408-1c18-47fc-bd7d-76379ec488b7',
    'ce92d32f-0503-43ca-b3cc-fb09a462b839',
    'f83704f6-3278-4d59-81ca-45925a1ab855'
)
GROUP BY company_id
ORDER BY 
    CASE company_id
        WHEN 'dc060329-50cd-4114-922f-624a6ab036d6' THEN 1
        WHEN 'ce390408-1c18-47fc-bd7d-76379ec488b7' THEN 2
        WHEN 'ce92d32f-0503-43ca-b3cc-fb09a462b839' THEN 3
        WHEN 'f83704f6-3278-4d59-81ca-45925a1ab855' THEN 4
    END;

