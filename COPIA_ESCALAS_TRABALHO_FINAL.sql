-- =====================================================
-- SCRIPT PARA COPIAR ESCALAS DE TRABALHO (work_shifts)
-- Execute este script no Supabase Studio SQL Editor
-- =====================================================

-- 1. Verificar dados na empresa de referência
SELECT '=== DADOS NA EMPRESA DE REFERÊNCIA ===' as etapa;
SELECT COUNT(*) as total FROM rh.work_shifts WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6';
SELECT id, nome, codigo, hora_inicio, hora_fim, status FROM rh.work_shifts WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6' ORDER BY nome LIMIT 10;

-- 2. Verificar dados ANTES da cópia
SELECT '=== DADOS ANTES DA CÓPIA ===' as etapa;
SELECT 
    'Empresa 1' as empresa,
    COUNT(*) as total
FROM rh.work_shifts 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2',
    COUNT(*)
FROM rh.work_shifts 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3',
    COUNT(*)
FROM rh.work_shifts 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';

-- 3. COPIAR DADOS
SELECT '=== COPIANDO DADOS ===' as etapa;

-- Copiar para Empresa 1
INSERT INTO rh.work_shifts (company_id, nome, codigo, descricao, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, horas_diarias, dias_semana, tipo_turno, tolerancia_entrada, tolerancia_saida, status, created_at, updated_at)
SELECT 
    'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID,
    nome,
    codigo,
    descricao,
    hora_inicio,
    hora_fim,
    intervalo_inicio,
    intervalo_fim,
    horas_diarias,
    dias_semana,
    tipo_turno,
    tolerancia_entrada,
    tolerancia_saida,
    COALESCE(status, 'ativo'),
    NOW(),
    NOW()
FROM rh.work_shifts
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
AND NOT EXISTS (
    SELECT 1 FROM rh.work_shifts 
    WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7' 
    AND (codigo IS NOT NULL AND codigo = rh.work_shifts.codigo OR codigo IS NULL AND nome = rh.work_shifts.nome)
);

-- Copiar para Empresa 2
INSERT INTO rh.work_shifts (company_id, nome, codigo, descricao, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, horas_diarias, dias_semana, tipo_turno, tolerancia_entrada, tolerancia_saida, status, created_at, updated_at)
SELECT 
    'ce92d32f-0503-43ca-b3cc-fb09a462b839'::UUID,
    nome,
    codigo,
    descricao,
    hora_inicio,
    hora_fim,
    intervalo_inicio,
    intervalo_fim,
    horas_diarias,
    dias_semana,
    tipo_turno,
    tolerancia_entrada,
    tolerancia_saida,
    COALESCE(status, 'ativo'),
    NOW(),
    NOW()
FROM rh.work_shifts
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
AND NOT EXISTS (
    SELECT 1 FROM rh.work_shifts 
    WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839' 
    AND (codigo IS NOT NULL AND codigo = rh.work_shifts.codigo OR codigo IS NULL AND nome = rh.work_shifts.nome)
);

-- Copiar para Empresa 3
INSERT INTO rh.work_shifts (company_id, nome, codigo, descricao, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, horas_diarias, dias_semana, tipo_turno, tolerancia_entrada, tolerancia_saida, status, created_at, updated_at)
SELECT 
    'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID,
    nome,
    codigo,
    descricao,
    hora_inicio,
    hora_fim,
    intervalo_inicio,
    intervalo_fim,
    horas_diarias,
    dias_semana,
    tipo_turno,
    tolerancia_entrada,
    tolerancia_saida,
    COALESCE(status, 'ativo'),
    NOW(),
    NOW()
FROM rh.work_shifts
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
AND NOT EXISTS (
    SELECT 1 FROM rh.work_shifts 
    WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855' 
    AND (codigo IS NOT NULL AND codigo = rh.work_shifts.codigo OR codigo IS NULL AND nome = rh.work_shifts.nome)
);

-- 4. Verificar dados DEPOIS da cópia
SELECT '=== DADOS DEPOIS DA CÓPIA ===' as etapa;
SELECT 
    'Referência' as empresa,
    COUNT(*) as total
FROM rh.work_shifts 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Empresa 1',
    COUNT(*)
FROM rh.work_shifts 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2',
    COUNT(*)
FROM rh.work_shifts 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3',
    COUNT(*)
FROM rh.work_shifts 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';
















