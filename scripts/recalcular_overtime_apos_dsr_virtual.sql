-- =====================================================
-- Recalcular horas extras (incl. 100% por 7º dia) após alterar DSR virtual
-- =====================================================
-- Use após alterar a natureza do dia para DSR na aba "Resumo por Funcionário",
-- para que os dias seguintes (até o 7º) tenham horas_extras_100 recalculadas.
--
-- Regra: 7º dia após o último DSR (escala ou virtual) = todas as horas 100%.
-- Dia com 0h mas com registro em time_records ainda conta como dia do ciclo.
-- Garanta que o dia de DSR tenha natureza_dia salva (time_records ou override).
--
-- Uso (ajuste company_id, data_inicio, data_fim conforme necessário):
--   psql ... -v company_id='ce390408-1c18-47fc-bd7d-76379ec488b7' \
--             -v data_inicio='2026-01-01' -v data_fim='2026-01-31' -f recalcular_overtime_apos_dsr_virtual.sql
--
-- Ou execute no Supabase SQL Editor substituindo :company_id e :data_*.
-- =====================================================

DO $$
DECLARE
  v_company_id UUID := 'ce390408-1c18-47fc-bd7d-76379ec488b7'; -- ESTRATEGIC
  v_data_inicio DATE := '2026-01-01';
  v_data_fim DATE := '2026-01-31';
  v_rec RECORD;
  v_count INT := 0;
BEGIN
  FOR v_rec IN
    SELECT tr.id
    FROM rh.time_records tr
    WHERE tr.company_id = v_company_id
      AND tr.data_registro >= v_data_inicio
      AND tr.data_registro <= v_data_fim
  LOOP
    PERFORM rh.calculate_overtime_by_scale(v_rec.id);
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'Recalculados % registros de ponto (horas extras 50%%/100%%) para período % a %', v_count, v_data_inicio, v_data_fim;
END;
$$;

-- Recalcular só o registro do dia 11/01 do Alexandre (teste rápido):
-- SELECT rh.calculate_overtime_by_scale('5c6372eb-6782-438e-8bb4-f30ec3076381'::uuid);
