-- =====================================================
-- CORRIGIR FUNÇÃO process_bank_hours_expiration
-- PARA RESPEITAR auto_compensate E O SISTEMA NOVO DE TIPOS
-- =====================================================
-- Regras após esta migration:
-- - Só haverá "expiração automática de horas do banco" para colaboradores
--   que tenham banco de horas habilitado E auto_compensate = true,
--   seja pelo sistema novo (rh.bank_hours_types + rh.bank_hours_assignments)
--   ou pelo sistema antigo (rh.bank_hours_config).
-- - Colaboradores sem auto_compensate continuarão acumulando horas,
--   sem gerar transações de tipo 'expiration' automáticas.
-- =====================================================

CREATE OR REPLACE FUNCTION rh.process_bank_hours_expiration(
  p_company_id UUID,
  p_expiration_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  employees_processed INTEGER,
  hours_expired DECIMAL(8,2)
) AS $$
DECLARE
  v_employee_record RECORD;
  v_hours_to_expire DECIMAL(5,2);
  v_total_employees INTEGER := 0;
  v_total_hours_expired DECIMAL(8,2) := 0;
BEGIN
  -- Processar cada colaborador com banco de horas e auto_compensate = true
  FOR v_employee_record IN
    WITH employee_cfg AS (
      -- Sistema novo: bank_hours_assignments + bank_hours_types
      SELECT
        bha.employee_id,
        bha.company_id,
        TRUE AS has_bank_hours,
        COALESCE(bht.auto_compensate, FALSE) AS auto_compensate
      FROM rh.bank_hours_assignments bha
      INNER JOIN rh.bank_hours_types bht ON bht.id = bha.bank_hours_type_id
      WHERE bha.is_active = TRUE
        AND bht.is_active = TRUE
        AND bht.has_bank_hours = TRUE

      UNION

      -- Sistema antigo: bank_hours_config (somente se não houver assignment ativo)
      SELECT
        bhc.employee_id,
        bhc.company_id,
        bhc.has_bank_hours,
        COALESCE(bhc.auto_compensate, FALSE) AS auto_compensate
      FROM rh.bank_hours_config bhc
      WHERE bhc.is_active = TRUE
        AND bhc.has_bank_hours = TRUE
        AND NOT EXISTS (
          SELECT 1
          FROM rh.bank_hours_assignments bha2
          INNER JOIN rh.bank_hours_types bht2 ON bht2.id = bha2.bank_hours_type_id
          WHERE bha2.employee_id = bhc.employee_id
            AND bha2.company_id = bhc.company_id
            AND bha2.is_active = TRUE
            AND bht2.is_active = TRUE
            AND bht2.has_bank_hours = TRUE
        )
    )
    SELECT 
      b.employee_id,
      b.company_id,
      b.current_balance
    FROM rh.bank_hours_balance b
    INNER JOIN employee_cfg cfg
      ON cfg.employee_id = b.employee_id
     AND cfg.company_id = b.company_id
    WHERE b.company_id = p_company_id
      AND cfg.has_bank_hours = TRUE
      AND cfg.auto_compensate = TRUE
      AND b.current_balance > 0
  LOOP
    -- Calcular horas que devem expirar
    v_hours_to_expire := 0;
    
    -- Lógica de expiração baseada no saldo atual
    -- (mantém a mesma abordagem simplificada anterior: expira 10% do saldo)
    IF v_employee_record.current_balance > 0 THEN
      v_hours_to_expire := LEAST(
        v_employee_record.current_balance,
        v_employee_record.current_balance * 0.1 -- Expirar 10% das horas
      );
    END IF;

    -- Registrar expiração se houver horas para expirar
    IF v_hours_to_expire > 0 THEN
      INSERT INTO rh.bank_hours_transactions (
        employee_id, company_id, transaction_type, transaction_date,
        hours_amount, description, is_automatic
      ) VALUES (
        v_employee_record.employee_id, v_employee_record.company_id, 'expiration', p_expiration_date,
        -v_hours_to_expire, 'Expiração automática de horas do banco', TRUE
      );

      -- Atualizar saldo
      UPDATE rh.bank_hours_balance SET
        current_balance = current_balance - v_hours_to_expire,
        expired_hours = expired_hours + v_hours_to_expire,
        updated_at = NOW()
      WHERE employee_id = v_employee_record.employee_id 
        AND company_id = v_employee_record.company_id;

      v_total_hours_expired := v_total_hours_expired + v_hours_to_expire;
    END IF;

    v_total_employees := v_total_employees + 1;
  END LOOP;

  RETURN QUERY SELECT v_total_employees, v_total_hours_expired;
END;
$$ LANGUAGE plpgsql;

