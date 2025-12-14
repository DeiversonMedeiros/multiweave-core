-- Copiar Cargos de forma simples e direta
-- Empresa 1
INSERT INTO rh.positions (company_id, nome, descricao, nivel_hierarquico, salario_minimo, salario_maximo, carga_horaria, is_active, created_at, updated_at)
SELECT 
    'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID,
    p.nome,
    p.descricao,
    p.nivel_hierarquico,
    p.salario_minimo,
    p.salario_maximo,
    p.carga_horaria,
    COALESCE(p.is_active, true),
    NOW(),
    NOW()
FROM rh.positions p
WHERE p.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
AND NOT EXISTS (
    SELECT 1 FROM rh.positions p2
    WHERE p2.company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7' 
    AND p2.nome = p.nome
);

-- Empresa 2
INSERT INTO rh.positions (company_id, nome, descricao, nivel_hierarquico, salario_minimo, salario_maximo, carga_horaria, is_active, created_at, updated_at)
SELECT 
    'ce92d32f-0503-43ca-b3cc-fb09a462b839'::UUID,
    p.nome,
    p.descricao,
    p.nivel_hierarquico,
    p.salario_minimo,
    p.salario_maximo,
    p.carga_horaria,
    COALESCE(p.is_active, true),
    NOW(),
    NOW()
FROM rh.positions p
WHERE p.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
AND NOT EXISTS (
    SELECT 1 FROM rh.positions p2
    WHERE p2.company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839' 
    AND p2.nome = p.nome
);

-- Empresa 3
INSERT INTO rh.positions (company_id, nome, descricao, nivel_hierarquico, salario_minimo, salario_maximo, carga_horaria, is_active, created_at, updated_at)
SELECT 
    'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID,
    p.nome,
    p.descricao,
    p.nivel_hierarquico,
    p.salario_minimo,
    p.salario_maximo,
    p.carga_horaria,
    COALESCE(p.is_active, true),
    NOW(),
    NOW()
FROM rh.positions p
WHERE p.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
AND NOT EXISTS (
    SELECT 1 FROM rh.positions p2
    WHERE p2.company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855' 
    AND p2.nome = p.nome
);

-- Verificação
SELECT 
    'Referência' as empresa,
    COUNT(*) as total
FROM rh.positions 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Empresa 1',
    COUNT(*)
FROM rh.positions 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2',
    COUNT(*)
FROM rh.positions 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3',
    COUNT(*)
FROM rh.positions 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';














