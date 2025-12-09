-- Função para verificar status da cópia
CREATE OR REPLACE FUNCTION public.get_copy_status(
    p_reference_company_id UUID,
    p_target_company_id UUID
)
RETURNS TABLE (
    tabela TEXT,
    referencia_count BIGINT,
    destino_count BIGINT,
    faltando BIGINT,
    status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH ref_data AS (
        SELECT 'Centros de Custo' as t, COUNT(*)::BIGINT as cnt FROM public.cost_centers WHERE company_id = p_reference_company_id
        UNION ALL SELECT 'Cargos', COUNT(*)::BIGINT FROM rh.positions WHERE company_id = p_reference_company_id
        UNION ALL SELECT 'Escalas de Trabalho', COUNT(*)::BIGINT FROM rh.work_shifts WHERE company_id = p_reference_company_id
        UNION ALL SELECT 'Zonas de Localização', COUNT(*)::BIGINT FROM rh.location_zones WHERE company_id = p_reference_company_id
        UNION ALL SELECT 'Rubricas', COUNT(*)::BIGINT FROM rh.rubricas WHERE company_id = p_reference_company_id
        UNION ALL SELECT 'Faixas INSS', COUNT(*)::BIGINT FROM rh.inss_brackets WHERE company_id = p_reference_company_id
        UNION ALL SELECT 'Faixas IRRF', COUNT(*)::BIGINT FROM rh.irrf_brackets WHERE company_id = p_reference_company_id
        UNION ALL SELECT 'Configurações FGTS', COUNT(*)::BIGINT FROM rh.fgts_config WHERE company_id = p_reference_company_id
    ),
    dest_data AS (
        SELECT 'Centros de Custo' as t, COUNT(*)::BIGINT as cnt FROM public.cost_centers WHERE company_id = p_target_company_id
        UNION ALL SELECT 'Cargos', COUNT(*)::BIGINT FROM rh.positions WHERE company_id = p_target_company_id
        UNION ALL SELECT 'Escalas de Trabalho', COUNT(*)::BIGINT FROM rh.work_shifts WHERE company_id = p_target_company_id
        UNION ALL SELECT 'Zonas de Localização', COUNT(*)::BIGINT FROM rh.location_zones WHERE company_id = p_target_company_id
        UNION ALL SELECT 'Rubricas', COUNT(*)::BIGINT FROM rh.rubricas WHERE company_id = p_target_company_id
        UNION ALL SELECT 'Faixas INSS', COUNT(*)::BIGINT FROM rh.inss_brackets WHERE company_id = p_target_company_id
        UNION ALL SELECT 'Faixas IRRF', COUNT(*)::BIGINT FROM rh.irrf_brackets WHERE company_id = p_target_company_id
        UNION ALL SELECT 'Configurações FGTS', COUNT(*)::BIGINT FROM rh.fgts_config WHERE company_id = p_target_company_id
    )
    SELECT 
        r.t as tabela,
        r.cnt as referencia_count,
        COALESCE(d.cnt, 0) as destino_count,
        GREATEST(0, r.cnt - COALESCE(d.cnt, 0)) as faltando,
        CASE 
            WHEN r.cnt > COALESCE(d.cnt, 0) THEN 'FALTANDO'
            ELSE 'OK'
        END as status
    FROM ref_data r
    LEFT JOIN dest_data d ON r.t = d.t
    ORDER BY r.t;
END;
$$;

-- Executar verificação para cada empresa
SELECT 'Empresa 1: ce390408-1c18-47fc-bd7d-76379ec488b7' as info;
SELECT * FROM public.get_copy_status(
    'dc060329-50cd-4114-922f-624a6ab036d6'::UUID,
    'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID
);

SELECT 'Empresa 2: ce92d32f-0503-43ca-b3cc-fb09a462b839' as info;
SELECT * FROM public.get_copy_status(
    'dc060329-50cd-4114-922f-624a6ab036d6'::UUID,
    'ce92d32f-0503-43ca-b3cc-fb09a462b839'::UUID
);

SELECT 'Empresa 3: f83704f6-3278-4d59-81ca-45925a1ab855' as info;
SELECT * FROM public.get_copy_status(
    'dc060329-50cd-4114-922f-624a6ab036d6'::UUID,
    'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID
);







