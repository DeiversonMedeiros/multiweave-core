-- =====================================================
-- SCRIPT PARA REMOVER DUPLICATAS DE CONFIGURACOES FGTS
-- Mantem apenas os registros mais recentes
-- =====================================================

DO $$
DECLARE
    v_target_companies UUID[] := ARRAY[
        'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID,
        'ce92d32f-0503-43ca-b3cc-fb09a462b839'::UUID,
        'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID
    ];
    v_target_company_id UUID;
    v_deleted INTEGER;
BEGIN
    FOREACH v_target_company_id IN ARRAY v_target_companies
    LOOP
        -- Remover duplicatas, mantendo apenas o registro mais recente
        DELETE FROM rh.fgts_config
        WHERE company_id = v_target_company_id
        AND id NOT IN (
            SELECT DISTINCT ON (codigo, ano_vigencia, mes_vigencia, COALESCE(tipo_contrato, ''))
                id
            FROM rh.fgts_config
            WHERE company_id = v_target_company_id
            ORDER BY codigo, ano_vigencia, mes_vigencia, COALESCE(tipo_contrato, ''), created_at DESC
        );
        
        GET DIAGNOSTICS v_deleted = ROW_COUNT;
        RAISE NOTICE 'Empresa %: % duplicatas removidas', v_target_company_id, v_deleted;
    END LOOP;
END $$;

-- Verificacao final
SELECT 
    CASE company_id
        WHEN 'dc060329-50cd-4114-922f-624a6ab036d6' THEN 'Referencia (AXISENG)'
        WHEN 'ce390408-1c18-47fc-bd7d-76379ec488b7' THEN 'ESTRATEGIC'
        WHEN 'ce92d32f-0503-43ca-b3cc-fb09a462b839' THEN 'TECHSTEEL'
        WHEN 'f83704f6-3278-4d59-81ca-45925a1ab855' THEN 'SMARTVIEW'
    END as empresa,
    COUNT(*) as total_registros,
    COUNT(DISTINCT codigo) as codigos_distintos
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

