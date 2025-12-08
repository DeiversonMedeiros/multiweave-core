-- =====================================================
-- SCRIPT COMPLETO PARA COPIAR DADOS ENTRE EMPRESAS
-- =====================================================
-- Empresa de Referencia: AXISENG LTDA (dc060329-50cd-4114-922f-624a6ab036d6)
-- Empresas Destino:
--   - ESTRATEGIC CONSTRUTORA (ce390408-1c18-47fc-bd7d-76379ec488b7)
--   - TECHSTEEL METAL LTDA (ce92d32f-0503-43ca-b3cc-fb09a462b839)
--   - SMARTVIEW RENT LTDA (f83704f6-3278-4d59-81ca-45925a1ab855)
-- =====================================================
-- Execute este script no Supabase Studio SQL Editor
-- =====================================================

-- Criar funcao para copiar dados (bypass RLS)
CREATE OR REPLACE FUNCTION public.copy_company_reference_data(
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
    -- Loop atraves de cada empresa destino
    FOREACH v_target_company_id IN ARRAY p_target_company_ids
    LOOP
        v_company_result := '{}'::jsonb;
        
        -- =====================================================
        -- 1. ZONAS DE LOCALIZACAO
        -- =====================================================
        SELECT COUNT(*) INTO v_total FROM rh.location_zones WHERE company_id = p_reference_company_id;
        
        INSERT INTO rh.location_zones (
            company_id, nome, descricao, latitude, longitude, 
            raio_metros, ativo, created_at, updated_at
        )
        SELECT 
            v_target_company_id,
            nome,
            descricao,
            latitude,
            longitude,
            raio_metros,
            COALESCE(ativo, true),
            NOW(),
            NOW()
        FROM rh.location_zones
        WHERE company_id = p_reference_company_id
        AND NOT EXISTS (
            SELECT 1 FROM rh.location_zones 
            WHERE company_id = v_target_company_id 
            AND nome = rh.location_zones.nome
        );
        GET DIAGNOSTICS v_copied = ROW_COUNT;
        v_company_result := jsonb_set(v_company_result, '{location_zones}', jsonb_build_object('total', v_total, 'copied', v_copied));
        
        -- =====================================================
        -- 2. RUBRICAS
        -- =====================================================
        SELECT COUNT(*) INTO v_total FROM rh.rubricas WHERE company_id = p_reference_company_id;
        
        INSERT INTO rh.rubricas (
            company_id, codigo, nome, descricao, tipo, categoria, natureza,
            calculo_automatico, formula_calculo, valor_fixo, percentual, base_calculo,
            incidencia_ir, incidencia_inss, incidencia_fgts, incidencia_contribuicao_sindical,
            ordem_exibicao, obrigatorio, ativo, created_at, updated_at
        )
        SELECT 
            v_target_company_id,
            r.codigo,
            r.nome,
            r.descricao,
            r.tipo,
            r.categoria,
            COALESCE(r.natureza, 'normal'),
            COALESCE(r.calculo_automatico, false),
            r.formula_calculo,
            r.valor_fixo,
            r.percentual,
            COALESCE(r.base_calculo, 'salario_base'),
            COALESCE(r.incidencia_ir, false),
            COALESCE(r.incidencia_inss, false),
            COALESCE(r.incidencia_fgts, false),
            COALESCE(r.incidencia_contribuicao_sindical, false),
            COALESCE(r.ordem_exibicao, 0),
            COALESCE(r.obrigatorio, false),
            COALESCE(r.ativo, true),
            NOW(),
            NOW()
        FROM rh.rubricas r
        WHERE r.company_id = p_reference_company_id
        ON CONFLICT (codigo, company_id) DO NOTHING;
        GET DIAGNOSTICS v_copied = ROW_COUNT;
        v_company_result := jsonb_set(v_company_result, '{rubricas}', jsonb_build_object('total', v_total, 'copied', v_copied));
        
        -- =====================================================
        -- 3. FAIXAS INSS
        -- =====================================================
        SELECT COUNT(*) INTO v_total FROM rh.inss_brackets WHERE company_id = p_reference_company_id;
        
        INSERT INTO rh.inss_brackets (
            company_id, codigo, descricao, ano_vigencia, mes_vigencia,
            valor_minimo, valor_maximo, aliquota, valor_deducao, ativo, created_at, updated_at
        )
        SELECT 
            v_target_company_id,
            ib.codigo,
            ib.descricao,
            ib.ano_vigencia,
            ib.mes_vigencia,
            ib.valor_minimo,
            ib.valor_maximo,
            ib.aliquota,
            COALESCE(ib.valor_deducao, 0),
            COALESCE(ib.ativo, true),
            NOW(),
            NOW()
        FROM rh.inss_brackets ib
        WHERE ib.company_id = p_reference_company_id
        ON CONFLICT (codigo, company_id, ano_vigencia, mes_vigencia) DO NOTHING;
        GET DIAGNOSTICS v_copied = ROW_COUNT;
        v_company_result := jsonb_set(v_company_result, '{inss_brackets}', jsonb_build_object('total', v_total, 'copied', v_copied));
        
        -- =====================================================
        -- 4. FAIXAS IRRF
        -- =====================================================
        SELECT COUNT(*) INTO v_total FROM rh.irrf_brackets WHERE company_id = p_reference_company_id;
        
        INSERT INTO rh.irrf_brackets (
            company_id, codigo, descricao, ano_vigencia, mes_vigencia,
            valor_minimo, valor_maximo, aliquota, valor_deducao,
            numero_dependentes, valor_por_dependente, ativo, created_at, updated_at
        )
        SELECT 
            v_target_company_id,
            ib.codigo,
            ib.descricao,
            ib.ano_vigencia,
            ib.mes_vigencia,
            ib.valor_minimo,
            ib.valor_maximo,
            ib.aliquota,
            COALESCE(ib.valor_deducao, 0),
            COALESCE(ib.numero_dependentes, 0),
            COALESCE(ib.valor_por_dependente, 0),
            COALESCE(ib.ativo, true),
            NOW(),
            NOW()
        FROM rh.irrf_brackets ib
        WHERE ib.company_id = p_reference_company_id
        ON CONFLICT (codigo, company_id, ano_vigencia, mes_vigencia) DO NOTHING;
        GET DIAGNOSTICS v_copied = ROW_COUNT;
        v_company_result := jsonb_set(v_company_result, '{irrf_brackets}', jsonb_build_object('total', v_total, 'copied', v_copied));
        
        -- =====================================================
        -- 5. CONFIGURACOES FGTS
        -- =====================================================
        SELECT COUNT(*) INTO v_total FROM rh.fgts_config WHERE company_id = p_reference_company_id;
        
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
        ON CONFLICT (company_id, ano_vigencia, mes_vigencia, codigo, tipo_contrato) DO NOTHING;
        GET DIAGNOSTICS v_copied = ROW_COUNT;
        v_company_result := jsonb_set(v_company_result, '{fgts_config}', jsonb_build_object('total', v_total, 'copied', v_copied));
        
        -- =====================================================
        -- 6. CONFIGURACAO DE INTEGRACAO FINANCEIRA
        -- =====================================================
        SELECT COUNT(*) INTO v_total FROM rh.financial_integration_config WHERE company_id = p_reference_company_id;
        
        INSERT INTO rh.financial_integration_config (company_id, config, created_at, updated_at)
        SELECT 
            v_target_company_id,
            fic.config,
            NOW(),
            NOW()
        FROM rh.financial_integration_config fic
        WHERE fic.company_id = p_reference_company_id
        ON CONFLICT (company_id) DO UPDATE SET
            config = EXCLUDED.config,
            updated_at = NOW();
        GET DIAGNOSTICS v_copied = ROW_COUNT;
        v_company_result := jsonb_set(v_company_result, '{financial_integration_config}', jsonb_build_object('total', v_total, 'copied', v_copied));
        
        -- Adicionar resultado da empresa ao resultado final
        v_result := jsonb_set(v_result, ARRAY[v_target_company_id::text], v_company_result);
    END LOOP;
    
    RETURN v_result;
END;
$$;

-- Executar a copia
SELECT public.copy_company_reference_data(
    'dc060329-50cd-4114-922f-624a6ab036d6'::UUID,
    ARRAY[
        'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID,
        'ce92d32f-0503-43ca-b3cc-fb09a462b839'::UUID,
        'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID
    ]
) as resultado;

-- =====================================================
-- VERIFICACAO FINAL - RESUMO DOS DADOS COPIADOS
-- =====================================================
SELECT '=== RESUMO FINAL ===' as etapa;

SELECT 
    'Zonas de Localizacao' as tabela,
    'Referencia' as empresa,
    COUNT(*) as total
FROM rh.location_zones 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Zonas de Localizacao',
    'ESTRATEGIC',
    COUNT(*)
FROM rh.location_zones 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Zonas de Localizacao',
    'TECHSTEEL',
    COUNT(*)
FROM rh.location_zones 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Zonas de Localizacao',
    'SMARTVIEW',
    COUNT(*)
FROM rh.location_zones 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855'
UNION ALL
SELECT 
    'Rubricas',
    'Referencia',
    COUNT(*)
FROM rh.rubricas 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Rubricas',
    'ESTRATEGIC',
    COUNT(*)
FROM rh.rubricas 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Rubricas',
    'TECHSTEEL',
    COUNT(*)
FROM rh.rubricas 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Rubricas',
    'SMARTVIEW',
    COUNT(*)
FROM rh.rubricas 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855'
UNION ALL
SELECT 
    'Faixas INSS',
    'Referencia',
    COUNT(*)
FROM rh.inss_brackets 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Faixas INSS',
    'ESTRATEGIC',
    COUNT(*)
FROM rh.inss_brackets 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Faixas INSS',
    'TECHSTEEL',
    COUNT(*)
FROM rh.inss_brackets 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Faixas INSS',
    'SMARTVIEW',
    COUNT(*)
FROM rh.inss_brackets 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855'
UNION ALL
SELECT 
    'Faixas IRRF',
    'Referencia',
    COUNT(*)
FROM rh.irrf_brackets 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Faixas IRRF',
    'ESTRATEGIC',
    COUNT(*)
FROM rh.irrf_brackets 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Faixas IRRF',
    'TECHSTEEL',
    COUNT(*)
FROM rh.irrf_brackets 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Faixas IRRF',
    'SMARTVIEW',
    COUNT(*)
FROM rh.irrf_brackets 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855'
UNION ALL
SELECT 
    'Configuracoes FGTS',
    'Referencia',
    COUNT(*)
FROM rh.fgts_config 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Configuracoes FGTS',
    'ESTRATEGIC',
    COUNT(*)
FROM rh.fgts_config 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Configuracoes FGTS',
    'TECHSTEEL',
    COUNT(*)
FROM rh.fgts_config 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Configuracoes FGTS',
    'SMARTVIEW',
    COUNT(*)
FROM rh.fgts_config 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855'
UNION ALL
SELECT 
    'Integracao Financeira',
    'Referencia',
    COUNT(*)
FROM rh.financial_integration_config 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Integracao Financeira',
    'ESTRATEGIC',
    COUNT(*)
FROM rh.financial_integration_config 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Integracao Financeira',
    'TECHSTEEL',
    COUNT(*)
FROM rh.financial_integration_config 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Integracao Financeira',
    'SMARTVIEW',
    COUNT(*)
FROM rh.financial_integration_config 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855'
ORDER BY tabela, empresa;

