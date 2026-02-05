-- =====================================================
-- Permitir CPF duplicado para funcionários demitidos
-- =====================================================
-- Esta migration modifica a constraint de CPF para permitir
-- que funcionários demitidos possam ter o mesmo CPF na mesma empresa.
-- A unicidade será aplicada apenas para funcionários que NÃO estão demitidos.

-- Remover a constraint UNIQUE atual (company_id, cpf)
DO $$
BEGIN
  -- Verificar se a constraint existe e removê-la
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'employees_company_id_cpf_unique'
    AND conrelid = 'rh.employees'::regclass
  ) THEN
    ALTER TABLE rh.employees DROP CONSTRAINT employees_company_id_cpf_unique;
  END IF;
END $$;

-- Remover o índice único antigo se existir
DROP INDEX IF EXISTS rh.employees_company_id_cpf_unique;

-- Criar índice único parcial que só aplica para funcionários NÃO demitidos
-- Isso permite múltiplos registros com mesmo CPF na mesma empresa,
-- desde que todos exceto um estejam com status 'demitido'
CREATE UNIQUE INDEX IF NOT EXISTS employees_company_id_cpf_active_unique 
ON rh.employees (company_id, cpf)
WHERE status != 'demitido';

-- Comentário explicativo (especificando o schema)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE schemaname = 'rh' 
    AND indexname = 'employees_company_id_cpf_active_unique'
  ) THEN
    EXECUTE 'COMMENT ON INDEX rh.employees_company_id_cpf_active_unique IS ' ||
      quote_literal('Permite que o mesmo CPF seja cadastrado na mesma empresa apenas se o funcionário anterior estiver demitido. Impede CPF duplicado para funcionários ativos/inativos/afastados/etc.');
  END IF;
END $$;
