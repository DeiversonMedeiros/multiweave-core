-- =====================================================
-- VERIFICAÇÃO DETALHADA DA FUNÇÃO process_approval
-- =====================================================

-- Corrigir query com alias para evitar ambiguidade
SELECT 
    pg_get_functiondef(p.oid) AS definicao_funcao
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'process_approval'
LIMIT 1;

-- Verificar se a função contém as correções necessárias
DO $$
DECLARE
    func_def TEXT;
    has_aprovada_correta BOOLEAN := FALSE;
    has_workflow_state BOOLEAN := FALSE;
    has_status_requisicao_cast BOOLEAN := FALSE;
BEGIN
    -- Obter definição da função
    SELECT pg_get_functiondef(p.oid) INTO func_def
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'process_approval'
    LIMIT 1;
    
    IF func_def IS NULL THEN
        RAISE NOTICE '❌ Função process_approval não encontrada!';
    ELSE
        RAISE NOTICE '✅ Função encontrada. Verificando correções...';
        RAISE NOTICE '';
        
        -- Verificar se usa 'aprovada'::compras.status_requisicao (correto)
        has_status_requisicao_cast := func_def LIKE '%aprovada%::compras.status_requisicao%';
        
        -- Verificar se usa 'aprovada' (não 'aprovado') para requisicao_compra
        has_aprovada_correta := func_def LIKE '%WHEN ''requisicao_compra'' THEN%aprovada%'
                              OR func_def LIKE '%requisicao_compra'' THEN%status = ''aprovada''%';
        
        -- Verificar se atualiza workflow_state
        has_workflow_state := func_def LIKE '%workflow_state%'
                           AND func_def LIKE '%requisicao_compra%workflow_state%';
        
        -- Exibir resultados
        RAISE NOTICE '========================================';
        RAISE NOTICE 'VERIFICAÇÃO DE CORREÇÕES:';
        RAISE NOTICE '========================================';
        
        IF has_status_requisicao_cast THEN
            RAISE NOTICE '✅ Usa cast correto: ''aprovada''::compras.status_requisicao';
        ELSE
            RAISE NOTICE '⚠️  Verifique se usa cast correto do ENUM';
        END IF;
        
        IF has_aprovada_correta THEN
            RAISE NOTICE '✅ Usa status ''aprovada'' (correto) para requisicao_compra';
        ELSE
            RAISE NOTICE '❌ NÃO usa status ''aprovada'' - APLIQUE: 20251210000001_fix_process_approval_status_requisicao.sql';
        END IF;
        
        IF has_workflow_state THEN
            RAISE NOTICE '✅ Atualiza workflow_state para requisicao_compra';
        ELSE
            RAISE NOTICE '❌ NÃO atualiza workflow_state - APLIQUE: 20251210220000_fix_requisicao_workflow_after_approval.sql';
        END IF;
        
        RAISE NOTICE '========================================';
        
        -- Mostrar trecho relevante da função
        IF func_def LIKE '%requisicao_compra%' THEN
            RAISE NOTICE '';
            RAISE NOTICE 'Trecho da função relacionado a requisicao_compra:';
            RAISE NOTICE '---';
            -- Tentar extrair o trecho relevante (simplificado)
            IF func_def ~ 'WHEN.*requisicao_compra.*THEN.*UPDATE' THEN
                RAISE NOTICE 'Função contém lógica para requisicao_compra';
            END IF;
        END IF;
    END IF;
END $$;











