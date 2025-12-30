-- Testar cálculo de horas extras para um registro específico
-- Registro: 28/11/2025 - VITOR ALVES

-- 1. Verificar dados antes do recálculo
SELECT 
  'ANTES' as momento,
  tr.id,
  tr.data_registro,
  tr.horas_trabalhadas,
  tr.horas_negativas,
  tr.horas_extras_50,
  tr.horas_extras_100,
  tr.is_feriado,
  tr.is_dia_folga
FROM rh.time_records tr
WHERE tr.id = 'aba802ed-4ee7-4845-abc7-88b7b3ab571b';

-- 2. Verificar turno que deveria ser usado
SELECT 
  es.turno_id,
  ws.horas_diarias,
  ws.tipo_escala,
  ws.dias_semana
FROM rh.employee_shifts es
INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
WHERE es.funcionario_id = '9ce0c4e9-8bb0-4ad8-ab77-ac8af3f1e3c0'
  AND es.company_id = (SELECT company_id FROM rh.time_records WHERE id = 'aba802ed-4ee7-4845-abc7-88b7b3ab571b')
  AND es.ativo = true
  AND es.data_inicio <= '2025-11-28'
  AND (es.data_fim IS NULL OR es.data_fim >= '2025-11-28')
ORDER BY es.data_inicio DESC
LIMIT 1;

-- 3. Recalcular usando a função
SELECT rh.recalculate_time_record_hours('aba802ed-4ee7-4845-abc7-88b7b3ab571b');

-- 4. Verificar dados após o recálculo
SELECT 
  'DEPOIS' as momento,
  tr.id,
  tr.data_registro,
  tr.horas_trabalhadas,
  tr.horas_negativas,
  tr.horas_extras_50,
  tr.horas_extras_100,
  tr.is_feriado,
  tr.is_dia_folga
FROM rh.time_records tr
WHERE tr.id = 'aba802ed-4ee7-4845-abc7-88b7b3ab571b';

