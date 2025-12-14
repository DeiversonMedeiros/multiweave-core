-- =====================================================
-- SCRIPT CORRIGIDO PARA COPIAR CONFIGURAÇÕES DO BANCO DE HORAS
-- O campo 'code' tem constraint UNIQUE global, então precisamos gerar códigos únicos
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

-- 3. COPIAR DADOS - Empresa 2 (TECHSTEEL)
-- Gerando códigos únicos baseados no código original + sufixo da empresa
SELECT '=== COPIANDO PARA EMPRESA 2 (TECHSTEEL) ===' as etapa;

INSERT INTO rh.bank_hours_types (
    company_id, name, description, code, has_bank_hours,
    accumulation_period_months, max_accumulation_hours, compensation_rate,
    auto_compensate, compensation_priority, expires_after_months,
    allow_negative_balance, is_active, is_default, created_at, updated_at
)
SELECT 
    'ce92d32f-0503-43ca-b3cc-fb09a462b839'::UUID,
    bht.name,
    bht.description,
    CASE 
        WHEN bht.code IS NOT NULL THEN 
            -- Gera código único: código original + sufixo baseado nos últimos 4 caracteres do company_id
            SUBSTRING(bht.code, 1, 16) || '-TS'
        ELSE NULL
    END as code,
    COALESCE(bht.has_bank_hours, true),
    bht.accumulation_period_months,
    bht.max_accumulation_hours,
    bht.compensation_rate,
    COALESCE(bht.auto_compensate, false),
    bht.compensation_priority,
    bht.expires_after_months,
    COALESCE(bht.allow_negative_balance, false),
    COALESCE(bht.is_active, true),
    bht.is_default,
    NOW(),
    NOW()
FROM rh.bank_hours_types bht
WHERE bht.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
AND NOT EXISTS (
    SELECT 1 FROM rh.bank_hours_types bht2
    WHERE bht2.company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
    AND bht2.name = bht.name
);

-- 4. COPIAR DADOS - Empresa 3 (SMARTVIEW)
-- Gerando códigos únicos baseados no código original + sufixo da empresa
SELECT '=== COPIANDO PARA EMPRESA 3 (SMARTVIEW) ===' as etapa;

INSERT INTO rh.bank_hours_types (
    company_id, name, description, code, has_bank_hours,
    accumulation_period_months, max_accumulation_hours, compensation_rate,
    auto_compensate, compensation_priority, expires_after_months,
    allow_negative_balance, is_active, is_default, created_at, updated_at
)
SELECT 
    'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID,
    bht.name,
    bht.description,
    CASE 
        WHEN bht.code IS NOT NULL THEN 
            -- Gera código único: código original + sufixo baseado nos últimos 4 caracteres do company_id
            SUBSTRING(bht.code, 1, 16) || '-SV'
        ELSE NULL
    END as code,
    COALESCE(bht.has_bank_hours, true),
    bht.accumulation_period_months,
    bht.max_accumulation_hours,
    bht.compensation_rate,
    COALESCE(bht.auto_compensate, false),
    bht.compensation_priority,
    bht.expires_after_months,
    COALESCE(bht.allow_negative_balance, false),
    COALESCE(bht.is_active, true),
    bht.is_default,
    NOW(),
    NOW()
FROM rh.bank_hours_types bht
WHERE bht.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
AND NOT EXISTS (
    SELECT 1 FROM rh.bank_hours_types bht2
    WHERE bht2.company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855'
    AND bht2.name = bht.name
);

-- 5. Verificar dados DEPOIS da cópia
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

-- 6. Mostrar registros copiados
SELECT '=== REGISTROS COPIADOS (Empresa 2 - TECHSTEEL) ===' as etapa;
SELECT id, name, code, is_default, is_active FROM rh.bank_hours_types 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839' 
ORDER BY name;

SELECT '=== REGISTROS COPIADOS (Empresa 3 - SMARTVIEW) ===' as etapa;
SELECT id, name, code, is_default, is_active FROM rh.bank_hours_types 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855' 
ORDER BY name;














