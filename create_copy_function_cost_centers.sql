-- Criar função com SECURITY DEFINER para copiar Centros de Custo
CREATE OR REPLACE FUNCTION public.copy_cost_centers_to_companies()
RETURNS TABLE (
    empresa TEXT,
    registros_copiados BIGINT,
    total_apos_copia BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reference_company_id UUID := 'dc060329-50cd-4114-922f-624a6ab036d6';
    v_ref_count INTEGER;
    v_copied_1 INTEGER := 0;
    v_copied_2 INTEGER := 0;
    v_copied_3 INTEGER := 0;
    v_total_1 INTEGER;
    v_total_2 INTEGER;
    v_total_3 INTEGER;
BEGIN
    -- Verificar quantos registros existem na referência
    SELECT COUNT(*) INTO v_ref_count
    FROM public.cost_centers
    WHERE company_id = v_reference_company_id;
    
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
    SELECT COUNT(*) INTO v_total_1 FROM public.cost_centers WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7';
    
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
    SELECT COUNT(*) INTO v_total_2 FROM public.cost_centers WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839';
    
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
    SELECT COUNT(*) INTO v_total_3 FROM public.cost_centers WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';
    
    -- Retornar resultados
    RETURN QUERY SELECT 'Empresa 1'::TEXT, v_copied_1::BIGINT, v_total_1::BIGINT;
    RETURN QUERY SELECT 'Empresa 2'::TEXT, v_copied_2::BIGINT, v_total_2::BIGINT;
    RETURN QUERY SELECT 'Empresa 3'::TEXT, v_copied_3::BIGINT, v_total_3::BIGINT;
END;
$$;

-- Executar a função
SELECT * FROM public.copy_cost_centers_to_companies();





