-- =====================================================
-- SCRIPT FINAL PARA COPIAR CENTROS DE CUSTO
-- Execute este script no Supabase Studio SQL Editor
-- =====================================================

-- 1. Verificar dados na empresa de referência
SELECT '=== DADOS NA EMPRESA DE REFERÊNCIA ===' as etapa;
SELECT COUNT(*) as total FROM public.cost_centers WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6';
SELECT id, nome, codigo, ativo FROM public.cost_centers WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6' ORDER BY codigo;

-- 2. Verificar dados ANTES da cópia
SELECT '=== DADOS ANTES DA CÓPIA ===' as etapa;
SELECT 
    'Empresa 1' as empresa,
    COUNT(*) as total
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

-- 3. COPIAR DADOS
SELECT '=== COPIANDO DADOS ===' as etapa;

-- Copiar para Empresa 1
INSERT INTO public.cost_centers (company_id, nome, codigo, ativo, created_at, updated_at)
SELECT 
    'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID,
    nome,
    codigo,
    COALESCE(ativo, true),
    NOW(),
    NOW()
FROM public.cost_centers
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
ON CONFLICT (company_id, codigo) DO NOTHING;

-- Copiar para Empresa 2
INSERT INTO public.cost_centers (company_id, nome, codigo, ativo, created_at, updated_at)
SELECT 
    'ce92d32f-0503-43ca-b3cc-fb09a462b839'::UUID,
    nome,
    codigo,
    COALESCE(ativo, true),
    NOW(),
    NOW()
FROM public.cost_centers
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
ON CONFLICT (company_id, codigo) DO NOTHING;

-- Copiar para Empresa 3
INSERT INTO public.cost_centers (company_id, nome, codigo, ativo, created_at, updated_at)
SELECT 
    'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID,
    nome,
    codigo,
    COALESCE(ativo, true),
    NOW(),
    NOW()
FROM public.cost_centers
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
ON CONFLICT (company_id, codigo) DO NOTHING;

-- 4. Verificar dados DEPOIS da cópia
SELECT '=== DADOS DEPOIS DA CÓPIA ===' as etapa;
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

-- 5. Mostrar alguns registros copiados
SELECT '=== EXEMPLO DE REGISTROS COPIADOS (Empresa 1) ===' as etapa;
SELECT id, nome, codigo, ativo FROM public.cost_centers 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7' 
ORDER BY codigo 
LIMIT 10;






