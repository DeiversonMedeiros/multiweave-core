-- =====================================================
-- MIGRATION: LEGACY BANK HOURS IMPORT FEATURE
-- =====================================================
DO $$
BEGIN
  -- Garantir que o schema rh exista
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'rh'
  ) THEN
    EXECUTE 'CREATE SCHEMA rh';
  END IF;
END $$;

-- =====================================================
-- 1. NOVA TABELA PARA IMPORTAÇÕES LEGADAS
-- =====================================================
CREATE TABLE IF NOT EXISTS rh.bank_hours_legacy_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
  hours_amount DECIMAL(6,2) NOT NULL,
  reference_date DATE NOT NULL,
  description TEXT,
  transaction_id UUID REFERENCES rh.bank_hours_transactions(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE rh.bank_hours_legacy_imports IS 'Registra importações de horas legadas aplicadas manualmente ao banco de horas';
COMMENT ON COLUMN rh.bank_hours_legacy_imports.hours_amount IS 'Quantidade de horas importadas (positivas ou negativas)';
COMMENT ON COLUMN rh.bank_hours_legacy_imports.reference_date IS 'Data de referência das horas importadas';

CREATE INDEX IF NOT EXISTS idx_bank_hours_legacy_company ON rh.bank_hours_legacy_imports(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_hours_legacy_employee ON rh.bank_hours_legacy_imports(employee_id);
CREATE INDEX IF NOT EXISTS idx_bank_hours_legacy_reference_date ON rh.bank_hours_legacy_imports(reference_date);

ALTER TABLE rh.bank_hours_legacy_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view legacy bank hour imports for their companies"
ON rh.bank_hours_legacy_imports
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM user_companies
    WHERE user_id = auth.uid() AND ativo = true
  )
);

CREATE POLICY "Users can manage legacy bank hour imports for their companies"
ON rh.bank_hours_legacy_imports
FOR ALL
USING (
  company_id IN (
    SELECT company_id FROM user_companies
    WHERE user_id = auth.uid() AND ativo = true
  )
);

-- =====================================================
-- 2. ATUALIZAÇÃO DA FUNÇÃO DE AJUSTE MANUAL
--    (Permitir informar data da transação)
-- =====================================================
DROP FUNCTION IF EXISTS public.adjust_bank_hours_balance(UUID, UUID, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS rh.adjust_bank_hours_balance(UUID, UUID, NUMERIC, TEXT, UUID);

CREATE OR REPLACE FUNCTION rh.adjust_bank_hours_balance(
  p_employee_id UUID,
  p_company_id UUID,
  p_hours_amount DECIMAL(5,2),
  p_description TEXT,
  p_created_by UUID DEFAULT NULL,
  p_transaction_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_new_balance DECIMAL(6,2);
  v_transaction_date DATE := COALESCE(p_transaction_date, CURRENT_DATE);
BEGIN
  -- Verificar se o colaborador tem banco de horas configurado
  IF NOT EXISTS (
    SELECT 1 FROM rh.bank_hours_config 
    WHERE employee_id = p_employee_id 
      AND company_id = p_company_id 
      AND is_active = true
  ) THEN
    -- Inicializar configuração padrão se não existir
    PERFORM rh.initialize_bank_hours_config(p_employee_id, p_company_id);
  END IF;

  -- Registrar transação
  INSERT INTO rh.bank_hours_transactions (
    employee_id, company_id, transaction_type, transaction_date,
    hours_amount, description, created_by, is_automatic,
    reference_period_start, reference_period_end
  ) VALUES (
    p_employee_id, p_company_id, 'adjustment', v_transaction_date,
    p_hours_amount, p_description, p_created_by, false,
    v_transaction_date, v_transaction_date
  ) RETURNING id INTO v_transaction_id;

  -- Atualizar saldo
  UPDATE rh.bank_hours_balance SET
    current_balance = current_balance + p_hours_amount,
    updated_at = NOW()
  WHERE employee_id = p_employee_id AND company_id = p_company_id
  RETURNING current_balance INTO v_new_balance;

  -- Se não existe saldo, criar
  IF NOT FOUND THEN
    INSERT INTO rh.bank_hours_balance (
      employee_id, company_id, current_balance, accumulated_hours, compensated_hours, expired_hours,
      last_calculation_date
    )
    VALUES (
      p_employee_id, p_company_id, p_hours_amount, 0, 0, 0, v_transaction_date
    )
    RETURNING current_balance INTO v_new_balance;
  END IF;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION rh.adjust_bank_hours_balance(UUID, UUID, DECIMAL, TEXT, UUID, DATE)
  IS 'Realiza ajustes manuais no banco de horas permitindo definir a data da transação';

CREATE OR REPLACE FUNCTION public.adjust_bank_hours_balance(
  p_employee_id UUID,
  p_company_id UUID,
  p_hours_amount DECIMAL(5,2),
  p_description TEXT,
  p_transaction_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID AS $$
BEGIN
  RETURN rh.adjust_bank_hours_balance(
    p_employee_id,
    p_company_id,
    p_hours_amount,
    p_description,
    auth.uid(),
    p_transaction_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.adjust_bank_hours_balance(UUID, UUID, DECIMAL, TEXT, DATE)
  IS 'Wrapper público para ajustes manuais do banco de horas (RPC Supabase)';

GRANT ALL ON FUNCTION rh.adjust_bank_hours_balance(UUID, UUID, DECIMAL, TEXT, UUID, DATE) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.adjust_bank_hours_balance(UUID, UUID, DECIMAL, TEXT, DATE) TO anon, authenticated, service_role;

-- =====================================================
-- 3. FUNÇÃO ESPECÍFICA PARA IMPORTAR HORAS LEGADAS
-- =====================================================
CREATE OR REPLACE FUNCTION rh.import_legacy_bank_hours(
  p_employee_id UUID,
  p_company_id UUID,
  p_hours_amount DECIMAL(5,2),
  p_reference_date DATE,
  p_description TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_description TEXT := COALESCE(NULLIF(trim(p_description), ''), 'Importação de horas legadas');
BEGIN
  -- Garantir configuração e saldo existentes
  IF NOT EXISTS (
    SELECT 1 FROM rh.bank_hours_config 
    WHERE employee_id = p_employee_id 
      AND company_id = p_company_id
  ) THEN
    PERFORM rh.initialize_bank_hours_config(p_employee_id, p_company_id);
  END IF;

  -- Aplicar ajuste utilizando a nova função
  v_transaction_id := rh.adjust_bank_hours_balance(
    p_employee_id,
    p_company_id,
    p_hours_amount,
    v_description,
    p_created_by,
    p_reference_date
  );

  -- Registrar a importação para rastreabilidade
  INSERT INTO rh.bank_hours_legacy_imports (
    employee_id,
    company_id,
    hours_amount,
    reference_date,
    description,
    transaction_id,
    created_by
  ) VALUES (
    p_employee_id,
    p_company_id,
    p_hours_amount,
    p_reference_date,
    v_description,
    v_transaction_id,
    p_created_by
  );

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.import_legacy_bank_hours(
  p_employee_id UUID,
  p_company_id UUID,
  p_hours_amount DECIMAL(5,2),
  p_reference_date DATE,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
BEGIN
  RETURN rh.import_legacy_bank_hours(
    p_employee_id,
    p_company_id,
    p_hours_amount,
    p_reference_date,
    p_description,
    auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION rh.import_legacy_bank_hours(UUID, UUID, DECIMAL, DATE, TEXT, UUID)
  IS 'Importa horas legadas lançando ajuste manual e registrando origem';

COMMENT ON FUNCTION public.import_legacy_bank_hours(UUID, UUID, DECIMAL, DATE, TEXT)
  IS 'Wrapper público para importação de horas legadas via RPC';

GRANT ALL ON FUNCTION rh.import_legacy_bank_hours(UUID, UUID, DECIMAL, DATE, TEXT, UUID) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.import_legacy_bank_hours(UUID, UUID, DECIMAL, DATE, TEXT) TO anon, authenticated, service_role;

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================


