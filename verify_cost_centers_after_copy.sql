-- Verificação após cópia dos Centros de Custo
SELECT 
    'Referência (AXISENG)' as empresa,
    COUNT(*) as total
FROM public.cost_centers 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'

UNION ALL

SELECT 
    'Empresa 1 (ESTRATEGIC)' as empresa,
    COUNT(*) as total
FROM public.cost_centers 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'

UNION ALL

SELECT 
    'Empresa 2 (TECHSTEEL)' as empresa,
    COUNT(*) as total
FROM public.cost_centers 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'

UNION ALL

SELECT 
    'Empresa 3 (SMARTVIEW)' as empresa,
    COUNT(*) as total
FROM public.cost_centers 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';





