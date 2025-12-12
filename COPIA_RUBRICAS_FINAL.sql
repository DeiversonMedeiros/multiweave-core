-- =====================================================
-- SCRIPT PARA COPIAR RUBRICAS
-- Execute este script no Supabase Studio SQL Editor
-- =====================================================

-- 1. Verificar dados na empresa de referência
SELECT '=== DADOS NA EMPRESA DE REFERÊNCIA ===' as etapa;
SELECT COUNT(*) as total FROM rh.rubricas WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6';
SELECT id, codigo, nome, tipo, ativo FROM rh.rubricas WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6' ORDER BY codigo LIMIT 10;

-- 2. Verificar dados ANTES da cópia
SELECT '=== DADOS ANTES DA CÓPIA ===' as etapa;
SELECT 
    'Empresa 1' as empresa,
    COUNT(*) as total
FROM rh.rubricas 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2',
    COUNT(*)
FROM rh.rubricas 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3',
    COUNT(*)
FROM rh.rubricas 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';

-- 3. COPIAR DADOS
SELECT '=== COPIANDO DADOS ===' as etapa;

-- Copiar para Empresa 1
INSERT INTO rh.rubricas (
    company_id, codigo, nome, descricao, tipo, categoria, natureza,
    calculo_automatico, formula_calculo, valor_fixo, percentual, base_calculo,
    incidencia_ir, incidencia_inss, incidencia_fgts, incidencia_contribuicao_sindical,
    ordem_exibicao, obrigatorio, ativo, created_at, updated_at
)
SELECT 
    'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID,
    r.codigo,
    r.nome,
    r.descricao,
    r.tipo,
    r.categoria,
    COALESCE(r.natureza, 'normal'),
    COALESCE(r.calculo_automatico, false),
    r.formula_calculo,
    r.valor_fixo,
    r.percentual,
    COALESCE(r.base_calculo, 'salario_base'),
    COALESCE(r.incidencia_ir, false),
    COALESCE(r.incidencia_inss, false),
    COALESCE(r.incidencia_fgts, false),
    COALESCE(r.incidencia_contribuicao_sindical, false),
    COALESCE(r.ordem_exibicao, 0),
    COALESCE(r.obrigatorio, false),
    COALESCE(r.ativo, true),
    NOW(),
    NOW()
FROM rh.rubricas r
WHERE r.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
ON CONFLICT (codigo, company_id) DO NOTHING;

-- Copiar para Empresa 2
INSERT INTO rh.rubricas (
    company_id, codigo, nome, descricao, tipo, categoria, natureza,
    calculo_automatico, formula_calculo, valor_fixo, percentual, base_calculo,
    incidencia_ir, incidencia_inss, incidencia_fgts, incidencia_contribuicao_sindical,
    ordem_exibicao, obrigatorio, ativo, created_at, updated_at
)
SELECT 
    'ce92d32f-0503-43ca-b3cc-fb09a462b839'::UUID,
    r.codigo,
    r.nome,
    r.descricao,
    r.tipo,
    r.categoria,
    COALESCE(r.natureza, 'normal'),
    COALESCE(r.calculo_automatico, false),
    r.formula_calculo,
    r.valor_fixo,
    r.percentual,
    COALESCE(r.base_calculo, 'salario_base'),
    COALESCE(r.incidencia_ir, false),
    COALESCE(r.incidencia_inss, false),
    COALESCE(r.incidencia_fgts, false),
    COALESCE(r.incidencia_contribuicao_sindical, false),
    COALESCE(r.ordem_exibicao, 0),
    COALESCE(r.obrigatorio, false),
    COALESCE(r.ativo, true),
    NOW(),
    NOW()
FROM rh.rubricas r
WHERE r.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
ON CONFLICT (codigo, company_id) DO NOTHING;

-- Copiar para Empresa 3
INSERT INTO rh.rubricas (
    company_id, codigo, nome, descricao, tipo, categoria, natureza,
    calculo_automatico, formula_calculo, valor_fixo, percentual, base_calculo,
    incidencia_ir, incidencia_inss, incidencia_fgts, incidencia_contribuicao_sindical,
    ordem_exibicao, obrigatorio, ativo, created_at, updated_at
)
SELECT 
    'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID,
    r.codigo,
    r.nome,
    r.descricao,
    r.tipo,
    r.categoria,
    COALESCE(r.natureza, 'normal'),
    COALESCE(r.calculo_automatico, false),
    r.formula_calculo,
    r.valor_fixo,
    r.percentual,
    COALESCE(r.base_calculo, 'salario_base'),
    COALESCE(r.incidencia_ir, false),
    COALESCE(r.incidencia_inss, false),
    COALESCE(r.incidencia_fgts, false),
    COALESCE(r.incidencia_contribuicao_sindical, false),
    COALESCE(r.ordem_exibicao, 0),
    COALESCE(r.obrigatorio, false),
    COALESCE(r.ativo, true),
    NOW(),
    NOW()
FROM rh.rubricas r
WHERE r.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
ON CONFLICT (codigo, company_id) DO NOTHING;

-- 4. Verificar dados DEPOIS da cópia
SELECT '=== DADOS DEPOIS DA CÓPIA ===' as etapa;
SELECT 
    'Referência' as empresa,
    COUNT(*) as total
FROM rh.rubricas 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Empresa 1',
    COUNT(*)
FROM rh.rubricas 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2',
    COUNT(*)
FROM rh.rubricas 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3',
    COUNT(*)
FROM rh.rubricas 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';










