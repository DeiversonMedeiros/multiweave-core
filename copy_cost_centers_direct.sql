-- Script direto para copiar Centros de Custo
-- Verificando primeiro se há dados na referência
SELECT 'Verificando dados na empresa de referência...' as status;
SELECT COUNT(*) as total_referencia FROM public.cost_centers WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6';

-- Verificando dados nas empresas destino ANTES
SELECT 'Verificando dados nas empresas destino ANTES da cópia...' as status;
SELECT 'Empresa 1' as empresa, COUNT(*) as total FROM public.cost_centers WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 'Empresa 2', COUNT(*) FROM public.cost_centers WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 'Empresa 3', COUNT(*) FROM public.cost_centers WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';

-- Copiando para Empresa 1
INSERT INTO public.cost_centers (company_id, nome, codigo, ativo, created_at, updated_at)
SELECT 
    'ce390408-1c18-47fc-bd7d-76379ec488b7'::UUID,
    nome,
    codigo,
    ativo,
    NOW(),
    NOW()
FROM public.cost_centers
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
ON CONFLICT (company_id, codigo) DO NOTHING;

-- Copiando para Empresa 2
INSERT INTO public.cost_centers (company_id, nome, codigo, ativo, created_at, updated_at)
SELECT 
    'ce92d32f-0503-43ca-b3cc-fb09a462b839'::UUID,
    nome,
    codigo,
    ativo,
    NOW(),
    NOW()
FROM public.cost_centers
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
ON CONFLICT (company_id, codigo) DO NOTHING;

-- Copiando para Empresa 3
INSERT INTO public.cost_centers (company_id, nome, codigo, ativo, created_at, updated_at)
SELECT 
    'f83704f6-3278-4d59-81ca-45925a1ab855'::UUID,
    nome,
    codigo,
    ativo,
    NOW(),
    NOW()
FROM public.cost_centers
WHERE company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
ON CONFLICT (company_id, codigo) DO NOTHING;

-- Verificando dados nas empresas destino DEPOIS
SELECT 'Verificando dados nas empresas destino DEPOIS da cópia...' as status;
SELECT 'Empresa 1' as empresa, COUNT(*) as total FROM public.cost_centers WHERE company_id = 'ce390408-1c18-47fc-bd7d-76379ec488b7'
UNION ALL
SELECT 'Empresa 2', COUNT(*) FROM public.cost_centers WHERE company_id = 'ce92d32f-0503-43ca-b3cc-fb09a462b839'
UNION ALL
SELECT 'Empresa 3', COUNT(*) FROM public.cost_centers WHERE company_id = 'f83704f6-3278-4d59-81ca-45925a1ab855';





