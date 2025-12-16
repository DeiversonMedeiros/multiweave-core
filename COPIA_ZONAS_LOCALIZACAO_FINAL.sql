-- =====================================================
-- SCRIPT PARA COPIAR ZONAS DE LOCALIZAÇÃO
-- Execute este script no Supabase Studio SQL Editor
-- =====================================================

-- 1. Verificar dados na empresa de referência
SELECT '=== DADOS NA EMPRESA DE REFERÊNCIA ===' as etapa;
SELECT COUNT(*) as total FROM rh.location_zones WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6';
SELECT id, nome, latitude, longitude, raio_metros, ativo FROM rh.location_zones WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6' ORDER BY nome LIMIT 10;

-- 2. Verificar dados ANTES da cópia
SELECT '=== DADOS ANTES DA CÓPIA ===' as etapa;
SELECT 
    'Empresa 1' as empresa,
    COUNT(*) as total
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

-- 3. COPIAR DADOS
SELECT '=== COPIANDO DADOS ===' as etapa;

-- Copiar para Empresa 1
INSERT INTO rh.location_zones (company_id, nome, descricao, latitude, longitude, raio_metros, ativo, created_at, updated_at)
SELECT 
    'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID,
    nome,
    descricao,
    latitude,
    longitude,
    raio_metros,
    COALESCE(ativo, true),
    NOW(),
    NOW()
FROM rh.location_zones
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
AND NOT EXISTS (
    SELECT 1 FROM rh.location_zones 
    WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7' 
    AND nome = rh.location_zones.nome
);

-- Copiar para Empresa 2
INSERT INTO rh.location_zones (company_id, nome, descricao, latitude, longitude, raio_metros, ativo, created_at, updated_at)
SELECT 
    'ce92d32f-0503-43ca-b3cc-fb09a462b839'::UUID,
    nome,
    descricao,
    latitude,
    longitude,
    raio_metros,
    COALESCE(ativo, true),
    NOW(),
    NOW()
FROM rh.location_zones
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
AND NOT EXISTS (
    SELECT 1 FROM rh.location_zones 
    WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839' 
    AND nome = rh.location_zones.nome
);

-- Copiar para Empresa 3
INSERT INTO rh.location_zones (company_id, nome, descricao, latitude, longitude, raio_metros, ativo, created_at, updated_at)
SELECT 
    'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID,
    nome,
    descricao,
    latitude,
    longitude,
    raio_metros,
    COALESCE(ativo, true),
    NOW(),
    NOW()
FROM rh.location_zones
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
AND NOT EXISTS (
    SELECT 1 FROM rh.location_zones 
    WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855' 
    AND nome = rh.location_zones.nome
);

-- 4. Verificar dados DEPOIS da cópia
SELECT '=== DADOS DEPOIS DA CÓPIA ===' as etapa;
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
















