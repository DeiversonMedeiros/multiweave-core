-- =====================================================
-- CORRIGIR TRIGGER PARA CRIAR CONFIGURAÇÃO DE ASSINATURA
-- =====================================================
-- 
-- Problema: Ao criar uma nova empresa, o trigger tenta inserir
-- um registro em time_record_signature_config, mas a política RLS
-- bloqueia porque o usuário ainda não está associado à empresa
-- em user_companies.
--
-- Solução: Criar função com SECURITY DEFINER que pode ignorar
-- as políticas RLS ao inserir o registro.

-- Função para criar configuração de assinatura para nova empresa
CREATE OR REPLACE FUNCTION public.create_signature_config_for_new_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO rh.time_record_signature_config (
        company_id,
        is_enabled,
        signature_period_days,
        reminder_days,
        require_manager_approval,
        auto_close_month
    ) VALUES (
        NEW.id,
        false,
        5,
        3,
        true,
        true
    )
    ON CONFLICT (company_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Criar trigger para executar após inserção de nova empresa
DROP TRIGGER IF EXISTS create_signature_config_trigger ON public.companies;

CREATE TRIGGER create_signature_config_trigger
    AFTER INSERT ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.create_signature_config_for_new_company();

-- Comentário
COMMENT ON FUNCTION public.create_signature_config_for_new_company() IS 
    'Cria automaticamente a configuração padrão de assinatura de ponto quando uma nova empresa é criada. Usa SECURITY DEFINER para contornar políticas RLS.';






































