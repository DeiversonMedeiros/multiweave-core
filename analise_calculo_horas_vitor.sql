-- =====================================================
-- ANÁLISE COMPLETA: Cálculo de Horas - VITOR ALVES
-- Matrícula: 03027
-- Escala: 6x1 com 7.33h por dia
-- =====================================================

-- 1. Verificar dados do funcionário e escala
SELECT 
  e.nome,
  e.matricula,
  ws.tipo_escala,
  ws.horas_diarias,
  ws.dias_semana,
  ws.horarios_por_dia
FROM rh.employees e
INNER JOIN rh.employee_shifts es ON es.funcionario_id = e.id
INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
WHERE e.id = '9ce0c4e9-8bb0-4ad8-ab77-ac8af3f1e3c0'
  AND es.ativo = true
ORDER BY es.data_inicio DESC
LIMIT 1;

-- 2. Verificar registros de ponto com cálculos esperados vs reais
SELECT 
  tr.data_registro,
  TO_CHAR(tr.data_registro, 'Day') as dia_semana,
  EXTRACT(DOW FROM tr.data_registro) as dow,
  CASE WHEN EXTRACT(DOW FROM tr.data_registro) = 0 THEN 7
       ELSE EXTRACT(DOW FROM tr.data_registro)::INTEGER END as day_of_week,
  tr.horas_trabalhadas,
  7.33 as horas_esperadas,
  tr.horas_trabalhadas - 7.33 as diferenca_esperada,
  tr.horas_negativas as horas_negativas_calculadas,
  tr.horas_extras_50 as horas_extras_50_calculadas,
  tr.horas_extras_100 as horas_extras_100_calculadas,
  tr.is_feriado,
  tr.is_domingo,
  tr.is_dia_folga,
  rh.is_holiday(tr.data_registro, tr.company_id) as is_feriado_real,
  rh.is_rest_day(tr.employee_id, tr.company_id, tr.data_registro) as is_dia_folga_real,
  tr.status
FROM rh.time_records tr
WHERE tr.employee_id = '9ce0c4e9-8bb0-4ad8-ab77-ac8af3f1e3c0'
  AND tr.data_registro >= '2025-11-25'
  AND tr.data_registro <= '2025-11-30'
ORDER BY tr.data_registro DESC;

-- 3. Verificar feriados cadastrados
SELECT 
  h.data,
  h.nome,
  h.ativo
FROM rh.holidays h
WHERE h.company_id = (SELECT company_id FROM rh.employees WHERE id = '9ce0c4e9-8bb0-4ad8-ab77-ac8af3f1e3c0')
  AND h.data >= '2025-11-01'
  AND h.data <= '2025-11-30'
ORDER BY h.data;

-- 4. Testar função get_work_shift_hours_for_day
SELECT 
  rh.get_work_shift_hours_for_day(
    (SELECT es.turno_id 
     FROM rh.employee_shifts es 
     WHERE es.funcionario_id = '9ce0c4e9-8bb0-4ad8-ab77-ac8af3f1e3c0' 
       AND es.ativo = true 
     ORDER BY es.data_inicio DESC 
     LIMIT 1),
    5
  ) as day_hours_friday;

-- 5. Verificar se horas_noturnas existe na tabela
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'rh'
  AND table_name = 'time_records'
  AND column_name LIKE '%noturn%';

