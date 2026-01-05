-- =====================================================
-- SCRIPT DE VERIFICAÇÃO E CORREÇÃO: Cancelamento de Requisições
-- =====================================================
-- Este script verifica e corrige o problema de cancelamento
-- que não atualiza o status e não salva observações

-- 1. Verificar se o enum tem 'rejeitada'
SELECT 
    enumlabel as status_value
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'status_requisicao')
ORDER BY enumlabel;

-- 2. Verificar a função process_approval atual
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'process_approval'
LIMIT 1;

-- 3. Verificar uma requisição cancelada recentemente
SELECT 
    id,
    numero_requisicao,
    status,
    workflow_state,
    observacoes_aprovacao,
    updated_at
FROM compras.requisicoes_compra
WHERE numero_requisicao LIKE '%REQ-000004%' OR numero_requisicao LIKE '%000004%'
ORDER BY updated_at DESC
LIMIT 5;

-- 4. Verificar aprovações relacionadas
SELECT 
    au.id,
    au.processo_id,
    au.status as status_aprovacao,
    au.observacoes as observacoes_aprovacao,
    au.updated_at,
    rc.numero_requisicao,
    rc.status as status_requisicao
FROM public.aprovacoes_unificada au
JOIN compras.requisicoes_compra rc ON rc.id = au.processo_id
WHERE (rc.numero_requisicao LIKE '%REQ-000004%' OR rc.numero_requisicao LIKE '%000004%')
    AND au.processo_tipo = 'requisicao_compra'
ORDER BY au.updated_at DESC
LIMIT 10;











