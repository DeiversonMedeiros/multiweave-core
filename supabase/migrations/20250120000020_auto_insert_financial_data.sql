-- =====================================================
-- MIGRAÇÃO: Inserção Automática de Dados Financeiros Padrão
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Insere automaticamente Plano de Contas e Classes Financeiras
--            para todas as empresas existentes e futuras
-- Autor: Sistema MultiWeave Core

-- =====================================================
-- 1. Inserir dados para empresas existentes
-- =====================================================
DO $$
DECLARE
    v_company RECORD;
BEGIN
    FOR v_company IN SELECT id FROM public.companies WHERE ativo = true
    LOOP
        -- Inserir Plano de Contas
        PERFORM financeiro.insert_plano_contas_telecom(v_company.id, NULL);
        
        -- Inserir Classes Financeiras
        PERFORM financeiro.insert_classes_financeiras_telecom(v_company.id, NULL);
        
        RAISE NOTICE 'Dados financeiros inseridos para empresa: %', v_company.id;
    END LOOP;
END $$;

-- =====================================================
-- 2. Criar trigger para inserir automaticamente em novas empresas
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_insert_financial_data_for_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Inserir Plano de Contas
    PERFORM financeiro.insert_plano_contas_telecom(NEW.id, NULL);
    
    -- Inserir Classes Financeiras
    PERFORM financeiro.insert_classes_financeiras_telecom(NEW.id, NULL);
    
    RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_auto_insert_financial_data ON public.companies;
CREATE TRIGGER trigger_auto_insert_financial_data
    AFTER INSERT ON public.companies
    FOR EACH ROW
    WHEN (NEW.ativo = true)
    EXECUTE FUNCTION public.auto_insert_financial_data_for_company();

COMMENT ON FUNCTION public.auto_insert_financial_data_for_company() IS 
'Insere automaticamente Plano de Contas e Classes Financeiras padrão quando uma nova empresa é criada';

