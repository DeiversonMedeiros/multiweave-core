-- =====================================================
-- SCRIPT PARA COPIAR BENEFÍCIOS (benefit_configurations)
-- Execute este script no Supabase Studio SQL Editor
-- =====================================================

-- 1. Verificar dados na empresa de referência
SELECT '=== DADOS NA EMPRESA DE REFERÊNCIA ===' as etapa;
SELECT COUNT(*) as total FROM rh.benefit_configurations WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6';
SELECT id, name, benefit_type, calculation_type, base_value, is_active FROM rh.benefit_configurations WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6' ORDER BY name LIMIT 10;

-- 2. Verificar dados ANTES da cópia
SELECT '=== DADOS ANTES DA CÓPIA ===' as etapa;
SELECT 
    'Empresa 1' as empresa,
    COUNT(*) as total
FROM rh.benefit_configurations 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2',
    COUNT(*)
FROM rh.benefit_configurations 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3',
    COUNT(*)
FROM rh.benefit_configurations 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';

-- 3. COPIAR DADOS
SELECT '=== COPIANDO DADOS ===' as etapa;

-- Copiar para Empresa 1 (ESTRATEGIC CONSTRUTORA)
INSERT INTO rh.benefit_configurations (
    company_id, benefit_type, name, description, calculation_type,
    base_value, percentage_value, min_value, max_value,
    daily_calculation_base, requires_approval, is_active,
    entra_no_calculo_folha, created_at, updated_at
)
SELECT 
    'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID,
    b.benefit_type,
    b.name,
    b.description,
    b.calculation_type,
    b.base_value,
    b.percentage_value,
    b.min_value,
    b.max_value,
    COALESCE(b.daily_calculation_base, 30),
    COALESCE(b.requires_approval, false),
    COALESCE(b.is_active, true),
    COALESCE(b.entra_no_calculo_folha, true),
    NOW(),
    NOW()
FROM rh.benefit_configurations b
WHERE b.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
AND NOT EXISTS (
    SELECT 1 FROM rh.benefit_configurations 
    WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7' 
    AND name = b.name
    AND benefit_type = b.benefit_type
);

-- Copiar para Empresa 2 (TECHSTEEL METAL)
INSERT INTO rh.benefit_configurations (
    company_id, benefit_type, name, description, calculation_type,
    base_value, percentage_value, min_value, max_value,
    daily_calculation_base, requires_approval, is_active,
    entra_no_calculo_folha, created_at, updated_at
)
SELECT 
    'ce92d32f-0503-43ca-b3cc-fb09a462b839'::UUID,
    b.benefit_type,
    b.name,
    b.description,
    b.calculation_type,
    b.base_value,
    b.percentage_value,
    b.min_value,
    b.max_value,
    COALESCE(b.daily_calculation_base, 30),
    COALESCE(b.requires_approval, false),
    COALESCE(b.is_active, true),
    COALESCE(b.entra_no_calculo_folha, true),
    NOW(),
    NOW()
FROM rh.benefit_configurations b
WHERE b.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
AND NOT EXISTS (
    SELECT 1 FROM rh.benefit_configurations 
    WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839' 
    AND name = b.name
    AND benefit_type = b.benefit_type
);

-- Copiar para Empresa 3 (SMARTVIEW RENT)
INSERT INTO rh.benefit_configurations (
    company_id, benefit_type, name, description, calculation_type,
    base_value, percentage_value, min_value, max_value,
    daily_calculation_base, requires_approval, is_active,
    entra_no_calculo_folha, created_at, updated_at
)
SELECT 
    'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID,
    b.benefit_type,
    b.name,
    b.description,
    b.calculation_type,
    b.base_value,
    b.percentage_value,
    b.min_value,
    b.max_value,
    COALESCE(b.daily_calculation_base, 30),
    COALESCE(b.requires_approval, false),
    COALESCE(b.is_active, true),
    COALESCE(b.entra_no_calculo_folha, true),
    NOW(),
    NOW()
FROM rh.benefit_configurations b
WHERE b.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
AND NOT EXISTS (
    SELECT 1 FROM rh.benefit_configurations 
    WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855' 
    AND name = b.name
    AND benefit_type = b.benefit_type
);

-- 4. Verificar dados DEPOIS da cópia
SELECT '=== DADOS DEPOIS DA CÓPIA ===' as etapa;
SELECT 
    'Referência (AXISENG)' as empresa,
    COUNT(*) as total
FROM rh.benefit_configurations 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Empresa 1 (ESTRATEGIC)',
    COUNT(*)
FROM rh.benefit_configurations 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2 (TECHSTEEL)',
    COUNT(*)
FROM rh.benefit_configurations 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3 (SMARTVIEW)',
    COUNT(*)
FROM rh.benefit_configurations 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';

-- 5. Detalhamento dos benefícios copiados
SELECT '=== DETALHAMENTO DOS BENEFÍCIOS COPIADOS ===' as etapa;
SELECT 
    company_id,
    name,
    benefit_type,
    calculation_type,
    base_value,
    is_active,
    entra_no_calculo_folha
FROM rh.benefit_configurations 
WHERE company_id IN (
    'ce390408-1c18-47fc-bd7d-76379ec488b7',
    'ce92d32f-0503-43ca-b3cc-fb09a462b839',
    'f83704f6-3278-4d59-81ca-45925a1ab855'
)
ORDER BY company_id, name;
