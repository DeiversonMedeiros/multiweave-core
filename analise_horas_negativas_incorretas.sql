-- =====================================================
-- ANÁLISE: Horas Negativas Incorretas
-- =====================================================
-- Identificar registros onde horas negativas foram calculadas
-- incorretamente mesmo com todas as marcações de ponto feitas
-- =====================================================

-- 1. Verificar registros com horas negativas que têm todas as marcações
SELECT 
  tr.id,
  tr.employee_id,
  e.nome as funcionario_nome,
  e.matricula,
  tr.data_registro,
  tr.entrada,
  tr.saida,
  tr.entrada_almoco,
  tr.saida_almoco,
  tr.entrada_extra1,
  tr.saida_extra1,
  tr.horas_trabalhadas,
  tr.horas_negativas,
  tr.status,
  -- Verificar se tem todas as marcações principais
  CASE 
    WHEN tr.entrada IS NOT NULL AND tr.saida IS NOT NULL 
         AND (tr.entrada_almoco IS NULL OR tr.saida_almoco IS NULL) THEN 'Falta almoço'
    WHEN tr.entrada IS NOT NULL AND tr.saida IS NOT NULL 
         AND tr.entrada_almoco IS NOT NULL AND tr.saida_almoco IS NOT NULL THEN 'Completo'
    WHEN tr.entrada IS NULL OR tr.saida IS NULL THEN 'Incompleto'
    ELSE 'Desconhecido'
  END as status_marcacoes,
  -- Obter horas esperadas do turno
  COALESCE(
    (rh.get_work_shift_hours_for_day(
      es.turno_id,
      CASE WHEN EXTRACT(DOW FROM tr.data_registro) = 0 THEN 7
           ELSE EXTRACT(DOW FROM tr.data_registro)::INTEGER END
    )->>'horas_diarias')::NUMERIC,
    ws.horas_diarias,
    8.0
  ) as horas_esperadas,
  -- Calcular diferença
  tr.horas_trabalhadas - COALESCE(
    (rh.get_work_shift_hours_for_day(
      es.turno_id,
      CASE WHEN EXTRACT(DOW FROM tr.data_registro) = 0 THEN 7
           ELSE EXTRACT(DOW FROM tr.data_registro)::INTEGER END
    )->>'horas_diarias')::NUMERIC,
    ws.horas_diarias,
    8.0
  ) as diferenca_horas
FROM rh.time_records tr
INNER JOIN rh.employees e ON e.id = tr.employee_id
LEFT JOIN rh.employee_shifts es ON es.funcionario_id = tr.employee_id
  AND es.company_id = tr.company_id
  AND es.ativo = true
  AND es.data_inicio <= tr.data_registro
  AND (es.data_fim IS NULL OR es.data_fim >= tr.data_registro)
LEFT JOIN rh.work_shifts ws ON ws.id = es.turno_id
WHERE tr.horas_negativas > 0
  AND tr.entrada IS NOT NULL 
  AND tr.saida IS NOT NULL
  AND tr.status IN ('aprovado', 'pendente')
ORDER BY tr.data_registro DESC
LIMIT 50;

-- 2. Verificar casos específicos onde horas trabalhadas >= horas esperadas mas tem horas negativas
SELECT 
  tr.id,
  e.nome as funcionario_nome,
  tr.data_registro,
  tr.horas_trabalhadas,
  tr.horas_negativas,
  COALESCE(
    (rh.get_work_shift_hours_for_day(
      es.turno_id,
      CASE WHEN EXTRACT(DOW FROM tr.data_registro) = 0 THEN 7
           ELSE EXTRACT(DOW FROM tr.data_registro)::INTEGER END
    )->>'horas_diarias')::NUMERIC,
    ws.horas_diarias,
    8.0
  ) as horas_esperadas,
  tr.horas_trabalhadas - COALESCE(
    (rh.get_work_shift_hours_for_day(
      es.turno_id,
      CASE WHEN EXTRACT(DOW FROM tr.data_registro) = 0 THEN 7
           ELSE EXTRACT(DOW FROM tr.data_registro)::INTEGER END
    )->>'horas_diarias')::NUMERIC,
    ws.horas_diarias,
    8.0
  ) as diferenca,
  tr.entrada,
  tr.saida,
  tr.entrada_almoco,
  tr.saida_almoco
FROM rh.time_records tr
INNER JOIN rh.employees e ON e.id = tr.employee_id
LEFT JOIN rh.employee_shifts es ON es.funcionario_id = tr.employee_id
  AND es.company_id = tr.company_id
  AND es.ativo = true
  AND es.data_inicio <= tr.data_registro
  AND (es.data_fim IS NULL OR es.data_fim >= tr.data_registro)
LEFT JOIN rh.work_shifts ws ON ws.id = es.turno_id
WHERE tr.horas_negativas > 0
  AND tr.horas_trabalhadas >= COALESCE(
    (rh.get_work_shift_hours_for_day(
      es.turno_id,
      CASE WHEN EXTRACT(DOW FROM tr.data_registro) = 0 THEN 7
           ELSE EXTRACT(DOW FROM tr.data_registro)::INTEGER END
    )->>'horas_diarias')::NUMERIC,
    ws.horas_diarias,
    8.0
  )
ORDER BY tr.data_registro DESC;

