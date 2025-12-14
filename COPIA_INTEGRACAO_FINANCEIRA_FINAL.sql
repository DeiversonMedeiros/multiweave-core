-- =====================================================
-- SCRIPT PARA COPIAR CONFIGURAÇÃO DE INTEGRAÇÃO FINANCEIRA
-- Execute este script no Supabase Studio SQL Editor
-- =====================================================

-- 1. Verificar dados na empresa de referência
SELECT '=== DADOS NA EMPRESA DE REFERÊNCIA ===' as etapa;
SELECT COUNT(*) as total FROM rh.financial_integration_config WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6';
SELECT id, company_id, config, created_at FROM rh.financial_integration_config WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6';

-- 2. Verificar dados ANTES da cópia
SELECT '=== DADOS ANTES DA CÓPIA ===' as etapa;
SELECT 
    'Empresa 1' as empresa,
    COUNT(*) as total
FROM rh.financial_integration_config 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2',
    COUNT(*)
FROM rh.financial_integration_config 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3',
    COUNT(*)
FROM rh.financial_integration_config 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';

-- 3. COPIAR DADOS
-- Nota: A constraint é UNIQUE(company_id), então só pode haver uma configuração por empresa
-- Vamos usar INSERT ... ON CONFLICT DO UPDATE para atualizar se já existir
SELECT '=== COPIANDO DADOS ===' as etapa;

-- Copiar para Empresa 1
INSERT INTO rh.financial_integration_config (company_id, config, created_at, updated_at)
SELECT 
    'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID,
    fic.config,
    NOW(),
    NOW()
FROM rh.financial_integration_config fic
WHERE fic.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
ON CONFLICT (company_id) DO UPDATE SET
    config = EXCLUDED.config,
    updated_at = NOW();

-- Copiar para Empresa 2
INSERT INTO rh.financial_integration_config (company_id, config, created_at, updated_at)
SELECT 
    'ce92d32f-0503-43ca-b3cc-fb09a462b839'::UUID,
    fic.config,
    NOW(),
    NOW()
FROM rh.financial_integration_config fic
WHERE fic.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
ON CONFLICT (company_id) DO UPDATE SET
    config = EXCLUDED.config,
    updated_at = NOW();

-- Copiar para Empresa 3
INSERT INTO rh.financial_integration_config (company_id, config, created_at, updated_at)
SELECT 
    'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID,
    fic.config,
    NOW(),
    NOW()
FROM rh.financial_integration_config fic
WHERE fic.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
ON CONFLICT (company_id) DO UPDATE SET
    config = EXCLUDED.config,
    updated_at = NOW();

-- 4. Verificar dados DEPOIS da cópia
SELECT '=== DADOS DEPOIS DA CÓPIA ===' as etapa;
SELECT 
    'Referência' as empresa,
    COUNT(*) as total
FROM rh.financial_integration_config 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Empresa 1',
    COUNT(*)
FROM rh.financial_integration_config 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2',
    COUNT(*)
FROM rh.financial_integration_config 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3',
    COUNT(*)
FROM rh.financial_integration_config 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';














