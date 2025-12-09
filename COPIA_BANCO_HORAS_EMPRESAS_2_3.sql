-- =====================================================
-- COPIAR CONFIGURAÇÕES DO BANCO DE HORAS PARA EMPRESAS 2 E 3
-- Execute este script no Supabase Studio SQL Editor
-- =====================================================

-- 1. Verificar dados na empresa de referência
SELECT '=== DADOS NA EMPRESA DE REFERÊNCIA ===' as etapa;
SELECT COUNT(*) as total FROM rh.bank_hours_types WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6';
SELECT id, name, code, is_default, is_active FROM rh.bank_hours_types WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6' ORDER BY name;

-- 2. Verificar dados ANTES da cópia
SELECT '=== DADOS ANTES DA CÓPIA ===' as etapa;
SELECT 
    'Empresa 2 (TECHSTEEL)' as empresa,
    COUNT(*) as total
FROM rh.bank_hours_types 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3 (SMARTVIEW)',
    COUNT(*)
FROM rh.bank_hours_types 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';

-- 3. COPIAR DADOS
SELECT '=== COPIANDO DADOS ===' as etapa;

-- Copiar para Empresa 2 (TECHSTEEL)
INSERT INTO rh.bank_hours_types (
    company_id, name, description, code, has_bank_hours,
    accumulation_period_months, max_accumulation_hours, compensation_rate,
    auto_compensate, compensation_priority, expires_after_months,
    allow_negative_balance, is_active, is_default, created_at, updated_at
)
SELECT 
    'ce92d32f-0503-43ca-b3cc-fb09a462b839'::UUID,
    name,
    description,
    code,
    COALESCE(has_bank_hours, true),
    accumulation_period_months,
    max_accumulation_hours,
    compensation_rate,
    COALESCE(auto_compensate, false),
    compensation_priority,
    expires_after_months,
    COALESCE(allow_negative_balance, false),
    COALESCE(is_active, true),
    is_default,
    NOW(),
    NOW()
FROM rh.bank_hours_types
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
ON CONFLICT (company_id, code) DO NOTHING;

-- Copiar para Empresa 3 (SMARTVIEW)
INSERT INTO rh.bank_hours_types (
    company_id, name, description, code, has_bank_hours,
    accumulation_period_months, max_accumulation_hours, compensation_rate,
    auto_compensate, compensation_priority, expires_after_months,
    allow_negative_balance, is_active, is_default, created_at, updated_at
)
SELECT 
    'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID,
    name,
    description,
    code,
    COALESCE(has_bank_hours, true),
    accumulation_period_months,
    max_accumulation_hours,
    compensation_rate,
    COALESCE(auto_compensate, false),
    compensation_priority,
    expires_after_months,
    COALESCE(allow_negative_balance, false),
    COALESCE(is_active, true),
    is_default,
    NOW(),
    NOW()
FROM rh.bank_hours_types
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
ON CONFLICT (company_id, code) DO NOTHING;

-- 4. Verificar dados DEPOIS da cópia
SELECT '=== DADOS DEPOIS DA CÓPIA ===' as etapa;
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

-- 5. Mostrar registros copiados
SELECT '=== REGISTROS COPIADOS (Empresa 2) ===' as etapa;
SELECT id, name, code, is_default, is_active FROM rh.bank_hours_types 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839' 
ORDER BY name;

SELECT '=== REGISTROS COPIADOS (Empresa 3) ===' as etapa;
SELECT id, name, code, is_default, is_active FROM rh.bank_hours_types 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855' 
ORDER BY name;







