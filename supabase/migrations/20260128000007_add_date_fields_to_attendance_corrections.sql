-- =====================================================
-- ADICIONAR CAMPOS DE DATA AOS HORÁRIOS CORRIGIDOS
-- =====================================================
-- Data: 2026-01-28
-- Descrição: Adiciona campos de data para os horários corrigidos,
--            permitindo que correções especifiquem data+hora quando
--            a marcação ocorreu em dia diferente de data_original.
-- =====================================================

-- Adicionar colunas de data para horários corrigidos
ALTER TABLE rh.attendance_corrections
ADD COLUMN IF NOT EXISTS entrada_corrigida_date DATE,
ADD COLUMN IF NOT EXISTS saida_corrigida_date DATE,
ADD COLUMN IF NOT EXISTS entrada_almoco_corrigida_date DATE,
ADD COLUMN IF NOT EXISTS saida_almoco_corrigida_date DATE,
ADD COLUMN IF NOT EXISTS entrada_extra1_corrigida_date DATE,
ADD COLUMN IF NOT EXISTS saida_extra1_corrigida_date DATE;

-- Comentários
COMMENT ON COLUMN rh.attendance_corrections.entrada_corrigida_date IS 
'Data real da entrada corrigida. Se NULL, assume-se que é igual a data_original.';

COMMENT ON COLUMN rh.attendance_corrections.saida_corrigida_date IS 
'Data real da saída corrigida. Se NULL, assume-se que é igual a data_original.';

COMMENT ON COLUMN rh.attendance_corrections.entrada_almoco_corrigida_date IS 
'Data real da entrada do almoço corrigida. Se NULL, assume-se que é igual a data_original.';

COMMENT ON COLUMN rh.attendance_corrections.saida_almoco_corrigida_date IS 
'Data real da saída do almoço corrigida. Se NULL, assume-se que é igual a data_original.';

COMMENT ON COLUMN rh.attendance_corrections.entrada_extra1_corrigida_date IS 
'Data real da entrada extra corrigida. Se NULL, assume-se que é igual a data_original.';

COMMENT ON COLUMN rh.attendance_corrections.saida_extra1_corrigida_date IS 
'Data real da saída extra corrigida. Se NULL, assume-se que é igual a data_original.';
