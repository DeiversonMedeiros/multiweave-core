-- =====================================================
-- TRIGGERS E AUTOMAÇÕES PARA MÓDULO FROTA
-- Sistema ERP MultiWeave Core
-- =====================================================

-- =====================================================
-- 1. TRIGGERS PARA NOTIFICAÇÕES DE VENCIMENTO
-- =====================================================

-- Função para criar notificação de vencimento
CREATE OR REPLACE FUNCTION frota.create_expiration_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_days_to_expire INTEGER;
    v_notification_text TEXT;
    v_vehicle_placa TEXT;
BEGIN
    -- Calcular dias para vencimento
    v_days_to_expire = (NEW.vencimento - CURRENT_DATE)::INTEGER;
    
    -- Obter placa do veículo
    SELECT placa INTO v_vehicle_placa 
    FROM frota.vehicles 
    WHERE id = NEW.vehicle_id;
    
    -- Criar notificação se vencimento em até 30 dias
    IF v_days_to_expire <= 30 AND v_days_to_expire >= 0 THEN
        v_notification_text = 'Documento ' || NEW.tipo::TEXT || ' do veículo ' || v_vehicle_placa || 
                             ' vence em ' || v_days_to_expire || ' dias';
        
        -- Inserir notificação (assumindo que existe tabela de notificações)
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            data,
            created_at
        ) VALUES (
            -- Buscar usuários da empresa
            (SELECT user_id FROM public.user_companies 
             WHERE company_id = (SELECT company_id FROM frota.vehicles WHERE id = NEW.vehicle_id) 
             LIMIT 1),
            'Documento Próximo do Vencimento',
            v_notification_text,
            'warning',
            jsonb_build_object(
                'vehicle_id', NEW.vehicle_id,
                'document_id', NEW.id,
                'document_type', NEW.tipo::TEXT,
                'expiration_date', NEW.vencimento,
                'days_to_expire', v_days_to_expire
            ),
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para notificações de vencimento de documentos
CREATE TRIGGER document_expiration_notification_trigger
    AFTER INSERT OR UPDATE ON frota.vehicle_documents
    FOR EACH ROW 
    WHEN (NEW.vencimento IS NOT NULL)
    EXECUTE FUNCTION frota.create_expiration_notification();

-- =====================================================
-- 2. TRIGGERS PARA MANUTENÇÕES AUTOMÁTICAS
-- =====================================================

-- Função para verificar manutenções preventivas por quilometragem
CREATE OR REPLACE FUNCTION frota.check_preventive_maintenance_by_mileage()
RETURNS TRIGGER AS $$
DECLARE
    v_maintenance_record RECORD;
    v_vehicle_placa TEXT;
BEGIN
    -- Buscar manutenções preventivas pendentes baseadas em quilometragem
    FOR v_maintenance_record IN
        SELECT vm.*, v.placa
        FROM frota.vehicle_maintenances vm
        JOIN frota.vehicles v ON vm.vehicle_id = v.id
        WHERE vm.vehicle_id = NEW.id
        AND vm.tipo = 'preventiva'
        AND vm.status = 'pendente'
        AND vm.km_proxima IS NOT NULL
        AND vm.km_proxima <= NEW.quilometragem
    LOOP
        -- Atualizar status da manutenção para 'em_execucao'
        UPDATE frota.vehicle_maintenances 
        SET 
            status = 'em_execucao',
            data_agendada = CURRENT_DATE,
            updated_at = NOW()
        WHERE id = v_maintenance_record.id;
        
        -- Criar notificação
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            type,
            data,
            created_at
        ) VALUES (
            (SELECT user_id FROM public.user_companies 
             WHERE company_id = NEW.company_id 
             LIMIT 1),
            'Manutenção Preventiva Necessária',
            'Veículo ' || v_maintenance_record.placa || 
            ' atingiu ' || NEW.quilometragem || 'km. ' ||
            'Manutenção: ' || v_maintenance_record.descricao,
            'info',
            jsonb_build_object(
                'vehicle_id', NEW.id,
                'maintenance_id', v_maintenance_record.id,
                'current_mileage', NEW.quilometragem,
                'required_mileage', v_maintenance_record.km_proxima
            ),
            NOW()
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para verificar manutenções por quilometragem
CREATE TRIGGER check_preventive_maintenance_trigger
    AFTER UPDATE OF quilometragem ON frota.vehicles
    FOR EACH ROW 
    WHEN (NEW.quilometragem > OLD.quilometragem)
    EXECUTE FUNCTION frota.check_preventive_maintenance_by_mileage();

-- =====================================================
-- 3. TRIGGERS PARA ATUALIZAÇÃO DE STATUS
-- =====================================================

-- Função para atualizar status de documentos baseado na data
CREATE OR REPLACE FUNCTION frota.update_document_status_daily()
RETURNS VOID AS $$
BEGIN
    -- Atualizar documentos vencidos
    UPDATE frota.vehicle_documents 
    SET status = 'vencido', updated_at = NOW()
    WHERE vencimento < CURRENT_DATE AND status != 'vencido';
    
    -- Atualizar documentos próximos do vencimento
    UPDATE frota.vehicle_documents 
    SET status = 'a_vencer', updated_at = NOW()
    WHERE vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' 
    AND status = 'valido';
    
    -- Atualizar documentos válidos
    UPDATE frota.vehicle_documents 
    SET status = 'valido', updated_at = NOW()
    WHERE vencimento > CURRENT_DATE + INTERVAL '30 days' 
    AND status != 'valido';
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar status de CNH dos condutores
CREATE OR REPLACE FUNCTION frota.update_driver_license_status()
RETURNS VOID AS $$
BEGIN
    -- Desativar condutores com CNH vencida
    UPDATE frota.drivers 
    SET ativo = false, updated_at = NOW()
    WHERE cnh_validade < CURRENT_DATE AND ativo = true;
    
    -- Criar notificações para CNHs próximas do vencimento
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        data,
        created_at
    )
    SELECT 
        uc.user_id,
        'CNH Próxima do Vencimento',
        'CNH do condutor ' || d.nome || ' vence em ' || 
        (d.cnh_validade - CURRENT_DATE)::INTEGER || ' dias',
        'warning',
        jsonb_build_object(
            'driver_id', d.id,
            'driver_name', d.nome,
            'cnh_expiration', d.cnh_validade,
            'days_to_expire', (d.cnh_validade - CURRENT_DATE)::INTEGER
        ),
        NOW()
    FROM frota.drivers d
    JOIN frota.vehicles v ON d.company_id = v.company_id
    JOIN public.user_companies uc ON v.company_id = uc.company_id
    WHERE d.cnh_validade BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    AND d.ativo = true
    AND NOT EXISTS (
        SELECT 1 FROM public.notifications n 
        WHERE n.data->>'driver_id' = d.id::TEXT 
        AND n.title = 'CNH Próxima do Vencimento'
        AND n.created_at > CURRENT_DATE - INTERVAL '1 day'
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. TRIGGERS PARA AUDITORIA
-- =====================================================

-- Função para registrar auditoria de veículos
CREATE OR REPLACE FUNCTION frota.audit_vehicle_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_operation TEXT;
    v_old_data JSONB;
    v_new_data JSONB;
BEGIN
    -- Determinar operação
    IF TG_OP = 'INSERT' THEN
        v_operation = 'INSERT';
        v_old_data = NULL;
        v_new_data = to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_operation = 'UPDATE';
        v_old_data = to_jsonb(OLD);
        v_new_data = to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        v_operation = 'DELETE';
        v_old_data = to_jsonb(OLD);
        v_new_data = NULL;
    END IF;
    
    -- Inserir registro de auditoria (assumindo tabela de auditoria)
    INSERT INTO public.audit_logs (
        table_name,
        operation,
        old_data,
        new_data,
        user_id,
        created_at
    ) VALUES (
        'frota.vehicles',
        v_operation,
        v_old_data,
        v_new_data,
        auth.uid(),
        NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para auditoria de veículos
CREATE TRIGGER audit_vehicles_trigger
    AFTER INSERT OR UPDATE OR DELETE ON frota.vehicles
    FOR EACH ROW EXECUTE FUNCTION frota.audit_vehicle_changes();

-- =====================================================
-- 5. TRIGGERS PARA INTEGRAÇÃO COM ALMOXARIFADO
-- =====================================================

-- Função para registrar peças utilizadas em manutenção
CREATE OR REPLACE FUNCTION frota.register_maintenance_parts()
RETURNS TRIGGER AS $$
DECLARE
    v_parts_data JSONB;
    part_item JSONB;
BEGIN
    -- Verificar se há dados de peças no campo observações (formato JSON)
    IF NEW.observacoes IS NOT NULL AND NEW.observacoes::TEXT LIKE '{%' THEN
        BEGIN
            v_parts_data := NEW.observacoes::JSONB;
            
            -- Processar cada peça utilizada
            FOR part_item IN SELECT * FROM jsonb_array_elements(v_parts_data->'parts')
            LOOP
                -- Registrar saída no almoxarifado (assumindo tabela de movimentações)
                INSERT INTO almoxarifado.movimentacoes (
                    item_id,
                    tipo_movimentacao,
                    quantidade,
                    observacoes,
                    referencia_id,
                    created_at
                ) VALUES (
                    (part_item->>'item_id')::UUID,
                    'saida',
                    (part_item->>'quantidade')::NUMERIC,
                    'Manutenção veículo: ' || NEW.descricao,
                    NEW.id,
                    NOW()
                );
            END LOOP;
        EXCEPTION
            WHEN OTHERS THEN
                -- Se não conseguir processar JSON, apenas logar o erro
                RAISE WARNING 'Erro ao processar peças da manutenção %: %', NEW.id, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para registrar peças de manutenção
CREATE TRIGGER register_maintenance_parts_trigger
    AFTER INSERT OR UPDATE ON frota.vehicle_maintenances
    FOR EACH ROW 
    WHEN (NEW.status = 'finalizada' AND NEW.observacoes IS NOT NULL)
    EXECUTE FUNCTION frota.register_maintenance_parts();

-- =====================================================
-- 6. TRIGGERS PARA CÁLCULOS AUTOMÁTICOS
-- =====================================================

-- Função para calcular custo total de manutenção por veículo
CREATE OR REPLACE FUNCTION frota.calculate_vehicle_maintenance_cost()
RETURNS TRIGGER AS $$
DECLARE
    v_total_cost NUMERIC;
BEGIN
    -- Calcular custo total das manutenções do veículo
    SELECT COALESCE(SUM(valor), 0) INTO v_total_cost
    FROM frota.vehicle_maintenances
    WHERE vehicle_id = NEW.vehicle_id
    AND status = 'finalizada';
    
    -- Atualizar campo de custo total (assumindo que existe)
    UPDATE frota.vehicles 
    SET 
        -- Aqui você pode adicionar um campo para custo total se necessário
        updated_at = NOW()
    WHERE id = NEW.vehicle_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular custos de manutenção
CREATE TRIGGER calculate_maintenance_cost_trigger
    AFTER INSERT OR UPDATE OF valor, status ON frota.vehicle_maintenances
    FOR EACH ROW 
    WHEN (NEW.status = 'finalizada')
    EXECUTE FUNCTION frota.calculate_vehicle_maintenance_cost();

-- =====================================================
-- 7. FUNÇÕES DE MANUTENÇÃO AUTOMÁTICA
-- =====================================================

-- Função para executar tarefas diárias de manutenção
CREATE OR REPLACE FUNCTION frota.daily_maintenance_tasks()
RETURNS VOID AS $$
BEGIN
    -- Atualizar status de documentos
    PERFORM frota.update_document_status_daily();
    
    -- Atualizar status de CNH
    PERFORM frota.update_driver_license_status();
    
    -- Verificar manutenções preventivas por data
    UPDATE frota.vehicle_maintenances 
    SET 
        status = 'em_execucao',
        data_realizada = CURRENT_DATE,
        updated_at = NOW()
    WHERE status = 'pendente' 
    AND data_agendada IS NOT NULL 
    AND data_agendada <= CURRENT_DATE;
    
    -- Criar notificações para manutenções atrasadas
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        data,
        created_at
    )
    SELECT 
        uc.user_id,
        'Manutenção Atrasada',
        'Manutenção do veículo ' || v.placa || ' está atrasada desde ' || vm.data_agendada,
        'error',
        jsonb_build_object(
            'vehicle_id', v.id,
            'maintenance_id', vm.id,
            'scheduled_date', vm.data_agendada,
            'days_overdue', (CURRENT_DATE - vm.data_agendada)::INTEGER
        ),
        NOW()
    FROM frota.vehicle_maintenances vm
    JOIN frota.vehicles v ON vm.vehicle_id = v.id
    JOIN public.user_companies uc ON v.company_id = uc.company_id
    WHERE vm.status = 'pendente'
    AND vm.data_agendada < CURRENT_DATE
    AND NOT EXISTS (
        SELECT 1 FROM public.notifications n 
        WHERE n.data->>'maintenance_id' = vm.id::TEXT 
        AND n.title = 'Manutenção Atrasada'
        AND n.created_at > CURRENT_DATE - INTERVAL '1 day'
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. CRIAÇÃO DE JOB PARA EXECUÇÃO DIÁRIA
-- =====================================================

-- Função para criar job de manutenção diária (se usando pg_cron)
-- Esta função deve ser executada manualmente ou via cron job externo
CREATE OR REPLACE FUNCTION frota.schedule_daily_maintenance()
RETURNS VOID AS $$
BEGIN
    -- Executar tarefas diárias
    PERFORM frota.daily_maintenance_tasks();
    
    -- Log da execução
    INSERT INTO public.system_logs (
        level,
        message,
        data,
        created_at
    ) VALUES (
        'INFO',
        'Tarefas diárias de manutenção da frota executadas',
        jsonb_build_object(
            'execution_time', NOW(),
            'tasks', ARRAY['document_status_update', 'license_status_update', 'maintenance_checks']
        ),
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. TRIGGERS PARA VALIDAÇÕES
-- =====================================================

-- Função para validar dados de veículo
CREATE OR REPLACE FUNCTION frota.validate_vehicle_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar placa (formato brasileiro)
    IF NEW.placa !~ '^[A-Z]{3}[0-9]{4}$' AND NEW.placa !~ '^[A-Z]{3}[0-9][A-Z][0-9]{2}$' THEN
        RAISE EXCEPTION 'Formato de placa inválido. Use formato ABC-1234 ou ABC1D23';
    END IF;
    
    -- Validar RENAVAM (11 dígitos)
    IF NEW.renavam IS NOT NULL AND NEW.renavam !~ '^[0-9]{11}$' THEN
        RAISE EXCEPTION 'RENAVAM deve conter exatamente 11 dígitos';
    END IF;
    
    -- Validar chassi (17 caracteres alfanuméricos)
    IF NEW.chassi IS NOT NULL AND NEW.chassi !~ '^[A-HJ-NPR-Z0-9]{17}$' THEN
        RAISE EXCEPTION 'Chassi deve conter exatamente 17 caracteres alfanuméricos';
    END IF;
    
    -- Validar ano
    IF NEW.ano IS NOT NULL AND (NEW.ano < 1900 OR NEW.ano > EXTRACT(YEAR FROM CURRENT_DATE) + 1) THEN
        RAISE EXCEPTION 'Ano do veículo inválido';
    END IF;
    
    -- Validar quilometragem
    IF NEW.quilometragem < 0 THEN
        RAISE EXCEPTION 'Quilometragem não pode ser negativa';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validação de veículos
CREATE TRIGGER validate_vehicle_data_trigger
    BEFORE INSERT OR UPDATE ON frota.vehicles
    FOR EACH ROW EXECUTE FUNCTION frota.validate_vehicle_data();

-- =====================================================
-- FIM DOS TRIGGERS E AUTOMAÇÕES
-- =====================================================
