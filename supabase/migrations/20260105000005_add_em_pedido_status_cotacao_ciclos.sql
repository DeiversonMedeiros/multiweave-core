-- =====================================================
-- MIGRAÇÃO: Adicionar status 'em_pedido' em cotacao_ciclos
-- Data: 2025-01-05
-- Descrição: Adiciona o status 'em_pedido' ao CHECK constraint da tabela cotacao_ciclos
--            para permitir que cotações aprovadas mudem para 'em_pedido' após gerar pedidos
-- =====================================================

-- Remover o CHECK constraint antigo
ALTER TABLE compras.cotacao_ciclos
DROP CONSTRAINT IF EXISTS cotacao_ciclos_status_check;

-- Adicionar novo CHECK constraint com 'em_pedido'
ALTER TABLE compras.cotacao_ciclos
ADD CONSTRAINT cotacao_ciclos_status_check 
CHECK (status = ANY(ARRAY['aberta','completa','em_aprovacao','aprovada','reprovada','em_pedido']));

-- Comentário na constraint
COMMENT ON CONSTRAINT cotacao_ciclos_status_check ON compras.cotacao_ciclos IS 
'Status permitidos para cotação: aberta, completa, em_aprovacao, aprovada, reprovada, em_pedido';

