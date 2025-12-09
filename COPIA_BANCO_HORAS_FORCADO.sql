-- Copiar Banco de Horas de forma forçada para Empresas 2 e 3
-- Empresa 2 (TECHSTEEL)
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
    bht.code,
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
    AND (
        (bht.code IS NOT NULL AND bht2.code IS NOT NULL AND bht2.code = bht.code)
        OR (bht.code IS NULL AND bht2.code IS NULL AND bht2.name = bht.name)
    )
);

-- Empresa 3 (SMARTVIEW)
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
    bht.code,
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
    AND (
        (bht.code IS NOT NULL AND bht2.code IS NOT NULL AND bht2.code = bht.code)
        OR (bht.code IS NULL AND bht2.code IS NULL AND bht2.name = bht.name)
    )
);

-- Verificação
SELECT 
    'Referência' as empresa,
    COUNT(*) as total
FROM rh.bank_hours_types 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
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






