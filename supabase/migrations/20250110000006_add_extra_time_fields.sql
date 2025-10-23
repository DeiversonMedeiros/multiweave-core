-- =====================================================
-- ADICIONAR CAMPOS DE HORAS EXTRAS ADICIONAIS
-- =====================================================

-- Adicionar campos para duas marcações extras de horas extras
ALTER TABLE rh.time_records 
ADD COLUMN entrada_extra1 TIME,
ADD COLUMN saida_extra1 TIME,
ADD COLUMN entrada_extra2 TIME,
ADD COLUMN saida_extra2 TIME;

-- Adicionar comentários para documentar os novos campos
COMMENT ON COLUMN rh.time_records.entrada_extra1 IS 'Primeira entrada de horas extras após o expediente normal';
COMMENT ON COLUMN rh.time_records.saida_extra1 IS 'Primeira saída de horas extras após o expediente normal';
COMMENT ON COLUMN rh.time_records.entrada_extra2 IS 'Segunda entrada de horas extras adicionais';
COMMENT ON COLUMN rh.time_records.saida_extra2 IS 'Segunda saída de horas extras adicionais';
