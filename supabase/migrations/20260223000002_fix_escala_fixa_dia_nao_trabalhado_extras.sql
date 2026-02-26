-- =====================================================
-- Escala fixa: dias NÃO marcados em "Dias da Semana" = horas extras (sem horas negativas)
-- =====================================================
-- Data: 2026-02-23
-- Problema: Em escala fixa (ex.: 5x2), quando o colaborador registra ponto em dia não
--           marcado na escala (ex.: sábado), o sistema usava horas_diarias do turno (8h)
--           e gerava horas negativas se trabalhou menos que 8h, em vez de tratar todo
--           o tempo como horas extras.
-- Regra (APENAS escala fixa): Nos dias não marcados na seção "Dias da Semana" da
--        escala fixa, considerar horas diárias esperadas = 0; todas as horas trabalhadas
--        = extras; não gerar horas negativas. Classificação 50% ou 100%: ver migration
--        20260223000003 (100% só feriados e domingos; sábado/outros = 50%).
-- Escalas flexíveis (flexivel_6x1, flexivel_5x2, etc.): NÃO se aplica esta regra.
--        Na escala flexível a folga pode ser em qualquer dia da semana (definida por
--        ciclo a partir da data_inicio do turno). As horas esperadas e o tratamento
--        de dia de folga seguem a lógica já existente por tipo (ex.: flexivel_6x1).
-- =====================================================

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
  v_janela_horas NUMERIC(10,2) := 24;  -- padrão 24h se não houver configuração
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

  -- Janela de tempo da empresa (12, 15, 20, 22 ou 24): limitar horas extras a esse máximo
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

  -- APENAS escala fixa: em dia NÃO marcado em "Dias da Semana" não há jornada esperada.
  -- Todas as horas trabalhadas = extras (50% ou 100% conforme dia; ver migration 20260223000003).
  -- Escalas flexíveis (flexivel_6x1, flexivel_5x2, etc.): não alterar v_horas_diarias;
  -- a folga é por ciclo (qualquer dia da semana) e a lógica de extras já está no bloco abaixo.
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
  -- Limitar excedente usado para extras ao máximo da janela de tempo (ex: 15h)
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
      IF v_is_dia_folga THEN
        v_horas_extras_100 := LEAST(99.99, v_excedente_limitado);
        v_horas_para_pagamento := LEAST(99.99, v_excedente_limitado);
      ELSE
        v_horas_extras_50 := LEAST(99.99, v_excedente_limitado);
        v_horas_para_banco := LEAST(99.99, v_excedente_limitado);
      END IF;
    ELSE
      -- Escala fixa: 100% apenas domingo; sábado/folga e dia útil = 50% (ver migration 20260223000003).
      IF v_is_domingo OR v_is_dia_folga THEN
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
Escala fixa: dias não marcados em "Dias da Semana" (folga) = 0h esperadas, sem horas negativas. 50% vs 100%: ver migration 20260223000003.';
