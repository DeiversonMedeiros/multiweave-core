-- =====================================================
-- MIGRAR CAMPOS LEGADOS PARA NOVOS CAMPOS
-- Data: 2025-11-11
-- Descrição: Migra dados dos campos legados para os novos campos detalhados
-- =====================================================

-- Migrar dados de certidao_casamento para certidao_casamento_numero
-- Apenas se certidao_casamento_numero estiver vazio e certidao_casamento tiver valor
UPDATE rh.employees
SET certidao_casamento_numero = certidao_casamento
WHERE certidao_casamento IS NOT NULL 
  AND certidao_casamento != ''
  AND (certidao_casamento_numero IS NULL OR certidao_casamento_numero = '');

-- Migrar dados de tipo_cnh para cnh_categoria
-- Apenas se cnh_categoria estiver vazio e tipo_cnh tiver valor
UPDATE rh.employees
SET cnh_categoria = tipo_cnh
WHERE tipo_cnh IS NOT NULL 
  AND tipo_cnh != ''
  AND (cnh_categoria IS NULL OR cnh_categoria = '');

-- Comentário sobre a migração
COMMENT ON COLUMN rh.employees.certidao_casamento IS 'Campo legado - use certidao_casamento_numero e certidao_casamento_data';
COMMENT ON COLUMN rh.employees.tipo_cnh IS 'Campo legado - use cnh_categoria';

