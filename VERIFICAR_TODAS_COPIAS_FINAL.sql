-- =====================================================
-- SCRIPT DE VERIFICAÇÃO COMPLETA DE TODAS AS CÓPIAS
-- Execute este script no Supabase Studio SQL Editor
-- =====================================================

-- Empresa de Referência: dc060329-50cd-4114-922f-624a6ab036d6 (AXISENG LTDA)
-- Empresas Destino:
--   - ce390408-1c18-47fc-bd7d-76379ec488b7 (ESTRATEGIC)
--   - ce92d32f-0503-43ca-b3cc-fb09a462b839 (TECHSTEEL)
--   - f83704f6-3278-4d59-81ca-45925a1ab855 (SMARTVIEW)

-- 1. CENTROS DE CUSTO
SELECT '=== CENTROS DE CUSTO ===' as tipo;
SELECT 
    'Referência' as empresa,
    COUNT(*) as total
FROM public.cost_centers 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Empresa 1 (ESTRATEGIC)',
    COUNT(*)
FROM public.cost_centers 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2 (TECHSTEEL)',
    COUNT(*)
FROM public.cost_centers 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3 (SMARTVIEW)',
    COUNT(*)
FROM public.cost_centers 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';

-- 2. CARGOS
SELECT '=== CARGOS ===' as tipo;
SELECT 
    'Referência' as empresa,
    COUNT(*) as total
FROM rh.positions 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Empresa 1 (ESTRATEGIC)',
    COUNT(*)
FROM rh.positions 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2 (TECHSTEEL)',
    COUNT(*)
FROM rh.positions 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3 (SMARTVIEW)',
    COUNT(*)
FROM rh.positions 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';

-- 3. ESCALAS DE TRABALHO
SELECT '=== ESCALAS DE TRABALHO ===' as tipo;
SELECT 
    'Referência' as empresa,
    COUNT(*) as total
FROM rh.work_shifts 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Empresa 1 (ESTRATEGIC)',
    COUNT(*)
FROM rh.work_shifts 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2 (TECHSTEEL)',
    COUNT(*)
FROM rh.work_shifts 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3 (SMARTVIEW)',
    COUNT(*)
FROM rh.work_shifts 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';

-- 4. ZONAS DE LOCALIZAÇÃO
SELECT '=== ZONAS DE LOCALIZAÇÃO ===' as tipo;
SELECT 
    'Referência' as empresa,
    COUNT(*) as total
FROM rh.location_zones 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Empresa 1 (ESTRATEGIC)',
    COUNT(*)
FROM rh.location_zones 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2 (TECHSTEEL)',
    COUNT(*)
FROM rh.location_zones 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3 (SMARTVIEW)',
    COUNT(*)
FROM rh.location_zones 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';

-- 5. CONFIGURAÇÕES DO BANCO DE HORAS
SELECT '=== CONFIGURAÇÕES DO BANCO DE HORAS ===' as tipo;
SELECT 
    'Referência' as empresa,
    COUNT(*) as total
FROM rh.bank_hours_types 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Empresa 1 (ESTRATEGIC)',
    COUNT(*)
FROM rh.bank_hours_types 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2 (TECHSTEEL)',
    COUNT(*)
FROM rh.bank_hours_types 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3 (SMARTVIEW)',
    COUNT(*)
FROM rh.bank_hours_types 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';

-- 6. RUBRICAS
SELECT '=== RUBRICAS ===' as tipo;
SELECT 
    'Referência' as empresa,
    COUNT(*) as total
FROM rh.rubricas 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Empresa 1 (ESTRATEGIC)',
    COUNT(*)
FROM rh.rubricas 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2 (TECHSTEEL)',
    COUNT(*)
FROM rh.rubricas 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3 (SMARTVIEW)',
    COUNT(*)
FROM rh.rubricas 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';

-- 7. FAIXAS INSS
SELECT '=== FAIXAS INSS ===' as tipo;
SELECT 
    'Referência' as empresa,
    COUNT(*) as total
FROM rh.inss_brackets 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Empresa 1 (ESTRATEGIC)',
    COUNT(*)
FROM rh.inss_brackets 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2 (TECHSTEEL)',
    COUNT(*)
FROM rh.inss_brackets 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3 (SMARTVIEW)',
    COUNT(*)
FROM rh.inss_brackets 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';

-- 8. FAIXAS IRRF
SELECT '=== FAIXAS IRRF ===' as tipo;
SELECT 
    'Referência' as empresa,
    COUNT(*) as total
FROM rh.irrf_brackets 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Empresa 1 (ESTRATEGIC)',
    COUNT(*)
FROM rh.irrf_brackets 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2 (TECHSTEEL)',
    COUNT(*)
FROM rh.irrf_brackets 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3 (SMARTVIEW)',
    COUNT(*)
FROM rh.irrf_brackets 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';

-- 9. CONFIGURAÇÕES FGTS
SELECT '=== CONFIGURAÇÕES FGTS ===' as tipo;
SELECT 
    'Referência' as empresa,
    COUNT(*) as total
FROM rh.fgts_config 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Empresa 1 (ESTRATEGIC)',
    COUNT(*)
FROM rh.fgts_config 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2 (TECHSTEEL)',
    COUNT(*)
FROM rh.fgts_config 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3 (SMARTVIEW)',
    COUNT(*)
FROM rh.fgts_config 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';

-- 10. CONFIGURAÇÃO DE INTEGRAÇÃO FINANCEIRA
SELECT '=== CONFIGURAÇÃO DE INTEGRAÇÃO FINANCEIRA ===' as tipo;
SELECT 
    'Referência' as empresa,
    COUNT(*) as total
FROM rh.financial_integration_config 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Empresa 1 (ESTRATEGIC)',
    COUNT(*)
FROM rh.financial_integration_config 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2 (TECHSTEEL)',
    COUNT(*)
FROM rh.financial_integration_config 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3 (SMARTVIEW)',
    COUNT(*)
FROM rh.financial_integration_config 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';










