-- =====================================================
-- VERIFICAÇÃO RÁPIDA DO STATUS DAS MIGRATIONS
-- Execute este script no seu banco de dados
-- =====================================================

\echo '========================================='
\echo 'VERIFICAÇÃO DE MIGRATIONS - APROVAÇÃO'
\echo '========================================='
\echo ''

-- 1. Tabela aprovacoes_unificada
\echo '1. Verificando tabela aprovacoes_unificada...'
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'aprovacoes_unificada'
        ) THEN '✅ Tabela EXISTE'
        ELSE '❌ Tabela NÃO existe - Aplique: 20250116000001_create_unified_approval_system.sql'
    END AS status;
\echo ''

-- 2. Função process_approval
\echo '2. Verificando função process_approval...'
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' 
            AND p.proname = 'process_approval'
        ) THEN '✅ Função EXISTE'
        ELSE '❌ Função NÃO existe - Aplique: 20250116000002_create_approval_functions.sql'
    END AS status;
\echo ''

-- 3. Coluna workflow_state
\echo '3. Verificando coluna workflow_state...'
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'compras' 
            AND table_name = 'requisicoes_compra'
            AND column_name = 'workflow_state'
        ) THEN '✅ Coluna workflow_state EXISTE'
        ELSE '❌ Coluna NÃO existe - Aplique: 20251201090000_extend_compras_workflow.sql'
    END AS status;
\echo ''

-- 4. Verificar se função atualiza workflow_state (procura na definição)
\echo '4. Verificando se função atualiza workflow_state...'
DO $$
DECLARE
    func_def TEXT;
    has_workflow_state BOOLEAN := FALSE;
BEGIN
    SELECT pg_get_functiondef(oid) INTO func_def
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'process_approval'
    LIMIT 1;
    
    IF func_def IS NULL THEN
        RAISE NOTICE '❌ Função process_approval não encontrada';
    ELSE
        has_workflow_state := func_def LIKE '%workflow_state%';
        IF has_workflow_state THEN
            RAISE NOTICE '✅ Função ATUALIZA workflow_state - Migration #6 provavelmente aplicada';
        ELSE
            RAISE NOTICE '❌ Função NÃO atualiza workflow_state - APLIQUE: 20251210220000_fix_requisicao_workflow_after_approval.sql';
        END IF;
    END IF;
END $$;
\echo ''

-- 5. Verificar se função usa 'aprovada' (não 'aprovado') para requisicao_compra
\echo '5. Verificando se função usa status correto (aprovada)...'
DO $$
DECLARE
    func_def TEXT;
    uses_aprovada BOOLEAN := FALSE;
BEGIN
    SELECT pg_get_functiondef(oid) INTO func_def
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'process_approval'
    LIMIT 1;
    
    IF func_def IS NULL THEN
        RAISE NOTICE '❌ Função process_approval não encontrada';
    ELSE
        -- Verificar se usa 'aprovada'::compras.status_requisicao
        uses_aprovada := func_def LIKE '%aprovada%::compras.status_requisicao%' 
                      OR func_def LIKE '%aprovada%status_requisicao%'
                      OR func_def LIKE '%status = ''aprovada''%';
        
        IF uses_aprovada THEN
            RAISE NOTICE '✅ Função usa status CORRETO (aprovada)';
        ELSE
            RAISE NOTICE '⚠️  Verifique se usa status correto - APLIQUE: 20251210000001_fix_process_approval_status_requisicao.sql';
        END IF;
    END IF;
END $$;
\echo ''

\echo '========================================='
\echo 'RESUMO:'
\echo '========================================='
\echo 'Se alguma verificação falhou, aplique as migrations indicadas na ordem:'
\echo ''
\echo 'ORDEM DE APLICAÇÃO:'
\echo '1. 20250116000001_create_unified_approval_system.sql (se tabela não existe)'
\echo '2. 20250116000002_create_approval_functions.sql (se função não existe)'
\echo '3. 20251210000001_fix_process_approval_status_requisicao.sql ⭐ ESSENCIAL'
\echo '4. 20251210220000_fix_requisicao_workflow_after_approval.sql ⭐ ESSENCIAL'
\echo '5. 20251211143000_force_em_cotacao_for_approved_requisicoes.sql (opcional)'
\echo ''




