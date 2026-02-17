-- =====================================================
-- DIAGNÓSTICO: Aprovações de cotação multi-CC (ex: COT-000055, gestor3)
-- Execute no SQL Editor do Supabase ou: psql $DB_URL -f scripts/diagnostico_aprovacao_cotacao.sql
-- =====================================================

-- 1) Ciclos com numero_cotacao COT-000055 (ou altere o número)
SELECT cc.id AS ciclo_id, cc.numero_cotacao, cc.requisicao_id, cc.workflow_state, cc.status,
       rc.numero_requisicao, r.centro_custo_id, cc_nome.nome AS centro_custo_nome
FROM compras.cotacao_ciclos cc
JOIN compras.requisicoes_compra r ON r.id = cc.requisicao_id
LEFT JOIN compras.requisicoes_compra rc ON rc.id = cc.requisicao_id
LEFT JOIN public.cost_centers cc_nome ON cc_nome.id = r.centro_custo_id
WHERE cc.numero_cotacao = 'COT-000055';

-- 2) Aprovações criadas para essa cotação (processo_id = um dos ciclos)
SELECT au.id, au.processo_id, au.aprovador_id, au.nivel_aprovacao, au.status, au.created_at,
       p.nome AS aprovador_nome, p.email AS aprovador_email
FROM public.aprovacoes_unificada au
LEFT JOIN public.profiles p ON p.id = au.aprovador_id
WHERE au.processo_tipo = 'cotacao_compra'
  AND au.processo_id IN (SELECT id FROM compras.cotacao_ciclos WHERE numero_cotacao = 'COT-000055')
ORDER BY au.nivel_aprovacao, au.ordem;

-- 3) Usuário gestor3 (id e email)
SELECT id, email, nome FROM public.profiles WHERE email ILIKE '%gestor3%' OR nome ILIKE '%gestor3%';

-- 4) Configurações de aprovação para cotacao_compra (ativos) e centros de custo
SELECT cau.id, cau.nome, cau.nivel_aprovacao, cau.centro_custo_id, cc.nome AS centro_custo_nome,
       jsonb_array_length(cau.aprovadores) AS qtd_aprovadores,
       (SELECT jsonb_agg(ap->>'user_id') FROM jsonb_array_elements(cau.aprovadores) AS ap) AS user_ids
FROM public.configuracoes_aprovacao_unificada cau
LEFT JOIN public.cost_centers cc ON cc.id = cau.centro_custo_id
WHERE cau.processo_tipo = 'cotacao_compra' AND cau.ativo = true
ORDER BY cau.centro_custo_id NULLS LAST, cau.nivel_aprovacao;

-- 5) Teste da função aggregate (substitua o ciclo_id por um real da query 1)
-- SELECT * FROM public.get_required_approvers_cotacao_aggregate(
--   (SELECT id FROM compras.cotacao_ciclos WHERE numero_cotacao = 'COT-000055' LIMIT 1),
--   (SELECT company_id FROM compras.cotacao_ciclos WHERE numero_cotacao = 'COT-000055' LIMIT 1)
-- );
