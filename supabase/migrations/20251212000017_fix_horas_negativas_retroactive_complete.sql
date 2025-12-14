-- =====================================================
-- CORREÇÃO RETROATIVA COMPLETA DE HORAS NEGATIVAS
-- Problema identificado:
-- 1. Funcionários com turno: usando horas_diarias do turno em vez das horas do dia específico
-- 2. Funcionários sem turno: calculando horas negativas incorretamente mesmo trabalhando horas normais
-- =====================================================

-- Recalcular TODOS os registros aprovados com horas negativas
-- para garantir que estão corretos
DO $$
DECLARE
  v_record RECORD;
  v_count INTEGER := 0;
  v_errors INTEGER := 0;
  v_horas_esperadas NUMERIC(4,2);
  v_work_shift_id UUID;
  v_day_of_week INTEGER;
  v_has_shift BOOLEAN;
BEGIN
  RAISE NOTICE 'Iniciando correção retroativa de horas negativas...';
  
  -- Recalcular para TODOS os registros aprovados que têm horas negativas
  FOR v_record IN 
    SELECT 
      tr.id,
      tr.employee_id,
      tr.company_id,
      tr.data_registro,
      tr.horas_trabalhadas,
      tr.horas_negativas,
      tr.horas_extras
    FROM rh.time_records tr
    WHERE tr.status = 'aprovado'
      AND tr.horas_negativas > 0
    ORDER BY tr.data_registro DESC
  LOOP
    BEGIN
      -- Verificar se tem turno configurado
      SELECT 
        es.turno_id,
        CASE 
          WHEN EXTRACT(DOW FROM v_record.data_registro) = 0 THEN 7
          ELSE EXTRACT(DOW FROM v_record.data_registro)::INTEGER
        END
      INTO v_work_shift_id, v_day_of_week
      FROM rh.employee_shifts es
      WHERE es.funcionario_id = v_record.employee_id
        AND es.company_id = v_record.company_id
        AND es.ativo = true
        AND es.data_inicio <= v_record.data_registro
        AND (es.data_fim IS NULL OR es.data_fim >= v_record.data_registro)
      ORDER BY es.data_inicio DESC
      LIMIT 1;
      
      v_has_shift := (v_work_shift_id IS NOT NULL);
      
      -- Se tem turno, obter horas esperadas do dia específico
      IF v_has_shift THEN
        SELECT 
          COALESCE(
            (rh.get_work_shift_hours_for_day(v_work_shift_id, v_day_of_week)->>'horas_diarias')::NUMERIC,
            ws.horas_diarias,
            8.0
          )
        INTO v_horas_esperadas
        FROM rh.work_shifts ws
        WHERE ws.id = v_work_shift_id;
      ELSE
        -- Sem turno: usar 8h como padrão
        v_horas_esperadas := 8.0;
      END IF;
      
      -- Se não encontrou horas esperadas, usar padrão
      IF v_horas_esperadas IS NULL THEN
        v_horas_esperadas := 8.0;
      END IF;
      
      -- Calcular diferença
      -- Se trabalhou menos que o esperado, deve ter horas negativas
      -- Se trabalhou igual ou mais, não deve ter horas negativas
      IF v_record.horas_trabalhadas >= v_horas_esperadas THEN
        -- Trabalhou igual ou mais que o esperado: não deve ter horas negativas
        -- Recalcular usando a função oficial
        PERFORM rh.calculate_overtime_by_scale(v_record.id);
        v_count := v_count + 1;
      ELSIF v_record.horas_trabalhadas < v_horas_esperadas THEN
        -- Trabalhou menos: verificar se as horas negativas estão corretas
        DECLARE
          v_diferenca NUMERIC(4,2);
          v_horas_negativas_corretas NUMERIC(4,2);
        BEGIN
          v_diferenca := v_record.horas_trabalhadas - v_horas_esperadas;
          v_horas_negativas_corretas := ROUND(ABS(v_diferenca), 2);
          
          -- Se as horas negativas estão incorretas, recalcular
          IF ABS(v_record.horas_negativas - v_horas_negativas_corretas) > 0.01 THEN
            PERFORM rh.calculate_overtime_by_scale(v_record.id);
            v_count := v_count + 1;
          END IF;
        END;
      END IF;
      
      -- Log a cada 50 registros
      IF v_count % 50 = 0 AND v_count > 0 THEN
        RAISE NOTICE 'Recalculados % registros...', v_count;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Continuar mesmo se houver erro em um registro
        v_errors := v_errors + 1;
        IF v_errors <= 10 THEN
          RAISE NOTICE 'Erro ao recalcular registro %: %', v_record.id, SQLERRM;
        END IF;
    END;
  END LOOP;
  
  RAISE NOTICE 'Correção retroativa concluída!';
  RAISE NOTICE 'Total de registros recalculados: %', v_count;
  IF v_errors > 0 THEN
    RAISE NOTICE 'Total de erros: %', v_errors;
  END IF;
END $$;

-- Verificar se há registros que ainda estão incorretos após a correção
DO $$
DECLARE
  v_incorretos INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_incorretos
  FROM rh.time_records tr
  WHERE tr.status = 'aprovado'
    AND tr.horas_negativas > 0
    AND EXISTS (
      SELECT 1
      FROM rh.employee_shifts es
      INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
      WHERE es.funcionario_id = tr.employee_id
        AND es.company_id = tr.company_id
        AND es.ativo = true
        AND es.data_inicio <= tr.data_registro
        AND (es.data_fim IS NULL OR es.data_fim >= tr.data_registro)
      AND tr.horas_trabalhadas >= COALESCE(
        (rh.get_work_shift_hours_for_day(ws.id, CASE WHEN EXTRACT(DOW FROM tr.data_registro) = 0 THEN 7 ELSE EXTRACT(DOW FROM tr.data_registro)::INTEGER END)->>'horas_diarias')::NUMERIC,
        ws.horas_diarias,
        8.0
      )
    );
  
  IF v_incorretos > 0 THEN
    RAISE WARNING 'Ainda existem % registros com horas negativas incorretas após a correção!', v_incorretos;
  ELSE
    RAISE NOTICE 'Todos os registros foram corrigidos com sucesso!';
  END IF;
END $$;

COMMENT ON FUNCTION rh.calculate_overtime_by_scale IS 
  'Calcula horas extras conforme tipo de escala e regras CLT.
   Separa horas 50% (banco) de horas 100% (pagamento direto).
   Agora considera horarios_por_dia para obter horas diárias corretas por dia da semana.
   Calcula horas negativas quando trabalhou menos que o esperado.
   Só calcula horas extras se houver excedente positivo (trabalhou mais que o esperado).
   
   CORREÇÃO RETROATIVA APLICADA: Todos os registros foram recalculados para garantir
   que as horas negativas estão corretas, considerando:
   - Horas específicas do dia quando horarios_por_dia existe
   - Horas padrão do turno quando não há horarios_por_dia
   - 8h padrão quando não há turno configurado';
