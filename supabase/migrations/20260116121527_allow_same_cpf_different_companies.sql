-- =====================================================
-- Permitir o mesmo CPF em empresas diferentes
-- =====================================================
-- Esta migration remove a constraint UNIQUE global do CPF
-- e cria uma constraint UNIQUE composta (company_id, cpf)
-- para permitir que o mesmo CPF seja cadastrado em empresas diferentes,
-- mas não permitir CPF duplicado na mesma empresa.

-- Remover a constraint UNIQUE global do CPF se existir
DO $$
BEGIN
  -- Verificar se a constraint existe e removê-la
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'employees_cpf_key'
    AND conrelid = 'rh.employees'::regclass
  ) THEN
    ALTER TABLE rh.employees DROP CONSTRAINT employees_cpf_key;
  END IF;
END $$;

-- Criar constraint UNIQUE composta (company_id, cpf)
-- Isso permite o mesmo CPF em empresas diferentes, mas não na mesma empresa
DO $$
BEGIN
  -- Verificar se a constraint já existe antes de criar
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'employees_company_id_cpf_unique'
    AND conrelid = 'rh.employees'::regclass
  ) THEN
    ALTER TABLE rh.employees 
    ADD CONSTRAINT employees_company_id_cpf_unique 
    UNIQUE (company_id, cpf);
  END IF;
END $$;

-- Comentário explicativo
COMMENT ON CONSTRAINT employees_company_id_cpf_unique ON rh.employees IS 
'Permite que o mesmo CPF seja cadastrado em empresas diferentes, mas impede CPF duplicado na mesma empresa';
