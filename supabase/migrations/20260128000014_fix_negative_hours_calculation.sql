-- =====================================================
-- CORREÇÃO: Horas Trabalhadas Negativas e Horas Negativas Incorretas
-- =====================================================
-- Data: 2026-01-28
-- Descrição: Corrige registros que têm horas_trabalhadas negativas ou
--            horas_negativas incorretas devido a cálculo errado quando
--            a saída é do dia seguinte (registros que cruzam meia-noite).
--            
--            A função recalculate_time_record_hours já foi corrigida para
--            usar event_at completo, mas há registros antigos que precisam
--            ser recalculados.
-- =====================================================

-- Função auxiliar para recalcular registros com problemas
CREATE OR REPLACE FUNCTION rh.recalculate_problematic_records()
RETURNS TABLE(
  total_records INTEGER,
  fixed_records INTEGER,
  still_problematic INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_record_id UUID;
  v_total INTEGER := 0;
  v_fixed INTEGER := 0;
  v_still_problematic INTEGER := 0;
  v_horas_trabalhadas DECIMAL(4,2);
  v_horas_negativas DECIMAL(4,2);
BEGIN
  -- Identificar registros com problemas:
  -- 1. horas_trabalhadas < 0 (nunca deveria acontecer)
  -- 2. horas_negativas > 0 mas horas_trabalhadas >= horas_diarias esperadas
  FOR v_record_id IN
    SELECT tr.id
    FROM rh.time_records tr
    WHERE 
      -- Caso 1: Horas trabalhadas negativas
      tr.horas_trabalhadas < 0
      OR
      -- Caso 2: Horas negativas mas trabalhou igual ou mais que o esperado
      (
        tr.horas_negativas > 0 
        AND tr.entrada IS NOT NULL 
        AND tr.saida IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM rh.time_record_events tre
          WHERE tre.time_record_id = tr.id
          AND tre.event_type IN ('entrada', 'saida')
        )
      )
    ORDER BY tr.data_registro DESC, tr.id
  LOOP
    v_total := v_total + 1;
    
    -- Buscar valores antes do recálculo
    SELECT horas_trabalhadas, horas_negativas
    INTO v_horas_trabalhadas, v_horas_negativas
    FROM rh.time_records
    WHERE id = v_record_id;
    
    -- Recalcular usando a função corrigida
    PERFORM rh.recalculate_time_record_hours(v_record_id);
    
    -- Verificar se foi corrigido
    SELECT horas_trabalhadas, horas_negativas
    INTO v_horas_trabalhadas, v_horas_negativas
    FROM rh.time_records
    WHERE id = v_record_id;
    
    -- Se ainda tem problema, incrementar contador
    IF v_horas_trabalhadas < 0 OR 
       (v_horas_negativas > 0 AND v_horas_trabalhadas >= 7.0) THEN
      v_still_problematic := v_still_problematic + 1;
    ELSE
      v_fixed := v_fixed + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_total, v_fixed, v_still_problematic;
END;
$$;

COMMENT ON FUNCTION rh.recalculate_problematic_records IS 
'Recalcula todos os registros de ponto que têm horas_trabalhadas negativas
ou horas_negativas incorretas. Retorna estatísticas do processo.';

-- Executar correção
DO $$
DECLARE
  v_result RECORD;
BEGIN
  RAISE NOTICE 'Iniciando correção de registros com horas trabalhadas negativas ou horas negativas incorretas...';
  
  SELECT * INTO v_result FROM rh.recalculate_problematic_records();
  
  RAISE NOTICE 'Correção concluída:';
  RAISE NOTICE '  Total de registros processados: %', v_result.total_records;
  RAISE NOTICE '  Registros corrigidos: %', v_result.fixed_records;
  RAISE NOTICE '  Registros ainda com problemas: %', v_result.still_problematic;
END;
$$;

-- Verificar se ainda há registros com problemas após a correção
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM rh.time_records tr
  WHERE 
    tr.horas_trabalhadas < 0
    OR (
      tr.horas_negativas > 0 
      AND tr.entrada IS NOT NULL 
      AND tr.saida IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM rh.time_record_events tre
        WHERE tre.time_record_id = tr.id
        AND tre.event_type IN ('entrada', 'saida')
      )
      AND tr.horas_trabalhadas >= 7.0 -- Assumindo mínimo de 7h esperadas
    );
  
  IF v_count > 0 THEN
    RAISE WARNING 'Ainda existem % registros com problemas que precisam de atenção manual.', v_count;
  ELSE
    RAISE NOTICE 'Todos os registros foram corrigidos com sucesso!';
  END IF;
END;
$$;
