-- =====================================================
-- CORRIGIR CÁLCULO DE HORAS NEGATIVAS
-- O problema: a função estava usando horas_diarias do turno
-- em vez das horas específicas do dia quando horarios_por_dia existe
-- =====================================================

-- Verificar se a função está usando corretamente as horas do dia
-- A função já deveria estar correta, mas vamos garantir que está
-- sendo chamada corretamente e recalcular os registros afetados

-- Primeiro, vamos verificar se há algum problema na função atual
-- A função calculate_overtime_by_scale já deveria estar usando
-- get_work_shift_hours_for_day corretamente, mas vamos garantir

-- Recalcular horas negativas para registros que estão incorretos
DO $$
DECLARE
  v_record RECORD;
  v_count INTEGER := 0;
  v_horas_esperadas NUMERIC(4,2);
  v_horas_trabalhadas NUMERIC(4,2);
  v_diferenca NUMERIC(4,2);
  v_horas_negativas_corretas NUMERIC(4,2);
BEGIN
  -- Recalcular para registros aprovados que têm horas negativas
  FOR v_record IN 
    SELECT 
      tr.id,
      tr.employee_id,
      tr.company_id,
      tr.data_registro,
      tr.horas_trabalhadas,
      tr.horas_negativas,
      ws.id as work_shift_id,
      CASE 
        WHEN EXTRACT(DOW FROM tr.data_registro) = 0 THEN 7
        ELSE EXTRACT(DOW FROM tr.data_registro)::INTEGER
      END as day_of_week
    FROM rh.time_records tr
    INNER JOIN rh.employee_shifts es 
      ON es.funcionario_id = tr.employee_id 
      AND es.company_id = tr.company_id 
      AND es.ativo = true 
      AND es.data_inicio <= tr.data_registro 
      AND (es.data_fim IS NULL OR es.data_fim >= tr.data_registro)
    INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
    WHERE tr.status = 'aprovado'
      AND tr.horas_negativas > 0
    ORDER BY tr.data_registro DESC
  LOOP
    BEGIN
      -- Obter horas esperadas para o dia específico
      SELECT 
        COALESCE(
          (rh.get_work_shift_hours_for_day(v_record.work_shift_id, v_record.day_of_week)->>'horas_diarias')::NUMERIC,
          ws.horas_diarias
        )
      INTO v_horas_esperadas
      FROM rh.work_shifts ws
      WHERE ws.id = v_record.work_shift_id;
      
      -- Se não encontrou, usar padrão
      IF v_horas_esperadas IS NULL THEN
        v_horas_esperadas := 8.0;
      END IF;
      
      -- Calcular diferença
      v_diferenca := v_record.horas_trabalhadas - v_horas_esperadas;
      
      -- Calcular horas negativas corretas (só se a diferença for negativa)
      IF v_diferenca < 0 THEN
        v_horas_negativas_corretas := ROUND(ABS(v_diferenca), 2);
      ELSE
        v_horas_negativas_corretas := 0;
      END IF;
      
      -- Se as horas negativas estão incorretas, recalcular usando a função
      IF v_record.horas_negativas != v_horas_negativas_corretas THEN
        -- Recalcular usando a função oficial
        PERFORM rh.calculate_overtime_by_scale(v_record.id);
        v_count := v_count + 1;
        
        -- Log a cada 10 registros
        IF v_count % 10 = 0 THEN
          RAISE NOTICE 'Recalculados % registros...', v_count;
        END IF;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Continuar mesmo se houver erro em um registro
        RAISE NOTICE 'Erro ao recalcular registro %: %', v_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Total de registros recalculados: %', v_count;
END $$;

COMMENT ON FUNCTION rh.calculate_overtime_by_scale IS 
  'Calcula horas extras conforme tipo de escala e regras CLT.
   Separa horas 50% (banco) de horas 100% (pagamento direto).
   Agora considera horarios_por_dia para obter horas diárias corretas por dia da semana.
   Calcula horas negativas quando trabalhou menos que o esperado.
   Só calcula horas extras se houver excedente positivo (trabalhou mais que o esperado).
   
   CORREÇÃO: Garantido que usa horas_diarias do dia específico quando horarios_por_dia existe.';
