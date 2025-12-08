-- =====================================================
-- VERIFICAR ACESSO AOS DADOS DE FGTS
-- =====================================================

-- 1. Verificar dados existentes
SELECT 
    'Dados no banco' as verificacao,
    company_id,
    COUNT(*) as total
FROM rh.fgts_config 
WHERE company_id IN (
    'dc060329-50cd-4114-922f-624a6ab036d6',
    'ce390408-1c18-47fc-bd7d-76379ec488b7',
    'ce92d32f-0503-43ca-b3cc-fb09a462b839',
    'f83704f6-3278-4d59-81ca-45925a1ab855'
)
GROUP BY company_id
ORDER BY company_id;

-- 2. Verificar se a funcao get_entity_data existe e pode acessar
SELECT 
    'Funcao RPC' as verificacao,
    proname as nome_funcao,
    pronargs as num_parametros
FROM pg_proc 
WHERE proname = 'get_entity_data'
LIMIT 1;

-- 3. Verificar permissoes na tabela
SELECT 
    'Permissoes' as verificacao,
    grantee,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_schema = 'rh' 
AND table_name = 'fgts_config'
AND grantee = 'authenticated';

-- 4. Verificar se os dados estao acessiveis via RLS
-- (Isso vai depender do usuario logado, mas podemos verificar a estrutura)
SELECT 
    'Politicas RLS' as verificacao,
    policyname,
    cmd as operacao,
    CASE 
        WHEN qual IS NOT NULL THEN 'Tem condicao'
        ELSE 'Sem condicao'
    END as status
FROM pg_policies 
WHERE schemaname = 'rh' 
AND tablename = 'fgts_config';

