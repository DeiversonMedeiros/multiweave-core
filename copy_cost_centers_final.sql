-- Copiar Centros de Custo usando ON CONFLICT
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
    v_target_count_before INTEGER;
    v_target_count_after INTEGER;
    v_copied_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CÓPIA DE CENTROS DE CUSTO';
    RAISE NOTICE '========================================';
    
    -- Contar registros na empresa de referência
    SELECT COUNT(*) INTO v_ref_count
    FROM public.cost_centers
    WHERE company_id = v_reference_company_id;
    
    RAISE NOTICE 'Empresa de Referência (AXISENG LTDA): % registros', v_ref_count;
    RAISE NOTICE '';
    
    IF v_ref_count = 0 THEN
        RAISE EXCEPTION 'Nenhum centro de custo encontrado na empresa de referência!';
    END IF;
    
    -- Loop através das empresas destino
    FOREACH v_target_company_id IN ARRAY v_target_companies
    LOOP
        -- Contar registros antes da cópia
        SELECT COUNT(*) INTO v_target_count_before
        FROM public.cost_centers
        WHERE company_id = v_target_company_id;
        
        RAISE NOTICE '----------------------------------------';
        RAISE NOTICE 'Processando empresa: %', v_target_company_id;
        RAISE NOTICE 'Registros antes: %', v_target_count_before;
        
        -- Copiar usando ON CONFLICT para evitar duplicatas
        INSERT INTO public.cost_centers (
            company_id, nome, codigo, ativo, created_at, updated_at
        )
        SELECT 
            v_target_company_id, nome, codigo, ativo, NOW(), NOW()
        FROM public.cost_centers
        WHERE company_id = v_reference_company_id
        ON CONFLICT (company_id, codigo) DO NOTHING;
        
        GET DIAGNOSTICS v_copied_count = ROW_COUNT;
        
        -- Contar registros após a cópia
        SELECT COUNT(*) INTO v_target_count_after
        FROM public.cost_centers
        WHERE company_id = v_target_company_id;
        
        RAISE NOTICE 'Registros copiados: %', v_copied_count;
        RAISE NOTICE 'Registros após cópia: %', v_target_count_after;
        
        IF v_target_count_after < v_ref_count THEN
            RAISE WARNING 'ATENÇÃO: Ainda faltam % registros!', (v_ref_count - v_target_count_after);
        ELSE
            RAISE NOTICE '✓ Todos os registros foram copiados com sucesso!';
        END IF;
        
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CÓPIA CONCLUÍDA';
    RAISE NOTICE '========================================';
END $$;
















