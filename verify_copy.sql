-- Script de verificação da cópia de dados
-- Verifica quantos registros foram copiados para cada empresa

DO $$
DECLARE
    v_reference_company_id UUID := 'dc060329-50cd-4114-922f-624a6ab036d6';
    v_target_companies UUID[] := ARRAY[
        'ce390408-1c18-47fc-bd7d-76379ec488b7',
        'ce92d32f-0503-43ca-b3cc-fb09a462b839',
        'f83704f6-3278-4d59-81ca-45925a1ab855'
    ];
    v_target_company_id UUID;
    v_ref_count INTEGER;
    v_target_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICAÇÃO DE CÓPIA DE DADOS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- Verificar empresa de referência
    RAISE NOTICE 'EMPRESA DE REFERÊNCIA: %', v_reference_company_id;
    RAISE NOTICE '';
    
    -- Centros de Custo
    SELECT COUNT(*) INTO v_ref_count FROM public.cost_centers WHERE company_id = v_reference_company_id;
    RAISE NOTICE 'Centros de Custo (referência): %', v_ref_count;
    
    -- Cargos
    SELECT COUNT(*) INTO v_ref_count FROM rh.positions WHERE company_id = v_reference_company_id;
    RAISE NOTICE 'Cargos (referência): %', v_ref_count;
    
    -- Escalas de Trabalho
    SELECT COUNT(*) INTO v_ref_count FROM rh.work_shifts WHERE company_id = v_reference_company_id;
    RAISE NOTICE 'Escalas de Trabalho (referência): %', v_ref_count;
    
    -- Zonas de Localização
    SELECT COUNT(*) INTO v_ref_count FROM rh.location_zones WHERE company_id = v_reference_company_id;
    RAISE NOTICE 'Zonas de Localização (referência): %', v_ref_count;
    
    -- Rubricas
    SELECT COUNT(*) INTO v_ref_count FROM rh.rubricas WHERE company_id = v_reference_company_id;
    RAISE NOTICE 'Rubricas (referência): %', v_ref_count;
    
    -- Faixas INSS
    SELECT COUNT(*) INTO v_ref_count FROM rh.inss_brackets WHERE company_id = v_reference_company_id;
    RAISE NOTICE 'Faixas INSS (referência): %', v_ref_count;
    
    -- Faixas IRRF
    SELECT COUNT(*) INTO v_ref_count FROM rh.irrf_brackets WHERE company_id = v_reference_company_id;
    RAISE NOTICE 'Faixas IRRF (referência): %', v_ref_count;
    
    -- Configurações FGTS
    SELECT COUNT(*) INTO v_ref_count FROM rh.fgts_config WHERE company_id = v_reference_company_id;
    RAISE NOTICE 'Configurações FGTS (referência): %', v_ref_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- Verificar empresas destino
    FOREACH v_target_company_id IN ARRAY v_target_companies
    LOOP
        RAISE NOTICE 'EMPRESA DESTINO: %', v_target_company_id;
        
        -- Centros de Custo
        SELECT COUNT(*) INTO v_target_count FROM public.cost_centers WHERE company_id = v_target_company_id;
        RAISE NOTICE '  Centros de Custo: %', v_target_count;
        
        -- Cargos
        SELECT COUNT(*) INTO v_target_count FROM rh.positions WHERE company_id = v_target_company_id;
        RAISE NOTICE '  Cargos: %', v_target_count;
        
        -- Escalas de Trabalho
        SELECT COUNT(*) INTO v_target_count FROM rh.work_shifts WHERE company_id = v_target_company_id;
        RAISE NOTICE '  Escalas de Trabalho: %', v_target_count;
        
        -- Zonas de Localização
        SELECT COUNT(*) INTO v_target_count FROM rh.location_zones WHERE company_id = v_target_company_id;
        RAISE NOTICE '  Zonas de Localização: %', v_target_count;
        
        -- Rubricas
        SELECT COUNT(*) INTO v_target_count FROM rh.rubricas WHERE company_id = v_target_company_id;
        RAISE NOTICE '  Rubricas: %', v_target_count;
        
        -- Faixas INSS
        SELECT COUNT(*) INTO v_target_count FROM rh.inss_brackets WHERE company_id = v_target_company_id;
        RAISE NOTICE '  Faixas INSS: %', v_target_count;
        
        -- Faixas IRRF
        SELECT COUNT(*) INTO v_target_count FROM rh.irrf_brackets WHERE company_id = v_target_company_id;
        RAISE NOTICE '  Faixas IRRF: %', v_target_count;
        
        -- Configurações FGTS
        SELECT COUNT(*) INTO v_target_count FROM rh.fgts_config WHERE company_id = v_target_company_id;
        RAISE NOTICE '  Configurações FGTS: %', v_target_count;
        
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICAÇÃO CONCLUÍDA';
    RAISE NOTICE '========================================';
    
END $$;
















