-- Primeiro verificar se há dados na referência
SELECT 'Dados na empresa de referência:' as info;
SELECT id, nome, codigo FROM public.cost_centers WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6' LIMIT 10;

-- Agora copiar diretamente usando INSERT simples
-- Empresa 1
INSERT INTO public.cost_centers (company_id, nome, codigo, ativo, created_at, updated_at)
SELECT 
    'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID,
    nome,
    codigo,
    COALESCE(ativo, true),
    NOW(),
    NOW()
FROM public.cost_centers
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
ON CONFLICT (company_id, codigo) DO NOTHING;

-- Empresa 2
INSERT INTO public.cost_centers (company_id, nome, codigo, ativo, created_at, updated_at)
SELECT 
    'ce92d32f-0503-43ca-b3cc-fb09a462b839'::UUID,
    nome,
    codigo,
    COALESCE(ativo, true),
    NOW(),
    NOW()
FROM public.cost_centers
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
ON CONFLICT (company_id, codigo) DO NOTHING;

-- Empresa 3
INSERT INTO public.cost_centers (company_id, nome, codigo, ativo, created_at, updated_at)
SELECT 
    'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID,
    nome,
    codigo,
    COALESCE(ativo, true),
    NOW(),
    NOW()
FROM public.cost_centers
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
ON CONFLICT (company_id, codigo) DO NOTHING;

-- Verificar resultado final
SELECT 'Resultado final:' as info;
SELECT 
    'Referência' as empresa,
    COUNT(*) as total
FROM public.cost_centers 
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
UNION ALL
SELECT 
    'Empresa 1',
    COUNT(*)
FROM public.cost_centers 
WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 
    'Empresa 2',
    COUNT(*)
FROM public.cost_centers 
WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 
    'Empresa 3',
    COUNT(*)
FROM public.cost_centers 
WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';
