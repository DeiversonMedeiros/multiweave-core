-- =====================================================
-- CORREÇÃO: Trigger de Auditoria de Veículos
-- =====================================================
-- Data: 2025-12-27
-- Descrição: Corrige a função audit_vehicle_changes() para usar rh.audit_logs
--            em vez de public.audit_logs, com os campos corretos
-- =====================================================

-- Corrigir função de auditoria de veículos
CREATE OR REPLACE FUNCTION frota.audit_vehicle_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_action TEXT;
    v_old_values JSONB;
    v_new_values JSONB;
    v_company_id UUID;
    v_entity_id UUID;
BEGIN
    -- Determinar ação
    IF TG_OP = 'INSERT' THEN
        v_action := 'CREATE';
        v_old_values := NULL;
        v_new_values := to_jsonb(NEW);
        v_company_id := NEW.company_id;
        v_entity_id := NEW.id;
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'UPDATE';
        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);
        v_company_id := NEW.company_id;
        v_entity_id := NEW.id;
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
        v_old_values := to_jsonb(OLD);
        v_new_values := NULL;
        v_company_id := OLD.company_id;
        v_entity_id := OLD.id;
    END IF;
    
    -- Inserir registro de auditoria usando rh.audit_logs com estrutura correta
    INSERT INTO rh.audit_logs (
        company_id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values
    ) VALUES (
        v_company_id,
        auth.uid(),
        v_action,
        'frota.vehicles',
        v_entity_id,
        v_old_values,
        v_new_values
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário
COMMENT ON FUNCTION frota.audit_vehicle_changes() IS 
'Função de auditoria para mudanças na tabela frota.vehicles. Registra logs em rh.audit_logs com estrutura correta.';

