-- =====================================================
-- Permitir múltiplos ciclos com o mesmo numero_cotacao (multi-requisição / multi-CC)
-- Data: 2026-02-16
-- Descrição:
--   Uma cotação pode agrupar várias requisições (vários centros de custo).
--   Cada requisição tem um ciclo em cotacao_ciclos com o MESMO numero_cotacao.
--   Removemos UNIQUE(company_id, numero_cotacao) e passamos a usar
--   UNIQUE(company_id, numero_cotacao, requisicao_id) para evitar a mesma
--   requisição aparecer duas vezes na mesma cotação.
-- =====================================================

ALTER TABLE compras.cotacao_ciclos
  DROP CONSTRAINT IF EXISTS cotacao_ciclos_company_id_numero_cotacao_key;

-- Garantir que a mesma requisição não tenha dois ciclos na mesma cotação
ALTER TABLE compras.cotacao_ciclos
  ADD CONSTRAINT cotacao_ciclos_company_numero_requisicao_key
  UNIQUE (company_id, numero_cotacao, requisicao_id);

COMMENT ON CONSTRAINT cotacao_ciclos_company_numero_requisicao_key ON compras.cotacao_ciclos IS
'Uma requisição só pode aparecer uma vez por numero_cotacao. Vários ciclos (uma por requisição) podem compartilhar o mesmo numero_cotacao. 2026-02-16.';
