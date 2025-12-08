-- Verificação simples de Centros de Custo
SELECT 
    'Referência' as tipo,
    'dc060329-50cd-4114-922f-624a6ab036d6' as company_id,
    COUNT(*) as total
FROM public.cost_centers
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'

UNION ALL

SELECT 
    'Empresa 1' as tipo,
    'ce390408-1c18-47fc-bd7d-76379ec488b7' as company_id,
    COUNT(*) as total
FROM public.cost_centers
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'

UNION ALL

SELECT 
    'Empresa 2' as tipo,
    'ce92d32f-0503-43ca-b3cc-fb09a462b839' as company_id,
    COUNT(*) as total
FROM public.cost_centers
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'

UNION ALL

SELECT 
    'Empresa 3' as tipo,
    'f83704f6-3278-4d59-81ca-45925a1ab855' as company_id,
    COUNT(*) as total
FROM public.cost_centers
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855'

ORDER BY 
    CASE tipo
        WHEN 'Referência' THEN 1
        WHEN 'Empresa 1' THEN 2
        WHEN 'Empresa 2' THEN 3
        WHEN 'Empresa 3' THEN 4
    END;
