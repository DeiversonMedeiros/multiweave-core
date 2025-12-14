-- Script para copiar Centros de Custo com bypass de RLS se necessário
DO $$
DECLARE
    v_reference_company_id UUID := 'dc060329-50cd-4114-922f-624a6ab036d6';
    v_ref_count INTEGER;
    v_copied_1 INTEGER;
    v_copied_2 INTEGER;
    v_copied_3 INTEGER;
BEGIN
    -- Verificar quantos registros existem na referência
    SELECT COUNT(*) INTO v_ref_count
    FROM public.cost_centers
    WHERE company_id = v_reference_company_id;
    
    RAISE NOTICE 'Registros na empresa de referência: %', v_ref_count;
    
    IF v_ref_count = 0 THEN
        RAISE EXCEPTION 'Nenhum registro encontrado na empresa de referência!';
    END IF;
    
    -- Copiar para Empresa 1
    INSERT INTO public.cost_centers (company_id, nome, codigo, ativo, created_at, updated_at)
    SELECT 
        'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID,
        nome,
        codigo,
        ativo,
        NOW(),
        NOW()
    FROM public.cost_centers
    WHERE company_id = v_reference_company_id
    ON CONFLICT (company_id, codigo) DO NOTHING;
    
    GET DIAGNOSTICS v_copied_1 = ROW_COUNT;
    RAISE NOTICE 'Empresa 1: % registros copiados', v_copied_1;
    
    -- Copiar para Empresa 2
    INSERT INTO public.cost_centers (company_id, nome, codigo, ativo, created_at, updated_at)
    SELECT 
        'ce92d32f-0503-43ca-b3cc-fb09a462b839'::UUID,
        nome,
        codigo,
        ativo,
        NOW(),
        NOW()
    FROM public.cost_centers
    WHERE company_id = v_reference_company_id
    ON CONFLICT (company_id, codigo) DO NOTHING;
    
    GET DIAGNOSTICS v_copied_2 = ROW_COUNT;
    RAISE NOTICE 'Empresa 2: % registros copiados', v_copied_2;
    
    -- Copiar para Empresa 3
    INSERT INTO public.cost_centers (company_id, nome, codigo, ativo, created_at, updated_at)
    SELECT 
        'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID,
        nome,
        codigo,
        ativo,
        NOW(),
        NOW()
    FROM public.cost_centers
    WHERE company_id = v_reference_company_id
    ON CONFLICT (company_id, codigo) DO NOTHING;
    
    GET DIAGNOSTICS v_copied_3 = ROW_COUNT;
    RAISE NOTICE 'Empresa 3: % registros copiados', v_copied_3;
    
    RAISE NOTICE 'Total copiado: Empresa 1: %, Empresa 2: %, Empresa 3: %', v_copied_1, v_copied_2, v_copied_3;
END $$;

-- Verificação final
SELECT 
    'Referência' as empresa,
    COUNT(*) as total
FROM public.cost_centers 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Empresa 1',
    COUNT(*)
FROM public.cost_centers 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2',
    COUNT(*)
FROM public.cost_centers 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3',
    COUNT(*)
FROM public.cost_centers 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';














