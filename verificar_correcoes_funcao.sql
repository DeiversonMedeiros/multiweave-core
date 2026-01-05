-- =====================================================
-- VERIFICAÇÃO SIMPLIFICADA - CORREÇÕES NA FUNÇÃO
-- =====================================================

-- Query corrigida (sem ambiguidade)
SELECT 
    pg_get_functiondef(p.oid) AS definicao_funcao
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'process_approval'
LIMIT 1;











