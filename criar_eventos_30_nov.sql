-- Criar eventos de ponto para 30/11/2025
DO $$
DECLARE 
  v_record_id uuid;
  v_employee_id uuid;
  v_company_id uuid;
  v_data_registro date := '2025-11-30';
BEGIN
  SELECT tr.id, tr.employee_id, tr.company_id
  INTO v_record_id, v_employee_id, v_company_id
  FROM rh.time_records tr
  INNER JOIN rh.employees e ON e.id = tr.employee_id
  WHERE e.matricula = '03027'
    AND tr.data_registro = v_data_registro
  LIMIT 1;

  IF v_record_id IS NOT NULL THEN
    -- Criar eventos de ponto
    INSERT INTO rh.time_record_events (time_record_id, employee_id, company_id, event_type, event_at, source)
    VALUES 
      (v_record_id, v_employee_id, v_company_id, 'entrada', (v_data_registro + '14:04:00'::time)::timestamptz, 'recuperacao'),
      (v_record_id, v_employee_id, v_company_id, 'entrada_almoco', (v_data_registro + '18:06:00'::time)::timestamptz, 'recuperacao'),
      (v_record_id, v_employee_id, v_company_id, 'saida_almoco', (v_data_registro + '19:00:00'::time)::timestamptz, 'recuperacao'),
      (v_record_id, v_employee_id, v_company_id, 'saida', (v_data_registro + '22:30:00'::time)::timestamptz, 'recuperacao')
    ON CONFLICT DO NOTHING;
    
    -- Recalcular horas
    PERFORM rh.recalculate_time_record_hours(v_record_id);
    
    RAISE NOTICE 'Eventos criados e horas recalculadas para %', v_data_registro;
  END IF;
END;
$$;

SELECT tr.data_registro, tr.entrada, tr.saida, tr.horas_trabalhadas, tr.horas_noturnas, tr.horas_negativas, tr.horas_extras_50, tr.horas_extras_100
FROM rh.time_records tr
INNER JOIN rh.employees e ON e.id = tr.employee_id
WHERE e.matricula = '03027' AND tr.data_registro = '2025-11-30';

