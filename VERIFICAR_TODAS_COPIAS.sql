-- =====================================================
-- VERIFICAÇÃO FINAL DE TODAS AS CÓPIAS
-- Execute este script no Supabase Studio SQL Editor
-- =====================================================

-- 1. CENTROS DE CUSTO
SELECT '=== CENTROS DE CUSTO ===' as tabela;
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

-- 2. CARGOS
SELECT '=== CARGOS ===' as tabela;
SELECT 
    'Referência' as empresa,
    COUNT(*) as total
FROM rh.positions 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Empresa 1',
    COUNT(*)
FROM rh.positions 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2',
    COUNT(*)
FROM rh.positions 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3',
    COUNT(*)
FROM rh.positions 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';

-- 3. ESCALAS DE TRABALHO
SELECT '=== ESCALAS DE TRABALHO ===' as tabela;
SELECT 
    'Referência' as empresa,
    COUNT(*) as total
FROM rh.work_shifts 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Empresa 1',
    COUNT(*)
FROM rh.work_shifts 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2',
    COUNT(*)
FROM rh.work_shifts 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3',
    COUNT(*)
FROM rh.work_shifts 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';

-- 4. ZONAS DE LOCALIZAÇÃO
SELECT '=== ZONAS DE LOCALIZAÇÃO ===' as tabela;
SELECT 
    'Referência' as empresa,
    COUNT(*) as total
FROM rh.location_zones 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Empresa 1',
    COUNT(*)
FROM rh.location_zones 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2',
    COUNT(*)
FROM rh.location_zones 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3',
    COUNT(*)
FROM rh.location_zones 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';

-- 5. CONFIGURAÇÕES DO BANCO DE HORAS (bank_hours_types)
SELECT '=== CONFIGURAÇÕES DO BANCO DE HORAS ===' as tabela;
SELECT 
    'Referência' as empresa,
    COUNT(*) as total
FROM rh.bank_hours_types 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Empresa 1',
    COUNT(*)
FROM rh.bank_hours_types 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2',
    COUNT(*)
FROM rh.bank_hours_types 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3',
    COUNT(*)
FROM rh.bank_hours_types 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';










