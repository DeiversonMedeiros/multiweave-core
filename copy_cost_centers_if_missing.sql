-- Verificar e copiar Centros de Custo que faltam
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
    v_copied_count INTEGER;
BEGIN
    -- Contar registros na empresa de referência
    SELECT COUNT(*) INTO v_ref_count
    FROM public.cost_centers
    WHERE company_id = v_reference_company_id;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CENTROS DE CUSTO';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Empresa de Referência: % registros', v_ref_count;
    RAISE NOTICE '';
    
    -- Loop através das empresas destino
    FOREACH v_target_company_id IN ARRAY v_target_companies
    LOOP
        -- Contar registros na empresa destino
        SELECT COUNT(*) INTO v_target_count
        FROM public.cost_centers
        WHERE company_id = v_target_company_id;
        
        RAISE NOTICE 'Empresa: %', v_target_company_id;
        RAISE NOTICE '  Registros existentes: %', v_target_count;
        
        -- Se não tiver dados ou tiver menos que a referência, copiar
        IF v_target_count = 0 OR v_target_count < v_ref_count THEN
            RAISE NOTICE '  Copiando registros faltantes...';
            
            INSERT INTO public.cost_centers (
                company_id, nome, codigo, ativo, created_at, updated_at
            )
            SELECT 
                v_target_company_id, nome, codigo, ativo, NOW(), NOW()
            FROM public.cost_centers
            WHERE company_id = v_reference_company_id
            AND NOT EXISTS (
                SELECT 1 FROM public.cost_centers 
                WHERE company_id = v_target_company_id 
                AND codigo = public.cost_centers.codigo
            );
            
            GET DIAGNOSTICS v_copied_count = ROW_COUNT;
            RAISE NOTICE '  ✓ % registros copiados', v_copied_count;
            
            -- Verificar total após cópia
            SELECT COUNT(*) INTO v_target_count
            FROM public.cost_centers
            WHERE company_id = v_target_company_id;
            RAISE NOTICE '  Total após cópia: %', v_target_count;
        ELSE
            RAISE NOTICE '  ✓ Já possui todos os dados (% registros)', v_target_count;
        END IF;
        
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICAÇÃO CONCLUÍDA';
    RAISE NOTICE '========================================';
END $$;
















