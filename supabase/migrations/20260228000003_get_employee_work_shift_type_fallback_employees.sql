-- =====================================================
-- get_employee_work_shift_type: fallback em employees.work_shift_id
-- =====================================================
-- Data: 2026-02-28
--
-- Problema: Quando o funcionário não tem registro em rh.employee_shifts (só tem
-- employees.work_shift_id), get_employee_work_shift_type retornava sempre 'fixa'.
-- Assim, calculate_overtime_by_scale nunca entrava no bloco flexivel_6x1 e o
-- 7º dia após DSR não recebia hora extra 100%.
--
-- Solução: Em get_employee_work_shift_type, se não houver employee_shift para
-- a data, buscar tipo_escala do turno em rh.employees.work_shift_id -> rh.work_shifts.
-- =====================================================

CREATE OR REPLACE FUNCTION rh.get_employee_work_shift_type(
  p_employee_id UUID,
  p_company_id UUID,
  p_date DATE
)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_tipo_escala VARCHAR(50);
BEGIN
  -- 1) Buscar em employee_shifts (permite histórico por período)
  SELECT ws.tipo_escala
  INTO v_tipo_escala
  FROM rh.employee_shifts es
  INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
  WHERE es.funcionario_id = p_employee_id
    AND es.company_id = p_company_id
    AND es.ativo = true
    AND es.data_inicio <= p_date
    AND (es.data_fim IS NULL OR es.data_fim >= p_date)
  ORDER BY es.data_inicio DESC
  LIMIT 1;

  -- 2) Fallback: se não encontrou, usar turno direto do funcionário (employees.work_shift_id)
  IF v_tipo_escala IS NULL THEN
    SELECT ws.tipo_escala
    INTO v_tipo_escala
    FROM rh.employees e
    INNER JOIN rh.work_shifts ws ON ws.id = e.work_shift_id
    WHERE e.id = p_employee_id
      AND e.company_id = p_company_id
      AND e.work_shift_id IS NOT NULL;
  END IF;

  RETURN COALESCE(v_tipo_escala, 'fixa');
END;
$$;

COMMENT ON FUNCTION rh.get_employee_work_shift_type(UUID, UUID, DATE) IS
'Retorna o tipo de escala do funcionário na data. Busca em employee_shifts; se não houver, usa employees.work_shift_id.';
