-- =====================================================
-- Hora extra 100% em escalas flexíveis: considerar DSR virtual
-- =====================================================
-- Data: 2026-02-28
--
-- Objetivo:
-- Para escalas flexíveis (flexivel_6x1), o 7º dia consecutivo após o último DSR
-- deve ter todas as horas trabalhadas consideradas como hora extra 100%.
--
-- O "DSR virtual" é quando o usuário altera a natureza do dia na interface
-- (rh/time-records, aba Resumo por Funcionário) para "DSR", seja em:
-- - time_records.natureza_dia = 'dsr' (dia com registro)
-- - time_record_day_nature_override.natureza_dia = 'dsr' (dia sem registro)
--
-- Regra: DSR virtual deve QUEBRAR o ciclo de 7 dias e iniciar um novo ciclo.
-- Assim, ao contar quantos dias consecutivos de trabalho existem antes da data
-- do registro, devemos parar de contar quando encontrarmos um dia que seja:
-- 1) Dia de folga da escala (is_rest_day), OU
-- 2) DSR virtual (natureza do dia = DSR no registro ou no override).
--
-- Implementação:
-- 1) Nova função rh.is_virtual_dsr(employee_id, company_id, date) que retorna true
--    se o dia for classificado como DSR pela natureza do dia (persistida).
-- 2) Em calculate_overtime_by_scale, no bloco flexivel_6x1, quebrar o ciclo
--    também quando is_virtual_dsr for true para v_check_date.
-- =====================================================

-- 1) Função: verifica se a data é DSR pela natureza do dia (virtual)
CREATE OR REPLACE FUNCTION rh.is_virtual_dsr(
  p_employee_id UUID,
  p_company_id UUID,
  p_date DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- time_records: registro com natureza_dia = 'dsr'
  IF EXISTS (
    SELECT 1 FROM rh.time_records tr
    WHERE tr.employee_id = p_employee_id
      AND tr.company_id = p_company_id
      AND tr.data_registro = p_date
      AND LOWER(TRIM(COALESCE(tr.natureza_dia, ''))) = 'dsr'
  ) THEN
    RETURN true;
  END IF;

  -- time_record_day_nature_override: override para dia sem registro (ex.: DSR sem batidas)
  IF EXISTS (
    SELECT 1 FROM rh.time_record_day_nature_override o
    WHERE o.employee_id = p_employee_id
      AND o.company_id = p_company_id
      AND o.data_registro = p_date
      AND LOWER(TRIM(o.natureza_dia)) = 'dsr'
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION rh.is_virtual_dsr(UUID, UUID, DATE) IS
'Retorna true se o dia for classificado como DSR pela natureza do dia (time_records.natureza_dia ou time_record_day_nature_override). Usado no cálculo de hora extra 100% em escalas flexíveis para quebrar o ciclo de 7 dias.';

-- 2) Atualizar calculate_overtime_by_scale: quebrar ciclo com DSR virtual
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
      -- Regra: 7º dia após o último DSR (escala ou virtual) = todas as horas 100%.
      -- Quebra o ciclo: dia de folga da escala (is_rest_day) OU DSR virtual (natureza_dia = dsr).
      -- Contagem: "dias do ciclo" (não exige horas > 0). Dia com registro e 0h ainda é 1º, 2º... dia após DSR.
      v_consecutive_work_days := 0;
      v_check_date := v_date - 1;

      WHILE v_check_date >= v_date - 14 LOOP
        v_trabalhadas_antes := NULL;

        -- Quebrar: dia de folga da escala
        IF rh.is_rest_day(v_employee_id, v_company_id, v_check_date) THEN
          EXIT;
        END IF;

        -- Quebrar: DSR virtual (natureza do dia = DSR no registro ou override)
        IF rh.is_virtual_dsr(v_employee_id, v_company_id, v_check_date) THEN
          EXIT;
        END IF;

        -- Existência de registro: se não há registro para a data, não sabemos se é dia de trabalho → quebra
        SELECT tr.horas_trabalhadas
        INTO v_trabalhadas_antes
        FROM rh.time_records tr
        WHERE tr.employee_id = v_employee_id
          AND tr.company_id = v_company_id
          AND tr.data_registro = v_check_date;

        IF NOT FOUND THEN
          EXIT;
        END IF;

        -- Dia com registro (mesmo 0h) conta como dia do ciclo (1º, 2º, ... 7º após DSR)
        v_consecutive_work_days := v_consecutive_work_days + 1;
        v_check_date := v_check_date - 1;
      END LOOP;

      IF v_consecutive_work_days >= 6 THEN
        v_horas_extras_100 := LEAST(99.99, GREATEST(0, COALESCE(v_horas_trabalhadas, 0)));
        v_horas_para_pagamento := v_horas_extras_100;
        v_horas_extras_50 := 0;
        v_horas_para_banco := 0;
      ELSE
        v_horas_extras_50 := LEAST(99.99, v_excedente_limitado);
        v_horas_para_banco := LEAST(99.99, v_excedente_limitado);
      END IF;

    ELSE
      IF v_is_domingo THEN
        v_horas_extras_100 := LEAST(99.99, v_excedente_limitado);
        v_horas_para_pagamento := LEAST(99.99, v_excedente_limitado);
      ELSE
        v_horas_extras_50 := LEAST(99.99, v_excedente_limitado);
        v_horas_para_banco := LEAST(99.99, v_excedente_limitado);
      END IF;
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
'Calcula horas extras conforme tipo de escala e regras CLT.
Extras 100%:
- Feriados (todas as escalas), conforme excedente limitado pela janela;
- Escala fixa: domingos com excedente;
- Escalas flexíveis (flexivel_6x1): todas as horas trabalhadas no 7º dia
  consecutivo após o último DSR (escala ou virtual). DSR virtual = natureza_dia
  em time_records ou time_record_day_nature_override; quebra o ciclo de 7 dias.';
