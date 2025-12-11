-- =====================================================
-- SCRIPT PARA VERIFICAR STATUS DAS MIGRATIONS
-- =====================================================

-- Verificar se a tabela de migrations do Supabase existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'supabase_migrations' 
            AND table_name = 'schema_migrations'
        ) THEN 'Tabela supabase_migrations.schema_migrations existe'
        ELSE 'Tabela supabase_migrations.schema_migrations NÃO existe'
    END AS status_tabela;

-- Listar migrations aplicadas (se a tabela existir)
SELECT 
    version,
    name,
    applied_at
FROM supabase_migrations.schema_migrations
ORDER BY version;

-- Verificar se a função process_approval existe e qual versão (pela definição)
SELECT 
    'process_approval' AS funcao,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' 
            AND p.proname = 'process_approval'
        ) THEN 'EXISTE'
        ELSE 'NÃO EXISTE'
    END AS status;

-- Verificar se a tabela aprovacoes_unificada existe
SELECT 
    'aprovacoes_unificada' AS tabela,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'aprovacoes_unificada'
        ) THEN 'EXISTE'
        ELSE 'NÃO EXISTE'
    END AS status;

-- Verificar se a coluna workflow_state existe em requisicoes_compra
SELECT 
    'workflow_state em requisicoes_compra' AS campo,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'compras' 
            AND table_name = 'requisicoes_compra'
            AND column_name = 'workflow_state'
        ) THEN 'EXISTE'
        ELSE 'NÃO EXISTE'
    END AS status;

-- Verificar a definição atual da função process_approval (para ver se está corrigida)
SELECT 
    pg_get_functiondef(oid) AS definicao_funcao
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'process_approval'
LIMIT 1;

