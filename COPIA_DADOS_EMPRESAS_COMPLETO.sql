-- =====================================================
-- SCRIPT COMPLETO PARA COPIAR DADOS ENTRE EMPRESAS
-- =====================================================
-- Empresa de Referência: AXISENG LTDA (dc060329-50cd-4114-922f-624a6ab036d6)
-- Empresas Destino:
--   - ESTRATEGIC CONSTRUTORA (ce390408-1c18-47fc-bd7d-76379ec488b7)
--   - TECHSTEEL METAL LTDA (ce92d32f-0503-43ca-b3cc-fb09a462b839)
--   - SMARTVIEW RENT LTDA (f83704f6-3278-4d59-81ca-45925a1ab855)
-- =====================================================
-- Execute este script no Supabase Studio SQL Editor
-- =====================================================

DO $$
DECLARE
    v_reference_company_id UUID := 'dc060329-50cd-4114-922f-624a6ab036d6';
    v_target_companies UUID[] := ARRAY[
        'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID,
        'ce92d32f-0503-43ca-b3cc-fb09a462b839'::UUID,
        'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID
    ];
    v_target_company_id UUID;
    v_total INTEGER;
    v_copied INTEGER;
    v_table_name TEXT;
BEGIN
    -- Loop através de cada empresa destino
    FOREACH v_target_company_id IN ARRAY v_target_companies
    LOOP
        RAISE NOTICE '========================================';
        RAISE NOTICE 'Processando empresa: %', v_target_company_id;
        RAISE NOTICE '========================================';
        
        -- =====================================================
        -- 1. ZONAS DE LOCALIZAÇÃO
        -- =====================================================
        v_table_name := 'rh.location_zones';
        SELECT COUNT(*) INTO v_total FROM rh.location_zones WHERE company_id = v_reference_company_id;
        RAISE NOTICE 'Zonas de Localização: % registros na referência', v_total;
        
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
        WHERE company_id = v_reference_company_id
        AND NOT EXISTS (
            SELECT 1 FROM rh.location_zones 
            WHERE company_id = v_target_company_id 
            AND nome = rh.location_zones.nome
        );
        GET DIAGNOSTICS v_copied = ROW_COUNT;
        RAISE NOTICE 'Zonas de Localização: % registros copiados', v_copied;
        
        -- =====================================================
        -- 2. RUBRICAS
        -- =====================================================
        v_table_name := 'rh.rubricas';
        SELECT COUNT(*) INTO v_total FROM rh.rubricas WHERE company_id = v_reference_company_id;
        RAISE NOTICE 'Rubricas: % registros na referência', v_total;
        
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
        WHERE r.company_id = v_reference_company_id
        ON CONFLICT (codigo, company_id) DO NOTHING;
        GET DIAGNOSTICS v_copied = ROW_COUNT;
        RAISE NOTICE 'Rubricas: % registros copiados', v_copied;
        
        -- =====================================================
        -- 3. FAIXAS INSS
        -- =====================================================
        v_table_name := 'rh.inss_brackets';
        SELECT COUNT(*) INTO v_total FROM rh.inss_brackets WHERE company_id = v_reference_company_id;
        RAISE NOTICE 'Faixas INSS: % registros na referência', v_total;
        
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
        WHERE ib.company_id = v_reference_company_id
        ON CONFLICT (codigo, company_id, ano_vigencia, mes_vigencia) DO NOTHING;
        GET DIAGNOSTICS v_copied = ROW_COUNT;
        RAISE NOTICE 'Faixas INSS: % registros copiados', v_copied;
        
        -- =====================================================
        -- 4. FAIXAS IRRF
        -- =====================================================
        v_table_name := 'rh.irrf_brackets';
        SELECT COUNT(*) INTO v_total FROM rh.irrf_brackets WHERE company_id = v_reference_company_id;
        RAISE NOTICE 'Faixas IRRF: % registros na referência', v_total;
        
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
        WHERE ib.company_id = v_reference_company_id
        ON CONFLICT (codigo, company_id, ano_vigencia, mes_vigencia) DO NOTHING;
        GET DIAGNOSTICS v_copied = ROW_COUNT;
        RAISE NOTICE 'Faixas IRRF: % registros copiados', v_copied;
        
        -- =====================================================
        -- 5. CONFIGURAÇÕES FGTS
        -- =====================================================
        v_table_name := 'rh.fgts_config';
        SELECT COUNT(*) INTO v_total FROM rh.fgts_config WHERE company_id = v_reference_company_id;
        RAISE NOTICE 'Configurações FGTS: % registros na referência', v_total;
        
        INSERT INTO rh.fgts_config (
            company_id, codigo, descricao, ano_vigencia, mes_vigencia,
            aliquota_fgts, aliquota_multa, aliquota_juros, teto_salario,
            valor_minimo_contribuicao, multa_rescisao, ativo, created_at, updated_at
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
            COALESCE(fc.ativo, true),
            NOW(),
            NOW()
        FROM rh.fgts_config fc
        WHERE fc.company_id = v_reference_company_id
        ON CONFLICT (codigo, company_id, ano_vigencia, mes_vigencia) DO NOTHING;
        GET DIAGNOSTICS v_copied = ROW_COUNT;
        RAISE NOTICE 'Configurações FGTS: % registros copiados', v_copied;
        
        -- =====================================================
        -- 6. CONFIGURAÇÃO DE INTEGRAÇÃO FINANCEIRA
        -- =====================================================
        v_table_name := 'rh.financial_integration_config';
        SELECT COUNT(*) INTO v_total FROM rh.financial_integration_config WHERE company_id = v_reference_company_id;
        RAISE NOTICE 'Configuração Integração Financeira: % registros na referência', v_total;
        
        INSERT INTO rh.financial_integration_config (company_id, config, created_at, updated_at)
        SELECT 
            v_target_company_id,
            fic.config,
            NOW(),
            NOW()
        FROM rh.financial_integration_config fic
        WHERE fic.company_id = v_reference_company_id
        ON CONFLICT (company_id) DO UPDATE SET
            config = EXCLUDED.config,
            updated_at = NOW();
        GET DIAGNOSTICS v_copied = ROW_COUNT;
        RAISE NOTICE 'Configuração Integração Financeira: % registros copiados/atualizados', v_copied;
        
        RAISE NOTICE 'Empresa % processada com sucesso!', v_target_company_id;
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CÓPIA CONCLUÍDA PARA TODAS AS EMPRESAS';
    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- VERIFICAÇÃO FINAL - RESUMO DOS DADOS COPIADOS
-- =====================================================
SELECT '=== RESUMO FINAL ===' as etapa;

SELECT 
    'Zonas de Localização' as tabela,
    'Referência' as empresa,
    COUNT(*) as total
FROM rh.location_zones 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Zonas de Localização',
    'ESTRATEGIC',
    COUNT(*)
FROM rh.location_zones 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Zonas de Localização',
    'TECHSTEEL',
    COUNT(*)
FROM rh.location_zones 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Zonas de Localização',
    'SMARTVIEW',
    COUNT(*)
FROM rh.location_zones 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855'
UNION ALL
SELECT 
    'Rubricas',
    'Referência',
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
    'Referência',
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
    'Referência',
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
    'Configurações FGTS',
    'Referência',
    COUNT(*)
FROM rh.fgts_config 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Configurações FGTS',
    'ESTRATEGIC',
    COUNT(*)
FROM rh.fgts_config 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Configurações FGTS',
    'TECHSTEEL',
    COUNT(*)
FROM rh.fgts_config 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Configurações FGTS',
    'SMARTVIEW',
    COUNT(*)
FROM rh.fgts_config 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855'
UNION ALL
SELECT 
    'Integração Financeira',
    'Referência',
    COUNT(*)
FROM rh.financial_integration_config 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Integração Financeira',
    'ESTRATEGIC',
    COUNT(*)
FROM rh.financial_integration_config 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Integração Financeira',
    'TECHSTEEL',
    COUNT(*)
FROM rh.financial_integration_config 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Integração Financeira',
    'SMARTVIEW',
    COUNT(*)
FROM rh.financial_integration_config 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855'
ORDER BY tabela, empresa;

