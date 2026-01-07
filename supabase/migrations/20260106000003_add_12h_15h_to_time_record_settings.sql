-- =====================================================
-- ADICIONAR OPÇÕES 12H E 15H PARA JANELA DE TEMPO
-- =====================================================
-- Data: 2026-01-06
-- Descrição: Atualiza a constraint CHECK para permitir 12h e 15h além das opções existentes (20h, 22h, 24h)
-- =====================================================

-- Remover a constraint antiga
ALTER TABLE rh.time_record_settings 
DROP CONSTRAINT IF EXISTS time_record_settings_janela_tempo_marcacoes_check;

-- Adicionar nova constraint com as opções 12h, 15h, 20h, 22h e 24h
ALTER TABLE rh.time_record_settings 
ADD CONSTRAINT time_record_settings_janela_tempo_marcacoes_check 
CHECK (janela_tempo_marcacoes IN (12, 15, 20, 22, 24));

-- Atualizar comentário da coluna
COMMENT ON COLUMN rh.time_record_settings.janela_tempo_marcacoes IS 'Janela de tempo em horas (12, 15, 20, 22 ou 24) para permitir marcações após a primeira marcação do dia';

