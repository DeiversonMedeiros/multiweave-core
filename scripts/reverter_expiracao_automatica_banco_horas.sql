-- =============================================================
-- SCRIPT: REVERTER EXPIRAÇÕES AUTOMÁTICAS DO BANCO DE HORAS
-- =============================================================
-- Objetivo:
-- - Reverter os débitos gerados por transações automáticas
--   de expiração de banco de horas (transaction_type = 'expiration'
--   e is_automatic = TRUE) para TODAS as empresas.
-- - O script:
--   1) Ajusta os saldos em rh.bank_hours_balance
--   2) Remove as transações de expiração automática
--
-- Observações:
-- - Apenas transações com transaction_type = 'expiration'
--   E is_automatic = TRUE são consideradas.
-- - Expirações manuais (is_automatic = FALSE), se existirem,
--   NÃO são alteradas.
-- - Execute em transação única para garantir atomicidade.
-- =============================================================

BEGIN;

-- 1) Ajustar saldos em rh.bank_hours_balance
-- ------------------------------------------
-- Para cada combinação (employee_id, company_id), somamos todas as
-- horas de expiração automática. Como hours_amount é NEGATIVO, usamos
-- as seguintes regras:
--   - current_balance foi reduzido em H (H > 0)
--       → precisamos SOMAR H de volta
--       → current_balance = current_balance - total_hours
--         (pois total_hours é negativo)
--   - expired_hours foi aumentado em H
--       → precisamos SUBTRAIR H
--       → expired_hours = expired_hours + total_hours
--         (pois total_hours é negativo)

WITH automatic_expirations AS (
  SELECT
    employee_id,
    company_id,
    SUM(hours_amount) AS total_hours -- valor negativo
  FROM rh.bank_hours_transactions
  WHERE transaction_type = 'expiration'
    AND is_automatic = TRUE
  GROUP BY employee_id, company_id
)
UPDATE rh.bank_hours_balance b
SET
  current_balance = current_balance - ae.total_hours,
  expired_hours   = expired_hours   + ae.total_hours,
  updated_at      = NOW()
FROM automatic_expirations ae
WHERE b.employee_id = ae.employee_id
  AND b.company_id  = ae.company_id;

-- 2) Remover as transações de expiração automática
-- -----------------------------------------------
DELETE FROM rh.bank_hours_transactions
WHERE transaction_type = 'expiration'
  AND is_automatic = TRUE;

COMMIT;

