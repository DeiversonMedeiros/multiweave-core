-- Diagnóstico: almoxarifado em entradas / entrada_itens
-- Executar via: psql "postgresql://..." -f scripts/diagnostico_almoxarifado_entradas.sql
--
-- RESULTADO DA ANÁLISE (2026-02-18):
-- 1. A coluna almoxarifado_id EXISTE em almoxarifado.entrada_itens.
-- 2. Para a entrada ENT-2F6FBAC3 (id 2f6fbac3-...): há 2 itens em entrada_itens, ambos com almoxarifado_id NULL.
-- 3. O pedido vinculado (166c5c17-...) não tem cotacao_ciclo_id nem cotacao_id, então o backfill
--    não encontra requisição nem destino_almoxarifado_id.
-- 4. A função compras.sync_entrada_itens_from_pedido NÃO inclui almoxarifado_id no INSERT, então
--    ao sincronizar do pedido os itens são criados sem almoxarifado.
-- 5. compras.requisicao_itens tem almoxarifado_id; compras.pedido_itens não tem.
-- Conclusão: card/modal mostram N/A porque no banco os itens estão com almoxarifado_id NULL.
-- Solução: migração que preenche almoxarifado_id no sync e backfill (quando pedido tem cotação/requisição).

-- 1) Colunas da tabela almoxarifado.entrada_itens (ver se almoxarifado_id existe)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'almoxarifado' AND table_name = 'entrada_itens'
ORDER BY ordinal_position;

-- 2) Últimas entradas com pedido_id (pré-entradas) e contagem de itens em entrada_itens
SELECT
  em.id AS entrada_id,
  em.pedido_id,
  em.data_entrada,
  em.status,
  (SELECT COUNT(*) FROM almoxarifado.entrada_itens ei WHERE ei.entrada_id = em.id) AS qtd_entrada_itens,
  (SELECT COUNT(*) FROM compras.pedido_itens pi WHERE pi.pedido_id = em.pedido_id) AS qtd_pedido_itens
FROM almoxarifado.entradas_materiais em
WHERE em.pedido_id IS NOT NULL
ORDER BY em.data_entrada DESC
LIMIT 10;

-- 3) Itens de entrada (entrada_itens) com almoxarifado_id para uma entrada recente
SELECT
  ei.id,
  ei.entrada_id,
  ei.material_equipamento_id,
  ei.quantidade_recebida,
  ei.almoxarifado_id,
  a.nome AS almoxarifado_nome
FROM almoxarifado.entrada_itens ei
LEFT JOIN almoxarifado.almoxarifados a ON a.id = ei.almoxarifado_id
WHERE ei.entrada_id IN (
  SELECT id FROM almoxarifado.entradas_materiais WHERE pedido_id IS NOT NULL ORDER BY data_entrada DESC LIMIT 3
)
ORDER BY ei.entrada_id, ei.id;

-- 4) Requisição de compra: destino_almoxarifado_id (origem do almoxarifado na pré-entrada)
SELECT
  rc.id AS requisicao_id,
  rc.destino_almoxarifado_id,
  a.nome AS almoxarifado_nome
FROM compras.requisicoes_compra rc
LEFT JOIN almoxarifado.almoxarifados a ON a.id = rc.destino_almoxarifado_id
WHERE rc.id IN (
  SELECT cc.requisicao_id
  FROM compras.pedidos_compra p
  JOIN compras.cotacao_ciclos cc ON cc.id = COALESCE(p.cotacao_ciclo_id, (SELECT cotacao_ciclo_id FROM compras.cotacoes c WHERE c.id = p.cotacao_id LIMIT 1))
  WHERE p.id IN (SELECT pedido_id FROM almoxarifado.entradas_materiais WHERE pedido_id IS NOT NULL)
)
LIMIT 5;
