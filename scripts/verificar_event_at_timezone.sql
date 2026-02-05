-- =====================================================
-- Verificação: event_at vs horário exibido (timezone)
-- =====================================================
-- Executar via Supabase CLI ou SQL Editor.
-- Objetivo: ver se event_at está em UTC puro (bug) ou já em instante correto.
-- Exemplo: ALEXSANDRO BASTOS BARBOSA, 28/01/2026.
-- =====================================================

-- 1) Id do funcionário ALEXSANDRO BASTOS BARBOSA (matrícula 04058)
WITH emp AS (
  SELECT id, nome, matricula
  FROM rh.employees
  WHERE nome ILIKE '%ALEXSANDRO%BASTOS%BARBOSA%' OR matricula = '04058'
  LIMIT 1
),
-- 2) Registro de ponto em 28/01/2026
rec AS (
  SELECT tr.id AS time_record_id, tr.data_registro, tr.entrada, tr.saida,
         tr.entrada_almoco, tr.saida_almoco, tr.entrada_extra1, tr.saida_extra1
  FROM rh.time_records tr
  JOIN emp e ON e.id = tr.employee_id
  WHERE tr.data_registro = '2026-01-28'
  LIMIT 1
)
-- 3) Eventos desse registro: event_at (UTC), horário em America/Sao_Paulo e time_records
SELECT
  tre.event_type,
  tre.event_at AS event_at_utc,
  (tre.event_at AT TIME ZONE 'America/Sao_Paulo')::time AS hora_exibida_sao_paulo,
  rec.entrada   AS tr_entrada,
  rec.saida     AS tr_saida,
  rec.entrada_almoco AS tr_entrada_almoco,
  rec.saida_almoco   AS tr_saida_almoco,
  rec.entrada_extra1 AS tr_entrada_extra1,
  rec.saida_extra1   AS tr_saida_extra1
FROM rh.time_record_events tre
CROSS JOIN rec
WHERE tre.time_record_id = rec.time_record_id
ORDER BY tre.event_at;

-- Se "hora_exibida_sao_paulo" estiver 3h atrás do esperado (ex.: 05:01 em vez de 08:01),
-- o event_at foi gravado como UTC incorreto (bug corrigido na migração 20260204000003).
