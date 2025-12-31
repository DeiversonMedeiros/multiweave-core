-- =====================================================
-- CONSTRAINT: Prevenir múltiplos ciclos ativos por requisição
-- =====================================================
-- Data: 2025-01-31
-- Descrição: Adiciona índice único parcial para garantir que apenas
--            uma cotação ativa (rascunho, em_aprovacao, aberta) 
--            existe por requisição por vez
-- =====================================================

-- Remover índice se já existir
DROP INDEX IF EXISTS compras.idx_cotacao_ciclos_requisicao_ativa;

-- Criar índice único parcial para prevenir múltiplos ciclos ativos
-- Este índice garante que apenas uma cotação com status ativo existe por requisição
CREATE UNIQUE INDEX idx_cotacao_ciclos_requisicao_ativa 
ON compras.cotacao_ciclos(requisicao_id) 
WHERE workflow_state IN ('rascunho', 'em_aprovacao', 'aberta', 'em_cotacao')
   OR status IN ('rascunho', 'em_aprovacao', 'aberta', 'em_cotacao');

COMMENT ON INDEX compras.idx_cotacao_ciclos_requisicao_ativa IS 
'Garante que apenas uma cotação ativa existe por requisição, prevenindo conflitos quando múltiplos compradores trabalham simultaneamente. Permite múltiplas cotações apenas se todas estiverem finalizadas, canceladas ou reprovadas.';

