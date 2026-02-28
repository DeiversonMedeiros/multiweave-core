-- =====================================================
-- Diagnóstico e logs para hora extra 100% (7º dia após DSR)
-- =====================================================
-- Data: 2026-02-28
--
-- 1) Função rh.diagnose_overtime_7th_day(employee_id, company_id, data)
--    Retorna uma tabela com o passo a passo do cálculo (tipo_escala, contagem de dias, motivo de parada).
--
-- 2) Logs (RAISE NOTICE) em calculate_overtime_by_scale quando excedente > 0,
--    com prefixo [OVERTIME_7TH] para filtrar no cliente.
-- =====================================================

-- 1) Função de diagnóstico: simula a lógica do 7º dia para um (employee, company, data)
CREATE OR REPLACE FUNCTION rh.diagnose_overtime_7th_day(
  p_employee_id UUID,
  p_company_id UUID,
  p_date DATE
)
RETURNS TABLE(
  etapa TEXT,
  valor TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_tipo_escala VARCHAR(50);
  v_work_shift_id UUID;
  v_horas_diarias NUMERIC;
  v_horas_trabalhadas NUMERIC;
  v_excedente NUMERIC;
  v_check_date DATE;
  v_consecutive_work_days INT := 0;
  v_trabalhadas_antes NUMERIC;
  v_is_rest BOOLEAN;
  v_is_virtual_dsr BOOLEAN;
  v_has_record BOOLEAN;
  v_reason TEXT;
BEGIN
  -- Tipo de escala (mesma lógica que calculate_overtime)
  v_tipo_escala := rh.get_employee_work_shift_type(p_employee_id, p_company_id, p_date);
  RETURN QUERY SELECT '1_tipo_escala'::TEXT, COALESCE(v_tipo_escala, 'NULL')::TEXT;

  SELECT tr.horas_trabalhadas INTO v_horas_trabalhadas
  FROM rh.time_records tr
  WHERE tr.employee_id = p_employee_id AND tr.company_id = p_company_id AND tr.data_registro = p_date
  LIMIT 1;
  RETURN QUERY SELECT '2_horas_trabalhadas_no_dia'::TEXT, COALESCE(v_horas_trabalhadas::TEXT, 'sem registro')::TEXT;

  -- Horas diárias esperadas (simplificado: via employee_shifts ou employees)
  SELECT es.turno_id, ws.horas_diarias INTO v_work_shift_id, v_horas_diarias
  FROM rh.employee_shifts es
  INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
  WHERE es.funcionario_id = p_employee_id AND es.company_id = p_company_id AND es.ativo = true
    AND es.data_inicio <= p_date AND (es.data_fim IS NULL OR es.data_fim >= p_date)
  ORDER BY es.data_inicio DESC LIMIT 1;
  IF v_work_shift_id IS NULL OR v_horas_diarias IS NULL THEN
    SELECT e.work_shift_id, ws.horas_diarias INTO v_work_shift_id, v_horas_diarias
    FROM rh.employees e
    LEFT JOIN rh.work_shifts ws ON ws.id = e.work_shift_id
    WHERE e.id = p_employee_id AND e.company_id = p_company_id;
  END IF;
  v_horas_diarias := COALESCE(v_horas_diarias, 8.0);
  RETURN QUERY SELECT '3_horas_diarias_esperadas'::TEXT, v_horas_diarias::TEXT;

  v_excedente := COALESCE(v_horas_trabalhadas, 0) - v_horas_diarias;
  RETURN QUERY SELECT '4_excedente'::TEXT, v_excedente::TEXT;

  IF v_tipo_escala <> 'flexivel_6x1' THEN
    RETURN QUERY SELECT '5_entra_bloco_flexivel_6x1'::TEXT, 'NAO (tipo=' || COALESCE(v_tipo_escala, 'NULL') || ')'::TEXT;
    RETURN;
  END IF;
  RETURN QUERY SELECT '5_entra_bloco_flexivel_6x1'::TEXT, 'SIM'::TEXT;

  -- Contagem dia a dia (igual ao loop em calculate_overtime_by_scale)
  v_check_date := p_date - 1;
  WHILE v_check_date >= p_date - 14 LOOP
    v_is_rest := rh.is_rest_day(p_employee_id, p_company_id, v_check_date);
    v_is_virtual_dsr := rh.is_virtual_dsr(p_employee_id, p_company_id, v_check_date);
    SELECT tr.horas_trabalhadas INTO v_trabalhadas_antes
    FROM rh.time_records tr
    WHERE tr.employee_id = p_employee_id AND tr.company_id = p_company_id AND tr.data_registro = v_check_date;
    v_has_record := FOUND;

    IF v_is_rest THEN
      v_reason := 'is_rest_day=TRUE';
      RETURN QUERY SELECT ('dia_' || v_check_date::TEXT)::TEXT, ('QUEBRA: ' || v_reason)::TEXT;
      EXIT;
    END IF;
    IF v_is_virtual_dsr THEN
      v_reason := 'is_virtual_dsr=TRUE';
      RETURN QUERY SELECT ('dia_' || v_check_date::TEXT)::TEXT, ('QUEBRA: ' || v_reason)::TEXT;
      EXIT;
    END IF;
    IF NOT v_has_record THEN
      v_reason := 'sem registro em time_records';
      RETURN QUERY SELECT ('dia_' || v_check_date::TEXT)::TEXT, ('QUEBRA: ' || v_reason)::TEXT;
      EXIT;
    END IF;

    v_consecutive_work_days := v_consecutive_work_days + 1;
    RETURN QUERY SELECT ('dia_' || v_check_date::TEXT)::TEXT,
      ('conta+1 -> total=' || v_consecutive_work_days || ', horas=' || COALESCE(v_trabalhadas_antes::TEXT, 'NULL'))::TEXT;
    v_check_date := v_check_date - 1;
  END LOOP;

  RETURN QUERY SELECT '6_consecutive_work_days'::TEXT, v_consecutive_work_days::TEXT;
  RETURN QUERY SELECT '7_aplica_100_percent'::TEXT, (v_consecutive_work_days >= 6)::TEXT;
END;
$$;

COMMENT ON FUNCTION rh.diagnose_overtime_7th_day(UUID, UUID, DATE) IS
'Diagnóstico da regra de 7º dia (hora extra 100%). Retorna etapas e valores para um (employee_id, company_id, data). Use: SELECT * FROM rh.diagnose_overtime_7th_day(''uuid'', ''uuid'', ''2026-01-11''::date);';


-- 2) Adicionar logs em calculate_overtime_by_scale (redeclarar variáveis de log e incluir RAISE NOTICE)
-- Como não podemos alterar apenas um trecho, recriamos a função com os NOTICEs no bloco flexivel_6x1.
CREATE OR REPLACE FUNCTION rh.calculate_overtime_by_scale(
  p_time_record_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_id UUID;
  v_company_id UUID;
  v_date DATE;
  v_horas_trabalhadas DECIMAL(4,2);
  v_horas_diarias DECIMAL(4,2);
  v_tipo_escala VARCHAR(50);
  v_is_feriado BOOLEAN;
  v_is_domingo BOOLEAN;
  v_is_dia_folga BOOLEAN;
  v_horas_extras_50 DECIMAL(4,2) := 0;
  v_horas_extras_100 DECIMAL(4,2) := 0;
  v_horas_para_banco DECIMAL(4,2) := 0;
  v_horas_para_pagamento DECIMAL(4,2) := 0;
  v_horas_negativas DECIMAL(4,2) := 0;
  v_horas_noturnas DECIMAL(4,2) := 0;
  v_excedente NUMERIC(10,2);
  v_janela_horas NUMERIC(10,2) := 24;
  v_excedente_limitado NUMERIC(10,2);
  v_work_shift_id UUID;
  v_day_of_week INTEGER;
  v_day_hours JSONB;
  v_entrada TIME;
  v_saida TIME;
  v_entrada_almoco TIME;
  v_saida_almoco TIME;
  v_tem_todas_marcacoes BOOLEAN := false;
  v_debug_info TEXT;
  v_entrada_date DATE;
  v_saida_date DATE;
  v_timezone text := 'America/Sao_Paulo';
  v_horas_extras_sum DECIMAL(4,2);
  v_consecutive_work_days INTEGER := 0;
  v_check_date DATE;
  v_trabalhadas_antes NUMERIC(10,2);
  v_exit_reason TEXT;
BEGIN
  SELECT 
    tr.employee_id,
    tr.company_id,
    tr.data_registro,
    tr.horas_trabalhadas,
    tr.entrada,
    tr.saida,
    tr.entrada_almoco,
    tr.saida_almoco
  INTO 
    v_employee_id,
    v_company_id,
    v_date,
    v_horas_trabalhadas,
    v_entrada,
    v_saida,
    v_entrada_almoco,
    v_saida_almoco
  FROM rh.time_records tr
  WHERE tr.id = p_time_record_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_tem_todas_marcacoes := (v_entrada IS NOT NULL AND v_saida IS NOT NULL);

  SELECT COALESCE(trs.janela_tempo_marcacoes, 24) INTO v_janela_horas
  FROM rh.time_record_settings trs
  WHERE trs.company_id = v_company_id
  LIMIT 1;
  IF v_janela_horas IS NULL THEN v_janela_horas := 24; END IF;

  v_day_of_week := CASE 
    WHEN EXTRACT(DOW FROM v_date) = 0 THEN 7
    ELSE EXTRACT(DOW FROM v_date)::INTEGER
  END;

  SELECT 
    rh.get_employee_work_shift_type(v_employee_id, v_company_id, v_date),
    es.turno_id,
    ws.horas_diarias
  INTO 
    v_tipo_escala,
    v_work_shift_id,
    v_horas_diarias
  FROM rh.employee_shifts es
  INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
  WHERE es.funcionario_id = v_employee_id
    AND es.company_id = v_company_id
    AND es.ativo = true
    AND es.data_inicio <= v_date
    AND (es.data_fim IS NULL OR es.data_fim >= v_date)
  ORDER BY es.data_inicio DESC
  LIMIT 1;

  IF v_work_shift_id IS NULL OR v_horas_diarias IS NULL THEN
    SELECT 
      rh.get_employee_work_shift_type(v_employee_id, v_company_id, v_date),
      e.work_shift_id,
      ws.horas_diarias
    INTO 
      v_tipo_escala,
      v_work_shift_id,
      v_horas_diarias
    FROM rh.employees e
    LEFT JOIN rh.work_shifts ws ON ws.id = e.work_shift_id
    WHERE e.id = v_employee_id
      AND e.company_id = v_company_id;
  END IF;

  IF v_work_shift_id IS NOT NULL THEN
    v_day_hours := rh.get_work_shift_hours_for_day(v_work_shift_id, v_day_of_week);
    IF v_day_hours IS NOT NULL AND v_day_hours ? 'horas_diarias' THEN
      v_horas_diarias := COALESCE((v_day_hours->>'horas_diarias')::NUMERIC, v_horas_diarias);
    END IF;
  END IF;

  IF v_horas_diarias IS NULL AND v_work_shift_id IS NOT NULL THEN
    SELECT horas_diarias INTO v_horas_diarias FROM rh.work_shifts WHERE id = v_work_shift_id;
  END IF;

  IF v_horas_diarias IS NULL THEN
    v_horas_diarias := 8.0;
    v_debug_info := format('AVISO: Usando padrão 8.0h para funcionário %s em %s (turno não encontrado)', 
                          v_employee_id, v_date);
    RAISE WARNING '%', v_debug_info;
  END IF;
  
  IF v_tipo_escala IS NULL THEN
    v_tipo_escala := 'fixa';
  END IF;

  v_is_feriado := rh.is_holiday(v_date, v_company_id);
  v_is_domingo := rh.is_sunday(v_date);
  v_is_dia_folga := rh.is_rest_day(v_employee_id, v_company_id, v_date);

  IF v_tipo_escala = 'fixa' AND v_is_dia_folga THEN
    v_horas_diarias := 0;
  END IF;

  SELECT 
    (MIN(CASE WHEN event_type = 'entrada' THEN event_at END) AT TIME ZONE v_timezone)::date,
    (MAX(CASE WHEN event_type = 'saida' THEN event_at END) AT TIME ZONE v_timezone)::date
  INTO 
    v_entrada_date,
    v_saida_date
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id;
  
  IF v_entrada_date IS NULL THEN v_entrada_date := v_date; END IF;
  IF v_saida_date IS NULL THEN v_saida_date := v_date; END IF;

  v_horas_noturnas := rh.calculate_night_hours(
    v_entrada, v_saida, v_date, v_entrada_date, v_saida_date
  );

  v_excedente := v_horas_trabalhadas - v_horas_diarias;
  v_excedente := GREATEST(-99.99, LEAST(99.99, v_excedente));
  v_excedente_limitado := LEAST(v_excedente, v_janela_horas);

  IF v_is_feriado AND v_horas_trabalhadas > 0 THEN
    v_horas_extras_100 := LEAST(99.99, v_excedente_limitado);
    v_horas_para_pagamento := LEAST(99.99, v_excedente_limitado);
    v_horas_extras_50 := 0;
    v_horas_para_banco := 0;
    v_horas_negativas := 0;
    
  ELSIF v_excedente > 0 THEN
    IF v_tipo_escala = 'escala_12x36' THEN
      IF v_horas_trabalhadas > 12 THEN
        v_excedente_limitado := LEAST(99.99, LEAST(v_janela_horas, v_horas_trabalhadas - 12));
        v_horas_extras_50 := v_excedente_limitado;
        v_horas_para_banco := v_excedente_limitado;
      END IF;

    ELSIF v_tipo_escala = 'flexivel_6x1' THEN
      v_consecutive_work_days := 0;
      v_check_date := v_date - 1;
      v_exit_reason := 'loop_completo';

      WHILE v_check_date >= v_date - 14 LOOP
        v_trabalhadas_antes := NULL;

        IF rh.is_rest_day(v_employee_id, v_company_id, v_check_date) THEN
          v_exit_reason := 'is_rest_day em ' || v_check_date::TEXT;
          EXIT;
        END IF;

        IF rh.is_virtual_dsr(v_employee_id, v_company_id, v_check_date) THEN
          v_exit_reason := 'is_virtual_dsr em ' || v_check_date::TEXT;
          EXIT;
        END IF;

        SELECT tr.horas_trabalhadas
        INTO v_trabalhadas_antes
        FROM rh.time_records tr
        WHERE tr.employee_id = v_employee_id
          AND tr.company_id = v_company_id
          AND tr.data_registro = v_check_date;

        IF NOT FOUND THEN
          v_exit_reason := 'sem_registro em ' || v_check_date::TEXT;
          EXIT;
        END IF;

        v_consecutive_work_days := v_consecutive_work_days + 1;
        v_check_date := v_check_date - 1;
      END LOOP;

      RAISE NOTICE '[OVERTIME_7TH] employee_id=% company_id=% data=% tipo_escala=% excedente=% consecutive_work_days=% exit_reason=%',
        v_employee_id, v_company_id, v_date, v_tipo_escala, v_excedente, v_consecutive_work_days, v_exit_reason;

      IF v_consecutive_work_days >= 6 THEN
        v_horas_extras_100 := LEAST(99.99, GREATEST(0, COALESCE(v_horas_trabalhadas, 0)));
        v_horas_para_pagamento := v_horas_extras_100;
        v_horas_extras_50 := 0;
        v_horas_para_banco := 0;
        RAISE NOTICE '[OVERTIME_7TH] APLICOU 100%% -> horas_extras_100=%', v_horas_extras_100;
      ELSE
        v_horas_extras_50 := LEAST(99.99, v_excedente_limitado);
        v_horas_para_banco := LEAST(99.99, v_excedente_limitado);
        RAISE NOTICE '[OVERTIME_7TH] NAO aplicou 100%% (precisa 6 dias) -> horas_extras_50=%', v_horas_extras_50;
      END IF;

    ELSE
      IF v_is_domingo THEN
        v_horas_extras_100 := LEAST(99.99, v_excedente_limitado);
        v_horas_para_pagamento := LEAST(99.99, v_excedente_limitado);
      ELSE
        v_horas_extras_50 := LEAST(99.99, v_excedente_limitado);
        v_horas_para_banco := LEAST(99.99, v_excedente_limitado);
      END IF;
      RAISE NOTICE '[OVERTIME_7TH] escala nao flexivel_6x1 (tipo=%) -> data=% employee_id=%', v_tipo_escala, v_date, v_employee_id;
    END IF;
    v_horas_negativas := 0;
    
  ELSIF v_excedente < 0 THEN
    IF v_tem_todas_marcacoes THEN
      v_horas_negativas := LEAST(99.99, ROUND(ABS(v_excedente), 2));
    ELSE
      v_horas_negativas := 0;
    END IF;
    v_horas_extras_50 := 0;
    v_horas_extras_100 := 0;
    v_horas_para_banco := 0;
    v_horas_para_pagamento := 0;
    
  ELSE
    v_horas_extras_50 := 0;
    v_horas_extras_100 := 0;
    v_horas_para_banco := 0;
    v_horas_para_pagamento := 0;
    v_horas_negativas := 0;
  END IF;

  v_horas_extras_50 := LEAST(99.99, GREATEST(-99.99, COALESCE(v_horas_extras_50, 0)));
  v_horas_extras_100 := LEAST(99.99, GREATEST(-99.99, COALESCE(v_horas_extras_100, 0)));
  v_horas_para_banco := LEAST(99.99, GREATEST(-99.99, COALESCE(v_horas_para_banco, 0)));
  v_horas_para_pagamento := LEAST(99.99, GREATEST(-99.99, COALESCE(v_horas_para_pagamento, 0)));
  v_horas_negativas := LEAST(99.99, GREATEST(0, COALESCE(v_horas_negativas, 0)));
  v_horas_noturnas := LEAST(99.99, GREATEST(0, COALESCE(v_horas_noturnas, 0)));
  v_horas_extras_sum := LEAST(99.99, GREATEST(-99.99, v_horas_extras_50 + v_horas_extras_100));

  UPDATE rh.time_records
  SET 
    horas_extras_50 = ROUND(v_horas_extras_50, 2),
    horas_extras_100 = ROUND(v_horas_extras_100, 2),
    horas_extras = ROUND(v_horas_extras_sum, 2),
    horas_para_banco = ROUND(v_horas_para_banco, 2),
    horas_para_pagamento = ROUND(v_horas_para_pagamento, 2),
    horas_negativas = ROUND(v_horas_negativas, 2),
    horas_noturnas = ROUND(v_horas_noturnas, 2),
    is_feriado = v_is_feriado,
    is_domingo = v_is_domingo,
    is_dia_folga = v_is_dia_folga
  WHERE id = p_time_record_id;

END;
$$;

COMMENT ON FUNCTION rh.calculate_overtime_by_scale(UUID) IS
'Calcula horas extras conforme tipo de escala e regras CLT. Flexivel_6x1: 7º dia após DSR = 100%. Emite NOTICE [OVERTIME_7TH] para diagnóstico.';
