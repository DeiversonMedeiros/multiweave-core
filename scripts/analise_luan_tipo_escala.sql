-- Verificar tipo de escala e se horas_diarias seria 8 em algum caminho
SELECT 
  rh.get_employee_work_shift_type(
    'fc762aa3-4cf1-4d6b-a823-4260b2461822'::uuid, 
    'f83704f6-3278-4d59-81ca-45925a1ab855'::uuid, 
    '2026-01-28'::date
  ) AS tipo_escala_28jan,
  rh.get_employee_work_shift_type(
    'fc762aa3-4cf1-4d6b-a823-4260b2461822'::uuid, 
    'f83704f6-3278-4d59-81ca-45925a1ab855'::uuid, 
    '2026-01-31'::date
  ) AS tipo_escala_31jan;

-- Simular exatamente o que calculate_overtime faz para um registro
DO $$
DECLARE
  v_employee_id uuid := 'fc762aa3-4cf1-4d6b-a823-4260b2461822';
  v_company_id uuid := 'f83704f6-3278-4d59-81ca-45925a1ab855';
  v_date date := '2026-01-28';
  v_work_shift_id uuid;
  v_horas_diarias numeric(4,2);
  v_day_of_week int;
  v_day_hours jsonb;
BEGIN
  v_day_of_week := CASE WHEN EXTRACT(DOW FROM v_date) = 0 THEN 7 ELSE EXTRACT(DOW FROM v_date)::INTEGER END;
  
  SELECT es.turno_id, ws.horas_diarias
  INTO v_work_shift_id, v_horas_diarias
  FROM rh.employee_shifts es
  INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
  WHERE es.funcionario_id = v_employee_id
    AND es.company_id = v_company_id
    AND es.ativo = true
    AND es.data_inicio <= v_date
    AND (es.data_fim IS NULL OR es.data_fim >= v_date)
  ORDER BY es.data_inicio DESC
  LIMIT 1;

  RAISE NOTICE 'Após employee_shifts: turno_id=%, horas_diarias=%', v_work_shift_id, v_horas_diarias;

  IF v_work_shift_id IS NOT NULL THEN
    v_day_hours := rh.get_work_shift_hours_for_day(v_work_shift_id, v_day_of_week);
    IF v_day_hours IS NOT NULL AND v_day_hours ? 'horas_diarias' THEN
      v_horas_diarias := COALESCE((v_day_hours->>'horas_diarias')::NUMERIC, v_horas_diarias);
    END IF;
    RAISE NOTICE 'Após get_work_shift_hours_for_day: horas_diarias=%', v_horas_diarias;
  END IF;

  IF v_horas_diarias IS NULL THEN
    v_horas_diarias := 8.0;
    RAISE NOTICE 'Fallback 8.0 aplicado';
  END IF;
  
  RAISE NOTICE 'FINAL horas_diarias=% (esperado 7.33)', v_horas_diarias;
END $$;
