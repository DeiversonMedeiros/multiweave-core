-- =====================================================
-- CORREÇÃO DE TODAS AS POLÍTICAS RLS
-- =====================================================
-- Data: 2025-01-21
-- Descrição: Remove dependências de funções não existentes das políticas RLS

-- Remover todas as políticas RLS problemáticas e recriar com versões simplificadas

-- 1. employment_contracts
DROP POLICY IF EXISTS "Users can view employment_contracts from their company" ON rh.employment_contracts;
DROP POLICY IF EXISTS "Users can insert employment_contracts in their company" ON rh.employment_contracts;
DROP POLICY IF EXISTS "Users can update employment_contracts from their company" ON rh.employment_contracts;
DROP POLICY IF EXISTS "Users can delete employment_contracts from their company" ON rh.employment_contracts;

CREATE POLICY "Users can view employment_contracts from their company" ON rh.employment_contracts
    FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Users can insert employment_contracts in their company" ON rh.employment_contracts
    FOR INSERT WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "Users can update employment_contracts from their company" ON rh.employment_contracts
    FOR UPDATE USING (user_has_company_access(company_id));

CREATE POLICY "Users can delete employment_contracts from their company" ON rh.employment_contracts
    FOR DELETE USING (user_has_company_access(company_id));

-- 2. rubricas
DROP POLICY IF EXISTS "Users can view rubricas from their company" ON rh.rubricas;
DROP POLICY IF EXISTS "Users can insert rubricas in their company" ON rh.rubricas;
DROP POLICY IF EXISTS "Users can update rubricas from their company" ON rh.rubricas;
DROP POLICY IF EXISTS "Users can delete rubricas from their company" ON rh.rubricas;

CREATE POLICY "Users can view rubricas from their company" ON rh.rubricas
    FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Users can insert rubricas in their company" ON rh.rubricas
    FOR INSERT WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "Users can update rubricas from their company" ON rh.rubricas
    FOR UPDATE USING (user_has_company_access(company_id));

CREATE POLICY "Users can delete rubricas from their company" ON rh.rubricas
    FOR DELETE USING (user_has_company_access(company_id));

-- 3. allowance_types
DROP POLICY IF EXISTS "Users can view allowance_types from their company" ON rh.allowance_types;
DROP POLICY IF EXISTS "Users can insert allowance_types in their company" ON rh.allowance_types;
DROP POLICY IF EXISTS "Users can update allowance_types from their company" ON rh.allowance_types;
DROP POLICY IF EXISTS "Users can delete allowance_types from their company" ON rh.allowance_types;

CREATE POLICY "Users can view allowance_types from their company" ON rh.allowance_types
    FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Users can insert allowance_types in their company" ON rh.allowance_types
    FOR INSERT WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "Users can update allowance_types from their company" ON rh.allowance_types
    FOR UPDATE USING (user_has_company_access(company_id));

CREATE POLICY "Users can delete allowance_types from their company" ON rh.allowance_types
    FOR DELETE USING (user_has_company_access(company_id));

-- 4. delay_reasons
DROP POLICY IF EXISTS "Users can view delay_reasons from their company" ON rh.delay_reasons;
DROP POLICY IF EXISTS "Users can insert delay_reasons in their company" ON rh.delay_reasons;
DROP POLICY IF EXISTS "Users can update delay_reasons from their company" ON rh.delay_reasons;
DROP POLICY IF EXISTS "Users can delete delay_reasons from their company" ON rh.delay_reasons;

CREATE POLICY "Users can view delay_reasons from their company" ON rh.delay_reasons
    FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Users can insert delay_reasons in their company" ON rh.delay_reasons
    FOR INSERT WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "Users can update delay_reasons from their company" ON rh.delay_reasons
    FOR UPDATE USING (user_has_company_access(company_id));

CREATE POLICY "Users can delete delay_reasons from their company" ON rh.delay_reasons
    FOR DELETE USING (user_has_company_access(company_id));

-- 5. cid_codes
DROP POLICY IF EXISTS "Users can view cid_codes from their company" ON rh.cid_codes;
DROP POLICY IF EXISTS "Users can insert cid_codes in their company" ON rh.cid_codes;
DROP POLICY IF EXISTS "Users can update cid_codes from their company" ON rh.cid_codes;
DROP POLICY IF EXISTS "Users can delete cid_codes from their company" ON rh.cid_codes;

CREATE POLICY "Users can view cid_codes from their company" ON rh.cid_codes
    FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Users can insert cid_codes in their company" ON rh.cid_codes
    FOR INSERT WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "Users can update cid_codes from their company" ON rh.cid_codes
    FOR UPDATE USING (user_has_company_access(company_id));

CREATE POLICY "Users can delete cid_codes from their company" ON rh.cid_codes
    FOR DELETE USING (user_has_company_access(company_id));

-- 6. absence_types
DROP POLICY IF EXISTS "Users can view absence_types from their company" ON rh.absence_types;
DROP POLICY IF EXISTS "Users can insert absence_types in their company" ON rh.absence_types;
DROP POLICY IF EXISTS "Users can update absence_types from their company" ON rh.absence_types;
DROP POLICY IF EXISTS "Users can delete absence_types from their company" ON rh.absence_types;

CREATE POLICY "Users can view absence_types from their company" ON rh.absence_types
    FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Users can insert absence_types in their company" ON rh.absence_types
    FOR INSERT WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "Users can update absence_types from their company" ON rh.absence_types
    FOR UPDATE USING (user_has_company_access(company_id));

CREATE POLICY "Users can delete absence_types from their company" ON rh.absence_types
    FOR DELETE USING (user_has_company_access(company_id));

-- 7. deficiency_types
DROP POLICY IF EXISTS "Users can view deficiency_types from their company" ON rh.deficiency_types;
DROP POLICY IF EXISTS "Users can insert deficiency_types in their company" ON rh.deficiency_types;
DROP POLICY IF EXISTS "Users can update deficiency_types from their company" ON rh.deficiency_types;
DROP POLICY IF EXISTS "Users can delete deficiency_types from their company" ON rh.deficiency_types;

CREATE POLICY "Users can view deficiency_types from their company" ON rh.deficiency_types
    FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Users can insert deficiency_types in their company" ON rh.deficiency_types
    FOR INSERT WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "Users can update deficiency_types from their company" ON rh.deficiency_types
    FOR UPDATE USING (user_has_company_access(company_id));

CREATE POLICY "Users can delete deficiency_types from their company" ON rh.deficiency_types
    FOR DELETE USING (user_has_company_access(company_id));

-- 8. inss_brackets
DROP POLICY IF EXISTS "Users can view inss_brackets from their company" ON rh.inss_brackets;
DROP POLICY IF EXISTS "Users can insert inss_brackets in their company" ON rh.inss_brackets;
DROP POLICY IF EXISTS "Users can update inss_brackets from their company" ON rh.inss_brackets;
DROP POLICY IF EXISTS "Users can delete inss_brackets from their company" ON rh.inss_brackets;

CREATE POLICY "Users can view inss_brackets from their company" ON rh.inss_brackets
    FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Users can insert inss_brackets in their company" ON rh.inss_brackets
    FOR INSERT WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "Users can update inss_brackets from their company" ON rh.inss_brackets
    FOR UPDATE USING (user_has_company_access(company_id));

CREATE POLICY "Users can delete inss_brackets from their company" ON rh.inss_brackets
    FOR DELETE USING (user_has_company_access(company_id));

-- 9. irrf_brackets
DROP POLICY IF EXISTS "Users can view irrf_brackets from their company" ON rh.irrf_brackets;
DROP POLICY IF EXISTS "Users can insert irrf_brackets in their company" ON rh.irrf_brackets;
DROP POLICY IF EXISTS "Users can update irrf_brackets from their company" ON rh.irrf_brackets;
DROP POLICY IF EXISTS "Users can delete irrf_brackets from their company" ON rh.irrf_brackets;

CREATE POLICY "Users can view irrf_brackets from their company" ON rh.irrf_brackets
    FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Users can insert irrf_brackets in their company" ON rh.irrf_brackets
    FOR INSERT WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "Users can update irrf_brackets from their company" ON rh.irrf_brackets
    FOR UPDATE USING (user_has_company_access(company_id));

CREATE POLICY "Users can delete irrf_brackets from their company" ON rh.irrf_brackets
    FOR DELETE USING (user_has_company_access(company_id));

-- 10. fgts_config
DROP POLICY IF EXISTS "Users can view fgts_config from their company" ON rh.fgts_config;
DROP POLICY IF EXISTS "Users can insert fgts_config in their company" ON rh.fgts_config;
DROP POLICY IF EXISTS "Users can update fgts_config from their company" ON rh.fgts_config;
DROP POLICY IF EXISTS "Users can delete fgts_config from their company" ON rh.fgts_config;

CREATE POLICY "Users can view fgts_config from their company" ON rh.fgts_config
    FOR SELECT USING (user_has_company_access(company_id));

CREATE POLICY "Users can insert fgts_config in their company" ON rh.fgts_config
    FOR INSERT WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "Users can update fgts_config from their company" ON rh.fgts_config
    FOR UPDATE USING (user_has_company_access(company_id));

CREATE POLICY "Users can delete fgts_config from their company" ON rh.fgts_config
    FOR DELETE USING (user_has_company_access(company_id));

