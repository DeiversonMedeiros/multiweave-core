-- =====================================================
-- MIGRAÇÃO: Corrigir encoding da palavra "cotação" nas observações
-- Data: 2025-01-25
-- Descrição: 
--   - Corrige a palavra "cota????o" para "cotação" nas observações das entradas
--   - Corrige também nas observações dos pedidos
-- =====================================================

-- Corrigir observações das entradas de materiais
UPDATE almoxarifado.entradas_materiais
SET observacoes = REPLACE(observacoes, 'cota????o', 'cotação')
WHERE observacoes LIKE '%cota%';

-- Corrigir observações dos pedidos de compra
UPDATE compras.pedidos_compra
SET observacoes = REPLACE(observacoes, 'cota????o', 'cotação')
WHERE observacoes LIKE '%cota%';

-- Verificar resultados
SELECT 
    COUNT(*) as entradas_corrigidas
FROM almoxarifado.entradas_materiais
WHERE observacoes LIKE '%cotação%';

SELECT 
    COUNT(*) as pedidos_corrigidos
FROM compras.pedidos_compra
WHERE observacoes LIKE '%cotação%';
