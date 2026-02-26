-- Recalcular registro de ponto do GABRIEL CARVALHO PEREIRA em 31/01/2026
-- (aplica a nova regra: escala fixa + sábado = 0h esperadas, 7h20 = extras 100%, sem horas negativas)

DO $$
DECLARE
  v_time_record_id UUID;
  v_nome TEXT;
BEGIN
  SELECT tr.id, e.nome
  INTO v_time_record_id, v_nome
  FROM rh.time_records tr
  JOIN rh.employees e ON e.id = tr.employee_id
  WHERE e.nome ILIKE '%GABRIEL%CARVALHO%PEREIRA%'
    AND tr.data_registro = '2026-01-31';

  IF v_time_record_id IS NULL THEN
    RAISE EXCEPTION 'Registro de ponto não encontrado para GABRIEL CARVALHO PEREIRA em 31/01/2026.';
  END IF;

  PERFORM rh.recalculate_time_record_hours(v_time_record_id);
  RAISE NOTICE 'Recalculado com sucesso: % (31/01/2026) - %', v_nome, v_time_record_id;
END $$;
