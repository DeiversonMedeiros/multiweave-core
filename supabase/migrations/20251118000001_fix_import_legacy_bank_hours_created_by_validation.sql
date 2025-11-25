-- =====================================================
-- MIGRATION: FIX IMPORT LEGACY BANK HOURS CREATED_BY VALIDATION
-- =====================================================
-- Problema: A função public.import_legacy_bank_hours estava usando auth.uid()
-- diretamente sem verificar se o UUID existe na tabela profiles, causando
-- violação de chave estrangeira quando o usuário autenticado não tem registro
-- correspondente em profiles.
--
-- Solução: Validar se auth.uid() existe em profiles antes de usar. Se não
-- existir, passar NULL para created_by (que é permitido pela constraint).
-- =====================================================

CREATE OR REPLACE FUNCTION public.import_legacy_bank_hours(
  p_employee_id UUID,
  p_company_id UUID,
  p_hours_amount DECIMAL(5,2),
  p_reference_date DATE,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_created_by UUID;
BEGIN
  -- Verificar se auth.uid() existe na tabela profiles
  -- Se não existir, usar NULL (permitido pela constraint)
  SELECT id INTO v_created_by
  FROM profiles
  WHERE id = auth.uid();
  
  -- Se não encontrou, v_created_by será NULL (comportamento esperado)
  
  RETURN rh.import_legacy_bank_hours(
    p_employee_id,
    p_company_id,
    p_hours_amount,
    p_reference_date,
    p_description,
    v_created_by  -- Pode ser NULL se o usuário não existe em profiles
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.import_legacy_bank_hours(UUID, UUID, DECIMAL, DATE, TEXT)
  IS 'Wrapper público para importação de horas legadas via RPC. Valida se o usuário autenticado existe em profiles antes de usar como created_by.';

-- =====================================================
-- CORRIGIR TAMBÉM A FUNÇÃO adjust_bank_hours_balance
-- =====================================================
CREATE OR REPLACE FUNCTION public.adjust_bank_hours_balance(
  p_employee_id UUID,
  p_company_id UUID,
  p_hours_amount DECIMAL(5,2),
  p_description TEXT,
  p_transaction_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID AS $$
DECLARE
  v_created_by UUID;
BEGIN
  -- Verificar se auth.uid() existe na tabela profiles
  -- Se não existir, usar NULL (permitido pela constraint)
  SELECT id INTO v_created_by
  FROM profiles
  WHERE id = auth.uid();
  
  -- Se não encontrou, v_created_by será NULL (comportamento esperado)
  
  RETURN rh.adjust_bank_hours_balance(
    p_employee_id,
    p_company_id,
    p_hours_amount,
    p_description,
    v_created_by,  -- Pode ser NULL se o usuário não existe em profiles
    p_transaction_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.adjust_bank_hours_balance(UUID, UUID, DECIMAL, TEXT, DATE)
  IS 'Wrapper público para ajustes manuais do banco de horas (RPC Supabase). Valida se o usuário autenticado existe em profiles antes de usar como created_by.';

