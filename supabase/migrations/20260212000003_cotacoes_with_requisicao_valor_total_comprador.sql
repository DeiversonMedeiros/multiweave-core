-- =====================================================
-- VIEW: Valor total (com frete e descontos) + Comprador (nome do colaborador)
-- Data: 2026-02-12
-- Descrição:
--   1) valor_total: mesma fórmula da aprovação (get_required_approvers cotacao_compra):
--      por fornecedor: base = itens + frete itens + frete/imp fornecedor - desconto fornecedor;
--      valor_final = base + frete geral (ciclo) - desconto geral (ciclo).
--      Exibe o MENOR valor_final entre fornecedores (melhor oferta).
--   2) comprador_nome: prioriza nome em rh.employees (user_id = created_by/solicitante_id),
--      senão public.profiles, para não mostrar "Usuário do Sistema" quando há colaborador.
--   DROP + CREATE evita erro ao alterar colunas (REPLACE não permite).
-- =====================================================

DROP VIEW IF EXISTS compras.cotacoes_with_requisicao;

CREATE VIEW compras.cotacoes_with_requisicao AS
SELECT 
    cc.id,
    cc.company_id,
    cc.requisicao_id,
    cc.numero_cotacao,
    cc.status,
    cc.prazo_resposta,
    cc.observacoes,
    cc.workflow_state,
    cc.created_at,
    cc.updated_at,
    rc.numero_requisicao,
    rc.data_solicitacao,
    rc.data_necessidade,
    rc.status AS requisicao_status,
    rc.workflow_state AS requisicao_workflow_state,
    COALESCE(rc.created_by, rc.solicitante_id) AS requisicao_created_by,
    -- Nome do comprador: priorizar colaborador (rh.employees) sobre perfil (profiles)
    COALESCE(
      (SELECT e.nome FROM rh.employees e WHERE e.user_id = COALESCE(rc.created_by, rc.solicitante_id) LIMIT 1),
      (SELECT p.nome FROM public.profiles p WHERE p.id = COALESCE(rc.created_by, rc.solicitante_id) LIMIT 1)
    ) AS comprador_nome,
    -- Valor total: se houver itens vencedores, usa a mesma fórmula da aprovação (itens vencedores + frete/descontos); senão menor oferta entre fornecedores
    COALESCE(
      (SELECT GREATEST(
         sub.v_base + COALESCE(cc.valor_frete, 0)
         - (sub.v_base * COALESCE(cc.desconto_percentual, 0) / 100 + COALESCE(cc.desconto_valor, 0)),
         0
       )
       FROM (
         SELECT
           COALESCE(SUM(cif.valor_total_calculado), 0) AS v_sub,
           COALESCE(SUM(COALESCE(cif.valor_frete, 0)), 0) AS v_frete_itens
         FROM compras.cotacao_item_fornecedor cif
         INNER JOIN compras.cotacao_fornecedores cf ON cf.id = cif.cotacao_fornecedor_id
         WHERE cf.cotacao_id = cc.id AND cif.is_vencedor = true
       ) ven
       CROSS JOIN LATERAL (
         SELECT
           ven.v_sub + ven.v_frete_itens
           + COALESCE(SUM(COALESCE(cf.valor_frete, 0) + COALESCE(cf.valor_imposto, 0)), 0)
           - COALESCE(SUM(
               (SELECT COALESCE(SUM(c2.valor_total_calculado), 0) FROM compras.cotacao_item_fornecedor c2 WHERE c2.cotacao_fornecedor_id = cf.id AND c2.is_vencedor = true)
               * COALESCE(cf.desconto_percentual, 0) / 100 + COALESCE(cf.desconto_valor, 0)
             ), 0) AS v_base
         FROM compras.cotacao_fornecedores cf
         WHERE cf.cotacao_id = cc.id
           AND EXISTS (SELECT 1 FROM compras.cotacao_item_fornecedor c WHERE c.cotacao_fornecedor_id = cf.id AND c.is_vencedor = true)
       ) sub
       WHERE ven.v_sub > 0 OR ven.v_frete_itens > 0
      ),
      (SELECT GREATEST(MIN(
        t.base_f
        + COALESCE(cc.valor_frete, 0)
        - (t.base_f * COALESCE(cc.desconto_percentual, 0) / 100 + COALESCE(cc.desconto_valor, 0))
      ), 0)
       FROM (
         SELECT cf.id,
           COALESCE(SUM(cif.valor_total_calculado), 0) + COALESCE(SUM(cif.valor_frete), 0)
           + COALESCE(cf.valor_frete, 0) + COALESCE(cf.valor_imposto, 0)
           - (COALESCE(SUM(cif.valor_total_calculado), 0) * COALESCE(cf.desconto_percentual, 0) / 100 + COALESCE(cf.desconto_valor, 0)) AS base_f
         FROM compras.cotacao_fornecedores cf
         LEFT JOIN compras.cotacao_item_fornecedor cif ON cif.cotacao_fornecedor_id = cf.id
         WHERE cf.cotacao_id = cc.id
         GROUP BY cf.id, cf.valor_frete, cf.valor_imposto, cf.desconto_percentual, cf.desconto_valor
       ) t
       WHERE t.base_f >= 0
      )
    ) AS valor_total,
    (SELECT cf.fornecedor_id
     FROM compras.cotacao_fornecedores cf
     WHERE cf.cotacao_id = cc.id
     ORDER BY cf.created_at
     LIMIT 1) AS fornecedor_id,
    (SELECT pt.razao_social
     FROM compras.cotacao_fornecedores cf
     JOIN compras.fornecedores_dados fd ON fd.id = cf.fornecedor_id
     LEFT JOIN public.partners pt ON pt.id = fd.partner_id
     WHERE cf.cotacao_id = cc.id
     ORDER BY cf.created_at
     LIMIT 1) AS fornecedor_nome
FROM compras.cotacao_ciclos cc
LEFT JOIN compras.requisicoes_compra rc ON rc.id = cc.requisicao_id;

COMMENT ON VIEW compras.cotacoes_with_requisicao IS 
'Cotações Realizadas: valor_total com frete e descontos (ciclo + fornecedor); comprador_nome prioriza rh.employees; primeiro fornecedor.';
