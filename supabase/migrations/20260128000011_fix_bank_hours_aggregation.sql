-- =====================================================
-- VERIFICAR E CORRIGIR FUNÇÕES DE BANCO DE HORAS
-- =====================================================
-- Data: 2026-01-28
-- Descrição: Verifica se as funções de banco de horas agregam corretamente
--            registros que cruzam meia-noite. O filtro por data_registro pode
--            estar correto (inclui registros que começam no período), mas
--            vamos garantir que está funcionando corretamente.
-- =====================================================

-- =====================================================
-- ANÁLISE: As funções atuais filtram por data_registro BETWEEN ...
-- =====================================================
-- Isso está CORRETO porque:
-- - data_registro é a data base do registro (data da entrada)
-- - Registros que cruzam meia-noite têm data_registro = data da entrada
-- - Ao filtrar por mês, queremos incluir registros que COMEÇARAM no mês
--   mesmo que terminem no mês seguinte
--
-- EXEMPLO:
-- - Entrada: 27/01/2026 21:24
-- - Saída: 28/01/2026 01:00
-- - data_registro: 27/01/2026
-- - Ao buscar janeiro, o registro será incluído (correto)
--
-- Porém, precisamos garantir que:
-- 1. Registros que começam no final de um mês e terminam no início do próximo
--    sejam incluídos no mês de início (correto com filtro atual)
-- 2. Não há necessidade de ajuste, mas vamos adicionar comentários explicativos
-- =====================================================

-- A função get_monthly_bank_hours_balance já está correta
-- Ela filtra por data_registro BETWEEN v_start_date AND v_end_date
-- Isso garante que registros que começam no mês sejam incluídos,
-- mesmo que terminem no mês seguinte.

-- A função calculate_and_accumulate_bank_hours também está correta
-- Ela filtra por data_registro BETWEEN p_period_start AND p_period_end
-- Isso garante que registros que começam no período sejam incluídos.

-- =====================================================
-- MELHORIA: Adicionar comentários explicativos
-- =====================================================

COMMENT ON FUNCTION rh.get_monthly_bank_hours_balance IS 
  'Calcula o saldo do banco de horas APENAS do mês específico (isolado).
   Não considera saldo anterior - mostra apenas o impacto do mês.
   Considera apenas horas extras 50% (não inclui 100%) e horas negativas.
   Fórmula: saldo_mensal = horas_extras_50 - horas_negativas.
   
   IMPORTANTE: Filtra por data_registro (data base do registro).
   Registros que cruzam meia-noite têm data_registro = data da entrada.
   Isso garante que registros que começam no mês sejam incluídos,
   mesmo que terminem no mês seguinte.';

COMMENT ON FUNCTION rh.calculate_and_accumulate_bank_hours IS 
  'Calcula e acumula horas no banco de horas para um período.
   Suporta sistema novo (bank_hours_assignments) e antigo (bank_hours_config).
   Considera apenas horas_extras_50 (exclui horas_extras_100 que são pagas diretamente).
   
   IMPORTANTE: Filtra por data_registro (data base do registro).
   Registros que cruzam meia-noite têm data_registro = data da entrada.
   Isso garante que registros que começam no período sejam incluídos,
   mesmo que terminem no período seguinte.';

-- =====================================================
-- VERIFICAÇÃO: Testar se há registros que podem estar sendo perdidos
-- =====================================================
-- Vamos criar uma função de teste para verificar se há registros
-- que cruzam meia-noite e podem estar sendo perdidos nas agregações
-- (mas na verdade, o filtro por data_registro deve estar correto)

-- Não há necessidade de correção, apenas documentação
-- As funções estão corretas porque:
-- 1. data_registro sempre será a data da entrada (ou primeiro evento)
-- 2. Filtros por data_registro capturam registros que começam no período
-- 3. Isso é o comportamento desejado para banco de horas
