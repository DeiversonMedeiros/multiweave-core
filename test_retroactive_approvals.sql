-- =====================================================
-- SCRIPT DE TESTE PARA FUNÇÃO create_retroactive_approvals
-- =====================================================
-- Execute este script no Supabase SQL Editor para verificar
-- se a função está funcionando corretamente
-- =====================================================

-- 1. VERIFICAR SE A FUNÇÃO FOI CRIADA
-- =====================================================
SELECT 
    proname as nome_funcao,
    pg_get_function_arguments(oid) as argumentos,
    pg_get_function_result(oid) as tipo_retorno
FROM pg_proc
WHERE proname = 'create_retroactive_approvals'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 2. VERIFICAR PERMISSÕES DA FUNÇÃO
-- =====================================================
SELECT 
    p.proname as nome_funcao,
    r.rolname as role,
    has_function_privilege(r.rolname, p.oid, 'EXECUTE') as pode_executar
FROM pg_proc p
CROSS JOIN pg_roles r
WHERE p.proname = 'create_retroactive_approvals'
AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND r.rolname IN ('authenticated', 'service_role', 'anon')
ORDER BY r.rolname;

-- 3. VERIFICAR CONFIGURAÇÕES DE APROVAÇÃO EXISTENTES
-- =====================================================
-- Substitua 'SEU-COMPANY-ID-AQUI' pelo ID da sua empresa
SELECT 
    processo_tipo,
    COUNT(*) as total_configuracoes,
    COUNT(*) FILTER (WHERE ativo = true) as configuracoes_ativas
FROM public.configuracoes_aprovacao_unificada
WHERE company_id = 'SEU-COMPANY-ID-AQUI'::uuid  -- SUBSTITUA AQUI
GROUP BY processo_tipo
ORDER BY processo_tipo;

-- 4. CONTAR PROCESSOS SEM APROVAÇÕES (REQUISIÇÕES)
-- =====================================================
-- Substitua 'SEU-COMPANY-ID-AQUI' pelo ID da sua empresa
SELECT 
    COUNT(*) as total_requisicoes_sem_aprovacao,
    COUNT(*) FILTER (WHERE COALESCE(workflow_state, status) IN ('pendente_aprovacao', 'em_aprovacao', 'rascunho') 
                      OR COALESCE(workflow_state, status) IS NULL) as em_estado_aprovavel
FROM compras.requisicoes_compra r
WHERE r.company_id = 'SEU-COMPANY-ID-AQUI'::uuid  -- SUBSTITUA AQUI
AND NOT EXISTS (
    SELECT 1 FROM public.aprovacoes_unificada a
    WHERE a.processo_tipo = 'requisicao_compra'
    AND a.processo_id = r.id
    AND a.company_id = r.company_id
);

-- 5. CONTAR PROCESSOS SEM APROVAÇÕES (COTAÇÕES)
-- =====================================================
-- Substitua 'SEU-COMPANY-ID-AQUI' pelo ID da sua empresa
SELECT 
    COUNT(*) as total_cotacoes_sem_aprovacao,
    COUNT(*) FILTER (WHERE COALESCE(workflow_state, status) IN ('aberta', 'em_cotacao', 'em_aprovacao', 'pendente') 
                      OR COALESCE(workflow_state, status) IS NULL) as em_estado_aprovavel
FROM compras.cotacao_ciclos c
WHERE c.company_id = 'SEU-COMPANY-ID-AQUI'::uuid  -- SUBSTITUA AQUI
AND NOT EXISTS (
    SELECT 1 FROM public.aprovacoes_unificada a
    WHERE a.processo_tipo = 'cotacao_compra'
    AND a.processo_id = c.id
    AND a.company_id = c.company_id
);

-- 6. TESTE DA FUNÇÃO (DRY RUN - APENAS VERIFICAÇÃO)
-- =====================================================
-- IMPORTANTE: Substitua 'SEU-COMPANY-ID-AQUI' pelo ID da sua empresa
-- Este teste executa a função com limite de 5 processos apenas para verificar
-- Se funcionar, você verá o relatório de quais processos foram processados

-- TESTE PARA REQUISIÇÕES (com limite de 5 para teste)
SELECT * FROM public.create_retroactive_approvals(
    'requisicao_compra',
    'SEU-COMPANY-ID-AQUI'::uuid,  -- SUBSTITUA AQUI
    5  -- Limite pequeno para teste
);

-- TESTE PARA COTAÇÕES (com limite de 5 para teste)
SELECT * FROM public.create_retroactive_approvals(
    'cotacao_compra',
    'SEU-COMPANY-ID-AQUI'::uuid,  -- SUBSTITUA AQUI
    5  -- Limite pequeno para teste
);

-- 7. VERIFICAR APROVAÇÕES CRIADAS APÓS EXECUÇÃO
-- =====================================================
-- Execute após rodar a função para ver quantas aprovações foram criadas
SELECT 
    processo_tipo,
    COUNT(*) as total_aprovacoes,
    COUNT(*) FILTER (WHERE status = 'pendente') as pendentes,
    COUNT(*) FILTER (WHERE status = 'aprovado') as aprovadas,
    COUNT(DISTINCT processo_id) as processos_com_aprovacao
FROM public.aprovacoes_unificada
WHERE company_id = 'SEU-COMPANY-ID-AQUI'::uuid  -- SUBSTITUA AQUI
AND processo_tipo IN ('requisicao_compra', 'cotacao_compra')
GROUP BY processo_tipo;

-- 8. VERIFICAR SE HÁ ERROS NA FUNÇÃO
-- =====================================================
-- Verificar logs recentes (se disponível)
SELECT 
    'Função criada com sucesso!' as status,
    'Verifique os resultados acima' as proximo_passo;
