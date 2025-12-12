-- =====================================================
-- CORREÇÃO: Função de auditoria do almoxarifado
-- =====================================================
-- Data: 2025-12-03
-- Descrição: Corrige a função audit_trigger_function para usar as colunas corretas
--            da tabela rh.audit_logs (entity_type, action, old_values, new_values, entity_id)

-- Função de auditoria corrigida para almoxarifado
CREATE OR REPLACE FUNCTION almoxarifado.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    operation_type TEXT;
    entity_id_val UUID;
    company_id_val UUID;
BEGIN
    -- Determinar tipo de operação
    IF TG_OP = 'DELETE' THEN
        operation_type := 'delete';
        old_data := to_jsonb(OLD);
        new_data := NULL;
        entity_id_val := (OLD.id)::UUID;
        company_id_val := COALESCE(
            (OLD.company_id)::UUID,
            current_setting('app.current_company_id', true)::uuid,
            (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
        );
    ELSIF TG_OP = 'UPDATE' THEN
        operation_type := 'update';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        entity_id_val := (NEW.id)::UUID;
        company_id_val := COALESCE(
            (NEW.company_id)::UUID,
            current_setting('app.current_company_id', true)::uuid,
            (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
        );
    ELSIF TG_OP = 'INSERT' THEN
        operation_type := 'create';
        old_data := NULL;
        new_data := to_jsonb(NEW);
        entity_id_val := (NEW.id)::UUID;
        company_id_val := COALESCE(
            (NEW.company_id)::UUID,
            current_setting('app.current_company_id', true)::uuid,
            (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
        );
    END IF;

    -- Inserir log de auditoria usando as colunas corretas
    INSERT INTO rh.audit_logs (
        company_id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values,
        created_at
    ) VALUES (
        company_id_val,
        auth.uid(),
        operation_type,
        TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
        entity_id_val,
        old_data,
        new_data,
        NOW()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


