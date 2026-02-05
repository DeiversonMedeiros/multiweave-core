-- =====================================================
-- CORREÇÃO: Registros com is_dia_folga incorreto (100% indevido)
-- =====================================================
-- Contexto: docs/ANALISE_ADENILSON_20DEZ2025_HORA_EXTRA_100.md
--
-- Registros afetados: is_dia_folga = true no banco, mas com a lógica
-- atual de is_rest_day (ciclo rotativo para 6x1) o dia NÃO é folga.
-- Isso ocorreu em turnos 6x1 com dias_semana = {1,2,3,4,5}, onde a
-- lógica antiga tratava todo sábado/domingo como folga.
--
-- Este script:
-- 1) Lista os registros afetados (preview)
-- 2) Recalcula cada um com rh.calculate_overtime_by_scale(id)
--    para corrigir is_dia_folga, horas_extras_50 e horas_extras_100.
-- =====================================================

-- -----------------------------------------------------------
-- PARTE 1: PREVIEW – Ver quantos e quais registros serão corrigidos
-- Execute primeiro e confira antes de rodar a PARTE 2.
-- -----------------------------------------------------------

SELECT
  tr.id AS time_record_id,
  tr.employee_id,
  e.nome AS funcionario_nome,
  c.nome_fantasia AS empresa,
  tr.data_registro::date AS data,
  to_char(tr.data_registro, 'Day') AS dia_semana,
  tr.horas_trabalhadas,
  tr.horas_extras_50 AS extras_50_antes,
  tr.horas_extras_100 AS extras_100_antes,
  tr.is_dia_folga AS is_dia_folga_antes,
  ws.tipo_escala
FROM rh.time_records tr
JOIN rh.employees e ON e.id = tr.employee_id
JOIN public.companies c ON c.id = tr.company_id
LEFT JOIN rh.work_shifts ws ON ws.id = e.work_shift_id
WHERE tr.is_dia_folga = true
  AND NOT rh.is_rest_day(tr.employee_id, tr.company_id, tr.data_registro::date)
ORDER BY c.nome_fantasia, e.nome, tr.data_registro;

-- Contagem (opcional)
SELECT COUNT(*) AS total_registros_afetados
FROM rh.time_records tr
WHERE tr.is_dia_folga = true
  AND NOT rh.is_rest_day(tr.employee_id, tr.company_id, tr.data_registro::date);


-- -----------------------------------------------------------
-- PARTE 2: CORREÇÃO – Recalcular cada registro afetado
-- Execute apenas após validar o preview. Recomenda-se backup
-- ou rodar em homologação primeiro.
-- -----------------------------------------------------------

DO $$
DECLARE
  r RECORD;
  v_count INT := 0;
  v_errors INT := 0;
BEGIN
  FOR r IN
    SELECT tr.id
    FROM rh.time_records tr
    WHERE tr.is_dia_folga = true
      AND NOT rh.is_rest_day(tr.employee_id, tr.company_id, tr.data_registro::date)
  LOOP
    BEGIN
      PERFORM rh.calculate_overtime_by_scale(r.id);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE WARNING 'Erro ao recalcular time_record %: %', r.id, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'Correção concluída. Registros recalculados: %. Erros: %.', v_count, v_errors;
END $$;


-- -----------------------------------------------------------
-- PARTE 3 (OPCIONAL): Conferência após a correção
-- Deve retornar 0 linhas se tudo foi corrigido.
-- -----------------------------------------------------------

SELECT COUNT(*) AS ainda_inconsistentes
FROM rh.time_records tr
WHERE tr.is_dia_folga = true
  AND NOT rh.is_rest_day(tr.employee_id, tr.company_id, tr.data_registro::date);
