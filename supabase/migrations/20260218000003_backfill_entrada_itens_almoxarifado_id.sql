-- =====================================================
-- MIGRAÇÃO: Backfill almoxarifado_id em entrada_itens
-- Data: 2026-02-18
-- Descrição:
--   - Preenche almoxarifado_id nos itens de entrada que vêm de pedido (pré-entradas),
--     buscando o destino da requisição (cotacao_ciclos -> requisicoes_compra.destino_almoxarifado_id).
--   - Quando existir almoxarifado por item em requisicao_itens, usa esse valor;
--     senão usa o destino_almoxarifado_id da requisição.
-- =====================================================

-- Atualizar entrada_itens com almoxarifado_id obtido via pedido -> cotação -> requisição
UPDATE almoxarifado.entrada_itens ei
SET almoxarifado_id = sub.destino_almoxarifado_id
FROM (
  SELECT
    ei2.id AS entrada_item_id,
    rc.destino_almoxarifado_id
  FROM almoxarifado.entrada_itens ei2
  JOIN almoxarifado.entradas_materiais em ON em.id = ei2.entrada_id
  JOIN compras.pedidos_compra p ON p.id = em.pedido_id
  LEFT JOIN compras.cotacao_ciclos cc ON cc.id = COALESCE(
    p.cotacao_ciclo_id,
    (SELECT cotacao_ciclo_id FROM compras.cotacoes WHERE id = p.cotacao_id LIMIT 1)
  )
  LEFT JOIN compras.requisicoes_compra rc ON rc.id = cc.requisicao_id
  WHERE em.pedido_id IS NOT NULL
    AND ei2.almoxarifado_id IS NULL
    AND rc.destino_almoxarifado_id IS NOT NULL
) sub
WHERE ei.id = sub.entrada_item_id;

-- Opcional: por item, preferir almoxarifado do requisicao_item quando existir
-- (descomente o bloco abaixo se a tabela compras.requisicao_itens tiver coluna almoxarifado_id)
/*
UPDATE almoxarifado.entrada_itens ei
SET almoxarifado_id = COALESCE(sub.ri_almox, ei.almoxarifado_id)
FROM (
  SELECT
    ei2.id AS entrada_item_id,
    (
      SELECT ri.almoxarifado_id
      FROM compras.requisicao_itens ri
      WHERE ri.requisicao_id = cc.requisicao_id
        AND ri.material_id = ei2.material_equipamento_id
      LIMIT 1
    ) AS ri_almox
  FROM almoxarifado.entrada_itens ei2
  JOIN almoxarifado.entradas_materiais em ON em.id = ei2.entrada_id
  JOIN compras.pedidos_compra p ON p.id = em.pedido_id
  LEFT JOIN compras.cotacao_ciclos cc ON cc.id = COALESCE(p.cotacao_ciclo_id, (SELECT cotacao_ciclo_id FROM compras.cotacoes WHERE id = p.cotacao_id LIMIT 1))
  WHERE em.pedido_id IS NOT NULL
    AND cc.requisicao_id IS NOT NULL
) sub
WHERE ei.id = sub.entrada_item_id AND sub.ri_almox IS NOT NULL;
*/
