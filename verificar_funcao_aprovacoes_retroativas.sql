-- =====================================================
-- VERIFICAÇÃO RÁPIDA DA FUNÇÃO create_retroactive_approvals
-- =====================================================
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Verificar se a função existe
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Função criada com sucesso!'
        ELSE '❌ Função não encontrada'
    END as status_funcao,
    COUNT(*) as total_funcoes
FROM pg_proc
WHERE proname = 'create_retroactive_approvals'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 2. Verificar assinatura da função
SELECT 
    proname as nome,
    pg_get_function_arguments(oid) as argumentos,
    pg_get_function_result(oid) as retorno
FROM pg_proc
WHERE proname = 'create_retroactive_approvals'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 3. Verificar permissões
SELECT 
    'Permissões da função:' as info,
    has_function_privilege('authenticated', 'public.create_retroactive_approvals(varchar, uuid, integer)', 'EXECUTE') as authenticated_pode_executar,
    has_function_privilege('service_role', 'public.create_retroactive_approvals(varchar, uuid, integer)', 'EXECUTE') as service_role_pode_executar;

-- 4. Verificar se as funções dependentes existem
SELECT 
    'Funções dependentes:' as info,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'create_approvals_for_process') as create_approvals_for_process_existe,
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'get_required_approvers') as get_required_approvers_existe;

-- 5. Teste de sintaxe (sem executar)
-- Apenas verifica se a função pode ser chamada
SELECT 
    'Teste de sintaxe:' as info,
    'Para testar a execução, use:' as instrucao,
    'SELECT * FROM public.create_retroactive_approvals(''requisicao_compra'', ''SEU-COMPANY-ID'', 5);' as exemplo;

