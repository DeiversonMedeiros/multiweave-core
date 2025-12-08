-- =====================================================
-- SCRIPT PARA COPIAR FAIXAS IRRF
-- Execute este script no Supabase Studio SQL Editor
-- =====================================================

-- 1. Verificar dados na empresa de referência
SELECT '=== DADOS NA EMPRESA DE REFERÊNCIA ===' as etapa;
SELECT COUNT(*) as total FROM rh.irrf_brackets WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6';
SELECT id, codigo, descricao, ano_vigencia, mes_vigencia, aliquota, ativo FROM rh.irrf_brackets WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6' ORDER BY ano_vigencia, mes_vigencia, codigo LIMIT 10;

-- 2. Verificar dados ANTES da cópia
SELECT '=== DADOS ANTES DA CÓPIA ===' as etapa;
SELECT 
    'Empresa 1' as empresa,
    COUNT(*) as total
FROM rh.irrf_brackets 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2',
    COUNT(*)
FROM rh.irrf_brackets 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3',
    COUNT(*)
FROM rh.irrf_brackets 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';

-- 3. COPIAR DADOS
SELECT '=== COPIANDO DADOS ===' as etapa;

-- Copiar para Empresa 1
INSERT INTO rh.irrf_brackets (
    company_id, codigo, descricao, ano_vigencia, mes_vigencia,
    valor_minimo, valor_maximo, aliquota, valor_deducao,
    numero_dependentes, valor_por_dependente, ativo, created_at, updated_at
)
SELECT 
    'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID,
    ib.codigo,
    ib.descricao,
    ib.ano_vigencia,
    ib.mes_vigencia,
    ib.valor_minimo,
    ib.valor_maximo,
    ib.aliquota,
    COALESCE(ib.valor_deducao, 0),
    COALESCE(ib.numero_dependentes, 0),
    COALESCE(ib.valor_por_dependente, 0),
    COALESCE(ib.ativo, true),
    NOW(),
    NOW()
FROM rh.irrf_brackets ib
WHERE ib.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
ON CONFLICT (codigo, company_id, ano_vigencia, mes_vigencia) DO NOTHING;

-- Copiar para Empresa 2
INSERT INTO rh.irrf_brackets (
    company_id, codigo, descricao, ano_vigencia, mes_vigencia,
    valor_minimo, valor_maximo, aliquota, valor_deducao,
    numero_dependentes, valor_por_dependente, ativo, created_at, updated_at
)
SELECT 
    'ce92d32f-0503-43ca-b3cc-fb09a462b839'::UUID,
    ib.codigo,
    ib.descricao,
    ib.ano_vigencia,
    ib.mes_vigencia,
    ib.valor_minimo,
    ib.valor_maximo,
    ib.aliquota,
    COALESCE(ib.valor_deducao, 0),
    COALESCE(ib.numero_dependentes, 0),
    COALESCE(ib.valor_por_dependente, 0),
    COALESCE(ib.ativo, true),
    NOW(),
    NOW()
FROM rh.irrf_brackets ib
WHERE ib.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
ON CONFLICT (codigo, company_id, ano_vigencia, mes_vigencia) DO NOTHING;

-- Copiar para Empresa 3
INSERT INTO rh.irrf_brackets (
    company_id, codigo, descricao, ano_vigencia, mes_vigencia,
    valor_minimo, valor_maximo, aliquota, valor_deducao,
    numero_dependentes, valor_por_dependente, ativo, created_at, updated_at
)
SELECT 
    'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID,
    ib.codigo,
    ib.descricao,
    ib.ano_vigencia,
    ib.mes_vigencia,
    ib.valor_minimo,
    ib.valor_maximo,
    ib.aliquota,
    COALESCE(ib.valor_deducao, 0),
    COALESCE(ib.numero_dependentes, 0),
    COALESCE(ib.valor_por_dependente, 0),
    COALESCE(ib.ativo, true),
    NOW(),
    NOW()
FROM rh.irrf_brackets ib
WHERE ib.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
ON CONFLICT (codigo, company_id, ano_vigencia, mes_vigencia) DO NOTHING;

-- 4. Verificar dados DEPOIS da cópia
SELECT '=== DADOS DEPOIS DA CÓPIA ===' as etapa;
SELECT 
    'Referência' as empresa,
    COUNT(*) as total
FROM rh.irrf_brackets 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Empresa 1',
    COUNT(*)
FROM rh.irrf_brackets 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2',
    COUNT(*)
FROM rh.irrf_brackets 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3',
    COUNT(*)
FROM rh.irrf_brackets 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';





