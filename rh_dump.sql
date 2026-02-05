
\restrict VAca01KLCNWBE5XjfggvRkaXbKOIHDbz3ZeHF4HFwejC6LtgxhkXhx84GoVeNXJ


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "rh";


ALTER SCHEMA "rh" OWNER TO "postgres";


COMMENT ON SCHEMA "rh" IS 'Schema de Recursos Humanos - Tabela event_consolidations removida em 2025-12-20 ap??s unifica????o do processo de folha de pagamento';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "rh"."time_record_signature_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "is_enabled" boolean DEFAULT false NOT NULL,
    "signature_period_days" integer DEFAULT 5 NOT NULL,
    "reminder_days" integer DEFAULT 3 NOT NULL,
    "require_manager_approval" boolean DEFAULT true NOT NULL,
    "auto_close_month" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."time_record_signature_config" OWNER TO "postgres";


COMMENT ON TABLE "rh"."time_record_signature_config" IS 'ConfiguraÃ§Ãµes de assinatura de registros de ponto por empresa';



COMMENT ON COLUMN "rh"."time_record_signature_config"."signature_period_days" IS 'NÃºmero de dias para assinar apÃ³s fechamento do mÃªs';



COMMENT ON COLUMN "rh"."time_record_signature_config"."reminder_days" IS 'Dias antes do vencimento para enviar lembrete';



COMMENT ON COLUMN "rh"."time_record_signature_config"."require_manager_approval" IS 'Se requer aprovaÃ§Ã£o do gestor apÃ³s assinatura';



COMMENT ON COLUMN "rh"."time_record_signature_config"."auto_close_month" IS 'Se fecha o mÃªs automaticamente no Ãºltimo dia';



CREATE OR REPLACE FUNCTION "rh"."_calculate_training_progress_internal"("p_training_id" "uuid", "p_employee_id" "uuid", "p_company_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
DECLARE
    v_total_content INTEGER;
    v_completed_content INTEGER;
    v_total_progress DECIMAL;
    v_total_time_segments INTEGER;
    v_total_time_watched INTEGER;
    v_result JSONB;
BEGIN
    -- Inicializar vari??veis com valores padr??o
    v_total_content := 0;
    v_completed_content := 0;
    v_total_progress := 0;
    v_total_time_segments := 0;
    v_total_time_watched := 0;

    -- Contar total de conte??dos ativos
    SELECT COALESCE(COUNT(*), 0) INTO v_total_content
    FROM rh.training_content
    WHERE training_id = p_training_id
    AND is_active = true
    AND company_id = p_company_id;
    
    -- Log para debug
    RAISE NOTICE '[_calculate_training_progress_internal] Total de conte??dos encontrados: %', v_total_content;

    -- Contar conte??dos conclu??dos
    SELECT COALESCE(COUNT(DISTINCT tp.content_id), 0) INTO v_completed_content
    FROM rh.training_progress tp
    INNER JOIN rh.training_content tc ON tp.content_id = tc.id
    WHERE tp.training_id = p_training_id
    AND tp.employee_id = p_employee_id
    AND tp.company_id = p_company_id
    AND tc.is_active = true
    AND tc.company_id = p_company_id
    AND (tp.concluido = true OR tp.percentual_concluido >= 100);
    
    -- Log para debug
    RAISE NOTICE '[_calculate_training_progress_internal] Conte??dos conclu??dos encontrados: %', v_completed_content;

    -- Calcular percentual de progresso
    IF v_total_content > 0 THEN
        v_total_progress := (v_completed_content::DECIMAL / v_total_content::DECIMAL) * 100;
        
        -- CORRE????O: Se todos os conte??dos foram conclu??dos, garantir que seja exatamente 100
        IF v_completed_content = v_total_content AND v_completed_content > 0 THEN
            v_total_progress := 100;
        END IF;
    ELSE
        v_total_progress := 0;
    END IF;

    -- Garantir que o progresso seja um n??mero v??lido
    IF v_total_progress IS NULL OR v_total_progress < 0 THEN
        v_total_progress := 0;
    END IF;
    
    IF v_total_progress > 100 THEN
        v_total_progress := 100;
    END IF;

    -- Calcular tempo total assistido
    SELECT 
        COALESCE(SUM(COALESCE(tc.duracao_minutos, 0)), 0),
        COALESCE(SUM(COALESCE(tp.tempo_assistido_segundos, 0)), 0)
    INTO v_total_time_segments, v_total_time_watched
    FROM rh.training_content tc
    LEFT JOIN rh.training_progress tp ON tc.id = tp.content_id 
        AND tp.employee_id = p_employee_id
        AND tp.training_id = p_training_id
        AND tp.company_id = p_company_id
    WHERE tc.training_id = p_training_id
    AND tc.is_active = true
    AND tc.company_id = p_company_id;

    -- Garantir que os valores de tempo sejam v??lidos
    IF v_total_time_segments IS NULL THEN
        v_total_time_segments := 0;
    END IF;
    
    IF v_total_time_watched IS NULL THEN
        v_total_time_watched := 0;
    END IF;

    -- Construir resultado garantindo que todos os valores sejam v??lidos
    v_result := jsonb_build_object(
        'total_content', COALESCE(v_total_content, 0),
        'completed_content', COALESCE(v_completed_content, 0),
        'progress_percent', COALESCE(ROUND(v_total_progress, 2), 0),
        'total_time_minutes', COALESCE(v_total_time_segments, 0),
        'time_watched_seconds', COALESCE(v_total_time_watched, 0),
        'time_watched_minutes', COALESCE(ROUND(v_total_time_watched / 60.0, 2), 0)
    );
    
    -- Log final para debug
    RAISE NOTICE '[_calculate_training_progress_internal] Resultado final: total_content=%, completed_content=%, progress_percent=%', 
        v_total_content, v_completed_content, v_total_progress;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "rh"."_calculate_training_progress_internal"("p_training_id" "uuid", "p_employee_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."adjust_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_description" "text", "p_created_by" "uuid" DEFAULT NULL::"uuid", "p_transaction_date" "date" DEFAULT CURRENT_DATE) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "rh"."adjust_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_description" "text", "p_created_by" "uuid", "p_transaction_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."adjust_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_description" "text", "p_created_by" "uuid", "p_transaction_date" "date") IS 'Realiza ajustes manuais no banco de horas permitindo definir a data da transação';



CREATE OR REPLACE FUNCTION "rh"."aprovar_ferias"("p_vacation_id" "uuid", "p_aprovado_por" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  vacation_record RECORD;
  periodo RECORD;
  dias_gozados_calculados INTEGER := 0;
  dias_gozados_atuais INTEGER := 0;
  v_ano_aquisitivo INTEGER;
  v_profile_id UUID;
BEGIN
  -- Buscar dados da férias
  SELECT * INTO vacation_record
  FROM rh.vacations
  WHERE id = p_vacation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Férias não encontrada';
  END IF;
  
  IF vacation_record.status != 'pendente' THEN
    RAISE EXCEPTION 'Férias já foi processada';
  END IF;
  
  -- Determinar o período aquisitivo baseado na data de início das férias
  -- O período aquisitivo é aquele cuja data_inicio_periodo <= data_inicio das férias <= data_fim_periodo
  -- ou o mais próximo que contenha a data de início
  SELECT ve.ano_aquisitivo, ve.dias_gozados
  INTO v_ano_aquisitivo, dias_gozados_atuais
  FROM rh.vacation_entitlements ve
  WHERE ve.employee_id = vacation_record.employee_id
    AND ve.data_inicio_periodo <= vacation_record.data_inicio
    AND ve.data_fim_periodo >= vacation_record.data_inicio
    AND ve.status IN ('ativo', 'parcialmente_gozado')
  ORDER BY ve.ano_aquisitivo DESC
  LIMIT 1;
  
  -- Se não encontrou período que contenha a data, buscar o período mais recente que já iniciou
  IF v_ano_aquisitivo IS NULL THEN
    SELECT ve.ano_aquisitivo, ve.dias_gozados
    INTO v_ano_aquisitivo, dias_gozados_atuais
    FROM rh.vacation_entitlements ve
    WHERE ve.employee_id = vacation_record.employee_id
      AND ve.data_inicio_periodo <= vacation_record.data_inicio
      AND ve.status IN ('ativo', 'parcialmente_gozado')
    ORDER BY ve.ano_aquisitivo DESC
    LIMIT 1;
  END IF;
  
  -- Se ainda não encontrou, usar o período mais recente disponível
  IF v_ano_aquisitivo IS NULL THEN
    SELECT ve.ano_aquisitivo, ve.dias_gozados
    INTO v_ano_aquisitivo, dias_gozados_atuais
    FROM rh.vacation_entitlements ve
    WHERE ve.employee_id = vacation_record.employee_id
      AND ve.status IN ('ativo', 'parcialmente_gozado')
    ORDER BY ve.ano_aquisitivo DESC
    LIMIT 1;
  END IF;
  
  IF v_ano_aquisitivo IS NULL THEN
    RAISE EXCEPTION 'Período aquisitivo não encontrado para o funcionário';
  END IF;
  
  -- Garantir que dias_gozados_atuais não seja NULL
  IF dias_gozados_atuais IS NULL THEN
    dias_gozados_atuais := 0;
  END IF;
  
  -- Calcular total de dias gozados (somando dias de férias de todos os períodos)
  SELECT COALESCE(SUM(dias_ferias), 0) INTO dias_gozados_calculados
  FROM rh.vacation_periods
  WHERE vacation_id = p_vacation_id;
  
  -- Verificar se há dias suficientes disponíveis
  IF dias_gozados_calculados > (30 - dias_gozados_atuais) THEN
    RAISE EXCEPTION 'Dias solicitados (%) excedem os dias disponíveis (%)', 
      dias_gozados_calculados, (30 - dias_gozados_atuais);
  END IF;
  
  -- Verificar se o profile existe para o usuário
  -- Como a tabela profiles não referencia auth.users diretamente,
  -- vamos verificar se existe algum mapeamento ou criar um profile se necessário
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE id = p_aprovado_por
  LIMIT 1;
  
  -- Se não encontrou, tentar criar um profile básico
  IF v_profile_id IS NULL THEN
    BEGIN
      INSERT INTO public.profiles (id, nome, is_active)
      VALUES (p_aprovado_por, 'Usuário do Sistema', true)
      ON CONFLICT (id) DO NOTHING
      RETURNING id INTO v_profile_id;
    EXCEPTION WHEN OTHERS THEN
      -- Se falhar ao criar, usar o próprio UUID (assumindo que pode ser usado como ID)
      v_profile_id := p_aprovado_por;
    END;
  END IF;
  
  -- Atualizar status da férias
  UPDATE rh.vacations
  SET status = 'aprovado',
      aprovado_por = v_profile_id,
      aprovado_em = NOW()
  WHERE id = p_vacation_id;
  
  -- Atualizar entitlement (usando alias e variável renomeada para evitar ambiguidade)
  UPDATE rh.vacation_entitlements ve
  SET dias_gozados = dias_gozados_atuais + dias_gozados_calculados,
      status = CASE 
        WHEN (dias_gozados_atuais + dias_gozados_calculados) >= 30 THEN 'gozado'
        WHEN (dias_gozados_atuais + dias_gozados_calculados) > 0 THEN 'parcialmente_gozado'
        ELSE 'ativo'
      END,
      updated_at = NOW()
  WHERE ve.employee_id = vacation_record.employee_id
    AND ve.ano_aquisitivo = v_ano_aquisitivo
    AND ve.status IN ('ativo', 'parcialmente_gozado');
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "rh"."aprovar_ferias"("p_vacation_id" "uuid", "p_aprovado_por" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."aprovar_ferias"("p_vacation_id" "uuid", "p_aprovado_por" "uuid") IS 'Aprova férias e atualiza corretamente os dias gozados no período aquisitivo';



CREATE OR REPLACE FUNCTION "rh"."auto_mark_training_progress_completed"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Se o percentual chegou a 100% ou mais, marcar como concluído
    IF NEW.percentual_concluido >= 100 AND (OLD.percentual_concluido IS NULL OR OLD.percentual_concluido < 100) THEN
        NEW.concluido := true;
        NEW.status := 'concluido';
        IF NEW.data_conclusao IS NULL THEN
            NEW.data_conclusao := NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "rh"."auto_mark_training_progress_completed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."buscar_ferias_pendentes"("p_company_id" "uuid") RETURNS TABLE("id" "uuid", "employee_id" "uuid", "employee_nome" character varying, "data_inicio" "date", "data_fim" "date", "dias_solicitados" integer, "tipo" character varying, "observacoes" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$BEGIN RETURN QUERY SELECT v.id, v.employee_id, e.nome as employee_nome, v.data_inicio, v.data_fim, v.dias_solicitados, v.tipo, v.observacoes, v.created_at FROM rh.vacations v JOIN rh.employees e ON e.id = v.employee_id WHERE v.company_id = p_company_id AND v.status = 'pendente' ORDER BY v.created_at DESC; END;$$;


ALTER FUNCTION "rh"."buscar_ferias_pendentes"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."calcular_dias_ferias_disponiveis"("p_employee_id" "uuid", "p_ano" integer) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$DECLARE dias_disponiveis INTEGER; BEGIN SELECT dias_restantes INTO dias_disponiveis FROM rh.vacation_entitlements WHERE employee_id = p_employee_id AND ano_aquisitivo = p_ano AND status IN ('ativo', 'parcialmente_gozado'); RETURN COALESCE(dias_disponiveis, 0); END;$$;


ALTER FUNCTION "rh"."calcular_dias_ferias_disponiveis"("p_employee_id" "uuid", "p_ano" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."calcular_e_criar_periodos_aquisitivos"("p_employee_id" "uuid", "p_company_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  employee_record RECORD;
  data_admissao DATE;
  data_atual DATE := CURRENT_DATE;
  periodo_count INTEGER := 0;
  periodo_numero INTEGER := 0;
  data_inicio_periodo DATE;
  data_fim_periodo DATE;
  data_vencimento DATE;
  v_ano_aquisitivo INTEGER;
  status_periodo VARCHAR(20);
  dias_disponiveis INTEGER := 30;
BEGIN
  -- Buscar dados do funcionário
  SELECT e.id, e.data_admissao, e.company_id
  INTO employee_record
  FROM rh.employees e
  WHERE e.id = p_employee_id AND e.company_id = p_company_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Funcionário não encontrado';
  END IF;
  
  IF employee_record.data_admissao IS NULL THEN
    RAISE EXCEPTION 'Funcionário não possui data de admissão cadastrada';
  END IF;
  
  data_admissao := employee_record.data_admissao;
  
  -- Calcular períodos aquisitivos baseados na data de admissão
  -- Cada período aquisitivo tem 12 meses
  -- O primeiro período começa na data de admissão
  -- Períodos subsequentes começam 12 meses após o anterior
  
  data_inicio_periodo := data_admissao;
  
  -- Criar períodos apenas até o período que já começou
  -- IMPORTANTE: Só criar períodos que já iniciaram (data_inicio_periodo <= CURRENT_DATE)
  -- Não criar períodos futuros que ainda não começaram
  WHILE data_inicio_periodo <= data_atual
  LOOP
    periodo_numero := periodo_numero + 1;
    
    -- Calcular fim do período (12 meses após o início)
    data_fim_periodo := data_inicio_periodo + INTERVAL '12 months' - INTERVAL '1 day';
    
    -- Data de vencimento: 12 meses após o fim do período aquisitivo
    data_vencimento := data_fim_periodo + INTERVAL '12 months';
    
    -- Ano aquisitivo: ano do início do período
    v_ano_aquisitivo := EXTRACT(YEAR FROM data_inicio_periodo);
    
    -- Verificar se o período já existe
    IF NOT EXISTS (
      SELECT 1 FROM rh.vacation_entitlements
      WHERE employee_id = p_employee_id
        AND ano_aquisitivo = v_ano_aquisitivo
    ) THEN
      -- Determinar status do período
      IF data_vencimento < data_atual THEN
        -- Período vencido
        status_periodo := 'vencido';
      ELSIF data_fim_periodo < data_atual THEN
        -- Período completado (12 meses já passaram), mas ainda não vencido
        status_periodo := 'ativo';
      ELSE
        -- Período ainda em andamento (menos de 12 meses, mas já começou)
        status_periodo := 'pendente';
      END IF;
      
      -- Criar período aquisitivo
      INSERT INTO rh.vacation_entitlements (
        employee_id,
        company_id,
        ano_aquisitivo,
        data_inicio_periodo,
        data_fim_periodo,
        data_vencimento,
        dias_disponiveis,
        dias_gozados,
        status,
        created_at,
        updated_at
      ) VALUES (
        p_employee_id,
        p_company_id,
        v_ano_aquisitivo,
        data_inicio_periodo,
        data_fim_periodo,
        data_vencimento,
        dias_disponiveis,
        0,
        status_periodo,
        NOW(),
        NOW()
      );
      
      periodo_count := periodo_count + 1;
    END IF;
    
    -- Próximo período começa 12 meses após o início do período atual
    data_inicio_periodo := data_inicio_periodo + INTERVAL '12 months';
  END LOOP;
  
  RETURN periodo_count;
END;
$$;


ALTER FUNCTION "rh"."calcular_e_criar_periodos_aquisitivos"("p_employee_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."calcular_e_criar_periodos_aquisitivos"("p_employee_id" "uuid", "p_company_id" "uuid") IS 'Calcula e cria automaticamente períodos aquisitivos baseados na data de admissão. Cria apenas períodos que já começaram (data_inicio_periodo <= CURRENT_DATE).';



CREATE OR REPLACE FUNCTION "rh"."calculate_and_accumulate_bank_hours"("p_employee_id" "uuid", "p_company_id" "uuid", "p_period_start" "date", "p_period_end" "date") RETURNS TABLE("hours_accumulated" numeric, "hours_compensated" numeric, "new_balance" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_config rh.bank_hours_config%ROWTYPE;
  v_assignment rh.bank_hours_assignments%ROWTYPE;
  v_bank_hours_type rh.bank_hours_types%ROWTYPE;
  v_balance rh.bank_hours_balance%ROWTYPE;
  v_total_extra_hours DECIMAL(5,2) := 0;
  v_total_negative_hours DECIMAL(5,2) := 0;
  v_hours_to_accumulate DECIMAL(5,2) := 0;
  v_hours_to_compensate DECIMAL(5,2) := 0;
  v_new_balance DECIMAL(6,2) := 0;
  v_existing_transaction_count INTEGER := 0;
  v_last_calculation_date DATE;
  v_has_bank_hours BOOLEAN := false;
  v_max_accumulation DECIMAL(5,2) := 0;
  v_compensation_rate DECIMAL(4,2) := 1.0;
  v_auto_compensate BOOLEAN := false;
BEGIN
  -- Primeiro, tentar buscar configuração do sistema novo (bank_hours_assignments)
  SELECT bha.* INTO v_assignment
  FROM rh.bank_hours_assignments bha
  INNER JOIN rh.bank_hours_types bht ON bht.id = bha.bank_hours_type_id
  WHERE bha.employee_id = p_employee_id 
    AND bha.company_id = p_company_id 
    AND bha.is_active = true
    AND bht.is_active = true
    AND bht.has_bank_hours = true
  LIMIT 1;

  -- Se encontrou assignment, buscar o tipo
  IF FOUND THEN
    SELECT * INTO v_bank_hours_type
    FROM rh.bank_hours_types
    WHERE id = v_assignment.bank_hours_type_id
      AND is_active = true
      AND has_bank_hours = true;
  END IF;

  -- Se encontrou no sistema novo, usar essas configurações
  IF FOUND THEN
    v_has_bank_hours := true;
    v_max_accumulation := COALESCE(v_bank_hours_type.max_accumulation_hours, 999.50);
    v_compensation_rate := COALESCE(v_bank_hours_type.compensation_rate, 1.0);
    v_auto_compensate := COALESCE(v_bank_hours_type.auto_compensate, false);
  ELSE
    -- Se não encontrou, tentar sistema antigo (bank_hours_config)
    SELECT * INTO v_config 
    FROM rh.bank_hours_config 
    WHERE employee_id = p_employee_id 
      AND company_id = p_company_id 
      AND is_active = true
      AND has_bank_hours = true
    LIMIT 1;

    IF FOUND THEN
      v_has_bank_hours := true;
      v_max_accumulation := COALESCE(v_config.max_accumulation_hours, 40.00);
      v_compensation_rate := COALESCE(v_config.compensation_rate, 1.0);
      v_auto_compensate := COALESCE(v_config.auto_compensate, false);
    END IF;
  END IF;

  -- Se não tem banco de horas configurado, retornar zeros
  IF NOT v_has_bank_hours THEN
    RETURN QUERY SELECT 0.00, 0.00, 0.00;
    RETURN;
  END IF;

  -- Buscar saldo atual (ou criar se não existir)
  SELECT * INTO v_balance 
  FROM rh.bank_hours_balance 
  WHERE employee_id = p_employee_id 
    AND company_id = p_company_id;

  -- Se não existe saldo, criar registro inicial
  IF NOT FOUND THEN
    INSERT INTO rh.bank_hours_balance (
      employee_id,
      company_id,
      current_balance,
      accumulated_hours,
      compensated_hours,
      expired_hours,
      last_calculation_date
    ) VALUES (
      p_employee_id,
      p_company_id,
      0.00,
      0.00,
      0.00,
      0.00,
      p_period_start
    )
    RETURNING * INTO v_balance;
  END IF;

  -- IMPORTANTE: Verificar se há transações automáticas que se sobrepõem com este período
  -- Se houver sobreposição, não recalcular para evitar duplicação
  SELECT COUNT(*) INTO v_existing_transaction_count
  FROM rh.bank_hours_transactions
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id
    AND is_automatic = true
    AND (
      -- Período exato
      (reference_period_start = p_period_start AND reference_period_end = p_period_end)
      OR
      -- Período que se sobrepõe (início ou fim dentro do período calculado)
      (reference_period_start >= p_period_start AND reference_period_start <= p_period_end)
      OR
      (reference_period_end >= p_period_start AND reference_period_end <= p_period_end)
      OR
      -- Período que contém o período calculado
      (reference_period_start <= p_period_start AND reference_period_end >= p_period_end)
    )
    AND transaction_type IN ('accumulation', 'compensation', 'adjustment');

  -- Se há transações sobrepostas, deletar apenas as do período EXATO e recalcular
  -- Se não há período exato mas há sobreposição, não recalcular (retornar saldo atual)
  IF v_existing_transaction_count > 0 THEN
    -- Verificar se há período exato
    SELECT COUNT(*) INTO v_existing_transaction_count
    FROM rh.bank_hours_transactions
    WHERE employee_id = p_employee_id
      AND company_id = p_company_id
      AND is_automatic = true
      AND reference_period_start = p_period_start
      AND reference_period_end = p_period_end
      AND transaction_type IN ('accumulation', 'compensation', 'adjustment');
    
    -- Se há período exato, deletar e recalcular
    IF v_existing_transaction_count > 0 THEN
      DELETE FROM rh.bank_hours_transactions
      WHERE employee_id = p_employee_id
        AND company_id = p_company_id
        AND is_automatic = true
        AND reference_period_start = p_period_start
        AND reference_period_end = p_period_end
        AND transaction_type IN ('accumulation', 'compensation', 'adjustment');
      
      -- Recalcular saldo baseado nas transações restantes
      SELECT COALESCE(SUM(hours_amount), 0) INTO v_new_balance
      FROM rh.bank_hours_transactions
      WHERE employee_id = p_employee_id
        AND company_id = p_company_id;
      
      -- Atualizar saldo temporariamente antes de recalcular
      UPDATE rh.bank_hours_balance SET
        current_balance = v_new_balance,
        last_calculation_date = p_period_start - INTERVAL '1 day'
      WHERE employee_id = p_employee_id 
        AND company_id = p_company_id;
      
      -- Buscar saldo atualizado
      SELECT * INTO v_balance 
      FROM rh.bank_hours_balance 
      WHERE employee_id = p_employee_id 
        AND company_id = p_company_id;
    ELSE
      -- Há sobreposição mas não é período exato - não recalcular para evitar duplicação
      v_new_balance := COALESCE(v_balance.current_balance, 0);
      RETURN QUERY SELECT 0.00, 0.00, v_new_balance;
      RETURN;
    END IF;
  END IF;

  -- Saldo inicial para cálculo
  v_new_balance := COALESCE(v_balance.current_balance, 0);

  -- Calcular total de horas extras 50% (apenas 50%, excluir 100%) e horas negativas no período
  -- IMPORTANTE: Considerar apenas horas_extras_50, não horas_extras genérico
  -- Usar horas_extras como fallback apenas se não houver horas_extras_100
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN COALESCE(horas_extras_50, 0) > 0 THEN horas_extras_50
        WHEN COALESCE(horas_extras_50, 0) = 0 THEN
          CASE 
            WHEN COALESCE(horas_extras, 0) > 0 AND COALESCE(horas_extras_100, 0) = 0 THEN horas_extras
            ELSE 0
          END
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(COALESCE(horas_negativas, 0)), 0)
  INTO v_total_extra_hours, v_total_negative_hours
  FROM rh.time_records 
  WHERE employee_id = p_employee_id 
    AND company_id = p_company_id
    AND data_registro BETWEEN p_period_start AND p_period_end
    AND status = 'aprovado'; -- Apenas registros aprovados

  -- Processar horas negativas primeiro (débitos)
  IF v_total_negative_hours > 0 THEN
    -- Descontar horas negativas do saldo
    v_new_balance := v_new_balance - v_total_negative_hours;
    
    -- Criar transação de débito (horas negativas)
    INSERT INTO rh.bank_hours_transactions (
      employee_id, company_id, transaction_type, transaction_date,
      hours_amount, reference_period_start, reference_period_end,
      description, is_automatic
    ) VALUES (
      p_employee_id, p_company_id, 'adjustment', p_period_end,
      -v_total_negative_hours, p_period_start, p_period_end,
      'Horas negativas do período ' || p_period_start::text || ' a ' || p_period_end::text, true
    );
  END IF;

  -- Depois, processar horas extras positivas
  IF v_total_extra_hours > 0 THEN
    -- Determinar quanto acumular e quanto compensar
    IF v_auto_compensate AND v_new_balance > 0 THEN
      -- Compensar horas existentes primeiro
      v_hours_to_compensate := LEAST(v_total_extra_hours, v_new_balance);
      v_hours_to_accumulate := v_total_extra_hours - v_hours_to_compensate;
    ELSE
      -- Apenas acumular
      v_hours_to_accumulate := v_total_extra_hours;
    END IF;

    -- Verificar limite máximo de acumulação
    IF v_hours_to_accumulate > 0 THEN
      v_hours_to_accumulate := LEAST(
        v_hours_to_accumulate, 
        GREATEST(0, v_max_accumulation - COALESCE(v_balance.accumulated_hours, 0))
      );
    END IF;

    -- Transação de compensação
    IF v_hours_to_compensate > 0 THEN
      INSERT INTO rh.bank_hours_transactions (
        employee_id, company_id, transaction_type, transaction_date,
        hours_amount, reference_period_start, reference_period_end,
        description, is_automatic
      ) VALUES (
        p_employee_id, p_company_id, 'compensation', p_period_end,
        -v_hours_to_compensate, p_period_start, p_period_end,
        'Compensação automática de horas', true
      );
    END IF;

    -- Transação de acumulação
    IF v_hours_to_accumulate > 0 THEN
      INSERT INTO rh.bank_hours_transactions (
        employee_id, company_id, transaction_type, transaction_date,
        hours_amount, reference_period_start, reference_period_end,
        description, is_automatic
      ) VALUES (
        p_employee_id, p_company_id, 'accumulation', p_period_end,
        v_hours_to_accumulate, p_period_start, p_period_end,
        'Acumulação de horas extras 50%', true
      );
    END IF;
  END IF;

  -- Atualizar saldo final
  v_new_balance := v_new_balance + v_hours_to_accumulate - v_hours_to_compensate;

  -- Atualizar registro de saldo
  UPDATE rh.bank_hours_balance SET
    current_balance = v_new_balance,
    accumulated_hours = COALESCE(v_balance.accumulated_hours, 0) + v_hours_to_accumulate,
    compensated_hours = COALESCE(v_balance.compensated_hours, 0) + v_hours_to_compensate,
    last_calculation_date = p_period_end,
    updated_at = NOW()
  WHERE employee_id = p_employee_id 
    AND company_id = p_company_id;

  RETURN QUERY SELECT v_hours_to_accumulate, v_hours_to_compensate, v_new_balance;
END;
$$;


ALTER FUNCTION "rh"."calculate_and_accumulate_bank_hours"("p_employee_id" "uuid", "p_company_id" "uuid", "p_period_start" "date", "p_period_end" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."calculate_and_accumulate_bank_hours"("p_employee_id" "uuid", "p_company_id" "uuid", "p_period_start" "date", "p_period_end" "date") IS 'Calcula e acumula horas no banco de horas para um período.
   Suporta sistema novo (bank_hours_assignments) e antigo (bank_hours_config).
   Considera apenas horas_extras_50 (exclui horas_extras_100 que são pagas diretamente).
   
   IMPORTANTE: Filtra por data_registro (data base do registro).
   Registros que cruzam meia-noite têm data_registro = data da entrada.
   Isso garante que registros que começam no período sejam incluídos,
   mesmo que terminem no período seguinte.';



CREATE OR REPLACE FUNCTION "rh"."calculate_coparticipation"("p_medical_service_usage_id" "uuid", "p_company_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_plan_id UUID;
    v_tem_coparticipacao BOOLEAN;
    v_percentual DECIMAL(5,2);
    v_valor_min DECIMAL(10,2);
    v_valor_max DECIMAL(10,2);
    v_valor_total DECIMAL(10,2);
    v_coparticipacao DECIMAL(10,2);
BEGIN
    -- Buscar dados do serviço e do plano
    SELECT 
        emp.plan_id,
        mp.tem_coparticipacao,
        mp.percentual_coparticipacao,
        mp.valor_minimo_coparticipacao,
        mp.valor_maximo_coparticipacao,
        msu.valor_total
    INTO 
        v_plan_id,
        v_tem_coparticipacao,
        v_percentual,
        v_valor_min,
        v_valor_max,
        v_valor_total
    FROM rh.medical_services_usage msu
    JOIN rh.employee_medical_plans emp ON emp.id = msu.employee_plan_id
    JOIN rh.medical_plans mp ON mp.id = emp.plan_id
    WHERE msu.id = p_medical_service_usage_id
      AND msu.company_id = p_company_id;
    
    -- Se não tem coparticipação, retorna 0
    IF NOT v_tem_coparticipacao OR v_percentual IS NULL OR v_percentual = 0 THEN
        RETURN 0;
    END IF;
    
    -- Calcular coparticipação (percentual do valor total)
    v_coparticipacao := (v_valor_total * v_percentual / 100);
    
    -- Aplicar valor mínimo
    IF v_valor_min > 0 AND v_coparticipacao < v_valor_min THEN
        v_coparticipacao := v_valor_min;
    END IF;
    
    -- Aplicar valor máximo (se definido)
    IF v_valor_max IS NOT NULL AND v_valor_max > 0 AND v_coparticipacao > v_valor_max THEN
        v_coparticipacao := v_valor_max;
    END IF;
    
    RETURN v_coparticipacao;
END;
$$;


ALTER FUNCTION "rh"."calculate_coparticipation"("p_medical_service_usage_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."calculate_coparticipation"("p_medical_service_usage_id" "uuid", "p_company_id" "uuid") IS 'Calcula o valor de coparticipação para uma utilização de serviço médico';



CREATE OR REPLACE FUNCTION "rh"."calculate_missing_time_records_debit"("p_employee_id" "uuid", "p_company_id" "uuid", "p_period_start" "date", "p_period_end" "date") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_work_shift_id UUID;
  v_horas_diarias DECIMAL(4,2);
  v_dias_semana INTEGER[];
  v_shift_start_date DATE;
  v_shift_end_date DATE;
  v_current_date DATE;
  v_day_of_week INTEGER;
  v_total_debit DECIMAL(6,2) := 0;
  v_has_record BOOLEAN;
  v_is_holiday BOOLEAN;
BEGIN
  -- Buscar turno ativo do funcion??rio no per??odo
  SELECT es.turno_id, ws.horas_diarias, ws.dias_semana, es.data_inicio, es.data_fim
  INTO v_work_shift_id, v_horas_diarias, v_dias_semana, v_shift_start_date, v_shift_end_date
  FROM rh.employee_shifts es
  INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
  WHERE es.funcionario_id = p_employee_id
    AND es.company_id = p_company_id
    AND es.ativo = true
    AND es.data_inicio <= p_period_end
    AND (es.data_fim IS NULL OR es.data_fim >= p_period_start)
  ORDER BY es.data_inicio DESC
  LIMIT 1;

  -- Se n??o encontrar turno, retornar 0 (sem d??bito)
  IF v_work_shift_id IS NULL OR v_horas_diarias IS NULL THEN
    RETURN 0;
  END IF;

  -- Se dias_semana est?? vazio ou NULL, usar padr??o Segunda-Sexta
  IF v_dias_semana IS NULL OR array_length(v_dias_semana, 1) = 0 THEN
    v_dias_semana := ARRAY[1, 2, 3, 4, 5]; -- Segunda a Sexta
  END IF;

  -- Ajustar per??odo baseado no turno do funcion??rio
  IF v_shift_start_date > p_period_start THEN
    v_shift_start_date := v_shift_start_date;
  ELSE
    v_shift_start_date := p_period_start;
  END IF;

  IF v_shift_end_date IS NOT NULL AND v_shift_end_date < p_period_end THEN
    v_shift_end_date := v_shift_end_date;
  ELSE
    v_shift_end_date := p_period_end;
  END IF;

  -- Iterar por cada dia do per??odo
  v_current_date := v_shift_start_date;
  
  WHILE v_current_date <= v_shift_end_date LOOP
    -- Obter dia da semana (1=Segunda, 2=Ter??a, ..., 7=Domingo)
    -- PostgreSQL: EXTRACT(DOW FROM date) retorna 0=Domingo, 1=Segunda, ..., 6=S??bado
    -- Precisamos converter: 0->7, 1->1, 2->2, ..., 6->6
    v_day_of_week := CASE 
      WHEN EXTRACT(DOW FROM v_current_date) = 0 THEN 7 -- Domingo
      ELSE EXTRACT(DOW FROM v_current_date)::INTEGER
    END;

    -- Verificar se este dia deveria ter registro (est?? em dias_semana do turno)
    IF v_day_of_week = ANY(v_dias_semana) THEN
      -- Verificar se ?? feriado
      v_is_holiday := rh.is_holiday(v_current_date, p_company_id);
      
      -- Se n??o ?? feriado, verificar se h?? registro de ponto
      IF NOT v_is_holiday THEN
        -- Verificar se existe registro de ponto para este dia
        SELECT EXISTS (
          SELECT 1 
          FROM rh.time_records 
          WHERE employee_id = p_employee_id
            AND company_id = p_company_id
            AND data_registro = v_current_date
        ) INTO v_has_record;

        -- Se n??o h?? registro, adicionar d??bito
        IF NOT v_has_record THEN
          v_total_debit := v_total_debit + v_horas_diarias;
        END IF;
      END IF;
    END IF;

    -- Pr??ximo dia
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;

  RETURN v_total_debit;
END;
$$;


ALTER FUNCTION "rh"."calculate_missing_time_records_debit"("p_employee_id" "uuid", "p_company_id" "uuid", "p_period_start" "date", "p_period_end" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."calculate_missing_time_records_debit"("p_employee_id" "uuid", "p_company_id" "uuid", "p_period_start" "date", "p_period_end" "date") IS 'Calcula d??bito de horas para dias que deveriam ter registro de ponto mas n??o t??m.
   Considera o turno do funcion??rio (dias_semana e horas_diarias) e exclui feriados.';



CREATE OR REPLACE FUNCTION "rh"."calculate_night_hours"("p_entrada" time without time zone, "p_saida" time without time zone, "p_data_registro" "date", "p_entrada_date" "date" DEFAULT NULL::"date", "p_saida_date" "date" DEFAULT NULL::"date") RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
  v_horas_noturnas DECIMAL(4,2) := 0;
  v_entrada_timestamp TIMESTAMP;
  v_saida_timestamp TIMESTAMP;
  v_periodo_noturno_inicio TIME := '22:00:00';
  v_periodo_noturno_fim TIME := '05:00:00';
  v_inicio_noturno TIMESTAMP;
  v_fim_noturno TIMESTAMP;
  v_intersecao_inicio TIMESTAMP;
  v_intersecao_fim TIMESTAMP;
  v_entrada_date_use DATE;
  v_saida_date_use DATE;
BEGIN
  -- Se não tem entrada ou saída, retornar 0
  IF p_entrada IS NULL OR p_saida IS NULL THEN
    RETURN 0;
  END IF;

  -- =====================================================
  -- Determinar datas a usar (prioridade: parâmetros explícitos > detecção > data_registro)
  -- =====================================================
  IF p_entrada_date IS NOT NULL THEN
    -- Usar data explícita fornecida
    v_entrada_date_use := p_entrada_date;
  ELSE
    -- Usar data_registro como fallback
    v_entrada_date_use := p_data_registro;
  END IF;

  IF p_saida_date IS NOT NULL THEN
    -- Usar data explícita fornecida
    v_saida_date_use := p_saida_date;
  ELSIF p_saida < p_entrada THEN
    -- Fallback: Se saída é antes da entrada em termos de TIME, assumir dia seguinte
    v_saida_date_use := p_data_registro + INTERVAL '1 day';
  ELSE
    -- Usar data_registro como fallback
    v_saida_date_use := p_data_registro;
  END IF;

  -- Criar timestamps completos usando as datas determinadas
  v_entrada_timestamp := (v_entrada_date_use + p_entrada)::TIMESTAMP;
  v_saida_timestamp := (v_saida_date_use + p_saida)::TIMESTAMP;

  -- Período noturno: 22h do dia da entrada até 5h do dia seguinte
  -- Usar a data da entrada como referência para o período noturno
  v_inicio_noturno := (v_entrada_date_use + v_periodo_noturno_inicio)::TIMESTAMP;
  v_fim_noturno := ((v_entrada_date_use + INTERVAL '1 day') + v_periodo_noturno_fim)::TIMESTAMP;

  -- Calcular interseção entre período trabalhado e período noturno
  v_intersecao_inicio := GREATEST(v_entrada_timestamp, v_inicio_noturno);
  v_intersecao_fim := LEAST(v_saida_timestamp, v_fim_noturno);

  -- Se há interseção, calcular horas
  IF v_intersecao_inicio < v_intersecao_fim THEN
    v_horas_noturnas := ROUND(
      EXTRACT(EPOCH FROM (v_intersecao_fim - v_intersecao_inicio)) / 3600,
      2
    );
  END IF;

  RETURN GREATEST(0, v_horas_noturnas);
END;
$$;


ALTER FUNCTION "rh"."calculate_night_hours"("p_entrada" time without time zone, "p_saida" time without time zone, "p_data_registro" "date", "p_entrada_date" "date", "p_saida_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."calculate_night_hours"("p_entrada" time without time zone, "p_saida" time without time zone, "p_data_registro" "date", "p_entrada_date" "date", "p_saida_date" "date") IS 'Calcula horas trabalhadas no período noturno (22h às 5h do dia seguinte).
Agora aceita parâmetros opcionais p_entrada_date e p_saida_date para cálculos precisos
quando registros cruzam meia-noite. Se não fornecidos, usa lógica de detecção automática.';



CREATE OR REPLACE FUNCTION "rh"."calculate_overtime_by_scale"("p_time_record_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_employee_id UUID;
  v_company_id UUID;
  v_date DATE;
  v_horas_trabalhadas DECIMAL(4,2);
  v_horas_diarias DECIMAL(4,2);
  v_tipo_escala VARCHAR(50);
  v_is_feriado BOOLEAN;
  v_is_domingo BOOLEAN;
  v_is_dia_folga BOOLEAN;
  v_horas_extras_50 DECIMAL(4,2) := 0;
  v_horas_extras_100 DECIMAL(4,2) := 0;
  v_horas_para_banco DECIMAL(4,2) := 0;
  v_horas_para_pagamento DECIMAL(4,2) := 0;
  v_horas_negativas DECIMAL(4,2) := 0;
  v_horas_noturnas DECIMAL(4,2) := 0;
  v_excedente DECIMAL(4,2);
  v_work_shift_id UUID;
  v_day_of_week INTEGER;
  v_day_hours JSONB;
  v_entrada TIME;
  v_saida TIME;
  v_entrada_almoco TIME;
  v_saida_almoco TIME;
  v_tem_todas_marcacoes BOOLEAN := false;
  v_debug_info TEXT;
  -- NOVO: Variáveis para campos *_date
  v_entrada_date DATE;
  v_saida_date DATE;
  v_timezone text := 'America/Sao_Paulo';
BEGIN
  -- Buscar dados do registro
  SELECT 
    tr.employee_id,
    tr.company_id,
    tr.data_registro,
    tr.horas_trabalhadas,
    tr.entrada,
    tr.saida,
    tr.entrada_almoco,
    tr.saida_almoco
  INTO 
    v_employee_id,
    v_company_id,
    v_date,
    v_horas_trabalhadas,
    v_entrada,
    v_saida,
    v_entrada_almoco,
    v_saida_almoco
  FROM rh.time_records tr
  WHERE tr.id = p_time_record_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- VALIDAÇÃO CRÍTICA: Verificar se tem todas as marcações principais
  v_tem_todas_marcacoes := (v_entrada IS NOT NULL AND v_saida IS NOT NULL);

  -- Calcular dia da semana (1=Segunda, 7=Domingo)
  v_day_of_week := CASE 
    WHEN EXTRACT(DOW FROM v_date) = 0 THEN 7
    ELSE EXTRACT(DOW FROM v_date)::INTEGER
  END;

  -- CORREÇÃO CRÍTICA: Buscar turno primeiro via employee_shifts (permite histórico)
  -- Se não encontrar, buscar via employees.work_shift_id (turno direto)
  -- IMPORTANTE: Garantir que v_horas_diarias nunca seja NULL se há turno válido
  SELECT 
    rh.get_employee_work_shift_type(v_employee_id, v_company_id, v_date),
    es.turno_id,
    ws.horas_diarias
  INTO 
    v_tipo_escala,
    v_work_shift_id,
    v_horas_diarias
  FROM rh.employee_shifts es
  INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
  WHERE es.funcionario_id = v_employee_id
    AND es.company_id = v_company_id
    AND es.ativo = true
    AND es.data_inicio <= v_date
    AND (es.data_fim IS NULL OR es.data_fim >= v_date)
  ORDER BY es.data_inicio DESC
  LIMIT 1;

  -- CORREÇÃO: Se não encontrou via employee_shifts, buscar via employees.work_shift_id
  IF v_work_shift_id IS NULL OR v_horas_diarias IS NULL THEN
    SELECT 
      rh.get_employee_work_shift_type(v_employee_id, v_company_id, v_date),
      e.work_shift_id,
      ws.horas_diarias
    INTO 
      v_tipo_escala,
      v_work_shift_id,
      v_horas_diarias
    FROM rh.employees e
    LEFT JOIN rh.work_shifts ws ON ws.id = e.work_shift_id
    WHERE e.id = v_employee_id
      AND e.company_id = v_company_id;
  END IF;

  -- Se encontrou turno, verificar se tem horarios_por_dia para o dia específico
  IF v_work_shift_id IS NOT NULL THEN
    v_day_hours := rh.get_work_shift_hours_for_day(v_work_shift_id, v_day_of_week);
    
    -- Se tem horário específico para o dia, usar horas_diarias do JSONB
    IF v_day_hours IS NOT NULL AND v_day_hours ? 'horas_diarias' THEN
      v_horas_diarias := COALESCE((v_day_hours->>'horas_diarias')::NUMERIC, v_horas_diarias);
    END IF;
  END IF;

  -- CORREÇÃO CRÍTICA: Se ainda não encontrou horas_diarias, tentar buscar do turno diretamente
  -- Isso garante que nunca use 8.0h como padrão se há um turno válido
  IF v_horas_diarias IS NULL AND v_work_shift_id IS NOT NULL THEN
    SELECT horas_diarias
    INTO v_horas_diarias
    FROM rh.work_shifts
    WHERE id = v_work_shift_id;
  END IF;

  -- Se não encontrou turno, usar padrão (último recurso)
  IF v_horas_diarias IS NULL THEN
    v_horas_diarias := 8.0;
    -- Log para debug (pode ser removido em produção)
    v_debug_info := format('AVISO: Usando padrão 8.0h para funcionário %s em %s (turno não encontrado)', 
                          v_employee_id, v_date);
    RAISE WARNING '%', v_debug_info;
  END IF;
  
  IF v_tipo_escala IS NULL THEN
    v_tipo_escala := 'fixa';
  END IF;

  -- Verificar se é feriado, domingo ou dia de folga
  -- CORREÇÃO: Garantir que is_feriado seja atualizado corretamente
  v_is_feriado := rh.is_holiday(v_date, v_company_id);
  v_is_domingo := rh.is_sunday(v_date);
  v_is_dia_folga := rh.is_rest_day(v_employee_id, v_company_id, v_date);

  -- =====================================================
  -- CORREÇÃO: Calcular horas noturnas usando datas quando disponíveis
  -- =====================================================
  -- Buscar datas dos eventos de time_record_events
  SELECT 
    (MIN(CASE WHEN event_type = 'entrada' THEN event_at END) AT TIME ZONE v_timezone)::date,
    (MAX(CASE WHEN event_type = 'saida' THEN event_at END) AT TIME ZONE v_timezone)::date
  INTO 
    v_entrada_date,
    v_saida_date
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id;
  
  -- Se não encontrou eventos, usar data_registro como fallback
  IF v_entrada_date IS NULL THEN
    v_entrada_date := v_date;
  END IF;
  IF v_saida_date IS NULL THEN
    v_saida_date := v_date;
  END IF;

  v_horas_noturnas := rh.calculate_night_hours(
    v_entrada, 
    v_saida, 
    v_date,
    v_entrada_date,
    v_saida_date
  );

  -- Calcular excedente (pode ser positivo ou negativo)
  -- Se positivo = horas extras, se negativo = horas negativas
  v_excedente := v_horas_trabalhadas - v_horas_diarias;

  -- =====================================================
  -- CORREÇÃO CRÍTICA: LÓGICA DE FERIADOS
  -- =====================================================
  -- Em feriados, TODAS as horas trabalhadas devem ser consideradas como extras 100%,
  -- não apenas o excedente. Isso inclui o turno normal + horas extras.
  -- =====================================================
  
  IF v_is_feriado AND v_horas_trabalhadas > 0 THEN
    -- FERIADO: Todas as horas trabalhadas são extras 100%
    -- Não importa a escala, feriado sempre paga 100% de todas as horas
    v_horas_extras_100 := v_horas_trabalhadas;
    v_horas_para_pagamento := v_horas_trabalhadas;
    v_horas_extras_50 := 0;
    v_horas_para_banco := 0;
    v_horas_negativas := 0;
    
  ELSIF v_excedente > 0 THEN
    -- Trabalhou MAIS que o esperado: calcular horas extras
    -- Aplicar regras por tipo de escala (apenas se NÃO for feriado)
    IF v_tipo_escala = 'escala_12x36' THEN
      -- ESCALA 12x36: Só existe excedente se romper 12h
      IF v_horas_trabalhadas > 12 THEN
        v_excedente := v_horas_trabalhadas - 12;
        -- Horas extras normais vão para banco (50%)
        v_horas_extras_50 := v_excedente;
        v_horas_para_banco := v_excedente;
      END IF;
      
    ELSIF v_tipo_escala = 'flexivel_6x1' THEN
      -- ESCALA 6x1: Dia de folga = 100%
      IF v_is_dia_folga THEN
        v_horas_extras_100 := v_excedente;
        v_horas_para_pagamento := v_excedente;
      ELSE
        -- Horas extras normais vão para banco (50%)
        v_horas_extras_50 := v_excedente;
        v_horas_para_banco := v_excedente;
      END IF;
      
    ELSE
      -- ESCALA 5x2 (fixa) ou outras: Domingo = 100%
      IF v_is_domingo THEN
        v_horas_extras_100 := v_excedente;
        v_horas_para_pagamento := v_excedente;
      ELSE
        -- Sábado em escala 5x2: vai para banco (50%)
        -- Horas extras normais: vão para banco (50%)
        v_horas_extras_50 := v_excedente;
        v_horas_para_banco := v_excedente;
      END IF;
    END IF;
    -- Zerar horas negativas quando há horas extras
    v_horas_negativas := 0;
    
  ELSIF v_excedente < 0 THEN
    -- Trabalhou MENOS que o esperado
    -- CORREÇÃO: Só calcular horas negativas se tem todas as marcações
    -- Se não tem todas as marcações, é falta não registrada (não horas negativas)
    IF v_tem_todas_marcacoes THEN
      -- Tem todas as marcações e trabalhou menos: calcular horas negativas
      v_horas_negativas := ROUND(ABS(v_excedente), 2);
    ELSE
      -- Não tem todas as marcações: não calcular horas negativas
      -- (será tratado como falta não registrada)
      v_horas_negativas := 0;
    END IF;
    -- Zerar horas extras quando há horas negativas
    v_horas_extras_50 := 0;
    v_horas_extras_100 := 0;
    v_horas_para_banco := 0;
    v_horas_para_pagamento := 0;
    
  ELSE
    -- Exatamente igual ao esperado
    v_horas_extras_50 := 0;
    v_horas_extras_100 := 0;
    v_horas_para_banco := 0;
    v_horas_para_pagamento := 0;
    v_horas_negativas := 0;
  END IF;

  -- Atualizar registro
  -- horas_extras é a soma de horas_extras_50 + horas_extras_100 (para compatibilidade)
  UPDATE rh.time_records
  SET 
    horas_extras_50 = ROUND(v_horas_extras_50, 2),
    horas_extras_100 = ROUND(v_horas_extras_100, 2),
    horas_extras = ROUND(v_horas_extras_50 + v_horas_extras_100, 2),
    horas_para_banco = ROUND(v_horas_para_banco, 2),
    horas_para_pagamento = ROUND(v_horas_para_pagamento, 2),
    horas_negativas = ROUND(v_horas_negativas, 2),
    horas_noturnas = ROUND(v_horas_noturnas, 2),
    is_feriado = v_is_feriado,
    is_domingo = v_is_domingo,
    is_dia_folga = v_is_dia_folga
  WHERE id = p_time_record_id;

END;
$$;


ALTER FUNCTION "rh"."calculate_overtime_by_scale"("p_time_record_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."calculate_overtime_by_scale"("p_time_record_id" "uuid") IS 'Calcula horas extras conforme tipo de escala e regras CLT.
   CORREÇÃO: Em feriados, TODAS as horas trabalhadas são consideradas como extras 100%,
   não apenas o excedente. Isso inclui o turno normal + horas extras.
   Todas as escalas consideram feriados para extras 100%.
   Garante que sempre use horas_diarias corretas do turno (nunca usa 8.0h como padrão se há turno válido).
   Separa horas 50% (banco) de horas 100% (pagamento direto).
   Considera horarios_por_dia para obter horas diárias corretas por dia da semana.
   Calcula horas negativas quando trabalhou menos que o esperado E tem todas as marcações.
   Calcula horas noturnas (22h às 5h) usando datas reais quando disponíveis.';



CREATE OR REPLACE FUNCTION "rh"."calculate_training_progress"("p_training_id" "uuid", "p_employee_id" "uuid", "p_company_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "row_security" TO 'off'
    AS $$
DECLARE
    v_user_id UUID;
    v_is_admin BOOLEAN;
    v_has_access BOOLEAN;
BEGIN
    -- Obter user_id atual
    v_user_id := auth.uid();
    
    -- Log para debug
    RAISE NOTICE '[calculate_training_progress] Verificando acesso: user_id=%, company_id=%', v_user_id, p_company_id;
    
    -- Verificar acesso
    -- Primeiro verificar se ?? admin
    BEGIN
        v_is_admin := public.is_admin_simple(v_user_id);
        RAISE NOTICE '[calculate_training_progress] is_admin_simple retornou: %', v_is_admin;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '[calculate_training_progress] Erro ao verificar admin: %', SQLERRM;
        v_is_admin := false;
    END;
    
    IF v_is_admin THEN
        -- Admin tem acesso a todas as empresas
        RAISE NOTICE '[calculate_training_progress] Usu??rio ?? admin, permitindo acesso';
        NULL; -- Continuar execu????o
    ELSE
        -- Verificar se tem acesso ?? empresa
        BEGIN
            SELECT EXISTS (
                SELECT 1 FROM public.user_companies
                WHERE user_id = v_user_id
                AND company_id = p_company_id
                AND ativo = true
            ) INTO v_has_access;
            
            RAISE NOTICE '[calculate_training_progress] Verifica????o de acesso retornou: %', v_has_access;
            
            IF NOT v_has_access THEN
                RAISE NOTICE '[calculate_training_progress] Acesso negado - usu??rio n??o tem acesso ?? empresa';
                RETURN jsonb_build_object('error', true, 'message', 'Acesso negado');
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '[calculate_training_progress] Erro ao verificar acesso: %', SQLERRM;
            RETURN jsonb_build_object('error', true, 'message', 'Erro ao verificar acesso: ' || SQLERRM);
        END;
    END IF;

    RAISE NOTICE '[calculate_training_progress] Acesso permitido, chamando fun????o auxiliar';
    
    -- Chamar fun????o auxiliar que tem RLS desabilitado
    RETURN rh._calculate_training_progress_internal(
        p_training_id,
        p_employee_id,
        p_company_id
    );
END;
$$;


ALTER FUNCTION "rh"."calculate_training_progress"("p_training_id" "uuid", "p_employee_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."calculate_work_shift_weekly_hours"("p_work_shift_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_horarios_por_dia JSONB;
  v_dias_semana INTEGER[];
  v_total_horas NUMERIC(5,2) := 0;
  v_dia INTEGER;
  v_day_hours JSONB;
  v_horas_diarias NUMERIC(4,2);
BEGIN
  -- Buscar horários por dia e dias da semana do turno
  SELECT horarios_por_dia, dias_semana
  INTO v_horarios_por_dia, v_dias_semana
  FROM rh.work_shifts
  WHERE id = p_work_shift_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Se existe horarios_por_dia, calcular baseado neles
  IF v_horarios_por_dia IS NOT NULL THEN
    FOREACH v_dia IN ARRAY v_dias_semana
    LOOP
      IF v_horarios_por_dia ? v_dia::TEXT THEN
        v_day_hours := v_horarios_por_dia->v_dia::TEXT;
        v_horas_diarias := COALESCE((v_day_hours->>'horas_diarias')::NUMERIC, 0);
        v_total_horas := v_total_horas + v_horas_diarias;
      END IF;
    END LOOP;
  ELSE
    -- Caso contrário, usar horas_diarias padrão multiplicado pelos dias
    SELECT horas_diarias * array_length(dias_semana, 1)
    INTO v_total_horas
    FROM rh.work_shifts
    WHERE id = p_work_shift_id;
  END IF;

  RETURN COALESCE(v_total_horas, 0);
END;
$$;


ALTER FUNCTION "rh"."calculate_work_shift_weekly_hours"("p_work_shift_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."calculate_work_shift_weekly_hours"("p_work_shift_id" "uuid") IS 'Calcula o total de horas semanais de um turno considerando horários por dia';



CREATE OR REPLACE FUNCTION "rh"."can_advance_to_next_content"("p_training_id" "uuid", "p_employee_id" "uuid", "p_content_id" "uuid", "p_company_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_current_content RECORD;
    v_progress RECORD;
    v_previous_content_completed BOOLEAN;
    v_required_exam_passed BOOLEAN;
    v_result JSONB;
BEGIN
    -- Verificar acesso
    IF NOT EXISTS (
        SELECT 1 FROM public.user_companies
        WHERE user_id = auth.uid()
        AND company_id = p_company_id
        AND ativo = true
    ) THEN
        RETURN jsonb_build_object('error', true, 'message', 'Acesso negado');
    END IF;

    -- Buscar conteúdo atual
    SELECT * INTO v_current_content
    FROM rh.training_content
    WHERE id = p_content_id
    AND training_id = p_training_id
    AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', true, 'message', 'Conteúdo não encontrado');
    END IF;

    -- Verificar se conteúdo anterior foi concluído (se requer conclusão)
    IF v_current_content.ordem > 1 THEN
        SELECT EXISTS (
            SELECT 1 FROM rh.training_content tc
            INNER JOIN rh.training_progress tp ON tc.id = tp.content_id
            WHERE tc.training_id = p_training_id
            AND tc.ordem = v_current_content.ordem - 1
            AND tp.employee_id = p_employee_id
            AND tp.concluido = true
        ) INTO v_previous_content_completed;
    ELSE
        v_previous_content_completed := true; -- Primeira aula sempre pode ser acessada
    END IF;

    -- Verificar se há prova entre aulas e se foi aprovada
    SELECT EXISTS (
        SELECT 1 FROM rh.training_exams te
        INNER JOIN rh.training_exam_attempts tea ON te.id = tea.exam_id
        WHERE te.training_id = p_training_id
        AND te.content_id = (
            SELECT id FROM rh.training_content
            WHERE training_id = p_training_id
            AND ordem = v_current_content.ordem - 1
            LIMIT 1
        )
        AND tea.employee_id = p_employee_id
        AND tea.aprovado = true
        AND tea.tentativa_numero = (
            SELECT MAX(tentativa_numero) 
            FROM rh.training_exam_attempts 
            WHERE exam_id = te.id 
            AND employee_id = p_employee_id
        )
    ) INTO v_required_exam_passed;

    -- Se não há prova entre aulas, considerar como aprovada
    IF NOT EXISTS (
        SELECT 1 FROM rh.training_exams
        WHERE training_id = p_training_id
        AND content_id = (
            SELECT id FROM rh.training_content
            WHERE training_id = p_training_id
            AND ordem = v_current_content.ordem - 1
            LIMIT 1
        )
        AND tipo_avaliacao = 'entre_aulas'
    ) THEN
        v_required_exam_passed := true;
    END IF;

    -- Construir resultado
    v_result := jsonb_build_object(
        'can_advance', v_previous_content_completed AND v_required_exam_passed,
        'previous_content_completed', v_previous_content_completed,
        'required_exam_passed', v_required_exam_passed,
        'requires_completion', v_current_content.requer_conclusao,
        'allows_skip', v_current_content.permite_pular
    );

    RETURN v_result;
END;
$$;


ALTER FUNCTION "rh"."can_advance_to_next_content"("p_training_id" "uuid", "p_employee_id" "uuid", "p_content_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."check_overdue_trainings"("p_company_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_overdue_count INTEGER;
    v_result JSONB;
BEGIN
    -- Verificar acesso
    IF NOT EXISTS (
        SELECT 1 FROM public.user_companies
        WHERE user_id = auth.uid()
        AND company_id = p_company_id
        AND ativo = true
    ) THEN
        RETURN jsonb_build_object('error', true, 'message', 'Acesso negado');
    END IF;

    -- Contar treinamentos vencidos (obrigatórios e públicos)
    SELECT COUNT(DISTINCT ta.training_id) INTO v_overdue_count
    FROM rh.training_assignments ta
    INNER JOIN rh.trainings t ON ta.training_id = t.id
    INNER JOIN rh.employees e ON (
        -- Atribuição pública (todos têm acesso)
        ta.tipo_atribuicao = 'publica'
        -- Ou atribuição específica
        OR ta.employee_id = e.id
        OR ta.position_id = e.position_id
        OR ta.unit_id = e.unit_id
    )
    WHERE ta.company_id = p_company_id
    AND ta.tipo_atribuicao IN ('obrigatorio', 'publica')
    AND t.is_active = true
    AND ta.data_limite IS NOT NULL
    AND ta.data_limite < CURRENT_DATE
    AND ta.notificar = true
    AND NOT EXISTS (
        SELECT 1 FROM rh.training_progress tp
        WHERE tp.training_id = ta.training_id
        AND tp.employee_id = e.id
        AND NOT EXISTS (
            SELECT 1 FROM rh.training_content tc
            WHERE tc.training_id = ta.training_id
            AND tc.is_active = true
            AND NOT EXISTS (
                SELECT 1 FROM rh.training_progress tp2
                WHERE tp2.content_id = tc.id
                AND tp2.employee_id = e.id
                AND tp2.concluido = true
            )
        )
    );

    -- Criar notificações se houver treinamentos vencidos
    IF v_overdue_count > 0 THEN
        SELECT * INTO v_result FROM rh.create_training_notifications(p_company_id);
    ELSE
        v_result := jsonb_build_object(
            'success', true,
            'notifications_created', 0,
            'overdue_count', 0,
            'message', 'Nenhum treinamento vencido encontrado'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'overdue_count', v_overdue_count,
        'notifications', v_result
    );
END;
$$;


ALTER FUNCTION "rh"."check_overdue_trainings"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."create_deduction_from_medical_service"("p_medical_service_usage_id" "uuid", "p_company_id" "uuid", "p_mes_referencia" integer, "p_ano_referencia" integer) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_employee_id UUID;
    v_valor_coparticipacao DECIMAL(10,2);
    v_descricao TEXT;
    v_tipo_servico VARCHAR(50);
    v_data_utilizacao DATE;
    v_deduction_id UUID;
BEGIN
    -- Buscar dados do serviço médico
    SELECT 
        msu.employee_id,
        msu.valor_coparticipacao,
        msu.descricao,
        msu.tipo_servico,
        msu.data_utilizacao
    INTO 
        v_employee_id,
        v_valor_coparticipacao,
        v_descricao,
        v_tipo_servico,
        v_data_utilizacao
    FROM rh.medical_services_usage msu
    WHERE msu.id = p_medical_service_usage_id
      AND msu.company_id = p_company_id;
    
    -- Se não encontrou ou valor é zero, retorna NULL
    IF v_employee_id IS NULL OR v_valor_coparticipacao IS NULL OR v_valor_coparticipacao = 0 THEN
        RETURN NULL;
    END IF;
    
    -- Criar dedução
    INSERT INTO rh.employee_deductions (
        company_id,
        employee_id,
        tipo_deducao,
        categoria,
        descricao,
        valor_total,
        valor_parcela,
        numero_parcelas,
        parcela_atual,
        data_origem,
        mes_referencia_inicio,
        ano_referencia_inicio,
        mes_referencia_folha,
        ano_referencia_folha,
        status,
        medical_service_usage_id,
        aplicar_na_folha
    ) VALUES (
        p_company_id,
        v_employee_id,
        'coparticipacao_medica',
        'Coparticipação - ' || INITCAP(v_tipo_servico),
        'Coparticipação: ' || v_descricao,
        v_valor_coparticipacao,
        v_valor_coparticipacao,
        1,
        1,
        v_data_utilizacao,
        p_mes_referencia,
        p_ano_referencia,
        p_mes_referencia,
        p_ano_referencia,
        'pendente',
        p_medical_service_usage_id,
        true
    )
    RETURNING id INTO v_deduction_id;
    
    -- Atualizar status do serviço médico
    UPDATE rh.medical_services_usage
    SET status = 'pago',
        mes_referencia_folha = p_mes_referencia,
        ano_referencia_folha = p_ano_referencia
    WHERE id = p_medical_service_usage_id;
    
    RETURN v_deduction_id;
END;
$$;


ALTER FUNCTION "rh"."create_deduction_from_medical_service"("p_medical_service_usage_id" "uuid", "p_company_id" "uuid", "p_mes_referencia" integer, "p_ano_referencia" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."create_deduction_from_medical_service"("p_medical_service_usage_id" "uuid", "p_company_id" "uuid", "p_mes_referencia" integer, "p_ano_referencia" integer) IS 'Cria dedução a partir de utilização de serviço médico';



CREATE OR REPLACE FUNCTION "rh"."create_exam_notification"("p_user_id" "uuid", "p_company_id" "uuid", "p_exam_id" "uuid", "p_notification_type" character varying, "p_title" character varying, "p_message" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (
        id,
        user_id,
        company_id,
        type,
        title,
        message,
        data,
        is_read,
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_user_id,
        p_company_id,
        p_notification_type,
        p_title,
        p_message,
        jsonb_build_object('exam_id', p_exam_id),
        false,
        NOW()
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;


ALTER FUNCTION "rh"."create_exam_notification"("p_user_id" "uuid", "p_company_id" "uuid", "p_exam_id" "uuid", "p_notification_type" character varying, "p_title" character varying, "p_message" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."create_exam_notification"("p_user_id" "uuid", "p_company_id" "uuid", "p_exam_id" "uuid", "p_notification_type" character varying, "p_title" character varying, "p_message" "text") IS 'Cria uma notificaÃ§Ã£o para um exame especÃ­fico';



CREATE OR REPLACE FUNCTION "rh"."create_training_notification_rules"("p_training_id" "uuid", "p_company_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    notification_type_record RECORD;
BEGIN
    -- Create notification rules for all default types
    FOR notification_type_record IN
        SELECT id, tipo FROM rh.training_notification_types
        WHERE company_id = p_company_id
        AND is_active = true
    LOOP
        INSERT INTO rh.training_notification_rules (
            company_id, training_id, notification_type_id, target_audience, dias_antecedencia
        ) VALUES (
            p_company_id,
            p_training_id,
            notification_type_record.id,
            CASE 
                WHEN notification_type_record.tipo IN ('inscricao_aberta', 'lembrete_inscricao') THEN 'todos_funcionarios'
                ELSE 'inscritos'
            END,
            (SELECT dias_antecedencia FROM rh.training_notification_types WHERE id = notification_type_record.id)
        );
    END LOOP;
END;
$$;


ALTER FUNCTION "rh"."create_training_notification_rules"("p_training_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."create_training_notifications"("p_company_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_notifications_created INTEGER := 0;
    v_employee_record RECORD;
    v_training_record RECORD;
    v_assignment_record RECORD;
    v_enrollment_exists BOOLEAN;
    v_notification_id UUID;
BEGIN
    -- Verificar acesso
    IF NOT EXISTS (
        SELECT 1 FROM public.user_companies
        WHERE user_id = auth.uid()
        AND company_id = p_company_id
        AND ativo = true
    ) THEN
        RETURN jsonb_build_object('error', true, 'message', 'Acesso negado');
    END IF;

    -- Buscar todos os funcionários com treinamentos obrigatórios ou públicos pendentes
    FOR v_employee_record IN
        SELECT DISTINCT e.id, e.user_id, e.nome
        FROM rh.employees e
        WHERE e.company_id = p_company_id
        AND e.is_active = true
    LOOP
        -- Buscar treinamentos obrigatórios e públicos para este funcionário
        FOR v_assignment_record IN
            SELECT ta.*, t.nome as training_name, t.data_fim, ta.data_limite
            FROM rh.training_assignments ta
            INNER JOIN rh.trainings t ON ta.training_id = t.id
            WHERE ta.company_id = p_company_id
            AND ta.tipo_atribuicao IN ('obrigatorio', 'publica')
            AND t.is_active = true
            AND t.modalidade = 'online'
            AND (
                -- Atribuição pública (todos têm acesso)
                ta.tipo_atribuicao = 'publica'
                -- Ou atribuição específica para este funcionário
                OR ta.employee_id = v_employee_record.id
                OR ta.position_id IN (SELECT position_id FROM rh.employees WHERE id = v_employee_record.id)
                OR ta.unit_id IN (SELECT unit_id FROM rh.employees WHERE id = v_employee_record.id)
            )
            AND ta.notificar = true
        LOOP
            -- Verificar se já existe inscrição
            SELECT EXISTS (
                SELECT 1 FROM rh.training_enrollments
                WHERE training_id = v_assignment_record.training_id
                AND employee_id = v_employee_record.id
                AND is_active = true
            ) INTO v_enrollment_exists;

            -- Verificar se treinamento está pendente (não concluído)
            IF NOT EXISTS (
                SELECT 1 FROM rh.training_progress tp
                WHERE tp.training_id = v_assignment_record.training_id
                AND tp.employee_id = v_employee_record.id
                AND NOT EXISTS (
                    SELECT 1 FROM rh.training_content tc
                    WHERE tc.training_id = v_assignment_record.training_id
                    AND tc.is_active = true
                    AND NOT EXISTS (
                        SELECT 1 FROM rh.training_progress tp2
                        WHERE tp2.content_id = tc.id
                        AND tp2.employee_id = v_employee_record.id
                        AND tp2.concluido = true
                    )
                )
            ) THEN
                -- Verificar se já existe notificação recente (últimas 24 horas)
                IF NOT EXISTS (
                    SELECT 1 FROM public.notifications
                    WHERE user_id = v_employee_record.user_id
                    AND company_id = p_company_id
                    AND tipo = 'treinamento_obrigatorio'
                    AND data->>'training_id' = v_assignment_record.training_id::TEXT
                    AND created_at > NOW() - INTERVAL '24 hours'
                ) THEN
                    -- Criar notificação
                    INSERT INTO public.notifications (
                        user_id,
                        company_id,
                        tipo,
                        titulo,
                        mensagem,
                        data,
                        is_read,
                        created_at
                    ) VALUES (
                        v_employee_record.user_id,
                        p_company_id,
                        'treinamento_obrigatorio',
                        CASE 
                            WHEN v_assignment_record.tipo_atribuicao = 'publica' THEN 'Treinamento Disponível'
                            ELSE 'Treinamento Obrigatório Pendente'
                        END,
                        CASE 
                            WHEN v_assignment_record.data_limite IS NOT NULL AND v_assignment_record.data_limite < CURRENT_DATE THEN
                                'O treinamento "' || v_assignment_record.training_name || '" está vencido. Por favor, conclua o quanto antes.'
                            WHEN v_assignment_record.data_limite IS NOT NULL AND v_assignment_record.data_limite <= CURRENT_DATE + INTERVAL '7 days' THEN
                                'O treinamento "' || v_assignment_record.training_name || '" vence em breve. Por favor, conclua antes de ' || 
                                TO_CHAR(v_assignment_record.data_limite, 'DD/MM/YYYY') || '.'
                            WHEN v_assignment_record.tipo_atribuicao = 'publica' THEN
                                'O treinamento "' || v_assignment_record.training_name || '" está disponível para você.'
                            ELSE
                                'Você possui o treinamento obrigatório "' || v_assignment_record.training_name || '" pendente.'
                        END,
                        jsonb_build_object(
                            'training_id', v_assignment_record.training_id,
                            'training_name', v_assignment_record.training_name,
                            'deadline', v_assignment_record.data_limite,
                            'is_overdue', COALESCE(v_assignment_record.data_limite < CURRENT_DATE, false),
                            'is_public', v_assignment_record.tipo_atribuicao = 'publica'
                        ),
                        false,
                        NOW()
                    ) RETURNING id INTO v_notification_id;

                    v_notifications_created := v_notifications_created + 1;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'notifications_created', v_notifications_created,
        'message', 'Notificações criadas com sucesso'
    );
END;
$$;


ALTER FUNCTION "rh"."create_training_notifications"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."criar_ferias_fracionadas"("p_company_id" "uuid", "p_employee_id" "uuid", "p_ano" integer, "p_periodos" "jsonb", "p_observacoes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  vacation_id UUID;
  periodo JSONB;
  total_dias INTEGER := 0;
  periodo_count INTEGER := 0;
  periodo_data_fim DATE;
  periodo_status VARCHAR(20);
  has_long_period BOOLEAN := FALSE;
  dias_restantes_atual INTEGER;
  dias_ja_solicitados INTEGER := 0;
  primeira_data_inicio DATE;
BEGIN
  -- Validar se o funcionário tem direito a férias no ano
  -- Permitir períodos futuros (pendentes) para visualização, mas validar data de início
  SELECT ve.dias_restantes, ve.data_fim_periodo, ve.status
  INTO dias_restantes_atual, periodo_data_fim, periodo_status
  FROM rh.vacation_entitlements ve
  WHERE ve.employee_id = p_employee_id 
    AND ve.ano_aquisitivo = p_ano;
    
  IF periodo_data_fim IS NULL THEN
    RAISE EXCEPTION 'Funcionário não possui direito a férias para o ano %', p_ano;
  END IF;
  
  -- Validar que a data de início das férias seja após o término do período aquisitivo
  -- O funcionário precisa ter completado 12 meses antes de iniciar as férias
  -- data_fim_periodo = último dia do período aquisitivo, então férias podem começar em data_fim_periodo + 1 dia
  IF jsonb_array_length(p_periodos) > 0 THEN
    primeira_data_inicio := (p_periodos->0->>'data_inicio')::DATE;
    
    -- Só validar data mínima se o período ainda está em andamento (status = 'pendente')
    -- Se o período já está completo (status = 'ativo' ou 'vencido'), pode solicitar a qualquer momento
    IF periodo_status = 'pendente' AND primeira_data_inicio <= periodo_data_fim THEN
      RAISE EXCEPTION 'A data de início das férias deve ser após o término do período aquisitivo. Período termina em %, férias podem começar a partir de %', 
        periodo_data_fim, periodo_data_fim + INTERVAL '1 day';
    END IF;
  END IF;

  -- Calcular dias já solicitados e aprovados para o mesmo ano
  SELECT COALESCE(SUM(v.dias_solicitados), 0) INTO dias_ja_solicitados
  FROM rh.vacations v
  WHERE v.employee_id = p_employee_id
    AND v.status IN ('aprovado', 'em_andamento', 'concluido')
    AND EXTRACT(YEAR FROM v.data_inicio) = p_ano
    AND v.tipo = 'ferias';

  -- Validar número de períodos (máximo 3)
  IF jsonb_array_length(p_periodos) > 3 THEN
    RAISE EXCEPTION 'Máximo de 3 períodos permitidos';
  END IF;

  IF jsonb_array_length(p_periodos) = 0 THEN
    RAISE EXCEPTION 'Pelo menos um período deve ser informado';
  END IF;

  -- Validar cada período
  FOR periodo IN SELECT * FROM jsonb_array_elements(p_periodos)
  LOOP
    periodo_count := periodo_count + 1;
    
    -- Validar dados do período
    IF NOT (periodo ? 'data_inicio' AND periodo ? 'data_fim' AND periodo ? 'dias_ferias') THEN
      RAISE EXCEPTION 'Período % inválido: dados obrigatórios ausentes', periodo_count;
    END IF;
    
    -- Validar datas
    IF (periodo->>'data_fim')::DATE < (periodo->>'data_inicio')::DATE THEN
      RAISE EXCEPTION 'Período % inválido: data fim anterior à data início', periodo_count;
    END IF;
    
    -- Validar dias de férias
    IF (periodo->>'dias_ferias')::INTEGER <= 0 THEN
      RAISE EXCEPTION 'Período % inválido: dias de férias deve ser maior que zero', periodo_count;
    END IF;
    
    -- Validar mínimo de dias por período (exceto o primeiro)
    -- O primeiro período pode ter qualquer quantidade, mas os demais devem ter no mínimo 5 dias
    IF periodo_count > 1 AND (periodo->>'dias_ferias')::INTEGER < 5 THEN
      RAISE EXCEPTION 'Período % inválido: mínimo de 5 dias por período (exceto o primeiro)', periodo_count;
    END IF;
    
    -- Verificar se pelo menos um período tem 14+ dias
    IF (periodo->>'dias_ferias')::INTEGER >= 14 THEN
      has_long_period := TRUE;
    END IF;
    
    total_dias := total_dias + (periodo->>'dias_ferias')::INTEGER;
  END LOOP;
  
  -- Validar que pelo menos um período tenha 14+ dias (REGRAS CLT)
  -- EXCEÇÃO: Na primeira solicitação (dias_ja_solicitados = 0), se tiver apenas 1 período, não precisa ter 14 dias
  -- O funcionário pode fazer mais solicitações depois
  IF NOT has_long_period THEN
    IF dias_ja_solicitados = 0 AND jsonb_array_length(p_periodos) = 1 THEN
      -- Primeira solicitação com apenas 1 período: permitir qualquer valor
      -- Não precisa ter 14 dias imediatamente
      NULL; -- Não fazer nada, permitir
    ELSIF jsonb_array_length(p_periodos) >= 2 THEN
      -- Se tiver 2+ períodos, pelo menos um deve ter 14+ dias
      RAISE EXCEPTION 'Pelo menos um período deve ter 14 ou mais dias consecutivos (regra CLT)';
    ELSE
      -- Já existem férias aprovadas e não há período com 14+ dias
      RAISE EXCEPTION 'Pelo menos um período (incluindo férias já aprovadas) deve ter 14 ou mais dias consecutivos (regra CLT)';
    END IF;
  END IF;
  
  -- Validar total de dias (máximo 30)
  IF total_dias > 30 THEN
    RAISE EXCEPTION 'Total de dias excede o limite de 30 dias';
  END IF;

  -- Validar se há dias suficientes disponíveis (considerando dias já solicitados)
  IF (total_dias + dias_ja_solicitados) > (dias_restantes_atual + dias_ja_solicitados) THEN
    RAISE EXCEPTION 'Dias solicitados (%) excedem os dias disponíveis (%). Dias já utilizados: %', 
      total_dias, dias_restantes_atual, dias_ja_solicitados;
  END IF;

  -- Criar registro de férias
  INSERT INTO rh.vacations (
    employee_id,
    company_id,
    tipo,
    data_inicio,
    data_fim,
    dias_solicitados,
    status,
    observacoes
  ) VALUES (
    p_employee_id,
    p_company_id,
    'ferias',
    (p_periodos->0->>'data_inicio')::DATE,
    (p_periodos->-1->>'data_fim')::DATE,
    total_dias,
    'pendente',
    p_observacoes
  ) RETURNING id INTO vacation_id;

  -- Criar períodos de férias
  periodo_count := 0;
  FOR periodo IN SELECT * FROM jsonb_array_elements(p_periodos)
  LOOP
    periodo_count := periodo_count + 1;
    
    INSERT INTO rh.vacation_periods (
      vacation_id,
      data_inicio,
      data_fim,
      dias_ferias,
      dias_abono,
      periodo_numero,
      observacoes
    ) VALUES (
      vacation_id,
      (periodo->>'data_inicio')::DATE,
      (periodo->>'data_fim')::DATE,
      (periodo->>'dias_ferias')::INTEGER,
      COALESCE((periodo->>'dias_abono')::INTEGER, 0),
      periodo_count,
      periodo->>'observacoes'
    );
  END LOOP;

  RETURN vacation_id;
END;
$$;


ALTER FUNCTION "rh"."criar_ferias_fracionadas"("p_company_id" "uuid", "p_employee_id" "uuid", "p_ano" integer, "p_periodos" "jsonb", "p_observacoes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."criar_ferias_fracionadas"("p_company_id" "uuid", "p_employee_id" "uuid", "p_ano" integer, "p_periodos" "jsonb", "p_observacoes" "text") IS 'Cria solicitação de férias fracionadas validando regras CLT: máximo 3 períodos, pelo menos um com 14+ dias (exceto primeira solicitação com 1 período), demais com mínimo 5 dias, total máximo 30 dias';



CREATE OR REPLACE FUNCTION "rh"."criar_ferias_integrais"("p_company_id" "uuid", "p_employee_id" "uuid", "p_ano" integer, "p_data_inicio" "date", "p_data_fim" "date", "p_observacoes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  vacation_id UUID;
  dias_restantes_atual INTEGER;
  periodo_data_fim DATE;
  dias_calculados INTEGER;
BEGIN
  -- Validar se o funcionário tem direito a férias no ano
  -- Permitir períodos futuros (pendentes) para visualização, mas validar data de início
  SELECT ve.dias_restantes, ve.data_fim_periodo
  INTO dias_restantes_atual, periodo_data_fim
  FROM rh.vacation_entitlements ve
  WHERE ve.employee_id = p_employee_id 
    AND ve.ano_aquisitivo = p_ano;
    
  IF periodo_data_fim IS NULL THEN
    RAISE EXCEPTION 'Funcionário não possui direito a férias para o ano %', p_ano;
  END IF;
  
  -- Validar que a data de início das férias seja após o término do período aquisitivo
  -- O funcionário precisa ter completado 12 meses antes de iniciar as férias
  -- data_fim_periodo = último dia do período aquisitivo, então férias podem começar em data_fim_periodo + 1 dia
  IF p_data_inicio <= periodo_data_fim THEN
    RAISE EXCEPTION 'A data de início das férias deve ser após o término do período aquisitivo. Período termina em %, férias podem começar a partir de %', 
      periodo_data_fim, periodo_data_fim + INTERVAL '1 day';
  END IF;
  
  -- Calcular dias entre as datas
  dias_calculados := (p_data_fim - p_data_inicio) + 1;
  
  -- Validar que são exatamente 30 dias (férias integrais)
  IF dias_calculados != 30 THEN
    RAISE EXCEPTION 'Férias integrais devem ter exatamente 30 dias. Dias calculados: %', dias_calculados;
  END IF;
  
  -- Validar se há dias suficientes disponíveis
  IF dias_calculados > dias_restantes_atual THEN
    RAISE EXCEPTION 'Dias solicitados (%) excedem os dias disponíveis (%)', 
      dias_calculados, dias_restantes_atual;
  END IF;
  
  -- Criar registro de férias
  INSERT INTO rh.vacations (
    employee_id,
    company_id,
    tipo,
    data_inicio,
    data_fim,
    dias_solicitados,
    status,
    observacoes
  ) VALUES (
    p_employee_id,
    p_company_id,
    'ferias',
    p_data_inicio,
    p_data_fim,
    dias_calculados,
    'pendente',
    p_observacoes
  ) RETURNING id INTO vacation_id;
  
  RETURN vacation_id;
END;
$$;


ALTER FUNCTION "rh"."criar_ferias_integrais"("p_company_id" "uuid", "p_employee_id" "uuid", "p_ano" integer, "p_data_inicio" "date", "p_data_fim" "date", "p_observacoes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."criar_ferias_integrais"("p_company_id" "uuid", "p_employee_id" "uuid", "p_ano" integer, "p_data_inicio" "date", "p_data_fim" "date", "p_observacoes" "text") IS 'Cria solicitação de férias integrais (30 dias) validando que o período aquisitivo foi completado (12 meses de trabalho)';



CREATE OR REPLACE FUNCTION "rh"."finish_exam_attempt"("p_attempt_id" "uuid", "p_company_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_attempt RECORD;
    v_total_questions INTEGER;
    v_correct_answers INTEGER;
    v_total_score DECIMAL;
    v_percent_correct DECIMAL;
    v_minimum_score DECIMAL;
    v_approved BOOLEAN;
    v_result JSONB;
BEGIN
    -- Verificar acesso
    IF NOT EXISTS (
        SELECT 1 FROM public.user_companies
        WHERE user_id = auth.uid()
        AND company_id = p_company_id
        AND ativo = true
    ) THEN
        RETURN jsonb_build_object('error', true, 'message', 'Acesso negado');
    END IF;

    -- Buscar tentativa
    SELECT * INTO v_attempt
    FROM rh.training_exam_attempts
    WHERE id = p_attempt_id
    AND company_id = p_company_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', true, 'message', 'Tentativa não encontrada');
    END IF;

    -- Verificar se é do usuário
    IF NOT EXISTS (
        SELECT 1 FROM rh.employees
        WHERE id = v_attempt.employee_id
        AND user_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object('error', true, 'message', 'Acesso negado');
    END IF;

    -- Contar questões e respostas corretas
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE ea.is_correct = true),
        COALESCE(SUM(ea.pontuacao_obtida), 0)
    INTO v_total_questions, v_correct_answers, v_total_score
    FROM rh.training_exam_answers ea
    WHERE ea.attempt_id = p_attempt_id;

    -- Calcular percentual de acerto
    IF v_total_questions > 0 THEN
        v_percent_correct := (v_correct_answers::DECIMAL / v_total_questions::DECIMAL) * 100;
    ELSE
        v_percent_correct := 0;
    END IF;

    -- Buscar nota mínima de aprovação
    SELECT COALESCE(nota_minima_aprovacao, 70.00) INTO v_minimum_score
    FROM rh.training_exams
    WHERE id = v_attempt.exam_id;

    -- Verificar se foi aprovado
    v_approved := v_percent_correct >= v_minimum_score;

    -- Atualizar tentativa
    UPDATE rh.training_exam_attempts
    SET 
        data_fim = NOW(),
        nota_final = v_total_score,
        percentual_acerto = v_percent_correct,
        aprovado = v_approved,
        status = 'finalizado',
        tempo_gasto_segundos = EXTRACT(EPOCH FROM (NOW() - data_inicio))::INTEGER
    WHERE id = p_attempt_id;

    -- Construir resultado
    v_result := jsonb_build_object(
        'attempt_id', p_attempt_id,
        'total_questions', v_total_questions,
        'correct_answers', v_correct_answers,
        'score', v_total_score,
        'percent_correct', ROUND(v_percent_correct, 2),
        'approved', v_approved
    );

    RETURN v_result;
END;
$$;


ALTER FUNCTION "rh"."finish_exam_attempt"("p_attempt_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."fix_incorrect_time_records"() RETURNS TABLE("corrected_count" integer, "details" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_record RECORD;
  v_window_hours INTEGER;
  v_previous_record_id UUID;
  v_previous_record_date DATE;
  v_previous_entrada TIME;
  v_previous_entrada_timestamp TIMESTAMPTZ;
  v_current_entrada_timestamp TIMESTAMPTZ;
  v_hours_elapsed NUMERIC;
  v_is_within_window BOOLEAN;
  v_corrected_count INTEGER := 0;
  v_details JSONB := '[]'::JSONB;
  v_detail JSONB;
BEGIN
  -- Para cada registro que tem apenas entrada no dia seguinte
  FOR v_record IN
    SELECT 
      tr.id,
      tr.employee_id,
      tr.company_id,
      tr.data_registro,
      tr.entrada,
      tr.saida,
      tr.entrada_almoco,
      tr.saida_almoco,
      tr.entrada_extra1,
      tr.saida_extra1
    FROM rh.time_records tr
    WHERE tr.entrada IS NOT NULL
      AND tr.entrada_almoco IS NULL
      AND tr.saida_almoco IS NULL
      AND tr.saida IS NULL
      AND tr.entrada_extra1 IS NULL
      AND tr.saida_extra1 IS NULL
      -- Verificar se há registro do dia anterior
      AND EXISTS (
        SELECT 1
        FROM rh.time_records tr2
        WHERE tr2.employee_id = tr.employee_id
          AND tr2.company_id = tr.company_id
          AND tr2.data_registro = tr.data_registro - INTERVAL '1 day'
          AND tr2.entrada IS NOT NULL
      )
  LOOP
    -- Obter configuração da janela de tempo
    SELECT COALESCE(janela_tempo_marcacoes, 24) INTO v_window_hours
    FROM rh.time_record_settings
    WHERE company_id = v_record.company_id;

    -- Buscar registro do dia anterior
    SELECT 
      tr.id,
      tr.data_registro,
      tr.entrada
    INTO 
      v_previous_record_id,
      v_previous_record_date,
      v_previous_entrada
    FROM rh.time_records tr
    WHERE tr.employee_id = v_record.employee_id
      AND tr.company_id = v_record.company_id
      AND tr.data_registro = v_record.data_registro - INTERVAL '1 day'
      AND tr.entrada IS NOT NULL
    ORDER BY tr.data_registro DESC, tr.entrada DESC
    LIMIT 1;

    -- Se encontrou registro anterior, verificar se está dentro da janela
    IF v_previous_record_id IS NOT NULL AND v_previous_entrada IS NOT NULL THEN
      -- Construir timestamps
      v_previous_entrada_timestamp := ((v_previous_record_date + v_previous_entrada)::timestamp 
                                       AT TIME ZONE 'America/Sao_Paulo')::timestamptz;
      v_current_entrada_timestamp := ((v_record.data_registro + v_record.entrada)::timestamp 
                                     AT TIME ZONE 'America/Sao_Paulo')::timestamptz;
      
      -- Calcular horas decorridas
      v_hours_elapsed := EXTRACT(EPOCH FROM (v_current_entrada_timestamp - v_previous_entrada_timestamp)) / 3600;
      
      -- Verificar se está dentro da janela
      v_is_within_window := v_hours_elapsed >= 0 AND v_hours_elapsed <= v_window_hours;
      
      -- Se está dentro da janela, mover o registro para o dia anterior
      IF v_is_within_window THEN
        -- Determinar qual campo atualizar no registro anterior baseado no que está preenchido
        -- Se o registro atual tem apenas entrada e o anterior tem entrada_almoco mas não saida_almoco,
        -- então a entrada atual é na verdade saida_almoco
        
        -- Verificar o estado do registro anterior
        DECLARE
          v_prev_entrada_almoco TIME;
          v_prev_saida_almoco TIME;
          v_prev_saida TIME;
        BEGIN
          SELECT entrada_almoco, saida_almoco, saida
          INTO v_prev_entrada_almoco, v_prev_saida_almoco, v_prev_saida
          FROM rh.time_records
          WHERE id = v_previous_record_id;
          
          -- Determinar qual campo atualizar baseado no estado do registro anterior
        -- Ordem de verificação: saida_almoco -> saida -> entrada_extra1 -> saida_extra1
        IF v_prev_entrada_almoco IS NOT NULL AND v_prev_saida_almoco IS NULL THEN
          -- Se tem entrada_almoco mas não saida_almoco, então a entrada atual é saida_almoco
          UPDATE rh.time_records
          SET saida_almoco = v_record.entrada
          WHERE id = v_previous_record_id;
          
          -- Deletar o registro incorreto
          DELETE FROM rh.time_records WHERE id = v_record.id;
          
          v_corrected_count := v_corrected_count + 1;
          
          v_detail := jsonb_build_object(
            'incorrect_record_id', v_record.id,
            'incorrect_date', v_record.data_registro,
            'corrected_record_id', v_previous_record_id,
            'corrected_date', v_previous_record_date,
            'field_updated', 'saida_almoco',
            'value', v_record.entrada,
            'hours_elapsed', ROUND(v_hours_elapsed, 2),
            'window_hours', v_window_hours
          );
          
          v_details := v_details || v_detail;
        ELSIF v_prev_saida_almoco IS NOT NULL AND v_prev_saida IS NULL THEN
          -- Se tem saida_almoco mas não saida, então a entrada atual é saida
          UPDATE rh.time_records
          SET saida = v_record.entrada
          WHERE id = v_previous_record_id;
          
          -- Deletar o registro incorreto
          DELETE FROM rh.time_records WHERE id = v_record.id;
          
          v_corrected_count := v_corrected_count + 1;
          
          v_detail := jsonb_build_object(
            'incorrect_record_id', v_record.id,
            'incorrect_date', v_record.data_registro,
            'corrected_record_id', v_previous_record_id,
            'corrected_date', v_previous_record_date,
            'field_updated', 'saida',
            'value', v_record.entrada,
            'hours_elapsed', ROUND(v_hours_elapsed, 2),
            'window_hours', v_window_hours
          );
          
          v_details := v_details || v_detail;
        END IF;
        END;
      END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_corrected_count, v_details;
END;
$$;


ALTER FUNCTION "rh"."fix_incorrect_time_records"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."fix_multiple_entrada_events"("p_timezone" "text" DEFAULT 'America/Sao_Paulo'::"text") RETURNS TABLE("time_record_id" "uuid", "data_registro" "date", "employee_id" "uuid", "events_fixed" integer, "details" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_rec RECORD;
  v_ev RECORD;
  v_ord int;
  v_new_type text;
  v_local_time time;
  v_types text[] := ARRAY['entrada','entrada_almoco','saida_almoco','saida','extra_inicio','extra_fim'];
BEGIN
  FOR v_rec IN
    SELECT tr.id AS rec_id, tr.employee_id, tr.company_id, tr.data_registro,
           (SELECT COUNT(*) FROM rh.time_record_events e WHERE e.time_record_id = tr.id AND e.event_type = 'entrada') AS entrada_count
    FROM rh.time_records tr
    WHERE tr.entrada IS NOT NULL
      AND tr.entrada_almoco IS NULL
      AND tr.saida_almoco IS NULL
      AND tr.saida IS NULL
      AND (SELECT COUNT(*) FROM rh.time_record_events e WHERE e.time_record_id = tr.id AND e.event_type = 'entrada') >= 2
  LOOP
    v_ord := 0;
    FOR v_ev IN
      SELECT e.id, e.event_at, e.event_type
      FROM rh.time_record_events e
      WHERE e.time_record_id = v_rec.rec_id
        AND e.event_type = 'entrada'
      ORDER BY e.event_at
    LOOP
      v_ord := v_ord + 1;
      IF v_ord <= array_length(v_types, 1) THEN
        v_new_type := v_types[v_ord];
        UPDATE rh.time_record_events SET event_type = v_new_type WHERE id = v_ev.id;
        v_local_time := (v_ev.event_at AT TIME ZONE p_timezone)::time;
        CASE v_new_type
          WHEN 'entrada' THEN
            UPDATE rh.time_records SET entrada = v_local_time WHERE id = v_rec.rec_id;
          WHEN 'entrada_almoco' THEN
            UPDATE rh.time_records SET entrada_almoco = v_local_time WHERE id = v_rec.rec_id;
          WHEN 'saida_almoco' THEN
            UPDATE rh.time_records SET saida_almoco = v_local_time WHERE id = v_rec.rec_id;
          WHEN 'saida' THEN
            UPDATE rh.time_records SET saida = v_local_time WHERE id = v_rec.rec_id;
          WHEN 'extra_inicio' THEN
            UPDATE rh.time_records SET entrada_extra1 = v_local_time WHERE id = v_rec.rec_id;
          WHEN 'extra_fim' THEN
            UPDATE rh.time_records SET saida_extra1 = v_local_time WHERE id = v_rec.rec_id;
        END CASE;
      END IF;
    END LOOP;
    PERFORM rh.recalculate_time_record_hours(v_rec.rec_id);
    time_record_id := v_rec.rec_id;
    data_registro := v_rec.data_registro;
    employee_id := v_rec.employee_id;
    events_fixed := v_ord;
    details := jsonb_build_object('entrada_events_before', v_rec.entrada_count);
    RETURN NEXT;
  END LOOP;
END;
$$;


ALTER FUNCTION "rh"."fix_multiple_entrada_events"("p_timezone" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."fix_multiple_entrada_events"("p_timezone" "text") IS 'Corrige time_records que têm vários eventos com event_type=entrada, reatribuindo tipos na ordem: entrada, entrada_almoco, saida_almoco, saida, extra_inicio, extra_fim.';



CREATE OR REPLACE FUNCTION "rh"."get_bank_hours_assignment_with_relations"("p_assignment_id" "uuid", "p_company_id" "uuid") RETURNS TABLE("id" "uuid", "employee_id" "uuid", "company_id" "uuid", "bank_hours_type_id" "uuid", "is_active" boolean, "assigned_at" timestamp with time zone, "assigned_by" "uuid", "notes" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "employee_nome" character varying, "employee_matricula" character varying, "employee_cpf" character varying, "type_name" character varying, "type_code" character varying, "type_description" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.employee_id,
    a.company_id,
    a.bank_hours_type_id,
    a.is_active,
    a.assigned_at,
    a.assigned_by,
    a.notes,
    a.created_at,
    a.updated_at,
    -- Dados do funcionário
    e.nome as employee_nome,
    e.matricula as employee_matricula,
    e.cpf as employee_cpf,
    -- Dados do tipo
    t.name as type_name,
    t.code as type_code,
    t.description as type_description
  FROM rh.bank_hours_assignments a
  LEFT JOIN rh.employees e ON a.employee_id = e.id
  LEFT JOIN rh.bank_hours_types t ON a.bank_hours_type_id = t.id
  WHERE a.id = p_assignment_id 
    AND a.company_id = p_company_id;
END;
$$;


ALTER FUNCTION "rh"."get_bank_hours_assignment_with_relations"("p_assignment_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."get_bank_hours_assignments_with_relations"("p_company_id" "uuid") RETURNS TABLE("id" "uuid", "employee_id" "uuid", "company_id" "uuid", "bank_hours_type_id" "uuid", "is_active" boolean, "assigned_at" timestamp with time zone, "assigned_by" "uuid", "notes" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "employee_nome" character varying, "employee_matricula" character varying, "employee_cpf" character varying, "type_name" character varying, "type_code" character varying, "type_description" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.employee_id,
    a.company_id,
    a.bank_hours_type_id,
    a.is_active,
    a.assigned_at,
    a.assigned_by,
    a.notes,
    a.created_at,
    a.updated_at,
    -- Dados do funcionário
    e.nome as employee_nome,
    e.matricula as employee_matricula,
    e.cpf as employee_cpf,
    -- Dados do tipo
    t.name as type_name,
    t.code as type_code,
    t.description as type_description
  FROM rh.bank_hours_assignments a
  LEFT JOIN rh.employees e ON a.employee_id = e.id
  LEFT JOIN rh.bank_hours_types t ON a.bank_hours_type_id = t.id
  WHERE a.company_id = p_company_id
  ORDER BY a.assigned_at DESC;
END;
$$;


ALTER FUNCTION "rh"."get_bank_hours_assignments_with_relations"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."get_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid") RETURNS TABLE("current_balance" numeric, "accumulated_hours" numeric, "compensated_hours" numeric, "expired_hours" numeric, "last_calculation_date" "date", "has_bank_hours" boolean, "max_accumulation_hours" numeric, "accumulation_period_months" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH balance_data AS (
    SELECT 
      b.current_balance,
      b.accumulated_hours,
      b.compensated_hours,
      b.expired_hours,
      b.last_calculation_date
    FROM rh.bank_hours_balance b
    WHERE b.employee_id = p_employee_id
      AND b.company_id = p_company_id
  ),
  assignment_config AS (
    -- Sistema novo: bank_hours_assignments
    SELECT 
      bht.has_bank_hours,
      bht.max_accumulation_hours,
      bht.accumulation_period_months
    FROM rh.bank_hours_assignments bha
    INNER JOIN rh.bank_hours_types bht ON bht.id = bha.bank_hours_type_id
    WHERE bha.employee_id = p_employee_id
      AND bha.company_id = p_company_id
      AND bha.is_active = true
      AND bht.is_active = true
      AND bht.has_bank_hours = true
    ORDER BY bha.assigned_at DESC
    LIMIT 1
  ),
  old_config AS (
    -- Sistema antigo: bank_hours_config (sÃ³ se nÃ£o tiver no sistema novo)
    SELECT 
      c.has_bank_hours,
      c.max_accumulation_hours,
      c.accumulation_period_months
    FROM rh.bank_hours_config c
    WHERE c.employee_id = p_employee_id
      AND c.company_id = p_company_id
      AND c.is_active = true
      AND c.has_bank_hours = true
      AND NOT EXISTS (SELECT 1 FROM assignment_config)
    LIMIT 1
  )
  SELECT 
    COALESCE(bd.current_balance, 0),
    COALESCE(bd.accumulated_hours, 0),
    COALESCE(bd.compensated_hours, 0),
    COALESCE(bd.expired_hours, 0),
    COALESCE(bd.last_calculation_date, CURRENT_DATE),
    -- Verificar se tem banco de horas no sistema novo ou antigo
    COALESCE(
      ac.has_bank_hours,
      oc.has_bank_hours,
      false
    ) AS has_bank_hours,
    -- Usar max_accumulation do sistema novo ou antigo
    COALESCE(
      ac.max_accumulation_hours,
      oc.max_accumulation_hours,
      0
    ) AS max_accumulation_hours,
    -- Usar accumulation_period_months do sistema novo ou antigo
    COALESCE(
      ac.accumulation_period_months,
      oc.accumulation_period_months,
      0
    ) AS accumulation_period_months
  FROM balance_data bd
  FULL OUTER JOIN assignment_config ac ON true
  FULL OUTER JOIN old_config oc ON true
  LIMIT 1;
END;
$$;


ALTER FUNCTION "rh"."get_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."get_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid") IS 'Retorna o saldo atual do banco de horas de um funcionÃ¡rio.
   Funciona com bank_hours_assignments (sistema novo) e bank_hours_config (sistema antigo).
   Prioriza sistema novo sobre sistema antigo.';



CREATE OR REPLACE FUNCTION "rh"."get_employee_bank_hours_assignments_with_relations"("p_employee_id" "uuid", "p_company_id" "uuid") RETURNS TABLE("id" "uuid", "employee_id" "uuid", "company_id" "uuid", "bank_hours_type_id" "uuid", "is_active" boolean, "assigned_at" timestamp with time zone, "assigned_by" "uuid", "notes" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "employee_nome" character varying, "employee_matricula" character varying, "employee_cpf" character varying, "type_name" character varying, "type_code" character varying, "type_description" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.employee_id,
    a.company_id,
    a.bank_hours_type_id,
    a.is_active,
    a.assigned_at,
    a.assigned_by,
    a.notes,
    a.created_at,
    a.updated_at,
    -- Dados do funcionário
    e.nome as employee_nome,
    e.matricula as employee_matricula,
    e.cpf as employee_cpf,
    -- Dados do tipo
    t.name as type_name,
    t.code as type_code,
    t.description as type_description
  FROM rh.bank_hours_assignments a
  LEFT JOIN rh.employees e ON a.employee_id = e.id
  LEFT JOIN rh.bank_hours_types t ON a.bank_hours_type_id = t.id
  WHERE a.employee_id = p_employee_id 
    AND a.company_id = p_company_id
  ORDER BY a.assigned_at DESC;
END;
$$;


ALTER FUNCTION "rh"."get_employee_bank_hours_assignments_with_relations"("p_employee_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."get_employee_bank_hours_config"("p_employee_id" "uuid", "p_company_id" "uuid") RETURNS TABLE("assignment_id" "uuid", "type_id" "uuid", "type_name" character varying, "type_code" character varying, "has_bank_hours" boolean, "accumulation_period_months" integer, "max_accumulation_hours" numeric, "compensation_rate" numeric, "auto_compensate" boolean, "compensation_priority" character varying, "expires_after_months" integer, "allow_negative_balance" boolean, "is_active" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as assignment_id,
    t.id as type_id,
    t.name as type_name,
    t.code as type_code,
    t.has_bank_hours,
    t.accumulation_period_months,
    t.max_accumulation_hours,
    t.compensation_rate,
    t.auto_compensate,
    t.compensation_priority,
    t.expires_after_months,
    t.allow_negative_balance,
    a.is_active
  FROM rh.bank_hours_assignments a
  JOIN rh.bank_hours_types t ON a.bank_hours_type_id = t.id
  WHERE a.employee_id = p_employee_id 
    AND a.company_id = p_company_id
    AND a.is_active = true
    AND t.is_active = true;
END;
$$;


ALTER FUNCTION "rh"."get_employee_bank_hours_config"("p_employee_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."get_employee_work_shift_type"("p_employee_id" "uuid", "p_company_id" "uuid", "p_date" "date") RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_tipo_escala VARCHAR(50);
BEGIN
  SELECT ws.tipo_escala
  INTO v_tipo_escala
  FROM rh.employee_shifts es
  INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
  WHERE es.funcionario_id = p_employee_id
    AND es.company_id = p_company_id
    AND es.ativo = true
    AND es.data_inicio <= p_date
    AND (es.data_fim IS NULL OR es.data_fim >= p_date)
  ORDER BY es.data_inicio DESC
  LIMIT 1;

  RETURN COALESCE(v_tipo_escala, 'fixa');
END;
$$;


ALTER FUNCTION "rh"."get_employee_work_shift_type"("p_employee_id" "uuid", "p_company_id" "uuid", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."get_exams_needing_notification"("p_company_id" "uuid", "p_days_ahead" integer DEFAULT 30) RETURNS TABLE("exam_id" "uuid", "employee_id" "uuid", "employee_name" character varying, "exam_type" character varying, "scheduled_date" "date", "days_until_exam" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pe.id as exam_id,
        pe.employee_id,
        e.nome as employee_name,
        pe.tipo_exame as exam_type,
        pe.data_agendamento as scheduled_date,
        (pe.data_agendamento - CURRENT_DATE)::INTEGER as days_until_exam
    FROM rh.periodic_exams pe
    JOIN rh.employees e ON pe.employee_id = e.id
    WHERE pe.company_id = p_company_id
    AND pe.status = 'agendado'
    AND pe.data_agendamento BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '1 day' * p_days_ahead)
    ORDER BY pe.data_agendamento ASC;
END;
$$;


ALTER FUNCTION "rh"."get_exams_needing_notification"("p_company_id" "uuid", "p_days_ahead" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."get_exams_needing_notification"("p_company_id" "uuid", "p_days_ahead" integer) IS 'Busca exames que precisam de notificaÃ§Ã£o baseado nos dias de antecedÃªncia';



CREATE OR REPLACE FUNCTION "rh"."get_expired_exams"("p_company_id" "uuid") RETURNS TABLE("exam_id" "uuid", "employee_id" "uuid", "employee_name" character varying, "exam_type" character varying, "scheduled_date" "date", "days_overdue" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pe.id as exam_id,
        pe.employee_id,
        e.nome as employee_name,
        pe.tipo_exame as exam_type,
        pe.data_agendamento as scheduled_date,
        (CURRENT_DATE - pe.data_agendamento)::INTEGER as days_overdue
    FROM rh.periodic_exams pe
    JOIN rh.employees e ON pe.employee_id = e.id
    WHERE pe.company_id = p_company_id
    AND pe.status = 'agendado'
    AND pe.data_agendamento < CURRENT_DATE
    ORDER BY pe.data_agendamento ASC;
END;
$$;


ALTER FUNCTION "rh"."get_expired_exams"("p_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."get_expired_exams"("p_company_id" "uuid") IS 'Busca exames que estÃ£o vencidos (data de agendamento no passado)';



CREATE OR REPLACE FUNCTION "rh"."get_mandatory_trainings_pending"("p_employee_id" "uuid", "p_company_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
    v_trainings JSONB;
BEGIN
    -- Verificar acesso
    IF NOT EXISTS (
        SELECT 1 FROM public.user_companies
        WHERE user_id = auth.uid()
        AND company_id = p_company_id
        AND ativo = true
    ) THEN
        RETURN jsonb_build_object('error', true, 'message', 'Acesso negado');
    END IF;

    -- Buscar treinamentos obrigatórios pendentes
    SELECT jsonb_agg(
        jsonb_build_object(
            'training_id', t.id,
            'training_name', t.nome,
            'deadline', ta.data_limite,
            'progress', COALESCE(
                (SELECT progress_percent::TEXT 
                 FROM rh.calculate_training_progress(t.id, p_employee_id, p_company_id)
                 LIMIT 1), 
                '0'
            )
        )
    ) INTO v_trainings
    FROM rh.trainings t
    INNER JOIN rh.training_assignments ta ON t.id = ta.training_id
    WHERE ta.company_id = p_company_id
    AND ta.tipo_atribuicao = 'obrigatorio'
    AND t.is_active = true
    AND t.modalidade = 'online'
    AND (
        ta.employee_id = p_employee_id
        OR ta.position_id IN (SELECT position_id FROM rh.employees WHERE id = p_employee_id)
        OR ta.unit_id IN (SELECT unit_id FROM rh.employees WHERE id = p_employee_id)
    )
    AND NOT EXISTS (
        SELECT 1 FROM rh.training_progress tp
        WHERE tp.training_id = t.id
        AND tp.employee_id = p_employee_id
        AND NOT EXISTS (
            SELECT 1 FROM rh.training_content tc
            WHERE tc.training_id = t.id
            AND tc.is_active = true
            AND NOT EXISTS (
                SELECT 1 FROM rh.training_progress tp2
                WHERE tp2.content_id = tc.id
                AND tp2.employee_id = p_employee_id
                AND tp2.concluido = true
            )
        )
    );

    v_result := jsonb_build_object(
        'pending_trainings', COALESCE(v_trainings, '[]'::jsonb),
        'count', jsonb_array_length(COALESCE(v_trainings, '[]'::jsonb))
    );

    RETURN v_result;
END;
$$;


ALTER FUNCTION "rh"."get_mandatory_trainings_pending"("p_employee_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."get_monthly_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_year" integer, "p_month" integer) RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_total_horas_negativas DECIMAL(5,2) := 0;
  v_total_horas_extras_50 DECIMAL(5,2) := 0;
  v_saldo_mensal DECIMAL(6,2) := 0;
BEGIN
  -- Calcular primeiro e último dia do mês
  v_start_date := DATE_TRUNC('month', MAKE_DATE(p_year, p_month, 1));
  v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- Calcular horas negativas e extras 50% do mês
  -- IMPORTANTE: 
  -- - horas_negativas: somar todos os valores (já vêm como positivo no banco, ex: 17.91)
  -- - horas_extras_50: priorizar campo específico, usar horas_extras como fallback apenas se não houver horas_extras_100
  SELECT 
    COALESCE(SUM(COALESCE(horas_negativas, 0)), 0),
    COALESCE(SUM(
      CASE 
        WHEN COALESCE(horas_extras_50, 0) > 0 THEN horas_extras_50
        WHEN COALESCE(horas_extras_50, 0) = 0 THEN
          CASE 
            WHEN COALESCE(horas_extras, 0) > 0 AND COALESCE(horas_extras_100, 0) = 0 THEN horas_extras
            ELSE 0
          END
        ELSE 0
      END
    ), 0)
  INTO v_total_horas_negativas, v_total_horas_extras_50
  FROM rh.time_records
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id
    AND data_registro BETWEEN v_start_date AND v_end_date
    AND status = 'aprovado'; -- CRÍTICO: Apenas registros aprovados entram no banco de horas
    -- NOTA: Registros com status 'pendente' NÃO devem ser considerados no cálculo.
    -- Horas extras pendentes ainda não foram aprovadas pelo gestor e não entram no banco.
  
  -- Calcular saldo mensal isolado: horas extras 50% - horas negativas
  -- Não considera saldo anterior - apenas o impacto do mês
  v_saldo_mensal := v_total_horas_extras_50 - v_total_horas_negativas;
  
  -- Log para debug (remover em produção se necessário)
  RAISE NOTICE 'get_monthly_bank_hours_balance: employee_id=%, year=%, month=%, horas_negativas=%, horas_extras_50=%, saldo_mensal=%', 
    p_employee_id, p_year, p_month, v_total_horas_negativas, v_total_horas_extras_50, v_saldo_mensal;
  
  RETURN ROUND(v_saldo_mensal, 2);
END;
$$;


ALTER FUNCTION "rh"."get_monthly_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_year" integer, "p_month" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."get_monthly_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_year" integer, "p_month" integer) IS 'Calcula o saldo do banco de horas APENAS do mês específico (isolado).
   Não considera saldo anterior - mostra apenas o impacto do mês.
   Considera apenas horas extras 50% (não inclui 100%) e horas negativas.
   Fórmula: saldo_mensal = horas_extras_50 - horas_negativas.
   
   IMPORTANTE: Filtra por data_registro (data base do registro).
   Registros que cruzam meia-noite têm data_registro = data da entrada.
   Isso garante que registros que começam no mês sejam incluídos,
   mesmo que terminem no mês seguinte.';



CREATE OR REPLACE FUNCTION "rh"."get_pending_deductions"("p_company_id" "uuid", "p_employee_id" "uuid" DEFAULT NULL::"uuid", "p_mes_referencia" integer DEFAULT NULL::integer, "p_ano_referencia" integer DEFAULT NULL::integer) RETURNS TABLE("id" "uuid", "employee_id" "uuid", "employee_name" character varying, "tipo_deducao" character varying, "categoria" character varying, "descricao" "text", "valor_total" numeric, "valor_parcela" numeric, "parcela_atual" integer, "numero_parcelas" integer, "status" character varying, "data_origem" "date", "mes_referencia_folha" integer, "ano_referencia_folha" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ed.id,
        ed.employee_id,
        e.nome AS employee_name,
        ed.tipo_deducao,
        ed.categoria,
        ed.descricao,
        ed.valor_total,
        ed.valor_parcela,
        ed.parcela_atual,
        ed.numero_parcelas,
        ed.status,
        ed.data_origem,
        ed.mes_referencia_folha,
        ed.ano_referencia_folha
    FROM rh.employee_deductions ed
    JOIN rh.employees e ON e.id = ed.employee_id
    WHERE ed.company_id = p_company_id
      AND ed.aplicar_na_folha = true
      AND ed.status IN ('pendente', 'em_aberto', 'parcelado')
      AND (p_employee_id IS NULL OR ed.employee_id = p_employee_id)
      AND (
          (p_mes_referencia IS NULL AND p_ano_referencia IS NULL) OR
          (ed.mes_referencia_folha = p_mes_referencia AND ed.ano_referencia_folha = p_ano_referencia) OR
          (ed.mes_referencia_folha IS NULL AND ed.ano_referencia_folha IS NULL)
      )
    ORDER BY ed.data_origem DESC, ed.created_at DESC;
END;
$$;


ALTER FUNCTION "rh"."get_pending_deductions"("p_company_id" "uuid", "p_employee_id" "uuid", "p_mes_referencia" integer, "p_ano_referencia" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."get_pending_deductions"("p_company_id" "uuid", "p_employee_id" "uuid", "p_mes_referencia" integer, "p_ano_referencia" integer) IS 'Busca deduções pendentes de funcionários para aplicar na folha';



CREATE OR REPLACE FUNCTION "rh"."get_plan_value_by_age"("p_plan_id" "uuid", "p_idade" integer, "p_tipo" character varying DEFAULT 'titular'::character varying) RETURNS numeric
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
    v_valor DECIMAL(10,2);
    v_plan_valor_titular DECIMAL(10,2);
    v_plan_valor_dependente DECIMAL(10,2);
BEGIN
    -- Primeiro, tentar buscar valor específico da faixa etária
    SELECT 
        CASE 
            WHEN p_tipo = 'titular' THEN valor_titular
            ELSE valor_dependente
        END
    INTO v_valor
    FROM rh.medical_plan_age_ranges
    WHERE plan_id = p_plan_id
        AND ativo = true
        AND p_idade >= idade_min
        AND p_idade <= idade_max
    ORDER BY ordem ASC, idade_min ASC
    LIMIT 1;
    
    -- Se não encontrou faixa específica, usar valor padrão do plano
    IF v_valor IS NULL THEN
        SELECT 
            CASE 
                WHEN p_tipo = 'titular' THEN valor_titular
                ELSE valor_dependente
            END
        INTO v_valor
        FROM rh.medical_plans
        WHERE id = p_plan_id;
    END IF;
    
    RETURN COALESCE(v_valor, 0);
END;
$$;


ALTER FUNCTION "rh"."get_plan_value_by_age"("p_plan_id" "uuid", "p_idade" integer, "p_tipo" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."get_plan_value_by_age"("p_plan_id" "uuid", "p_idade" integer, "p_tipo" character varying) IS 'Retorna o valor mensal do plano para uma idade específica. Primeiro busca em faixas etárias específicas, depois usa valor padrão do plano.';



CREATE OR REPLACE FUNCTION "rh"."get_time_record_settings"("p_company_id" "uuid") RETURNS TABLE("id" "uuid", "company_id" "uuid", "janela_tempo_marcacoes" integer, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.id,
        ts.company_id,
        ts.janela_tempo_marcacoes,
        ts.created_at,
        ts.updated_at
    FROM rh.time_record_settings ts
    WHERE ts.company_id = p_company_id
    
    UNION ALL
    
    -- Se nÃ£o encontrar, retornar configuraÃ§Ã£o padrÃ£o
    SELECT 
        gen_random_uuid() as id,
        p_company_id as company_id,
        24 as janela_tempo_marcacoes, -- PadrÃ£o: 24 horas
        NOW() as created_at,
        NOW() as updated_at
    WHERE NOT EXISTS (
        SELECT 1 FROM rh.time_record_settings trs
        WHERE trs.company_id = p_company_id
    )
    LIMIT 1;
END;
$$;


ALTER FUNCTION "rh"."get_time_record_settings"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."get_training_dashboard_stats"("p_company_id" "uuid", "p_training_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_result JSONB;
    v_total_trainings INTEGER;
    v_trainings_to_start INTEGER;
    v_trainings_in_progress INTEGER;
    v_trainings_completed INTEGER;
    v_total_enrollments INTEGER;
    v_total_certificates INTEGER;
    v_avg_completion_rate DECIMAL;
    v_avg_reaction_score DECIMAL;
BEGIN
    -- Verificar acesso
    IF NOT EXISTS (
        SELECT 1 FROM public.user_companies
        WHERE user_id = auth.uid()
        AND company_id = p_company_id
        AND ativo = true
    ) THEN
        RETURN jsonb_build_object('error', true, 'message', 'Acesso negado');
    END IF;

    -- Total de treinamentos
    SELECT COUNT(*) INTO v_total_trainings
    FROM rh.trainings
    WHERE company_id = p_company_id
    AND is_active = true
    AND (p_training_id IS NULL OR id = p_training_id)
    AND modalidade = 'online';

    -- Treinamentos a iniciar (inscritos mas sem progresso)
    SELECT COUNT(DISTINCT te.training_id) INTO v_trainings_to_start
    FROM rh.training_enrollments te
    LEFT JOIN rh.training_progress tp ON te.training_id = tp.training_id 
        AND te.employee_id = tp.employee_id
    WHERE te.company_id = p_company_id
    AND te.is_active = true
    AND te.status IN ('inscrito', 'confirmado')
    AND tp.id IS NULL
    AND (p_training_id IS NULL OR te.training_id = p_training_id);

    -- Treinamentos em andamento (com progresso mas não concluído)
    SELECT COUNT(DISTINCT tp.training_id) INTO v_trainings_in_progress
    FROM rh.training_progress tp
    INNER JOIN rh.training_enrollments te ON tp.training_id = te.training_id 
        AND tp.employee_id = te.employee_id
    WHERE tp.company_id = p_company_id
    AND te.is_active = true
    AND EXISTS (
        SELECT 1 FROM rh.training_progress tp2
        WHERE tp2.training_id = tp.training_id
        AND tp2.employee_id = tp.employee_id
        AND tp2.concluido = false
    )
    AND (p_training_id IS NULL OR tp.training_id = p_training_id);

    -- Treinamentos finalizados (todos os conteúdos concluídos)
    SELECT COUNT(DISTINCT tp.training_id) INTO v_trainings_completed
    FROM rh.training_progress tp
    INNER JOIN rh.training_enrollments te ON tp.training_id = te.training_id 
        AND tp.employee_id = te.employee_id
    WHERE tp.company_id = p_company_id
    AND te.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM rh.training_content tc
        WHERE tc.training_id = tp.training_id
        AND tc.is_active = true
        AND NOT EXISTS (
            SELECT 1 FROM rh.training_progress tp2
            WHERE tp2.content_id = tc.id
            AND tp2.employee_id = tp.employee_id
            AND tp2.concluido = true
        )
    )
    AND (p_training_id IS NULL OR tp.training_id = p_training_id);

    -- Total de inscrições
    SELECT COUNT(*) INTO v_total_enrollments
    FROM rh.training_enrollments
    WHERE company_id = p_company_id
    AND is_active = true
    AND (p_training_id IS NULL OR training_id = p_training_id);

    -- Total de certificados
    SELECT COUNT(*) INTO v_total_certificates
    FROM rh.training_certificates
    WHERE company_id = p_company_id
    AND status = 'valido'
    AND (p_training_id IS NULL OR training_id = p_training_id);

    -- Taxa média de conclusão
    SELECT COALESCE(AVG(
        CASE 
            WHEN v_total_trainings > 0 THEN 
                (v_trainings_completed::DECIMAL / v_total_enrollments::DECIMAL) * 100
            ELSE 0
        END
    ), 0) INTO v_avg_completion_rate;

    -- Média de avaliação de reação
    SELECT COALESCE(AVG(nota_geral), 0) INTO v_avg_reaction_score
    FROM rh.training_reaction_evaluations
    WHERE company_id = p_company_id
    AND (p_training_id IS NULL OR training_id = p_training_id);

    -- Construir resultado
    v_result := jsonb_build_object(
        'total_trainings', v_total_trainings,
        'trainings_to_start', v_trainings_to_start,
        'trainings_in_progress', v_trainings_in_progress,
        'trainings_completed', v_trainings_completed,
        'total_enrollments', v_total_enrollments,
        'total_certificates', v_total_certificates,
        'avg_completion_rate', ROUND(v_avg_completion_rate, 2),
        'avg_reaction_score', ROUND(v_avg_reaction_score, 2)
    );

    RETURN v_result;
END;
$$;


ALTER FUNCTION "rh"."get_training_dashboard_stats"("p_company_id" "uuid", "p_training_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."get_training_notifications"("p_user_id" "uuid", "p_company_id" "uuid", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "training_id" "uuid", "training_name" character varying, "titulo" "text", "mensagem" "text", "data_envio" timestamp with time zone, "status" character varying, "tipo" character varying)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tnh.id,
        tnh.training_id,
        t.nome as training_name,
        tnh.titulo,
        tnh.mensagem,
        tnh.data_envio,
        tnh.status,
        tnt.tipo
    FROM rh.training_notification_history tnh
    JOIN rh.training_notification_types tnt ON tnt.id = tnh.notification_type_id
    LEFT JOIN rh.trainings t ON t.id = tnh.training_id
    WHERE tnh.user_id = p_user_id
    AND tnh.company_id = p_company_id
    ORDER BY tnh.data_envio DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "rh"."get_training_notifications"("p_user_id" "uuid", "p_company_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."get_training_settings"("p_company_id" "uuid") RETURNS TABLE("id" "uuid", "company_id" "uuid", "notification_enabled" boolean, "email_notifications" boolean, "push_notifications" boolean, "reminder_days_before" integer, "reminder_days_after" integer, "auto_enrollment" boolean, "require_approval" boolean, "max_participants" integer, "min_attendance_percentage" integer, "certificate_auto_generate" boolean, "certificate_validity_days" integer, "training_duration_default" numeric, "evaluation_required" boolean, "feedback_required" boolean, "auto_archive_days" integer, "allow_self_enrollment" boolean, "allow_cancellation" boolean, "cancellation_deadline_hours" integer, "is_active" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.id,
        ts.company_id,
        ts.notification_enabled,
        ts.email_notifications,
        ts.push_notifications,
        ts.reminder_days_before,
        ts.reminder_days_after,
        ts.auto_enrollment,
        ts.require_approval,
        ts.max_participants,
        ts.min_attendance_percentage,
        ts.certificate_auto_generate,
        ts.certificate_validity_days,
        ts.training_duration_default,
        ts.evaluation_required,
        ts.feedback_required,
        ts.auto_archive_days,
        ts.allow_self_enrollment,
        ts.allow_cancellation,
        ts.cancellation_deadline_hours,
        ts.is_active,
        ts.created_at,
        ts.updated_at
    FROM rh.training_settings ts
    WHERE ts.company_id = p_company_id
    AND ts.is_active = true
    ORDER BY ts.updated_at DESC
    LIMIT 1;
END;
$$;


ALTER FUNCTION "rh"."get_training_settings"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."get_type_bank_hours_assignments_with_relations"("p_type_id" "uuid", "p_company_id" "uuid") RETURNS TABLE("id" "uuid", "employee_id" "uuid", "company_id" "uuid", "bank_hours_type_id" "uuid", "is_active" boolean, "assigned_at" timestamp with time zone, "assigned_by" "uuid", "notes" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "employee_nome" character varying, "employee_matricula" character varying, "employee_cpf" character varying, "type_name" character varying, "type_code" character varying, "type_description" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.employee_id,
    a.company_id,
    a.bank_hours_type_id,
    a.is_active,
    a.assigned_at,
    a.assigned_by,
    a.notes,
    a.created_at,
    a.updated_at,
    -- Dados do funcionário
    e.nome as employee_nome,
    e.matricula as employee_matricula,
    e.cpf as employee_cpf,
    -- Dados do tipo
    t.name as type_name,
    t.code as type_code,
    t.description as type_description
  FROM rh.bank_hours_assignments a
  LEFT JOIN rh.employees e ON a.employee_id = e.id
  LEFT JOIN rh.bank_hours_types t ON a.bank_hours_type_id = t.id
  WHERE a.bank_hours_type_id = p_type_id 
    AND a.company_id = p_company_id
  ORDER BY a.assigned_at DESC;
END;
$$;


ALTER FUNCTION "rh"."get_type_bank_hours_assignments_with_relations"("p_type_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."get_work_shift_hours_for_day"("p_work_shift_id" "uuid", "p_day_of_week" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_horarios_por_dia JSONB;
  v_day_hours JSONB;
  v_hora_inicio TIME;
  v_hora_fim TIME;
  v_intervalo_inicio TIME;
  v_intervalo_fim TIME;
  v_horas_diarias NUMERIC(4,2);
BEGIN
  -- Buscar horários por dia do turno
  SELECT horarios_por_dia, hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, horas_diarias
  INTO v_horarios_por_dia, v_hora_inicio, v_hora_fim, v_intervalo_inicio, v_intervalo_fim, v_horas_diarias
  FROM rh.work_shifts
  WHERE id = p_work_shift_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Se existe horário específico para o dia, retornar
  IF v_horarios_por_dia IS NOT NULL AND v_horarios_por_dia ? p_day_of_week::TEXT THEN
    v_day_hours := v_horarios_por_dia->p_day_of_week::TEXT;
    RETURN v_day_hours;
  END IF;

  -- Caso contrário, retornar horário padrão
  RETURN jsonb_build_object(
    'hora_inicio', v_hora_inicio::TEXT,
    'hora_fim', v_hora_fim::TEXT,
    'intervalo_inicio', COALESCE(v_intervalo_inicio::TEXT, NULL),
    'intervalo_fim', COALESCE(v_intervalo_fim::TEXT, NULL),
    'horas_diarias', v_horas_diarias
  );
END;
$$;


ALTER FUNCTION "rh"."get_work_shift_hours_for_day"("p_work_shift_id" "uuid", "p_day_of_week" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."get_work_shift_hours_for_day"("p_work_shift_id" "uuid", "p_day_of_week" integer) IS 'Retorna os horários de um turno para um dia específico da semana. Se não houver horário específico, retorna o horário padrão';



CREATE TABLE IF NOT EXISTS "rh"."holidays" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "data" "date" NOT NULL,
    "tipo" character varying(30) NOT NULL,
    "descricao" "text",
    "ativo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "uf" character varying(2),
    "municipio" character varying(100),
    CONSTRAINT "holidays_estadual_uf_check" CHECK (((("tipo")::"text" <> 'estadual'::"text") OR ((("tipo")::"text" = 'estadual'::"text") AND ("uf" IS NOT NULL) AND ("length"(TRIM(BOTH FROM "uf")) = 2)))),
    CONSTRAINT "holidays_municipal_location_check" CHECK (((("tipo")::"text" <> 'municipal'::"text") OR ((("tipo")::"text" = 'municipal'::"text") AND ("uf" IS NOT NULL) AND ("length"(TRIM(BOTH FROM "uf")) = 2) AND ("municipio" IS NOT NULL) AND ("length"(TRIM(BOTH FROM "municipio")) > 0)))),
    CONSTRAINT "holidays_nacional_location_check" CHECK (((("tipo")::"text" <> 'nacional'::"text") OR ((("tipo")::"text" = 'nacional'::"text") AND ("uf" IS NULL) AND ("municipio" IS NULL)))),
    CONSTRAINT "holidays_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['nacional'::character varying, 'estadual'::character varying, 'municipal'::character varying, 'pontos_facultativos'::character varying, 'outros'::character varying])::"text"[])))
);


ALTER TABLE "rh"."holidays" OWNER TO "postgres";


COMMENT ON TABLE "rh"."holidays" IS 'Feriados e pontos facultativos para cÃ¡lculos de folha';



COMMENT ON COLUMN "rh"."holidays"."nome" IS 'Nome do feriado';



COMMENT ON COLUMN "rh"."holidays"."data" IS 'Data do feriado';



COMMENT ON COLUMN "rh"."holidays"."tipo" IS 'Tipo: nacional, estadual, municipal, pontos_facultativos, outros';



COMMENT ON COLUMN "rh"."holidays"."ativo" IS 'Se o feriado estÃ¡ ativo para cÃ¡lculos';



COMMENT ON COLUMN "rh"."holidays"."uf" IS 'UF (sigla do estado) - obrigatÃ³rio para feriados estaduais e municipais';



COMMENT ON COLUMN "rh"."holidays"."municipio" IS 'Nome do municÃ­pio - obrigatÃ³rio para feriados municipais';



CREATE OR REPLACE FUNCTION "rh"."holiday_applies_to_employee"("holiday_record" "rh"."holidays", "employee_estado" character varying, "employee_cidade" character varying) RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  -- Feriados nacionais se aplicam a todos
  IF holiday_record.tipo = 'nacional' THEN
    RETURN true;
  END IF;
  
  -- Feriados estaduais se aplicam apenas se o estado do funcionÃ¡rio corresponder
  IF holiday_record.tipo = 'estadual' THEN
    RETURN holiday_record.uf IS NOT NULL 
      AND employee_estado IS NOT NULL 
      AND UPPER(TRIM(holiday_record.uf)) = UPPER(TRIM(employee_estado));
  END IF;
  
  -- Feriados municipais se aplicam apenas se estado E municÃ­pio corresponderem
  IF holiday_record.tipo = 'municipal' THEN
    RETURN holiday_record.uf IS NOT NULL 
      AND holiday_record.municipio IS NOT NULL
      AND employee_estado IS NOT NULL 
      AND employee_cidade IS NOT NULL
      AND UPPER(TRIM(holiday_record.uf)) = UPPER(TRIM(employee_estado))
      AND UPPER(TRIM(holiday_record.municipio)) = UPPER(TRIM(employee_cidade));
  END IF;
  
  -- Para outros tipos (pontos_facultativos, outros), considerar como nacionais
  -- ou implementar lÃ³gica especÃ­fica conforme necessÃ¡rio
  RETURN true;
END;
$$;


ALTER FUNCTION "rh"."holiday_applies_to_employee"("holiday_record" "rh"."holidays", "employee_estado" character varying, "employee_cidade" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."holiday_applies_to_employee"("holiday_record" "rh"."holidays", "employee_estado" character varying, "employee_cidade" character varying) IS 'Verifica se um feriado se aplica a um funcionÃ¡rio baseado na localizaÃ§Ã£o (estado e municÃ­pio)';



CREATE OR REPLACE FUNCTION "rh"."import_legacy_bank_hours"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_reference_date" "date", "p_description" "text" DEFAULT NULL::"text", "p_created_by" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "rh"."import_legacy_bank_hours"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_reference_date" "date", "p_description" "text", "p_created_by" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."import_legacy_bank_hours"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_reference_date" "date", "p_description" "text", "p_created_by" "uuid") IS 'Importa horas legadas lançando ajuste manual e registrando origem';



CREATE OR REPLACE FUNCTION "rh"."initialize_bank_hours_config"("p_employee_id" "uuid", "p_company_id" "uuid", "p_has_bank_hours" boolean DEFAULT true, "p_accumulation_period_months" integer DEFAULT 12, "p_max_accumulation_hours" numeric DEFAULT 40.00, "p_compensation_rate" numeric DEFAULT 1.00) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_config_id UUID;
  v_balance_id UUID;
BEGIN
  -- Inserir ou atualizar configuraÃ§Ã£o
  INSERT INTO rh.bank_hours_config (
    employee_id, company_id, has_bank_hours, 
    accumulation_period_months, max_accumulation_hours, compensation_rate
  ) VALUES (
    p_employee_id, p_company_id, p_has_bank_hours,
    p_accumulation_period_months, p_max_accumulation_hours, p_compensation_rate
  )
  ON CONFLICT (employee_id, company_id) 
  DO UPDATE SET
    has_bank_hours = EXCLUDED.has_bank_hours,
    accumulation_period_months = EXCLUDED.accumulation_period_months,
    max_accumulation_hours = EXCLUDED.max_accumulation_hours,
    compensation_rate = EXCLUDED.compensation_rate,
    updated_at = NOW()
  RETURNING id INTO v_config_id;

  -- Inicializar saldo se nÃ£o existir
  INSERT INTO rh.bank_hours_balance (employee_id, company_id)
  VALUES (p_employee_id, p_company_id)
  ON CONFLICT (employee_id, company_id) DO NOTHING
  RETURNING id INTO v_balance_id;

  RETURN v_config_id;
END;
$$;


ALTER FUNCTION "rh"."initialize_bank_hours_config"("p_employee_id" "uuid", "p_company_id" "uuid", "p_has_bank_hours" boolean, "p_accumulation_period_months" integer, "p_max_accumulation_hours" numeric, "p_compensation_rate" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."is_holiday"("p_date" "date", "p_company_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM rh.holidays 
    WHERE company_id = p_company_id 
      AND data = p_date 
      AND ativo = true
  );
END;
$$;


ALTER FUNCTION "rh"."is_holiday"("p_date" "date", "p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."is_rest_day"("p_employee_id" "uuid", "p_company_id" "uuid", "p_date" "date") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_dias_semana INTEGER[];
  v_day_of_week INTEGER;
  v_tipo_escala VARCHAR(50);
  v_dias_trabalho INTEGER;
  v_dias_folga INTEGER;
  v_ciclo_dias INTEGER;
  v_data_inicio DATE;
  v_dias_desde_inicio INTEGER;
  v_posicao_no_ciclo INTEGER;
BEGIN
  -- Buscar informações do turno do funcionário
  SELECT 
    ws.dias_semana,
    ws.tipo_escala,
    ws.dias_trabalho,
    ws.dias_folga,
    ws.ciclo_dias,
    es.data_inicio
  INTO 
    v_dias_semana,
    v_tipo_escala,
    v_dias_trabalho,
    v_dias_folga,
    v_ciclo_dias,
    v_data_inicio
  FROM rh.employee_shifts es
  INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
  WHERE es.funcionario_id = p_employee_id
    AND es.company_id = p_company_id
    AND es.ativo = true
    AND es.data_inicio <= p_date
    AND (es.data_fim IS NULL OR es.data_fim >= p_date)
  ORDER BY es.data_inicio DESC
  LIMIT 1;

  -- Se não encontrou turno, retornar false
  IF v_tipo_escala IS NULL THEN
    RETURN false;
  END IF;

  -- Para escalas fixas, usar lógica baseada em dias da semana
  IF v_tipo_escala = 'fixa' THEN
    -- Se não tem dias_semana definido, usar padrão (Segunda a Sexta)
    IF v_dias_semana IS NULL OR array_length(v_dias_semana, 1) = 0 THEN
      v_dias_semana := ARRAY[1, 2, 3, 4, 5];
    END IF;

    -- Converter dia da semana (0=Domingo -> 7, 1=Segunda -> 1, etc.)
    v_day_of_week := CASE 
      WHEN EXTRACT(DOW FROM p_date) = 0 THEN 7
      ELSE EXTRACT(DOW FROM p_date)::INTEGER
    END;

    -- Se o dia da semana não está nos dias de trabalho, é folga
    RETURN NOT (v_day_of_week = ANY(v_dias_semana));
  ELSE
    -- Para escalas rotativas (flexíveis), calcular baseado no ciclo
    -- Usar valores padrão se não estiverem definidos
    IF v_dias_trabalho IS NULL OR v_dias_trabalho = 0 THEN
      -- Valores padrão baseados no tipo de escala
      CASE v_tipo_escala
        WHEN 'flexivel_6x1' THEN
          v_dias_trabalho := 6;
          v_dias_folga := 1;
          v_ciclo_dias := 7;
        WHEN 'flexivel_5x2' THEN
          v_dias_trabalho := 5;
          v_dias_folga := 2;
          v_ciclo_dias := 7;
        WHEN 'flexivel_4x3' THEN
          v_dias_trabalho := 4;
          v_dias_folga := 3;
          v_ciclo_dias := 7;
        WHEN 'escala_12x36' THEN
          v_dias_trabalho := 1;
          v_dias_folga := 2;
          v_ciclo_dias := 3;
        WHEN 'escala_24x48' THEN
          v_dias_trabalho := 1;
          v_dias_folga := 2;
          v_ciclo_dias := 3;
        ELSE
          -- Personalizada ou desconhecida: usar padrão 5x2
          v_dias_trabalho := 5;
          v_dias_folga := 2;
          v_ciclo_dias := 7;
      END CASE;
    END IF;

    -- Garantir que ciclo_dias está definido
    IF v_ciclo_dias IS NULL OR v_ciclo_dias = 0 THEN
      v_ciclo_dias := v_dias_trabalho + v_dias_folga;
    END IF;

    -- Se não tem data_inicio, usar a data atual como referência
    -- (não ideal, mas melhor que retornar erro)
    IF v_data_inicio IS NULL THEN
      v_data_inicio := p_date;
    END IF;

    -- Calcular quantos dias se passaram desde o início do ciclo
    v_dias_desde_inicio := p_date - v_data_inicio;

    -- Se a data é anterior ao início do turno, não é folga (não deveria acontecer, mas por segurança)
    IF v_dias_desde_inicio < 0 THEN
      RETURN false;
    END IF;

    -- Calcular a posição no ciclo (1 = primeiro dia do ciclo)
    -- Usar módulo para encontrar a posição no ciclo atual
    -- Exemplo: se ciclo é 7 dias e se passaram 10 dias, posição = (10 % 7) + 1 = 4
    v_posicao_no_ciclo := (v_dias_desde_inicio % v_ciclo_dias) + 1;

    -- Se a posição está dentro dos dias de trabalho, não é folga
    -- Se está além dos dias de trabalho, é folga
    RETURN v_posicao_no_ciclo > v_dias_trabalho;
  END IF;
END;
$$;


ALTER FUNCTION "rh"."is_rest_day"("p_employee_id" "uuid", "p_company_id" "uuid", "p_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."is_rest_day"("p_employee_id" "uuid", "p_company_id" "uuid", "p_date" "date") IS 'Verifica se uma data é dia de folga para um funcionário. 
Suporta escalas fixas (baseado em dias da semana) e escalas rotativas (baseado em ciclos).
Para escalas rotativas, calcula a posição no ciclo a partir da data de início do turno do funcionário.';



CREATE OR REPLACE FUNCTION "rh"."is_sunday"("p_date" "date") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- PostgreSQL: EXTRACT(DOW FROM date) retorna 0=Domingo
  RETURN EXTRACT(DOW FROM p_date) = 0;
END;
$$;


ALTER FUNCTION "rh"."is_sunday"("p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."mark_content_as_completed"("p_training_id" "uuid", "p_content_id" "uuid", "p_employee_id" "uuid", "p_company_id" "uuid", "p_tempo_assistido_segundos" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_enrollment_id UUID;
    v_progress_id UUID;
    v_content RECORD;
    v_result JSONB;
BEGIN
    -- Verificar acesso
    IF NOT EXISTS (
        SELECT 1 FROM public.user_companies
        WHERE user_id = auth.uid()
        AND company_id = p_company_id
        AND ativo = true
    ) THEN
        RETURN jsonb_build_object('error', true, 'message', 'Acesso negado');
    END IF;

    -- Verificar se é o próprio usuário
    IF NOT EXISTS (
        SELECT 1 FROM rh.employees
        WHERE id = p_employee_id
        AND user_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object('error', true, 'message', 'Acesso negado');
    END IF;

    -- Buscar conteúdo
    SELECT * INTO v_content
    FROM rh.training_content
    WHERE id = p_content_id
    AND training_id = p_training_id
    AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', true, 'message', 'Conteúdo não encontrado');
    END IF;

    -- Buscar ou criar inscrição
    SELECT id INTO v_enrollment_id
    FROM rh.training_enrollments
    WHERE training_id = p_training_id
    AND employee_id = p_employee_id
    AND company_id = p_company_id
    LIMIT 1;

    IF v_enrollment_id IS NULL THEN
        INSERT INTO rh.training_enrollments (
            company_id, training_id, employee_id, status
        ) VALUES (
            p_company_id, p_training_id, p_employee_id, 'confirmado'
        ) RETURNING id INTO v_enrollment_id;
    END IF;

    -- Buscar ou criar progresso
    SELECT id INTO v_progress_id
    FROM rh.training_progress
    WHERE training_id = p_training_id
    AND content_id = p_content_id
    AND employee_id = p_employee_id;

    IF v_progress_id IS NULL THEN
        INSERT INTO rh.training_progress (
            company_id, training_id, content_id, employee_id, 
            enrollment_id, status, data_inicio, tempo_assistido_segundos
        ) VALUES (
            p_company_id, p_training_id, p_content_id, p_employee_id,
            v_enrollment_id, 'em_andamento', NOW(), p_tempo_assistido_segundos
        ) RETURNING id INTO v_progress_id;
    END IF;

    -- Atualizar progresso como concluído
    UPDATE rh.training_progress
    SET 
        concluido = true,
        status = 'concluido',
        percentual_concluido = 100,
        tempo_assistido_segundos = GREATEST(tempo_assistido_segundos, p_tempo_assistido_segundos),
        data_conclusao = NOW(),
        data_ultima_atualizacao = NOW()
    WHERE id = v_progress_id;

    -- Calcular progresso geral
    SELECT * INTO v_result
    FROM rh.calculate_training_progress(p_training_id, p_employee_id, p_company_id);

    RETURN jsonb_build_object(
        'success', true,
        'progress_id', v_progress_id,
        'overall_progress', v_result
    );
END;
$$;


ALTER FUNCTION "rh"."mark_content_as_completed"("p_training_id" "uuid", "p_content_id" "uuid", "p_employee_id" "uuid", "p_company_id" "uuid", "p_tempo_assistido_segundos" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."migrate_bank_hours_configs_to_types"("p_company_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_migrated_count INTEGER := 0;
  v_default_type_id UUID;
  v_config_record RECORD;
BEGIN
  -- Criar tipo padrÃ£o para a empresa
  INSERT INTO rh.bank_hours_types (
    company_id, name, description, code, is_default,
    has_bank_hours, accumulation_period_months, max_accumulation_hours,
    compensation_rate, auto_compensate, compensation_priority,
    expires_after_months, allow_negative_balance
  ) VALUES (
    p_company_id, 'PadrÃ£o', 'Tipo padrÃ£o de banco de horas', 'PADRAO', true,
    true, 12, 40.00, 1.00, false, 'fifo', 12, false
  ) RETURNING id INTO v_default_type_id;

  -- Migrar configuraÃ§Ãµes existentes
  FOR v_config_record IN
    SELECT * FROM rh.bank_hours_config 
    WHERE company_id = p_company_id
  LOOP
    -- Criar vÃ­nculo com o tipo padrÃ£o
    INSERT INTO rh.bank_hours_assignments (
      employee_id, company_id, bank_hours_type_id, is_active
    ) VALUES (
      v_config_record.employee_id, 
      p_company_id, 
      v_default_type_id, 
      v_config_record.is_active
    );
    
    v_migrated_count := v_migrated_count + 1;
  END LOOP;

  RETURN v_migrated_count;
END;
$$;


ALTER FUNCTION "rh"."migrate_bank_hours_configs_to_types"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."process_bank_hours_expiration"("p_company_id" "uuid", "p_expiration_date" "date" DEFAULT CURRENT_DATE) RETURNS TABLE("employees_processed" integer, "hours_expired" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_employee_record RECORD;
  v_hours_to_expire DECIMAL(5,2);
  v_total_employees INTEGER := 0;
  v_total_hours_expired DECIMAL(8,2) := 0;
BEGIN
  -- Processar cada colaborador com banco de horas
  FOR v_employee_record IN
    SELECT 
      b.employee_id,
      b.company_id,
      b.current_balance,
      c.expires_after_months,
      c.accumulation_period_months
    FROM rh.bank_hours_balance b
    JOIN rh.bank_hours_config c ON b.employee_id = c.employee_id AND b.company_id = c.company_id
    WHERE b.company_id = p_company_id
      AND c.is_active = true
      AND c.has_bank_hours = true
      AND b.current_balance > 0
  LOOP
    -- Calcular horas que devem expirar
    v_hours_to_expire := 0;
    
    -- LÃ³gica de expiraÃ§Ã£o baseada no perÃ­odo de acumulaÃ§Ã£o
    -- Por simplicidade, vamos expirar horas antigas baseado na data de cÃ¡lculo
    IF v_employee_record.current_balance > 0 THEN
      -- Verificar se hÃ¡ horas que devem expirar
      -- Esta Ã© uma implementaÃ§Ã£o simplificada - pode ser refinada conforme necessÃ¡rio
      v_hours_to_expire := LEAST(
        v_employee_record.current_balance,
        v_employee_record.current_balance * 0.1 -- Expirar 10% das horas por mÃªs
      );
    END IF;

    -- Registrar expiraÃ§Ã£o se houver horas para expirar
    IF v_hours_to_expire > 0 THEN
      INSERT INTO rh.bank_hours_transactions (
        employee_id, company_id, transaction_type, transaction_date,
        hours_amount, description, is_automatic
      ) VALUES (
        v_employee_record.employee_id, v_employee_record.company_id, 'expiration', p_expiration_date,
        -v_hours_to_expire, 'ExpiraÃ§Ã£o automÃ¡tica de horas do banco', true
      );

      -- Atualizar saldo
      UPDATE rh.bank_hours_balance SET
        current_balance = current_balance - v_hours_to_expire,
        expired_hours = expired_hours + v_hours_to_expire,
        updated_at = NOW()
      WHERE employee_id = v_employee_record.employee_id 
        AND company_id = v_employee_record.company_id;

      v_total_hours_expired := v_total_hours_expired + v_hours_to_expire;
    END IF;

    v_total_employees := v_total_employees + 1;
  END LOOP;

  RETURN QUERY SELECT v_total_employees, v_total_hours_expired;
END;
$$;


ALTER FUNCTION "rh"."process_bank_hours_expiration"("p_company_id" "uuid", "p_expiration_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."process_company_semester_closure"("p_company_id" "uuid", "p_closure_date" "date" DEFAULT CURRENT_DATE) RETURNS TABLE("employees_processed" integer, "closures_created" integer, "total_hours_50_paid" numeric, "total_hours_100_paid" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_employee_record RECORD;
  v_closure_id UUID;
  v_total_employees INTEGER := 0;
  v_total_closures INTEGER := 0;
  v_total_50 DECIMAL(8,2) := 0;
  v_total_100 DECIMAL(8,2) := 0;
BEGIN
  -- Processar cada funcion??rio com banco de horas
  FOR v_employee_record IN
    SELECT DISTINCT e.id as employee_id
    FROM rh.employees e
    INNER JOIN rh.bank_hours_config bhc ON bhc.employee_id = e.id
    WHERE e.company_id = p_company_id
      AND e.status = 'ativo'
      AND bhc.is_active = true
      AND bhc.has_bank_hours = true
  LOOP
    BEGIN
      v_closure_id := rh.process_semester_bank_hours_closure(
        v_employee_record.employee_id,
        p_company_id,
        p_closure_date
      );

      -- Somar horas do fechamento
      SELECT 
        total_hours_50_paid,
        total_hours_100_paid
      INTO 
        v_total_50,
        v_total_100
      FROM rh.bank_hours_closure
      WHERE id = v_closure_id;

      v_total_employees := v_total_employees + 1;
      v_total_closures := v_total_closures + 1;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log erro mas continua processamento
        RAISE NOTICE 'Erro ao processar fechamento para funcion??rio %: %', v_employee_record.employee_id, SQLERRM;
    END;
  END LOOP;

  -- Calcular totais
  SELECT 
    COALESCE(SUM(total_hours_50_paid), 0),
    COALESCE(SUM(total_hours_100_paid), 0)
  INTO 
    v_total_50,
    v_total_100
  FROM rh.bank_hours_closure
  WHERE company_id = p_company_id
    AND closure_date = p_closure_date
    AND status = 'completed';

  RETURN QUERY SELECT v_total_employees, v_total_closures, v_total_50, v_total_100;
END;
$$;


ALTER FUNCTION "rh"."process_company_semester_closure"("p_company_id" "uuid", "p_closure_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."process_company_semester_closure"("p_company_id" "uuid", "p_closure_date" "date") IS 'Processa fechamento semestral do banco de horas para toda a empresa.';



CREATE OR REPLACE FUNCTION "rh"."process_daily_bank_hours"("p_employee_id" "uuid", "p_company_id" "uuid", "p_date" "date") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_time_record_id UUID;
  v_horas_para_banco DECIMAL(4,2);
  v_config rh.bank_hours_config%ROWTYPE;
  v_balance rh.bank_hours_balance%ROWTYPE;
BEGIN
  -- Buscar registro de ponto do dia
  SELECT id, horas_para_banco
  INTO v_time_record_id, v_horas_para_banco
  FROM rh.time_records
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id
    AND data_registro = p_date
    AND status = 'aprovado';

  -- Se n??o h?? registro ou n??o h?? horas para banco, retornar
  IF v_time_record_id IS NULL OR v_horas_para_banco <= 0 THEN
    RETURN;
  END IF;

  -- Verificar se tem banco de horas configurado
  SELECT * INTO v_config
  FROM rh.bank_hours_config
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id
    AND is_active = true
    AND has_bank_hours = true;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Buscar ou criar saldo
  SELECT * INTO v_balance
  FROM rh.bank_hours_balance
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id;

  IF NOT FOUND THEN
    INSERT INTO rh.bank_hours_balance (employee_id, company_id, current_balance)
    VALUES (p_employee_id, p_company_id, 0)
    RETURNING * INTO v_balance;
  END IF;

  -- Verificar limite m??ximo de acumula????o
  IF v_balance.accumulated_hours + v_horas_para_banco > v_config.max_accumulation_hours THEN
    -- Exceder limite, n??o acumular
    RETURN;
  END IF;

  -- Criar transa????o de acumula????o
  INSERT INTO rh.bank_hours_transactions (
    employee_id,
    company_id,
    transaction_type,
    transaction_date,
    hours_amount,
    time_record_id,
    overtime_percentage,
    expires_at,
    description,
    is_automatic
  ) VALUES (
    p_employee_id,
    p_company_id,
    'accumulation',
    p_date,
    v_horas_para_banco,
    v_time_record_id,
    50,
    p_date + INTERVAL '6 months',
    'Acumula????o di??ria de horas extras 50%',
    true
  );

  -- Atualizar saldo
  UPDATE rh.bank_hours_balance
  SET 
    current_balance = current_balance + v_horas_para_banco,
    accumulated_hours = accumulated_hours + v_horas_para_banco,
    last_calculation_date = p_date,
    updated_at = NOW()
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id;

END;
$$;


ALTER FUNCTION "rh"."process_daily_bank_hours"("p_employee_id" "uuid", "p_company_id" "uuid", "p_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."process_daily_bank_hours"("p_employee_id" "uuid", "p_company_id" "uuid", "p_date" "date") IS 'Processa banco de horas di??rio para um funcion??rio.
   Apenas horas 50% s??o acumuladas no banco.';



CREATE OR REPLACE FUNCTION "rh"."process_monthly_bank_hours"("p_company_id" "uuid", "p_month_year" character varying) RETURNS TABLE("employees_processed" integer, "total_hours_accumulated" numeric, "total_hours_debit" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_month_start DATE;
  v_month_end DATE;
  v_employee_record RECORD;
  v_total_employees INTEGER := 0;
  v_total_accumulated DECIMAL(8,2) := 0;
  v_total_debit DECIMAL(8,2) := 0;
  v_result RECORD;
BEGIN
  -- Calcular primeiro e ??ltimo dia do m??s
  v_month_start := (p_month_year || '-01')::DATE;
  v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- Processar cada funcion??rio
  FOR v_employee_record IN
    SELECT DISTINCT e.id as employee_id
    FROM rh.employees e
    INNER JOIN rh.bank_hours_config bhc ON bhc.employee_id = e.id
    WHERE e.company_id = p_company_id
      AND e.status = 'ativo'
      AND bhc.is_active = true
      AND bhc.has_bank_hours = true
  LOOP
    -- Processar dias sem registro (d??bito)
    PERFORM rh.calculate_and_accumulate_bank_hours(
      v_employee_record.employee_id,
      p_company_id,
      v_month_start,
      v_month_end
    );

    v_total_employees := v_total_employees + 1;
  END LOOP;

  -- Calcular totais
  SELECT 
    COALESCE(SUM(CASE WHEN hours_amount > 0 THEN hours_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN hours_amount < 0 THEN ABS(hours_amount) ELSE 0 END), 0)
  INTO v_total_accumulated, v_total_debit
  FROM rh.bank_hours_transactions
  WHERE company_id = p_company_id
    AND transaction_date BETWEEN v_month_start AND v_month_end
    AND is_automatic = true;

  RETURN QUERY SELECT v_total_employees, v_total_accumulated, v_total_debit;
END;
$$;


ALTER FUNCTION "rh"."process_monthly_bank_hours"("p_company_id" "uuid", "p_month_year" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."process_monthly_bank_hours"("p_company_id" "uuid", "p_month_year" character varying) IS 'Processa banco de horas mensal incluindo d??bitos de dias sem registro.';



CREATE OR REPLACE FUNCTION "rh"."process_notification_queue"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    notification_record RECORD;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    -- Process pending notifications
    FOR notification_record IN
        SELECT * FROM rh.training_notification_queue
        WHERE status = 'pendente'
        AND data_agendamento <= NOW()
        AND tentativas < max_tentativas
        ORDER BY data_agendamento ASC
        LIMIT 100
    LOOP
        BEGIN
            -- Insert into public notifications table
            INSERT INTO public.notifications (
                user_id, company_id, title, message, type, is_read, created_at
            ) VALUES (
                notification_record.user_id,
                notification_record.company_id,
                notification_record.titulo,
                notification_record.mensagem,
                'training',
                false,
                NOW()
            );

            -- Update queue status
            UPDATE rh.training_notification_queue
            SET status = 'enviada',
                data_envio = NOW(),
                tentativas = tentativas + 1
            WHERE id = notification_record.id;

            -- Insert into history
            INSERT INTO rh.training_notification_history (
                company_id, training_id, notification_type_id, user_id, employee_id,
                titulo, mensagem, data_envio, status, metodo_envio
            ) VALUES (
                notification_record.company_id,
                notification_record.training_id,
                notification_record.notification_type_id,
                notification_record.user_id,
                notification_record.employee_id,
                notification_record.titulo,
                notification_record.mensagem,
                NOW(),
                'enviada',
                'sistema'
            );

            success_count := success_count + 1;

        EXCEPTION WHEN OTHERS THEN
            -- Update queue with error
            UPDATE rh.training_notification_queue
            SET status = CASE 
                WHEN tentativas + 1 >= max_tentativas THEN 'falhou'
                ELSE 'pendente'
            END,
            tentativas = tentativas + 1,
            erro_mensagem = SQLERRM
            WHERE id = notification_record.id;

            error_count := error_count + 1;
        END;
    END LOOP;

    -- Log processing results
    RAISE NOTICE 'Processed % notifications successfully, % failed', success_count, error_count;
END;
$$;


ALTER FUNCTION "rh"."process_notification_queue"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."process_semester_bank_hours_closure"("p_employee_id" "uuid", "p_company_id" "uuid", "p_closure_date" "date" DEFAULT CURRENT_DATE) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_closure_id UUID;
  v_period_start DATE;
  v_period_end DATE;
  v_balance rh.bank_hours_balance%ROWTYPE;
  v_positive_balance DECIMAL(6,2) := 0;
  v_negative_balance DECIMAL(6,2) := 0;
  v_hours_50_to_pay DECIMAL(6,2) := 0;
  v_hours_100_to_pay DECIMAL(6,2) := 0;
  v_transaction_record RECORD;
  v_payroll_period VARCHAR(7);
BEGIN
  -- Calcular per??odo (6 meses antes)
  v_period_start := p_closure_date - INTERVAL '6 months';
  v_period_end := p_closure_date;

  -- Buscar saldo atual
  SELECT * INTO v_balance
  FROM rh.bank_hours_balance
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Funcion??rio n??o possui banco de horas configurado';
  END IF;

  -- Separar saldo positivo e negativo
  IF v_balance.current_balance > 0 THEN
    v_positive_balance := v_balance.current_balance;
  ELSE
    v_negative_balance := ABS(v_balance.current_balance);
  END IF;

  -- Buscar transa????es expiradas ou do per??odo
  FOR v_transaction_record IN
    SELECT *
    FROM rh.bank_hours_transactions
    WHERE employee_id = p_employee_id
      AND company_id = p_company_id
      AND transaction_type = 'accumulation'
      AND (expires_at <= p_closure_date OR transaction_date BETWEEN v_period_start AND v_period_end)
      AND is_paid = false
    ORDER BY transaction_date ASC
  LOOP
    -- Se ?? hora extra 50%, vai para pagamento
    IF v_transaction_record.overtime_percentage = 50 THEN
      v_hours_50_to_pay := v_hours_50_to_pay + v_transaction_record.hours_amount;
    END IF;
  END LOOP;

  -- Buscar horas 100% do per??odo (n??o v??o para banco, mas precisam ser pagas)
  SELECT COALESCE(SUM(horas_para_pagamento), 0)
  INTO v_hours_100_to_pay
  FROM rh.time_records
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id
    AND data_registro BETWEEN v_period_start AND v_period_end
    AND status = 'aprovado'
    AND horas_para_pagamento > 0;

  -- Criar registro de fechamento
  INSERT INTO rh.bank_hours_closure (
    employee_id,
    company_id,
    closure_date,
    period_start,
    period_end,
    positive_balance_paid,
    negative_balance_zeroed,
    total_hours_50_paid,
    total_hours_100_paid,
    status
  ) VALUES (
    p_employee_id,
    p_company_id,
    p_closure_date,
    v_period_start,
    v_period_end,
    v_positive_balance,
    v_negative_balance,
    v_hours_50_to_pay,
    v_hours_100_to_pay,
    'processing'
  ) RETURNING id INTO v_closure_id;

  -- Gerar per??odo da folha (m??s do fechamento)
  v_payroll_period := TO_CHAR(p_closure_date, 'YYYY-MM');

  -- Criar evento financeiro para horas extras
  INSERT INTO rh.payroll_overtime_events (
    employee_id,
    company_id,
    closure_id,
    payroll_period,
    event_date,
    hours_50_amount,
    hours_100_amount,
    status
  ) VALUES (
    p_employee_id,
    p_company_id,
    v_closure_id,
    v_payroll_period,
    p_closure_date,
    v_hours_50_to_pay + v_positive_balance, -- Saldo positivo + horas 50% acumuladas
    v_hours_100_to_pay,
    'pending'
  );

  -- Marcar transa????es como pagas
  UPDATE rh.bank_hours_transactions
  SET 
    is_paid = true,
    closure_id = v_closure_id
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id
    AND transaction_type = 'accumulation'
    AND (expires_at <= p_closure_date OR transaction_date BETWEEN v_period_start AND v_period_end)
    AND is_paid = false;

  -- Zerar banco (saldo positivo pago, saldo negativo zerado)
  UPDATE rh.bank_hours_balance
  SET 
    current_balance = 0,
    last_calculation_date = p_closure_date,
    updated_at = NOW()
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id;

  -- Atualizar status do fechamento
  UPDATE rh.bank_hours_closure
  SET 
    status = 'completed',
    updated_at = NOW()
  WHERE id = v_closure_id;

  RETURN v_closure_id;
END;
$$;


ALTER FUNCTION "rh"."process_semester_bank_hours_closure"("p_employee_id" "uuid", "p_company_id" "uuid", "p_closure_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."process_semester_bank_hours_closure"("p_employee_id" "uuid", "p_company_id" "uuid", "p_closure_date" "date") IS 'Processa fechamento semestral do banco de horas:
   - Saldo positivo: pago em folha
   - Saldo negativo: zerado (n??o descontado)
   - Horas 50% expiradas: pagas
   - Horas 100%: sempre pagas';



CREATE OR REPLACE FUNCTION "rh"."process_weekly_bank_hours"("p_company_id" "uuid", "p_week_start_date" "date") RETURNS TABLE("employees_processed" integer, "total_hours_accumulated" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_employee_record RECORD;
  v_week_end_date DATE;
  v_total_employees INTEGER := 0;
  v_total_hours DECIMAL(8,2) := 0;
BEGIN
  v_week_end_date := p_week_start_date + INTERVAL '6 days';

  -- Processar cada funcion??rio com banco de horas
  FOR v_employee_record IN
    SELECT DISTINCT e.id as employee_id
    FROM rh.employees e
    INNER JOIN rh.bank_hours_config bhc ON bhc.employee_id = e.id
    WHERE e.company_id = p_company_id
      AND e.status = 'ativo'
      AND bhc.is_active = true
      AND bhc.has_bank_hours = true
  LOOP
    -- Processar cada dia da semana
    FOR i IN 0..6 LOOP
      PERFORM rh.process_daily_bank_hours(
        v_employee_record.employee_id,
        p_company_id,
        p_week_start_date + (i || ' days')::INTERVAL
      );
    END LOOP;

    v_total_employees := v_total_employees + 1;
  END LOOP;

  -- Calcular total de horas acumuladas na semana
  SELECT COALESCE(SUM(hours_amount), 0)
  INTO v_total_hours
  FROM rh.bank_hours_transactions
  WHERE company_id = p_company_id
    AND transaction_type = 'accumulation'
    AND transaction_date BETWEEN p_week_start_date AND v_week_end_date
    AND is_automatic = true;

  RETURN QUERY SELECT v_total_employees, v_total_hours;
END;
$$;


ALTER FUNCTION "rh"."process_weekly_bank_hours"("p_company_id" "uuid", "p_week_start_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."process_weekly_bank_hours"("p_company_id" "uuid", "p_week_start_date" "date") IS 'Processa banco de horas semanal para todos os funcion??rios da empresa.';



CREATE OR REPLACE FUNCTION "rh"."recalculate_problematic_records"() RETURNS TABLE("total_records" integer, "fixed_records" integer, "still_problematic" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_record_id UUID;
  v_total INTEGER := 0;
  v_fixed INTEGER := 0;
  v_still_problematic INTEGER := 0;
  v_horas_trabalhadas DECIMAL(4,2);
  v_horas_negativas DECIMAL(4,2);
BEGIN
  -- Identificar registros com problemas:
  -- 1. horas_trabalhadas < 0 (nunca deveria acontecer)
  -- 2. horas_negativas > 0 mas horas_trabalhadas >= horas_diarias esperadas
  FOR v_record_id IN
    SELECT tr.id
    FROM rh.time_records tr
    WHERE 
      -- Caso 1: Horas trabalhadas negativas
      tr.horas_trabalhadas < 0
      OR
      -- Caso 2: Horas negativas mas trabalhou igual ou mais que o esperado
      (
        tr.horas_negativas > 0 
        AND tr.entrada IS NOT NULL 
        AND tr.saida IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM rh.time_record_events tre
          WHERE tre.time_record_id = tr.id
          AND tre.event_type IN ('entrada', 'saida')
        )
      )
    ORDER BY tr.data_registro DESC, tr.id
  LOOP
    v_total := v_total + 1;
    
    -- Buscar valores antes do recálculo
    SELECT horas_trabalhadas, horas_negativas
    INTO v_horas_trabalhadas, v_horas_negativas
    FROM rh.time_records
    WHERE id = v_record_id;
    
    -- Recalcular usando a função corrigida
    PERFORM rh.recalculate_time_record_hours(v_record_id);
    
    -- Verificar se foi corrigido
    SELECT horas_trabalhadas, horas_negativas
    INTO v_horas_trabalhadas, v_horas_negativas
    FROM rh.time_records
    WHERE id = v_record_id;
    
    -- Se ainda tem problema, incrementar contador
    IF v_horas_trabalhadas < 0 OR 
       (v_horas_negativas > 0 AND v_horas_trabalhadas >= 7.0) THEN
      v_still_problematic := v_still_problematic + 1;
    ELSE
      v_fixed := v_fixed + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_total, v_fixed, v_still_problematic;
END;
$$;


ALTER FUNCTION "rh"."recalculate_problematic_records"() OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."recalculate_problematic_records"() IS 'Recalcula todos os registros de ponto que têm horas_trabalhadas negativas
ou horas_negativas incorretas. Retorna estatísticas do processo.';



CREATE OR REPLACE FUNCTION "rh"."recalculate_time_record_hours"("p_time_record_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_employee_id UUID;
  v_company_id UUID;
  v_date DATE;
  v_horas_faltas numeric(4,2);
  v_entrada TIME;
  v_saida TIME;
  v_entrada_almoco TIME;
  v_saida_almoco TIME;
  v_entrada_extra1 TIME;
  v_saida_extra1 TIME;
  v_horas_trabalhadas numeric(4,2);
  v_horas_diarias numeric(4,2);
  v_horas_extra_window numeric(4,2) := 0;
  v_diferenca_horas numeric(4,2);
  v_requer_registro_ponto boolean := true;
  v_day_of_week INTEGER;
  v_day_hours JSONB;
  -- Variáveis auxiliares para construção de timestamps
  v_timezone text := 'America/Sao_Paulo';
  -- Variáveis auxiliares para fallback (usadas em blocos condicionais)
  v_entrada_date_use date;
  v_saida_date_use date;
  v_entrada_almoco_date_use date;
  v_saida_almoco_date_use date;
  v_entrada_extra1_date_use date;
  v_saida_extra1_date_use date;
  -- Variáveis para event_at completo (TIMESTAMPTZ)
  v_entrada_event_at timestamptz;
  v_saida_event_at timestamptz;
  v_entrada_almoco_event_at timestamptz;
  v_saida_almoco_event_at timestamptz;
  v_entrada_extra1_event_at timestamptz;
  v_saida_extra1_event_at timestamptz;
  -- Variáveis para campos *_date (calculados a partir dos eventos)
  v_entrada_date date;
  v_saida_date date;
  v_entrada_almoco_date date;
  v_saida_almoco_date date;
  v_entrada_extra1_date date;
  v_saida_extra1_date date;
  -- Variáveis para cálculo de horas noturnas
  v_entrada_date_for_night date;
  v_saida_date_for_night date;
  v_horas_noturnas numeric(4,2) := 0;
  v_work_shift_id UUID;
  v_tipo_escala VARCHAR(50);
BEGIN
  SELECT tr.employee_id, tr.company_id, tr.data_registro, tr.horas_faltas,
         COALESCE(e.requer_registro_ponto, true)
  INTO v_employee_id, v_company_id, v_date, v_horas_faltas, v_requer_registro_ponto
  FROM rh.time_records tr
  INNER JOIN rh.employees e ON e.id = tr.employee_id
  WHERE tr.id = p_time_record_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calcular dia da semana
  v_day_of_week := CASE 
    WHEN EXTRACT(DOW FROM v_date) = 0 THEN 7
    ELSE EXTRACT(DOW FROM v_date)::INTEGER
  END;

  -- Buscar turno
  SELECT 
    rh.get_employee_work_shift_type(v_employee_id, v_company_id, v_date),
    es.turno_id,
    ws.horas_diarias
  INTO 
    v_tipo_escala,
    v_work_shift_id,
    v_horas_diarias
  FROM rh.employee_shifts es
  INNER JOIN rh.work_shifts ws ON ws.id = es.turno_id
  WHERE es.funcionario_id = v_employee_id
    AND es.company_id = v_company_id
    AND es.ativo = true
    AND es.data_inicio <= v_date
    AND (es.data_fim IS NULL OR es.data_fim >= v_date)
  ORDER BY es.data_inicio DESC
  LIMIT 1;

  -- Se não encontrou via employee_shifts, buscar via employees.work_shift_id
  IF v_work_shift_id IS NULL OR v_horas_diarias IS NULL THEN
    SELECT 
      rh.get_employee_work_shift_type(v_employee_id, v_company_id, v_date),
      e.work_shift_id,
      ws.horas_diarias
    INTO 
      v_tipo_escala,
      v_work_shift_id,
      v_horas_diarias
    FROM rh.employees e
    LEFT JOIN rh.work_shifts ws ON ws.id = e.work_shift_id
    WHERE e.id = v_employee_id
      AND e.company_id = v_company_id;
  END IF;

  -- Se encontrou turno, verificar se tem horarios_por_dia para o dia específico
  IF v_work_shift_id IS NOT NULL THEN
    v_day_hours := rh.get_work_shift_hours_for_day(v_work_shift_id, v_day_of_week);
    
    -- Se tem horário específico para o dia, usar horas_diarias do JSONB
    IF v_day_hours IS NOT NULL AND v_day_hours ? 'horas_diarias' THEN
      v_horas_diarias := COALESCE((v_day_hours->>'horas_diarias')::NUMERIC, v_horas_diarias);
    END IF;
  END IF;

  -- CORREÇÃO: Se ainda não encontrou horas_diarias, tentar buscar do turno diretamente
  IF v_horas_diarias IS NULL AND v_work_shift_id IS NOT NULL THEN
    SELECT horas_diarias
    INTO v_horas_diarias
    FROM rh.work_shifts
    WHERE id = v_work_shift_id;
  END IF;

  -- Se não encontrar turno, usar 8.0 como padrão
  IF v_horas_diarias IS NULL THEN
    v_horas_diarias := 8.0;
  END IF;

  -- =====================================================
  -- CORREÇÃO CRÍTICA: Buscar event_at completo (TIMESTAMPTZ)
  -- =====================================================
  -- CORREÇÃO: Remover ORDER BY e LIMIT quando usando MIN/MAX (funções agregadas)
  SELECT MIN(event_at)
  INTO v_entrada_event_at
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'entrada';

  SELECT MAX(event_at)
  INTO v_saida_event_at
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'saida';

  SELECT MIN(event_at)
  INTO v_entrada_almoco_event_at
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'entrada_almoco';

  SELECT MAX(event_at)
  INTO v_saida_almoco_event_at
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'saida_almoco';

  SELECT MIN(event_at)
  INTO v_entrada_extra1_event_at
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'extra_inicio';

  SELECT MAX(event_at)
  INTO v_saida_extra1_event_at
  FROM rh.time_record_events
  WHERE time_record_id = p_time_record_id AND event_type = 'extra_fim';

  -- =====================================================
  -- CORREÇÃO CRÍTICA: Calcular campos *_date a partir dos eventos
  -- =====================================================
  -- Campos *_date não existem como colunas na tabela, são calculados
  -- a partir dos event_at dos eventos
  IF v_entrada_event_at IS NOT NULL THEN
    v_entrada_date := (v_entrada_event_at AT TIME ZONE v_timezone)::date;
  END IF;

  IF v_saida_event_at IS NOT NULL THEN
    v_saida_date := (v_saida_event_at AT TIME ZONE v_timezone)::date;
  END IF;

  IF v_entrada_almoco_event_at IS NOT NULL THEN
    v_entrada_almoco_date := (v_entrada_almoco_event_at AT TIME ZONE v_timezone)::date;
  END IF;

  IF v_saida_almoco_event_at IS NOT NULL THEN
    v_saida_almoco_date := (v_saida_almoco_event_at AT TIME ZONE v_timezone)::date;
  END IF;

  IF v_entrada_extra1_event_at IS NOT NULL THEN
    v_entrada_extra1_date := (v_entrada_extra1_event_at AT TIME ZONE v_timezone)::date;
  END IF;

  IF v_saida_extra1_event_at IS NOT NULL THEN
    v_saida_extra1_date := (v_saida_extra1_event_at AT TIME ZONE v_timezone)::date;
  END IF;

  -- =====================================================
  -- Buscar TIME para atualizar campos na tabela time_records
  -- (mantido para compatibilidade e exibição)
  -- =====================================================
  IF v_entrada_event_at IS NOT NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time
    INTO v_entrada
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'entrada'
    ORDER BY event_at ASC
    LIMIT 1;
  END IF;

  IF v_saida_event_at IS NOT NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time
    INTO v_saida
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'saida'
    ORDER BY event_at DESC
    LIMIT 1;
  END IF;

  IF v_entrada_almoco_event_at IS NOT NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time
    INTO v_entrada_almoco
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'entrada_almoco'
    ORDER BY event_at ASC
    LIMIT 1;
  END IF;

  IF v_saida_almoco_event_at IS NOT NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time
    INTO v_saida_almoco
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'saida_almoco'
    ORDER BY event_at DESC
    LIMIT 1;
  END IF;

  IF v_entrada_extra1_event_at IS NOT NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time
    INTO v_entrada_extra1
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'extra_inicio'
    ORDER BY event_at ASC
    LIMIT 1;
  END IF;

  IF v_saida_extra1_event_at IS NOT NULL THEN
    SELECT (event_at AT TIME ZONE v_timezone)::time
    INTO v_saida_extra1
    FROM rh.time_record_events
    WHERE time_record_id = p_time_record_id AND event_type = 'extra_fim'
    ORDER BY event_at DESC
    LIMIT 1;
  END IF;

  -- =====================================================
  -- FALLBACK 2: Se não houver eventos, usar dados existentes
  -- =====================================================
  IF v_entrada IS NULL OR v_saida IS NULL THEN
    SELECT entrada, saida, entrada_almoco, saida_almoco, entrada_extra1, saida_extra1
    INTO v_entrada, v_saida, v_entrada_almoco, v_saida_almoco, v_entrada_extra1, v_saida_extra1
    FROM rh.time_records
    WHERE id = p_time_record_id;
  END IF;

  -- =====================================================
  -- CORREÇÃO CRÍTICA: Calcular horas trabalhadas usando event_at completo
  -- =====================================================
  IF v_entrada_event_at IS NOT NULL AND v_saida_event_at IS NOT NULL THEN
    -- Usar event_at completo para cálculo preciso
    v_horas_trabalhadas := ROUND(
      EXTRACT(EPOCH FROM (v_saida_event_at - v_entrada_event_at)) / 3600,
      2
    );
    
    -- Subtrair intervalo de almoço se houver
    IF v_entrada_almoco_event_at IS NOT NULL AND v_saida_almoco_event_at IS NOT NULL THEN
      v_horas_trabalhadas := v_horas_trabalhadas - ROUND(
        EXTRACT(EPOCH FROM (v_saida_almoco_event_at - v_entrada_almoco_event_at)) / 3600,
        2
      );
    END IF;
    
    -- Adicionar horas extras se houver
    IF v_entrada_extra1_event_at IS NOT NULL AND v_saida_extra1_event_at IS NOT NULL THEN
      v_horas_trabalhadas := v_horas_trabalhadas + ROUND(
        EXTRACT(EPOCH FROM (v_saida_extra1_event_at - v_entrada_extra1_event_at)) / 3600,
        2
      );
    END IF;
    
  ELSE
    -- FALLBACK: Usar campos *_date quando disponíveis
    IF v_entrada_date IS NOT NULL AND v_saida_date IS NOT NULL AND v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
      -- Usar campos *_date para construir timestamps
      v_entrada_date_use := v_entrada_date;
      v_saida_date_use := v_saida_date;
      
      -- Calcular horas trabalhadas usando timestamps construídos
      v_horas_trabalhadas := ROUND(
        EXTRACT(EPOCH FROM (
          (v_saida_date_use + v_saida)::timestamp - 
          (v_entrada_date_use + v_entrada)::timestamp
        )) / 3600,
        2
      );
      
      -- Subtrair intervalo de almoço se houver
      IF v_entrada_almoco_date IS NOT NULL AND v_saida_almoco_date IS NOT NULL 
         AND v_entrada_almoco IS NOT NULL AND v_saida_almoco IS NOT NULL THEN
        v_entrada_almoco_date_use := v_entrada_almoco_date;
        v_saida_almoco_date_use := v_saida_almoco_date;
        
        v_horas_trabalhadas := v_horas_trabalhadas - ROUND(
          EXTRACT(EPOCH FROM (
            (v_saida_almoco_date_use + v_saida_almoco)::timestamp - 
            (v_entrada_almoco_date_use + v_entrada_almoco)::timestamp
          )) / 3600,
          2
        );
      END IF;
      
    ELSE
      -- FALLBACK FINAL: Calcular horas trabalhadas usando TIME e data_registro
      -- Assumir que saída é do dia seguinte se for antes da entrada
      IF v_entrada IS NOT NULL AND v_saida IS NOT NULL THEN
        -- Determinar se saída é do dia seguinte
        IF v_saida < v_entrada THEN
          -- Saída é do dia seguinte
          v_horas_trabalhadas := ROUND(
            EXTRACT(EPOCH FROM (
              (v_date + INTERVAL '1 day' + v_saida)::timestamp - 
              (v_date + v_entrada)::timestamp
            )) / 3600,
            2
          );
        ELSE
          -- Mesmo dia
          v_horas_trabalhadas := ROUND(
            EXTRACT(EPOCH FROM ((v_date + v_saida)::timestamp - (v_date + v_entrada)::timestamp)) / 3600,
            2
          );
        END IF;
        
        -- Subtrair intervalo de almoço se houver
        IF v_entrada_almoco IS NOT NULL AND v_saida_almoco IS NOT NULL THEN
          IF v_saida_almoco < v_entrada_almoco THEN
            -- Almoço cruza meia-noite
            v_horas_trabalhadas := v_horas_trabalhadas - ROUND(
              EXTRACT(EPOCH FROM (
                (v_date + INTERVAL '1 day' + v_saida_almoco)::timestamp - 
                (v_date + v_entrada_almoco)::timestamp
              )) / 3600,
              2
            );
          ELSE
            v_horas_trabalhadas := v_horas_trabalhadas - ROUND(
              EXTRACT(EPOCH FROM (
                (v_date + v_saida_almoco)::timestamp - 
                (v_date + v_entrada_almoco)::timestamp
              )) / 3600,
              2
            );
          END IF;
        END IF;
        
        -- Adicionar horas extras se houver
        IF v_entrada_extra1 IS NOT NULL AND v_saida_extra1 IS NOT NULL THEN
          IF v_saida_extra1 < v_entrada_extra1 THEN
            -- Janela extra cruza meia-noite
            v_horas_trabalhadas := v_horas_trabalhadas + ROUND(
              EXTRACT(EPOCH FROM (
                (v_date + INTERVAL '1 day' + v_saida_extra1)::timestamp - 
                (v_date + v_entrada_extra1)::timestamp
              )) / 3600,
              2
            );
          ELSE
            v_horas_trabalhadas := v_horas_trabalhadas + ROUND(
              EXTRACT(EPOCH FROM (
                (v_date + v_saida_extra1)::timestamp - 
                (v_date + v_entrada_extra1)::timestamp
              )) / 3600,
              2
            );
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  -- =====================================================
  -- Calcular horas noturnas
  -- =====================================================
  -- Passar datas quando disponíveis para calculate_night_hours
  -- Usar campos *_date quando disponíveis, senão usar data_registro
  -- Determinar datas para cálculo de horas noturnas
  IF v_entrada_event_at IS NOT NULL THEN
    -- Usar data do event_at
    v_entrada_date_for_night := (v_entrada_event_at AT TIME ZONE v_timezone)::date;
  ELSE
    -- Fallback: usar campo *_date ou data_registro
    v_entrada_date_for_night := COALESCE(v_entrada_date, v_date);
  END IF;

  IF v_saida_event_at IS NOT NULL THEN
    -- Usar data do event_at
    v_saida_date_for_night := (v_saida_event_at AT TIME ZONE v_timezone)::date;
  ELSE
    -- Fallback: usar campo *_date ou data_registro
    v_saida_date_for_night := COALESCE(v_saida_date, v_date);
  END IF;

  v_horas_noturnas := rh.calculate_night_hours(
    v_entrada, 
    v_saida, 
    v_date,
    v_entrada_date_for_night,
    v_saida_date_for_night
  );

  -- Calcular diferença entre horas trabalhadas e horas_diarias do turno
  v_diferenca_horas := v_horas_trabalhadas - v_horas_diarias;

  -- IMPORTANTE: Se funcionário não precisa registrar ponto (Artigo 62),
  -- não deve calcular horas negativas por ausência de registro
  IF v_requer_registro_ponto THEN
    -- Funcionário precisa registrar ponto: calcular normalmente
    -- CORREÇÃO: Só calcular horas negativas se trabalhou MENOS que o esperado
    IF v_diferenca_horas < 0 THEN
      v_horas_faltas := ABS(v_diferenca_horas);
    ELSE
      v_horas_faltas := 0;
    END IF;
  ELSE
    -- Funcionário não precisa registrar ponto: não calcular horas negativas
    v_horas_faltas := 0;
  END IF;

  -- Atualizar registro com horas calculadas
  UPDATE rh.time_records
  SET 
    horas_trabalhadas = ROUND(v_horas_trabalhadas, 2),
    horas_faltas = ROUND(v_horas_faltas, 2),
    horas_noturnas = ROUND(v_horas_noturnas, 2),
    entrada = v_entrada,
    saida = v_saida,
    entrada_almoco = v_entrada_almoco,
    saida_almoco = v_saida_almoco,
    entrada_extra1 = v_entrada_extra1,
    saida_extra1 = v_saida_extra1
  WHERE id = p_time_record_id;

  -- Chamar calculate_overtime_by_scale para calcular corretamente
  -- as horas extras/negativas por escala (considera tipo de escala, feriados, etc)
  -- Esta função agora garante que não calcula horas negativas incorretamente
  PERFORM rh.calculate_overtime_by_scale(p_time_record_id);
END;
$$;


ALTER FUNCTION "rh"."recalculate_time_record_hours"("p_time_record_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."recalculate_time_record_hours"("p_time_record_id" "uuid") IS 'Recalcula horas trabalhadas e extras de um registro de ponto. 
CORREÇÃO CRÍTICA: Agora usa event_at (TIMESTAMPTZ) completo para cálculos precisos,
garantindo que registros que cruzam meia-noite sejam calculados corretamente.
Mantém fallbacks para compatibilidade com registros antigos sem eventos.
CORREÇÃO: Campos *_date são calculados a partir dos eventos, não buscados da tabela.';



CREATE OR REPLACE FUNCTION "rh"."recalculate_time_record_hours_with_scale"("p_time_record_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Primeiro, recalcular horas trabalhadas (l??gica existente)
  PERFORM rh.recalculate_time_record_hours(p_time_record_id);
  
  -- Depois, calcular horas extras por escala
  PERFORM rh.calculate_overtime_by_scale(p_time_record_id);
END;
$$;


ALTER FUNCTION "rh"."recalculate_time_record_hours_with_scale"("p_time_record_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."rejeitar_ferias"("p_vacation_id" "uuid", "p_aprovado_por" "uuid", "p_motivo_rejeicao" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Verificar se a férias existe
  IF NOT EXISTS (SELECT 1 FROM rh.vacations WHERE id = p_vacation_id) THEN
    RAISE EXCEPTION 'Férias não encontrada';
  END IF;
  
  -- Verificar se está pendente
  IF EXISTS (SELECT 1 FROM rh.vacations WHERE id = p_vacation_id AND status != 'pendente') THEN
    RAISE EXCEPTION 'Férias já foi processada';
  END IF;
  
  -- Atualizar status da férias
  UPDATE rh.vacations
  SET status = 'rejeitado',
      aprovado_por = p_aprovado_por,
      aprovado_em = NOW(),
      observacoes = COALESCE(p_motivo_rejeicao, observacoes)
  WHERE id = p_vacation_id;
  
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "rh"."rejeitar_ferias"("p_vacation_id" "uuid", "p_aprovado_por" "uuid", "p_motivo_rejeicao" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."run_bank_hours_calculation"("p_company_id" "uuid", "p_calculation_date" "date" DEFAULT CURRENT_DATE) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_calculation_id UUID;
  v_period_start DATE;
  v_period_end DATE;
  v_employee_record RECORD;
  v_result RECORD;
  v_total_accumulated DECIMAL(8,2) := 0;
  v_total_compensated DECIMAL(8,2) := 0;
  v_total_expired DECIMAL(8,2) := 0;
  v_employees_processed INTEGER := 0;
BEGIN
  -- Criar registro de cÃ¡lculo
  INSERT INTO rh.bank_hours_calculations (
    company_id, calculation_date, period_start, period_end, status
  ) VALUES (
    p_company_id, p_calculation_date, 
    p_calculation_date - INTERVAL '1 month', p_calculation_date,
    'running'
  ) RETURNING id INTO v_calculation_id;

  -- Definir perÃ­odo de cÃ¡lculo (Ãºltimo mÃªs)
  v_period_start := p_calculation_date - INTERVAL '1 month';
  v_period_end := p_calculation_date;

  -- Processar cada colaborador com banco de horas ativo
  -- Considerar tanto sistema novo (bank_hours_assignments) quanto antigo (bank_hours_config)
  FOR v_employee_record IN
    -- Sistema novo: bank_hours_assignments
    SELECT DISTINCT bha.employee_id, bha.company_id
    FROM rh.bank_hours_assignments bha
    INNER JOIN rh.bank_hours_types bht ON bht.id = bha.bank_hours_type_id
    WHERE bha.company_id = p_company_id
      AND bha.is_active = true
      AND bht.is_active = true
      AND bht.has_bank_hours = true
    
    UNION
    
    -- Sistema antigo: bank_hours_config (sÃ³ se nÃ£o tiver no sistema novo)
    SELECT DISTINCT bhc.employee_id, bhc.company_id
    FROM rh.bank_hours_config bhc
    WHERE bhc.company_id = p_company_id
      AND bhc.is_active = true
      AND bhc.has_bank_hours = true
      AND NOT EXISTS (
        SELECT 1 
        FROM rh.bank_hours_assignments bha2
        INNER JOIN rh.bank_hours_types bht2 ON bht2.id = bha2.bank_hours_type_id
        WHERE bha2.employee_id = bhc.employee_id
          AND bha2.company_id = bhc.company_id
          AND bha2.is_active = true
          AND bht2.is_active = true
          AND bht2.has_bank_hours = true
      )
  LOOP
    BEGIN
      -- Calcular e acumular horas para este colaborador
      SELECT * INTO v_result
      FROM rh.calculate_and_accumulate_bank_hours(
        v_employee_record.employee_id,
        v_employee_record.company_id,
        v_period_start,
        v_period_end
      );

      v_total_accumulated := v_total_accumulated + COALESCE(v_result.hours_accumulated, 0);
      v_total_compensated := v_total_compensated + COALESCE(v_result.hours_compensated, 0);
      v_employees_processed := v_employees_processed + 1;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log do erro mas continua processando outros funcionÃ¡rios
        RAISE WARNING 'Erro ao processar funcionÃ¡rio %: %', v_employee_record.employee_id, SQLERRM;
    END;
  END LOOP;

  -- Processar expiraÃ§Ã£o de horas
  BEGIN
    SELECT * INTO v_result
    FROM rh.process_bank_hours_expiration(p_company_id, p_calculation_date);
    
    v_total_expired := COALESCE(v_result.hours_expired, 0);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Erro ao processar expiraÃ§Ã£o: %', SQLERRM;
      v_total_expired := 0;
  END;

  -- Atualizar registro de cÃ¡lculo
  UPDATE rh.bank_hours_calculations SET
    employees_processed = v_employees_processed,
    hours_accumulated = v_total_accumulated,
    hours_compensated = v_total_compensated,
    hours_expired = v_total_expired,
    status = 'completed',
    completed_at = NOW()
  WHERE id = v_calculation_id;

  RETURN v_calculation_id;
END;
$$;


ALTER FUNCTION "rh"."run_bank_hours_calculation"("p_company_id" "uuid", "p_calculation_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."run_bank_hours_calculation"("p_company_id" "uuid", "p_calculation_date" "date") IS 'Executa cÃ¡lculo completo do banco de horas para uma empresa.
   Funciona com bank_hours_assignments (sistema novo) e bank_hours_config (sistema antigo).
   Prioriza sistema novo sobre sistema antigo.';



CREATE OR REPLACE FUNCTION "rh"."schedule_exam_notifications"("p_company_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_notifications_created INTEGER := 0;
    v_exam RECORD;
    v_user_id UUID;
    v_title VARCHAR;
    v_message TEXT;
BEGIN
    -- Buscar exames que precisam de notificaÃ§Ã£o (30 dias antes)
    FOR v_exam IN 
        SELECT * FROM rh.get_exams_needing_notification(p_company_id, 30)
    LOOP
        -- Buscar user_id do funcionÃ¡rio
        SELECT user_id INTO v_user_id 
        FROM rh.employees 
        WHERE id = v_exam.employee_id;
        
        -- SÃ³ criar notificaÃ§Ã£o se o funcionÃ¡rio tiver user_id
        IF v_user_id IS NOT NULL THEN
            -- Definir tÃ­tulo e mensagem baseado nos dias restantes
            IF v_exam.days_until_exam = 0 THEN
                v_title := 'Exame Agendado para Hoje';
                v_message := 'VocÃª tem um exame ' || v_exam.exam_type || ' agendado para hoje.';
            ELSIF v_exam.days_until_exam <= 7 THEN
                v_title := 'Exame PrÃ³ximo';
                v_message := 'VocÃª tem um exame ' || v_exam.exam_type || ' agendado para ' || 
                           v_exam.days_until_exam || ' dias.';
            ELSIF v_exam.days_until_exam <= 30 THEN
                v_title := 'Lembrete de Exame';
                v_message := 'VocÃª tem um exame ' || v_exam.exam_type || ' agendado para ' || 
                           v_exam.days_until_exam || ' dias.';
            END IF;
            
            -- Criar notificaÃ§Ã£o
            PERFORM rh.create_exam_notification(
                v_user_id,
                p_company_id,
                v_exam.exam_id,
                'exam_reminder',
                v_title,
                v_message
            );
            
            v_notifications_created := v_notifications_created + 1;
        END IF;
    END LOOP;
    
    -- Buscar exames vencidos
    FOR v_exam IN 
        SELECT * FROM rh.get_expired_exams(p_company_id)
    LOOP
        -- Buscar user_id do funcionÃ¡rio
        SELECT user_id INTO v_user_id 
        FROM rh.employees 
        WHERE id = v_exam.employee_id;
        
        -- SÃ³ criar notificaÃ§Ã£o se o funcionÃ¡rio tiver user_id
        IF v_user_id IS NOT NULL THEN
            v_title := 'Exame Vencido';
            v_message := 'Seu exame ' || v_exam.exam_type || ' estava agendado para ' || 
                        v_exam.scheduled_date || ' e estÃ¡ ' || v_exam.days_overdue || ' dias atrasado.';
            
            -- Criar notificaÃ§Ã£o
            PERFORM rh.create_exam_notification(
                v_user_id,
                p_company_id,
                v_exam.exam_id,
                'exam_overdue',
                v_title,
                v_message
            );
            
            v_notifications_created := v_notifications_created + 1;
        END IF;
    END LOOP;
    
    RETURN v_notifications_created;
END;
$$;


ALTER FUNCTION "rh"."schedule_exam_notifications"("p_company_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."schedule_exam_notifications"("p_company_id" "uuid") IS 'Agenda notificaÃ§Ãµes automÃ¡ticas para exames (30 dias antes e vencidos)';



CREATE OR REPLACE FUNCTION "rh"."schedule_training_notifications"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    training_record RECORD;
    notification_type_record RECORD;
    employee_record RECORD;
    user_record RECORD;
    scheduled_date TIMESTAMP WITH TIME ZONE;
    template_titulo TEXT;
    template_mensagem TEXT;
BEGIN
    -- Process each active training
    FOR training_record IN 
        SELECT t.*, nt.dias_antecedencia, nt.template_titulo, nt.template_mensagem, nt.tipo
        FROM rh.trainings t
        JOIN rh.training_notification_rules tnr ON tnr.training_id = t.id
        JOIN rh.training_notification_types nt ON nt.id = tnr.notification_type_id
        WHERE t.is_active = true 
        AND tnr.is_enabled = true
        AND t.status IN ('inscricoes_abertas', 'em_andamento', 'concluido')
    LOOP
        -- Calculate scheduled date based on training date and days_antecedencia
        CASE training_record.tipo
            WHEN 'inscricao_aberta' THEN
                scheduled_date := training_record.data_limite_inscricao - INTERVAL '0 days';
            WHEN 'lembrete_inscricao' THEN
                scheduled_date := training_record.data_limite_inscricao - INTERVAL '3 days';
            WHEN 'inicio_treinamento' THEN
                scheduled_date := training_record.data_inicio;
            WHEN 'fim_treinamento' THEN
                scheduled_date := training_record.data_fim;
            WHEN 'certificado_disponivel' THEN
                scheduled_date := training_record.data_fim + INTERVAL '1 day';
            WHEN 'presenca_obrigatoria' THEN
                scheduled_date := training_record.data_inicio - INTERVAL '1 day';
            ELSE
                scheduled_date := NOW() + INTERVAL '1 hour';
        END CASE;

        -- Get target audience
        FOR employee_record IN
            SELECT DISTINCT e.*, u.id as user_id
            FROM rh.employees e
            LEFT JOIN public.users u ON u.id = e.user_id
            WHERE e.company_id = training_record.company_id
            AND e.status = 'ativo'
            AND (
                training_record.tipo IN ('inscricao_aberta', 'lembrete_inscricao') OR
                EXISTS (
                    SELECT 1 FROM rh.training_enrollments te 
                    WHERE te.training_id = training_record.id 
                    AND te.employee_id = e.id
                    AND te.status IN ('inscrito', 'confirmado', 'presente')
                )
            )
        LOOP
            -- Replace template variables
            template_titulo := training_record.template_titulo;
            template_mensagem := training_record.template_mensagem;
            
            template_titulo := REPLACE(template_titulo, '{training_name}', training_record.nome);
            template_titulo := REPLACE(template_titulo, '{training_date}', training_record.data_inicio::text);
            template_titulo := REPLACE(template_titulo, '{training_time}', '08:00');
            template_titulo := REPLACE(template_titulo, '{training_location}', COALESCE(training_record.local, 'A definir'));
            template_titulo := REPLACE(template_titulo, '{available_slots}', COALESCE(training_record.vagas_disponiveis::text, 'Ilimitadas'));
            template_titulo := REPLACE(template_titulo, '{deadline_date}', COALESCE(training_record.data_limite_inscricao::text, 'Não definido'));
            
            template_mensagem := REPLACE(template_mensagem, '{training_name}', training_record.nome);
            template_mensagem := REPLACE(template_mensagem, '{training_date}', training_record.data_inicio::text);
            template_mensagem := REPLACE(template_mensagem, '{training_time}', '08:00');
            template_mensagem := REPLACE(template_mensagem, '{training_location}', COALESCE(training_record.local, 'A definir'));
            template_mensagem := REPLACE(template_mensagem, '{available_slots}', COALESCE(training_record.vagas_disponiveis::text, 'Ilimitadas'));
            template_mensagem := REPLACE(template_mensagem, '{deadline_date}', COALESCE(training_record.data_limite_inscricao::text, 'Não definido'));
            template_mensagem := REPLACE(template_mensagem, '{new_date}', training_record.data_inicio::text);

            -- Insert notification into queue
            INSERT INTO rh.training_notification_queue (
                company_id, training_id, notification_type_id, user_id, employee_id,
                titulo, mensagem, data_agendamento, status
            ) VALUES (
                training_record.company_id,
                training_record.id,
                (SELECT id FROM rh.training_notification_types WHERE tipo = training_record.tipo AND company_id = training_record.company_id LIMIT 1),
                employee_record.user_id,
                employee_record.id,
                template_titulo,
                template_mensagem,
                scheduled_date,
                'pendente'
            );
        END LOOP;
    END LOOP;
END;
$$;


ALTER FUNCTION "rh"."schedule_training_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."sync_employee_shift_from_work_shift_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_existing_shift_id UUID;
  v_data_inicio DATE;
  v_ultima_data_fim DATE;
BEGIN
  IF (OLD.work_shift_id IS DISTINCT FROM NEW.work_shift_id) THEN
    IF NEW.work_shift_id IS NULL THEN
      UPDATE rh.employee_shifts
      SET ativo = false, data_fim = CURRENT_DATE, updated_at = NOW()
      WHERE funcionario_id = NEW.id AND company_id = NEW.company_id AND ativo = true AND data_fim IS NULL;
      RETURN NEW;
    END IF;
    SELECT es.turno_id, es.data_fim INTO v_existing_shift_id, v_ultima_data_fim
    FROM rh.employee_shifts es
    WHERE es.funcionario_id = NEW.id AND es.company_id = NEW.company_id AND es.ativo = true AND es.data_fim IS NULL
    ORDER BY es.data_inicio DESC LIMIT 1;
    IF v_existing_shift_id = NEW.work_shift_id THEN RETURN NEW; END IF;
    IF v_existing_shift_id IS NOT NULL AND v_existing_shift_id != NEW.work_shift_id THEN
      UPDATE rh.employee_shifts SET ativo = false, data_fim = CURRENT_DATE - INTERVAL '1 day', updated_at = NOW()
      WHERE funcionario_id = NEW.id AND company_id = NEW.company_id AND ativo = true AND data_fim IS NULL;
    END IF;
    IF v_ultima_data_fim IS NOT NULL THEN v_data_inicio := v_ultima_data_fim + INTERVAL '1 day';
    ELSE v_data_inicio := COALESCE(NEW.data_admissao, CURRENT_DATE); END IF;
    INSERT INTO rh.employee_shifts (company_id, funcionario_id, turno_id, data_inicio, data_fim, ativo, observacoes)
    VALUES (NEW.company_id, NEW.id, NEW.work_shift_id, v_data_inicio, NULL, true, 'Sincronizado automaticamente de employees.work_shift_id');
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "rh"."sync_employee_shift_from_work_shift_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."trg_calculate_overtime_on_approval"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Quando um registro ?? aprovado, calcular horas extras por escala
  IF NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status != 'aprovado') THEN
    PERFORM rh.calculate_overtime_by_scale(NEW.id);
    PERFORM rh.process_daily_bank_hours(NEW.employee_id, NEW.company_id, NEW.data_registro);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "rh"."trg_calculate_overtime_on_approval"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."trg_time_record_events_recalc"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE v_id uuid; BEGIN
  IF (TG_OP = 'DELETE') THEN v_id := OLD.time_record_id; ELSE v_id := NEW.time_record_id; END IF;
  PERFORM rh.recalculate_time_record_hours(v_id);
  RETURN COALESCE(NEW, OLD);
END; $$;


ALTER FUNCTION "rh"."trg_time_record_events_recalc"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."trigger_create_training_notification_rules"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM rh.create_training_notification_rules(NEW.id, NEW.company_id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "rh"."trigger_create_training_notification_rules"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."update_coparticipation_on_service_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_coparticipacao DECIMAL(10,2);
    v_percentual DECIMAL(5,2);
BEGIN
    -- Se não tem plano vinculado, não calcula
    IF NEW.employee_plan_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Calcular coparticipação
    v_coparticipacao := rh.calculate_coparticipation(NEW.id, NEW.company_id);
    
    -- Buscar percentual aplicado
    SELECT mp.percentual_coparticipacao INTO v_percentual
    FROM rh.employee_medical_plans emp
    JOIN rh.medical_plans mp ON mp.id = emp.plan_id
    WHERE emp.id = NEW.employee_plan_id;
    
    -- Atualizar valores na tabela de serviços
    NEW.valor_coparticipacao := v_coparticipacao;
    NEW.percentual_aplicado := v_percentual;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "rh"."update_coparticipation_on_service_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."update_financial_integration_config_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "rh"."update_financial_integration_config_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."update_location_zones_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "rh"."update_location_zones_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."update_sobreaviso_escalas_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "rh"."update_sobreaviso_escalas_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."update_time_record_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "rh"."update_time_record_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."update_training_exam_answers_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "rh"."update_training_exam_answers_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."update_training_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "rh"."update_training_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Se updated_at Ã© NULL, usar NOW()
    -- Se updated_at foi alterado (diferente de OLD.updated_at), preservar valor explÃ­cito
    -- Se updated_at nÃ£o foi alterado (igual a OLD.updated_at), atualizar com NOW()
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at = NOW();
    ELSIF NEW.updated_at = OLD.updated_at THEN
        -- Valor nÃ£o foi alterado explicitamente, atualizar com NOW()
        NEW.updated_at = NOW();
    -- ELSE: NEW.updated_at != OLD.updated_at, entÃ£o foi passado explicitamente - preservar
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "rh"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "rh"."validate_time_record_window"("p_employee_id" "uuid", "p_company_id" "uuid", "p_current_date" "date", "p_current_time" time without time zone) RETURNS TABLE("valid_date" "date", "is_new_record" boolean, "first_mark_time" timestamp with time zone, "hours_elapsed" numeric, "window_hours" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_window_hours INTEGER := 24; -- PadrÃ£o
    v_existing_record_id UUID;
    v_first_event_at TIMESTAMP WITH TIME ZONE;
    v_current_timestamp TIMESTAMP WITH TIME ZONE;
    v_hours_elapsed NUMERIC;
    v_is_within_window BOOLEAN;
BEGIN
    -- Obter configuraÃ§Ã£o da janela de tempo
    SELECT janela_tempo_marcacoes INTO v_window_hours
    FROM rh.time_record_settings
    WHERE company_id = p_company_id;
    
    -- Se nÃ£o encontrar, usar padrÃ£o de 24 horas
    IF v_window_hours IS NULL THEN
        v_window_hours := 24;
    END IF;
    
    -- Criar timestamp atual combinando data e hora
    v_current_timestamp := (p_current_date + p_current_time)::TIMESTAMP WITH TIME ZONE;
    
    -- Buscar registro existente para o dia atual
    SELECT tr.id INTO v_existing_record_id
    FROM rh.time_records tr
    WHERE tr.employee_id = p_employee_id
      AND tr.company_id = p_company_id
      AND tr.data_registro = p_current_date
    LIMIT 1;
    
    -- Se nÃ£o existe registro para o dia atual, Ã© um novo registro
    IF v_existing_record_id IS NULL THEN
        RETURN QUERY SELECT 
            p_current_date as valid_date,
            true as is_new_record,
            NULL::TIMESTAMP WITH TIME ZONE as first_mark_time,
            0::NUMERIC as hours_elapsed,
            v_window_hours as window_hours;
        RETURN;
    END IF;
    
    -- Buscar primeira marcaÃ§Ã£o (entrada) do registro existente
    SELECT MIN(tre.event_at) INTO v_first_event_at
    FROM rh.time_record_events tre
    WHERE tre.time_record_id = v_existing_record_id
      AND tre.event_type = 'entrada';
    
    -- Se nÃ£o encontrou primeira marcaÃ§Ã£o, verificar se hÃ¡ entrada no registro antigo
    IF v_first_event_at IS NULL THEN
        SELECT 
            (tr.data_registro + tr.entrada)::TIMESTAMP WITH TIME ZONE
        INTO v_first_event_at
        FROM rh.time_records tr
        WHERE tr.id = v_existing_record_id
          AND tr.entrada IS NOT NULL;
    END IF;
    
    -- Se ainda nÃ£o encontrou primeira marcaÃ§Ã£o, considerar como novo registro
    IF v_first_event_at IS NULL THEN
        RETURN QUERY SELECT 
            p_current_date as valid_date,
            true as is_new_record,
            NULL::TIMESTAMP WITH TIME ZONE as first_mark_time,
            0::NUMERIC as hours_elapsed,
            v_window_hours as window_hours;
        RETURN;
    END IF;
    
    -- Calcular horas decorridas desde a primeira marcaÃ§Ã£o
    v_hours_elapsed := EXTRACT(EPOCH FROM (v_current_timestamp - v_first_event_at)) / 3600;
    
    -- Verificar se estÃ¡ dentro da janela
    v_is_within_window := v_hours_elapsed <= v_window_hours;
    
    -- Se estÃ¡ dentro da janela, usar o registro existente
    IF v_is_within_window THEN
        RETURN QUERY SELECT 
            p_current_date as valid_date,
            false as is_new_record,
            v_first_event_at as first_mark_time,
            v_hours_elapsed as hours_elapsed,
            v_window_hours as window_hours;
    ELSE
        -- Se estÃ¡ fora da janela, criar novo registro para o dia atual
        RETURN QUERY SELECT 
            p_current_date as valid_date,
            true as is_new_record,
            v_first_event_at as first_mark_time,
            v_hours_elapsed as hours_elapsed,
            v_window_hours as window_hours;
    END IF;
END;
$$;


ALTER FUNCTION "rh"."validate_time_record_window"("p_employee_id" "uuid", "p_company_id" "uuid", "p_current_date" "date", "p_current_time" time without time zone) OWNER TO "postgres";


COMMENT ON FUNCTION "rh"."validate_time_record_window"("p_employee_id" "uuid", "p_company_id" "uuid", "p_current_date" "date", "p_current_time" time without time zone) IS 'Valida se a marcaÃ§Ã£o estÃ¡ dentro da janela de tempo configurada. Retorna a data correta e se deve criar novo registro.';



CREATE TABLE IF NOT EXISTS "rh"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "matricula" character varying(50),
    "cpf" character varying(14) NOT NULL,
    "rg" character varying(20),
    "data_nascimento" "date",
    "data_admissao" "date" NOT NULL,
    "data_demissao" "date",
    "cargo_id" "uuid",
    "departamento_id" "uuid",
    "salario_base" numeric(10,2),
    "status" character varying(20) DEFAULT 'ativo'::character varying,
    "telefone" character varying(20),
    "email" character varying(255),
    "endereco" "text",
    "cidade" character varying(100),
    "estado" character varying(2),
    "cep" character varying(10),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "gestor_imediato_id" "uuid",
    "certidao_nascimento" character varying(255),
    "certidao_casamento" character varying(255),
    "titulo_eleitor" character varying(255),
    "ctps" character varying(255),
    "pis_pasep" character varying(255),
    "certificado_reservista" character varying(255),
    "comprovante_endereco" character varying(255),
    "foto_funcionario" "text",
    "escolaridade" character varying(100),
    "tipo_cnh" character varying(10),
    "cartao_sus" character varying(255),
    "registros_profissionais" "jsonb",
    "outros_vinculos_empregaticios" boolean DEFAULT false,
    "detalhes_outros_vinculos" "text",
    "banco_nome" character varying(255),
    "banco_agencia" character varying(20),
    "banco_conta" character varying(50),
    "banco_tipo_conta" character varying(20),
    "banco_pix" character varying(255),
    "cost_center_id" "uuid",
    "work_shift_id" "uuid",
    "requer_registro_ponto" boolean DEFAULT true,
    "estado_civil" character varying(50),
    "nacionalidade" character varying(100),
    "naturalidade" character varying(100),
    "nome_mae" character varying(255),
    "nome_pai" character varying(255),
    "rg_orgao_emissor" character varying(20),
    "rg_uf_emissao" character varying(2),
    "rg_data_emissao" "date",
    "titulo_eleitor_zona" character varying(10),
    "titulo_eleitor_secao" character varying(10),
    "ctps_serie" character varying(20),
    "ctps_uf" character varying(2),
    "ctps_data_emissao" "date",
    "cnh_numero" character varying(20),
    "cnh_validade" "date",
    "cnh_categoria" character varying(10),
    "sexo" character varying(20),
    "orientacao_sexual" character varying(50),
    "possui_deficiencia" boolean DEFAULT false,
    "deficiencia_tipo_id" "uuid",
    "deficiencia_grau" character varying(50),
    "deficiencia_laudo_url" "text",
    "rne_numero" character varying(50),
    "rne_orgao" character varying(100),
    "rne_data_expedicao" "date",
    "certidao_casamento_numero" character varying(100),
    "certidao_casamento_data" "date",
    "certidao_uniao_estavel_numero" character varying(100),
    "certidao_uniao_estavel_data" "date",
    "tipo_contrato_trabalho" character varying(50),
    "vinculo_periculosidade" boolean DEFAULT false,
    "vinculo_insalubridade" boolean DEFAULT false,
    "grau_insalubridade" character varying(20),
    CONSTRAINT "employees_deficiencia_grau_check" CHECK ((("deficiencia_grau")::"text" = ANY ((ARRAY['leve'::character varying, 'moderada'::character varying, 'severa'::character varying, 'profunda'::character varying])::"text"[]))),
    CONSTRAINT "employees_grau_insalubridade_check" CHECK ((("grau_insalubridade")::"text" = ANY ((ARRAY['minimo'::character varying, 'medio'::character varying, 'maximo'::character varying])::"text"[]))),
    CONSTRAINT "employees_orientacao_sexual_check" CHECK ((("orientacao_sexual")::"text" = ANY ((ARRAY['heterossexual'::character varying, 'homossexual'::character varying, 'bissexual'::character varying, 'pansexual'::character varying, 'assexual'::character varying, 'outro'::character varying, 'nao_informar'::character varying, 'prefiro_nao_dizer'::character varying])::"text"[]))),
    CONSTRAINT "employees_sexo_check" CHECK ((("sexo")::"text" = ANY ((ARRAY['masculino'::character varying, 'feminino'::character varying, 'outro'::character varying, 'nao_informar'::character varying])::"text"[]))),
    CONSTRAINT "employees_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'inativo'::character varying, 'afastado'::character varying, 'demitido'::character varying])::"text"[]))),
    CONSTRAINT "employees_tipo_contrato_trabalho_check" CHECK ((("tipo_contrato_trabalho")::"text" = ANY ((ARRAY['CLT'::character varying, 'PJ'::character varying, 'Estagiario'::character varying, 'Menor_Aprendiz'::character varying, 'Terceirizado'::character varying, 'Autonomo'::character varying, 'Cooperado'::character varying, 'Temporario'::character varying, 'Intermitente'::character varying, 'Outro'::character varying])::"text"[])))
);


ALTER TABLE "rh"."employees" OWNER TO "postgres";


COMMENT ON COLUMN "rh"."employees"."gestor_imediato_id" IS 'ID do gestor imediato. Pode ser um employee_id (funcionário) ou user_id (usuário terceirizado). 
Se for employee_id, referencia rh.employees(id). 
Se for user_id, referencia auth.users(id) através de public.users(id).';



COMMENT ON COLUMN "rh"."employees"."certidao_nascimento" IS 'NÃºmero da certidÃ£o de nascimento';



COMMENT ON COLUMN "rh"."employees"."certidao_casamento" IS 'Campo legado - use certidao_casamento_numero e certidao_casamento_data';



COMMENT ON COLUMN "rh"."employees"."titulo_eleitor" IS 'NÃºmero do tÃ­tulo de eleitor';



COMMENT ON COLUMN "rh"."employees"."ctps" IS 'NÃºmero da Carteira de Trabalho (CTPS)';



COMMENT ON COLUMN "rh"."employees"."pis_pasep" IS 'NÃºmero do PIS/PASEP ou NIS/NIT';



COMMENT ON COLUMN "rh"."employees"."certificado_reservista" IS 'NÃºmero do certificado de reservista (homens atÃ© 45 anos)';



COMMENT ON COLUMN "rh"."employees"."comprovante_endereco" IS 'Comprovante de endereÃ§o atualizado (Ãºltimos 3 meses)';



COMMENT ON COLUMN "rh"."employees"."foto_funcionario" IS 'URL da foto do funcionÃ¡rio';



COMMENT ON COLUMN "rh"."employees"."escolaridade" IS 'NÃ­vel de escolaridade';



COMMENT ON COLUMN "rh"."employees"."tipo_cnh" IS 'Campo legado - use cnh_categoria';



COMMENT ON COLUMN "rh"."employees"."cartao_sus" IS 'NÃºmero do cartÃ£o do SUS';



COMMENT ON COLUMN "rh"."employees"."registros_profissionais" IS 'Registros profissionais (CREA, CRM, OAB, Coren, etc.) em formato JSON';



COMMENT ON COLUMN "rh"."employees"."outros_vinculos_empregaticios" IS 'Possui outros vÃ­nculos empregatÃ­cios';



COMMENT ON COLUMN "rh"."employees"."detalhes_outros_vinculos" IS 'Detalhes dos outros vÃ­nculos empregatÃ­cios';



COMMENT ON COLUMN "rh"."employees"."banco_nome" IS 'Nome do banco';



COMMENT ON COLUMN "rh"."employees"."banco_agencia" IS 'NÃºmero da agÃªncia';



COMMENT ON COLUMN "rh"."employees"."banco_conta" IS 'NÃºmero da conta';



COMMENT ON COLUMN "rh"."employees"."banco_tipo_conta" IS 'Tipo da conta (corrente, poupanÃ§a, salÃ¡rio)';



COMMENT ON COLUMN "rh"."employees"."banco_pix" IS 'Chave PIX';



COMMENT ON COLUMN "rh"."employees"."cost_center_id" IS 'Centro de custo associado ao funcionÃ¡rio';



COMMENT ON COLUMN "rh"."employees"."work_shift_id" IS 'Turno de trabalho associado ao funcionÃ¡rio';



COMMENT ON COLUMN "rh"."employees"."requer_registro_ponto" IS 'Indica se o funcionário precisa registrar ponto. Baseado no Artigo 62 da CLT. Default: true (requer registro).';



COMMENT ON COLUMN "rh"."employees"."rg_orgao_emissor" IS 'Órgão emissor do RG (SSP, IFP, etc.)';



COMMENT ON COLUMN "rh"."employees"."rg_uf_emissao" IS 'UF de emissão do RG';



COMMENT ON COLUMN "rh"."employees"."rg_data_emissao" IS 'Data de emissão do RG';



COMMENT ON COLUMN "rh"."employees"."titulo_eleitor_zona" IS 'Zona eleitoral do título de eleitor';



COMMENT ON COLUMN "rh"."employees"."titulo_eleitor_secao" IS 'Seção eleitoral do título de eleitor';



COMMENT ON COLUMN "rh"."employees"."ctps_serie" IS 'Série da CTPS';



COMMENT ON COLUMN "rh"."employees"."ctps_uf" IS 'UF de emissão da CTPS';



COMMENT ON COLUMN "rh"."employees"."ctps_data_emissao" IS 'Data de emissão da CTPS';



COMMENT ON COLUMN "rh"."employees"."cnh_numero" IS 'Número da CNH';



COMMENT ON COLUMN "rh"."employees"."cnh_validade" IS 'Data de validade da CNH';



COMMENT ON COLUMN "rh"."employees"."cnh_categoria" IS 'Categoria da CNH (A, B, C, D, E, AB, AC, AD, AE)';



COMMENT ON COLUMN "rh"."employees"."sexo" IS 'Sexo do funcionário';



COMMENT ON COLUMN "rh"."employees"."orientacao_sexual" IS 'Orientação sexual do funcionário';



COMMENT ON COLUMN "rh"."employees"."possui_deficiencia" IS 'Indica se o funcionário possui deficiência';



COMMENT ON COLUMN "rh"."employees"."deficiencia_tipo_id" IS 'ID do tipo de deficiência (referência a deficiency_types)';



COMMENT ON COLUMN "rh"."employees"."deficiencia_grau" IS 'Grau da deficiência (leve, moderada, severa, profunda)';



COMMENT ON COLUMN "rh"."employees"."deficiencia_laudo_url" IS 'URL do anexo do laudo médico da deficiência';



COMMENT ON COLUMN "rh"."employees"."rne_numero" IS 'Número do Registro Nacional de Estrangeiro';



COMMENT ON COLUMN "rh"."employees"."rne_orgao" IS 'Órgão emissor do RNE';



COMMENT ON COLUMN "rh"."employees"."rne_data_expedicao" IS 'Data de expedição do RNE';



COMMENT ON COLUMN "rh"."employees"."certidao_casamento_numero" IS 'Número da certidão de casamento';



COMMENT ON COLUMN "rh"."employees"."certidao_casamento_data" IS 'Data da certidão de casamento';



COMMENT ON COLUMN "rh"."employees"."certidao_uniao_estavel_numero" IS 'Número da certidão de união estável';



COMMENT ON COLUMN "rh"."employees"."certidao_uniao_estavel_data" IS 'Data da certidão de união estável';



COMMENT ON COLUMN "rh"."employees"."tipo_contrato_trabalho" IS 'Tipo de contrato de trabalho (CLT, PJ, Estagiário, etc.)';



COMMENT ON COLUMN "rh"."employees"."vinculo_periculosidade" IS 'Indica se o funcionário tem vínculo a periculosidade';



COMMENT ON COLUMN "rh"."employees"."vinculo_insalubridade" IS 'Indica se o funcionário tem vínculo a insalubridade';



COMMENT ON COLUMN "rh"."employees"."grau_insalubridade" IS 'Grau de insalubridade (mínimo, médio, máximo)';



CREATE TABLE IF NOT EXISTS "rh"."time_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "data_registro" "date" NOT NULL,
    "entrada" time without time zone,
    "saida" time without time zone,
    "entrada_almoco" time without time zone,
    "saida_almoco" time without time zone,
    "horas_trabalhadas" numeric(4,2) DEFAULT 0,
    "horas_extras" numeric(4,2) DEFAULT 0,
    "horas_faltas" numeric(4,2) DEFAULT 0,
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "observacoes" "text",
    "aprovado_por" "uuid",
    "aprovado_em" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "entrada_extra1" time without time zone,
    "saida_extra1" time without time zone,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "endereco" "text",
    "localizacao_type" character varying(20) DEFAULT 'gps'::character varying,
    "foto_url" "text",
    "outside_zone" boolean DEFAULT false NOT NULL,
    "horas_extras_50" numeric(4,2) DEFAULT 0,
    "horas_extras_100" numeric(4,2) DEFAULT 0,
    "horas_para_banco" numeric(4,2) DEFAULT 0,
    "horas_para_pagamento" numeric(4,2) DEFAULT 0,
    "is_feriado" boolean DEFAULT false,
    "is_domingo" boolean DEFAULT false,
    "is_dia_folga" boolean DEFAULT false,
    "horas_negativas" numeric(4,2) DEFAULT 0,
    "horas_noturnas" numeric(4,2) DEFAULT 0,
    CONSTRAINT "time_records_localizacao_type_check" CHECK ((("localizacao_type")::"text" = ANY ((ARRAY['gps'::character varying, 'manual'::character varying, 'wifi'::character varying])::"text"[]))),
    CONSTRAINT "time_records_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'rejeitado'::character varying, 'corrigido'::character varying])::"text"[])))
);


ALTER TABLE "rh"."time_records" OWNER TO "postgres";


COMMENT ON COLUMN "rh"."time_records"."latitude" IS 'Latitude da localizacao GPS onde o ponto foi registrado';



COMMENT ON COLUMN "rh"."time_records"."longitude" IS 'Longitude da localizacao GPS onde o ponto foi registrado';



COMMENT ON COLUMN "rh"."time_records"."endereco" IS 'Endereco completo obtido via reverse geocoding';



COMMENT ON COLUMN "rh"."time_records"."localizacao_type" IS 'Tipo de localizacao: gps (GPS), manual (manual), wifi (WiFi)';



COMMENT ON COLUMN "rh"."time_records"."foto_url" IS 'URL da foto capturada durante o registro de ponto no Supabase Storage';



COMMENT ON COLUMN "rh"."time_records"."horas_extras_50" IS 'Horas extras com adicional de 50%';



COMMENT ON COLUMN "rh"."time_records"."horas_extras_100" IS 'Horas extras com adicional de 100%';



COMMENT ON COLUMN "rh"."time_records"."horas_para_banco" IS 'Horas que v??o para o banco de horas (apenas 50%)';



COMMENT ON COLUMN "rh"."time_records"."horas_para_pagamento" IS 'Horas que devem ser pagas diretamente (100%)';



COMMENT ON COLUMN "rh"."time_records"."is_feriado" IS 'Indica se o dia ?? feriado';



COMMENT ON COLUMN "rh"."time_records"."is_domingo" IS 'Indica se o dia ?? domingo';



COMMENT ON COLUMN "rh"."time_records"."is_dia_folga" IS 'Indica se ?? dia de folga do funcion??rio';



COMMENT ON COLUMN "rh"."time_records"."horas_negativas" IS 'Horas negativas quando o funcion??rio trabalhou menos que o esperado no dia. 
   Diferente de horas_faltas que ?? para faltas justificadas.';



COMMENT ON COLUMN "rh"."time_records"."horas_noturnas" IS 'Horas trabalhadas no per?odo noturno (22h ?s 5h do dia seguinte). 
   Conforme CLT, trabalho noturno tem adicional de 20% sobre a hora normal.';



CREATE TABLE IF NOT EXISTS "rh"."trainings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao" "text",
    "tipo_treinamento" character varying(100) NOT NULL,
    "categoria" character varying(100),
    "carga_horaria" integer NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date" NOT NULL,
    "data_limite_inscricao" "date",
    "vagas_totais" integer,
    "vagas_disponiveis" integer,
    "local" character varying(255),
    "modalidade" character varying(50) DEFAULT 'presencial'::character varying NOT NULL,
    "instrutor" character varying(255),
    "instrutor_email" character varying(255),
    "instrutor_telefone" character varying(20),
    "custo_por_participante" numeric(10,2) DEFAULT 0,
    "requisitos" "text",
    "objetivos" "text",
    "conteudo_programatico" "text",
    "metodologia" "text",
    "recursos_necessarios" "text",
    "status" character varying(50) DEFAULT 'planejado'::character varying NOT NULL,
    "aprovado_por" "uuid",
    "data_aprovacao" timestamp with time zone,
    "observacoes" "text",
    "anexos" "text"[],
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "permite_avaliacao_reacao" boolean DEFAULT true,
    "permite_avaliacao_aplicacao" boolean DEFAULT false,
    "tempo_limite_dias" integer,
    "permite_pausar" boolean DEFAULT true,
    "exige_prova_final" boolean DEFAULT false,
    "nota_minima_certificado" numeric(5,2) DEFAULT 70.00
);


ALTER TABLE "rh"."trainings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."compensation_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "tipo" character varying(50) NOT NULL,
    "data_solicitacao" timestamp with time zone DEFAULT "now"(),
    "data_inicio" "date" NOT NULL,
    "quantidade_horas" numeric(5,2) NOT NULL,
    "descricao" "text" NOT NULL,
    "status" character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    "aprovado_por" "uuid",
    "data_aprovacao" timestamp with time zone,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "data_fim" "date",
    "valor_hora" numeric(10,2),
    "valor_total" numeric(10,2),
    "motivo_rejeicao" "text",
    "anexos" "text"[],
    CONSTRAINT "compensation_requests_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'rejeitado'::character varying, 'realizado'::character varying])::"text"[]))),
    CONSTRAINT "compensation_requests_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['horas_extras'::character varying, 'banco_horas'::character varying, 'adicional_noturno'::character varying, 'adicional_periculosidade'::character varying, 'adicional_insalubridade'::character varying, 'dsr'::character varying, 'feriado'::character varying, 'outros'::character varying])::"text"[])))
);


ALTER TABLE "rh"."compensation_requests" OWNER TO "postgres";


COMMENT ON TABLE "rh"."compensation_requests" IS 'Tabela de solicitações de compensação de horas - ESTRUTURA PADRONIZADA';



COMMENT ON COLUMN "rh"."compensation_requests"."employee_id" IS 'ID do funcionário que solicitou a compensação';



COMMENT ON COLUMN "rh"."compensation_requests"."tipo" IS 'Tipo de compensação: horas_extras, banco_horas, adicional_noturno, etc.';



COMMENT ON COLUMN "rh"."compensation_requests"."data_inicio" IS 'Data de início da compensação';



COMMENT ON COLUMN "rh"."compensation_requests"."quantidade_horas" IS 'Quantidade de horas solicitadas para compensação';



COMMENT ON COLUMN "rh"."compensation_requests"."descricao" IS 'Descrição/justificativa da solicitação';



COMMENT ON COLUMN "rh"."compensation_requests"."status" IS 'Status: pendente, aprovado, rejeitado, realizado';



COMMENT ON COLUMN "rh"."compensation_requests"."aprovado_por" IS 'UsuÃ¡rio que aprovou/rejeitou a solicitaÃ§Ã£o';



COMMENT ON COLUMN "rh"."compensation_requests"."data_fim" IS 'Data de fim da compensação';



COMMENT ON COLUMN "rh"."compensation_requests"."valor_hora" IS 'Valor da hora (opcional)';



COMMENT ON COLUMN "rh"."compensation_requests"."valor_total" IS 'Valor total calculado (opcional)';



COMMENT ON COLUMN "rh"."compensation_requests"."motivo_rejeicao" IS 'Motivo da rejeiÃ§Ã£o (quando aplicÃ¡vel)';



COMMENT ON COLUMN "rh"."compensation_requests"."anexos" IS 'Array de URLs dos anexos';



CREATE TABLE IF NOT EXISTS "rh"."disciplinary_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "tipo_acao" character varying(30) NOT NULL,
    "data_ocorrencia" "date" NOT NULL,
    "data_aplicacao" "date" NOT NULL,
    "gravidade" character varying(20) NOT NULL,
    "motivo" "text" NOT NULL,
    "descricao_ocorrencia" "text" NOT NULL,
    "medidas_corretivas" "text",
    "status" character varying(20) DEFAULT 'ativo'::character varying NOT NULL,
    "aplicado_por" "uuid",
    "aprovado_por" "uuid",
    "data_aprovacao" timestamp with time zone,
    "observacoes" "text",
    "anexos" "text"[],
    "data_arquivamento" timestamp with time zone,
    "motivo_arquivamento" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "duration_days" integer,
    "start_date" "date",
    "end_date" "date",
    "documents" "jsonb",
    "is_active" boolean DEFAULT true,
    CONSTRAINT "disciplinary_actions_gravidade_check" CHECK ((("gravidade")::"text" = ANY ((ARRAY['leve'::character varying, 'moderada'::character varying, 'grave'::character varying, 'gravissima'::character varying])::"text"[]))),
    CONSTRAINT "disciplinary_actions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'suspended'::character varying, 'expired'::character varying, 'cancelled'::character varying])::"text"[]))),
    CONSTRAINT "disciplinary_actions_tipo_acao_check" CHECK ((("tipo_acao")::"text" = ANY ((ARRAY['advertencia_verbal'::character varying, 'advertencia_escrita'::character varying, 'suspensao'::character varying, 'demissao_justa_causa'::character varying])::"text"[])))
);


ALTER TABLE "rh"."disciplinary_actions" OWNER TO "postgres";


COMMENT ON TABLE "rh"."disciplinary_actions" IS 'Ações disciplinares aplicadas aos funcionários - Estrutura atualizada conforme documentação';



COMMENT ON COLUMN "rh"."disciplinary_actions"."tipo_acao" IS 'Tipo: advertencia, suspensao, demissao_justa_causa, transferencia, outros';



COMMENT ON COLUMN "rh"."disciplinary_actions"."gravidade" IS 'Gravidade: leve, moderada, grave, gravissima';



COMMENT ON COLUMN "rh"."disciplinary_actions"."status" IS 'Status: ativo, suspenso, cancelado, arquivado';



COMMENT ON COLUMN "rh"."disciplinary_actions"."aplicado_por" IS 'UsuÃ¡rio que aplicou a aÃ§Ã£o disciplinar';



COMMENT ON COLUMN "rh"."disciplinary_actions"."aprovado_por" IS 'UsuÃ¡rio que aprovou a aÃ§Ã£o disciplinar';



COMMENT ON COLUMN "rh"."disciplinary_actions"."anexos" IS 'Array de URLs dos arquivos anexados (evidÃªncias, testemunhos, etc.)';



COMMENT ON COLUMN "rh"."disciplinary_actions"."duration_days" IS 'Duração em dias para suspensões';



COMMENT ON COLUMN "rh"."disciplinary_actions"."start_date" IS 'Data de início da suspensão';



COMMENT ON COLUMN "rh"."disciplinary_actions"."end_date" IS 'Data de fim da suspensão';



COMMENT ON COLUMN "rh"."disciplinary_actions"."documents" IS 'Documentos anexados (evidências, testemunhos, etc.)';



COMMENT ON COLUMN "rh"."disciplinary_actions"."is_active" IS 'Indica se a ação está ativa';



CREATE TABLE IF NOT EXISTS "rh"."medical_certificates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "numero_atestado" character varying(100),
    "data_emissao" "date" NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date" NOT NULL,
    "dias_afastamento" integer NOT NULL,
    "cid_codigo" character varying(10),
    "cid_descricao" "text",
    "observacoes" "text",
    "anexo_url" "text",
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "aprovado_por" "uuid",
    "aprovado_em" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "medico_nome" character varying(255),
    "crm_crmo" character varying(50),
    "especialidade" character varying(255),
    "tipo_atestado" character varying(50) DEFAULT 'medico'::character varying,
    "valor_beneficio" numeric(10,2) DEFAULT 0,
    "data_aprovacao" timestamp with time zone,
    "atestado_comparecimento" boolean DEFAULT false,
    "horas_comparecimento" numeric(5,2),
    CONSTRAINT "medical_certificates_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'rejeitado'::character varying, 'em_andamento'::character varying, 'concluido'::character varying])::"text"[]))),
    CONSTRAINT "medical_certificates_tipo_atestado_check" CHECK ((("tipo_atestado")::"text" = ANY ((ARRAY['medico'::character varying, 'odontologico'::character varying, 'psicologico'::character varying])::"text"[])))
);


ALTER TABLE "rh"."medical_certificates" OWNER TO "postgres";


COMMENT ON TABLE "rh"."medical_certificates" IS 'Tabela de atestados mÃ©dicos dos funcionÃ¡rios';



COMMENT ON COLUMN "rh"."medical_certificates"."aprovado_por" IS 'ID do usuário que aprovou o atestado (referencia users.id)';



COMMENT ON COLUMN "rh"."medical_certificates"."medico_nome" IS 'Nome do mÃ©dico que emitiu o atestado';



COMMENT ON COLUMN "rh"."medical_certificates"."crm_crmo" IS 'CRM/CRMO do mÃ©dico';



COMMENT ON COLUMN "rh"."medical_certificates"."especialidade" IS 'Especialidade mÃ©dica';



COMMENT ON COLUMN "rh"."medical_certificates"."tipo_atestado" IS 'Tipo do atestado: medico, odontologico, psicologico';



COMMENT ON COLUMN "rh"."medical_certificates"."valor_beneficio" IS 'Valor do benefÃ­cio a ser pago';



COMMENT ON COLUMN "rh"."medical_certificates"."data_aprovacao" IS 'Data de aprovaÃ§Ã£o do atestado';



COMMENT ON COLUMN "rh"."medical_certificates"."atestado_comparecimento" IS 'Indica se o atestado é de comparecimento (ex.: consulta)';



COMMENT ON COLUMN "rh"."medical_certificates"."horas_comparecimento" IS 'Quantidade de horas em decimal para atestado de comparecimento (uso no banco de horas)';



CREATE TABLE IF NOT EXISTS "rh"."periodic_exams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "tipo_exame" character varying(30) NOT NULL,
    "data_agendamento" "date" NOT NULL,
    "data_realizacao" "date",
    "data_vencimento" "date" NOT NULL,
    "status" character varying(20) DEFAULT 'agendado'::character varying NOT NULL,
    "medico_responsavel" character varying(255),
    "clinica_local" character varying(255),
    "observacoes" "text",
    "resultado" character varying(20),
    "restricoes" "text",
    "anexos" "text"[],
    "custo" numeric(10,2),
    "pago" boolean DEFAULT false,
    "data_pagamento" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "periodic_exams_resultado_check" CHECK ((("resultado")::"text" = ANY ((ARRAY['apto'::character varying, 'inapto'::character varying, 'apto_com_restricoes'::character varying, 'pendente'::character varying])::"text"[]))),
    CONSTRAINT "periodic_exams_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['agendado'::character varying, 'realizado'::character varying, 'vencido'::character varying, 'cancelado'::character varying, 'reagendado'::character varying])::"text"[]))),
    CONSTRAINT "periodic_exams_tipo_exame_check" CHECK ((("tipo_exame")::"text" = ANY ((ARRAY['admissional'::character varying, 'periodico'::character varying, 'demissional'::character varying, 'retorno_trabalho'::character varying, 'mudanca_funcao'::character varying, 'ambiental'::character varying])::"text"[])))
);


ALTER TABLE "rh"."periodic_exams" OWNER TO "postgres";


COMMENT ON TABLE "rh"."periodic_exams" IS 'Dados de exemplo inseridos para teste do sistema de exames periÃ³dicos';



COMMENT ON COLUMN "rh"."periodic_exams"."tipo_exame" IS 'Tipo: admissional, periodico, demissional, retorno_trabalho, mudanca_funcao, ambiental';



COMMENT ON COLUMN "rh"."periodic_exams"."status" IS 'Status: agendado, realizado, vencido, cancelado, reagendado';



COMMENT ON COLUMN "rh"."periodic_exams"."resultado" IS 'Resultado: apto, inapto, apto_com_restricoes, pendente';



COMMENT ON COLUMN "rh"."periodic_exams"."anexos" IS 'Array de URLs dos arquivos anexados (laudos, atestados, etc.)';



COMMENT ON COLUMN "rh"."periodic_exams"."custo" IS 'Custo do exame para controle financeiro';



CREATE TABLE IF NOT EXISTS "rh"."reimbursement_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "tipo_despesa" character varying(50) NOT NULL,
    "valor_solicitado" numeric(10,2) NOT NULL,
    "data_despesa" "date" NOT NULL,
    "descricao" "text" NOT NULL,
    "comprovante_url" "text",
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "solicitado_por" "uuid",
    "aprovado_por" "uuid",
    "aprovado_em" timestamp with time zone,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reimbursement_requests_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'rejeitado'::character varying])::"text"[]))),
    CONSTRAINT "reimbursement_requests_tipo_despesa_check" CHECK ((("tipo_despesa")::"text" = ANY ((ARRAY['alimentacao'::character varying, 'transporte'::character varying, 'hospedagem'::character varying, 'combustivel'::character varying, 'outros'::character varying])::"text"[])))
);


ALTER TABLE "rh"."reimbursement_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."vacations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "tipo" character varying(50) NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date" NOT NULL,
    "dias_solicitados" integer NOT NULL,
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "observacoes" "text",
    "anexos" "text"[],
    "solicitado_por" "uuid",
    "aprovado_por" "uuid",
    "aprovado_em" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "vacations_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'rejeitado'::character varying, 'em_andamento'::character varying, 'concluido'::character varying])::"text"[]))),
    CONSTRAINT "vacations_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['ferias'::character varying, 'licenca_medica'::character varying, 'licenca_maternidade'::character varying, 'licenca_paternidade'::character varying, 'afastamento'::character varying, 'outros'::character varying])::"text"[])))
);


ALTER TABLE "rh"."vacations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."absence_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao" "text",
    "tipo" character varying(50) NOT NULL,
    "maximo_dias" integer,
    "remunerado" boolean DEFAULT false,
    "desconta_salario" boolean DEFAULT false,
    "desconta_ferias" boolean DEFAULT false,
    "desconta_13_salario" boolean DEFAULT false,
    "requer_anexo" boolean DEFAULT false,
    "requer_aprovacao" boolean DEFAULT false,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "absence_types_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['ferias'::character varying, 'licenca_medica'::character varying, 'licenca_maternidade'::character varying, 'licenca_paternidade'::character varying, 'licenca_casamento'::character varying, 'licenca_luto'::character varying, 'afastamento_medico'::character varying, 'suspensao'::character varying, 'afastamento_sem_vencimento'::character varying])::"text"[]))),
    CONSTRAINT "check_absence_type_maximo_dias" CHECK ((("maximo_dias" IS NULL) OR ("maximo_dias" > 0)))
);


ALTER TABLE "rh"."absence_types" OWNER TO "postgres";


COMMENT ON TABLE "rh"."absence_types" IS 'Tabela de tipos de afastamento e licen??as';



COMMENT ON COLUMN "rh"."absence_types"."tipo" IS 'Tipo do afastamento: ferias, licenca_medica, licenca_maternidade, etc.';



COMMENT ON COLUMN "rh"."absence_types"."maximo_dias" IS 'N??mero m??ximo de dias permitidos para este tipo de afastamento';



COMMENT ON COLUMN "rh"."absence_types"."remunerado" IS 'Se o afastamento ?? remunerado';



COMMENT ON COLUMN "rh"."absence_types"."desconta_salario" IS 'Se desconta do sal??rio mensal';



COMMENT ON COLUMN "rh"."absence_types"."desconta_ferias" IS 'Se desconta do per??odo de f??rias';



COMMENT ON COLUMN "rh"."absence_types"."requer_aprovacao" IS 'Se requer aprova????o pr??via';



CREATE TABLE IF NOT EXISTS "rh"."allowance_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "codigo" character varying(50),
    "descricao" "text",
    "tipo" character varying(50) NOT NULL,
    "calculo_automatico" boolean DEFAULT false,
    "percentual_base" numeric(5,4),
    "valor_fixo" numeric(10,2),
    "incidencia_ferias" boolean DEFAULT true,
    "incidencia_13_salario" boolean DEFAULT true,
    "incidencia_aviso_previo" boolean DEFAULT true,
    "incidencia_fgts" boolean DEFAULT true,
    "incidencia_inss" boolean DEFAULT true,
    "incidencia_ir" boolean DEFAULT true,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "allowance_types_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['adicional'::character varying, 'bonus'::character varying, 'comissao'::character varying, 'gratificacao'::character varying, 'horas_extras'::character varying, 'adicional_noturno'::character varying, 'adicional_periculosidade'::character varying, 'adicional_insalubridade'::character varying])::"text"[]))),
    CONSTRAINT "check_allowance_type_valor_percentual" CHECK (((("percentual_base" IS NOT NULL) AND ("valor_fixo" IS NULL)) OR (("percentual_base" IS NULL) AND ("valor_fixo" IS NOT NULL)) OR (("percentual_base" IS NULL) AND ("valor_fixo" IS NULL))))
);


ALTER TABLE "rh"."allowance_types" OWNER TO "postgres";


COMMENT ON TABLE "rh"."allowance_types" IS 'Tabela de tipos de adicionais salariais';



COMMENT ON COLUMN "rh"."allowance_types"."tipo" IS 'Tipo do adicional: adicional, bonus, comissao, gratificacao, horas_extras, etc.';



COMMENT ON COLUMN "rh"."allowance_types"."percentual_base" IS 'Percentual sobre a base de c??lculo';



COMMENT ON COLUMN "rh"."allowance_types"."incidencia_ferias" IS 'Se o adicional incide no c??lculo de f??rias';



COMMENT ON COLUMN "rh"."allowance_types"."incidencia_13_salario" IS 'Se o adicional incide no 13?? sal??rio';



CREATE TABLE IF NOT EXISTS "rh"."approval_level_approvers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "approval_level_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."approval_level_approvers" OWNER TO "postgres";


COMMENT ON TABLE "rh"."approval_level_approvers" IS 'Aprovadores por nÃ­vel de aprovaÃ§Ã£o';



CREATE TABLE IF NOT EXISTS "rh"."approval_levels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "level_order" integer NOT NULL,
    "required_approvals" integer DEFAULT 1,
    "max_amount" numeric(10,2),
    "max_hours" numeric(5,2),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."approval_levels" OWNER TO "postgres";


COMMENT ON TABLE "rh"."approval_levels" IS 'NÃ­veis de aprovaÃ§Ã£o hierÃ¡rquica para compensaÃ§Ãµes';



CREATE TABLE IF NOT EXISTS "rh"."attendance_corrections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "data_original" "date" NOT NULL,
    "entrada_original" time without time zone,
    "saida_original" time without time zone,
    "entrada_corrigida" time without time zone,
    "saida_corrigida" time without time zone,
    "justificativa" "text" NOT NULL,
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "solicitado_por" "uuid",
    "aprovado_por" "uuid",
    "aprovado_em" timestamp with time zone,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "entrada_almoco_original" time without time zone,
    "saida_almoco_original" time without time zone,
    "entrada_almoco_corrigida" time without time zone,
    "saida_almoco_corrigida" time without time zone,
    "entrada_extra1_original" time without time zone,
    "saida_extra1_original" time without time zone,
    "entrada_extra1_corrigida" time without time zone,
    "saida_extra1_corrigida" time without time zone,
    "entrada_corrigida_date" "date",
    "saida_corrigida_date" "date",
    "entrada_almoco_corrigida_date" "date",
    "saida_almoco_corrigida_date" "date",
    "entrada_extra1_corrigida_date" "date",
    "saida_extra1_corrigida_date" "date",
    CONSTRAINT "attendance_corrections_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'rejeitado'::character varying])::"text"[])))
);


ALTER TABLE "rh"."attendance_corrections" OWNER TO "postgres";


COMMENT ON COLUMN "rh"."attendance_corrections"."solicitado_por" IS 'UUID do usuário que solicitou a correção. Pode ser UUID de auth.users ou profiles.';



COMMENT ON COLUMN "rh"."attendance_corrections"."aprovado_por" IS 'UUID do usuário que aprovou a correção. Pode ser UUID de auth.users ou profiles.';



COMMENT ON COLUMN "rh"."attendance_corrections"."entrada_almoco_original" IS 'HorÃ¡rio original de entrada do almoÃ§o';



COMMENT ON COLUMN "rh"."attendance_corrections"."saida_almoco_original" IS 'HorÃ¡rio original de saÃ­da do almoÃ§o';



COMMENT ON COLUMN "rh"."attendance_corrections"."entrada_almoco_corrigida" IS 'HorÃ¡rio corrigido de entrada do almoÃ§o';



COMMENT ON COLUMN "rh"."attendance_corrections"."saida_almoco_corrigida" IS 'HorÃ¡rio corrigido de saÃ­da do almoÃ§o';



COMMENT ON COLUMN "rh"."attendance_corrections"."entrada_extra1_original" IS 'HorÃ¡rio original de entrada da hora extra';



COMMENT ON COLUMN "rh"."attendance_corrections"."saida_extra1_original" IS 'HorÃ¡rio original de saÃ­da da hora extra';



COMMENT ON COLUMN "rh"."attendance_corrections"."entrada_extra1_corrigida" IS 'HorÃ¡rio corrigido de entrada da hora extra';



COMMENT ON COLUMN "rh"."attendance_corrections"."saida_extra1_corrigida" IS 'HorÃ¡rio corrigido de saÃ­da da hora extra';



COMMENT ON COLUMN "rh"."attendance_corrections"."entrada_corrigida_date" IS 'Data real da entrada corrigida. Se NULL, assume-se que é igual a data_original.';



COMMENT ON COLUMN "rh"."attendance_corrections"."saida_corrigida_date" IS 'Data real da saída corrigida. Se NULL, assume-se que é igual a data_original.';



COMMENT ON COLUMN "rh"."attendance_corrections"."entrada_almoco_corrigida_date" IS 'Data real da entrada do almoço corrigida. Se NULL, assume-se que é igual a data_original.';



COMMENT ON COLUMN "rh"."attendance_corrections"."saida_almoco_corrigida_date" IS 'Data real da saída do almoço corrigida. Se NULL, assume-se que é igual a data_original.';



COMMENT ON COLUMN "rh"."attendance_corrections"."entrada_extra1_corrigida_date" IS 'Data real da entrada extra corrigida. Se NULL, assume-se que é igual a data_original.';



COMMENT ON COLUMN "rh"."attendance_corrections"."saida_extra1_corrigida_date" IS 'Data real da saída extra corrigida. Se NULL, assume-se que é igual a data_original.';



CREATE TABLE IF NOT EXISTS "rh"."audit_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "is_enabled" boolean DEFAULT true,
    "log_level" character varying(20) DEFAULT 'all'::character varying,
    "retention_days" integer DEFAULT 2555,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "audit_config_log_level_check" CHECK ((("log_level")::"text" = ANY ((ARRAY['all'::character varying, 'changes'::character varying, 'critical'::character varying])::"text"[])))
);


ALTER TABLE "rh"."audit_config" OWNER TO "postgres";


COMMENT ON TABLE "rh"."audit_config" IS 'ConfiguraÃ§Ãµes de auditoria por empresa e entidade';



CREATE TABLE IF NOT EXISTS "rh"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "action" character varying(50) NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "session_id" character varying(255),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "rh"."audit_logs" IS 'Log de auditoria para todas as aÃ§Ãµes do sistema';



CREATE TABLE IF NOT EXISTS "rh"."awards_productivity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "tipo" character varying(50) NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao" "text",
    "mes_referencia" "date" NOT NULL,
    "valor" numeric(10,2) NOT NULL,
    "percentual" numeric(5,2),
    "tipo_calculo" character varying(20) DEFAULT 'valor_fixo'::character varying NOT NULL,
    "meta_atingida" numeric(10,2),
    "meta_estabelecida" numeric(10,2),
    "percentual_atingimento" numeric(5,2),
    "criterios" "text",
    "status" character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    "data_aprovacao" "date",
    "aprovado_por" "uuid",
    "data_pagamento" "date",
    "observacoes" "text",
    "anexos" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "flash_payment_id" character varying(255),
    "flash_invoice_id" character varying(255),
    "flash_account_number" character varying(255),
    "enviado_flash_em" timestamp with time zone,
    "accounts_payable_id" "uuid",
    "enviado_contas_pagar_em" timestamp with time zone,
    CONSTRAINT "awards_productivity_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'pago'::character varying, 'cancelado'::character varying])::"text"[]))),
    CONSTRAINT "awards_productivity_tipo_calculo_check" CHECK ((("tipo_calculo")::"text" = ANY ((ARRAY['valor_fixo'::character varying, 'percentual_meta'::character varying, 'tabela_faixas'::character varying, 'comissao_venda'::character varying])::"text"[]))),
    CONSTRAINT "awards_productivity_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['premiacao'::character varying, 'produtividade'::character varying, 'bonus'::character varying, 'comissao'::character varying, 'meta'::character varying, 'outros'::character varying])::"text"[])))
);


ALTER TABLE "rh"."awards_productivity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."bank_hours_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "bank_hours_type_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "assigned_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."bank_hours_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."bank_hours_balance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "current_balance" numeric(6,2) DEFAULT 0.00,
    "accumulated_hours" numeric(6,2) DEFAULT 0.00,
    "compensated_hours" numeric(6,2) DEFAULT 0.00,
    "expired_hours" numeric(6,2) DEFAULT 0.00,
    "last_calculation_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "next_expiration_date" "date",
    "is_locked" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."bank_hours_balance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."bank_hours_calculations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "calculation_date" "date" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "employees_processed" integer DEFAULT 0,
    "hours_accumulated" numeric(8,2) DEFAULT 0.00,
    "hours_compensated" numeric(8,2) DEFAULT 0.00,
    "hours_expired" numeric(8,2) DEFAULT 0.00,
    "status" character varying(20) DEFAULT 'completed'::character varying,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "bank_hours_calculations_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['running'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "rh"."bank_hours_calculations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."bank_hours_closure" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "closure_date" "date" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "positive_balance_paid" numeric(6,2) DEFAULT 0,
    "negative_balance_zeroed" numeric(6,2) DEFAULT 0,
    "total_hours_50_paid" numeric(6,2) DEFAULT 0,
    "total_hours_100_paid" numeric(6,2) DEFAULT 0,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "error_message" "text",
    "created_by" "uuid",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "bank_hours_closure_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::"text"[])))
);


ALTER TABLE "rh"."bank_hours_closure" OWNER TO "postgres";


COMMENT ON TABLE "rh"."bank_hours_closure" IS 'Registro de fechamentos semestrais do banco de horas';



CREATE TABLE IF NOT EXISTS "rh"."bank_hours_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "has_bank_hours" boolean DEFAULT false NOT NULL,
    "accumulation_period_months" integer DEFAULT 12 NOT NULL,
    "max_accumulation_hours" numeric(5,2) DEFAULT 40.00,
    "compensation_rate" numeric(4,2) DEFAULT 1.00,
    "auto_compensate" boolean DEFAULT false,
    "compensation_priority" character varying(20) DEFAULT 'fifo'::character varying,
    "expires_after_months" integer DEFAULT 6,
    "allow_negative_balance" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "bank_hours_config_compensation_priority_check" CHECK ((("compensation_priority")::"text" = ANY ((ARRAY['fifo'::character varying, 'lifo'::character varying, 'manual'::character varying])::"text"[])))
);


ALTER TABLE "rh"."bank_hours_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."bank_hours_legacy_imports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "hours_amount" numeric(6,2) NOT NULL,
    "reference_date" "date" NOT NULL,
    "description" "text",
    "transaction_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "rh"."bank_hours_legacy_imports" OWNER TO "postgres";


COMMENT ON TABLE "rh"."bank_hours_legacy_imports" IS 'Registra importações de horas legadas aplicadas manualmente ao banco de horas';



COMMENT ON COLUMN "rh"."bank_hours_legacy_imports"."hours_amount" IS 'Quantidade de horas importadas (positivas ou negativas)';



COMMENT ON COLUMN "rh"."bank_hours_legacy_imports"."reference_date" IS 'Data de referência das horas importadas';



CREATE TABLE IF NOT EXISTS "rh"."bank_hours_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "transaction_type" character varying(20) NOT NULL,
    "transaction_date" "date" NOT NULL,
    "hours_amount" numeric(5,2) NOT NULL,
    "time_record_id" "uuid",
    "reference_period_start" "date",
    "reference_period_end" "date",
    "description" "text",
    "compensation_rate" numeric(4,2) DEFAULT 1.00,
    "is_automatic" boolean DEFAULT false,
    "created_by" "uuid",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "overtime_percentage" integer DEFAULT 50,
    "expires_at" "date",
    "is_paid" boolean DEFAULT false,
    "closure_id" "uuid",
    CONSTRAINT "bank_hours_transactions_overtime_percentage_check" CHECK (("overtime_percentage" = ANY (ARRAY[50, 100]))),
    CONSTRAINT "bank_hours_transactions_transaction_type_check" CHECK ((("transaction_type")::"text" = ANY ((ARRAY['accumulation'::character varying, 'compensation'::character varying, 'expiration'::character varying, 'adjustment'::character varying, 'transfer'::character varying])::"text"[])))
);


ALTER TABLE "rh"."bank_hours_transactions" OWNER TO "postgres";


COMMENT ON COLUMN "rh"."bank_hours_transactions"."overtime_percentage" IS 'Percentual da hora extra (50 ou 100)';



COMMENT ON COLUMN "rh"."bank_hours_transactions"."expires_at" IS 'Data de expira????o da transa????o (6 meses ap??s cria????o)';



COMMENT ON COLUMN "rh"."bank_hours_transactions"."is_paid" IS 'Indica se as horas foram pagas no fechamento';



COMMENT ON COLUMN "rh"."bank_hours_transactions"."closure_id" IS 'ID do fechamento semestral que processou esta transa????o';



CREATE TABLE IF NOT EXISTS "rh"."bank_hours_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "code" character varying(20),
    "has_bank_hours" boolean DEFAULT true NOT NULL,
    "accumulation_period_months" integer DEFAULT 12 NOT NULL,
    "max_accumulation_hours" numeric(5,2) DEFAULT 40.00,
    "compensation_rate" numeric(4,2) DEFAULT 1.00,
    "auto_compensate" boolean DEFAULT false,
    "compensation_priority" character varying(20) DEFAULT 'fifo'::character varying,
    "expires_after_months" integer DEFAULT 12,
    "allow_negative_balance" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "bank_hours_types_compensation_priority_check" CHECK ((("compensation_priority")::"text" = ANY ((ARRAY['fifo'::character varying, 'lifo'::character varying, 'manual'::character varying])::"text"[])))
);


ALTER TABLE "rh"."bank_hours_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."benefit_configurations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "benefit_type" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "calculation_type" character varying(50) NOT NULL,
    "base_value" numeric(10,2),
    "percentage_value" numeric(5,2),
    "min_value" numeric(10,2),
    "max_value" numeric(10,2),
    "daily_calculation_base" integer DEFAULT 30,
    "requires_approval" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "entra_no_calculo_folha" boolean DEFAULT true NOT NULL,
    "classe_financeira_id" "uuid",
    CONSTRAINT "benefit_configurations_benefit_type_check" CHECK ((("benefit_type")::"text" = ANY ((ARRAY['vr_va'::character varying, 'transporte'::character varying, 'equipment_rental'::character varying, 'premiacao'::character varying, 'outros'::character varying])::"text"[]))),
    CONSTRAINT "benefit_configurations_calculation_type_check" CHECK ((("calculation_type")::"text" = ANY ((ARRAY['fixed_value'::character varying, 'daily_value'::character varying, 'percentage'::character varying, 'work_days'::character varying])::"text"[])))
);


ALTER TABLE "rh"."benefit_configurations" OWNER TO "postgres";


COMMENT ON COLUMN "rh"."benefit_configurations"."entra_no_calculo_folha" IS 'Se o benefÃ­cio deve ser incluÃ­do no cÃ¡lculo da folha de pagamento';



COMMENT ON COLUMN "rh"."benefit_configurations"."classe_financeira_id" IS 'Referência à classe financeira gerencial associada ao benefício';



CREATE TABLE IF NOT EXISTS "rh"."calculation_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "processo_id" "uuid" NOT NULL,
    "tipo_processo" character varying(50) NOT NULL,
    "descricao_processo" character varying(255),
    "mes_referencia" integer NOT NULL,
    "ano_referencia" integer NOT NULL,
    "status" character varying(20) DEFAULT 'iniciado'::character varying NOT NULL,
    "progresso" integer DEFAULT 0,
    "total_funcionarios" integer DEFAULT 0,
    "funcionarios_processados" integer DEFAULT 0,
    "eventos_calculados" integer DEFAULT 0,
    "erros_encontrados" integer DEFAULT 0,
    "inicio_processamento" timestamp with time zone,
    "fim_processamento" timestamp with time zone,
    "tempo_execucao_segundos" integer,
    "usuario_id" "uuid",
    "usuario_nome" character varying(255),
    "logs_execucao" "jsonb",
    "erros_execucao" "jsonb",
    "resumo_calculos" "jsonb",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "calculation_logs_ano_referencia_check" CHECK ((("ano_referencia" >= 2000) AND ("ano_referencia" <= 2100))),
    CONSTRAINT "calculation_logs_mes_referencia_check" CHECK ((("mes_referencia" >= 1) AND ("mes_referencia" <= 12))),
    CONSTRAINT "calculation_logs_progresso_check" CHECK ((("progresso" >= 0) AND ("progresso" <= 100))),
    CONSTRAINT "calculation_logs_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['iniciado'::character varying, 'processando'::character varying, 'concluido'::character varying, 'erro'::character varying, 'cancelado'::character varying])::"text"[])))
);


ALTER TABLE "rh"."calculation_logs" OWNER TO "postgres";


COMMENT ON TABLE "rh"."calculation_logs" IS 'Logs de execuÃ§Ã£o do motor de cÃ¡lculo de folha';



COMMENT ON COLUMN "rh"."calculation_logs"."processo_id" IS 'ID Ãºnico do processo de cÃ¡lculo';



COMMENT ON COLUMN "rh"."calculation_logs"."tipo_processo" IS 'Tipo: folha_mensal, recalculo, ajuste, simulacao';



COMMENT ON COLUMN "rh"."calculation_logs"."status" IS 'Status: iniciado, processando, concluido, erro, cancelado';



COMMENT ON COLUMN "rh"."calculation_logs"."progresso" IS 'Progresso em percentual (0-100)';



COMMENT ON COLUMN "rh"."calculation_logs"."logs_execucao" IS 'Logs detalhados da execuÃ§Ã£o em JSON';



COMMENT ON COLUMN "rh"."calculation_logs"."erros_execucao" IS 'Erros encontrados durante a execuÃ§Ã£o';



COMMENT ON COLUMN "rh"."calculation_logs"."resumo_calculos" IS 'Resumo dos cÃ¡lculos realizados';



CREATE TABLE IF NOT EXISTS "rh"."candidate_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "document_type" character varying(50) NOT NULL,
    "file_name" character varying(255) NOT NULL,
    "file_path" character varying(500) NOT NULL,
    "file_size" integer,
    "mime_type" character varying(100),
    "uploaded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "candidate_documents_document_type_check" CHECK ((("document_type")::"text" = ANY ((ARRAY['curriculo'::character varying, 'carteira_identidade'::character varying, 'cpf'::character varying, 'comprovante_residencia'::character varying, 'certificado'::character varying, 'outro'::character varying])::"text"[])))
);


ALTER TABLE "rh"."candidate_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."candidates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL,
    "phone" character varying(20),
    "cpf" character varying(14),
    "birth_date" "date",
    "address" "text",
    "city" character varying(100),
    "state" character varying(2),
    "zip_code" character varying(10),
    "linkedin_url" character varying(500),
    "portfolio_url" character varying(500),
    "source" character varying(20) DEFAULT 'site'::character varying,
    "status" character varying(20) DEFAULT 'ativo'::character varying,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "candidates_source_check" CHECK ((("source")::"text" = ANY ((ARRAY['site'::character varying, 'linkedin'::character varying, 'indicacao'::character varying, 'agencia'::character varying, 'outro'::character varying])::"text"[]))),
    CONSTRAINT "candidates_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'inativo'::character varying, 'contratado'::character varying, 'descartado'::character varying])::"text"[])))
);


ALTER TABLE "rh"."candidates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."cid_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "codigo" character varying(10) NOT NULL,
    "descricao" character varying(500) NOT NULL,
    "categoria" character varying(100),
    "subcategoria" character varying(100),
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_cid_code_format" CHECK ((("codigo")::"text" ~ '^[A-Z][0-9]{2}(\.[0-9])?$'::"text"))
);


ALTER TABLE "rh"."cid_codes" OWNER TO "postgres";


COMMENT ON TABLE "rh"."cid_codes" IS 'Tabela de c??digos CID (Classifica????o Internacional de Doen??as)';



COMMENT ON COLUMN "rh"."cid_codes"."codigo" IS 'C??digo CID (ex: F32.1, G43.9, etc.)';



COMMENT ON COLUMN "rh"."cid_codes"."descricao" IS 'Descri????o da doen??a/condi????o m??dica';



COMMENT ON COLUMN "rh"."cid_codes"."categoria" IS 'Categoria da doen??a (ex: Mental, Neurol??gica, etc.)';



COMMENT ON COLUMN "rh"."cid_codes"."subcategoria" IS 'Subcategoria da doen??a';



CREATE TABLE IF NOT EXISTS "rh"."collective_agreements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "union_id" "uuid" NOT NULL,
    "tipo_documento" character varying(50) NOT NULL,
    "numero_documento" character varying(100),
    "titulo" character varying(255) NOT NULL,
    "descricao" "text",
    "data_assinatura" "date" NOT NULL,
    "data_vigencia_inicio" "date" NOT NULL,
    "data_vigencia_fim" "date",
    "status" character varying(20) DEFAULT 'vigente'::character varying NOT NULL,
    "valor_beneficios" numeric(10,2),
    "percentual_reajuste" numeric(5,2),
    "clausulas" "text",
    "arquivo_url" character varying(500),
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "collective_agreements_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['vigente'::character varying, 'vencido'::character varying, 'suspenso'::character varying, 'cancelado'::character varying])::"text"[]))),
    CONSTRAINT "collective_agreements_tipo_documento_check" CHECK ((("tipo_documento")::"text" = ANY ((ARRAY['convencao_coletiva'::character varying, 'acordo_coletivo'::character varying, 'acordo_individual'::character varying, 'dissidio'::character varying, 'norma_regulamentar'::character varying])::"text"[])))
);


ALTER TABLE "rh"."collective_agreements" OWNER TO "postgres";


COMMENT ON TABLE "rh"."collective_agreements" IS 'Convenções coletivas e acordos sindicais';



COMMENT ON COLUMN "rh"."collective_agreements"."tipo_documento" IS 'Tipo: convencao_coletiva, acordo_coletivo, acordo_individual, dissidio, norma_regulamentar';



CREATE TABLE IF NOT EXISTS "rh"."compensation_approvals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "compensation_request_id" "uuid" NOT NULL,
    "approval_level_id" "uuid" NOT NULL,
    "approver_id" "uuid" NOT NULL,
    "status" character varying(20) NOT NULL,
    "comments" "text",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "compensation_approvals_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::"text"[])))
);


ALTER TABLE "rh"."compensation_approvals" OWNER TO "postgres";


COMMENT ON TABLE "rh"."compensation_approvals" IS 'HistÃ³rico de aprovaÃ§Ãµes de compensaÃ§Ãµes';



CREATE TABLE IF NOT EXISTS "rh"."correction_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "correction_id" "uuid" NOT NULL,
    "action" character varying(50) NOT NULL,
    "old_values" "jsonb",
    "new_values" "jsonb",
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "reason" "text",
    CONSTRAINT "correction_history_action_check" CHECK ((("action")::"text" = ANY ((ARRAY['created'::character varying, 'updated'::character varying, 'approved'::character varying, 'rejected'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "rh"."correction_history" OWNER TO "postgres";


COMMENT ON TABLE "rh"."correction_history" IS 'HistÃ³rico de alteraÃ§Ãµes nas correÃ§Ãµes de ponto';



COMMENT ON COLUMN "rh"."correction_history"."changed_by" IS 'ID do usuário que fez a alteração (referencia public.users.id).';



CREATE TABLE IF NOT EXISTS "rh"."correction_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "dias_liberacao_correcao" integer DEFAULT 7,
    "permitir_correcao_futura" boolean DEFAULT false,
    "exigir_justificativa" boolean DEFAULT true,
    "permitir_correcao_apos_aprovacao" boolean DEFAULT false,
    "dias_limite_correcao" integer DEFAULT 30,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."correction_settings" OWNER TO "postgres";


COMMENT ON TABLE "rh"."correction_settings" IS 'ConfiguraÃ§Ãµes de correÃ§Ã£o de ponto por empresa';



CREATE TABLE IF NOT EXISTS "rh"."deficiency_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao" "text",
    "tipo" character varying(50) NOT NULL,
    "grau" character varying(50),
    "beneficios_lei_8213" boolean DEFAULT false,
    "beneficios_lei_13146" boolean DEFAULT false,
    "isento_contribuicao_sindical" boolean DEFAULT false,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "deficiency_types_grau_check" CHECK ((("grau")::"text" = ANY ((ARRAY['leve'::character varying, 'moderada'::character varying, 'severa'::character varying, 'profunda'::character varying])::"text"[]))),
    CONSTRAINT "deficiency_types_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['fisica'::character varying, 'visual'::character varying, 'auditiva'::character varying, 'intelectual'::character varying, 'mental'::character varying, 'multipla'::character varying, 'outra'::character varying])::"text"[])))
);


ALTER TABLE "rh"."deficiency_types" OWNER TO "postgres";


COMMENT ON TABLE "rh"."deficiency_types" IS 'Tabela de tipos de defici??ncia para PCDs';



COMMENT ON COLUMN "rh"."deficiency_types"."tipo" IS 'Tipo da defici??ncia: fisica, visual, auditiva, intelectual, mental, multipla, outra';



COMMENT ON COLUMN "rh"."deficiency_types"."grau" IS 'Grau da defici??ncia: leve, moderada, severa, profunda';



COMMENT ON COLUMN "rh"."deficiency_types"."beneficios_lei_8213" IS 'Se tem benef??cios da Lei 8.213/91';



COMMENT ON COLUMN "rh"."deficiency_types"."beneficios_lei_13146" IS 'Se tem benef??cios da Lei 13.146/2015 (LBI)';



COMMENT ON COLUMN "rh"."deficiency_types"."isento_contribuicao_sindical" IS 'Se est?? isento de contribui????o sindical';



CREATE TABLE IF NOT EXISTS "rh"."delay_reasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao" "text",
    "tipo" character varying(50) NOT NULL,
    "desconta_salario" boolean DEFAULT false,
    "desconta_horas" boolean DEFAULT false,
    "requer_justificativa" boolean DEFAULT false,
    "requer_anexo" boolean DEFAULT false,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "delay_reasons_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['atraso'::character varying, 'falta'::character varying, 'saida_antecipada'::character varying, 'justificado'::character varying, 'injustificado'::character varying])::"text"[])))
);


ALTER TABLE "rh"."delay_reasons" OWNER TO "postgres";


COMMENT ON TABLE "rh"."delay_reasons" IS 'Motivos de atraso para correÃ§Ãµes de ponto';



COMMENT ON COLUMN "rh"."delay_reasons"."tipo" IS 'Tipo do motivo: atraso, falta, saida_antecipada, justificado, injustificado';



COMMENT ON COLUMN "rh"."delay_reasons"."desconta_salario" IS 'Se o motivo desconta do sal??rio';



COMMENT ON COLUMN "rh"."delay_reasons"."desconta_horas" IS 'Se o motivo desconta horas trabalhadas';



COMMENT ON COLUMN "rh"."delay_reasons"."requer_justificativa" IS 'Se requer justificativa do funcion??rio';



COMMENT ON COLUMN "rh"."delay_reasons"."requer_anexo" IS 'Se requer anexo/documento comprobat??rio';



CREATE TABLE IF NOT EXISTS "rh"."dependents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "cpf" character varying(14),
    "rg" character varying(20),
    "data_nascimento" "date",
    "parentesco" character varying(50) NOT NULL,
    "sexo" character varying(10),
    "estado_civil" character varying(50),
    "nacionalidade" character varying(100),
    "naturalidade" character varying(100),
    "nome_mae" character varying(255),
    "nome_pai" character varying(255),
    "cpf_mae" character varying(14),
    "cpf_pai" character varying(14),
    "telefone" character varying(20),
    "email" character varying(255),
    "endereco" "text",
    "cidade" character varying(100),
    "estado" character varying(2),
    "cep" character varying(10),
    "data_casamento" "date",
    "data_uniao_estavel" "date",
    "data_separacao" "date",
    "data_obito" "date",
    "data_nascimento_mae" "date",
    "escolaridade" character varying(50),
    "instituicao_ensino" character varying(255),
    "possui_deficiencia" boolean DEFAULT false,
    "tipo_deficiencia" character varying(100),
    "grau_deficiencia" character varying(50),
    "necessita_cuidados_especiais" boolean DEFAULT false,
    "certidao_nascimento" character varying(100),
    "certidao_casamento" character varying(100),
    "certidao_uniao_estavel" character varying(100),
    "comprovante_residencia" character varying(100),
    "status" character varying(20) DEFAULT 'ativo'::character varying,
    "data_inclusao" "date" DEFAULT CURRENT_DATE,
    "data_exclusao" "date",
    "motivo_exclusao" "text",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "dependents_parentesco_check" CHECK ((("parentesco")::"text" = ANY ((ARRAY['conjuge'::character varying, 'companheiro'::character varying, 'filho'::character varying, 'filha'::character varying, 'pai'::character varying, 'mae'::character varying, 'sogro'::character varying, 'sogra'::character varying, 'neto'::character varying, 'neta'::character varying, 'irmao'::character varying, 'irma'::character varying, 'tio'::character varying, 'tia'::character varying, 'sobrinho'::character varying, 'sobrinha'::character varying, 'outros'::character varying])::"text"[]))),
    CONSTRAINT "dependents_sexo_check" CHECK ((("sexo")::"text" = ANY ((ARRAY['masculino'::character varying, 'feminino'::character varying, 'outro'::character varying])::"text"[]))),
    CONSTRAINT "dependents_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'inativo'::character varying, 'suspenso'::character varying, 'excluido'::character varying])::"text"[])))
);


ALTER TABLE "rh"."dependents" OWNER TO "postgres";


COMMENT ON TABLE "rh"."dependents" IS 'Tabela para cadastro de dependentes dos funcionÃ¡rios';



COMMENT ON COLUMN "rh"."dependents"."parentesco" IS 'Tipo de parentesco com o funcionÃ¡rio';



COMMENT ON COLUMN "rh"."dependents"."data_casamento" IS 'Data do casamento (para cÃ´njuge)';



COMMENT ON COLUMN "rh"."dependents"."data_uniao_estavel" IS 'Data da uniÃ£o estÃ¡vel (para companheiro)';



COMMENT ON COLUMN "rh"."dependents"."data_separacao" IS 'Data da separaÃ§Ã£o (para ex-cÃ´njuge)';



COMMENT ON COLUMN "rh"."dependents"."data_obito" IS 'Data do Ã³bito (para falecidos)';



COMMENT ON COLUMN "rh"."dependents"."escolaridade" IS 'NÃ­vel de escolaridade do dependente';



COMMENT ON COLUMN "rh"."dependents"."instituicao_ensino" IS 'InstituiÃ§Ã£o de ensino onde estuda';



COMMENT ON COLUMN "rh"."dependents"."possui_deficiencia" IS 'Indica se o dependente possui deficiÃªncia';



COMMENT ON COLUMN "rh"."dependents"."tipo_deficiencia" IS 'Tipo de deficiÃªncia (fÃ­sica, visual, auditiva, etc.)';



COMMENT ON COLUMN "rh"."dependents"."grau_deficiencia" IS 'Grau da deficiÃªncia (leve, moderada, severa, profunda)';



COMMENT ON COLUMN "rh"."dependents"."necessita_cuidados_especiais" IS 'Indica se necessita de cuidados especiais';



COMMENT ON COLUMN "rh"."dependents"."certidao_nascimento" IS 'NÃºmero da certidÃ£o de nascimento';



COMMENT ON COLUMN "rh"."dependents"."certidao_casamento" IS 'NÃºmero da certidÃ£o de casamento';



COMMENT ON COLUMN "rh"."dependents"."certidao_uniao_estavel" IS 'NÃºmero da certidÃ£o de uniÃ£o estÃ¡vel';



COMMENT ON COLUMN "rh"."dependents"."comprovante_residencia" IS 'NÃºmero do comprovante de residÃªncia';



COMMENT ON COLUMN "rh"."dependents"."data_inclusao" IS 'Data de inclusÃ£o como dependente';



COMMENT ON COLUMN "rh"."dependents"."data_exclusao" IS 'Data de exclusÃ£o como dependente';



COMMENT ON COLUMN "rh"."dependents"."motivo_exclusao" IS 'Motivo da exclusÃ£o como dependente';



CREATE OR REPLACE VIEW "rh"."dependents_with_employee" AS
 SELECT "d"."id",
    "d"."company_id",
    "d"."employee_id",
    "d"."nome",
    "d"."cpf",
    "d"."rg",
    "d"."data_nascimento",
    "d"."parentesco",
    "d"."sexo",
    "d"."estado_civil",
    "d"."nacionalidade",
    "d"."naturalidade",
    "d"."nome_mae",
    "d"."nome_pai",
    "d"."cpf_mae",
    "d"."cpf_pai",
    "d"."telefone",
    "d"."email",
    "d"."endereco",
    "d"."cidade",
    "d"."estado",
    "d"."cep",
    "d"."data_casamento",
    "d"."data_uniao_estavel",
    "d"."data_separacao",
    "d"."data_obito",
    "d"."data_nascimento_mae",
    "d"."escolaridade",
    "d"."instituicao_ensino",
    "d"."possui_deficiencia",
    "d"."tipo_deficiencia",
    "d"."grau_deficiencia",
    "d"."necessita_cuidados_especiais",
    "d"."certidao_nascimento",
    "d"."certidao_casamento",
    "d"."certidao_uniao_estavel",
    "d"."comprovante_residencia",
    "d"."status",
    "d"."data_inclusao",
    "d"."data_exclusao",
    "d"."motivo_exclusao",
    "d"."observacoes",
    "d"."created_at",
    "d"."updated_at",
    "d"."created_by",
    "d"."updated_by",
    "e"."nome" AS "funcionario_nome",
    "e"."matricula" AS "funcionario_matricula",
    "e"."cpf" AS "funcionario_cpf"
   FROM ("rh"."dependents" "d"
     JOIN "rh"."employees" "e" ON (("d"."employee_id" = "e"."id")))
  WHERE (("d"."status")::"text" = 'ativo'::"text");


ALTER VIEW "rh"."dependents_with_employee" OWNER TO "postgres";


COMMENT ON VIEW "rh"."dependents_with_employee" IS 'View para consultar dependentes ativos com informaÃ§Ãµes do funcionÃ¡rio';



CREATE TABLE IF NOT EXISTS "rh"."employee_benefit_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "benefit_config_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "custom_value" numeric(10,2),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."employee_benefit_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."employee_correction_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "mes_ano" character varying(7) NOT NULL,
    "liberado" boolean DEFAULT false,
    "liberado_por" "uuid",
    "liberado_em" timestamp with time zone,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."employee_correction_permissions" OWNER TO "postgres";


COMMENT ON TABLE "rh"."employee_correction_permissions" IS 'Controle de liberaÃ§Ã£o de correÃ§Ã£o por funcionÃ¡rio e mÃªs';



CREATE TABLE IF NOT EXISTS "rh"."employee_deductions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "tipo_deducao" character varying(50) NOT NULL,
    "categoria" character varying(100),
    "descricao" "text" NOT NULL,
    "valor_total" numeric(10,2) NOT NULL,
    "valor_parcela" numeric(10,2),
    "numero_parcelas" integer DEFAULT 1,
    "parcela_atual" integer DEFAULT 1,
    "data_origem" "date" NOT NULL,
    "mes_referencia_inicio" integer NOT NULL,
    "ano_referencia_inicio" integer NOT NULL,
    "mes_referencia_fim" integer,
    "ano_referencia_fim" integer,
    "status" character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    "valor_total_pago" numeric(10,2) DEFAULT 0,
    "medical_service_usage_id" "uuid",
    "related_entity_type" character varying(50),
    "related_entity_id" "uuid",
    "aplicar_na_folha" boolean DEFAULT true,
    "mes_referencia_folha" integer,
    "ano_referencia_folha" integer,
    "payroll_event_id" "uuid",
    "documento_referencia" character varying(255),
    "anexo_url" "text",
    "observacoes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "employee_deductions_ano_referencia_fim_check" CHECK ((("ano_referencia_fim" >= 2000) AND ("ano_referencia_fim" <= 2100))),
    CONSTRAINT "employee_deductions_ano_referencia_folha_check" CHECK ((("ano_referencia_folha" >= 2000) AND ("ano_referencia_folha" <= 2100))),
    CONSTRAINT "employee_deductions_ano_referencia_inicio_check" CHECK ((("ano_referencia_inicio" >= 2000) AND ("ano_referencia_inicio" <= 2100))),
    CONSTRAINT "employee_deductions_mes_referencia_fim_check" CHECK ((("mes_referencia_fim" >= 1) AND ("mes_referencia_fim" <= 12))),
    CONSTRAINT "employee_deductions_mes_referencia_folha_check" CHECK ((("mes_referencia_folha" >= 1) AND ("mes_referencia_folha" <= 12))),
    CONSTRAINT "employee_deductions_mes_referencia_inicio_check" CHECK ((("mes_referencia_inicio" >= 1) AND ("mes_referencia_inicio" <= 12))),
    CONSTRAINT "employee_deductions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'em_aberto'::character varying, 'pago'::character varying, 'cancelado'::character varying, 'parcelado'::character varying])::"text"[]))),
    CONSTRAINT "employee_deductions_tipo_deducao_check" CHECK ((("tipo_deducao")::"text" = ANY ((ARRAY['coparticipacao_medica'::character varying, 'emprestimo'::character varying, 'multa'::character varying, 'avaria_veiculo'::character varying, 'danos_materiais'::character varying, 'adiantamento'::character varying, 'desconto_combinado'::character varying, 'outros'::character varying])::"text"[])))
);


ALTER TABLE "rh"."employee_deductions" OWNER TO "postgres";


COMMENT ON TABLE "rh"."employee_deductions" IS 'Deduções diversas de funcionários (coparticipação, empréstimos, multas, avarias, etc.)';



COMMENT ON COLUMN "rh"."employee_deductions"."tipo_deducao" IS 'Tipo: coparticipacao_medica, emprestimo, multa, avaria_veiculo, danos_materiais, adiantamento, desconto_combinado, outros';



COMMENT ON COLUMN "rh"."employee_deductions"."status" IS 'Status: pendente, em_aberto, pago, cancelado, parcelado';



CREATE TABLE IF NOT EXISTS "rh"."employee_location_zones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "location_zone_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."employee_location_zones" OWNER TO "postgres";


COMMENT ON TABLE "rh"."employee_location_zones" IS 'Relacionamento many-to-many entre funcionários e zonas de localização para registro de ponto';



COMMENT ON COLUMN "rh"."employee_location_zones"."employee_id" IS 'ID do funcionário';



COMMENT ON COLUMN "rh"."employee_location_zones"."location_zone_id" IS 'ID da zona de localização permitida';



CREATE TABLE IF NOT EXISTS "rh"."employee_medical_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date",
    "status" character varying(20) DEFAULT 'ativo'::character varying NOT NULL,
    "valor_mensal" numeric(10,2) NOT NULL,
    "desconto_aplicado" numeric(5,2) DEFAULT 0,
    "motivo_suspensao" "text",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "entra_no_calculo_folha" boolean DEFAULT true NOT NULL,
    CONSTRAINT "employee_medical_plans_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'suspenso'::character varying, 'cancelado'::character varying, 'transferido'::character varying])::"text"[])))
);


ALTER TABLE "rh"."employee_medical_plans" OWNER TO "postgres";


COMMENT ON TABLE "rh"."employee_medical_plans" IS 'Adesões dos funcionários aos planos médicos/odontológicos';



COMMENT ON COLUMN "rh"."employee_medical_plans"."status" IS 'Status: ativo, suspenso, cancelado, transferido';



COMMENT ON COLUMN "rh"."employee_medical_plans"."entra_no_calculo_folha" IS 'Se a adesÃ£o do funcionÃ¡rio ao plano deve ser incluÃ­da no cÃ¡lculo da folha';



CREATE TABLE IF NOT EXISTS "rh"."employee_plan_dependents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_plan_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "cpf" character varying(11),
    "data_nascimento" "date",
    "parentesco" character varying(50) NOT NULL,
    "status" character varying(20) DEFAULT 'ativo'::character varying NOT NULL,
    "valor_mensal" numeric(10,2) NOT NULL,
    "data_inclusao" "date" NOT NULL,
    "data_exclusao" "date",
    "motivo_exclusao" "text",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "employee_plan_dependents_parentesco_check" CHECK ((("parentesco")::"text" = ANY ((ARRAY['conjuge'::character varying, 'filho'::character varying, 'filha'::character varying, 'pai'::character varying, 'mae'::character varying, 'outros'::character varying])::"text"[]))),
    CONSTRAINT "employee_plan_dependents_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'suspenso'::character varying, 'cancelado'::character varying])::"text"[])))
);


ALTER TABLE "rh"."employee_plan_dependents" OWNER TO "postgres";


COMMENT ON TABLE "rh"."employee_plan_dependents" IS 'Dependentes dos funcionários nos planos médicos/odontológicos';



COMMENT ON COLUMN "rh"."employee_plan_dependents"."parentesco" IS 'Parentesco: conjuge, filho, filha, pai, mae, outros';



COMMENT ON COLUMN "rh"."employee_plan_dependents"."status" IS 'Status: ativo, suspenso, cancelado';



CREATE TABLE IF NOT EXISTS "rh"."employee_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "schedule_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."employee_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."employee_shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "funcionario_id" "uuid" NOT NULL,
    "turno_id" "uuid" NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date",
    "ativo" boolean DEFAULT true,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_employee_shifts_data_fim" CHECK ((("data_fim" IS NULL) OR ("data_fim" >= "data_inicio")))
);


ALTER TABLE "rh"."employee_shifts" OWNER TO "postgres";


COMMENT ON TABLE "rh"."employee_shifts" IS 'Tabela de turnos atribuÃ­dos aos funcionÃ¡rios';



COMMENT ON COLUMN "rh"."employee_shifts"."data_inicio" IS 'Data de inÃ­cio do turno para o funcionÃ¡rio';



COMMENT ON COLUMN "rh"."employee_shifts"."data_fim" IS 'Data de fim do turno (NULL se ainda ativo)';



COMMENT ON COLUMN "rh"."employee_shifts"."ativo" IS 'Se o turno estÃ¡ ativo para o funcionÃ¡rio';



CREATE TABLE IF NOT EXISTS "rh"."employee_union_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "union_id" "uuid" NOT NULL,
    "data_filiacao" "date" NOT NULL,
    "data_desfiliacao" "date",
    "status" character varying(20) DEFAULT 'ativo'::character varying NOT NULL,
    "numero_carteira" character varying(50),
    "categoria_filiacao" character varying(100),
    "valor_mensalidade" numeric(10,2),
    "desconto_folha" boolean DEFAULT false,
    "motivo_desfiliacao" "text",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "employee_union_memberships_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'suspenso'::character varying, 'desfiliado'::character varying, 'transferido'::character varying])::"text"[])))
);


ALTER TABLE "rh"."employee_union_memberships" OWNER TO "postgres";


COMMENT ON TABLE "rh"."employee_union_memberships" IS 'Filiações dos funcionários aos sindicatos';



COMMENT ON COLUMN "rh"."employee_union_memberships"."status" IS 'Status: ativo, suspenso, desfiliado, transferido';



CREATE TABLE IF NOT EXISTS "rh"."employment_contracts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "numero_contrato" character varying(100) NOT NULL,
    "tipo_contrato" character varying(50) NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date",
    "periodo_experiencia" integer DEFAULT 90,
    "salario_base" numeric(10,2) NOT NULL,
    "carga_horaria_semanal" integer DEFAULT 40,
    "regime_trabalho" character varying(50) DEFAULT 'tempo_integral'::character varying,
    "tipo_jornada" character varying(50) DEFAULT 'normal'::character varying,
    "beneficios" "jsonb" DEFAULT '{}'::"jsonb",
    "clausulas_especiais" "text",
    "status" character varying(20) DEFAULT 'ativo'::character varying,
    "data_rescisao" "date",
    "motivo_rescisao" character varying(255),
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_employment_contracts_carga_horaria" CHECK ((("carga_horaria_semanal" > 0) AND ("carga_horaria_semanal" <= 168))),
    CONSTRAINT "check_employment_contracts_data_fim" CHECK ((("data_fim" IS NULL) OR ("data_fim" >= "data_inicio"))),
    CONSTRAINT "check_employment_contracts_salario" CHECK (("salario_base" > (0)::numeric)),
    CONSTRAINT "employment_contracts_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'suspenso'::character varying, 'encerrado'::character varying, 'rescisao'::character varying])::"text"[])))
);


ALTER TABLE "rh"."employment_contracts" OWNER TO "postgres";


COMMENT ON TABLE "rh"."employment_contracts" IS 'Tabela de contratos de trabalho';



COMMENT ON COLUMN "rh"."employment_contracts"."tipo_contrato" IS 'Tipo do contrato: CLT, PJ, Estagi??rio, Terceirizado, etc.';



COMMENT ON COLUMN "rh"."employment_contracts"."regime_trabalho" IS 'Regime de trabalho: tempo_integral, meio_periodo, etc.';



COMMENT ON COLUMN "rh"."employment_contracts"."beneficios" IS 'JSON com benef??cios do contrato';



CREATE TABLE IF NOT EXISTS "rh"."equipment_rental_approvals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "tipo_equipamento" character varying(100) NOT NULL,
    "valor_mensal" numeric(10,2) NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date",
    "justificativa" "text" NOT NULL,
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "aprovado_por" "uuid",
    "aprovado_em" timestamp with time zone,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "equipment_rental_approvals_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'rejeitado'::character varying, 'ativo'::character varying, 'finalizado'::character varying])::"text"[])))
);


ALTER TABLE "rh"."equipment_rental_approvals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."equipment_rental_monthly_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipment_rental_approval_id" "uuid",
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "month_reference" integer NOT NULL,
    "year_reference" integer NOT NULL,
    "valor_base" numeric(10,2) NOT NULL,
    "dias_trabalhados" integer DEFAULT 0,
    "dias_ausencia" integer DEFAULT 0,
    "desconto_ausencia" numeric(10,2) DEFAULT 0,
    "valor_calculado" numeric(10,2) NOT NULL,
    "valor_aprovado" numeric(10,2),
    "status" character varying(20) DEFAULT 'pendente_aprovacao'::character varying,
    "aprovado_por" "uuid",
    "aprovado_em" timestamp with time zone,
    "observacoes_aprovacao" "text",
    "flash_payment_id" character varying(255),
    "flash_invoice_id" character varying(255),
    "flash_account_number" character varying(255),
    "accounts_payable_id" "uuid",
    "processado_por" "uuid",
    "processado_em" timestamp with time zone,
    "enviado_flash_em" timestamp with time zone,
    "enviado_contas_pagar_em" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "cost_center_id" "uuid",
    "classe_financeira_id" "uuid",
    CONSTRAINT "equipment_rental_monthly_payments_month_reference_check" CHECK ((("month_reference" >= 1) AND ("month_reference" <= 12))),
    CONSTRAINT "equipment_rental_monthly_payments_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente_aprovacao'::character varying, 'aprovado'::character varying, 'rejeitado'::character varying, 'enviado_flash'::character varying, 'boleto_gerado'::character varying, 'enviado_contas_pagar'::character varying, 'pago'::character varying, 'cancelado'::character varying])::"text"[])))
);


ALTER TABLE "rh"."equipment_rental_monthly_payments" OWNER TO "postgres";


COMMENT ON TABLE "rh"."equipment_rental_monthly_payments" IS 'Pagamentos mensais de aluguel de equipamentos e veÃ­culos';



COMMENT ON COLUMN "rh"."equipment_rental_monthly_payments"."cost_center_id" IS 'Centro de custo do funcion??rio para agrupamento de pagamentos';



COMMENT ON COLUMN "rh"."equipment_rental_monthly_payments"."classe_financeira_id" IS 'Classe financeira do benef??cio de aluguel de equipamentos';



CREATE TABLE IF NOT EXISTS "rh"."esocial_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "batch_number" character varying(50) NOT NULL,
    "period" character varying(7) NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "total_events" integer DEFAULT 0 NOT NULL,
    "sent_events" integer DEFAULT 0 NOT NULL,
    "accepted_events" integer DEFAULT 0 NOT NULL,
    "rejected_events" integer DEFAULT 0 NOT NULL,
    "error_events" integer DEFAULT 0 NOT NULL,
    "xml_content" "text",
    "xml_response" "text",
    "protocol_number" character varying(100),
    "sent_at" timestamp with time zone,
    "processed_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    CONSTRAINT "esocial_batches_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'sending'::character varying, 'sent'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'error'::character varying])::"text"[])))
);


ALTER TABLE "rh"."esocial_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."esocial_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "ambiente" character varying(10) DEFAULT 'homologacao'::character varying NOT NULL,
    "tp_amb" character varying(1) DEFAULT '2'::character varying NOT NULL,
    "cnpj_empregador" character varying(14) NOT NULL,
    "cpf_empregador" character varying(11),
    "razao_social" character varying(255) NOT NULL,
    "codigo_empregador" character varying(20),
    "codigo_esocial" character varying(20),
    "versao_lote" character varying(10) DEFAULT '2.5.00'::character varying,
    "versao_evento" character varying(10) DEFAULT '2.5.00'::character varying,
    "url_consulta" character varying(255),
    "url_envio" character varying(255),
    "certificado_digital" "text",
    "senha_certificado" character varying(255),
    "proxy_host" character varying(255),
    "proxy_port" integer,
    "proxy_user" character varying(255),
    "proxy_pass" character varying(255),
    "timeout" integer DEFAULT 300,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "esocial_config_ambiente_check" CHECK ((("ambiente")::"text" = ANY ((ARRAY['homologacao'::character varying, 'producao'::character varying])::"text"[])))
);


ALTER TABLE "rh"."esocial_config" OWNER TO "postgres";


COMMENT ON TABLE "rh"."esocial_config" IS 'ConfiguraÃ§Ãµes de integraÃ§Ã£o com eSocial';



COMMENT ON COLUMN "rh"."esocial_config"."ambiente" IS 'Ambiente: homologacao ou producao';



COMMENT ON COLUMN "rh"."esocial_config"."tp_amb" IS 'Tipo ambiente: 1=ProduÃ§Ã£o, 2=HomologaÃ§Ã£o';



COMMENT ON COLUMN "rh"."esocial_config"."versao_lote" IS 'VersÃ£o do lote eSocial';



COMMENT ON COLUMN "rh"."esocial_config"."versao_evento" IS 'VersÃ£o do evento eSocial';



COMMENT ON COLUMN "rh"."esocial_config"."certificado_digital" IS 'Certificado digital em Base64';



CREATE TABLE IF NOT EXISTS "rh"."esocial_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid",
    "tipo_evento" character varying(50) NOT NULL,
    "numero_recibo" character varying(50),
    "data_envio" timestamp with time zone,
    "data_recebimento" timestamp with time zone,
    "status" character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    "xml_content" "text",
    "xml_response" "text",
    "observacoes" "text",
    "tentativas_envio" integer DEFAULT 0,
    "ultimo_erro" "text",
    "data_proximo_envio" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "batch_id" "uuid",
    CONSTRAINT "esocial_events_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'enviado'::character varying, 'processado'::character varying, 'rejeitado'::character varying, 'erro'::character varying])::"text"[]))),
    CONSTRAINT "esocial_events_tipo_evento_check" CHECK ((("tipo_evento")::"text" = ANY ((ARRAY['S1000'::character varying, 'S1005'::character varying, 'S1010'::character varying, 'S1020'::character varying, 'S1030'::character varying, 'S1035'::character varying, 'S1040'::character varying, 'S1050'::character varying, 'S1060'::character varying, 'S1070'::character varying, 'S1080'::character varying, 'S1200'::character varying, 'S1202'::character varying, 'S1207'::character varying, 'S1210'::character varying, 'S1220'::character varying, 'S1250'::character varying, 'S1260'::character varying, 'S1270'::character varying, 'S1280'::character varying, 'S1295'::character varying, 'S1298'::character varying, 'S1299'::character varying, 'S1300'::character varying, 'S2190'::character varying, 'S2200'::character varying, 'S2205'::character varying, 'S2206'::character varying, 'S2210'::character varying, 'S2220'::character varying, 'S2221'::character varying, 'S2230'::character varying, 'S2231'::character varying, 'S2240'::character varying, 'S2241'::character varying, 'S2245'::character varying, 'S2250'::character varying, 'S2260'::character varying, 'S2298'::character varying, 'S2299'::character varying, 'S2300'::character varying, 'S2306'::character varying, 'S2399'::character varying, 'S2400'::character varying, 'S2405'::character varying, 'S2410'::character varying, 'S2416'::character varying, 'S2418'::character varying, 'S2420'::character varying, 'S3000'::character varying, 'S5001'::character varying, 'S5002'::character varying, 'S5003'::character varying, 'S5011'::character varying, 'S5012'::character varying, 'S5013'::character varying])::"text"[])))
);


ALTER TABLE "rh"."esocial_events" OWNER TO "postgres";


COMMENT ON TABLE "rh"."esocial_events" IS 'Eventos eSocial a serem enviados para o governo';



COMMENT ON COLUMN "rh"."esocial_events"."tipo_evento" IS 'Tipo do evento eSocial (S1000, S2200, S1200, etc.)';



COMMENT ON COLUMN "rh"."esocial_events"."numero_recibo" IS 'NÃºmero do recibo de entrega do eSocial';



COMMENT ON COLUMN "rh"."esocial_events"."status" IS 'Status: pendente, enviado, processado, rejeitado, erro';



COMMENT ON COLUMN "rh"."esocial_events"."xml_content" IS 'ConteÃºdo XML do evento';



COMMENT ON COLUMN "rh"."esocial_events"."xml_response" IS 'Resposta XML do governo';



CREATE TABLE IF NOT EXISTS "rh"."esocial_integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "tipo_evento" character varying(50) NOT NULL,
    "codigo_evento" character varying(20) NOT NULL,
    "descricao" "text",
    "status" character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    "data_envio" timestamp with time zone,
    "data_processamento" timestamp with time zone,
    "protocolo" character varying(100),
    "funcionario_id" "uuid",
    "observacoes" "text",
    "arquivo_retorno" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "esocial_integrations_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'enviado'::character varying, 'processado'::character varying, 'erro'::character varying, 'rejeitado'::character varying])::"text"[])))
);


ALTER TABLE "rh"."esocial_integrations" OWNER TO "postgres";


COMMENT ON TABLE "rh"."esocial_integrations" IS 'Tabela de integraÃ§Ã£o com eSocial';



COMMENT ON COLUMN "rh"."esocial_integrations"."tipo_evento" IS 'Tipo do evento eSocial (ex: S-1000, S-1010)';



COMMENT ON COLUMN "rh"."esocial_integrations"."codigo_evento" IS 'CÃ³digo especÃ­fico do evento';



COMMENT ON COLUMN "rh"."esocial_integrations"."status" IS 'Status da integraÃ§Ã£o: pendente, enviado, processado, erro, rejeitado';



COMMENT ON COLUMN "rh"."esocial_integrations"."protocolo" IS 'Protocolo de envio para eSocial';



COMMENT ON COLUMN "rh"."esocial_integrations"."arquivo_retorno" IS 'URL do arquivo de retorno do eSocial';



CREATE TABLE IF NOT EXISTS "rh"."esocial_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "event_id" "uuid",
    "tipo_operacao" character varying(20) NOT NULL,
    "status" character varying(20) NOT NULL,
    "mensagem" "text",
    "detalhes" "jsonb",
    "tempo_execucao" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "esocial_logs_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['sucesso'::character varying, 'erro'::character varying, 'aviso'::character varying])::"text"[]))),
    CONSTRAINT "esocial_logs_tipo_operacao_check" CHECK ((("tipo_operacao")::"text" = ANY ((ARRAY['envio'::character varying, 'consulta'::character varying, 'download'::character varying, 'erro'::character varying])::"text"[])))
);


ALTER TABLE "rh"."esocial_logs" OWNER TO "postgres";


COMMENT ON TABLE "rh"."esocial_logs" IS 'Logs de operaÃ§Ãµes eSocial';



CREATE TABLE IF NOT EXISTS "rh"."fgts_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "descricao" character varying(255) NOT NULL,
    "ano_vigencia" integer NOT NULL,
    "mes_vigencia" integer NOT NULL,
    "aliquota_fgts" numeric(5,4) NOT NULL,
    "aliquota_multa" numeric(5,4) DEFAULT 0,
    "aliquota_juros" numeric(5,4) DEFAULT 0,
    "teto_salario" numeric(12,2),
    "valor_minimo_contribuicao" numeric(10,2) DEFAULT 0,
    "multa_rescisao" numeric(5,4) DEFAULT 0,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tipo_contrato" character varying(50),
    CONSTRAINT "check_fgts_config_aliquota_fgts" CHECK ((("aliquota_fgts" >= (0)::numeric) AND ("aliquota_fgts" <= (1)::numeric))),
    CONSTRAINT "check_fgts_config_aliquota_juros" CHECK ((("aliquota_juros" >= (0)::numeric) AND ("aliquota_juros" <= (1)::numeric))),
    CONSTRAINT "check_fgts_config_aliquota_multa" CHECK ((("aliquota_multa" >= (0)::numeric) AND ("aliquota_multa" <= (1)::numeric))),
    CONSTRAINT "check_fgts_config_ano" CHECK ((("ano_vigencia" >= 2020) AND ("ano_vigencia" <= 2030))),
    CONSTRAINT "check_fgts_config_mes" CHECK ((("mes_vigencia" >= 1) AND ("mes_vigencia" <= 12))),
    CONSTRAINT "check_fgts_config_multa_rescisao" CHECK ((("multa_rescisao" >= (0)::numeric) AND ("multa_rescisao" <= (1)::numeric)))
);


ALTER TABLE "rh"."fgts_config" OWNER TO "postgres";


COMMENT ON TABLE "rh"."fgts_config" IS 'Tabela de configura????es do FGTS para c??lculo de fundo de garantia';



COMMENT ON COLUMN "rh"."fgts_config"."ano_vigencia" IS 'Ano de vig??ncia da configura????o FGTS';



COMMENT ON COLUMN "rh"."fgts_config"."mes_vigencia" IS 'M??s de vig??ncia da configura????o FGTS';



COMMENT ON COLUMN "rh"."fgts_config"."aliquota_fgts" IS 'Al??quota do FGTS (0.08 = 8%)';



COMMENT ON COLUMN "rh"."fgts_config"."aliquota_multa" IS 'Al??quota de multa sobre FGTS';



COMMENT ON COLUMN "rh"."fgts_config"."aliquota_juros" IS 'Al??quota de juros sobre FGTS';



COMMENT ON COLUMN "rh"."fgts_config"."teto_salario" IS 'Teto salarial para incid??ncia do FGTS';



COMMENT ON COLUMN "rh"."fgts_config"."multa_rescisao" IS 'Multa de rescis??o (0.4 = 40%)';



COMMENT ON COLUMN "rh"."fgts_config"."tipo_contrato" IS 'Tipo de contrato especÃ­fico (CLT, Menor Aprendiz, etc.). NULL = configuraÃ§Ã£o geral aplicÃ¡vel a todos os tipos';



CREATE TABLE IF NOT EXISTS "rh"."financial_integration_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."financial_integration_config" OWNER TO "postgres";


COMMENT ON TABLE "rh"."financial_integration_config" IS 'Configura????es de integra????o com o m??dulo financeiro';



COMMENT ON COLUMN "rh"."financial_integration_config"."config" IS 'Configura????es JSON da integra????o';



CREATE TABLE IF NOT EXISTS "rh"."flash_integration_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome_configuracao" character varying(100) DEFAULT 'ConfiguraÃ§Ã£o Flash'::character varying NOT NULL,
    "ambiente" character varying(20) DEFAULT 'producao'::character varying NOT NULL,
    "api_key" "text" NOT NULL,
    "flash_company_id" character varying(100),
    "base_url" character varying(500) DEFAULT 'https://api.flashapp.services'::character varying NOT NULL,
    "api_version" character varying(20) DEFAULT 'v2'::character varying,
    "empresa_nome" character varying(255),
    "empresa_cnpj" character varying(18),
    "empresa_email" character varying(255),
    "empresa_telefone" character varying(20),
    "configuracao_adicional" "jsonb" DEFAULT '{}'::"jsonb",
    "credenciais_validas" boolean DEFAULT false,
    "conectividade_ok" boolean DEFAULT false,
    "ultima_validacao" timestamp with time zone,
    "erro_validacao" "text",
    "ultima_sincronizacao" timestamp with time zone,
    "observacoes" "text",
    "created_by" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "flash_integration_config_ambiente_check" CHECK ((("ambiente")::"text" = ANY ((ARRAY['producao'::character varying, 'sandbox'::character varying, 'homologacao'::character varying])::"text"[])))
);


ALTER TABLE "rh"."flash_integration_config" OWNER TO "postgres";


COMMENT ON TABLE "rh"."flash_integration_config" IS 'ConfiguraÃ§Ãµes de integraÃ§Ã£o com Flash API por empresa';



COMMENT ON COLUMN "rh"."flash_integration_config"."api_key" IS 'Chave de API Flash (deve ser criptografada)';



COMMENT ON COLUMN "rh"."flash_integration_config"."configuracao_adicional" IS 'ConfiguraÃ§Ãµes adicionais em formato JSON';



COMMENT ON COLUMN "rh"."flash_integration_config"."credenciais_validas" IS 'Indica se as credenciais estÃ£o vÃ¡lidas';



COMMENT ON COLUMN "rh"."flash_integration_config"."conectividade_ok" IS 'Indica se a conectividade com a Flash estÃ¡ OK';



CREATE TABLE IF NOT EXISTS "rh"."gestor_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "gestor_id" "uuid" NOT NULL,
    "tipo_notificacao" character varying(50) NOT NULL,
    "titulo" character varying(255) NOT NULL,
    "mensagem" "text" NOT NULL,
    "dados_extras" "jsonb",
    "lida" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "gestor_notifications_tipo_notificacao_check" CHECK ((("tipo_notificacao")::"text" = ANY ((ARRAY['aprovacao_pendente'::character varying, 'aprovacao_realizada'::character varying, 'solicitacao_nova'::character varying, 'alerta_vencimento'::character varying])::"text"[])))
);


ALTER TABLE "rh"."gestor_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."income_statements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "ano_referencia" integer NOT NULL,
    "mes_referencia" integer NOT NULL,
    "total_rendimentos" numeric(12,2) DEFAULT 0 NOT NULL,
    "total_descontos" numeric(12,2) DEFAULT 0 NOT NULL,
    "salario_liquido" numeric(12,2) DEFAULT 0 NOT NULL,
    "inss_descontado" numeric(12,2) DEFAULT 0 NOT NULL,
    "irrf_descontado" numeric(12,2) DEFAULT 0 NOT NULL,
    "fgts_descontado" numeric(12,2) DEFAULT 0 NOT NULL,
    "outros_descontos" numeric(12,2) DEFAULT 0 NOT NULL,
    "status" character varying(20) DEFAULT 'processando'::character varying NOT NULL,
    "arquivo_pdf" "text",
    "observacoes" "text",
    "data_geracao" timestamp with time zone DEFAULT "now"(),
    "data_vencimento" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "income_statements_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['processando'::character varying, 'processado'::character varying, 'erro'::character varying])::"text"[])))
);


ALTER TABLE "rh"."income_statements" OWNER TO "postgres";


COMMENT ON TABLE "rh"."income_statements" IS 'Informes de rendimentos para declaraÃ§Ã£o de Imposto de Renda';



COMMENT ON COLUMN "rh"."income_statements"."ano_referencia" IS 'Ano de referÃªncia do informe';



COMMENT ON COLUMN "rh"."income_statements"."mes_referencia" IS 'MÃªs de referÃªncia do informe';



COMMENT ON COLUMN "rh"."income_statements"."total_rendimentos" IS 'Total de rendimentos brutos';



COMMENT ON COLUMN "rh"."income_statements"."total_descontos" IS 'Total de descontos';



COMMENT ON COLUMN "rh"."income_statements"."salario_liquido" IS 'SalÃ¡rio lÃ­quido';



COMMENT ON COLUMN "rh"."income_statements"."inss_descontado" IS 'Valor descontado de INSS';



COMMENT ON COLUMN "rh"."income_statements"."irrf_descontado" IS 'Valor descontado de IRRF';



COMMENT ON COLUMN "rh"."income_statements"."fgts_descontado" IS 'Valor descontado de FGTS';



COMMENT ON COLUMN "rh"."income_statements"."outros_descontos" IS 'Outros descontos';



COMMENT ON COLUMN "rh"."income_statements"."status" IS 'Status do processamento do informe';



COMMENT ON COLUMN "rh"."income_statements"."arquivo_pdf" IS 'Caminho do arquivo PDF gerado';



COMMENT ON COLUMN "rh"."income_statements"."data_geracao" IS 'Data de geraÃ§Ã£o do informe';



COMMENT ON COLUMN "rh"."income_statements"."data_vencimento" IS 'Data de vencimento para download';



CREATE TABLE IF NOT EXISTS "rh"."inss_brackets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "descricao" character varying(255) NOT NULL,
    "ano_vigencia" integer NOT NULL,
    "mes_vigencia" integer NOT NULL,
    "valor_minimo" numeric(12,2) NOT NULL,
    "valor_maximo" numeric(12,2),
    "aliquota" numeric(5,4) NOT NULL,
    "valor_deducao" numeric(12,2) DEFAULT 0,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_inss_bracket_aliquota" CHECK ((("aliquota" >= (0)::numeric) AND ("aliquota" <= (1)::numeric))),
    CONSTRAINT "check_inss_bracket_ano" CHECK ((("ano_vigencia" >= 2020) AND ("ano_vigencia" <= 2030))),
    CONSTRAINT "check_inss_bracket_mes" CHECK ((("mes_vigencia" >= 1) AND ("mes_vigencia" <= 12))),
    CONSTRAINT "check_inss_bracket_valores" CHECK ((("valor_maximo" IS NULL) OR ("valor_minimo" <= "valor_maximo")))
);


ALTER TABLE "rh"."inss_brackets" OWNER TO "postgres";


COMMENT ON TABLE "rh"."inss_brackets" IS 'Tabela de faixas do INSS para c??lculo de contribui????o previdenci??ria';



COMMENT ON COLUMN "rh"."inss_brackets"."ano_vigencia" IS 'Ano de vig??ncia da faixa INSS';



COMMENT ON COLUMN "rh"."inss_brackets"."mes_vigencia" IS 'M??s de vig??ncia da faixa INSS';



COMMENT ON COLUMN "rh"."inss_brackets"."valor_minimo" IS 'Valor m??nimo da faixa salarial';



COMMENT ON COLUMN "rh"."inss_brackets"."valor_maximo" IS 'Valor m??ximo da faixa salarial (NULL = sem limite)';



COMMENT ON COLUMN "rh"."inss_brackets"."aliquota" IS 'Al??quota do INSS (0.075 = 7,5%)';



COMMENT ON COLUMN "rh"."inss_brackets"."valor_deducao" IS 'Valor a ser deduzido do c??lculo';



CREATE TABLE IF NOT EXISTS "rh"."irrf_brackets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "descricao" character varying(255) NOT NULL,
    "ano_vigencia" integer NOT NULL,
    "mes_vigencia" integer NOT NULL,
    "valor_minimo" numeric(12,2) NOT NULL,
    "valor_maximo" numeric(12,2),
    "aliquota" numeric(5,4) NOT NULL,
    "valor_deducao" numeric(12,2) DEFAULT 0,
    "numero_dependentes" integer DEFAULT 0,
    "valor_por_dependente" numeric(10,2) DEFAULT 0,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_irrf_bracket_aliquota" CHECK ((("aliquota" >= (0)::numeric) AND ("aliquota" <= (1)::numeric))),
    CONSTRAINT "check_irrf_bracket_ano" CHECK ((("ano_vigencia" >= 2020) AND ("ano_vigencia" <= 2030))),
    CONSTRAINT "check_irrf_bracket_dependentes" CHECK (("numero_dependentes" >= 0)),
    CONSTRAINT "check_irrf_bracket_mes" CHECK ((("mes_vigencia" >= 1) AND ("mes_vigencia" <= 12))),
    CONSTRAINT "check_irrf_bracket_valor_dependente" CHECK (("valor_por_dependente" >= (0)::numeric)),
    CONSTRAINT "check_irrf_bracket_valores" CHECK ((("valor_maximo" IS NULL) OR ("valor_minimo" <= "valor_maximo")))
);


ALTER TABLE "rh"."irrf_brackets" OWNER TO "postgres";


COMMENT ON TABLE "rh"."irrf_brackets" IS 'Tabela de faixas do IRRF para c??lculo de imposto de renda';



COMMENT ON COLUMN "rh"."irrf_brackets"."ano_vigencia" IS 'Ano de vig??ncia da faixa IRRF';



COMMENT ON COLUMN "rh"."irrf_brackets"."mes_vigencia" IS 'M??s de vig??ncia da faixa IRRF';



COMMENT ON COLUMN "rh"."irrf_brackets"."valor_minimo" IS 'Valor m??nimo da faixa salarial';



COMMENT ON COLUMN "rh"."irrf_brackets"."valor_maximo" IS 'Valor m??ximo da faixa salarial (NULL = sem limite)';



COMMENT ON COLUMN "rh"."irrf_brackets"."aliquota" IS 'Al??quota do IRRF (0.075 = 7,5%)';



COMMENT ON COLUMN "rh"."irrf_brackets"."valor_deducao" IS 'Valor a ser deduzido do c??lculo';



COMMENT ON COLUMN "rh"."irrf_brackets"."numero_dependentes" IS 'N??mero de dependentes considerados na faixa';



COMMENT ON COLUMN "rh"."irrf_brackets"."valor_por_dependente" IS 'Valor de dedu????o por dependente';



CREATE TABLE IF NOT EXISTS "rh"."job_openings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "job_request_id" "uuid",
    "position_name" character varying(255) NOT NULL,
    "department_name" character varying(255),
    "job_description" "text" NOT NULL,
    "requirements" "text",
    "benefits" "text",
    "salary_range" character varying(100),
    "status" character varying(20) DEFAULT 'aberta'::character varying,
    "created_by" "uuid" NOT NULL,
    "published_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "job_openings_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['aberta'::character varying, 'pausada'::character varying, 'fechada'::character varying, 'preenchida'::character varying])::"text"[])))
);


ALTER TABLE "rh"."job_openings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."job_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "position_name" character varying(255) NOT NULL,
    "department_name" character varying(255),
    "job_description" "text" NOT NULL,
    "requirements" "text",
    "benefits" "text",
    "salary_range" character varying(100),
    "urgency_level" character varying(20) DEFAULT 'media'::character varying,
    "status" character varying(20) DEFAULT 'solicitado'::character varying,
    "requested_by" "uuid" NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "expected_start_date" "date",
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "job_requests_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['solicitado'::character varying, 'em_analise'::character varying, 'aprovado'::character varying, 'reprovado'::character varying])::"text"[]))),
    CONSTRAINT "job_requests_urgency_level_check" CHECK ((("urgency_level")::"text" = ANY ((ARRAY['baixa'::character varying, 'media'::character varying, 'alta'::character varying, 'critica'::character varying])::"text"[])))
);


ALTER TABLE "rh"."job_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."location_zones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao" "text",
    "latitude" numeric(10,8) NOT NULL,
    "longitude" numeric(11,8) NOT NULL,
    "raio_metros" integer DEFAULT 100 NOT NULL,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "location_zones_raio_metros_check" CHECK (("raio_metros" > 0)),
    CONSTRAINT "valid_latitude" CHECK ((("latitude" >= ('-90'::integer)::numeric) AND ("latitude" <= (90)::numeric))),
    CONSTRAINT "valid_longitude" CHECK ((("longitude" >= ('-180'::integer)::numeric) AND ("longitude" <= (180)::numeric)))
);


ALTER TABLE "rh"."location_zones" OWNER TO "postgres";


COMMENT ON TABLE "rh"."location_zones" IS 'Zonas geogrÃ¡ficas onde Ã© permitido registrar ponto';



COMMENT ON COLUMN "rh"."location_zones"."nome" IS 'Nome da zona de localizaÃ§Ã£o (ex: "EscritÃ³rio Central", "Obra A")';



COMMENT ON COLUMN "rh"."location_zones"."descricao" IS 'DescriÃ§Ã£o detalhada da zona';



COMMENT ON COLUMN "rh"."location_zones"."latitude" IS 'Latitude do ponto central da zona';



COMMENT ON COLUMN "rh"."location_zones"."longitude" IS 'Longitude do ponto central da zona';



COMMENT ON COLUMN "rh"."location_zones"."raio_metros" IS 'Raio permitido em metros a partir do ponto central';



CREATE TABLE IF NOT EXISTS "rh"."medical_agreements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "tipo" character varying(50) NOT NULL,
    "cnpj" character varying(14),
    "razao_social" character varying(255),
    "telefone" character varying(20),
    "email" character varying(255),
    "site" character varying(255),
    "endereco" "text",
    "cidade" character varying(100),
    "estado" character varying(2),
    "cep" character varying(8),
    "contato_responsavel" character varying(255),
    "telefone_contato" character varying(20),
    "email_contato" character varying(255),
    "observacoes" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "medical_agreements_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['medico'::character varying, 'odontologico'::character varying, 'ambos'::character varying])::"text"[])))
);


ALTER TABLE "rh"."medical_agreements" OWNER TO "postgres";


COMMENT ON TABLE "rh"."medical_agreements" IS 'Convênios médicos e odontológicos disponíveis para os funcionários';



COMMENT ON COLUMN "rh"."medical_agreements"."tipo" IS 'Tipo: medico, odontologico, ambos';



CREATE TABLE IF NOT EXISTS "rh"."medical_certificate_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "certificate_id" "uuid" NOT NULL,
    "file_name" character varying(255) NOT NULL,
    "file_url" "text" NOT NULL,
    "file_type" character varying(50),
    "file_size" integer,
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid" NOT NULL
);


ALTER TABLE "rh"."medical_certificate_attachments" OWNER TO "postgres";


COMMENT ON TABLE "rh"."medical_certificate_attachments" IS 'Anexos dos atestados mÃ©dicos';



COMMENT ON COLUMN "rh"."medical_certificate_attachments"."certificate_id" IS 'ID do atestado mÃ©dico';



COMMENT ON COLUMN "rh"."medical_certificate_attachments"."file_name" IS 'Nome do arquivo anexado';



COMMENT ON COLUMN "rh"."medical_certificate_attachments"."file_url" IS 'URL do arquivo no storage';



COMMENT ON COLUMN "rh"."medical_certificate_attachments"."file_type" IS 'Tipo do arquivo (PDF, JPG, etc.)';



COMMENT ON COLUMN "rh"."medical_certificate_attachments"."file_size" IS 'Tamanho do arquivo em bytes';



CREATE TABLE IF NOT EXISTS "rh"."medical_plan_age_ranges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "idade_min" integer NOT NULL,
    "idade_max" integer NOT NULL,
    "valor_titular" numeric(10,2) NOT NULL,
    "valor_dependente" numeric(10,2) NOT NULL,
    "ordem" integer DEFAULT 0,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "medical_plan_age_ranges_check" CHECK ((("idade_max" >= "idade_min") AND ("idade_max" <= 120))),
    CONSTRAINT "medical_plan_age_ranges_idade_min_check" CHECK (("idade_min" >= 0))
);


ALTER TABLE "rh"."medical_plan_age_ranges" OWNER TO "postgres";


COMMENT ON TABLE "rh"."medical_plan_age_ranges" IS 'Faixas etárias e valores específicos para cada plano médico. Permite que cada plano tenha valores diferentes por idade.';



COMMENT ON COLUMN "rh"."medical_plan_age_ranges"."idade_min" IS 'Idade mínima da faixa (inclusive)';



COMMENT ON COLUMN "rh"."medical_plan_age_ranges"."idade_max" IS 'Idade máxima da faixa (inclusive)';



COMMENT ON COLUMN "rh"."medical_plan_age_ranges"."valor_titular" IS 'Valor mensal para titular nesta faixa etária';



COMMENT ON COLUMN "rh"."medical_plan_age_ranges"."valor_dependente" IS 'Valor mensal para dependente nesta faixa etária';



COMMENT ON COLUMN "rh"."medical_plan_age_ranges"."ordem" IS 'Ordem de prioridade quando há sobreposição (menor = maior prioridade)';



CREATE TABLE IF NOT EXISTS "rh"."medical_plan_pricing_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "data_vigencia" "date" NOT NULL,
    "valor_titular_anterior" numeric(10,2),
    "valor_titular_novo" numeric(10,2) NOT NULL,
    "valor_dependente_anterior" numeric(10,2),
    "valor_dependente_novo" numeric(10,2) NOT NULL,
    "valor_familia_anterior" numeric(10,2),
    "valor_familia_novo" numeric(10,2),
    "percentual_reajuste" numeric(5,2),
    "motivo_reajuste" "text",
    "aprovado_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."medical_plan_pricing_history" OWNER TO "postgres";


COMMENT ON TABLE "rh"."medical_plan_pricing_history" IS 'Histórico de reajustes de preços dos planos';



CREATE TABLE IF NOT EXISTS "rh"."medical_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "agreement_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao" "text",
    "categoria" character varying(50) NOT NULL,
    "cobertura" "text",
    "carencia_dias" integer DEFAULT 0,
    "faixa_etaria_min" integer DEFAULT 0,
    "faixa_etaria_max" integer DEFAULT 99,
    "limite_dependentes" integer DEFAULT 0,
    "valor_titular" numeric(10,2) NOT NULL,
    "valor_dependente" numeric(10,2) NOT NULL,
    "valor_familia" numeric(10,2),
    "desconto_funcionario" numeric(5,2) DEFAULT 0,
    "desconto_dependente" numeric(5,2) DEFAULT 0,
    "ativo" boolean DEFAULT true,
    "data_inicio_vigencia" "date",
    "data_fim_vigencia" "date",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "entra_no_calculo_folha" boolean DEFAULT true NOT NULL,
    "tipo_folha" character varying(20) DEFAULT 'desconto'::character varying NOT NULL,
    "categoria_desconto" character varying(50) DEFAULT 'convenio_medico'::character varying NOT NULL,
    "tem_coparticipacao" boolean DEFAULT false,
    "percentual_coparticipacao" numeric(5,2) DEFAULT 0,
    "valor_minimo_coparticipacao" numeric(10,2) DEFAULT 0,
    "valor_maximo_coparticipacao" numeric(10,2),
    CONSTRAINT "medical_plans_categoria_check" CHECK ((("categoria")::"text" = ANY ((ARRAY['basico'::character varying, 'intermediario'::character varying, 'premium'::character varying, 'executivo'::character varying, 'familia'::character varying, 'individual'::character varying])::"text"[]))),
    CONSTRAINT "medical_plans_categoria_desconto_check" CHECK ((("categoria_desconto")::"text" = ANY ((ARRAY['convenio_medico'::character varying, 'convenio_odontologico'::character varying, 'seguro_vida'::character varying, 'outros'::character varying])::"text"[]))),
    CONSTRAINT "medical_plans_percentual_coparticipacao_check" CHECK ((("percentual_coparticipacao" >= (0)::numeric) AND ("percentual_coparticipacao" <= (100)::numeric))),
    CONSTRAINT "medical_plans_tipo_folha_check" CHECK ((("tipo_folha")::"text" = ANY ((ARRAY['provento'::character varying, 'desconto'::character varying])::"text"[])))
);


ALTER TABLE "rh"."medical_plans" OWNER TO "postgres";


COMMENT ON TABLE "rh"."medical_plans" IS 'Planos oferecidos por cada convênio médico/odontológico';



COMMENT ON COLUMN "rh"."medical_plans"."categoria" IS 'Categoria: basico, intermediario, premium, executivo, familia, individual';



COMMENT ON COLUMN "rh"."medical_plans"."entra_no_calculo_folha" IS 'Se o plano mÃ©dico deve ser incluÃ­do no cÃ¡lculo da folha de pagamento';



COMMENT ON COLUMN "rh"."medical_plans"."tipo_folha" IS 'Tipo: provento (benefÃ­cio) ou desconto (desconto do salÃ¡rio)';



COMMENT ON COLUMN "rh"."medical_plans"."categoria_desconto" IS 'Categoria do desconto para agrupamento na folha';



COMMENT ON COLUMN "rh"."medical_plans"."tem_coparticipacao" IS 'Se o plano tem coparticipação (funcionário paga percentual dos serviços)';



COMMENT ON COLUMN "rh"."medical_plans"."percentual_coparticipacao" IS 'Percentual que o funcionário paga (ex: 10%, 20%)';



COMMENT ON COLUMN "rh"."medical_plans"."valor_minimo_coparticipacao" IS 'Valor mínimo que o funcionário paga por serviço';



COMMENT ON COLUMN "rh"."medical_plans"."valor_maximo_coparticipacao" IS 'Valor máximo que o funcionário paga por serviço (NULL = sem limite)';



CREATE TABLE IF NOT EXISTS "rh"."medical_services_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "employee_plan_id" "uuid" NOT NULL,
    "dependent_id" "uuid",
    "tipo_servico" character varying(50) NOT NULL,
    "descricao" "text" NOT NULL,
    "data_utilizacao" "date" NOT NULL,
    "prestador_nome" character varying(255),
    "prestador_cnpj" character varying(14),
    "valor_total" numeric(10,2) NOT NULL,
    "valor_coparticipacao" numeric(10,2) DEFAULT 0 NOT NULL,
    "percentual_aplicado" numeric(5,2),
    "status" character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    "mes_referencia_folha" integer,
    "ano_referencia_folha" integer,
    "payroll_event_id" "uuid",
    "nota_fiscal_numero" character varying(50),
    "nota_fiscal_valor" numeric(10,2),
    "anexo_url" "text",
    "observacoes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "medical_services_usage_ano_referencia_folha_check" CHECK ((("ano_referencia_folha" >= 2000) AND ("ano_referencia_folha" <= 2100))),
    CONSTRAINT "medical_services_usage_mes_referencia_folha_check" CHECK ((("mes_referencia_folha" >= 1) AND ("mes_referencia_folha" <= 12))),
    CONSTRAINT "medical_services_usage_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'pago'::character varying, 'cancelado'::character varying])::"text"[]))),
    CONSTRAINT "medical_services_usage_tipo_servico_check" CHECK ((("tipo_servico")::"text" = ANY ((ARRAY['consulta'::character varying, 'exame'::character varying, 'cirurgia'::character varying, 'procedimento'::character varying, 'internacao'::character varying, 'outros'::character varying])::"text"[])))
);


ALTER TABLE "rh"."medical_services_usage" OWNER TO "postgres";


COMMENT ON TABLE "rh"."medical_services_usage" IS 'Histórico de utilização de serviços médicos para cálculo de coparticipação';



COMMENT ON COLUMN "rh"."medical_services_usage"."tipo_servico" IS 'Tipo: consulta, exame, cirurgia, procedimento, internacao, outros';



COMMENT ON COLUMN "rh"."medical_services_usage"."status" IS 'Status: pendente (não descontado), pago (já descontado na folha), cancelado';



CREATE TABLE IF NOT EXISTS "rh"."monthly_benefit_processing" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "benefit_config_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "month_reference" integer NOT NULL,
    "year_reference" integer NOT NULL,
    "base_value" numeric(10,2),
    "work_days" integer,
    "absence_days" integer,
    "discount_value" numeric(10,2) DEFAULT 0,
    "final_value" numeric(10,2),
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "processed_at" timestamp with time zone,
    "validated_at" timestamp with time zone,
    "processed_by" "uuid",
    "validated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "monthly_benefit_processing_month_reference_check" CHECK ((("month_reference" >= 1) AND ("month_reference" <= 12))),
    CONSTRAINT "monthly_benefit_processing_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'processed'::character varying, 'validated'::character varying, 'rejected'::character varying])::"text"[])))
);


ALTER TABLE "rh"."monthly_benefit_processing" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."payroll" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "mes_referencia" integer NOT NULL,
    "ano_referencia" integer NOT NULL,
    "salario_base" numeric(10,2) NOT NULL,
    "horas_trabalhadas" numeric(4,2) DEFAULT 0,
    "horas_extras" numeric(4,2) DEFAULT 0,
    "valor_horas_extras" numeric(10,2) DEFAULT 0,
    "total_vencimentos" numeric(10,2) DEFAULT 0,
    "total_descontos" numeric(10,2) DEFAULT 0,
    "salario_liquido" numeric(10,2) DEFAULT 0,
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "data_pagamento" "date",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "total_beneficios_convenios_medicos" numeric(10,2) DEFAULT 0,
    "total_descontos_convenios_medicos" numeric(10,2) DEFAULT 0,
    "total_beneficios_tradicionais" numeric(10,2) DEFAULT 0,
    CONSTRAINT "payroll_mes_referencia_check" CHECK ((("mes_referencia" >= 1) AND ("mes_referencia" <= 12))),
    CONSTRAINT "payroll_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'em_revisao'::character varying, 'processado'::character varying, 'validado'::character varying, 'pago'::character varying, 'cancelado'::character varying])::"text"[])))
);


ALTER TABLE "rh"."payroll" OWNER TO "postgres";


COMMENT ON COLUMN "rh"."payroll"."status" IS 'Status da folha: pendente (inicial), em_revisao (gerada, aguardando revisão RH), processado (calculado), validado (aprovado pelo RH, visível para colaborador), pago (pago), cancelado (cancelado)';



COMMENT ON COLUMN "rh"."payroll"."total_beneficios_convenios_medicos" IS 'Total de benefÃ­cios de convÃªnios mÃ©dicos (proventos)';



COMMENT ON COLUMN "rh"."payroll"."total_descontos_convenios_medicos" IS 'Total de descontos de convÃªnios mÃ©dicos';



COMMENT ON COLUMN "rh"."payroll"."total_beneficios_tradicionais" IS 'Total de benefÃ­cios tradicionais (VR, VA, etc.)';



CREATE TABLE IF NOT EXISTS "rh"."payroll_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "descricao" character varying(255) NOT NULL,
    "ativo" boolean DEFAULT true,
    "ano_vigencia" integer NOT NULL,
    "mes_vigencia" integer NOT NULL,
    "dias_uteis_mes" integer DEFAULT 22,
    "horas_dia_trabalho" numeric(4,2) DEFAULT 8.00,
    "percentual_hora_extra" numeric(5,4) DEFAULT 0.5000,
    "percentual_hora_noturna" numeric(5,4) DEFAULT 0.2000,
    "percentual_dsr" numeric(5,4) DEFAULT 0.0455,
    "aplicar_inss" boolean DEFAULT true,
    "aplicar_irrf" boolean DEFAULT true,
    "aplicar_fgts" boolean DEFAULT true,
    "aplicar_vale_transporte" boolean DEFAULT true,
    "percentual_vale_transporte" numeric(5,4) DEFAULT 0.0600,
    "aplicar_adicional_noturno" boolean DEFAULT true,
    "percentual_adicional_noturno" numeric(5,4) DEFAULT 0.2000,
    "aplicar_periculosidade" boolean DEFAULT false,
    "percentual_periculosidade" numeric(5,4) DEFAULT 0.3000,
    "aplicar_insalubridade" boolean DEFAULT false,
    "grau_insalubridade" character varying(20) DEFAULT 'medio'::character varying,
    "aplicar_ferias_proporcionais" boolean DEFAULT true,
    "aplicar_terco_ferias" boolean DEFAULT true,
    "aplicar_13_salario" boolean DEFAULT true,
    "desconto_faltas" boolean DEFAULT true,
    "desconto_atrasos" boolean DEFAULT true,
    "tolerancia_atraso_minutos" integer DEFAULT 5,
    "arredondar_centavos" boolean DEFAULT true,
    "tipo_arredondamento" character varying(20) DEFAULT 'matematico'::character varying,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payroll_config_ano_vigencia_check" CHECK ((("ano_vigencia" >= 2000) AND ("ano_vigencia" <= 2100))),
    CONSTRAINT "payroll_config_grau_insalubridade_check" CHECK ((("grau_insalubridade")::"text" = ANY ((ARRAY['minimo'::character varying, 'medio'::character varying, 'maximo'::character varying])::"text"[]))),
    CONSTRAINT "payroll_config_mes_vigencia_check" CHECK ((("mes_vigencia" >= 1) AND ("mes_vigencia" <= 12))),
    CONSTRAINT "payroll_config_tipo_arredondamento_check" CHECK ((("tipo_arredondamento")::"text" = ANY ((ARRAY['matematico'::character varying, 'para_cima'::character varying, 'para_baixo'::character varying])::"text"[])))
);


ALTER TABLE "rh"."payroll_config" OWNER TO "postgres";


COMMENT ON TABLE "rh"."payroll_config" IS 'ConfiguraÃ§Ãµes especÃ­ficas para cÃ¡lculo de folha de pagamento';



COMMENT ON COLUMN "rh"."payroll_config"."dias_uteis_mes" IS 'NÃºmero de dias Ãºteis no mÃªs (padrÃ£o 22)';



COMMENT ON COLUMN "rh"."payroll_config"."horas_dia_trabalho" IS 'Horas de trabalho por dia (padrÃ£o 8h)';



COMMENT ON COLUMN "rh"."payroll_config"."percentual_hora_extra" IS 'Percentual de hora extra (padrÃ£o 50%)';



COMMENT ON COLUMN "rh"."payroll_config"."percentual_hora_noturna" IS 'Percentual de hora noturna (padrÃ£o 20%)';



COMMENT ON COLUMN "rh"."payroll_config"."percentual_dsr" IS 'Percentual de DSR (1/22 = 4.55%)';



COMMENT ON COLUMN "rh"."payroll_config"."grau_insalubridade" IS 'Grau de insalubridade: minimo, medio, maximo';



COMMENT ON COLUMN "rh"."payroll_config"."tolerancia_atraso_minutos" IS 'TolerÃ¢ncia para atrasos em minutos';



COMMENT ON COLUMN "rh"."payroll_config"."tipo_arredondamento" IS 'Tipo de arredondamento: matematico, para_cima, para_baixo';



CREATE TABLE IF NOT EXISTS "rh"."payroll_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payroll_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "rubrica_id" "uuid" NOT NULL,
    "codigo_rubrica" character varying(20) NOT NULL,
    "descricao_rubrica" character varying(255) NOT NULL,
    "tipo_rubrica" character varying(20) NOT NULL,
    "quantidade" numeric(10,4) DEFAULT 1.0,
    "valor_unitario" numeric(10,2) DEFAULT 0.00,
    "valor_total" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "percentual" numeric(5,4) DEFAULT 0.0000,
    "mes_referencia" integer NOT NULL,
    "ano_referencia" integer NOT NULL,
    "calculado_automaticamente" boolean DEFAULT true,
    "origem_evento" character varying(50) DEFAULT 'sistema'::character varying,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payroll_events_ano_referencia_check" CHECK ((("ano_referencia" >= 2000) AND ("ano_referencia" <= 2100))),
    CONSTRAINT "payroll_events_mes_referencia_check" CHECK ((("mes_referencia" >= 1) AND ("mes_referencia" <= 12))),
    CONSTRAINT "payroll_events_tipo_rubrica_check" CHECK ((("tipo_rubrica")::"text" = ANY ((ARRAY['provento'::character varying, 'desconto'::character varying, 'base_calculo'::character varying, 'informacao'::character varying])::"text"[])))
);


ALTER TABLE "rh"."payroll_events" OWNER TO "postgres";


COMMENT ON TABLE "rh"."payroll_events" IS 'Eventos individuais de cada funcionÃ¡rio por perÃ­odo de folha';



COMMENT ON COLUMN "rh"."payroll_events"."payroll_id" IS 'ReferÃªncia Ã  folha de pagamento';



COMMENT ON COLUMN "rh"."payroll_events"."rubrica_id" IS 'Rubrica que originou o evento';



COMMENT ON COLUMN "rh"."payroll_events"."tipo_rubrica" IS 'Tipo da rubrica: provento, desconto, base_calculo, informacao';



COMMENT ON COLUMN "rh"."payroll_events"."quantidade" IS 'Quantidade para cÃ¡lculo (horas, dias, etc.)';



COMMENT ON COLUMN "rh"."payroll_events"."valor_unitario" IS 'Valor por unidade';



COMMENT ON COLUMN "rh"."payroll_events"."valor_total" IS 'Valor total calculado';



COMMENT ON COLUMN "rh"."payroll_events"."percentual" IS 'Percentual aplicado (para rubricas percentuais)';



COMMENT ON COLUMN "rh"."payroll_events"."calculado_automaticamente" IS 'Se o evento foi calculado automaticamente pelo sistema';



COMMENT ON COLUMN "rh"."payroll_events"."origem_evento" IS 'Origem do evento: sistema, manual, importado';



CREATE TABLE IF NOT EXISTS "rh"."payroll_overtime_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "closure_id" "uuid",
    "payroll_period" character varying(7) NOT NULL,
    "event_date" "date" NOT NULL,
    "hours_50_amount" numeric(6,2) DEFAULT 0,
    "hours_100_amount" numeric(6,2) DEFAULT 0,
    "total_value" numeric(10,2) DEFAULT 0,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payroll_overtime_events_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'processed'::character varying, 'paid'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "rh"."payroll_overtime_events" OWNER TO "postgres";


COMMENT ON TABLE "rh"."payroll_overtime_events" IS 'Eventos financeiros de horas extras para pagamento na folha';



CREATE TABLE IF NOT EXISTS "rh"."positions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao" "text",
    "nivel_hierarquico" integer DEFAULT 1,
    "salario_minimo" numeric(10,2),
    "salario_maximo" numeric(10,2),
    "carga_horaria" integer DEFAULT 40,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."positions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "tipo" character varying(50) NOT NULL,
    "periodo" character varying(20),
    "status" character varying(20) DEFAULT 'gerado'::character varying NOT NULL,
    "data_geracao" timestamp with time zone DEFAULT "now"(),
    "arquivo_url" "text",
    "parametros" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reports_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['gerado'::character varying, 'processando'::character varying, 'erro'::character varying])::"text"[])))
);


ALTER TABLE "rh"."reports" OWNER TO "postgres";


COMMENT ON TABLE "rh"."reports" IS 'Tabela de relatÃ³rios gerados';



COMMENT ON COLUMN "rh"."reports"."tipo" IS 'Tipo do relatÃ³rio (ex: funcionarios, folha, horas, ferias)';



COMMENT ON COLUMN "rh"."reports"."periodo" IS 'PerÃ­odo do relatÃ³rio (ex: 2024/01)';



COMMENT ON COLUMN "rh"."reports"."status" IS 'Status do relatÃ³rio: gerado, processando, erro';



COMMENT ON COLUMN "rh"."reports"."arquivo_url" IS 'URL do arquivo do relatÃ³rio gerado';



COMMENT ON COLUMN "rh"."reports"."parametros" IS 'ParÃ¢metros utilizados para gerar o relatÃ³rio (JSON)';



CREATE TABLE IF NOT EXISTS "rh"."rubricas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "codigo" character varying(20) NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao" "text",
    "tipo" character varying(50) NOT NULL,
    "categoria" character varying(100),
    "natureza" character varying(50) DEFAULT 'normal'::character varying,
    "calculo_automatico" boolean DEFAULT false,
    "formula_calculo" "text",
    "valor_fixo" numeric(12,2),
    "percentual" numeric(5,4),
    "base_calculo" character varying(50) DEFAULT 'salario_base'::character varying,
    "incidencia_ir" boolean DEFAULT false,
    "incidencia_inss" boolean DEFAULT false,
    "incidencia_fgts" boolean DEFAULT false,
    "incidencia_contribuicao_sindical" boolean DEFAULT false,
    "ordem_exibicao" integer DEFAULT 0,
    "obrigatorio" boolean DEFAULT false,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_rubrica_percentual" CHECK ((("percentual" IS NULL) OR (("percentual" >= (0)::numeric) AND ("percentual" <= (100)::numeric)))),
    CONSTRAINT "check_rubrica_valor_formula" CHECK (((("valor_fixo" IS NOT NULL) AND ("formula_calculo" IS NULL)) OR (("valor_fixo" IS NULL) AND ("formula_calculo" IS NOT NULL)) OR (("valor_fixo" IS NULL) AND ("formula_calculo" IS NULL)))),
    CONSTRAINT "rubricas_natureza_check" CHECK ((("natureza")::"text" = ANY ((ARRAY['normal'::character varying, 'eventual'::character varying, 'fixo'::character varying, 'variavel'::character varying])::"text"[]))),
    CONSTRAINT "rubricas_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['provento'::character varying, 'desconto'::character varying, 'base_calculo'::character varying, 'informacao'::character varying])::"text"[])))
);


ALTER TABLE "rh"."rubricas" OWNER TO "postgres";


COMMENT ON TABLE "rh"."rubricas" IS 'Tabela de rubricas para folha de pagamento';



COMMENT ON COLUMN "rh"."rubricas"."tipo" IS 'Tipo da rubrica: provento, desconto, base_calculo, informacao';



COMMENT ON COLUMN "rh"."rubricas"."natureza" IS 'Natureza da rubrica: normal, eventual, fixo, variavel';



COMMENT ON COLUMN "rh"."rubricas"."formula_calculo" IS 'F??rmula para c??lculo autom??tico da rubrica';



COMMENT ON COLUMN "rh"."rubricas"."base_calculo" IS 'Base para c??lculo: salario_base, salario_familia, etc.';



COMMENT ON COLUMN "rh"."rubricas"."incidencia_ir" IS 'Se a rubrica incide no c??lculo do IR';



COMMENT ON COLUMN "rh"."rubricas"."incidencia_inss" IS 'Se a rubrica incide no c??lculo do INSS';



COMMENT ON COLUMN "rh"."rubricas"."incidencia_fgts" IS 'Se a rubrica incide no c??lculo do FGTS';



CREATE TABLE IF NOT EXISTS "rh"."selection_processes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "job_opening_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "current_stage" character varying(50) NOT NULL,
    "status" character varying(20) DEFAULT 'ativo'::character varying,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "selection_processes_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'pausado'::character varying, 'finalizado'::character varying, 'cancelado'::character varying])::"text"[])))
);


ALTER TABLE "rh"."selection_processes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."selection_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "selection_process_id" "uuid" NOT NULL,
    "stage_name" character varying(100) NOT NULL,
    "stage_type" character varying(50) NOT NULL,
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "scheduled_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "interviewer_id" "uuid",
    "score" numeric(3,1),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "selection_stages_stage_type_check" CHECK ((("stage_type")::"text" = ANY ((ARRAY['triagem'::character varying, 'entrevista_telefonica'::character varying, 'entrevista_presencial'::character varying, 'teste_tecnico'::character varying, 'entrevista_final'::character varying, 'aprovacao'::character varying])::"text"[]))),
    CONSTRAINT "selection_stages_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'em_andamento'::character varying, 'aprovado'::character varying, 'reprovado'::character varying, 'desistiu'::character varying])::"text"[])))
);


ALTER TABLE "rh"."selection_stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."signature_month_control" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "month_year" character varying(7) NOT NULL,
    "is_locked" boolean DEFAULT false NOT NULL,
    "locked_by" "uuid",
    "locked_at" timestamp with time zone,
    "unlocked_by" "uuid",
    "unlocked_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."signature_month_control" OWNER TO "postgres";


COMMENT ON TABLE "rh"."signature_month_control" IS 'Controle de liberaÃ§Ã£o/bloqueio de assinaturas de ponto por mÃªs/ano';



COMMENT ON COLUMN "rh"."signature_month_control"."month_year" IS 'MÃªs e ano no formato YYYY-MM';



COMMENT ON COLUMN "rh"."signature_month_control"."is_locked" IS 'true = bloqueado (nÃ£o permite assinaturas), false = liberado (permite assinaturas)';



CREATE TABLE IF NOT EXISTS "rh"."signature_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "signature_id" "uuid" NOT NULL,
    "notification_type" character varying(50) NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "sent_via" character varying(20) NOT NULL,
    "status" character varying(20) DEFAULT 'sent'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "signature_notifications_notification_type_check" CHECK ((("notification_type")::"text" = ANY ((ARRAY['initial'::character varying, 'reminder'::character varying, 'expiration_warning'::character varying, 'expired'::character varying])::"text"[]))),
    CONSTRAINT "signature_notifications_sent_via_check" CHECK ((("sent_via")::"text" = ANY ((ARRAY['email'::character varying, 'sms'::character varying, 'system'::character varying])::"text"[]))),
    CONSTRAINT "signature_notifications_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['sent'::character varying, 'delivered'::character varying, 'failed'::character varying])::"text"[])))
);


ALTER TABLE "rh"."signature_notifications" OWNER TO "postgres";


COMMENT ON TABLE "rh"."signature_notifications" IS 'HistÃ³rico de notificaÃ§Ãµes enviadas para assinatura de ponto';



CREATE TABLE IF NOT EXISTS "rh"."sobreaviso_escalas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "data_escala" "date" NOT NULL,
    "hora_inicio" time without time zone NOT NULL,
    "hora_fim" time without time zone NOT NULL,
    "duracao_horas" numeric(4,2) NOT NULL,
    "valor_hora_normal" numeric(10,2) NOT NULL,
    "valor_pago" numeric(10,2) NOT NULL,
    "mes_referencia" integer NOT NULL,
    "ano_referencia" integer NOT NULL,
    "folha_processada" boolean DEFAULT false,
    "payroll_event_id" "uuid",
    "incidencia_ferias" boolean DEFAULT true,
    "incidencia_13_salario" boolean DEFAULT true,
    "incidencia_fgts" boolean DEFAULT true,
    "incidencia_dsr" boolean DEFAULT true,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chk_sobreaviso_duracao_max_24" CHECK ((("duracao_horas" > (0)::numeric) AND ("duracao_horas" <= (24)::numeric))),
    CONSTRAINT "sobreaviso_escalas_ano_referencia_check" CHECK ((("ano_referencia" >= 2000) AND ("ano_referencia" <= 2100))),
    CONSTRAINT "sobreaviso_escalas_mes_referencia_check" CHECK ((("mes_referencia" >= 1) AND ("mes_referencia" <= 12)))
);


ALTER TABLE "rh"."sobreaviso_escalas" OWNER TO "postgres";


COMMENT ON TABLE "rh"."sobreaviso_escalas" IS 'Escalas de sobreaviso: funcionário em regime de espera (1/3 da hora normal, máx. 24h por escala). Súmula 428 TST.';



COMMENT ON COLUMN "rh"."sobreaviso_escalas"."duracao_horas" IS 'Duração da escala em horas; máximo 24 horas por escala';



COMMENT ON COLUMN "rh"."sobreaviso_escalas"."valor_pago" IS 'Valor remunerado: duracao_horas * valor_hora_normal / 3';



CREATE TABLE IF NOT EXISTS "rh"."talent_pool" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "category" character varying(50) NOT NULL,
    "skills" "text"[],
    "experience_level" character varying(20),
    "availability" character varying(20) DEFAULT 'disponivel'::character varying,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "talent_pool_availability_check" CHECK ((("availability")::"text" = ANY ((ARRAY['disponivel'::character varying, 'interessado'::character varying, 'indisponivel'::character varying])::"text"[]))),
    CONSTRAINT "talent_pool_experience_level_check" CHECK ((("experience_level")::"text" = ANY ((ARRAY['junior'::character varying, 'pleno'::character varying, 'senior'::character varying, 'especialista'::character varying])::"text"[])))
);


ALTER TABLE "rh"."talent_pool" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."time_bank" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "data_registro" "date" NOT NULL,
    "tipo_hora" character varying(20) NOT NULL,
    "quantidade_horas" numeric(5,2) NOT NULL,
    "motivo" "text",
    "status" character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    "aprovado_por" "uuid",
    "data_aprovacao" timestamp with time zone,
    "data_expiracao" "date",
    "utilizado_em" "date",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "time_bank_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'aprovado'::character varying, 'negado'::character varying, 'utilizado'::character varying, 'expirado'::character varying])::"text"[]))),
    CONSTRAINT "time_bank_tipo_hora_check" CHECK ((("tipo_hora")::"text" = ANY ((ARRAY['extra'::character varying, 'compensatoria'::character varying, 'sobreaviso'::character varying, 'adicional_noturno'::character varying])::"text"[])))
);


ALTER TABLE "rh"."time_bank" OWNER TO "postgres";


COMMENT ON TABLE "rh"."time_bank" IS 'Banco de horas dos funcionÃ¡rios - controle de horas extras e compensatÃ³rias';



COMMENT ON COLUMN "rh"."time_bank"."tipo_hora" IS 'Tipo da hora: extra, compensatoria, sobreaviso, adicional_noturno';



COMMENT ON COLUMN "rh"."time_bank"."quantidade_horas" IS 'Quantidade de horas em formato decimal (ex: 2.5 = 2h30min)';



COMMENT ON COLUMN "rh"."time_bank"."status" IS 'Status: pendente, aprovado, negado, utilizado, expirado';



COMMENT ON COLUMN "rh"."time_bank"."data_expiracao" IS 'Data limite para utilizaÃ§Ã£o das horas';



COMMENT ON COLUMN "rh"."time_bank"."utilizado_em" IS 'Data em que as horas foram utilizadas';



CREATE TABLE IF NOT EXISTS "rh"."time_record_event_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "photo_url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."time_record_event_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."time_record_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "time_record_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "event_type" character varying(20) NOT NULL,
    "event_at" timestamp with time zone NOT NULL,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "endereco" "text",
    "source" character varying(20) DEFAULT 'gps'::character varying,
    "accuracy_meters" numeric(6,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "outside_zone" boolean DEFAULT false NOT NULL,
    CONSTRAINT "time_record_events_event_type_check" CHECK ((("event_type")::"text" = ANY ((ARRAY['entrada'::character varying, 'saida'::character varying, 'entrada_almoco'::character varying, 'saida_almoco'::character varying, 'extra_inicio'::character varying, 'extra_fim'::character varying, 'manual'::character varying])::"text"[]))),
    CONSTRAINT "time_record_events_source_check" CHECK ((("source")::"text" = ANY ((ARRAY['gps'::character varying, 'wifi'::character varying, 'manual'::character varying])::"text"[])))
);


ALTER TABLE "rh"."time_record_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."time_record_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "janela_tempo_marcacoes" integer DEFAULT 24 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "time_record_settings_janela_tempo_marcacoes_check" CHECK (("janela_tempo_marcacoes" = ANY (ARRAY[12, 15, 20, 22, 24])))
);


ALTER TABLE "rh"."time_record_settings" OWNER TO "postgres";


COMMENT ON TABLE "rh"."time_record_settings" IS 'ConfiguraÃ§Ãµes de ponto eletrÃ´nico por empresa';



COMMENT ON COLUMN "rh"."time_record_settings"."janela_tempo_marcacoes" IS 'Janela de tempo em horas (12, 15, 20, 22 ou 24) para permitir marcações após a primeira marcação do dia';



CREATE TABLE IF NOT EXISTS "rh"."time_record_signatures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "month_year" character varying(7) NOT NULL,
    "signature_data" "jsonb",
    "signature_timestamp" timestamp with time zone,
    "ip_address" "inet",
    "user_agent" "text",
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "manager_approval_required" boolean DEFAULT true NOT NULL,
    "manager_approved_by" "uuid",
    "manager_approved_at" timestamp with time zone,
    "rejection_reason" "text",
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "time_record_signatures_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'signed'::character varying, 'expired'::character varying, 'rejected'::character varying, 'approved'::character varying])::"text"[])))
);


ALTER TABLE "rh"."time_record_signatures" OWNER TO "postgres";


COMMENT ON TABLE "rh"."time_record_signatures" IS 'Assinaturas de registros de ponto mensais dos funcionÃ¡rios';



COMMENT ON COLUMN "rh"."time_record_signatures"."month_year" IS 'MÃªs e ano no formato YYYY-MM';



COMMENT ON COLUMN "rh"."time_record_signatures"."signature_data" IS 'Dados da assinatura digital (coordenadas, timestamp, etc.)';



COMMENT ON COLUMN "rh"."time_record_signatures"."status" IS 'Status: pending, signed, expired, rejected, approved';



COMMENT ON COLUMN "rh"."time_record_signatures"."expires_at" IS 'Data e hora de expiraÃ§Ã£o da assinatura';



CREATE TABLE IF NOT EXISTS "rh"."training_application_evaluations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "training_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "gestor_id" "uuid" NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "aplica_conhecimento" boolean,
    "qualidade_aplicacao" integer,
    "frequencia_aplicacao" character varying(50),
    "impacto_trabalho" integer,
    "exemplos_aplicacao" "text",
    "dificuldades_observadas" "text",
    "sugestoes_melhoria" "text",
    "recomendaria_retreinamento" boolean,
    "data_avaliacao" timestamp with time zone DEFAULT "now"(),
    "periodo_avaliacao_inicio" "date",
    "periodo_avaliacao_fim" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "training_application_evaluations_impacto_trabalho_check" CHECK ((("impacto_trabalho" >= 1) AND ("impacto_trabalho" <= 5))),
    CONSTRAINT "training_application_evaluations_qualidade_aplicacao_check" CHECK ((("qualidade_aplicacao" >= 1) AND ("qualidade_aplicacao" <= 5)))
);


ALTER TABLE "rh"."training_application_evaluations" OWNER TO "postgres";


COMMENT ON TABLE "rh"."training_application_evaluations" IS 'Avaliação de aplicação prática feita pelos gestores';



CREATE TABLE IF NOT EXISTS "rh"."training_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "training_id" "uuid" NOT NULL,
    "employee_id" "uuid",
    "position_id" "uuid",
    "unit_id" "uuid",
    "tipo_atribuicao" character varying(50) DEFAULT 'obrigatorio'::character varying NOT NULL,
    "data_limite" "date",
    "notificar" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chk_assignment_target" CHECK (((("tipo_atribuicao")::"text" = 'publica'::"text") OR ("employee_id" IS NOT NULL) OR ("position_id" IS NOT NULL) OR ("unit_id" IS NOT NULL)))
);


ALTER TABLE "rh"."training_assignments" OWNER TO "postgres";


COMMENT ON TABLE "rh"."training_assignments" IS 'Atribuições de treinamentos (obrigatórios e opcionais) para funcionários, cargos ou departamentos';



COMMENT ON COLUMN "rh"."training_assignments"."tipo_atribuicao" IS 'Tipo de atribuição: obrigatorio, opcional ou publica (acesso para todos os usuários)';



CREATE TABLE IF NOT EXISTS "rh"."training_attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "training_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "data_treinamento" "date" NOT NULL,
    "hora_entrada" time without time zone,
    "hora_saida" time without time zone,
    "presenca" character varying(50) DEFAULT 'ausente'::character varying NOT NULL,
    "percentual_presenca" numeric(5,2) DEFAULT 0,
    "observacoes" "text",
    "registrado_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."training_certificates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "training_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "numero_certificado" character varying(100) NOT NULL,
    "data_emissao" "date" DEFAULT CURRENT_DATE NOT NULL,
    "data_validade" "date",
    "status" character varying(50) DEFAULT 'valido'::character varying NOT NULL,
    "nota_final" numeric(5,2),
    "percentual_presenca_final" numeric(5,2),
    "aprovado" boolean DEFAULT false NOT NULL,
    "observacoes" "text",
    "template_certificado" "text",
    "arquivo_certificado" "text",
    "emitido_por" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_certificates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."training_content" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "training_id" "uuid" NOT NULL,
    "titulo" character varying(255) NOT NULL,
    "descricao" "text",
    "tipo_conteudo" character varying(50) NOT NULL,
    "ordem" integer DEFAULT 0 NOT NULL,
    "duracao_minutos" integer,
    "url_conteudo" "text",
    "arquivo_path" "text",
    "conteudo_texto" "text",
    "permite_pular" boolean DEFAULT false,
    "requer_conclusao" boolean DEFAULT true,
    "tempo_minimo_segundos" integer,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_content" OWNER TO "postgres";


COMMENT ON TABLE "rh"."training_content" IS 'Conteúdo das aulas/lições dos treinamentos online (vídeos, PDFs, textos)';



CREATE TABLE IF NOT EXISTS "rh"."training_enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "training_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "data_inscricao" timestamp with time zone DEFAULT "now"(),
    "status" character varying(50) DEFAULT 'inscrito'::character varying NOT NULL,
    "justificativa_cancelamento" "text",
    "observacoes" "text",
    "inscrito_por" "uuid",
    "aprovado_por" "uuid",
    "data_aprovacao" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."training_evaluations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "training_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "nota_instrutor" numeric(3,1),
    "nota_conteudo" numeric(3,1),
    "nota_metodologia" numeric(3,1),
    "nota_recursos" numeric(3,1),
    "nota_geral" numeric(3,1),
    "comentarios" "text",
    "sugestoes" "text",
    "recomendaria" boolean,
    "data_avaliacao" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "training_evaluations_nota_conteudo_check" CHECK ((("nota_conteudo" >= (0)::numeric) AND ("nota_conteudo" <= (10)::numeric))),
    CONSTRAINT "training_evaluations_nota_geral_check" CHECK ((("nota_geral" >= (0)::numeric) AND ("nota_geral" <= (10)::numeric))),
    CONSTRAINT "training_evaluations_nota_instrutor_check" CHECK ((("nota_instrutor" >= (0)::numeric) AND ("nota_instrutor" <= (10)::numeric))),
    CONSTRAINT "training_evaluations_nota_metodologia_check" CHECK ((("nota_metodologia" >= (0)::numeric) AND ("nota_metodologia" <= (10)::numeric))),
    CONSTRAINT "training_evaluations_nota_recursos_check" CHECK ((("nota_recursos" >= (0)::numeric) AND ("nota_recursos" <= (10)::numeric)))
);


ALTER TABLE "rh"."training_evaluations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."training_exam_alternatives" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "texto" "text" NOT NULL,
    "ordem" integer DEFAULT 0 NOT NULL,
    "is_correct" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_exam_alternatives" OWNER TO "postgres";


COMMENT ON TABLE "rh"."training_exam_alternatives" IS 'Alternativas das questões de múltipla escolha';



CREATE TABLE IF NOT EXISTS "rh"."training_exam_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "attempt_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "alternative_id" "uuid",
    "resposta_texto" "text",
    "resposta_numerica" numeric(10,2),
    "pontuacao_obtida" numeric(5,2) DEFAULT 0,
    "is_correct" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_exam_answers" OWNER TO "postgres";


COMMENT ON TABLE "rh"."training_exam_answers" IS 'Respostas individuais de cada tentativa';



CREATE TABLE IF NOT EXISTS "rh"."training_exam_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "exam_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "training_id" "uuid" NOT NULL,
    "tentativa_numero" integer DEFAULT 1 NOT NULL,
    "data_inicio" timestamp with time zone DEFAULT "now"(),
    "data_fim" timestamp with time zone,
    "nota_final" numeric(5,2),
    "percentual_acerto" numeric(5,2),
    "aprovado" boolean DEFAULT false,
    "tempo_gasto_segundos" integer,
    "status" character varying(50) DEFAULT 'em_andamento'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_exam_attempts" OWNER TO "postgres";


COMMENT ON TABLE "rh"."training_exam_attempts" IS 'Tentativas dos usuários em fazer as provas';



CREATE TABLE IF NOT EXISTS "rh"."training_exam_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "exam_id" "uuid" NOT NULL,
    "pergunta" "text" NOT NULL,
    "tipo_questao" character varying(50) DEFAULT 'multipla_escolha'::character varying NOT NULL,
    "ordem" integer DEFAULT 0 NOT NULL,
    "pontuacao" numeric(5,2) DEFAULT 1.00,
    "explicacao" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_exam_questions" OWNER TO "postgres";


COMMENT ON TABLE "rh"."training_exam_questions" IS 'Questões das provas';



CREATE TABLE IF NOT EXISTS "rh"."training_exams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "training_id" "uuid" NOT NULL,
    "content_id" "uuid",
    "titulo" character varying(255) NOT NULL,
    "descricao" "text",
    "tipo_avaliacao" character varying(50) DEFAULT 'entre_aulas'::character varying NOT NULL,
    "nota_minima_aprovacao" numeric(5,2) DEFAULT 70.00,
    "tempo_limite_minutos" integer,
    "permite_tentativas" integer DEFAULT 3,
    "ordem" integer DEFAULT 0,
    "obrigatorio" boolean DEFAULT true,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_exams" OWNER TO "postgres";


COMMENT ON TABLE "rh"."training_exams" IS 'Provas e avaliações dos treinamentos';



CREATE TABLE IF NOT EXISTS "rh"."training_notification_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "training_id" "uuid",
    "notification_type_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "employee_id" "uuid",
    "titulo" "text" NOT NULL,
    "mensagem" "text" NOT NULL,
    "data_envio" timestamp with time zone NOT NULL,
    "status" character varying(50) NOT NULL,
    "metodo_envio" character varying(50) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_notification_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."training_notification_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "training_id" "uuid",
    "notification_type_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "employee_id" "uuid",
    "titulo" "text" NOT NULL,
    "mensagem" "text" NOT NULL,
    "data_agendamento" timestamp with time zone NOT NULL,
    "status" character varying(50) DEFAULT 'pendente'::character varying NOT NULL,
    "tentativas" integer DEFAULT 0,
    "max_tentativas" integer DEFAULT 3,
    "data_envio" timestamp with time zone,
    "erro_mensagem" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_notification_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."training_notification_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "training_id" "uuid",
    "notification_type_id" "uuid" NOT NULL,
    "target_audience" character varying(50) DEFAULT 'inscritos'::character varying NOT NULL,
    "dias_antecedencia" integer DEFAULT 0 NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_notification_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."training_notification_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "tipo" character varying(100) NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao" "text",
    "template_titulo" "text" NOT NULL,
    "template_mensagem" "text" NOT NULL,
    "dias_antecedencia" integer DEFAULT 0,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_notification_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."training_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "training_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "content_id" "uuid",
    "enrollment_id" "uuid" NOT NULL,
    "status" character varying(50) DEFAULT 'nao_iniciado'::character varying NOT NULL,
    "percentual_concluido" numeric(5,2) DEFAULT 0,
    "tempo_assistido_segundos" integer DEFAULT 0,
    "data_inicio" timestamp with time zone,
    "data_ultima_atualizacao" timestamp with time zone DEFAULT "now"(),
    "data_conclusao" timestamp with time zone,
    "ultima_posicao_segundos" integer DEFAULT 0,
    "concluido" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_progress" OWNER TO "postgres";


COMMENT ON TABLE "rh"."training_progress" IS 'Progresso do usuário em cada conteúdo do treinamento';



CREATE TABLE IF NOT EXISTS "rh"."training_reaction_evaluations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "training_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "nota_conteudo" integer,
    "nota_instrutor" integer,
    "nota_metodologia" integer,
    "nota_recursos" integer,
    "nota_geral" integer,
    "pontos_positivos" "text",
    "pontos_melhorar" "text",
    "sugestoes" "text",
    "recomendaria" boolean,
    "comentarios_gerais" "text",
    "data_avaliacao" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "training_reaction_evaluations_nota_conteudo_check" CHECK ((("nota_conteudo" >= 1) AND ("nota_conteudo" <= 5))),
    CONSTRAINT "training_reaction_evaluations_nota_geral_check" CHECK ((("nota_geral" >= 1) AND ("nota_geral" <= 5))),
    CONSTRAINT "training_reaction_evaluations_nota_instrutor_check" CHECK ((("nota_instrutor" >= 1) AND ("nota_instrutor" <= 5))),
    CONSTRAINT "training_reaction_evaluations_nota_metodologia_check" CHECK ((("nota_metodologia" >= 1) AND ("nota_metodologia" <= 5))),
    CONSTRAINT "training_reaction_evaluations_nota_recursos_check" CHECK ((("nota_recursos" >= 1) AND ("nota_recursos" <= 5)))
);


ALTER TABLE "rh"."training_reaction_evaluations" OWNER TO "postgres";


COMMENT ON TABLE "rh"."training_reaction_evaluations" IS 'Avaliação de reação dos participantes sobre o treinamento';



CREATE TABLE IF NOT EXISTS "rh"."training_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "notification_enabled" boolean DEFAULT true,
    "email_notifications" boolean DEFAULT true,
    "push_notifications" boolean DEFAULT false,
    "reminder_days_before" integer DEFAULT 3,
    "reminder_days_after" integer DEFAULT 1,
    "auto_enrollment" boolean DEFAULT false,
    "require_approval" boolean DEFAULT true,
    "max_participants" integer DEFAULT 50,
    "min_attendance_percentage" integer DEFAULT 80,
    "certificate_auto_generate" boolean DEFAULT true,
    "certificate_validity_days" integer DEFAULT 365,
    "training_duration_default" numeric(4,2) DEFAULT 8.0,
    "evaluation_required" boolean DEFAULT true,
    "feedback_required" boolean DEFAULT true,
    "auto_archive_days" integer DEFAULT 90,
    "allow_self_enrollment" boolean DEFAULT true,
    "allow_cancellation" boolean DEFAULT true,
    "cancellation_deadline_hours" integer DEFAULT 24,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."training_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."union_contributions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "union_id" "uuid" NOT NULL,
    "tipo_contribuicao" character varying(50) NOT NULL,
    "mes_referencia" character varying(7) NOT NULL,
    "valor" numeric(10,2) NOT NULL,
    "desconto_folha" boolean DEFAULT false,
    "data_vencimento" "date",
    "data_pagamento" "date",
    "status" character varying(20) DEFAULT 'pendente'::character varying NOT NULL,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "union_contributions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pendente'::character varying, 'pago'::character varying, 'atrasado'::character varying, 'isento'::character varying, 'cancelado'::character varying])::"text"[]))),
    CONSTRAINT "union_contributions_tipo_contribuicao_check" CHECK ((("tipo_contribuicao")::"text" = ANY ((ARRAY['mensalidade'::character varying, 'contribuicao_assistencial'::character varying, 'contribuicao_confederativa'::character varying, 'taxa_negociacao'::character varying, 'outras'::character varying])::"text"[])))
);


ALTER TABLE "rh"."union_contributions" OWNER TO "postgres";


COMMENT ON TABLE "rh"."union_contributions" IS 'Contribuições e mensalidades sindicais';



COMMENT ON COLUMN "rh"."union_contributions"."tipo_contribuicao" IS 'Tipo: mensalidade, contribuicao_assistencial, contribuicao_confederativa, taxa_negociacao, outras';



CREATE TABLE IF NOT EXISTS "rh"."union_negotiations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "union_id" "uuid" NOT NULL,
    "tipo_negociacao" character varying(50) NOT NULL,
    "titulo" character varying(255) NOT NULL,
    "descricao" "text",
    "data_inicio" "date" NOT NULL,
    "data_fim" "date",
    "status" character varying(20) DEFAULT 'em_andamento'::character varying NOT NULL,
    "responsavel_empresa" character varying(255),
    "responsavel_sindicato" character varying(255),
    "resultado" "text",
    "valor_proposto" numeric(10,2),
    "valor_aceito" numeric(10,2),
    "percentual_proposto" numeric(5,2),
    "percentual_aceito" numeric(5,2),
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "union_negotiations_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['agendada'::character varying, 'em_andamento'::character varying, 'concluida'::character varying, 'suspensa'::character varying, 'cancelada'::character varying])::"text"[]))),
    CONSTRAINT "union_negotiations_tipo_negociacao_check" CHECK ((("tipo_negociacao")::"text" = ANY ((ARRAY['salarial'::character varying, 'beneficios'::character varying, 'condicoes_trabalho'::character varying, 'seguranca'::character varying, 'outras'::character varying])::"text"[])))
);


ALTER TABLE "rh"."union_negotiations" OWNER TO "postgres";


COMMENT ON TABLE "rh"."union_negotiations" IS 'Negociações e reuniões sindicais';



COMMENT ON COLUMN "rh"."union_negotiations"."tipo_negociacao" IS 'Tipo: salarial, beneficios, condicoes_trabalho, seguranca, outras';



CREATE TABLE IF NOT EXISTS "rh"."union_representatives" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "union_id" "uuid" NOT NULL,
    "cargo" character varying(100) NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date",
    "status" character varying(20) DEFAULT 'ativo'::character varying NOT NULL,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "union_representatives_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'inativo'::character varying, 'suspenso'::character varying])::"text"[])))
);


ALTER TABLE "rh"."union_representatives" OWNER TO "postgres";


COMMENT ON TABLE "rh"."union_representatives" IS 'Representantes sindicais na empresa';



CREATE TABLE IF NOT EXISTS "rh"."unions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "sigla" character varying(50),
    "tipo" character varying(50) NOT NULL,
    "categoria" character varying(100),
    "cnpj" character varying(14),
    "inscricao_municipal" character varying(50),
    "inscricao_estadual" character varying(50),
    "razao_social" character varying(255),
    "telefone" character varying(20),
    "email" character varying(255),
    "site" character varying(255),
    "endereco" "text",
    "cidade" character varying(100),
    "estado" character varying(2),
    "cep" character varying(8),
    "presidente" character varying(255),
    "telefone_presidente" character varying(20),
    "email_presidente" character varying(255),
    "data_fundacao" "date",
    "numero_registro" character varying(50),
    "observacoes" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "unions_tipo_check" CHECK ((("tipo")::"text" = ANY ((ARRAY['patronal'::character varying, 'trabalhadores'::character varying, 'categoria'::character varying, 'profissional'::character varying, 'misto'::character varying])::"text"[])))
);


ALTER TABLE "rh"."unions" OWNER TO "postgres";


COMMENT ON TABLE "rh"."unions" IS 'Sindicatos patronais e de trabalhadores';



COMMENT ON COLUMN "rh"."unions"."tipo" IS 'Tipo: patronal, trabalhadores, categoria, profissional, misto';



CREATE TABLE IF NOT EXISTS "rh"."units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao" "text",
    "codigo" character varying(20),
    "responsavel_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "cost_center_id" "uuid"
);


ALTER TABLE "rh"."units" OWNER TO "postgres";


COMMENT ON COLUMN "rh"."units"."cost_center_id" IS 'Centro de custo associado ao departamento';



CREATE TABLE IF NOT EXISTS "rh"."vacation_entitlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "ano_aquisitivo" integer NOT NULL,
    "data_inicio_periodo" "date" NOT NULL,
    "data_fim_periodo" "date" NOT NULL,
    "dias_disponiveis" integer DEFAULT 30 NOT NULL,
    "dias_gozados" integer DEFAULT 0,
    "dias_restantes" integer GENERATED ALWAYS AS (("dias_disponiveis" - "dias_gozados")) STORED,
    "status" character varying(20) DEFAULT 'ativo'::character varying,
    "data_vencimento" "date",
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_entitlement_days_gozados" CHECK (("dias_gozados" <= "dias_disponiveis")),
    CONSTRAINT "check_entitlement_period_dates" CHECK (("data_fim_periodo" >= "data_inicio_periodo")),
    CONSTRAINT "vacation_entitlements_ano_aquisitivo_check" CHECK ((("ano_aquisitivo" >= 2000) AND ("ano_aquisitivo" <= 2100))),
    CONSTRAINT "vacation_entitlements_dias_disponiveis_check" CHECK ((("dias_disponiveis" >= 0) AND ("dias_disponiveis" <= 30))),
    CONSTRAINT "vacation_entitlements_dias_gozados_check" CHECK (("dias_gozados" >= 0)),
    CONSTRAINT "vacation_entitlements_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'vencido'::character varying, 'gozado'::character varying, 'parcialmente_gozado'::character varying, 'pendente'::character varying])::"text"[])))
);


ALTER TABLE "rh"."vacation_entitlements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."vacation_periods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vacation_id" "uuid" NOT NULL,
    "data_inicio" "date" NOT NULL,
    "data_fim" "date" NOT NULL,
    "dias_ferias" integer NOT NULL,
    "dias_abono" integer DEFAULT 0,
    "periodo_numero" integer NOT NULL,
    "observacoes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_vacation_period_dates" CHECK (("data_fim" >= "data_inicio")),
    CONSTRAINT "check_vacation_period_days" CHECK (("dias_ferias" = (("data_fim" - "data_inicio") + 1))),
    CONSTRAINT "vacation_periods_dias_abono_check" CHECK ((("dias_abono" >= 0) AND ("dias_abono" <= 10))),
    CONSTRAINT "vacation_periods_dias_ferias_check" CHECK (("dias_ferias" > 0)),
    CONSTRAINT "vacation_periods_periodo_numero_check" CHECK ((("periodo_numero" >= 1) AND ("periodo_numero" <= 3)))
);


ALTER TABLE "rh"."vacation_periods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."work_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "descricao" "text",
    "carga_horaria_semanal" integer DEFAULT 40,
    "dias_trabalho" integer[] DEFAULT ARRAY[1, 2, 3, 4, 5],
    "horario_inicio" time without time zone DEFAULT '08:00:00'::time without time zone,
    "horario_fim" time without time zone DEFAULT '17:00:00'::time without time zone,
    "intervalo_almoco" integer DEFAULT 60,
    "tolerancia_entrada" integer DEFAULT 15,
    "tolerancia_saida" integer DEFAULT 15,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "rh"."work_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "rh"."work_shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nome" character varying(255) NOT NULL,
    "codigo" character varying(50),
    "descricao" "text",
    "hora_inicio" time without time zone NOT NULL,
    "hora_fim" time without time zone NOT NULL,
    "intervalo_inicio" time without time zone,
    "intervalo_fim" time without time zone,
    "horas_diarias" numeric(4,2) DEFAULT 8.0 NOT NULL,
    "dias_semana" integer[] DEFAULT '{1,2,3,4,5}'::integer[],
    "tipo_turno" character varying(50) DEFAULT 'normal'::character varying,
    "tolerancia_entrada" integer DEFAULT 0,
    "tolerancia_saida" integer DEFAULT 0,
    "status" character varying(20) DEFAULT 'ativo'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tipo_escala" character varying(50) DEFAULT 'fixa'::character varying,
    "dias_trabalho" integer DEFAULT 5,
    "dias_folga" integer DEFAULT 2,
    "ciclo_dias" integer DEFAULT 7,
    "regras_clt" "jsonb" DEFAULT '{}'::"jsonb",
    "template_escala" boolean DEFAULT false,
    "horarios_por_dia" "jsonb",
    CONSTRAINT "work_shifts_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['ativo'::character varying, 'inativo'::character varying])::"text"[])))
);


ALTER TABLE "rh"."work_shifts" OWNER TO "postgres";


COMMENT ON TABLE "rh"."work_shifts" IS 'Tabela de turnos de trabalho';



COMMENT ON COLUMN "rh"."work_shifts"."dias_semana" IS 'Array com dias da semana: 1=Segunda, 2=Ter??a, 3=Quarta, 4=Quinta, 5=Sexta, 6=S??bado, 7=Domingo';



COMMENT ON COLUMN "rh"."work_shifts"."tolerancia_entrada" IS 'Toler??ncia em minutos para entrada';



COMMENT ON COLUMN "rh"."work_shifts"."tolerancia_saida" IS 'Toler??ncia em minutos para sa??da';



COMMENT ON COLUMN "rh"."work_shifts"."horarios_por_dia" IS 'JSONB com horários específicos por dia da semana. Chave é o número do dia (1=Segunda, 7=Domingo). Cada valor contém: hora_inicio, hora_fim, intervalo_inicio, intervalo_fim, horas_diarias';



ALTER TABLE ONLY "rh"."absence_types"
    ADD CONSTRAINT "absence_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."allowance_types"
    ADD CONSTRAINT "allowance_types_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "rh"."allowance_types"
    ADD CONSTRAINT "allowance_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."approval_level_approvers"
    ADD CONSTRAINT "approval_level_approvers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."approval_levels"
    ADD CONSTRAINT "approval_levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."attendance_corrections"
    ADD CONSTRAINT "attendance_corrections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."audit_config"
    ADD CONSTRAINT "audit_config_company_id_entity_type_key" UNIQUE ("company_id", "entity_type");



ALTER TABLE ONLY "rh"."audit_config"
    ADD CONSTRAINT "audit_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."awards_productivity"
    ADD CONSTRAINT "awards_productivity_employee_id_nome_mes_referencia_key" UNIQUE ("employee_id", "nome", "mes_referencia");



ALTER TABLE ONLY "rh"."awards_productivity"
    ADD CONSTRAINT "awards_productivity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."bank_hours_assignments"
    ADD CONSTRAINT "bank_hours_assignments_employee_id_company_id_key" UNIQUE ("employee_id", "company_id");



ALTER TABLE ONLY "rh"."bank_hours_assignments"
    ADD CONSTRAINT "bank_hours_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."bank_hours_balance"
    ADD CONSTRAINT "bank_hours_balance_employee_id_company_id_key" UNIQUE ("employee_id", "company_id");



ALTER TABLE ONLY "rh"."bank_hours_balance"
    ADD CONSTRAINT "bank_hours_balance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."bank_hours_calculations"
    ADD CONSTRAINT "bank_hours_calculations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."bank_hours_closure"
    ADD CONSTRAINT "bank_hours_closure_employee_id_company_id_closure_date_key" UNIQUE ("employee_id", "company_id", "closure_date");



ALTER TABLE ONLY "rh"."bank_hours_closure"
    ADD CONSTRAINT "bank_hours_closure_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."bank_hours_config"
    ADD CONSTRAINT "bank_hours_config_employee_id_company_id_key" UNIQUE ("employee_id", "company_id");



ALTER TABLE ONLY "rh"."bank_hours_config"
    ADD CONSTRAINT "bank_hours_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."bank_hours_legacy_imports"
    ADD CONSTRAINT "bank_hours_legacy_imports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."bank_hours_transactions"
    ADD CONSTRAINT "bank_hours_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."bank_hours_types"
    ADD CONSTRAINT "bank_hours_types_code_key" UNIQUE ("code");



ALTER TABLE ONLY "rh"."bank_hours_types"
    ADD CONSTRAINT "bank_hours_types_company_id_code_key" UNIQUE ("company_id", "code");



ALTER TABLE ONLY "rh"."bank_hours_types"
    ADD CONSTRAINT "bank_hours_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."benefit_configurations"
    ADD CONSTRAINT "benefit_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."calculation_logs"
    ADD CONSTRAINT "calculation_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."candidate_documents"
    ADD CONSTRAINT "candidate_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."candidates"
    ADD CONSTRAINT "candidates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."cid_codes"
    ADD CONSTRAINT "cid_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."collective_agreements"
    ADD CONSTRAINT "collective_agreements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."compensation_approvals"
    ADD CONSTRAINT "compensation_approvals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."compensation_requests"
    ADD CONSTRAINT "compensation_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."correction_history"
    ADD CONSTRAINT "correction_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."correction_settings"
    ADD CONSTRAINT "correction_settings_company_id_key" UNIQUE ("company_id");



ALTER TABLE ONLY "rh"."correction_settings"
    ADD CONSTRAINT "correction_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."deficiency_types"
    ADD CONSTRAINT "deficiency_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."delay_reasons"
    ADD CONSTRAINT "delay_reasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."dependents"
    ADD CONSTRAINT "dependents_cpf_key" UNIQUE ("cpf");



ALTER TABLE ONLY "rh"."dependents"
    ADD CONSTRAINT "dependents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."disciplinary_actions"
    ADD CONSTRAINT "disciplinary_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."employee_benefit_assignments"
    ADD CONSTRAINT "employee_benefit_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."employee_correction_permissions"
    ADD CONSTRAINT "employee_correction_permissions_employee_id_mes_ano_key" UNIQUE ("employee_id", "mes_ano");



ALTER TABLE ONLY "rh"."employee_correction_permissions"
    ADD CONSTRAINT "employee_correction_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."employee_deductions"
    ADD CONSTRAINT "employee_deductions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."employee_location_zones"
    ADD CONSTRAINT "employee_location_zones_employee_id_location_zone_id_key" UNIQUE ("employee_id", "location_zone_id");



ALTER TABLE ONLY "rh"."employee_location_zones"
    ADD CONSTRAINT "employee_location_zones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."employee_medical_plans"
    ADD CONSTRAINT "employee_medical_plans_employee_id_plan_id_data_inicio_key" UNIQUE ("employee_id", "plan_id", "data_inicio");



ALTER TABLE ONLY "rh"."employee_medical_plans"
    ADD CONSTRAINT "employee_medical_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."employee_plan_dependents"
    ADD CONSTRAINT "employee_plan_dependents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."employee_schedules"
    ADD CONSTRAINT "employee_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."employee_shifts"
    ADD CONSTRAINT "employee_shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."employee_union_memberships"
    ADD CONSTRAINT "employee_union_memberships_employee_id_union_id_data_filiac_key" UNIQUE ("employee_id", "union_id", "data_filiacao");



ALTER TABLE ONLY "rh"."employee_union_memberships"
    ADD CONSTRAINT "employee_union_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."employees"
    ADD CONSTRAINT "employees_company_id_cpf_unique" UNIQUE ("company_id", "cpf");



COMMENT ON CONSTRAINT "employees_company_id_cpf_unique" ON "rh"."employees" IS 'Permite que o mesmo CPF seja cadastrado em empresas diferentes, mas impede CPF duplicado na mesma empresa';



ALTER TABLE ONLY "rh"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."employment_contracts"
    ADD CONSTRAINT "employment_contracts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."equipment_rental_approvals"
    ADD CONSTRAINT "equipment_rental_approvals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."equipment_rental_monthly_payments"
    ADD CONSTRAINT "equipment_rental_monthly_paym_equipment_rental_approval_id__key" UNIQUE ("equipment_rental_approval_id", "month_reference", "year_reference");



ALTER TABLE ONLY "rh"."equipment_rental_monthly_payments"
    ADD CONSTRAINT "equipment_rental_monthly_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."esocial_batches"
    ADD CONSTRAINT "esocial_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."esocial_config"
    ADD CONSTRAINT "esocial_config_company_id_key" UNIQUE ("company_id");



ALTER TABLE ONLY "rh"."esocial_config"
    ADD CONSTRAINT "esocial_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."esocial_events"
    ADD CONSTRAINT "esocial_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."esocial_integrations"
    ADD CONSTRAINT "esocial_integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."esocial_logs"
    ADD CONSTRAINT "esocial_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."fgts_config"
    ADD CONSTRAINT "fgts_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."financial_integration_config"
    ADD CONSTRAINT "financial_integration_config_company_id_unique" UNIQUE ("company_id");



ALTER TABLE ONLY "rh"."financial_integration_config"
    ADD CONSTRAINT "financial_integration_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."flash_integration_config"
    ADD CONSTRAINT "flash_integration_config_company_unique" UNIQUE ("company_id");



ALTER TABLE ONLY "rh"."flash_integration_config"
    ADD CONSTRAINT "flash_integration_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."gestor_notifications"
    ADD CONSTRAINT "gestor_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."holidays"
    ADD CONSTRAINT "holidays_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."income_statements"
    ADD CONSTRAINT "income_statements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."inss_brackets"
    ADD CONSTRAINT "inss_brackets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."irrf_brackets"
    ADD CONSTRAINT "irrf_brackets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."job_openings"
    ADD CONSTRAINT "job_openings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."job_requests"
    ADD CONSTRAINT "job_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."location_zones"
    ADD CONSTRAINT "location_zones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."medical_agreements"
    ADD CONSTRAINT "medical_agreements_company_id_nome_key" UNIQUE ("company_id", "nome");



ALTER TABLE ONLY "rh"."medical_agreements"
    ADD CONSTRAINT "medical_agreements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."medical_certificate_attachments"
    ADD CONSTRAINT "medical_certificate_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."medical_certificates"
    ADD CONSTRAINT "medical_certificates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."medical_plan_age_ranges"
    ADD CONSTRAINT "medical_plan_age_ranges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."medical_plan_pricing_history"
    ADD CONSTRAINT "medical_plan_pricing_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."medical_plans"
    ADD CONSTRAINT "medical_plans_agreement_id_nome_key" UNIQUE ("agreement_id", "nome");



ALTER TABLE ONLY "rh"."medical_plans"
    ADD CONSTRAINT "medical_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."medical_services_usage"
    ADD CONSTRAINT "medical_services_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."monthly_benefit_processing"
    ADD CONSTRAINT "monthly_benefit_processing_employee_id_benefit_config_id_mo_key" UNIQUE ("employee_id", "benefit_config_id", "month_reference", "year_reference");



ALTER TABLE ONLY "rh"."monthly_benefit_processing"
    ADD CONSTRAINT "monthly_benefit_processing_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."payroll_config"
    ADD CONSTRAINT "payroll_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."payroll_config"
    ADD CONSTRAINT "payroll_config_unique_company_period" UNIQUE ("company_id", "ano_vigencia", "mes_vigencia");



ALTER TABLE ONLY "rh"."payroll"
    ADD CONSTRAINT "payroll_employee_id_mes_referencia_ano_referencia_key" UNIQUE ("employee_id", "mes_referencia", "ano_referencia");



ALTER TABLE ONLY "rh"."payroll_events"
    ADD CONSTRAINT "payroll_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."payroll_overtime_events"
    ADD CONSTRAINT "payroll_overtime_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."payroll"
    ADD CONSTRAINT "payroll_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."periodic_exams"
    ADD CONSTRAINT "periodic_exams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."positions"
    ADD CONSTRAINT "positions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."reimbursement_requests"
    ADD CONSTRAINT "reimbursement_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."rubricas"
    ADD CONSTRAINT "rubricas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."selection_processes"
    ADD CONSTRAINT "selection_processes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."selection_stages"
    ADD CONSTRAINT "selection_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."signature_month_control"
    ADD CONSTRAINT "signature_month_control_company_id_month_year_key" UNIQUE ("company_id", "month_year");



ALTER TABLE ONLY "rh"."signature_month_control"
    ADD CONSTRAINT "signature_month_control_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."signature_notifications"
    ADD CONSTRAINT "signature_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."sobreaviso_escalas"
    ADD CONSTRAINT "sobreaviso_escalas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."talent_pool"
    ADD CONSTRAINT "talent_pool_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."time_bank"
    ADD CONSTRAINT "time_bank_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."time_record_event_photos"
    ADD CONSTRAINT "time_record_event_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."time_record_events"
    ADD CONSTRAINT "time_record_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."time_record_settings"
    ADD CONSTRAINT "time_record_settings_company_unique" UNIQUE ("company_id");



ALTER TABLE ONLY "rh"."time_record_settings"
    ADD CONSTRAINT "time_record_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."time_record_signature_config"
    ADD CONSTRAINT "time_record_signature_config_company_id_key" UNIQUE ("company_id");



ALTER TABLE ONLY "rh"."time_record_signature_config"
    ADD CONSTRAINT "time_record_signature_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."time_record_signatures"
    ADD CONSTRAINT "time_record_signatures_employee_id_month_year_key" UNIQUE ("employee_id", "month_year");



ALTER TABLE ONLY "rh"."time_record_signatures"
    ADD CONSTRAINT "time_record_signatures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."time_records"
    ADD CONSTRAINT "time_records_employee_id_data_registro_key" UNIQUE ("employee_id", "data_registro");



ALTER TABLE ONLY "rh"."time_records"
    ADD CONSTRAINT "time_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_application_evaluations"
    ADD CONSTRAINT "training_application_evaluations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_assignments"
    ADD CONSTRAINT "training_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_attendance"
    ADD CONSTRAINT "training_attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_attendance"
    ADD CONSTRAINT "training_attendance_training_id_employee_id_data_treinament_key" UNIQUE ("training_id", "employee_id", "data_treinamento");



ALTER TABLE ONLY "rh"."training_certificates"
    ADD CONSTRAINT "training_certificates_numero_certificado_key" UNIQUE ("numero_certificado");



ALTER TABLE ONLY "rh"."training_certificates"
    ADD CONSTRAINT "training_certificates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_certificates"
    ADD CONSTRAINT "training_certificates_training_id_employee_id_key" UNIQUE ("training_id", "employee_id");



ALTER TABLE ONLY "rh"."training_content"
    ADD CONSTRAINT "training_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_enrollments"
    ADD CONSTRAINT "training_enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_enrollments"
    ADD CONSTRAINT "training_enrollments_training_id_employee_id_key" UNIQUE ("training_id", "employee_id");



ALTER TABLE ONLY "rh"."training_evaluations"
    ADD CONSTRAINT "training_evaluations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_evaluations"
    ADD CONSTRAINT "training_evaluations_training_id_employee_id_key" UNIQUE ("training_id", "employee_id");



ALTER TABLE ONLY "rh"."training_exam_alternatives"
    ADD CONSTRAINT "training_exam_alternatives_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_exam_answers"
    ADD CONSTRAINT "training_exam_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_exam_attempts"
    ADD CONSTRAINT "training_exam_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_exam_questions"
    ADD CONSTRAINT "training_exam_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_exams"
    ADD CONSTRAINT "training_exams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_notification_history"
    ADD CONSTRAINT "training_notification_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_notification_queue"
    ADD CONSTRAINT "training_notification_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_notification_rules"
    ADD CONSTRAINT "training_notification_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_notification_types"
    ADD CONSTRAINT "training_notification_types_company_id_tipo_key" UNIQUE ("company_id", "tipo");



ALTER TABLE ONLY "rh"."training_notification_types"
    ADD CONSTRAINT "training_notification_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_progress"
    ADD CONSTRAINT "training_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_progress"
    ADD CONSTRAINT "training_progress_training_id_employee_id_content_id_key" UNIQUE ("training_id", "employee_id", "content_id");



ALTER TABLE ONLY "rh"."training_reaction_evaluations"
    ADD CONSTRAINT "training_reaction_evaluations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."training_reaction_evaluations"
    ADD CONSTRAINT "training_reaction_evaluations_training_id_employee_id_key" UNIQUE ("training_id", "employee_id");



ALTER TABLE ONLY "rh"."training_settings"
    ADD CONSTRAINT "training_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."trainings"
    ADD CONSTRAINT "trainings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."union_contributions"
    ADD CONSTRAINT "union_contributions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."union_negotiations"
    ADD CONSTRAINT "union_negotiations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."union_representatives"
    ADD CONSTRAINT "union_representatives_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."unions"
    ADD CONSTRAINT "unions_company_id_nome_key" UNIQUE ("company_id", "nome");



ALTER TABLE ONLY "rh"."unions"
    ADD CONSTRAINT "unions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."absence_types"
    ADD CONSTRAINT "unique_absence_type_codigo_company" UNIQUE ("codigo", "company_id");



ALTER TABLE ONLY "rh"."allowance_types"
    ADD CONSTRAINT "unique_allowance_type_codigo_company" UNIQUE ("codigo", "company_id");



ALTER TABLE ONLY "rh"."cid_codes"
    ADD CONSTRAINT "unique_cid_code_company" UNIQUE ("codigo", "company_id");



ALTER TABLE ONLY "rh"."deficiency_types"
    ADD CONSTRAINT "unique_deficiency_type_codigo_company" UNIQUE ("codigo", "company_id");



ALTER TABLE ONLY "rh"."delay_reasons"
    ADD CONSTRAINT "unique_delay_reason_codigo_company" UNIQUE ("codigo", "company_id");



ALTER TABLE ONLY "rh"."vacation_entitlements"
    ADD CONSTRAINT "unique_employee_year_entitlement" UNIQUE ("employee_id", "ano_aquisitivo");



ALTER TABLE ONLY "rh"."inss_brackets"
    ADD CONSTRAINT "unique_inss_bracket_company_ano_mes_codigo" UNIQUE ("codigo", "company_id", "ano_vigencia", "mes_vigencia");



ALTER TABLE ONLY "rh"."irrf_brackets"
    ADD CONSTRAINT "unique_irrf_bracket_company_ano_mes_codigo" UNIQUE ("codigo", "company_id", "ano_vigencia", "mes_vigencia");



ALTER TABLE ONLY "rh"."medical_plan_age_ranges"
    ADD CONSTRAINT "unique_plan_age_range" UNIQUE ("plan_id", "idade_min", "idade_max");



ALTER TABLE ONLY "rh"."rubricas"
    ADD CONSTRAINT "unique_rubrica_codigo_company" UNIQUE ("codigo", "company_id");



ALTER TABLE ONLY "rh"."units"
    ADD CONSTRAINT "units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."vacation_entitlements"
    ADD CONSTRAINT "vacation_entitlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."vacation_periods"
    ADD CONSTRAINT "vacation_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."vacations"
    ADD CONSTRAINT "vacations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."work_schedules"
    ADD CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "rh"."work_shifts"
    ADD CONSTRAINT "work_shifts_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "rh"."work_shifts"
    ADD CONSTRAINT "work_shifts_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "holidays_unique_estadual" ON "rh"."holidays" USING "btree" ("company_id", "data", "nome", "uf") WHERE ((("tipo")::"text" = 'estadual'::"text") AND ("uf" IS NOT NULL));



CREATE UNIQUE INDEX "holidays_unique_municipal" ON "rh"."holidays" USING "btree" ("company_id", "data", "nome", "uf", "municipio") WHERE ((("tipo")::"text" = 'municipal'::"text") AND ("uf" IS NOT NULL) AND ("municipio" IS NOT NULL));



CREATE UNIQUE INDEX "holidays_unique_nacional" ON "rh"."holidays" USING "btree" ("company_id", "data", "nome") WHERE ((("tipo")::"text" = 'nacional'::"text") AND (("uf" IS NULL) AND ("municipio" IS NULL)));



CREATE UNIQUE INDEX "holidays_unique_outros" ON "rh"."holidays" USING "btree" ("company_id", "data", "nome") WHERE (("tipo")::"text" = ANY ((ARRAY['pontos_facultativos'::character varying, 'outros'::character varying])::"text"[]));



CREATE INDEX "idx_absence_types_ativo" ON "rh"."absence_types" USING "btree" ("ativo");



CREATE INDEX "idx_absence_types_codigo" ON "rh"."absence_types" USING "btree" ("codigo");



CREATE INDEX "idx_absence_types_company_id" ON "rh"."absence_types" USING "btree" ("company_id");



CREATE INDEX "idx_absence_types_tipo" ON "rh"."absence_types" USING "btree" ("tipo");



CREATE INDEX "idx_allowance_types_ativo" ON "rh"."allowance_types" USING "btree" ("ativo");



CREATE INDEX "idx_allowance_types_codigo" ON "rh"."allowance_types" USING "btree" ("codigo");



CREATE INDEX "idx_allowance_types_company_id" ON "rh"."allowance_types" USING "btree" ("company_id");



CREATE INDEX "idx_allowance_types_tipo" ON "rh"."allowance_types" USING "btree" ("tipo");



CREATE INDEX "idx_approval_level_approvers_level_id" ON "rh"."approval_level_approvers" USING "btree" ("approval_level_id");



CREATE INDEX "idx_approval_level_approvers_user_id" ON "rh"."approval_level_approvers" USING "btree" ("user_id");



CREATE INDEX "idx_approval_levels_company_id" ON "rh"."approval_levels" USING "btree" ("company_id");



CREATE INDEX "idx_approval_levels_order" ON "rh"."approval_levels" USING "btree" ("company_id", "level_order");



CREATE INDEX "idx_audit_logs_action" ON "rh"."audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_company_entity" ON "rh"."audit_logs" USING "btree" ("company_id", "entity_type");



CREATE INDEX "idx_audit_logs_company_id" ON "rh"."audit_logs" USING "btree" ("company_id");



CREATE INDEX "idx_audit_logs_created_at" ON "rh"."audit_logs" USING "btree" ("created_at");



CREATE INDEX "idx_audit_logs_entity" ON "rh"."audit_logs" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_audit_logs_user_id" ON "rh"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_awards_productivity_accounts_payable_id" ON "rh"."awards_productivity" USING "btree" ("accounts_payable_id");



CREATE INDEX "idx_awards_productivity_flash_payment_id" ON "rh"."awards_productivity" USING "btree" ("flash_payment_id");



CREATE INDEX "idx_bank_hours_assignments_active" ON "rh"."bank_hours_assignments" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_bank_hours_assignments_company" ON "rh"."bank_hours_assignments" USING "btree" ("company_id");



CREATE INDEX "idx_bank_hours_assignments_employee" ON "rh"."bank_hours_assignments" USING "btree" ("employee_id");



CREATE INDEX "idx_bank_hours_assignments_type" ON "rh"."bank_hours_assignments" USING "btree" ("bank_hours_type_id");



CREATE INDEX "idx_bank_hours_balance_calculation_date" ON "rh"."bank_hours_balance" USING "btree" ("last_calculation_date");



CREATE INDEX "idx_bank_hours_balance_company" ON "rh"."bank_hours_balance" USING "btree" ("company_id");



CREATE INDEX "idx_bank_hours_balance_employee" ON "rh"."bank_hours_balance" USING "btree" ("employee_id");



CREATE INDEX "idx_bank_hours_calculations_company" ON "rh"."bank_hours_calculations" USING "btree" ("company_id");



CREATE INDEX "idx_bank_hours_calculations_date" ON "rh"."bank_hours_calculations" USING "btree" ("calculation_date");



CREATE INDEX "idx_bank_hours_calculations_status" ON "rh"."bank_hours_calculations" USING "btree" ("status");



CREATE INDEX "idx_bank_hours_closure_company" ON "rh"."bank_hours_closure" USING "btree" ("company_id");



CREATE INDEX "idx_bank_hours_closure_date" ON "rh"."bank_hours_closure" USING "btree" ("closure_date");



CREATE INDEX "idx_bank_hours_closure_employee" ON "rh"."bank_hours_closure" USING "btree" ("employee_id");



CREATE INDEX "idx_bank_hours_closure_status" ON "rh"."bank_hours_closure" USING "btree" ("status");



CREATE INDEX "idx_bank_hours_config_active" ON "rh"."bank_hours_config" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_bank_hours_config_company" ON "rh"."bank_hours_config" USING "btree" ("company_id");



CREATE INDEX "idx_bank_hours_config_employee" ON "rh"."bank_hours_config" USING "btree" ("employee_id");



CREATE INDEX "idx_bank_hours_legacy_company" ON "rh"."bank_hours_legacy_imports" USING "btree" ("company_id");



CREATE INDEX "idx_bank_hours_legacy_employee" ON "rh"."bank_hours_legacy_imports" USING "btree" ("employee_id");



CREATE INDEX "idx_bank_hours_legacy_reference_date" ON "rh"."bank_hours_legacy_imports" USING "btree" ("reference_date");



CREATE INDEX "idx_bank_hours_transactions_closure_id" ON "rh"."bank_hours_transactions" USING "btree" ("closure_id") WHERE ("closure_id" IS NOT NULL);



CREATE INDEX "idx_bank_hours_transactions_company" ON "rh"."bank_hours_transactions" USING "btree" ("company_id");



CREATE INDEX "idx_bank_hours_transactions_date" ON "rh"."bank_hours_transactions" USING "btree" ("transaction_date");



CREATE INDEX "idx_bank_hours_transactions_employee" ON "rh"."bank_hours_transactions" USING "btree" ("employee_id");



CREATE INDEX "idx_bank_hours_transactions_expires_at" ON "rh"."bank_hours_transactions" USING "btree" ("expires_at") WHERE ("expires_at" IS NOT NULL);



CREATE INDEX "idx_bank_hours_transactions_is_paid" ON "rh"."bank_hours_transactions" USING "btree" ("is_paid") WHERE ("is_paid" = false);



CREATE INDEX "idx_bank_hours_transactions_time_record" ON "rh"."bank_hours_transactions" USING "btree" ("time_record_id");



CREATE INDEX "idx_bank_hours_transactions_type" ON "rh"."bank_hours_transactions" USING "btree" ("transaction_type");



CREATE INDEX "idx_bank_hours_types_active" ON "rh"."bank_hours_types" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_bank_hours_types_code" ON "rh"."bank_hours_types" USING "btree" ("code");



CREATE INDEX "idx_bank_hours_types_company" ON "rh"."bank_hours_types" USING "btree" ("company_id");



CREATE INDEX "idx_bank_hours_types_default" ON "rh"."bank_hours_types" USING "btree" ("is_default") WHERE ("is_default" = true);



CREATE INDEX "idx_benefit_configurations_classe_financeira_id" ON "rh"."benefit_configurations" USING "btree" ("classe_financeira_id");



CREATE INDEX "idx_benefit_configurations_entra_no_calculo_folha" ON "rh"."benefit_configurations" USING "btree" ("entra_no_calculo_folha");



CREATE INDEX "idx_benefit_processing_company_id" ON "rh"."monthly_benefit_processing" USING "btree" ("company_id");



CREATE INDEX "idx_benefit_processing_employee_id" ON "rh"."monthly_benefit_processing" USING "btree" ("employee_id");



CREATE INDEX "idx_benefit_processing_reference" ON "rh"."monthly_benefit_processing" USING "btree" ("month_reference", "year_reference");



CREATE INDEX "idx_calculation_logs_company_id" ON "rh"."calculation_logs" USING "btree" ("company_id");



CREATE INDEX "idx_calculation_logs_created_at" ON "rh"."calculation_logs" USING "btree" ("created_at");



CREATE INDEX "idx_calculation_logs_periodo" ON "rh"."calculation_logs" USING "btree" ("ano_referencia", "mes_referencia");



CREATE INDEX "idx_calculation_logs_processo_id" ON "rh"."calculation_logs" USING "btree" ("processo_id");



CREATE INDEX "idx_calculation_logs_status" ON "rh"."calculation_logs" USING "btree" ("status");



CREATE INDEX "idx_calculation_logs_tipo" ON "rh"."calculation_logs" USING "btree" ("tipo_processo");



CREATE INDEX "idx_cid_codes_ativo" ON "rh"."cid_codes" USING "btree" ("ativo");



CREATE INDEX "idx_cid_codes_categoria" ON "rh"."cid_codes" USING "btree" ("categoria");



CREATE INDEX "idx_cid_codes_codigo" ON "rh"."cid_codes" USING "btree" ("codigo");



CREATE INDEX "idx_cid_codes_company_id" ON "rh"."cid_codes" USING "btree" ("company_id");



CREATE INDEX "idx_cid_codes_descricao" ON "rh"."cid_codes" USING "gin" ("to_tsvector"('"portuguese"'::"regconfig", ("descricao")::"text"));



CREATE INDEX "idx_collective_agreements_company_id" ON "rh"."collective_agreements" USING "btree" ("company_id");



CREATE INDEX "idx_collective_agreements_data_vigencia_inicio" ON "rh"."collective_agreements" USING "btree" ("data_vigencia_inicio");



CREATE INDEX "idx_collective_agreements_status" ON "rh"."collective_agreements" USING "btree" ("status");



CREATE INDEX "idx_collective_agreements_tipo_documento" ON "rh"."collective_agreements" USING "btree" ("tipo_documento");



CREATE INDEX "idx_collective_agreements_union_id" ON "rh"."collective_agreements" USING "btree" ("union_id");



CREATE INDEX "idx_compensation_approvals_approver_id" ON "rh"."compensation_approvals" USING "btree" ("approver_id");



CREATE INDEX "idx_compensation_approvals_request_id" ON "rh"."compensation_approvals" USING "btree" ("compensation_request_id");



CREATE INDEX "idx_compensation_requests_aprovado_por" ON "rh"."compensation_requests" USING "btree" ("aprovado_por");



CREATE INDEX "idx_compensation_requests_company_id" ON "rh"."compensation_requests" USING "btree" ("company_id");



CREATE INDEX "idx_compensation_requests_data_compensacao" ON "rh"."compensation_requests" USING "btree" ("data_inicio");



CREATE INDEX "idx_compensation_requests_data_fim" ON "rh"."compensation_requests" USING "btree" ("data_fim");



CREATE INDEX "idx_compensation_requests_data_inicio" ON "rh"."compensation_requests" USING "btree" ("data_inicio");



CREATE INDEX "idx_compensation_requests_employee_id" ON "rh"."compensation_requests" USING "btree" ("employee_id");



CREATE INDEX "idx_compensation_requests_funcionario_id" ON "rh"."compensation_requests" USING "btree" ("employee_id");



CREATE INDEX "idx_compensation_requests_status" ON "rh"."compensation_requests" USING "btree" ("status");



CREATE INDEX "idx_correction_history_changed_at" ON "rh"."correction_history" USING "btree" ("changed_at");



CREATE INDEX "idx_correction_history_correction_id" ON "rh"."correction_history" USING "btree" ("correction_id");



CREATE INDEX "idx_correction_settings_company_id" ON "rh"."correction_settings" USING "btree" ("company_id");



CREATE INDEX "idx_deficiency_types_ativo" ON "rh"."deficiency_types" USING "btree" ("ativo");



CREATE INDEX "idx_deficiency_types_codigo" ON "rh"."deficiency_types" USING "btree" ("codigo");



CREATE INDEX "idx_deficiency_types_company_id" ON "rh"."deficiency_types" USING "btree" ("company_id");



CREATE INDEX "idx_deficiency_types_grau" ON "rh"."deficiency_types" USING "btree" ("grau");



CREATE INDEX "idx_deficiency_types_tipo" ON "rh"."deficiency_types" USING "btree" ("tipo");



CREATE INDEX "idx_delay_reasons_ativo" ON "rh"."delay_reasons" USING "btree" ("ativo");



CREATE INDEX "idx_delay_reasons_codigo" ON "rh"."delay_reasons" USING "btree" ("codigo");



CREATE INDEX "idx_delay_reasons_company_id" ON "rh"."delay_reasons" USING "btree" ("company_id");



CREATE INDEX "idx_delay_reasons_tipo" ON "rh"."delay_reasons" USING "btree" ("tipo");



CREATE INDEX "idx_dependents_company_id" ON "rh"."dependents" USING "btree" ("company_id");



CREATE INDEX "idx_dependents_cpf" ON "rh"."dependents" USING "btree" ("cpf");



CREATE INDEX "idx_dependents_data_nascimento" ON "rh"."dependents" USING "btree" ("data_nascimento");



CREATE INDEX "idx_dependents_employee_id" ON "rh"."dependents" USING "btree" ("employee_id");



CREATE INDEX "idx_dependents_parentesco" ON "rh"."dependents" USING "btree" ("parentesco");



CREATE INDEX "idx_dependents_status" ON "rh"."dependents" USING "btree" ("status");



CREATE INDEX "idx_disciplinary_actions_active" ON "rh"."disciplinary_actions" USING "btree" ("company_id", "is_active", "created_at" DESC) WHERE ("is_active" = true);



CREATE INDEX "idx_disciplinary_actions_company_id" ON "rh"."disciplinary_actions" USING "btree" ("company_id");



CREATE INDEX "idx_disciplinary_actions_data_aplicacao" ON "rh"."disciplinary_actions" USING "btree" ("data_aplicacao");



CREATE INDEX "idx_disciplinary_actions_data_ocorrencia" ON "rh"."disciplinary_actions" USING "btree" ("data_ocorrencia");



CREATE INDEX "idx_disciplinary_actions_duration_days" ON "rh"."disciplinary_actions" USING "btree" ("duration_days");



CREATE INDEX "idx_disciplinary_actions_employee_date" ON "rh"."disciplinary_actions" USING "btree" ("employee_id", "created_at" DESC);



CREATE INDEX "idx_disciplinary_actions_employee_id" ON "rh"."disciplinary_actions" USING "btree" ("employee_id");



CREATE INDEX "idx_disciplinary_actions_end_date" ON "rh"."disciplinary_actions" USING "btree" ("end_date");



CREATE INDEX "idx_disciplinary_actions_gravidade" ON "rh"."disciplinary_actions" USING "btree" ("gravidade");



CREATE INDEX "idx_disciplinary_actions_is_active" ON "rh"."disciplinary_actions" USING "btree" ("is_active");



CREATE INDEX "idx_disciplinary_actions_start_date" ON "rh"."disciplinary_actions" USING "btree" ("start_date");



CREATE INDEX "idx_disciplinary_actions_status" ON "rh"."disciplinary_actions" USING "btree" ("status");



CREATE INDEX "idx_disciplinary_actions_tipo_acao" ON "rh"."disciplinary_actions" USING "btree" ("tipo_acao");



CREATE INDEX "idx_employee_correction_permissions_company_id" ON "rh"."employee_correction_permissions" USING "btree" ("company_id");



CREATE INDEX "idx_employee_correction_permissions_employee_id" ON "rh"."employee_correction_permissions" USING "btree" ("employee_id");



CREATE INDEX "idx_employee_correction_permissions_liberado" ON "rh"."employee_correction_permissions" USING "btree" ("liberado");



CREATE INDEX "idx_employee_correction_permissions_mes_ano" ON "rh"."employee_correction_permissions" USING "btree" ("mes_ano");



CREATE INDEX "idx_employee_deductions_company_id" ON "rh"."employee_deductions" USING "btree" ("company_id");



CREATE INDEX "idx_employee_deductions_data_origem" ON "rh"."employee_deductions" USING "btree" ("data_origem");



CREATE INDEX "idx_employee_deductions_employee_id" ON "rh"."employee_deductions" USING "btree" ("employee_id");



CREATE INDEX "idx_employee_deductions_folha_ref" ON "rh"."employee_deductions" USING "btree" ("mes_referencia_folha", "ano_referencia_folha");



CREATE INDEX "idx_employee_deductions_medical_service" ON "rh"."employee_deductions" USING "btree" ("medical_service_usage_id");



CREATE INDEX "idx_employee_deductions_status" ON "rh"."employee_deductions" USING "btree" ("status");



CREATE INDEX "idx_employee_deductions_tipo_deducao" ON "rh"."employee_deductions" USING "btree" ("tipo_deducao");



CREATE INDEX "idx_employee_location_zones_employee_id" ON "rh"."employee_location_zones" USING "btree" ("employee_id");



CREATE INDEX "idx_employee_location_zones_location_zone_id" ON "rh"."employee_location_zones" USING "btree" ("location_zone_id");



CREATE INDEX "idx_employee_medical_plans_company_id" ON "rh"."employee_medical_plans" USING "btree" ("company_id");



CREATE INDEX "idx_employee_medical_plans_employee_id" ON "rh"."employee_medical_plans" USING "btree" ("employee_id");



CREATE INDEX "idx_employee_medical_plans_entra_no_calculo_folha" ON "rh"."employee_medical_plans" USING "btree" ("entra_no_calculo_folha");



CREATE INDEX "idx_employee_medical_plans_plan_id" ON "rh"."employee_medical_plans" USING "btree" ("plan_id");



CREATE INDEX "idx_employee_medical_plans_status" ON "rh"."employee_medical_plans" USING "btree" ("status");



CREATE INDEX "idx_employee_medical_plans_status_ativo" ON "rh"."employee_medical_plans" USING "btree" ("status") WHERE (("status")::"text" = 'ativo'::"text");



CREATE INDEX "idx_employee_plan_dependents_company_id" ON "rh"."employee_plan_dependents" USING "btree" ("company_id");



CREATE INDEX "idx_employee_plan_dependents_employee_plan_id" ON "rh"."employee_plan_dependents" USING "btree" ("employee_plan_id");



CREATE INDEX "idx_employee_plan_dependents_status" ON "rh"."employee_plan_dependents" USING "btree" ("status");



CREATE INDEX "idx_employee_shifts_ativo" ON "rh"."employee_shifts" USING "btree" ("ativo");



CREATE INDEX "idx_employee_shifts_company_id" ON "rh"."employee_shifts" USING "btree" ("company_id");



CREATE INDEX "idx_employee_shifts_data_inicio" ON "rh"."employee_shifts" USING "btree" ("data_inicio");



CREATE INDEX "idx_employee_shifts_funcionario_id" ON "rh"."employee_shifts" USING "btree" ("funcionario_id");



CREATE INDEX "idx_employee_shifts_turno_id" ON "rh"."employee_shifts" USING "btree" ("turno_id");



CREATE INDEX "idx_employee_union_memberships_company_id" ON "rh"."employee_union_memberships" USING "btree" ("company_id");



CREATE INDEX "idx_employee_union_memberships_employee_id" ON "rh"."employee_union_memberships" USING "btree" ("employee_id");



CREATE INDEX "idx_employee_union_memberships_status" ON "rh"."employee_union_memberships" USING "btree" ("status");



CREATE INDEX "idx_employee_union_memberships_union_id" ON "rh"."employee_union_memberships" USING "btree" ("union_id");



CREATE INDEX "idx_employees_active" ON "rh"."employees" USING "btree" ("company_id", "status") WHERE (("status")::"text" = 'ativo'::"text");



CREATE INDEX "idx_employees_cargo_id" ON "rh"."employees" USING "btree" ("cargo_id");



CREATE INDEX "idx_employees_company_id" ON "rh"."employees" USING "btree" ("company_id");



CREATE INDEX "idx_employees_company_status" ON "rh"."employees" USING "btree" ("company_id", "status", "created_at" DESC);



CREATE INDEX "idx_employees_cost_center_id" ON "rh"."employees" USING "btree" ("cost_center_id");



CREATE INDEX "idx_employees_cpf" ON "rh"."employees" USING "btree" ("cpf");



CREATE INDEX "idx_employees_created_at_id" ON "rh"."employees" USING "btree" ("created_at" DESC, "id" DESC);



CREATE INDEX "idx_employees_deficiencia_tipo_id" ON "rh"."employees" USING "btree" ("deficiencia_tipo_id");



CREATE INDEX "idx_employees_escolaridade" ON "rh"."employees" USING "btree" ("escolaridade");



CREATE INDEX "idx_employees_outros_vinculos" ON "rh"."employees" USING "btree" ("outros_vinculos_empregaticios");



CREATE INDEX "idx_employees_possui_deficiencia" ON "rh"."employees" USING "btree" ("possui_deficiencia");



CREATE INDEX "idx_employees_requer_registro_ponto" ON "rh"."employees" USING "btree" ("requer_registro_ponto") WHERE ("requer_registro_ponto" = false);



CREATE INDEX "idx_employees_search" ON "rh"."employees" USING "btree" ("company_id", "matricula", "cpf");



CREATE INDEX "idx_employees_sexo" ON "rh"."employees" USING "btree" ("sexo");



CREATE INDEX "idx_employees_status" ON "rh"."employees" USING "btree" ("status");



CREATE INDEX "idx_employees_tipo_cnh" ON "rh"."employees" USING "btree" ("tipo_cnh");



CREATE INDEX "idx_employees_tipo_contrato_trabalho" ON "rh"."employees" USING "btree" ("tipo_contrato_trabalho");



CREATE INDEX "idx_employees_user_id" ON "rh"."employees" USING "btree" ("user_id");



CREATE INDEX "idx_employees_work_shift_id" ON "rh"."employees" USING "btree" ("work_shift_id");



CREATE INDEX "idx_employment_contracts_company_id" ON "rh"."employment_contracts" USING "btree" ("company_id");



CREATE INDEX "idx_employment_contracts_data_inicio" ON "rh"."employment_contracts" USING "btree" ("data_inicio");



CREATE INDEX "idx_employment_contracts_employee_id" ON "rh"."employment_contracts" USING "btree" ("employee_id");



CREATE INDEX "idx_employment_contracts_numero" ON "rh"."employment_contracts" USING "btree" ("numero_contrato");



CREATE INDEX "idx_employment_contracts_status" ON "rh"."employment_contracts" USING "btree" ("status");



CREATE INDEX "idx_employment_contracts_tipo" ON "rh"."employment_contracts" USING "btree" ("tipo_contrato");



CREATE INDEX "idx_equipment_rental_monthly_payments_approval_id" ON "rh"."equipment_rental_monthly_payments" USING "btree" ("equipment_rental_approval_id");



CREATE INDEX "idx_equipment_rental_monthly_payments_classe_financeira_id" ON "rh"."equipment_rental_monthly_payments" USING "btree" ("classe_financeira_id");



CREATE INDEX "idx_equipment_rental_monthly_payments_company_id" ON "rh"."equipment_rental_monthly_payments" USING "btree" ("company_id");



CREATE INDEX "idx_equipment_rental_monthly_payments_cost_center_id" ON "rh"."equipment_rental_monthly_payments" USING "btree" ("cost_center_id");



CREATE INDEX "idx_equipment_rental_monthly_payments_created_at" ON "rh"."equipment_rental_monthly_payments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_equipment_rental_monthly_payments_employee_id" ON "rh"."equipment_rental_monthly_payments" USING "btree" ("employee_id");



CREATE INDEX "idx_equipment_rental_monthly_payments_reference" ON "rh"."equipment_rental_monthly_payments" USING "btree" ("month_reference", "year_reference");



CREATE INDEX "idx_equipment_rental_monthly_payments_status" ON "rh"."equipment_rental_monthly_payments" USING "btree" ("status");



CREATE INDEX "idx_esocial_batches_batch_number" ON "rh"."esocial_batches" USING "btree" ("batch_number");



CREATE INDEX "idx_esocial_batches_company_id" ON "rh"."esocial_batches" USING "btree" ("company_id");



CREATE INDEX "idx_esocial_batches_period" ON "rh"."esocial_batches" USING "btree" ("period");



CREATE INDEX "idx_esocial_batches_status" ON "rh"."esocial_batches" USING "btree" ("status");



CREATE INDEX "idx_esocial_config_ambiente" ON "rh"."esocial_config" USING "btree" ("ambiente");



CREATE INDEX "idx_esocial_config_ativo" ON "rh"."esocial_config" USING "btree" ("ativo");



CREATE INDEX "idx_esocial_config_company_id" ON "rh"."esocial_config" USING "btree" ("company_id");



CREATE INDEX "idx_esocial_events_company_id" ON "rh"."esocial_events" USING "btree" ("company_id");



CREATE INDEX "idx_esocial_events_data_envio" ON "rh"."esocial_events" USING "btree" ("data_envio");



CREATE INDEX "idx_esocial_events_employee_id" ON "rh"."esocial_events" USING "btree" ("employee_id");



CREATE INDEX "idx_esocial_events_numero_recibo" ON "rh"."esocial_events" USING "btree" ("numero_recibo");



CREATE INDEX "idx_esocial_events_status" ON "rh"."esocial_events" USING "btree" ("status");



CREATE INDEX "idx_esocial_events_tipo_evento" ON "rh"."esocial_events" USING "btree" ("tipo_evento");



CREATE INDEX "idx_esocial_integrations_company_id" ON "rh"."esocial_integrations" USING "btree" ("company_id");



CREATE INDEX "idx_esocial_integrations_funcionario_id" ON "rh"."esocial_integrations" USING "btree" ("funcionario_id");



CREATE INDEX "idx_esocial_integrations_protocolo" ON "rh"."esocial_integrations" USING "btree" ("protocolo");



CREATE INDEX "idx_esocial_integrations_status" ON "rh"."esocial_integrations" USING "btree" ("status");



CREATE INDEX "idx_esocial_integrations_tipo_evento" ON "rh"."esocial_integrations" USING "btree" ("tipo_evento");



CREATE INDEX "idx_esocial_logs_company_id" ON "rh"."esocial_logs" USING "btree" ("company_id");



CREATE INDEX "idx_esocial_logs_created_at" ON "rh"."esocial_logs" USING "btree" ("created_at");



CREATE INDEX "idx_esocial_logs_event_id" ON "rh"."esocial_logs" USING "btree" ("event_id");



CREATE INDEX "idx_esocial_logs_status" ON "rh"."esocial_logs" USING "btree" ("status");



CREATE INDEX "idx_esocial_logs_tipo_operacao" ON "rh"."esocial_logs" USING "btree" ("tipo_operacao");



CREATE INDEX "idx_fgts_config_ano_mes" ON "rh"."fgts_config" USING "btree" ("ano_vigencia", "mes_vigencia");



CREATE INDEX "idx_fgts_config_ativo" ON "rh"."fgts_config" USING "btree" ("ativo");



CREATE INDEX "idx_fgts_config_codigo" ON "rh"."fgts_config" USING "btree" ("codigo");



CREATE INDEX "idx_fgts_config_company_id" ON "rh"."fgts_config" USING "btree" ("company_id");



CREATE INDEX "idx_fgts_config_tipo_contrato" ON "rh"."fgts_config" USING "btree" ("company_id", "ano_vigencia", "mes_vigencia", "tipo_contrato") WHERE ("tipo_contrato" IS NOT NULL);



CREATE INDEX "idx_fgts_config_vigencia" ON "rh"."fgts_config" USING "btree" ("ano_vigencia", "mes_vigencia", "ativo");



CREATE INDEX "idx_financial_integration_config_company_id" ON "rh"."financial_integration_config" USING "btree" ("company_id");



CREATE INDEX "idx_flash_integration_config_ambiente" ON "rh"."flash_integration_config" USING "btree" ("ambiente");



CREATE INDEX "idx_flash_integration_config_company_id" ON "rh"."flash_integration_config" USING "btree" ("company_id");



CREATE INDEX "idx_flash_integration_config_is_active" ON "rh"."flash_integration_config" USING "btree" ("is_active");



CREATE INDEX "idx_holidays_ano" ON "rh"."holidays" USING "btree" (EXTRACT(year FROM "data"));



CREATE INDEX "idx_holidays_ativo" ON "rh"."holidays" USING "btree" ("ativo");



CREATE INDEX "idx_holidays_company_id" ON "rh"."holidays" USING "btree" ("company_id");



CREATE INDEX "idx_holidays_data" ON "rh"."holidays" USING "btree" ("data");



CREATE INDEX "idx_holidays_municipio" ON "rh"."holidays" USING "btree" ("municipio") WHERE ("municipio" IS NOT NULL);



CREATE INDEX "idx_holidays_tipo" ON "rh"."holidays" USING "btree" ("tipo");



CREATE INDEX "idx_holidays_tipo_uf" ON "rh"."holidays" USING "btree" ("tipo", "uf") WHERE ("uf" IS NOT NULL);



CREATE INDEX "idx_holidays_uf" ON "rh"."holidays" USING "btree" ("uf") WHERE ("uf" IS NOT NULL);



CREATE INDEX "idx_income_statements_ano_mes" ON "rh"."income_statements" USING "btree" ("ano_referencia", "mes_referencia");



CREATE INDEX "idx_income_statements_company_id" ON "rh"."income_statements" USING "btree" ("company_id");



CREATE INDEX "idx_income_statements_employee_id" ON "rh"."income_statements" USING "btree" ("employee_id");



CREATE INDEX "idx_income_statements_status" ON "rh"."income_statements" USING "btree" ("status");



CREATE UNIQUE INDEX "idx_income_statements_unique" ON "rh"."income_statements" USING "btree" ("employee_id", "ano_referencia", "mes_referencia");



CREATE INDEX "idx_inss_brackets_ano_mes" ON "rh"."inss_brackets" USING "btree" ("ano_vigencia", "mes_vigencia");



CREATE INDEX "idx_inss_brackets_ativo" ON "rh"."inss_brackets" USING "btree" ("ativo");



CREATE INDEX "idx_inss_brackets_codigo" ON "rh"."inss_brackets" USING "btree" ("codigo");



CREATE INDEX "idx_inss_brackets_company_id" ON "rh"."inss_brackets" USING "btree" ("company_id");



CREATE INDEX "idx_inss_brackets_vigencia" ON "rh"."inss_brackets" USING "btree" ("ano_vigencia", "mes_vigencia", "ativo");



CREATE INDEX "idx_irrf_brackets_ano_mes" ON "rh"."irrf_brackets" USING "btree" ("ano_vigencia", "mes_vigencia");



CREATE INDEX "idx_irrf_brackets_ativo" ON "rh"."irrf_brackets" USING "btree" ("ativo");



CREATE INDEX "idx_irrf_brackets_codigo" ON "rh"."irrf_brackets" USING "btree" ("codigo");



CREATE INDEX "idx_irrf_brackets_company_id" ON "rh"."irrf_brackets" USING "btree" ("company_id");



CREATE INDEX "idx_irrf_brackets_vigencia" ON "rh"."irrf_brackets" USING "btree" ("ano_vigencia", "mes_vigencia", "ativo");



CREATE INDEX "idx_location_zones_ativo" ON "rh"."location_zones" USING "btree" ("ativo") WHERE ("ativo" = true);



CREATE INDEX "idx_location_zones_company_id" ON "rh"."location_zones" USING "btree" ("company_id");



CREATE INDEX "idx_med_cert_attachments_company_id" ON "rh"."medical_certificate_attachments" USING "btree" ("company_id");



CREATE INDEX "idx_medical_agreements_ativo" ON "rh"."medical_agreements" USING "btree" ("ativo");



CREATE INDEX "idx_medical_agreements_company_id" ON "rh"."medical_agreements" USING "btree" ("company_id");



CREATE INDEX "idx_medical_agreements_tipo" ON "rh"."medical_agreements" USING "btree" ("tipo");



CREATE INDEX "idx_medical_certificate_attachments_certificate_id" ON "rh"."medical_certificate_attachments" USING "btree" ("certificate_id");



CREATE INDEX "idx_medical_certificates_company_id" ON "rh"."medical_certificates" USING "btree" ("company_id");



CREATE INDEX "idx_medical_certificates_data_inicio" ON "rh"."medical_certificates" USING "btree" ("data_inicio");



CREATE INDEX "idx_medical_certificates_employee_id" ON "rh"."medical_certificates" USING "btree" ("employee_id");



CREATE INDEX "idx_medical_certificates_status" ON "rh"."medical_certificates" USING "btree" ("status");



CREATE INDEX "idx_medical_certificates_tipo_atestado" ON "rh"."medical_certificates" USING "btree" ("tipo_atestado");



CREATE INDEX "idx_medical_plan_age_ranges_ativo" ON "rh"."medical_plan_age_ranges" USING "btree" ("ativo") WHERE ("ativo" = true);



CREATE INDEX "idx_medical_plan_age_ranges_company_id" ON "rh"."medical_plan_age_ranges" USING "btree" ("company_id");



CREATE INDEX "idx_medical_plan_age_ranges_idade" ON "rh"."medical_plan_age_ranges" USING "btree" ("idade_min", "idade_max");



CREATE INDEX "idx_medical_plan_age_ranges_plan_id" ON "rh"."medical_plan_age_ranges" USING "btree" ("plan_id");



CREATE INDEX "idx_medical_plan_pricing_history_company_id" ON "rh"."medical_plan_pricing_history" USING "btree" ("company_id");



CREATE INDEX "idx_medical_plan_pricing_history_data_vigencia" ON "rh"."medical_plan_pricing_history" USING "btree" ("data_vigencia");



CREATE INDEX "idx_medical_plan_pricing_history_plan_id" ON "rh"."medical_plan_pricing_history" USING "btree" ("plan_id");



CREATE INDEX "idx_medical_plans_agreement_id" ON "rh"."medical_plans" USING "btree" ("agreement_id");



CREATE INDEX "idx_medical_plans_ativo" ON "rh"."medical_plans" USING "btree" ("ativo");



CREATE INDEX "idx_medical_plans_categoria" ON "rh"."medical_plans" USING "btree" ("categoria");



CREATE INDEX "idx_medical_plans_categoria_desconto" ON "rh"."medical_plans" USING "btree" ("categoria_desconto");



CREATE INDEX "idx_medical_plans_company_id" ON "rh"."medical_plans" USING "btree" ("company_id");



CREATE INDEX "idx_medical_plans_entra_no_calculo_folha" ON "rh"."medical_plans" USING "btree" ("entra_no_calculo_folha");



CREATE INDEX "idx_medical_plans_tipo_folha" ON "rh"."medical_plans" USING "btree" ("tipo_folha");



CREATE INDEX "idx_medical_services_usage_company_id" ON "rh"."medical_services_usage" USING "btree" ("company_id");



CREATE INDEX "idx_medical_services_usage_data_utilizacao" ON "rh"."medical_services_usage" USING "btree" ("data_utilizacao");



CREATE INDEX "idx_medical_services_usage_employee_id" ON "rh"."medical_services_usage" USING "btree" ("employee_id");



CREATE INDEX "idx_medical_services_usage_employee_plan_id" ON "rh"."medical_services_usage" USING "btree" ("employee_plan_id");



CREATE INDEX "idx_medical_services_usage_folha_ref" ON "rh"."medical_services_usage" USING "btree" ("mes_referencia_folha", "ano_referencia_folha");



CREATE INDEX "idx_medical_services_usage_payroll_event_id" ON "rh"."medical_services_usage" USING "btree" ("payroll_event_id");



CREATE INDEX "idx_medical_services_usage_status" ON "rh"."medical_services_usage" USING "btree" ("status");



CREATE INDEX "idx_payroll_beneficios_convenios_medicos" ON "rh"."payroll" USING "btree" ("total_beneficios_convenios_medicos");



CREATE INDEX "idx_payroll_beneficios_tradicionais" ON "rh"."payroll" USING "btree" ("total_beneficios_tradicionais");



CREATE INDEX "idx_payroll_config_ativo" ON "rh"."payroll_config" USING "btree" ("ativo");



CREATE INDEX "idx_payroll_config_company_id" ON "rh"."payroll_config" USING "btree" ("company_id");



CREATE INDEX "idx_payroll_config_periodo" ON "rh"."payroll_config" USING "btree" ("ano_vigencia", "mes_vigencia");



CREATE INDEX "idx_payroll_descontos_convenios_medicos" ON "rh"."payroll" USING "btree" ("total_descontos_convenios_medicos");



CREATE INDEX "idx_payroll_events_company_id" ON "rh"."payroll_events" USING "btree" ("company_id");



CREATE INDEX "idx_payroll_events_employee_id" ON "rh"."payroll_events" USING "btree" ("employee_id");



CREATE INDEX "idx_payroll_events_payroll_id" ON "rh"."payroll_events" USING "btree" ("payroll_id");



CREATE INDEX "idx_payroll_events_periodo" ON "rh"."payroll_events" USING "btree" ("ano_referencia", "mes_referencia");



CREATE INDEX "idx_payroll_events_rubrica" ON "rh"."payroll_events" USING "btree" ("rubrica_id");



CREATE INDEX "idx_payroll_events_tipo" ON "rh"."payroll_events" USING "btree" ("tipo_rubrica");



CREATE INDEX "idx_payroll_overtime_events_company" ON "rh"."payroll_overtime_events" USING "btree" ("company_id");



CREATE INDEX "idx_payroll_overtime_events_employee" ON "rh"."payroll_overtime_events" USING "btree" ("employee_id");



CREATE INDEX "idx_payroll_overtime_events_period" ON "rh"."payroll_overtime_events" USING "btree" ("payroll_period");



CREATE INDEX "idx_payroll_overtime_events_status" ON "rh"."payroll_overtime_events" USING "btree" ("status");



CREATE INDEX "idx_periodic_exams_company_id" ON "rh"."periodic_exams" USING "btree" ("company_id");



CREATE INDEX "idx_periodic_exams_data_agendamento" ON "rh"."periodic_exams" USING "btree" ("data_agendamento");



CREATE INDEX "idx_periodic_exams_data_vencimento" ON "rh"."periodic_exams" USING "btree" ("data_vencimento");



CREATE INDEX "idx_periodic_exams_employee_id" ON "rh"."periodic_exams" USING "btree" ("employee_id");



CREATE INDEX "idx_periodic_exams_employee_vencimento" ON "rh"."periodic_exams" USING "btree" ("employee_id", "data_vencimento", "status");



CREATE INDEX "idx_periodic_exams_overdue" ON "rh"."periodic_exams" USING "btree" ("company_id", "data_vencimento", "status") WHERE (("status")::"text" <> 'realizado'::"text");



CREATE INDEX "idx_periodic_exams_resultado" ON "rh"."periodic_exams" USING "btree" ("resultado");



CREATE INDEX "idx_periodic_exams_status" ON "rh"."periodic_exams" USING "btree" ("status");



CREATE INDEX "idx_periodic_exams_tipo_exame" ON "rh"."periodic_exams" USING "btree" ("tipo_exame");



CREATE INDEX "idx_reports_company_id" ON "rh"."reports" USING "btree" ("company_id");



CREATE INDEX "idx_reports_data_geracao" ON "rh"."reports" USING "btree" ("data_geracao");



CREATE INDEX "idx_reports_status" ON "rh"."reports" USING "btree" ("status");



CREATE INDEX "idx_reports_tipo" ON "rh"."reports" USING "btree" ("tipo");



CREATE INDEX "idx_rubricas_ativo" ON "rh"."rubricas" USING "btree" ("ativo");



CREATE INDEX "idx_rubricas_categoria" ON "rh"."rubricas" USING "btree" ("categoria");



CREATE INDEX "idx_rubricas_codigo" ON "rh"."rubricas" USING "btree" ("codigo");



CREATE INDEX "idx_rubricas_company_id" ON "rh"."rubricas" USING "btree" ("company_id");



CREATE INDEX "idx_rubricas_ordem" ON "rh"."rubricas" USING "btree" ("ordem_exibicao");



CREATE INDEX "idx_rubricas_tipo" ON "rh"."rubricas" USING "btree" ("tipo");



CREATE INDEX "idx_signature_month_control_company" ON "rh"."signature_month_control" USING "btree" ("company_id");



CREATE INDEX "idx_signature_month_control_company_month" ON "rh"."signature_month_control" USING "btree" ("company_id", "month_year");



CREATE INDEX "idx_signature_month_control_locked" ON "rh"."signature_month_control" USING "btree" ("is_locked");



CREATE INDEX "idx_signature_month_control_month_year" ON "rh"."signature_month_control" USING "btree" ("month_year");



CREATE INDEX "idx_signature_notifications_employee" ON "rh"."signature_notifications" USING "btree" ("employee_id");



CREATE INDEX "idx_signature_notifications_signature" ON "rh"."signature_notifications" USING "btree" ("signature_id");



CREATE INDEX "idx_sobreaviso_escalas_company_id" ON "rh"."sobreaviso_escalas" USING "btree" ("company_id");



CREATE INDEX "idx_sobreaviso_escalas_data_escala" ON "rh"."sobreaviso_escalas" USING "btree" ("data_escala");



CREATE INDEX "idx_sobreaviso_escalas_employee_id" ON "rh"."sobreaviso_escalas" USING "btree" ("employee_id");



CREATE INDEX "idx_sobreaviso_escalas_folha_processada" ON "rh"."sobreaviso_escalas" USING "btree" ("folha_processada") WHERE ("folha_processada" = false);



CREATE INDEX "idx_sobreaviso_escalas_referencia" ON "rh"."sobreaviso_escalas" USING "btree" ("ano_referencia", "mes_referencia");



CREATE INDEX "idx_time_bank_company_id" ON "rh"."time_bank" USING "btree" ("company_id");



CREATE INDEX "idx_time_bank_data_registro" ON "rh"."time_bank" USING "btree" ("data_registro");



CREATE INDEX "idx_time_bank_employee_id" ON "rh"."time_bank" USING "btree" ("employee_id");



CREATE INDEX "idx_time_bank_status" ON "rh"."time_bank" USING "btree" ("status");



CREATE INDEX "idx_time_bank_tipo_hora" ON "rh"."time_bank" USING "btree" ("tipo_hora");



CREATE INDEX "idx_time_record_event_photos_event" ON "rh"."time_record_event_photos" USING "btree" ("event_id");



CREATE INDEX "idx_time_record_events_company_eventat" ON "rh"."time_record_events" USING "btree" ("company_id", "event_at");



CREATE INDEX "idx_time_record_events_employee_eventat" ON "rh"."time_record_events" USING "btree" ("employee_id", "event_at");



CREATE INDEX "idx_time_record_events_outside_zone_true" ON "rh"."time_record_events" USING "btree" ("outside_zone") WHERE ("outside_zone" = true);



CREATE INDEX "idx_time_record_events_record" ON "rh"."time_record_events" USING "btree" ("time_record_id");



CREATE INDEX "idx_time_record_settings_company_id" ON "rh"."time_record_settings" USING "btree" ("company_id");



CREATE INDEX "idx_time_record_signature_config_company" ON "rh"."time_record_signature_config" USING "btree" ("company_id");



CREATE INDEX "idx_time_record_signatures_company" ON "rh"."time_record_signatures" USING "btree" ("company_id");



CREATE INDEX "idx_time_record_signatures_employee" ON "rh"."time_record_signatures" USING "btree" ("employee_id");



CREATE INDEX "idx_time_record_signatures_expires_at" ON "rh"."time_record_signatures" USING "btree" ("expires_at");



CREATE INDEX "idx_time_record_signatures_month_year" ON "rh"."time_record_signatures" USING "btree" ("month_year");



CREATE INDEX "idx_time_record_signatures_status" ON "rh"."time_record_signatures" USING "btree" ("status");



CREATE INDEX "idx_time_records_company_employee_date" ON "rh"."time_records" USING "btree" ("company_id", "employee_id", "data_registro" DESC);



CREATE INDEX "idx_time_records_company_id" ON "rh"."time_records" USING "btree" ("company_id");



CREATE INDEX "idx_time_records_data_registro" ON "rh"."time_records" USING "btree" ("data_registro");



CREATE INDEX "idx_time_records_employee_date" ON "rh"."time_records" USING "btree" ("employee_id", "data_registro" DESC, "id" DESC);



CREATE INDEX "idx_time_records_employee_id" ON "rh"."time_records" USING "btree" ("employee_id");



CREATE INDEX "idx_time_records_horas_para_banco" ON "rh"."time_records" USING "btree" ("horas_para_banco") WHERE ("horas_para_banco" > (0)::numeric);



CREATE INDEX "idx_time_records_horas_para_pagamento" ON "rh"."time_records" USING "btree" ("horas_para_pagamento") WHERE ("horas_para_pagamento" > (0)::numeric);



CREATE INDEX "idx_time_records_is_feriado" ON "rh"."time_records" USING "btree" ("is_feriado") WHERE ("is_feriado" = true);



CREATE INDEX "idx_time_records_latitude" ON "rh"."time_records" USING "btree" ("latitude") WHERE ("latitude" IS NOT NULL);



CREATE INDEX "idx_time_records_localizacao_type" ON "rh"."time_records" USING "btree" ("localizacao_type") WHERE ("localizacao_type" IS NOT NULL);



CREATE INDEX "idx_time_records_longitude" ON "rh"."time_records" USING "btree" ("longitude") WHERE ("longitude" IS NOT NULL);



CREATE INDEX "idx_time_records_outside_zone_true" ON "rh"."time_records" USING "btree" ("outside_zone") WHERE ("outside_zone" = true);



CREATE INDEX "idx_time_records_status" ON "rh"."time_records" USING "btree" ("status");



CREATE INDEX "idx_time_records_status_date" ON "rh"."time_records" USING "btree" ("company_id", "status", "data_registro" DESC);



CREATE INDEX "idx_training_application_gestor" ON "rh"."training_application_evaluations" USING "btree" ("gestor_id");



CREATE INDEX "idx_training_application_training_employee" ON "rh"."training_application_evaluations" USING "btree" ("training_id", "employee_id");



CREATE INDEX "idx_training_assignments_employee_id" ON "rh"."training_assignments" USING "btree" ("employee_id");



CREATE INDEX "idx_training_assignments_position_id" ON "rh"."training_assignments" USING "btree" ("position_id");



CREATE INDEX "idx_training_assignments_training_id" ON "rh"."training_assignments" USING "btree" ("training_id");



CREATE INDEX "idx_training_assignments_unit_id" ON "rh"."training_assignments" USING "btree" ("unit_id");



CREATE INDEX "idx_training_content_ordem" ON "rh"."training_content" USING "btree" ("training_id", "ordem");



CREATE INDEX "idx_training_content_training_id" ON "rh"."training_content" USING "btree" ("training_id");



CREATE INDEX "idx_training_exam_alternatives_question_id" ON "rh"."training_exam_alternatives" USING "btree" ("question_id");



CREATE INDEX "idx_training_exam_answers_attempt_id" ON "rh"."training_exam_answers" USING "btree" ("attempt_id");



CREATE INDEX "idx_training_exam_attempts_exam_employee" ON "rh"."training_exam_attempts" USING "btree" ("exam_id", "employee_id");



CREATE INDEX "idx_training_exam_attempts_training" ON "rh"."training_exam_attempts" USING "btree" ("training_id");



CREATE INDEX "idx_training_exam_questions_exam_id" ON "rh"."training_exam_questions" USING "btree" ("exam_id");



CREATE INDEX "idx_training_exams_content_id" ON "rh"."training_exams" USING "btree" ("content_id");



CREATE INDEX "idx_training_exams_training_id" ON "rh"."training_exams" USING "btree" ("training_id");



CREATE INDEX "idx_training_notification_history_employee_id" ON "rh"."training_notification_history" USING "btree" ("employee_id");



CREATE INDEX "idx_training_notification_history_training_id" ON "rh"."training_notification_history" USING "btree" ("training_id");



CREATE INDEX "idx_training_notification_queue_company_id" ON "rh"."training_notification_queue" USING "btree" ("company_id");



CREATE INDEX "idx_training_notification_queue_data_agendamento" ON "rh"."training_notification_queue" USING "btree" ("data_agendamento");



CREATE INDEX "idx_training_notification_queue_status" ON "rh"."training_notification_queue" USING "btree" ("status");



CREATE INDEX "idx_training_progress_content" ON "rh"."training_progress" USING "btree" ("content_id");



CREATE INDEX "idx_training_progress_enrollment" ON "rh"."training_progress" USING "btree" ("enrollment_id");



CREATE INDEX "idx_training_progress_training_employee" ON "rh"."training_progress" USING "btree" ("training_id", "employee_id");



CREATE INDEX "idx_training_reaction_training_employee" ON "rh"."training_reaction_evaluations" USING "btree" ("training_id", "employee_id");



CREATE INDEX "idx_training_settings_active" ON "rh"."training_settings" USING "btree" ("is_active");



CREATE INDEX "idx_training_settings_company_id" ON "rh"."training_settings" USING "btree" ("company_id");



CREATE UNIQUE INDEX "idx_training_settings_company_unique" ON "rh"."training_settings" USING "btree" ("company_id") WHERE ("is_active" = true);



CREATE INDEX "idx_trainings_company_active" ON "rh"."trainings" USING "btree" ("company_id", "is_active", "created_at" DESC);



CREATE INDEX "idx_trainings_company_id" ON "rh"."trainings" USING "btree" ("company_id");



CREATE INDEX "idx_trainings_data_fim" ON "rh"."trainings" USING "btree" ("data_fim");



CREATE INDEX "idx_trainings_data_inicio" ON "rh"."trainings" USING "btree" ("data_inicio");



CREATE INDEX "idx_trainings_status" ON "rh"."trainings" USING "btree" ("status");



CREATE INDEX "idx_trainings_tipo" ON "rh"."trainings" USING "btree" ("tipo_treinamento");



CREATE INDEX "idx_union_contributions_company_id" ON "rh"."union_contributions" USING "btree" ("company_id");



CREATE INDEX "idx_union_contributions_employee_id" ON "rh"."union_contributions" USING "btree" ("employee_id");



CREATE INDEX "idx_union_contributions_mes_referencia" ON "rh"."union_contributions" USING "btree" ("mes_referencia");



CREATE INDEX "idx_union_contributions_status" ON "rh"."union_contributions" USING "btree" ("status");



CREATE INDEX "idx_union_contributions_union_id" ON "rh"."union_contributions" USING "btree" ("union_id");



CREATE INDEX "idx_union_negotiations_company_id" ON "rh"."union_negotiations" USING "btree" ("company_id");



CREATE INDEX "idx_union_negotiations_status" ON "rh"."union_negotiations" USING "btree" ("status");



CREATE INDEX "idx_union_negotiations_tipo_negociacao" ON "rh"."union_negotiations" USING "btree" ("tipo_negociacao");



CREATE INDEX "idx_union_negotiations_union_id" ON "rh"."union_negotiations" USING "btree" ("union_id");



CREATE INDEX "idx_union_representatives_company_id" ON "rh"."union_representatives" USING "btree" ("company_id");



CREATE INDEX "idx_union_representatives_employee_id" ON "rh"."union_representatives" USING "btree" ("employee_id");



CREATE INDEX "idx_union_representatives_status" ON "rh"."union_representatives" USING "btree" ("status");



CREATE INDEX "idx_union_representatives_union_id" ON "rh"."union_representatives" USING "btree" ("union_id");



CREATE INDEX "idx_unions_ativo" ON "rh"."unions" USING "btree" ("ativo");



CREATE INDEX "idx_unions_categoria" ON "rh"."unions" USING "btree" ("categoria");



CREATE INDEX "idx_unions_company_id" ON "rh"."unions" USING "btree" ("company_id");



CREATE INDEX "idx_unions_tipo" ON "rh"."unions" USING "btree" ("tipo");



CREATE INDEX "idx_units_cost_center_id" ON "rh"."units" USING "btree" ("cost_center_id");



CREATE INDEX "idx_work_shifts_codigo" ON "rh"."work_shifts" USING "btree" ("codigo");



CREATE INDEX "idx_work_shifts_company_id" ON "rh"."work_shifts" USING "btree" ("company_id");



CREATE INDEX "idx_work_shifts_status" ON "rh"."work_shifts" USING "btree" ("status");



CREATE UNIQUE INDEX "unique_fgts_config_company_ano_mes_codigo_tipo" ON "rh"."fgts_config" USING "btree" ("company_id", "ano_vigencia", "mes_vigencia", "codigo", "tipo_contrato");



CREATE OR REPLACE TRIGGER "ensure_single_default_bank_hours_type_trigger" BEFORE INSERT OR UPDATE ON "rh"."bank_hours_types" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_single_default_bank_hours_type"();



CREATE OR REPLACE TRIGGER "trg_after_change_recalc" AFTER INSERT OR DELETE OR UPDATE ON "rh"."time_record_events" FOR EACH ROW EXECUTE FUNCTION "rh"."trg_time_record_events_recalc"();



CREATE OR REPLACE TRIGGER "trg_calculate_overtime_on_approval" AFTER UPDATE OF "status" ON "rh"."time_records" FOR EACH ROW WHEN (((("new"."status")::"text" = 'aprovado'::"text") AND (("old"."status" IS NULL) OR (("old"."status")::"text" <> 'aprovado'::"text")))) EXECUTE FUNCTION "rh"."trg_calculate_overtime_on_approval"();



CREATE OR REPLACE TRIGGER "trigger_audit_approval_levels" AFTER INSERT OR DELETE OR UPDATE ON "rh"."approval_levels" FOR EACH ROW EXECUTE FUNCTION "public"."audit_approval_levels"();



CREATE OR REPLACE TRIGGER "trigger_audit_compensation_approvals" AFTER INSERT OR UPDATE ON "rh"."compensation_approvals" FOR EACH ROW EXECUTE FUNCTION "public"."audit_compensation_approvals"();



CREATE OR REPLACE TRIGGER "trigger_audit_compensation_requests" AFTER INSERT OR DELETE OR UPDATE ON "rh"."compensation_requests" FOR EACH ROW EXECUTE FUNCTION "public"."audit_compensation_requests"();



CREATE OR REPLACE TRIGGER "trigger_auto_mark_training_progress_completed" BEFORE UPDATE ON "rh"."training_progress" FOR EACH ROW EXECUTE FUNCTION "rh"."auto_mark_training_progress_completed"();



CREATE OR REPLACE TRIGGER "trigger_auto_send_award_to_flash" AFTER UPDATE ON "rh"."awards_productivity" FOR EACH ROW EXECUTE FUNCTION "public"."auto_send_award_to_flash_on_approval"();



CREATE OR REPLACE TRIGGER "trigger_auto_send_equipment_rental_to_flash" AFTER UPDATE ON "rh"."equipment_rental_monthly_payments" FOR EACH ROW EXECUTE FUNCTION "public"."auto_send_equipment_rental_to_flash_on_approval"();



CREATE OR REPLACE TRIGGER "trigger_calculate_medical_certificate_days" BEFORE INSERT OR UPDATE ON "rh"."medical_certificates" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_medical_certificate_days"();



CREATE OR REPLACE TRIGGER "trigger_create_compensation_approvals" AFTER INSERT ON "rh"."compensation_requests" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_create_compensation_approvals"();



CREATE OR REPLACE TRIGGER "trigger_create_training_notification_rules" AFTER INSERT ON "rh"."trainings" FOR EACH ROW EXECUTE FUNCTION "rh"."trigger_create_training_notification_rules"();



CREATE OR REPLACE TRIGGER "trigger_sync_employee_shift_from_work_shift_id_insert" AFTER INSERT ON "rh"."employees" FOR EACH ROW WHEN (("new"."work_shift_id" IS NOT NULL)) EXECUTE FUNCTION "rh"."sync_employee_shift_from_work_shift_id"();



CREATE OR REPLACE TRIGGER "trigger_sync_employee_shift_from_work_shift_id_update" AFTER UPDATE OF "work_shift_id" ON "rh"."employees" FOR EACH ROW WHEN (("new"."work_shift_id" IS DISTINCT FROM "old"."work_shift_id")) EXECUTE FUNCTION "rh"."sync_employee_shift_from_work_shift_id"();



CREATE OR REPLACE TRIGGER "trigger_update_absence_types_updated_at" BEFORE UPDATE ON "rh"."absence_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_absence_types_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_allowance_types_updated_at" BEFORE UPDATE ON "rh"."allowance_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_allowance_types_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_approval_levels_updated_at" BEFORE UPDATE ON "rh"."approval_levels" FOR EACH ROW EXECUTE FUNCTION "public"."update_approval_levels_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_audit_config_updated_at" BEFORE UPDATE ON "rh"."audit_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_audit_config_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_cid_codes_updated_at" BEFORE UPDATE ON "rh"."cid_codes" FOR EACH ROW EXECUTE FUNCTION "public"."update_cid_codes_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_compensation_approvals_updated_at" BEFORE UPDATE ON "rh"."compensation_approvals" FOR EACH ROW EXECUTE FUNCTION "public"."update_compensation_approvals_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_compensation_requests_updated_at" BEFORE UPDATE ON "rh"."compensation_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_compensation_requests_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_coparticipation" BEFORE INSERT OR UPDATE ON "rh"."medical_services_usage" FOR EACH ROW WHEN (("new"."employee_plan_id" IS NOT NULL)) EXECUTE FUNCTION "rh"."update_coparticipation_on_service_insert"();



CREATE OR REPLACE TRIGGER "trigger_update_deficiency_types_updated_at" BEFORE UPDATE ON "rh"."deficiency_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_deficiency_types_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_delay_reasons_updated_at" BEFORE UPDATE ON "rh"."delay_reasons" FOR EACH ROW EXECUTE FUNCTION "public"."update_delay_reasons_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_disciplinary_actions_updated_at" BEFORE UPDATE ON "rh"."disciplinary_actions" FOR EACH ROW EXECUTE FUNCTION "public"."update_disciplinary_actions_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_employee_shifts_updated_at" BEFORE UPDATE ON "rh"."employee_shifts" FOR EACH ROW EXECUTE FUNCTION "public"."update_employee_shifts_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_employment_contracts_updated_at" BEFORE UPDATE ON "rh"."employment_contracts" FOR EACH ROW EXECUTE FUNCTION "public"."update_employment_contracts_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_equipment_rental_monthly_payments_updated_at" BEFORE UPDATE ON "rh"."equipment_rental_monthly_payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_equipment_rental_monthly_payments_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_esocial_integrations_updated_at" BEFORE UPDATE ON "rh"."esocial_integrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_esocial_integrations_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_fgts_config_updated_at" BEFORE UPDATE ON "rh"."fgts_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_fgts_config_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_financial_integration_config_updated_at" BEFORE UPDATE ON "rh"."financial_integration_config" FOR EACH ROW EXECUTE FUNCTION "rh"."update_financial_integration_config_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_flash_integration_config_updated_at" BEFORE UPDATE ON "rh"."flash_integration_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_flash_integration_config_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_income_statements_updated_at" BEFORE UPDATE ON "rh"."income_statements" FOR EACH ROW EXECUTE FUNCTION "public"."update_income_statements_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_inss_brackets_updated_at" BEFORE UPDATE ON "rh"."inss_brackets" FOR EACH ROW EXECUTE FUNCTION "public"."update_inss_brackets_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_irrf_brackets_updated_at" BEFORE UPDATE ON "rh"."irrf_brackets" FOR EACH ROW EXECUTE FUNCTION "public"."update_irrf_brackets_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_location_zones_updated_at" BEFORE UPDATE ON "rh"."location_zones" FOR EACH ROW EXECUTE FUNCTION "rh"."update_location_zones_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_reports_updated_at" BEFORE UPDATE ON "rh"."reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_reports_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_rubricas_updated_at" BEFORE UPDATE ON "rh"."rubricas" FOR EACH ROW EXECUTE FUNCTION "public"."update_rubricas_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_sobreaviso_escalas_updated_at" BEFORE UPDATE ON "rh"."sobreaviso_escalas" FOR EACH ROW EXECUTE FUNCTION "rh"."update_sobreaviso_escalas_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_training_exam_answers_updated_at" BEFORE UPDATE ON "rh"."training_exam_answers" FOR EACH ROW EXECUTE FUNCTION "rh"."update_training_exam_answers_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_work_shifts_updated_at" BEFORE UPDATE ON "rh"."work_shifts" FOR EACH ROW EXECUTE FUNCTION "public"."update_work_shifts_updated_at"();



CREATE OR REPLACE TRIGGER "update_bank_hours_assignments_updated_at" BEFORE UPDATE ON "rh"."bank_hours_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_bank_hours_balance_updated_at" BEFORE UPDATE ON "rh"."bank_hours_balance" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_bank_hours_config_updated_at" BEFORE UPDATE ON "rh"."bank_hours_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_bank_hours_transactions_updated_at" BEFORE UPDATE ON "rh"."bank_hours_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_bank_hours_types_updated_at" BEFORE UPDATE ON "rh"."bank_hours_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_collective_agreements_updated_at" BEFORE UPDATE ON "rh"."collective_agreements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_dependents_updated_at" BEFORE UPDATE ON "rh"."dependents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employee_deductions_updated_at" BEFORE UPDATE ON "rh"."employee_deductions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employee_medical_plans_updated_at" BEFORE UPDATE ON "rh"."employee_medical_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employee_plan_dependents_updated_at" BEFORE UPDATE ON "rh"."employee_plan_dependents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employee_union_memberships_updated_at" BEFORE UPDATE ON "rh"."employee_union_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_medical_agreements_updated_at" BEFORE UPDATE ON "rh"."medical_agreements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_medical_plan_age_ranges_updated_at" BEFORE UPDATE ON "rh"."medical_plan_age_ranges" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_medical_plans_updated_at" BEFORE UPDATE ON "rh"."medical_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_medical_services_usage_updated_at" BEFORE UPDATE ON "rh"."medical_services_usage" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_signature_month_control_updated_at" BEFORE UPDATE ON "rh"."signature_month_control" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_time_record_settings_updated_at" BEFORE UPDATE ON "rh"."time_record_settings" FOR EACH ROW EXECUTE FUNCTION "rh"."update_time_record_settings_updated_at"();



CREATE OR REPLACE TRIGGER "update_time_record_signature_config_updated_at" BEFORE UPDATE ON "rh"."time_record_signature_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_time_record_signatures_updated_at" BEFORE UPDATE ON "rh"."time_record_signatures" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_training_application_evaluations_updated_at" BEFORE UPDATE ON "rh"."training_application_evaluations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_training_assignments_updated_at" BEFORE UPDATE ON "rh"."training_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_training_content_updated_at" BEFORE UPDATE ON "rh"."training_content" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_training_exam_attempts_updated_at" BEFORE UPDATE ON "rh"."training_exam_attempts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_training_exam_questions_updated_at" BEFORE UPDATE ON "rh"."training_exam_questions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_training_exams_updated_at" BEFORE UPDATE ON "rh"."training_exams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_training_progress_updated_at" BEFORE UPDATE ON "rh"."training_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_training_reaction_evaluations_updated_at" BEFORE UPDATE ON "rh"."training_reaction_evaluations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_training_settings_updated_at" BEFORE UPDATE ON "rh"."training_settings" FOR EACH ROW EXECUTE FUNCTION "rh"."update_training_settings_updated_at"();



CREATE OR REPLACE TRIGGER "update_union_contributions_updated_at" BEFORE UPDATE ON "rh"."union_contributions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_union_negotiations_updated_at" BEFORE UPDATE ON "rh"."union_negotiations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_union_representatives_updated_at" BEFORE UPDATE ON "rh"."union_representatives" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_unions_updated_at" BEFORE UPDATE ON "rh"."unions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "rh"."absence_types"
    ADD CONSTRAINT "absence_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."allowance_types"
    ADD CONSTRAINT "allowance_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."approval_level_approvers"
    ADD CONSTRAINT "approval_level_approvers_approval_level_id_fkey" FOREIGN KEY ("approval_level_id") REFERENCES "rh"."approval_levels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."approval_level_approvers"
    ADD CONSTRAINT "approval_level_approvers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."approval_levels"
    ADD CONSTRAINT "approval_levels_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."attendance_corrections"
    ADD CONSTRAINT "attendance_corrections_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."attendance_corrections"
    ADD CONSTRAINT "attendance_corrections_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."audit_config"
    ADD CONSTRAINT "audit_config_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."audit_logs"
    ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."awards_productivity"
    ADD CONSTRAINT "awards_productivity_accounts_payable_id_fkey" FOREIGN KEY ("accounts_payable_id") REFERENCES "financeiro"."contas_pagar"("id");



ALTER TABLE ONLY "rh"."awards_productivity"
    ADD CONSTRAINT "awards_productivity_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."awards_productivity"
    ADD CONSTRAINT "awards_productivity_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."bank_hours_assignments"
    ADD CONSTRAINT "bank_hours_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."bank_hours_assignments"
    ADD CONSTRAINT "bank_hours_assignments_bank_hours_type_id_fkey" FOREIGN KEY ("bank_hours_type_id") REFERENCES "rh"."bank_hours_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."bank_hours_assignments"
    ADD CONSTRAINT "bank_hours_assignments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."bank_hours_assignments"
    ADD CONSTRAINT "bank_hours_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."bank_hours_balance"
    ADD CONSTRAINT "bank_hours_balance_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."bank_hours_balance"
    ADD CONSTRAINT "bank_hours_balance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."bank_hours_calculations"
    ADD CONSTRAINT "bank_hours_calculations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."bank_hours_closure"
    ADD CONSTRAINT "bank_hours_closure_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."bank_hours_closure"
    ADD CONSTRAINT "bank_hours_closure_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."bank_hours_closure"
    ADD CONSTRAINT "bank_hours_closure_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."bank_hours_closure"
    ADD CONSTRAINT "bank_hours_closure_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."bank_hours_config"
    ADD CONSTRAINT "bank_hours_config_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."bank_hours_config"
    ADD CONSTRAINT "bank_hours_config_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."bank_hours_legacy_imports"
    ADD CONSTRAINT "bank_hours_legacy_imports_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."bank_hours_legacy_imports"
    ADD CONSTRAINT "bank_hours_legacy_imports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."bank_hours_legacy_imports"
    ADD CONSTRAINT "bank_hours_legacy_imports_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."bank_hours_legacy_imports"
    ADD CONSTRAINT "bank_hours_legacy_imports_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "rh"."bank_hours_transactions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."bank_hours_transactions"
    ADD CONSTRAINT "bank_hours_transactions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."bank_hours_transactions"
    ADD CONSTRAINT "bank_hours_transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."bank_hours_transactions"
    ADD CONSTRAINT "bank_hours_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."bank_hours_transactions"
    ADD CONSTRAINT "bank_hours_transactions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."bank_hours_transactions"
    ADD CONSTRAINT "bank_hours_transactions_time_record_id_fkey" FOREIGN KEY ("time_record_id") REFERENCES "rh"."time_records"("id");



ALTER TABLE ONLY "rh"."bank_hours_types"
    ADD CONSTRAINT "bank_hours_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."benefit_configurations"
    ADD CONSTRAINT "benefit_configurations_classe_financeira_id_fkey" FOREIGN KEY ("classe_financeira_id") REFERENCES "financeiro"."classes_financeiras"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."benefit_configurations"
    ADD CONSTRAINT "benefit_configurations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."calculation_logs"
    ADD CONSTRAINT "calculation_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."candidate_documents"
    ADD CONSTRAINT "candidate_documents_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "rh"."candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."candidate_documents"
    ADD CONSTRAINT "candidate_documents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."candidate_documents"
    ADD CONSTRAINT "candidate_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."candidates"
    ADD CONSTRAINT "candidates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."cid_codes"
    ADD CONSTRAINT "cid_codes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."collective_agreements"
    ADD CONSTRAINT "collective_agreements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."collective_agreements"
    ADD CONSTRAINT "collective_agreements_union_id_fkey" FOREIGN KEY ("union_id") REFERENCES "rh"."unions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."compensation_approvals"
    ADD CONSTRAINT "compensation_approvals_approval_level_id_fkey" FOREIGN KEY ("approval_level_id") REFERENCES "rh"."approval_levels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."compensation_approvals"
    ADD CONSTRAINT "compensation_approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."compensation_approvals"
    ADD CONSTRAINT "compensation_approvals_compensation_request_id_fkey" FOREIGN KEY ("compensation_request_id") REFERENCES "rh"."compensation_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."compensation_requests"
    ADD CONSTRAINT "compensation_requests_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."compensation_requests"
    ADD CONSTRAINT "compensation_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."compensation_requests"
    ADD CONSTRAINT "compensation_requests_funcionario_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."correction_history"
    ADD CONSTRAINT "correction_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."correction_history"
    ADD CONSTRAINT "correction_history_correction_id_fkey" FOREIGN KEY ("correction_id") REFERENCES "rh"."attendance_corrections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."correction_settings"
    ADD CONSTRAINT "correction_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."deficiency_types"
    ADD CONSTRAINT "deficiency_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."delay_reasons"
    ADD CONSTRAINT "delay_reasons_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."dependents"
    ADD CONSTRAINT "dependents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."dependents"
    ADD CONSTRAINT "dependents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "rh"."dependents"
    ADD CONSTRAINT "dependents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."dependents"
    ADD CONSTRAINT "dependents_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "rh"."disciplinary_actions"
    ADD CONSTRAINT "disciplinary_actions_aplicado_por_fkey" FOREIGN KEY ("aplicado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."disciplinary_actions"
    ADD CONSTRAINT "disciplinary_actions_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."disciplinary_actions"
    ADD CONSTRAINT "disciplinary_actions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."disciplinary_actions"
    ADD CONSTRAINT "disciplinary_actions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_benefit_assignments"
    ADD CONSTRAINT "employee_benefit_assignments_benefit_config_id_fkey" FOREIGN KEY ("benefit_config_id") REFERENCES "rh"."benefit_configurations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_benefit_assignments"
    ADD CONSTRAINT "employee_benefit_assignments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_benefit_assignments"
    ADD CONSTRAINT "employee_benefit_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_correction_permissions"
    ADD CONSTRAINT "employee_correction_permissions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_correction_permissions"
    ADD CONSTRAINT "employee_correction_permissions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_correction_permissions"
    ADD CONSTRAINT "employee_correction_permissions_liberado_por_fkey" FOREIGN KEY ("liberado_por") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."employee_deductions"
    ADD CONSTRAINT "employee_deductions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_deductions"
    ADD CONSTRAINT "employee_deductions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_deductions"
    ADD CONSTRAINT "employee_deductions_medical_service_usage_id_fkey" FOREIGN KEY ("medical_service_usage_id") REFERENCES "rh"."medical_services_usage"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."employee_deductions"
    ADD CONSTRAINT "employee_deductions_payroll_event_id_fkey" FOREIGN KEY ("payroll_event_id") REFERENCES "rh"."payroll_events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."employee_location_zones"
    ADD CONSTRAINT "employee_location_zones_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_location_zones"
    ADD CONSTRAINT "employee_location_zones_location_zone_id_fkey" FOREIGN KEY ("location_zone_id") REFERENCES "rh"."location_zones"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_medical_plans"
    ADD CONSTRAINT "employee_medical_plans_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_medical_plans"
    ADD CONSTRAINT "employee_medical_plans_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_medical_plans"
    ADD CONSTRAINT "employee_medical_plans_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "rh"."medical_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_plan_dependents"
    ADD CONSTRAINT "employee_plan_dependents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_plan_dependents"
    ADD CONSTRAINT "employee_plan_dependents_employee_plan_id_fkey" FOREIGN KEY ("employee_plan_id") REFERENCES "rh"."employee_medical_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_schedules"
    ADD CONSTRAINT "employee_schedules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_schedules"
    ADD CONSTRAINT "employee_schedules_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_schedules"
    ADD CONSTRAINT "employee_schedules_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "rh"."work_schedules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_shifts"
    ADD CONSTRAINT "employee_shifts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_shifts"
    ADD CONSTRAINT "employee_shifts_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_shifts"
    ADD CONSTRAINT "employee_shifts_turno_id_fkey" FOREIGN KEY ("turno_id") REFERENCES "rh"."work_shifts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_union_memberships"
    ADD CONSTRAINT "employee_union_memberships_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_union_memberships"
    ADD CONSTRAINT "employee_union_memberships_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employee_union_memberships"
    ADD CONSTRAINT "employee_union_memberships_union_id_fkey" FOREIGN KEY ("union_id") REFERENCES "rh"."unions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employees"
    ADD CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employees"
    ADD CONSTRAINT "employees_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."employees"
    ADD CONSTRAINT "employees_deficiencia_tipo_id_fkey" FOREIGN KEY ("deficiencia_tipo_id") REFERENCES "rh"."deficiency_types"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."employees"
    ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."employees"
    ADD CONSTRAINT "employees_work_shift_id_fkey" FOREIGN KEY ("work_shift_id") REFERENCES "rh"."work_shifts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."employment_contracts"
    ADD CONSTRAINT "employment_contracts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."employment_contracts"
    ADD CONSTRAINT "employment_contracts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."equipment_rental_approvals"
    ADD CONSTRAINT "equipment_rental_approvals_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."equipment_rental_approvals"
    ADD CONSTRAINT "equipment_rental_approvals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."equipment_rental_approvals"
    ADD CONSTRAINT "equipment_rental_approvals_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."equipment_rental_monthly_payments"
    ADD CONSTRAINT "equipment_rental_monthly_paym_equipment_rental_approval_id_fkey" FOREIGN KEY ("equipment_rental_approval_id") REFERENCES "rh"."equipment_rental_approvals"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."equipment_rental_monthly_payments"
    ADD CONSTRAINT "equipment_rental_monthly_payments_accounts_payable_id_fkey" FOREIGN KEY ("accounts_payable_id") REFERENCES "financeiro"."contas_pagar"("id");



ALTER TABLE ONLY "rh"."equipment_rental_monthly_payments"
    ADD CONSTRAINT "equipment_rental_monthly_payments_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."equipment_rental_monthly_payments"
    ADD CONSTRAINT "equipment_rental_monthly_payments_classe_financeira_id_fkey" FOREIGN KEY ("classe_financeira_id") REFERENCES "financeiro"."classes_financeiras"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."equipment_rental_monthly_payments"
    ADD CONSTRAINT "equipment_rental_monthly_payments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."equipment_rental_monthly_payments"
    ADD CONSTRAINT "equipment_rental_monthly_payments_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."equipment_rental_monthly_payments"
    ADD CONSTRAINT "equipment_rental_monthly_payments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."equipment_rental_monthly_payments"
    ADD CONSTRAINT "equipment_rental_monthly_payments_processado_por_fkey" FOREIGN KEY ("processado_por") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."esocial_batches"
    ADD CONSTRAINT "esocial_batches_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."esocial_batches"
    ADD CONSTRAINT "esocial_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."esocial_batches"
    ADD CONSTRAINT "esocial_batches_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."esocial_config"
    ADD CONSTRAINT "esocial_config_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."esocial_events"
    ADD CONSTRAINT "esocial_events_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "rh"."esocial_batches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."esocial_events"
    ADD CONSTRAINT "esocial_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."esocial_events"
    ADD CONSTRAINT "esocial_events_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."esocial_integrations"
    ADD CONSTRAINT "esocial_integrations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."esocial_integrations"
    ADD CONSTRAINT "esocial_integrations_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "rh"."employees"("id");



ALTER TABLE ONLY "rh"."esocial_logs"
    ADD CONSTRAINT "esocial_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."esocial_logs"
    ADD CONSTRAINT "esocial_logs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "rh"."esocial_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."fgts_config"
    ADD CONSTRAINT "fgts_config_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."financial_integration_config"
    ADD CONSTRAINT "financial_integration_config_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_application_evaluations"
    ADD CONSTRAINT "fk_application_employee" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_application_evaluations"
    ADD CONSTRAINT "fk_application_enrollment" FOREIGN KEY ("enrollment_id") REFERENCES "rh"."training_enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_application_evaluations"
    ADD CONSTRAINT "fk_application_gestor" FOREIGN KEY ("gestor_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_application_evaluations"
    ADD CONSTRAINT "fk_application_training" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_assignments"
    ADD CONSTRAINT "fk_assignments_employee" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."training_assignments"
    ADD CONSTRAINT "fk_assignments_position" FOREIGN KEY ("position_id") REFERENCES "rh"."positions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."training_assignments"
    ADD CONSTRAINT "fk_assignments_training" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_assignments"
    ADD CONSTRAINT "fk_assignments_unit" FOREIGN KEY ("unit_id") REFERENCES "rh"."units"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."employees"
    ADD CONSTRAINT "fk_employees_cargo_id" FOREIGN KEY ("cargo_id") REFERENCES "rh"."positions"("id");



ALTER TABLE ONLY "rh"."employees"
    ADD CONSTRAINT "fk_employees_departamento_id" FOREIGN KEY ("departamento_id") REFERENCES "rh"."units"("id");



ALTER TABLE ONLY "rh"."employment_contracts"
    ADD CONSTRAINT "fk_employment_contracts_employee_id" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_exam_alternatives"
    ADD CONSTRAINT "fk_exam_alternatives_question" FOREIGN KEY ("question_id") REFERENCES "rh"."training_exam_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_exam_answers"
    ADD CONSTRAINT "fk_exam_answers_alternative" FOREIGN KEY ("alternative_id") REFERENCES "rh"."training_exam_alternatives"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."training_exam_answers"
    ADD CONSTRAINT "fk_exam_answers_attempt" FOREIGN KEY ("attempt_id") REFERENCES "rh"."training_exam_attempts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_exam_answers"
    ADD CONSTRAINT "fk_exam_answers_question" FOREIGN KEY ("question_id") REFERENCES "rh"."training_exam_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_exam_attempts"
    ADD CONSTRAINT "fk_exam_attempts_employee" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_exam_attempts"
    ADD CONSTRAINT "fk_exam_attempts_exam" FOREIGN KEY ("exam_id") REFERENCES "rh"."training_exams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_exam_attempts"
    ADD CONSTRAINT "fk_exam_attempts_training" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_exam_questions"
    ADD CONSTRAINT "fk_exam_questions_exam" FOREIGN KEY ("exam_id") REFERENCES "rh"."training_exams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."medical_certificate_attachments"
    ADD CONSTRAINT "fk_med_cert_attachments_company_id" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_reaction_evaluations"
    ADD CONSTRAINT "fk_reaction_employee" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_reaction_evaluations"
    ADD CONSTRAINT "fk_reaction_enrollment" FOREIGN KEY ("enrollment_id") REFERENCES "rh"."training_enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_reaction_evaluations"
    ADD CONSTRAINT "fk_reaction_training" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_content"
    ADD CONSTRAINT "fk_training_content_training" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_exams"
    ADD CONSTRAINT "fk_training_exams_content" FOREIGN KEY ("content_id") REFERENCES "rh"."training_content"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."training_exams"
    ADD CONSTRAINT "fk_training_exams_training" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."flash_integration_config"
    ADD CONSTRAINT "flash_integration_config_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."flash_integration_config"
    ADD CONSTRAINT "flash_integration_config_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."gestor_notifications"
    ADD CONSTRAINT "gestor_notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."gestor_notifications"
    ADD CONSTRAINT "gestor_notifications_gestor_id_fkey" FOREIGN KEY ("gestor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."holidays"
    ADD CONSTRAINT "holidays_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."income_statements"
    ADD CONSTRAINT "income_statements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."income_statements"
    ADD CONSTRAINT "income_statements_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."inss_brackets"
    ADD CONSTRAINT "inss_brackets_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."irrf_brackets"
    ADD CONSTRAINT "irrf_brackets_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."job_openings"
    ADD CONSTRAINT "job_openings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."job_openings"
    ADD CONSTRAINT "job_openings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."job_openings"
    ADD CONSTRAINT "job_openings_job_request_id_fkey" FOREIGN KEY ("job_request_id") REFERENCES "rh"."job_requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."job_requests"
    ADD CONSTRAINT "job_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."job_requests"
    ADD CONSTRAINT "job_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."job_requests"
    ADD CONSTRAINT "job_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."location_zones"
    ADD CONSTRAINT "location_zones_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."medical_agreements"
    ADD CONSTRAINT "medical_agreements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."medical_certificate_attachments"
    ADD CONSTRAINT "medical_certificate_attachments_certificate_id_fkey" FOREIGN KEY ("certificate_id") REFERENCES "rh"."medical_certificates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."medical_certificate_attachments"
    ADD CONSTRAINT "medical_certificate_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."medical_certificates"
    ADD CONSTRAINT "medical_certificates_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."medical_certificates"
    ADD CONSTRAINT "medical_certificates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."medical_certificates"
    ADD CONSTRAINT "medical_certificates_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."medical_plan_age_ranges"
    ADD CONSTRAINT "medical_plan_age_ranges_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."medical_plan_age_ranges"
    ADD CONSTRAINT "medical_plan_age_ranges_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "rh"."medical_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."medical_plan_pricing_history"
    ADD CONSTRAINT "medical_plan_pricing_history_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."medical_plan_pricing_history"
    ADD CONSTRAINT "medical_plan_pricing_history_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."medical_plan_pricing_history"
    ADD CONSTRAINT "medical_plan_pricing_history_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "rh"."medical_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."medical_plans"
    ADD CONSTRAINT "medical_plans_agreement_id_fkey" FOREIGN KEY ("agreement_id") REFERENCES "rh"."medical_agreements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."medical_plans"
    ADD CONSTRAINT "medical_plans_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."medical_services_usage"
    ADD CONSTRAINT "medical_services_usage_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."medical_services_usage"
    ADD CONSTRAINT "medical_services_usage_dependent_id_fkey" FOREIGN KEY ("dependent_id") REFERENCES "rh"."employee_plan_dependents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."medical_services_usage"
    ADD CONSTRAINT "medical_services_usage_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."medical_services_usage"
    ADD CONSTRAINT "medical_services_usage_employee_plan_id_fkey" FOREIGN KEY ("employee_plan_id") REFERENCES "rh"."employee_medical_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."medical_services_usage"
    ADD CONSTRAINT "medical_services_usage_payroll_event_id_fkey" FOREIGN KEY ("payroll_event_id") REFERENCES "rh"."payroll_events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."monthly_benefit_processing"
    ADD CONSTRAINT "monthly_benefit_processing_benefit_config_id_fkey" FOREIGN KEY ("benefit_config_id") REFERENCES "rh"."benefit_configurations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."monthly_benefit_processing"
    ADD CONSTRAINT "monthly_benefit_processing_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."monthly_benefit_processing"
    ADD CONSTRAINT "monthly_benefit_processing_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."monthly_benefit_processing"
    ADD CONSTRAINT "monthly_benefit_processing_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."monthly_benefit_processing"
    ADD CONSTRAINT "monthly_benefit_processing_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."payroll"
    ADD CONSTRAINT "payroll_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."payroll_config"
    ADD CONSTRAINT "payroll_config_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."payroll"
    ADD CONSTRAINT "payroll_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."payroll_events"
    ADD CONSTRAINT "payroll_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."payroll_events"
    ADD CONSTRAINT "payroll_events_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."payroll_events"
    ADD CONSTRAINT "payroll_events_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "rh"."payroll"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."payroll_events"
    ADD CONSTRAINT "payroll_events_rubrica_id_fkey" FOREIGN KEY ("rubrica_id") REFERENCES "rh"."rubricas"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "rh"."payroll_overtime_events"
    ADD CONSTRAINT "payroll_overtime_events_closure_id_fkey" FOREIGN KEY ("closure_id") REFERENCES "rh"."bank_hours_closure"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."payroll_overtime_events"
    ADD CONSTRAINT "payroll_overtime_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."payroll_overtime_events"
    ADD CONSTRAINT "payroll_overtime_events_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."periodic_exams"
    ADD CONSTRAINT "periodic_exams_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."periodic_exams"
    ADD CONSTRAINT "periodic_exams_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."positions"
    ADD CONSTRAINT "positions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."reimbursement_requests"
    ADD CONSTRAINT "reimbursement_requests_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."reimbursement_requests"
    ADD CONSTRAINT "reimbursement_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."reimbursement_requests"
    ADD CONSTRAINT "reimbursement_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."reimbursement_requests"
    ADD CONSTRAINT "reimbursement_requests_solicitado_por_fkey" FOREIGN KEY ("solicitado_por") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."reports"
    ADD CONSTRAINT "reports_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."rubricas"
    ADD CONSTRAINT "rubricas_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."selection_processes"
    ADD CONSTRAINT "selection_processes_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "rh"."candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."selection_processes"
    ADD CONSTRAINT "selection_processes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."selection_processes"
    ADD CONSTRAINT "selection_processes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."selection_processes"
    ADD CONSTRAINT "selection_processes_job_opening_id_fkey" FOREIGN KEY ("job_opening_id") REFERENCES "rh"."job_openings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."selection_stages"
    ADD CONSTRAINT "selection_stages_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."selection_stages"
    ADD CONSTRAINT "selection_stages_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."selection_stages"
    ADD CONSTRAINT "selection_stages_selection_process_id_fkey" FOREIGN KEY ("selection_process_id") REFERENCES "rh"."selection_processes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."signature_month_control"
    ADD CONSTRAINT "signature_month_control_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."signature_month_control"
    ADD CONSTRAINT "signature_month_control_locked_by_fkey" FOREIGN KEY ("locked_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."signature_month_control"
    ADD CONSTRAINT "signature_month_control_unlocked_by_fkey" FOREIGN KEY ("unlocked_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."signature_notifications"
    ADD CONSTRAINT "signature_notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."signature_notifications"
    ADD CONSTRAINT "signature_notifications_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."signature_notifications"
    ADD CONSTRAINT "signature_notifications_signature_id_fkey" FOREIGN KEY ("signature_id") REFERENCES "rh"."time_record_signatures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."sobreaviso_escalas"
    ADD CONSTRAINT "sobreaviso_escalas_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."sobreaviso_escalas"
    ADD CONSTRAINT "sobreaviso_escalas_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."sobreaviso_escalas"
    ADD CONSTRAINT "sobreaviso_escalas_payroll_event_id_fkey" FOREIGN KEY ("payroll_event_id") REFERENCES "rh"."payroll_events"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."talent_pool"
    ADD CONSTRAINT "talent_pool_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "rh"."candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."talent_pool"
    ADD CONSTRAINT "talent_pool_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."time_bank"
    ADD CONSTRAINT "time_bank_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "rh"."time_bank"
    ADD CONSTRAINT "time_bank_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."time_bank"
    ADD CONSTRAINT "time_bank_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."time_record_event_photos"
    ADD CONSTRAINT "time_record_event_photos_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "rh"."time_record_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."time_record_events"
    ADD CONSTRAINT "time_record_events_time_record_id_fkey" FOREIGN KEY ("time_record_id") REFERENCES "rh"."time_records"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."time_record_settings"
    ADD CONSTRAINT "time_record_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."time_record_signature_config"
    ADD CONSTRAINT "time_record_signature_config_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."time_record_signatures"
    ADD CONSTRAINT "time_record_signatures_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."time_record_signatures"
    ADD CONSTRAINT "time_record_signatures_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."time_record_signatures"
    ADD CONSTRAINT "time_record_signatures_manager_approved_by_fkey" FOREIGN KEY ("manager_approved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "rh"."time_records"
    ADD CONSTRAINT "time_records_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."time_records"
    ADD CONSTRAINT "time_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."time_records"
    ADD CONSTRAINT "time_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_application_evaluations"
    ADD CONSTRAINT "training_application_evaluations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_application_evaluations"
    ADD CONSTRAINT "training_application_evaluations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_application_evaluations"
    ADD CONSTRAINT "training_application_evaluations_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "rh"."training_enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_application_evaluations"
    ADD CONSTRAINT "training_application_evaluations_gestor_id_fkey" FOREIGN KEY ("gestor_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_application_evaluations"
    ADD CONSTRAINT "training_application_evaluations_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_assignments"
    ADD CONSTRAINT "training_assignments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_assignments"
    ADD CONSTRAINT "training_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_assignments"
    ADD CONSTRAINT "training_assignments_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "rh"."positions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_assignments"
    ADD CONSTRAINT "training_assignments_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_assignments"
    ADD CONSTRAINT "training_assignments_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "rh"."units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_attendance"
    ADD CONSTRAINT "training_attendance_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_attendance"
    ADD CONSTRAINT "training_attendance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_attendance"
    ADD CONSTRAINT "training_attendance_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "rh"."training_attendance"
    ADD CONSTRAINT "training_attendance_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_certificates"
    ADD CONSTRAINT "training_certificates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_certificates"
    ADD CONSTRAINT "training_certificates_emitido_por_fkey" FOREIGN KEY ("emitido_por") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "rh"."training_certificates"
    ADD CONSTRAINT "training_certificates_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_certificates"
    ADD CONSTRAINT "training_certificates_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_content"
    ADD CONSTRAINT "training_content_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_content"
    ADD CONSTRAINT "training_content_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_enrollments"
    ADD CONSTRAINT "training_enrollments_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "rh"."training_enrollments"
    ADD CONSTRAINT "training_enrollments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_enrollments"
    ADD CONSTRAINT "training_enrollments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_enrollments"
    ADD CONSTRAINT "training_enrollments_inscrito_por_fkey" FOREIGN KEY ("inscrito_por") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "rh"."training_enrollments"
    ADD CONSTRAINT "training_enrollments_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_evaluations"
    ADD CONSTRAINT "training_evaluations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_evaluations"
    ADD CONSTRAINT "training_evaluations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_evaluations"
    ADD CONSTRAINT "training_evaluations_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_exam_alternatives"
    ADD CONSTRAINT "training_exam_alternatives_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_exam_alternatives"
    ADD CONSTRAINT "training_exam_alternatives_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "rh"."training_exam_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_exam_answers"
    ADD CONSTRAINT "training_exam_answers_alternative_id_fkey" FOREIGN KEY ("alternative_id") REFERENCES "rh"."training_exam_alternatives"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."training_exam_answers"
    ADD CONSTRAINT "training_exam_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "rh"."training_exam_attempts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_exam_answers"
    ADD CONSTRAINT "training_exam_answers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_exam_answers"
    ADD CONSTRAINT "training_exam_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "rh"."training_exam_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_exam_attempts"
    ADD CONSTRAINT "training_exam_attempts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_exam_attempts"
    ADD CONSTRAINT "training_exam_attempts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_exam_attempts"
    ADD CONSTRAINT "training_exam_attempts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "rh"."training_exams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_exam_attempts"
    ADD CONSTRAINT "training_exam_attempts_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_exam_questions"
    ADD CONSTRAINT "training_exam_questions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_exam_questions"
    ADD CONSTRAINT "training_exam_questions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "rh"."training_exams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_exams"
    ADD CONSTRAINT "training_exams_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_exams"
    ADD CONSTRAINT "training_exams_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "rh"."training_content"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."training_exams"
    ADD CONSTRAINT "training_exams_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_history"
    ADD CONSTRAINT "training_notification_history_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_history"
    ADD CONSTRAINT "training_notification_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_history"
    ADD CONSTRAINT "training_notification_history_notification_type_id_fkey" FOREIGN KEY ("notification_type_id") REFERENCES "rh"."training_notification_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_history"
    ADD CONSTRAINT "training_notification_history_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_history"
    ADD CONSTRAINT "training_notification_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_queue"
    ADD CONSTRAINT "training_notification_queue_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_queue"
    ADD CONSTRAINT "training_notification_queue_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_queue"
    ADD CONSTRAINT "training_notification_queue_notification_type_id_fkey" FOREIGN KEY ("notification_type_id") REFERENCES "rh"."training_notification_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_queue"
    ADD CONSTRAINT "training_notification_queue_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_queue"
    ADD CONSTRAINT "training_notification_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_rules"
    ADD CONSTRAINT "training_notification_rules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_rules"
    ADD CONSTRAINT "training_notification_rules_notification_type_id_fkey" FOREIGN KEY ("notification_type_id") REFERENCES "rh"."training_notification_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_rules"
    ADD CONSTRAINT "training_notification_rules_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_notification_types"
    ADD CONSTRAINT "training_notification_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_progress"
    ADD CONSTRAINT "training_progress_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_progress"
    ADD CONSTRAINT "training_progress_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "rh"."training_content"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_progress"
    ADD CONSTRAINT "training_progress_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_progress"
    ADD CONSTRAINT "training_progress_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "rh"."training_enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_progress"
    ADD CONSTRAINT "training_progress_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_reaction_evaluations"
    ADD CONSTRAINT "training_reaction_evaluations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_reaction_evaluations"
    ADD CONSTRAINT "training_reaction_evaluations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_reaction_evaluations"
    ADD CONSTRAINT "training_reaction_evaluations_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "rh"."training_enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_reaction_evaluations"
    ADD CONSTRAINT "training_reaction_evaluations_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "rh"."trainings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."training_settings"
    ADD CONSTRAINT "training_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."trainings"
    ADD CONSTRAINT "trainings_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "rh"."trainings"
    ADD CONSTRAINT "trainings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."union_contributions"
    ADD CONSTRAINT "union_contributions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."union_contributions"
    ADD CONSTRAINT "union_contributions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."union_contributions"
    ADD CONSTRAINT "union_contributions_union_id_fkey" FOREIGN KEY ("union_id") REFERENCES "rh"."unions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."union_negotiations"
    ADD CONSTRAINT "union_negotiations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."union_negotiations"
    ADD CONSTRAINT "union_negotiations_union_id_fkey" FOREIGN KEY ("union_id") REFERENCES "rh"."unions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."union_representatives"
    ADD CONSTRAINT "union_representatives_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."union_representatives"
    ADD CONSTRAINT "union_representatives_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."union_representatives"
    ADD CONSTRAINT "union_representatives_union_id_fkey" FOREIGN KEY ("union_id") REFERENCES "rh"."unions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."unions"
    ADD CONSTRAINT "unions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."units"
    ADD CONSTRAINT "units_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."units"
    ADD CONSTRAINT "units_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "rh"."units"
    ADD CONSTRAINT "units_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "rh"."employees"("id");



ALTER TABLE ONLY "rh"."vacation_entitlements"
    ADD CONSTRAINT "vacation_entitlements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."vacation_entitlements"
    ADD CONSTRAINT "vacation_entitlements_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."vacation_periods"
    ADD CONSTRAINT "vacation_periods_vacation_id_fkey" FOREIGN KEY ("vacation_id") REFERENCES "rh"."vacations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."vacations"
    ADD CONSTRAINT "vacations_aprovado_por_fkey" FOREIGN KEY ("aprovado_por") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."vacations"
    ADD CONSTRAINT "vacations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."vacations"
    ADD CONSTRAINT "vacations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "rh"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."vacations"
    ADD CONSTRAINT "vacations_solicitado_por_fkey" FOREIGN KEY ("solicitado_por") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "rh"."work_schedules"
    ADD CONSTRAINT "work_schedules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "rh"."work_shifts"
    ADD CONSTRAINT "work_shifts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete income statements" ON "rh"."income_statements" FOR DELETE USING ("public"."is_admin_simple"("auth"."uid"()));



CREATE POLICY "Admins can insert income statements" ON "rh"."income_statements" FOR INSERT WITH CHECK ("public"."is_admin_simple"("auth"."uid"()));



CREATE POLICY "Admins can manage approval levels" ON "rh"."approval_levels" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true) AND (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."permissoes" ->> 'admin'::"text") = 'true'::"text"))))))));



CREATE POLICY "Admins can manage approvers" ON "rh"."approval_level_approvers" USING (("approval_level_id" IN ( SELECT "approval_levels"."id"
   FROM "rh"."approval_levels"
  WHERE ("approval_levels"."company_id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true) AND (EXISTS ( SELECT 1
                   FROM "public"."profiles"
                  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."permissoes" ->> 'admin'::"text") = 'true'::"text"))))))))));



CREATE POLICY "Admins can manage audit config" ON "rh"."audit_config" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true) AND (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."permissoes" ->> 'admin'::"text") = 'true'::"text"))))))));



CREATE POLICY "Admins can manage location zones" ON "rh"."location_zones" USING ((("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))) AND (EXISTS ( SELECT 1
   FROM ("public"."user_companies" "uc"
     JOIN "public"."entity_permissions" "ep" ON (("ep"."profile_id" = "uc"."profile_id")))
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."company_id" = "location_zones"."company_id") AND ("ep"."entity_name" = 'registros_ponto'::"text") AND ("ep"."can_edit" = true)))))) WITH CHECK ((("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))) AND (EXISTS ( SELECT 1
   FROM ("public"."user_companies" "uc"
     JOIN "public"."entity_permissions" "ep" ON (("ep"."profile_id" = "uc"."profile_id")))
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."company_id" = "location_zones"."company_id") AND ("ep"."entity_name" = 'registros_ponto'::"text") AND ("ep"."can_edit" = true))))));



COMMENT ON POLICY "Admins can manage location zones" ON "rh"."location_zones" IS 'Permite que administradores gerenciem zonas de localizaÃ§Ã£o se tiverem permissÃ£o de editar registros_ponto';



CREATE POLICY "Admins can update income statements" ON "rh"."income_statements" FOR UPDATE USING ("public"."is_admin_simple"("auth"."uid"()));



CREATE POLICY "Admins can view all income statements" ON "rh"."income_statements" FOR SELECT USING ("public"."is_admin_simple"("auth"."uid"()));



CREATE POLICY "Approvers can manage their approvals" ON "rh"."compensation_approvals" USING ((("approver_id" = "auth"."uid"()) OR ("compensation_request_id" IN ( SELECT "compensation_requests"."id"
   FROM "rh"."compensation_requests"
  WHERE ("compensation_requests"."company_id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true) AND (EXISTS ( SELECT 1
                   FROM "public"."profiles"
                  WHERE (("profiles"."id" = "auth"."uid"()) AND ((("profiles"."permissoes" ->> 'admin'::"text") = 'true'::"text") OR (("profiles"."permissoes" ->> 'manager'::"text") = 'true'::"text"))))))))))));



CREATE POLICY "Employees can view their own periodic exams" ON "rh"."periodic_exams" FOR SELECT USING (("employee_id" IN ( SELECT "employees"."id"
   FROM "rh"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"()))));



COMMENT ON POLICY "Employees can view their own periodic exams" ON "rh"."periodic_exams" IS 'Permite que colaboradores visualizem apenas seus prÃ³prios exames periÃ³dicos';



CREATE POLICY "System can insert audit logs" ON "rh"."audit_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can manage notification queue" ON "rh"."training_notification_queue" USING (true);



CREATE POLICY "Users can access their company's integration config" ON "rh"."financial_integration_config" USING ((("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))) OR "public"."is_admin"("auth"."uid"())));



CREATE POLICY "Users can delete absence_types from their company" ON "rh"."absence_types" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'absence_types'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete allowance_types from their company" ON "rh"."allowance_types" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'allowance_types'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete cid_codes from their company" ON "rh"."cid_codes" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'cid_codes'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete compensation_requests from their company" ON "rh"."compensation_requests" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'compensation_requests'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete deficiency_types from their company" ON "rh"."deficiency_types" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'deficiency_types'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete delay_reasons from their company" ON "rh"."delay_reasons" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'delay_reasons'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete dependents from their company" ON "rh"."dependents" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



COMMENT ON POLICY "Users can delete dependents from their company" ON "rh"."dependents" IS 'Permite excluir dependentes da empresa do usuÃ¡rio';



CREATE POLICY "Users can delete disciplinary actions from their company" ON "rh"."disciplinary_actions" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'disciplinary_actions'::"text", 'delete'::"text")));



COMMENT ON POLICY "Users can delete disciplinary actions from their company" ON "rh"."disciplinary_actions" IS 'Permite excluir ações disciplinares da empresa do usuário';



CREATE POLICY "Users can delete employee location zones from their company" ON "rh"."employee_location_zones" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("rh"."employees" "e"
     JOIN "public"."user_companies" "uc" ON (("e"."company_id" = "uc"."company_id")))
  WHERE (("e"."id" = "employee_location_zones"."employee_id") AND ("uc"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete employee_shifts from their company" ON "rh"."employee_shifts" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employee_shifts'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete employees from their company" ON "rh"."employees" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete employment_contracts from their company" ON "rh"."employment_contracts" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employment_contracts'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete equipment_rental_monthly_payments from their c" ON "rh"."equipment_rental_monthly_payments" FOR DELETE USING ("public"."user_has_company_access"("auth"."uid"(), "company_id"));



CREATE POLICY "Users can delete esocial_integrations from their company" ON "rh"."esocial_integrations" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'esocial_integrations'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete fgts_config from their company" ON "rh"."fgts_config" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'fgts_config'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete flash_integration_config from their company" ON "rh"."flash_integration_config" FOR DELETE USING ("public"."user_has_company_access"("auth"."uid"(), "company_id"));



CREATE POLICY "Users can delete inss_brackets from their company" ON "rh"."inss_brackets" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'inss_brackets'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete irrf_brackets from their company" ON "rh"."irrf_brackets" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'irrf_brackets'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete medical certificate attachments from their com" ON "rh"."medical_certificate_attachments" FOR DELETE USING (("certificate_id" IN ( SELECT "medical_certificates"."id"
   FROM "rh"."medical_certificates"
  WHERE ("medical_certificates"."company_id" = ANY ("public"."get_user_companies"())))));



CREATE POLICY "Users can delete periodic exams from their company" ON "rh"."periodic_exams" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



COMMENT ON POLICY "Users can delete periodic exams from their company" ON "rh"."periodic_exams" IS 'Permite que usuÃ¡rios deletem exames periÃ³dicos da sua empresa';



CREATE POLICY "Users can delete positions from their company" ON "rh"."positions" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete reports from their company" ON "rh"."reports" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'reports'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete rubricas from their company" ON "rh"."rubricas" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'rubricas'::"text", 'delete'::"text")));



CREATE POLICY "Users can delete sobreaviso_escalas from their company" ON "rh"."sobreaviso_escalas" FOR DELETE USING ("public"."user_has_company_access"("auth"."uid"(), "company_id"));



CREATE POLICY "Users can delete time record settings for their company" ON "rh"."time_record_settings" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can delete time_record_event_photos from their company" ON "rh"."time_record_event_photos" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "rh"."time_record_events" "e"
  WHERE (("e"."id" = "time_record_event_photos"."event_id") AND ("e"."company_id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true))))))));



CREATE POLICY "Users can delete time_record_events from their company" ON "rh"."time_record_events" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can delete training content from their company" ON "rh"."training_content" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can delete training settings for their company" ON "rh"."training_settings" FOR DELETE USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE ("user_companies"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can delete units from their company" ON "rh"."units" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can delete work_shifts from their company" ON "rh"."work_shifts" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'work_shifts'::"text", 'delete'::"text")));



CREATE POLICY "Users can insert absence_types in their company" ON "rh"."absence_types" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'absence_types'::"text", 'create'::"text")));



CREATE POLICY "Users can insert allowance_types in their company" ON "rh"."allowance_types" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'allowance_types'::"text", 'create'::"text")));



CREATE POLICY "Users can insert cid_codes in their company" ON "rh"."cid_codes" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'cid_codes'::"text", 'create'::"text")));



CREATE POLICY "Users can insert compensation_requests in their company" ON "rh"."compensation_requests" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'compensation_requests'::"text", 'create'::"text")));



CREATE POLICY "Users can insert deficiency_types in their company" ON "rh"."deficiency_types" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'deficiency_types'::"text", 'create'::"text")));



CREATE POLICY "Users can insert delay_reasons in their company" ON "rh"."delay_reasons" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'delay_reasons'::"text", 'create'::"text")));



CREATE POLICY "Users can insert dependents in their company" ON "rh"."dependents" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



COMMENT ON POLICY "Users can insert dependents in their company" ON "rh"."dependents" IS 'Permite inserir dependentes na empresa do usuÃ¡rio';



CREATE POLICY "Users can insert disciplinary actions in their company" ON "rh"."disciplinary_actions" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'disciplinary_actions'::"text", 'create'::"text")));



COMMENT ON POLICY "Users can insert disciplinary actions in their company" ON "rh"."disciplinary_actions" IS 'Permite criar ações disciplinares na empresa do usuário';



CREATE POLICY "Users can insert employee location zones for their company" ON "rh"."employee_location_zones" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM ("rh"."employees" "e"
     JOIN "public"."user_companies" "uc" ON (("e"."company_id" = "uc"."company_id")))
  WHERE (("e"."id" = "employee_location_zones"."employee_id") AND ("uc"."user_id" = "auth"."uid"())))) AND (EXISTS ( SELECT 1
   FROM ("rh"."location_zones" "lz"
     JOIN "public"."user_companies" "uc" ON (("lz"."company_id" = "uc"."company_id")))
  WHERE (("lz"."id" = "employee_location_zones"."location_zone_id") AND ("uc"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can insert employee_shifts in their company" ON "rh"."employee_shifts" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employee_shifts'::"text", 'create'::"text")));



CREATE POLICY "Users can insert employees in their company" ON "rh"."employees" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert employment_contracts in their company" ON "rh"."employment_contracts" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employment_contracts'::"text", 'create'::"text")));



CREATE POLICY "Users can insert equipment_rental_monthly_payments in their com" ON "rh"."equipment_rental_monthly_payments" FOR INSERT WITH CHECK ("public"."user_has_company_access"("auth"."uid"(), "company_id"));



CREATE POLICY "Users can insert esocial_integrations in their company" ON "rh"."esocial_integrations" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'esocial_integrations'::"text", 'create'::"text")));



CREATE POLICY "Users can insert fgts_config in their company" ON "rh"."fgts_config" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'fgts_config'::"text", 'create'::"text")));



CREATE POLICY "Users can insert flash_integration_config in their company" ON "rh"."flash_integration_config" FOR INSERT WITH CHECK ("public"."user_has_company_access"("auth"."uid"(), "company_id"));



CREATE POLICY "Users can insert inss_brackets in their company" ON "rh"."inss_brackets" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'inss_brackets'::"text", 'create'::"text")));



CREATE POLICY "Users can insert irrf_brackets in their company" ON "rh"."irrf_brackets" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'irrf_brackets'::"text", 'create'::"text")));



CREATE POLICY "Users can insert medical certificate attachments in their compa" ON "rh"."medical_certificate_attachments" FOR INSERT WITH CHECK (("certificate_id" IN ( SELECT "medical_certificates"."id"
   FROM "rh"."medical_certificates"
  WHERE ("medical_certificates"."company_id" = ANY ("public"."get_user_companies"())))));



CREATE POLICY "Users can insert notifications for their company" ON "rh"."signature_notifications" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert periodic exams in their company" ON "rh"."periodic_exams" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



COMMENT ON POLICY "Users can insert periodic exams in their company" ON "rh"."periodic_exams" IS 'Permite que usuÃ¡rios insiram exames periÃ³dicos na sua empresa';



CREATE POLICY "Users can insert positions in their company" ON "rh"."positions" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert reports in their company" ON "rh"."reports" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'reports'::"text", 'create'::"text")));



CREATE POLICY "Users can insert rubricas in their company" ON "rh"."rubricas" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'rubricas'::"text", 'create'::"text")));



CREATE POLICY "Users can insert signature config for their company" ON "rh"."time_record_signature_config" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert signatures for their company" ON "rh"."time_record_signatures" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert sobreaviso_escalas in their company" ON "rh"."sobreaviso_escalas" FOR INSERT WITH CHECK ("public"."user_has_company_access"("auth"."uid"(), "company_id"));



CREATE POLICY "Users can insert their own exam attempts" ON "rh"."training_exam_attempts" FOR INSERT WITH CHECK ((("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))) AND ("employee_id" IN ( SELECT "employees"."id"
   FROM "rh"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert their own training progress" ON "rh"."training_progress" FOR INSERT WITH CHECK ((("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))) AND ("employee_id" IN ( SELECT "employees"."id"
   FROM "rh"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert time record settings for their company" ON "rh"."time_record_settings" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can insert time_record_event_photos in their company" ON "rh"."time_record_event_photos" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "rh"."time_record_events" "e"
  WHERE (("e"."id" = "time_record_event_photos"."event_id") AND ("e"."company_id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true))))))));



CREATE POLICY "Users can insert time_record_events in their company" ON "rh"."time_record_events" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can insert training content in their company" ON "rh"."training_content" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can insert training settings for their company" ON "rh"."training_settings" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE ("user_companies"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can insert units in their company" ON "rh"."units" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can insert work_shifts in their company" ON "rh"."work_shifts" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'work_shifts'::"text", 'create'::"text")));



CREATE POLICY "Users can manage application evaluations" ON "rh"."training_application_evaluations" USING ((("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))) AND (("gestor_id" IN ( SELECT "employees"."id"
   FROM "rh"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "rh"."employees" "e"
  WHERE (("e"."id" = "training_application_evaluations"."gestor_id") AND ("e"."company_id" = "training_application_evaluations"."company_id")))))));



CREATE POLICY "Users can manage bank hours assignments for their companies" ON "rh"."bank_hours_assignments" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can manage bank hours balance for their companies" ON "rh"."bank_hours_balance" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can manage bank hours calculations for their companies" ON "rh"."bank_hours_calculations" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can manage bank hours closure for their companies" ON "rh"."bank_hours_closure" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can manage bank hours config for their companies" ON "rh"."bank_hours_config" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can manage bank hours transactions for their companies" ON "rh"."bank_hours_transactions" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can manage bank hours types for their companies" ON "rh"."bank_hours_types" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can manage exam alternatives in their company" ON "rh"."training_exam_alternatives" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can manage exam questions in their company" ON "rh"."training_exam_questions" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can manage legacy bank hour imports for their companies" ON "rh"."bank_hours_legacy_imports" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can manage month control for their company" ON "rh"."signature_month_control" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can manage notification rules of their company" ON "rh"."training_notification_rules" USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'training_notification_rules'::"text", 'manage'::"text")));



CREATE POLICY "Users can manage notification types of their company" ON "rh"."training_notification_types" USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'training_notification_types'::"text", 'manage'::"text")));



CREATE POLICY "Users can manage payroll overtime events for their companies" ON "rh"."payroll_overtime_events" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can manage their own exam answers" ON "rh"."training_exam_answers" USING ((("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))) AND (EXISTS ( SELECT 1
   FROM "rh"."training_exam_attempts" "tea"
  WHERE (("tea"."id" = "training_exam_answers"."attempt_id") AND ("tea"."employee_id" IN ( SELECT "employees"."id"
           FROM "rh"."employees"
          WHERE ("employees"."user_id" = "auth"."uid"()))))))));



CREATE POLICY "Users can manage their own reaction evaluations" ON "rh"."training_reaction_evaluations" USING ((("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))) AND (("employee_id" IN ( SELECT "employees"."id"
   FROM "rh"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "rh"."employees" "e"
  WHERE (("e"."id" = "training_reaction_evaluations"."employee_id") AND ("e"."company_id" = "training_reaction_evaluations"."company_id")))))));



CREATE POLICY "Users can manage training assignments in their company" ON "rh"."training_assignments" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can manage training exams in their company" ON "rh"."training_exams" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can update absence_types from their company" ON "rh"."absence_types" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'absence_types'::"text", 'edit'::"text")));



CREATE POLICY "Users can update allowance_types from their company" ON "rh"."allowance_types" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'allowance_types'::"text", 'edit'::"text")));



CREATE POLICY "Users can update cid_codes from their company" ON "rh"."cid_codes" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'cid_codes'::"text", 'edit'::"text")));



CREATE POLICY "Users can update compensation_requests from their company" ON "rh"."compensation_requests" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'compensation_requests'::"text", 'edit'::"text")));



CREATE POLICY "Users can update deficiency_types from their company" ON "rh"."deficiency_types" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'deficiency_types'::"text", 'edit'::"text")));



CREATE POLICY "Users can update delay_reasons from their company" ON "rh"."delay_reasons" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'delay_reasons'::"text", 'edit'::"text")));



CREATE POLICY "Users can update dependents from their company" ON "rh"."dependents" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



COMMENT ON POLICY "Users can update dependents from their company" ON "rh"."dependents" IS 'Permite atualizar dependentes da empresa do usuÃ¡rio';



CREATE POLICY "Users can update disciplinary actions from their company" ON "rh"."disciplinary_actions" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'disciplinary_actions'::"text", 'edit'::"text")));



COMMENT ON POLICY "Users can update disciplinary actions from their company" ON "rh"."disciplinary_actions" IS 'Permite editar ações disciplinares da empresa do usuário';



CREATE POLICY "Users can update employee location zones for their company" ON "rh"."employee_location_zones" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("rh"."employees" "e"
     JOIN "public"."user_companies" "uc" ON (("e"."company_id" = "uc"."company_id")))
  WHERE (("e"."id" = "employee_location_zones"."employee_id") AND ("uc"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("rh"."employees" "e"
     JOIN "public"."user_companies" "uc" ON (("e"."company_id" = "uc"."company_id")))
  WHERE (("e"."id" = "employee_location_zones"."employee_id") AND ("uc"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update employee_shifts from their company" ON "rh"."employee_shifts" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employee_shifts'::"text", 'edit'::"text")));



CREATE POLICY "Users can update employees from their company" ON "rh"."employees" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update employment_contracts from their company" ON "rh"."employment_contracts" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employment_contracts'::"text", 'edit'::"text")));



CREATE POLICY "Users can update equipment_rental_monthly_payments from their c" ON "rh"."equipment_rental_monthly_payments" FOR UPDATE USING ("public"."user_has_company_access"("auth"."uid"(), "company_id"));



CREATE POLICY "Users can update esocial_integrations from their company" ON "rh"."esocial_integrations" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'esocial_integrations'::"text", 'edit'::"text")));



CREATE POLICY "Users can update fgts_config from their company" ON "rh"."fgts_config" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'fgts_config'::"text", 'edit'::"text")));



CREATE POLICY "Users can update flash_integration_config from their company" ON "rh"."flash_integration_config" FOR UPDATE USING ("public"."user_has_company_access"("auth"."uid"(), "company_id"));



CREATE POLICY "Users can update inss_brackets from their company" ON "rh"."inss_brackets" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'inss_brackets'::"text", 'edit'::"text")));



CREATE POLICY "Users can update irrf_brackets from their company" ON "rh"."irrf_brackets" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'irrf_brackets'::"text", 'edit'::"text")));



CREATE POLICY "Users can update medical certificate attachments from their com" ON "rh"."medical_certificate_attachments" FOR UPDATE USING (("certificate_id" IN ( SELECT "medical_certificates"."id"
   FROM "rh"."medical_certificates"
  WHERE ("medical_certificates"."company_id" = ANY ("public"."get_user_companies"())))));



CREATE POLICY "Users can update periodic exams from their company" ON "rh"."periodic_exams" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



COMMENT ON POLICY "Users can update periodic exams from their company" ON "rh"."periodic_exams" IS 'Permite que usuÃ¡rios atualizem exames periÃ³dicos da sua empresa';



CREATE POLICY "Users can update positions from their company" ON "rh"."positions" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update reports from their company" ON "rh"."reports" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'reports'::"text", 'edit'::"text")));



CREATE POLICY "Users can update rubricas from their company" ON "rh"."rubricas" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'rubricas'::"text", 'edit'::"text")));



CREATE POLICY "Users can update signature config for their company" ON "rh"."time_record_signature_config" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update signatures for their company" ON "rh"."time_record_signatures" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update sobreaviso_escalas from their company" ON "rh"."sobreaviso_escalas" FOR UPDATE USING ("public"."user_has_company_access"("auth"."uid"(), "company_id"));



CREATE POLICY "Users can update their own exam attempts" ON "rh"."training_exam_attempts" FOR UPDATE USING ((("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))) AND ("employee_id" IN ( SELECT "employees"."id"
   FROM "rh"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own training progress" ON "rh"."training_progress" FOR UPDATE USING ((("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))) AND ("employee_id" IN ( SELECT "employees"."id"
   FROM "rh"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update time record settings for their company" ON "rh"."time_record_settings" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can update time_record_event_photos from their company" ON "rh"."time_record_event_photos" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "rh"."time_record_events" "e"
  WHERE (("e"."id" = "time_record_event_photos"."event_id") AND ("e"."company_id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true))))))));



CREATE POLICY "Users can update time_record_events from their company" ON "rh"."time_record_events" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can update training content from their company" ON "rh"."training_content" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can update training settings for their company" ON "rh"."training_settings" FOR UPDATE USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE ("user_companies"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update units from their company" ON "rh"."units" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update work_shifts from their company" ON "rh"."work_shifts" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'work_shifts'::"text", 'edit'::"text")));



CREATE POLICY "Users can view absence_types from their company" ON "rh"."absence_types" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'absence_types'::"text", 'read'::"text")));



CREATE POLICY "Users can view allowance_types from their company" ON "rh"."allowance_types" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'allowance_types'::"text", 'read'::"text")));



CREATE POLICY "Users can view application evaluations from their company" ON "rh"."training_application_evaluations" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view approval levels of their company" ON "rh"."approval_levels" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view approvals of their company" ON "rh"."compensation_approvals" FOR SELECT USING (("compensation_request_id" IN ( SELECT "compensation_requests"."id"
   FROM "rh"."compensation_requests"
  WHERE ("compensation_requests"."company_id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))))));



CREATE POLICY "Users can view approvers of their company" ON "rh"."approval_level_approvers" FOR SELECT USING (("approval_level_id" IN ( SELECT "approval_levels"."id"
   FROM "rh"."approval_levels"
  WHERE ("approval_levels"."company_id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))))));



CREATE POLICY "Users can view audit logs of their company" ON "rh"."audit_logs" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view bank hours assignments for their companies" ON "rh"."bank_hours_assignments" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view bank hours balance for their companies" ON "rh"."bank_hours_balance" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view bank hours calculations for their companies" ON "rh"."bank_hours_calculations" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view bank hours closure for their companies" ON "rh"."bank_hours_closure" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view bank hours config for their companies" ON "rh"."bank_hours_config" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view bank hours transactions for their companies" ON "rh"."bank_hours_transactions" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view bank hours types for their companies" ON "rh"."bank_hours_types" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view cid_codes from their company" ON "rh"."cid_codes" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'cid_codes'::"text", 'read'::"text")));



CREATE POLICY "Users can view compensation_requests from their company" ON "rh"."compensation_requests" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'compensation_requests'::"text", 'read'::"text")));



CREATE POLICY "Users can view deficiency_types from their company" ON "rh"."deficiency_types" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'deficiency_types'::"text", 'read'::"text")));



CREATE POLICY "Users can view delay_reasons from their company" ON "rh"."delay_reasons" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'delay_reasons'::"text", 'read'::"text")));



CREATE POLICY "Users can view dependents from their company" ON "rh"."dependents" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



COMMENT ON POLICY "Users can view dependents from their company" ON "rh"."dependents" IS 'Permite visualizar dependentes da empresa do usuÃ¡rio';



CREATE POLICY "Users can view disciplinary actions from their company" ON "rh"."disciplinary_actions" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'disciplinary_actions'::"text", 'read'::"text")));



COMMENT ON POLICY "Users can view disciplinary actions from their company" ON "rh"."disciplinary_actions" IS 'Permite visualizar ações disciplinares da empresa do usuário';



CREATE POLICY "Users can view employee location zones from their company" ON "rh"."employee_location_zones" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("rh"."employees" "e"
     JOIN "public"."user_companies" "uc" ON (("e"."company_id" = "uc"."company_id")))
  WHERE (("e"."id" = "employee_location_zones"."employee_id") AND ("uc"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view employee_shifts from their company" ON "rh"."employee_shifts" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employee_shifts'::"text", 'read'::"text")));



CREATE POLICY "Users can view employees from their company" ON "rh"."employees" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view employment_contracts from their company" ON "rh"."employment_contracts" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employment_contracts'::"text", 'read'::"text")));



CREATE POLICY "Users can view equipment_rental_monthly_payments from their com" ON "rh"."equipment_rental_monthly_payments" FOR SELECT USING ("public"."user_has_company_access"("auth"."uid"(), "company_id"));



CREATE POLICY "Users can view esocial_integrations from their company" ON "rh"."esocial_integrations" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'esocial_integrations'::"text", 'read'::"text")));



CREATE POLICY "Users can view exam alternatives from their company" ON "rh"."training_exam_alternatives" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view exam questions from their company" ON "rh"."training_exam_questions" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view fgts_config from their company" ON "rh"."fgts_config" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'fgts_config'::"text", 'read'::"text")));



CREATE POLICY "Users can view flash_integration_config from their company" ON "rh"."flash_integration_config" FOR SELECT USING ("public"."user_has_company_access"("auth"."uid"(), "company_id"));



CREATE POLICY "Users can view inss_brackets from their company" ON "rh"."inss_brackets" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'inss_brackets'::"text", 'read'::"text")));



CREATE POLICY "Users can view irrf_brackets from their company" ON "rh"."irrf_brackets" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'irrf_brackets'::"text", 'read'::"text")));



CREATE POLICY "Users can view legacy bank hour imports for their companies" ON "rh"."bank_hours_legacy_imports" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view location zones of their company" ON "rh"."location_zones" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



COMMENT ON POLICY "Users can view location zones of their company" ON "rh"."location_zones" IS 'Permite que usuÃ¡rios vejam zonas de localizaÃ§Ã£o da sua empresa';



CREATE POLICY "Users can view medical certificate attachments from their compa" ON "rh"."medical_certificate_attachments" FOR SELECT USING (("certificate_id" IN ( SELECT "medical_certificates"."id"
   FROM "rh"."medical_certificates"
  WHERE ("medical_certificates"."company_id" = ANY ("public"."get_user_companies"())))));



CREATE POLICY "Users can view month control for their company" ON "rh"."signature_month_control" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view notification history of their company" ON "rh"."training_notification_history" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'training_notification_history'::"text", 'read'::"text")));



CREATE POLICY "Users can view notification queue of their company" ON "rh"."training_notification_queue" FOR SELECT USING (("company_id" = ANY ("public"."get_user_companies"())));



CREATE POLICY "Users can view notification rules of their company" ON "rh"."training_notification_rules" FOR SELECT USING (("company_id" = ANY ("public"."get_user_companies"())));



CREATE POLICY "Users can view notification types of their company" ON "rh"."training_notification_types" FOR SELECT USING (("company_id" = ANY ("public"."get_user_companies"())));



CREATE POLICY "Users can view notifications for their company" ON "rh"."signature_notifications" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view payroll overtime events for their companies" ON "rh"."payroll_overtime_events" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view periodic exams from their company" ON "rh"."periodic_exams" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



COMMENT ON POLICY "Users can view periodic exams from their company" ON "rh"."periodic_exams" IS 'Permite que usuÃ¡rios visualizem exames periÃ³dicos da sua empresa';



CREATE POLICY "Users can view positions from their company" ON "rh"."positions" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view reaction evaluations from their company" ON "rh"."training_reaction_evaluations" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view reports from their company" ON "rh"."reports" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'reports'::"text", 'read'::"text")));



CREATE POLICY "Users can view rubricas from their company" ON "rh"."rubricas" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'rubricas'::"text", 'read'::"text")));



CREATE POLICY "Users can view signature config for their company" ON "rh"."time_record_signature_config" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view signatures for their company" ON "rh"."time_record_signatures" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view sobreaviso_escalas from their company" ON "rh"."sobreaviso_escalas" FOR SELECT USING ("public"."user_has_company_access"("auth"."uid"(), "company_id"));



CREATE POLICY "Users can view their own exam answers" ON "rh"."training_exam_answers" FOR SELECT USING ((("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))) AND (EXISTS ( SELECT 1
   FROM "rh"."training_exam_attempts" "tea"
  WHERE (("tea"."id" = "training_exam_answers"."attempt_id") AND ("tea"."employee_id" IN ( SELECT "employees"."id"
           FROM "rh"."employees"
          WHERE ("employees"."user_id" = "auth"."uid"()))))))));



CREATE POLICY "Users can view their own exam attempts" ON "rh"."training_exam_attempts" FOR SELECT USING ((("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))) AND (("employee_id" IN ( SELECT "employees"."id"
   FROM "rh"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "rh"."employees" "e"
  WHERE (("e"."id" = "training_exam_attempts"."employee_id") AND ("e"."company_id" = "training_exam_attempts"."company_id")))))));



CREATE POLICY "Users can view their own income statements" ON "rh"."income_statements" FOR SELECT USING (("employee_id" IN ( SELECT "employees"."id"
   FROM "rh"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own notification history" ON "rh"."training_notification_history" FOR SELECT USING ((("user_id" = "auth"."uid"()) AND ("company_id" = ANY ("public"."get_user_companies"()))));



CREATE POLICY "Users can view their own training progress" ON "rh"."training_progress" FOR SELECT USING ((("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))) AND (("employee_id" IN ( SELECT "employees"."id"
   FROM "rh"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "rh"."employees" "e"
  WHERE (("e"."id" = "training_progress"."employee_id") AND ("e"."company_id" = "training_progress"."company_id")))))));



CREATE POLICY "Users can view time record settings for their company" ON "rh"."time_record_settings" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view time_record_event_photos from their company" ON "rh"."time_record_event_photos" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "rh"."time_record_events" "e"
  WHERE (("e"."id" = "time_record_event_photos"."event_id") AND ("e"."company_id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true))))))));



CREATE POLICY "Users can view time_record_events from their company" ON "rh"."time_record_events" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view training assignments from their company" ON "rh"."training_assignments" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view training content from their company" ON "rh"."training_content" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view training exams from their company" ON "rh"."training_exams" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "Users can view training settings for their company" ON "rh"."training_settings" FOR SELECT USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE ("user_companies"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view units from their company" ON "rh"."units" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view work_shifts from their company" ON "rh"."work_shifts" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'work_shifts'::"text", 'read'::"text")));



CREATE POLICY "Users with any company can delete any training enrollment" ON "rh"."training_enrollments" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users with any company can insert training attendance for any c" ON "rh"."training_attendance" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users with any company can insert training certificates for any" ON "rh"."training_certificates" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users with any company can insert training enrollments for any " ON "rh"."training_enrollments" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users with any company can insert training evaluations for any " ON "rh"."training_evaluations" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users with any company can update any training attendance" ON "rh"."training_attendance" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users with any company can update any training certificate" ON "rh"."training_certificates" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users with any company can update any training enrollment" ON "rh"."training_enrollments" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users with any company can update any training evaluation" ON "rh"."training_evaluations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users with any company can view all training attendance" ON "rh"."training_attendance" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users with any company can view all training certificates" ON "rh"."training_certificates" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users with any company can view all training enrollments" ON "rh"."training_enrollments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



COMMENT ON POLICY "Users with any company can view all training enrollments" ON "rh"."training_enrollments" IS 'Inscrições visíveis para permitir atribuir a qualquer usuário de qualquer empresa';



CREATE POLICY "Users with any company can view all training evaluations" ON "rh"."training_evaluations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



CREATE POLICY "Users with any company can view all trainings" ON "rh"."trainings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_companies" "uc"
  WHERE (("uc"."user_id" = "auth"."uid"()) AND ("uc"."ativo" = true)))));



COMMENT ON POLICY "Users with any company can view all trainings" ON "rh"."trainings" IS 'Treinamentos visíveis para todas as empresas na página rh/treinamentos';



ALTER TABLE "rh"."absence_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."allowance_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."approval_level_approvers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."approval_levels" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attendance_delete_policy" ON "rh"."training_attendance" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "attendance_insert_policy" ON "rh"."training_attendance" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "attendance_update_policy" ON "rh"."training_attendance" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "attendance_view_policy" ON "rh"."training_attendance" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



ALTER TABLE "rh"."audit_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."bank_hours_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."bank_hours_balance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."bank_hours_calculations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."bank_hours_closure" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."bank_hours_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."bank_hours_legacy_imports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."bank_hours_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."bank_hours_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."benefit_configurations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "certificate_delete_policy" ON "rh"."training_certificates" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "certificate_insert_policy" ON "rh"."training_certificates" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "certificate_update_policy" ON "rh"."training_certificates" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "certificate_view_policy" ON "rh"."training_certificates" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



ALTER TABLE "rh"."cid_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."compensation_approvals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."compensation_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."correction_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "correction_history_company_access" ON "rh"."correction_history" USING (("correction_id" IN ( SELECT "ac"."id"
   FROM "rh"."attendance_corrections" "ac"
  WHERE ("ac"."company_id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE ("user_companies"."user_id" = "auth"."uid"()))))));



ALTER TABLE "rh"."correction_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "correction_settings_company_access" ON "rh"."correction_settings" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



ALTER TABLE "rh"."deficiency_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."delay_reasons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "delay_reasons_company_access" ON "rh"."delay_reasons" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



ALTER TABLE "rh"."dependents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."disciplinary_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."employee_benefit_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."employee_correction_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employee_correction_permissions_company_access" ON "rh"."employee_correction_permissions" USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE ("user_companies"."user_id" = "auth"."uid"()))));



ALTER TABLE "rh"."employee_location_zones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."employee_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."employee_shifts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."employment_contracts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "enrollment_delete_policy" ON "rh"."training_enrollments" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "enrollment_insert_policy" ON "rh"."training_enrollments" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "enrollment_update_policy" ON "rh"."training_enrollments" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "enrollment_view_policy" ON "rh"."training_enrollments" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



ALTER TABLE "rh"."equipment_rental_monthly_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."esocial_batches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "esocial_batches_delete" ON "rh"."esocial_batches" FOR DELETE USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE ("user_companies"."user_id" = "auth"."uid"()))))));



CREATE POLICY "esocial_batches_insert" ON "rh"."esocial_batches" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE ("user_companies"."user_id" = "auth"."uid"()))))));



CREATE POLICY "esocial_batches_select" ON "rh"."esocial_batches" FOR SELECT USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE ("user_companies"."user_id" = "auth"."uid"()))))));



CREATE POLICY "esocial_batches_update" ON "rh"."esocial_batches" FOR UPDATE USING (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."id" IN ( SELECT "user_companies"."company_id"
           FROM "public"."user_companies"
          WHERE ("user_companies"."user_id" = "auth"."uid"()))))));



ALTER TABLE "rh"."esocial_integrations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "evaluation_delete_policy" ON "rh"."training_evaluations" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "evaluation_insert_policy" ON "rh"."training_evaluations" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "evaluation_update_policy" ON "rh"."training_evaluations" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "evaluation_view_policy" ON "rh"."training_evaluations" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



ALTER TABLE "rh"."fgts_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."financial_integration_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."flash_integration_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."income_statements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."inss_brackets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."irrf_brackets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."location_zones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."medical_certificate_attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."medical_certificates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."monthly_benefit_processing" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."payroll" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."payroll_overtime_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."periodic_exams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rh_benefit_configurations_delete_policy" ON "rh"."benefit_configurations" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'benefit_configurations'::"text", 'delete'::"text")));



CREATE POLICY "rh_benefit_configurations_insert_policy" ON "rh"."benefit_configurations" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'benefit_configurations'::"text", 'create'::"text")));



CREATE POLICY "rh_benefit_configurations_select_policy" ON "rh"."benefit_configurations" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'benefit_configurations'::"text", 'read'::"text")));



CREATE POLICY "rh_benefit_configurations_update_policy" ON "rh"."benefit_configurations" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'benefit_configurations'::"text", 'edit'::"text")));



CREATE POLICY "rh_employees_delete_policy" ON "rh"."employees" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employees'::"text", 'delete'::"text")));



CREATE POLICY "rh_employees_insert_policy" ON "rh"."employees" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employees'::"text", 'create'::"text")));



CREATE POLICY "rh_employees_select_policy" ON "rh"."employees" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employees'::"text", 'read'::"text")));



CREATE POLICY "rh_employees_update_policy" ON "rh"."employees" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'employees'::"text", 'edit'::"text")));



CREATE POLICY "rh_positions_delete_policy" ON "rh"."positions" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'positions'::"text", 'delete'::"text")));



CREATE POLICY "rh_positions_insert_policy" ON "rh"."positions" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'positions'::"text", 'create'::"text")));



CREATE POLICY "rh_positions_select_policy" ON "rh"."positions" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'positions'::"text", 'read'::"text")));



CREATE POLICY "rh_positions_update_policy" ON "rh"."positions" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'positions'::"text", 'edit'::"text")));



CREATE POLICY "rh_units_delete_policy" ON "rh"."units" FOR DELETE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'units'::"text", 'delete'::"text")));



CREATE POLICY "rh_units_insert_policy" ON "rh"."units" FOR INSERT WITH CHECK ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'units'::"text", 'create'::"text")));



CREATE POLICY "rh_units_select_policy" ON "rh"."units" FOR SELECT USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'units'::"text", 'read'::"text")));



CREATE POLICY "rh_units_update_policy" ON "rh"."units" FOR UPDATE USING ((("company_id" = ANY ("public"."get_user_companies"())) AND "public"."check_access_permission"('rh'::"text", 'units'::"text", 'edit'::"text")));



ALTER TABLE "rh"."rubricas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."signature_month_control" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."signature_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."sobreaviso_escalas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."time_record_event_photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."time_record_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."time_record_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."time_record_signature_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."time_record_signatures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."time_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_application_evaluations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_certificates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_content" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "training_delete_policy" ON "rh"."trainings" FOR DELETE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



ALTER TABLE "rh"."training_enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_evaluations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_exam_alternatives" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_exam_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_exam_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_exam_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_exams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "training_insert_policy" ON "rh"."trainings" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



ALTER TABLE "rh"."training_notification_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_notification_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_notification_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_notification_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_reaction_evaluations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."training_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "training_update_policy" ON "rh"."trainings" FOR UPDATE USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



CREATE POLICY "training_view_policy" ON "rh"."trainings" FOR SELECT USING (("company_id" IN ( SELECT "user_companies"."company_id"
   FROM "public"."user_companies"
  WHERE (("user_companies"."user_id" = "auth"."uid"()) AND ("user_companies"."ativo" = true)))));



ALTER TABLE "rh"."trainings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."vacations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."work_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "rh"."work_shifts" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "rh" TO "anon";
GRANT USAGE ON SCHEMA "rh" TO "authenticated";
GRANT USAGE ON SCHEMA "rh" TO "service_role";



GRANT ALL ON TABLE "rh"."time_record_signature_config" TO "anon";
GRANT ALL ON TABLE "rh"."time_record_signature_config" TO "authenticated";
GRANT ALL ON TABLE "rh"."time_record_signature_config" TO "service_role";



GRANT ALL ON FUNCTION "rh"."_calculate_training_progress_internal"("p_training_id" "uuid", "p_employee_id" "uuid", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."_calculate_training_progress_internal"("p_training_id" "uuid", "p_employee_id" "uuid", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."_calculate_training_progress_internal"("p_training_id" "uuid", "p_employee_id" "uuid", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."adjust_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_description" "text", "p_created_by" "uuid", "p_transaction_date" "date") TO "anon";
GRANT ALL ON FUNCTION "rh"."adjust_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_description" "text", "p_created_by" "uuid", "p_transaction_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."adjust_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_description" "text", "p_created_by" "uuid", "p_transaction_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "rh"."aprovar_ferias"("p_vacation_id" "uuid", "p_aprovado_por" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."aprovar_ferias"("p_vacation_id" "uuid", "p_aprovado_por" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."aprovar_ferias"("p_vacation_id" "uuid", "p_aprovado_por" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."auto_mark_training_progress_completed"() TO "anon";
GRANT ALL ON FUNCTION "rh"."auto_mark_training_progress_completed"() TO "authenticated";
GRANT ALL ON FUNCTION "rh"."auto_mark_training_progress_completed"() TO "service_role";



GRANT ALL ON FUNCTION "rh"."buscar_ferias_pendentes"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."buscar_ferias_pendentes"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."buscar_ferias_pendentes"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."calcular_dias_ferias_disponiveis"("p_employee_id" "uuid", "p_ano" integer) TO "anon";
GRANT ALL ON FUNCTION "rh"."calcular_dias_ferias_disponiveis"("p_employee_id" "uuid", "p_ano" integer) TO "authenticated";
GRANT ALL ON FUNCTION "rh"."calcular_dias_ferias_disponiveis"("p_employee_id" "uuid", "p_ano" integer) TO "service_role";



GRANT ALL ON FUNCTION "rh"."calcular_e_criar_periodos_aquisitivos"("p_employee_id" "uuid", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."calcular_e_criar_periodos_aquisitivos"("p_employee_id" "uuid", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."calcular_e_criar_periodos_aquisitivos"("p_employee_id" "uuid", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."calculate_and_accumulate_bank_hours"("p_employee_id" "uuid", "p_company_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "anon";
GRANT ALL ON FUNCTION "rh"."calculate_and_accumulate_bank_hours"("p_employee_id" "uuid", "p_company_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."calculate_and_accumulate_bank_hours"("p_employee_id" "uuid", "p_company_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "rh"."calculate_coparticipation"("p_medical_service_usage_id" "uuid", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."calculate_coparticipation"("p_medical_service_usage_id" "uuid", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."calculate_coparticipation"("p_medical_service_usage_id" "uuid", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."calculate_missing_time_records_debit"("p_employee_id" "uuid", "p_company_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "anon";
GRANT ALL ON FUNCTION "rh"."calculate_missing_time_records_debit"("p_employee_id" "uuid", "p_company_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."calculate_missing_time_records_debit"("p_employee_id" "uuid", "p_company_id" "uuid", "p_period_start" "date", "p_period_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "rh"."calculate_night_hours"("p_entrada" time without time zone, "p_saida" time without time zone, "p_data_registro" "date", "p_entrada_date" "date", "p_saida_date" "date") TO "anon";
GRANT ALL ON FUNCTION "rh"."calculate_night_hours"("p_entrada" time without time zone, "p_saida" time without time zone, "p_data_registro" "date", "p_entrada_date" "date", "p_saida_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."calculate_night_hours"("p_entrada" time without time zone, "p_saida" time without time zone, "p_data_registro" "date", "p_entrada_date" "date", "p_saida_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "rh"."calculate_overtime_by_scale"("p_time_record_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."calculate_overtime_by_scale"("p_time_record_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."calculate_overtime_by_scale"("p_time_record_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."calculate_training_progress"("p_training_id" "uuid", "p_employee_id" "uuid", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."calculate_training_progress"("p_training_id" "uuid", "p_employee_id" "uuid", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."calculate_training_progress"("p_training_id" "uuid", "p_employee_id" "uuid", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."calculate_work_shift_weekly_hours"("p_work_shift_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."calculate_work_shift_weekly_hours"("p_work_shift_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."calculate_work_shift_weekly_hours"("p_work_shift_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."can_advance_to_next_content"("p_training_id" "uuid", "p_employee_id" "uuid", "p_content_id" "uuid", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."can_advance_to_next_content"("p_training_id" "uuid", "p_employee_id" "uuid", "p_content_id" "uuid", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."can_advance_to_next_content"("p_training_id" "uuid", "p_employee_id" "uuid", "p_content_id" "uuid", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."check_overdue_trainings"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."check_overdue_trainings"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."check_overdue_trainings"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."create_deduction_from_medical_service"("p_medical_service_usage_id" "uuid", "p_company_id" "uuid", "p_mes_referencia" integer, "p_ano_referencia" integer) TO "anon";
GRANT ALL ON FUNCTION "rh"."create_deduction_from_medical_service"("p_medical_service_usage_id" "uuid", "p_company_id" "uuid", "p_mes_referencia" integer, "p_ano_referencia" integer) TO "authenticated";
GRANT ALL ON FUNCTION "rh"."create_deduction_from_medical_service"("p_medical_service_usage_id" "uuid", "p_company_id" "uuid", "p_mes_referencia" integer, "p_ano_referencia" integer) TO "service_role";



GRANT ALL ON FUNCTION "rh"."create_exam_notification"("p_user_id" "uuid", "p_company_id" "uuid", "p_exam_id" "uuid", "p_notification_type" character varying, "p_title" character varying, "p_message" "text") TO "anon";
GRANT ALL ON FUNCTION "rh"."create_exam_notification"("p_user_id" "uuid", "p_company_id" "uuid", "p_exam_id" "uuid", "p_notification_type" character varying, "p_title" character varying, "p_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."create_exam_notification"("p_user_id" "uuid", "p_company_id" "uuid", "p_exam_id" "uuid", "p_notification_type" character varying, "p_title" character varying, "p_message" "text") TO "service_role";



GRANT ALL ON FUNCTION "rh"."create_training_notification_rules"("p_training_id" "uuid", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."create_training_notification_rules"("p_training_id" "uuid", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."create_training_notification_rules"("p_training_id" "uuid", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."create_training_notifications"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."create_training_notifications"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."create_training_notifications"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."criar_ferias_fracionadas"("p_company_id" "uuid", "p_employee_id" "uuid", "p_ano" integer, "p_periodos" "jsonb", "p_observacoes" "text") TO "anon";
GRANT ALL ON FUNCTION "rh"."criar_ferias_fracionadas"("p_company_id" "uuid", "p_employee_id" "uuid", "p_ano" integer, "p_periodos" "jsonb", "p_observacoes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."criar_ferias_fracionadas"("p_company_id" "uuid", "p_employee_id" "uuid", "p_ano" integer, "p_periodos" "jsonb", "p_observacoes" "text") TO "service_role";



GRANT ALL ON FUNCTION "rh"."criar_ferias_integrais"("p_company_id" "uuid", "p_employee_id" "uuid", "p_ano" integer, "p_data_inicio" "date", "p_data_fim" "date", "p_observacoes" "text") TO "anon";
GRANT ALL ON FUNCTION "rh"."criar_ferias_integrais"("p_company_id" "uuid", "p_employee_id" "uuid", "p_ano" integer, "p_data_inicio" "date", "p_data_fim" "date", "p_observacoes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."criar_ferias_integrais"("p_company_id" "uuid", "p_employee_id" "uuid", "p_ano" integer, "p_data_inicio" "date", "p_data_fim" "date", "p_observacoes" "text") TO "service_role";



GRANT ALL ON FUNCTION "rh"."finish_exam_attempt"("p_attempt_id" "uuid", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."finish_exam_attempt"("p_attempt_id" "uuid", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."finish_exam_attempt"("p_attempt_id" "uuid", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."fix_incorrect_time_records"() TO "anon";
GRANT ALL ON FUNCTION "rh"."fix_incorrect_time_records"() TO "authenticated";
GRANT ALL ON FUNCTION "rh"."fix_incorrect_time_records"() TO "service_role";



GRANT ALL ON FUNCTION "rh"."fix_multiple_entrada_events"("p_timezone" "text") TO "anon";
GRANT ALL ON FUNCTION "rh"."fix_multiple_entrada_events"("p_timezone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."fix_multiple_entrada_events"("p_timezone" "text") TO "service_role";



GRANT ALL ON FUNCTION "rh"."get_bank_hours_assignment_with_relations"("p_assignment_id" "uuid", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."get_bank_hours_assignment_with_relations"("p_assignment_id" "uuid", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."get_bank_hours_assignment_with_relations"("p_assignment_id" "uuid", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."get_bank_hours_assignments_with_relations"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."get_bank_hours_assignments_with_relations"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."get_bank_hours_assignments_with_relations"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."get_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."get_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."get_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."get_employee_bank_hours_assignments_with_relations"("p_employee_id" "uuid", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."get_employee_bank_hours_assignments_with_relations"("p_employee_id" "uuid", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."get_employee_bank_hours_assignments_with_relations"("p_employee_id" "uuid", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."get_employee_bank_hours_config"("p_employee_id" "uuid", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."get_employee_bank_hours_config"("p_employee_id" "uuid", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."get_employee_bank_hours_config"("p_employee_id" "uuid", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."get_employee_work_shift_type"("p_employee_id" "uuid", "p_company_id" "uuid", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "rh"."get_employee_work_shift_type"("p_employee_id" "uuid", "p_company_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."get_employee_work_shift_type"("p_employee_id" "uuid", "p_company_id" "uuid", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "rh"."get_exams_needing_notification"("p_company_id" "uuid", "p_days_ahead" integer) TO "anon";
GRANT ALL ON FUNCTION "rh"."get_exams_needing_notification"("p_company_id" "uuid", "p_days_ahead" integer) TO "authenticated";
GRANT ALL ON FUNCTION "rh"."get_exams_needing_notification"("p_company_id" "uuid", "p_days_ahead" integer) TO "service_role";



GRANT ALL ON FUNCTION "rh"."get_expired_exams"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."get_expired_exams"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."get_expired_exams"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."get_mandatory_trainings_pending"("p_employee_id" "uuid", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."get_mandatory_trainings_pending"("p_employee_id" "uuid", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."get_mandatory_trainings_pending"("p_employee_id" "uuid", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."get_monthly_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_year" integer, "p_month" integer) TO "anon";
GRANT ALL ON FUNCTION "rh"."get_monthly_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_year" integer, "p_month" integer) TO "authenticated";
GRANT ALL ON FUNCTION "rh"."get_monthly_bank_hours_balance"("p_employee_id" "uuid", "p_company_id" "uuid", "p_year" integer, "p_month" integer) TO "service_role";



GRANT ALL ON FUNCTION "rh"."get_pending_deductions"("p_company_id" "uuid", "p_employee_id" "uuid", "p_mes_referencia" integer, "p_ano_referencia" integer) TO "anon";
GRANT ALL ON FUNCTION "rh"."get_pending_deductions"("p_company_id" "uuid", "p_employee_id" "uuid", "p_mes_referencia" integer, "p_ano_referencia" integer) TO "authenticated";
GRANT ALL ON FUNCTION "rh"."get_pending_deductions"("p_company_id" "uuid", "p_employee_id" "uuid", "p_mes_referencia" integer, "p_ano_referencia" integer) TO "service_role";



GRANT ALL ON FUNCTION "rh"."get_plan_value_by_age"("p_plan_id" "uuid", "p_idade" integer, "p_tipo" character varying) TO "anon";
GRANT ALL ON FUNCTION "rh"."get_plan_value_by_age"("p_plan_id" "uuid", "p_idade" integer, "p_tipo" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "rh"."get_plan_value_by_age"("p_plan_id" "uuid", "p_idade" integer, "p_tipo" character varying) TO "service_role";



GRANT ALL ON FUNCTION "rh"."get_time_record_settings"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."get_time_record_settings"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."get_time_record_settings"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."get_training_dashboard_stats"("p_company_id" "uuid", "p_training_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."get_training_dashboard_stats"("p_company_id" "uuid", "p_training_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."get_training_dashboard_stats"("p_company_id" "uuid", "p_training_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."get_training_notifications"("p_user_id" "uuid", "p_company_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "rh"."get_training_notifications"("p_user_id" "uuid", "p_company_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "rh"."get_training_notifications"("p_user_id" "uuid", "p_company_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "rh"."get_training_settings"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."get_training_settings"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."get_training_settings"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."get_type_bank_hours_assignments_with_relations"("p_type_id" "uuid", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."get_type_bank_hours_assignments_with_relations"("p_type_id" "uuid", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."get_type_bank_hours_assignments_with_relations"("p_type_id" "uuid", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."get_work_shift_hours_for_day"("p_work_shift_id" "uuid", "p_day_of_week" integer) TO "anon";
GRANT ALL ON FUNCTION "rh"."get_work_shift_hours_for_day"("p_work_shift_id" "uuid", "p_day_of_week" integer) TO "authenticated";
GRANT ALL ON FUNCTION "rh"."get_work_shift_hours_for_day"("p_work_shift_id" "uuid", "p_day_of_week" integer) TO "service_role";



GRANT ALL ON TABLE "rh"."holidays" TO "anon";
GRANT ALL ON TABLE "rh"."holidays" TO "authenticated";
GRANT ALL ON TABLE "rh"."holidays" TO "service_role";



GRANT ALL ON FUNCTION "rh"."holiday_applies_to_employee"("holiday_record" "rh"."holidays", "employee_estado" character varying, "employee_cidade" character varying) TO "anon";
GRANT ALL ON FUNCTION "rh"."holiday_applies_to_employee"("holiday_record" "rh"."holidays", "employee_estado" character varying, "employee_cidade" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "rh"."holiday_applies_to_employee"("holiday_record" "rh"."holidays", "employee_estado" character varying, "employee_cidade" character varying) TO "service_role";



GRANT ALL ON FUNCTION "rh"."import_legacy_bank_hours"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_reference_date" "date", "p_description" "text", "p_created_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."import_legacy_bank_hours"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_reference_date" "date", "p_description" "text", "p_created_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."import_legacy_bank_hours"("p_employee_id" "uuid", "p_company_id" "uuid", "p_hours_amount" numeric, "p_reference_date" "date", "p_description" "text", "p_created_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."initialize_bank_hours_config"("p_employee_id" "uuid", "p_company_id" "uuid", "p_has_bank_hours" boolean, "p_accumulation_period_months" integer, "p_max_accumulation_hours" numeric, "p_compensation_rate" numeric) TO "anon";
GRANT ALL ON FUNCTION "rh"."initialize_bank_hours_config"("p_employee_id" "uuid", "p_company_id" "uuid", "p_has_bank_hours" boolean, "p_accumulation_period_months" integer, "p_max_accumulation_hours" numeric, "p_compensation_rate" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "rh"."initialize_bank_hours_config"("p_employee_id" "uuid", "p_company_id" "uuid", "p_has_bank_hours" boolean, "p_accumulation_period_months" integer, "p_max_accumulation_hours" numeric, "p_compensation_rate" numeric) TO "service_role";



GRANT ALL ON FUNCTION "rh"."is_holiday"("p_date" "date", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."is_holiday"("p_date" "date", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."is_holiday"("p_date" "date", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."is_rest_day"("p_employee_id" "uuid", "p_company_id" "uuid", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "rh"."is_rest_day"("p_employee_id" "uuid", "p_company_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."is_rest_day"("p_employee_id" "uuid", "p_company_id" "uuid", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "rh"."is_sunday"("p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "rh"."is_sunday"("p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."is_sunday"("p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "rh"."mark_content_as_completed"("p_training_id" "uuid", "p_content_id" "uuid", "p_employee_id" "uuid", "p_company_id" "uuid", "p_tempo_assistido_segundos" integer) TO "anon";
GRANT ALL ON FUNCTION "rh"."mark_content_as_completed"("p_training_id" "uuid", "p_content_id" "uuid", "p_employee_id" "uuid", "p_company_id" "uuid", "p_tempo_assistido_segundos" integer) TO "authenticated";
GRANT ALL ON FUNCTION "rh"."mark_content_as_completed"("p_training_id" "uuid", "p_content_id" "uuid", "p_employee_id" "uuid", "p_company_id" "uuid", "p_tempo_assistido_segundos" integer) TO "service_role";



GRANT ALL ON FUNCTION "rh"."migrate_bank_hours_configs_to_types"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."migrate_bank_hours_configs_to_types"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."migrate_bank_hours_configs_to_types"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."process_bank_hours_expiration"("p_company_id" "uuid", "p_expiration_date" "date") TO "anon";
GRANT ALL ON FUNCTION "rh"."process_bank_hours_expiration"("p_company_id" "uuid", "p_expiration_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."process_bank_hours_expiration"("p_company_id" "uuid", "p_expiration_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "rh"."process_company_semester_closure"("p_company_id" "uuid", "p_closure_date" "date") TO "anon";
GRANT ALL ON FUNCTION "rh"."process_company_semester_closure"("p_company_id" "uuid", "p_closure_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."process_company_semester_closure"("p_company_id" "uuid", "p_closure_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "rh"."process_daily_bank_hours"("p_employee_id" "uuid", "p_company_id" "uuid", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "rh"."process_daily_bank_hours"("p_employee_id" "uuid", "p_company_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."process_daily_bank_hours"("p_employee_id" "uuid", "p_company_id" "uuid", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "rh"."process_monthly_bank_hours"("p_company_id" "uuid", "p_month_year" character varying) TO "anon";
GRANT ALL ON FUNCTION "rh"."process_monthly_bank_hours"("p_company_id" "uuid", "p_month_year" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "rh"."process_monthly_bank_hours"("p_company_id" "uuid", "p_month_year" character varying) TO "service_role";



GRANT ALL ON FUNCTION "rh"."process_notification_queue"() TO "anon";
GRANT ALL ON FUNCTION "rh"."process_notification_queue"() TO "authenticated";
GRANT ALL ON FUNCTION "rh"."process_notification_queue"() TO "service_role";



GRANT ALL ON FUNCTION "rh"."process_semester_bank_hours_closure"("p_employee_id" "uuid", "p_company_id" "uuid", "p_closure_date" "date") TO "anon";
GRANT ALL ON FUNCTION "rh"."process_semester_bank_hours_closure"("p_employee_id" "uuid", "p_company_id" "uuid", "p_closure_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."process_semester_bank_hours_closure"("p_employee_id" "uuid", "p_company_id" "uuid", "p_closure_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "rh"."process_weekly_bank_hours"("p_company_id" "uuid", "p_week_start_date" "date") TO "anon";
GRANT ALL ON FUNCTION "rh"."process_weekly_bank_hours"("p_company_id" "uuid", "p_week_start_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."process_weekly_bank_hours"("p_company_id" "uuid", "p_week_start_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "rh"."recalculate_problematic_records"() TO "anon";
GRANT ALL ON FUNCTION "rh"."recalculate_problematic_records"() TO "authenticated";
GRANT ALL ON FUNCTION "rh"."recalculate_problematic_records"() TO "service_role";



GRANT ALL ON FUNCTION "rh"."recalculate_time_record_hours"("p_time_record_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."recalculate_time_record_hours"("p_time_record_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."recalculate_time_record_hours"("p_time_record_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."recalculate_time_record_hours_with_scale"("p_time_record_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."recalculate_time_record_hours_with_scale"("p_time_record_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."recalculate_time_record_hours_with_scale"("p_time_record_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."rejeitar_ferias"("p_vacation_id" "uuid", "p_aprovado_por" "uuid", "p_motivo_rejeicao" "text") TO "anon";
GRANT ALL ON FUNCTION "rh"."rejeitar_ferias"("p_vacation_id" "uuid", "p_aprovado_por" "uuid", "p_motivo_rejeicao" "text") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."rejeitar_ferias"("p_vacation_id" "uuid", "p_aprovado_por" "uuid", "p_motivo_rejeicao" "text") TO "service_role";



GRANT ALL ON FUNCTION "rh"."run_bank_hours_calculation"("p_company_id" "uuid", "p_calculation_date" "date") TO "anon";
GRANT ALL ON FUNCTION "rh"."run_bank_hours_calculation"("p_company_id" "uuid", "p_calculation_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."run_bank_hours_calculation"("p_company_id" "uuid", "p_calculation_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "rh"."schedule_exam_notifications"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "rh"."schedule_exam_notifications"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "rh"."schedule_exam_notifications"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "rh"."schedule_training_notifications"() TO "anon";
GRANT ALL ON FUNCTION "rh"."schedule_training_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "rh"."schedule_training_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "rh"."sync_employee_shift_from_work_shift_id"() TO "anon";
GRANT ALL ON FUNCTION "rh"."sync_employee_shift_from_work_shift_id"() TO "authenticated";
GRANT ALL ON FUNCTION "rh"."sync_employee_shift_from_work_shift_id"() TO "service_role";



GRANT ALL ON FUNCTION "rh"."trg_calculate_overtime_on_approval"() TO "anon";
GRANT ALL ON FUNCTION "rh"."trg_calculate_overtime_on_approval"() TO "authenticated";
GRANT ALL ON FUNCTION "rh"."trg_calculate_overtime_on_approval"() TO "service_role";



GRANT ALL ON FUNCTION "rh"."trg_time_record_events_recalc"() TO "anon";
GRANT ALL ON FUNCTION "rh"."trg_time_record_events_recalc"() TO "authenticated";
GRANT ALL ON FUNCTION "rh"."trg_time_record_events_recalc"() TO "service_role";



GRANT ALL ON FUNCTION "rh"."trigger_create_training_notification_rules"() TO "anon";
GRANT ALL ON FUNCTION "rh"."trigger_create_training_notification_rules"() TO "authenticated";
GRANT ALL ON FUNCTION "rh"."trigger_create_training_notification_rules"() TO "service_role";



GRANT ALL ON FUNCTION "rh"."update_coparticipation_on_service_insert"() TO "anon";
GRANT ALL ON FUNCTION "rh"."update_coparticipation_on_service_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "rh"."update_coparticipation_on_service_insert"() TO "service_role";



GRANT ALL ON FUNCTION "rh"."update_financial_integration_config_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "rh"."update_financial_integration_config_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "rh"."update_financial_integration_config_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "rh"."update_location_zones_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "rh"."update_location_zones_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "rh"."update_location_zones_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "rh"."update_sobreaviso_escalas_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "rh"."update_sobreaviso_escalas_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "rh"."update_sobreaviso_escalas_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "rh"."update_time_record_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "rh"."update_time_record_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "rh"."update_time_record_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "rh"."update_training_exam_answers_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "rh"."update_training_exam_answers_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "rh"."update_training_exam_answers_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "rh"."update_training_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "rh"."update_training_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "rh"."update_training_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "rh"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "rh"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "rh"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "rh"."validate_time_record_window"("p_employee_id" "uuid", "p_company_id" "uuid", "p_current_date" "date", "p_current_time" time without time zone) TO "anon";
GRANT ALL ON FUNCTION "rh"."validate_time_record_window"("p_employee_id" "uuid", "p_company_id" "uuid", "p_current_date" "date", "p_current_time" time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "rh"."validate_time_record_window"("p_employee_id" "uuid", "p_company_id" "uuid", "p_current_date" "date", "p_current_time" time without time zone) TO "service_role";



GRANT ALL ON TABLE "rh"."employees" TO "anon";
GRANT ALL ON TABLE "rh"."employees" TO "authenticated";
GRANT ALL ON TABLE "rh"."employees" TO "service_role";



GRANT ALL ON TABLE "rh"."time_records" TO "anon";
GRANT ALL ON TABLE "rh"."time_records" TO "authenticated";
GRANT ALL ON TABLE "rh"."time_records" TO "service_role";



GRANT ALL ON TABLE "rh"."trainings" TO "anon";
GRANT ALL ON TABLE "rh"."trainings" TO "authenticated";
GRANT ALL ON TABLE "rh"."trainings" TO "service_role";



GRANT ALL ON TABLE "rh"."compensation_requests" TO "anon";
GRANT ALL ON TABLE "rh"."compensation_requests" TO "authenticated";
GRANT ALL ON TABLE "rh"."compensation_requests" TO "service_role";



GRANT ALL ON TABLE "rh"."disciplinary_actions" TO "anon";
GRANT ALL ON TABLE "rh"."disciplinary_actions" TO "authenticated";
GRANT ALL ON TABLE "rh"."disciplinary_actions" TO "service_role";



GRANT ALL ON TABLE "rh"."medical_certificates" TO "anon";
GRANT ALL ON TABLE "rh"."medical_certificates" TO "authenticated";
GRANT ALL ON TABLE "rh"."medical_certificates" TO "service_role";



GRANT ALL ON TABLE "rh"."periodic_exams" TO "anon";
GRANT ALL ON TABLE "rh"."periodic_exams" TO "authenticated";
GRANT ALL ON TABLE "rh"."periodic_exams" TO "service_role";



GRANT ALL ON TABLE "rh"."reimbursement_requests" TO "anon";
GRANT ALL ON TABLE "rh"."reimbursement_requests" TO "authenticated";
GRANT ALL ON TABLE "rh"."reimbursement_requests" TO "service_role";



GRANT ALL ON TABLE "rh"."vacations" TO "anon";
GRANT ALL ON TABLE "rh"."vacations" TO "authenticated";
GRANT ALL ON TABLE "rh"."vacations" TO "service_role";



GRANT ALL ON TABLE "rh"."absence_types" TO "anon";
GRANT ALL ON TABLE "rh"."absence_types" TO "authenticated";
GRANT ALL ON TABLE "rh"."absence_types" TO "service_role";



GRANT ALL ON TABLE "rh"."allowance_types" TO "anon";
GRANT ALL ON TABLE "rh"."allowance_types" TO "authenticated";
GRANT ALL ON TABLE "rh"."allowance_types" TO "service_role";



GRANT ALL ON TABLE "rh"."approval_level_approvers" TO "anon";
GRANT ALL ON TABLE "rh"."approval_level_approvers" TO "authenticated";
GRANT ALL ON TABLE "rh"."approval_level_approvers" TO "service_role";



GRANT ALL ON TABLE "rh"."approval_levels" TO "anon";
GRANT ALL ON TABLE "rh"."approval_levels" TO "authenticated";
GRANT ALL ON TABLE "rh"."approval_levels" TO "service_role";



GRANT ALL ON TABLE "rh"."attendance_corrections" TO "anon";
GRANT ALL ON TABLE "rh"."attendance_corrections" TO "authenticated";
GRANT ALL ON TABLE "rh"."attendance_corrections" TO "service_role";



GRANT ALL ON TABLE "rh"."audit_config" TO "anon";
GRANT ALL ON TABLE "rh"."audit_config" TO "authenticated";
GRANT ALL ON TABLE "rh"."audit_config" TO "service_role";



GRANT ALL ON TABLE "rh"."audit_logs" TO "anon";
GRANT ALL ON TABLE "rh"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "rh"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "rh"."awards_productivity" TO "anon";
GRANT ALL ON TABLE "rh"."awards_productivity" TO "authenticated";
GRANT ALL ON TABLE "rh"."awards_productivity" TO "service_role";



GRANT ALL ON TABLE "rh"."bank_hours_assignments" TO "anon";
GRANT ALL ON TABLE "rh"."bank_hours_assignments" TO "authenticated";
GRANT ALL ON TABLE "rh"."bank_hours_assignments" TO "service_role";



GRANT ALL ON TABLE "rh"."bank_hours_balance" TO "anon";
GRANT ALL ON TABLE "rh"."bank_hours_balance" TO "authenticated";
GRANT ALL ON TABLE "rh"."bank_hours_balance" TO "service_role";



GRANT ALL ON TABLE "rh"."bank_hours_calculations" TO "anon";
GRANT ALL ON TABLE "rh"."bank_hours_calculations" TO "authenticated";
GRANT ALL ON TABLE "rh"."bank_hours_calculations" TO "service_role";



GRANT ALL ON TABLE "rh"."bank_hours_closure" TO "anon";
GRANT ALL ON TABLE "rh"."bank_hours_closure" TO "authenticated";
GRANT ALL ON TABLE "rh"."bank_hours_closure" TO "service_role";



GRANT ALL ON TABLE "rh"."bank_hours_config" TO "anon";
GRANT ALL ON TABLE "rh"."bank_hours_config" TO "authenticated";
GRANT ALL ON TABLE "rh"."bank_hours_config" TO "service_role";



GRANT ALL ON TABLE "rh"."bank_hours_legacy_imports" TO "anon";
GRANT ALL ON TABLE "rh"."bank_hours_legacy_imports" TO "authenticated";
GRANT ALL ON TABLE "rh"."bank_hours_legacy_imports" TO "service_role";



GRANT ALL ON TABLE "rh"."bank_hours_transactions" TO "anon";
GRANT ALL ON TABLE "rh"."bank_hours_transactions" TO "authenticated";
GRANT ALL ON TABLE "rh"."bank_hours_transactions" TO "service_role";



GRANT ALL ON TABLE "rh"."bank_hours_types" TO "anon";
GRANT ALL ON TABLE "rh"."bank_hours_types" TO "authenticated";
GRANT ALL ON TABLE "rh"."bank_hours_types" TO "service_role";



GRANT ALL ON TABLE "rh"."benefit_configurations" TO "anon";
GRANT ALL ON TABLE "rh"."benefit_configurations" TO "authenticated";
GRANT ALL ON TABLE "rh"."benefit_configurations" TO "service_role";



GRANT ALL ON TABLE "rh"."calculation_logs" TO "anon";
GRANT ALL ON TABLE "rh"."calculation_logs" TO "authenticated";
GRANT ALL ON TABLE "rh"."calculation_logs" TO "service_role";



GRANT ALL ON TABLE "rh"."candidate_documents" TO "anon";
GRANT ALL ON TABLE "rh"."candidate_documents" TO "authenticated";
GRANT ALL ON TABLE "rh"."candidate_documents" TO "service_role";



GRANT ALL ON TABLE "rh"."candidates" TO "anon";
GRANT ALL ON TABLE "rh"."candidates" TO "authenticated";
GRANT ALL ON TABLE "rh"."candidates" TO "service_role";



GRANT ALL ON TABLE "rh"."cid_codes" TO "anon";
GRANT ALL ON TABLE "rh"."cid_codes" TO "authenticated";
GRANT ALL ON TABLE "rh"."cid_codes" TO "service_role";



GRANT ALL ON TABLE "rh"."collective_agreements" TO "anon";
GRANT ALL ON TABLE "rh"."collective_agreements" TO "authenticated";
GRANT ALL ON TABLE "rh"."collective_agreements" TO "service_role";



GRANT ALL ON TABLE "rh"."compensation_approvals" TO "anon";
GRANT ALL ON TABLE "rh"."compensation_approvals" TO "authenticated";
GRANT ALL ON TABLE "rh"."compensation_approvals" TO "service_role";



GRANT ALL ON TABLE "rh"."correction_history" TO "anon";
GRANT ALL ON TABLE "rh"."correction_history" TO "authenticated";
GRANT ALL ON TABLE "rh"."correction_history" TO "service_role";



GRANT ALL ON TABLE "rh"."correction_settings" TO "anon";
GRANT ALL ON TABLE "rh"."correction_settings" TO "authenticated";
GRANT ALL ON TABLE "rh"."correction_settings" TO "service_role";



GRANT ALL ON TABLE "rh"."deficiency_types" TO "anon";
GRANT ALL ON TABLE "rh"."deficiency_types" TO "authenticated";
GRANT ALL ON TABLE "rh"."deficiency_types" TO "service_role";



GRANT ALL ON TABLE "rh"."delay_reasons" TO "anon";
GRANT ALL ON TABLE "rh"."delay_reasons" TO "authenticated";
GRANT ALL ON TABLE "rh"."delay_reasons" TO "service_role";



GRANT ALL ON TABLE "rh"."dependents" TO "anon";
GRANT ALL ON TABLE "rh"."dependents" TO "authenticated";
GRANT ALL ON TABLE "rh"."dependents" TO "service_role";



GRANT ALL ON TABLE "rh"."dependents_with_employee" TO "anon";
GRANT ALL ON TABLE "rh"."dependents_with_employee" TO "authenticated";
GRANT ALL ON TABLE "rh"."dependents_with_employee" TO "service_role";



GRANT ALL ON TABLE "rh"."employee_benefit_assignments" TO "anon";
GRANT ALL ON TABLE "rh"."employee_benefit_assignments" TO "authenticated";
GRANT ALL ON TABLE "rh"."employee_benefit_assignments" TO "service_role";



GRANT ALL ON TABLE "rh"."employee_correction_permissions" TO "anon";
GRANT ALL ON TABLE "rh"."employee_correction_permissions" TO "authenticated";
GRANT ALL ON TABLE "rh"."employee_correction_permissions" TO "service_role";



GRANT ALL ON TABLE "rh"."employee_deductions" TO "anon";
GRANT ALL ON TABLE "rh"."employee_deductions" TO "authenticated";
GRANT ALL ON TABLE "rh"."employee_deductions" TO "service_role";



GRANT ALL ON TABLE "rh"."employee_location_zones" TO "anon";
GRANT ALL ON TABLE "rh"."employee_location_zones" TO "authenticated";
GRANT ALL ON TABLE "rh"."employee_location_zones" TO "service_role";



GRANT ALL ON TABLE "rh"."employee_medical_plans" TO "anon";
GRANT ALL ON TABLE "rh"."employee_medical_plans" TO "authenticated";
GRANT ALL ON TABLE "rh"."employee_medical_plans" TO "service_role";



GRANT ALL ON TABLE "rh"."employee_plan_dependents" TO "anon";
GRANT ALL ON TABLE "rh"."employee_plan_dependents" TO "authenticated";
GRANT ALL ON TABLE "rh"."employee_plan_dependents" TO "service_role";



GRANT ALL ON TABLE "rh"."employee_schedules" TO "anon";
GRANT ALL ON TABLE "rh"."employee_schedules" TO "authenticated";
GRANT ALL ON TABLE "rh"."employee_schedules" TO "service_role";



GRANT ALL ON TABLE "rh"."employee_shifts" TO "anon";
GRANT ALL ON TABLE "rh"."employee_shifts" TO "authenticated";
GRANT ALL ON TABLE "rh"."employee_shifts" TO "service_role";



GRANT ALL ON TABLE "rh"."employee_union_memberships" TO "anon";
GRANT ALL ON TABLE "rh"."employee_union_memberships" TO "authenticated";
GRANT ALL ON TABLE "rh"."employee_union_memberships" TO "service_role";



GRANT ALL ON TABLE "rh"."employment_contracts" TO "anon";
GRANT ALL ON TABLE "rh"."employment_contracts" TO "authenticated";
GRANT ALL ON TABLE "rh"."employment_contracts" TO "service_role";



GRANT ALL ON TABLE "rh"."equipment_rental_approvals" TO "anon";
GRANT ALL ON TABLE "rh"."equipment_rental_approvals" TO "authenticated";
GRANT ALL ON TABLE "rh"."equipment_rental_approvals" TO "service_role";



GRANT ALL ON TABLE "rh"."equipment_rental_monthly_payments" TO "anon";
GRANT ALL ON TABLE "rh"."equipment_rental_monthly_payments" TO "authenticated";
GRANT ALL ON TABLE "rh"."equipment_rental_monthly_payments" TO "service_role";



GRANT ALL ON TABLE "rh"."esocial_batches" TO "anon";
GRANT ALL ON TABLE "rh"."esocial_batches" TO "authenticated";
GRANT ALL ON TABLE "rh"."esocial_batches" TO "service_role";



GRANT ALL ON TABLE "rh"."esocial_config" TO "anon";
GRANT ALL ON TABLE "rh"."esocial_config" TO "authenticated";
GRANT ALL ON TABLE "rh"."esocial_config" TO "service_role";



GRANT ALL ON TABLE "rh"."esocial_events" TO "anon";
GRANT ALL ON TABLE "rh"."esocial_events" TO "authenticated";
GRANT ALL ON TABLE "rh"."esocial_events" TO "service_role";



GRANT ALL ON TABLE "rh"."esocial_integrations" TO "anon";
GRANT ALL ON TABLE "rh"."esocial_integrations" TO "authenticated";
GRANT ALL ON TABLE "rh"."esocial_integrations" TO "service_role";



GRANT ALL ON TABLE "rh"."esocial_logs" TO "anon";
GRANT ALL ON TABLE "rh"."esocial_logs" TO "authenticated";
GRANT ALL ON TABLE "rh"."esocial_logs" TO "service_role";



GRANT ALL ON TABLE "rh"."fgts_config" TO "anon";
GRANT ALL ON TABLE "rh"."fgts_config" TO "authenticated";
GRANT ALL ON TABLE "rh"."fgts_config" TO "service_role";



GRANT ALL ON TABLE "rh"."financial_integration_config" TO "anon";
GRANT ALL ON TABLE "rh"."financial_integration_config" TO "authenticated";
GRANT ALL ON TABLE "rh"."financial_integration_config" TO "service_role";



GRANT ALL ON TABLE "rh"."flash_integration_config" TO "anon";
GRANT ALL ON TABLE "rh"."flash_integration_config" TO "authenticated";
GRANT ALL ON TABLE "rh"."flash_integration_config" TO "service_role";



GRANT ALL ON TABLE "rh"."gestor_notifications" TO "anon";
GRANT ALL ON TABLE "rh"."gestor_notifications" TO "authenticated";
GRANT ALL ON TABLE "rh"."gestor_notifications" TO "service_role";



GRANT ALL ON TABLE "rh"."income_statements" TO "anon";
GRANT ALL ON TABLE "rh"."income_statements" TO "authenticated";
GRANT ALL ON TABLE "rh"."income_statements" TO "service_role";



GRANT ALL ON TABLE "rh"."inss_brackets" TO "anon";
GRANT ALL ON TABLE "rh"."inss_brackets" TO "authenticated";
GRANT ALL ON TABLE "rh"."inss_brackets" TO "service_role";



GRANT ALL ON TABLE "rh"."irrf_brackets" TO "anon";
GRANT ALL ON TABLE "rh"."irrf_brackets" TO "authenticated";
GRANT ALL ON TABLE "rh"."irrf_brackets" TO "service_role";



GRANT ALL ON TABLE "rh"."job_openings" TO "anon";
GRANT ALL ON TABLE "rh"."job_openings" TO "authenticated";
GRANT ALL ON TABLE "rh"."job_openings" TO "service_role";



GRANT ALL ON TABLE "rh"."job_requests" TO "anon";
GRANT ALL ON TABLE "rh"."job_requests" TO "authenticated";
GRANT ALL ON TABLE "rh"."job_requests" TO "service_role";



GRANT ALL ON TABLE "rh"."location_zones" TO "anon";
GRANT ALL ON TABLE "rh"."location_zones" TO "authenticated";
GRANT ALL ON TABLE "rh"."location_zones" TO "service_role";



GRANT ALL ON TABLE "rh"."medical_agreements" TO "anon";
GRANT ALL ON TABLE "rh"."medical_agreements" TO "authenticated";
GRANT ALL ON TABLE "rh"."medical_agreements" TO "service_role";



GRANT ALL ON TABLE "rh"."medical_certificate_attachments" TO "anon";
GRANT ALL ON TABLE "rh"."medical_certificate_attachments" TO "authenticated";
GRANT ALL ON TABLE "rh"."medical_certificate_attachments" TO "service_role";



GRANT ALL ON TABLE "rh"."medical_plan_age_ranges" TO "anon";
GRANT ALL ON TABLE "rh"."medical_plan_age_ranges" TO "authenticated";
GRANT ALL ON TABLE "rh"."medical_plan_age_ranges" TO "service_role";



GRANT ALL ON TABLE "rh"."medical_plan_pricing_history" TO "anon";
GRANT ALL ON TABLE "rh"."medical_plan_pricing_history" TO "authenticated";
GRANT ALL ON TABLE "rh"."medical_plan_pricing_history" TO "service_role";



GRANT ALL ON TABLE "rh"."medical_plans" TO "anon";
GRANT ALL ON TABLE "rh"."medical_plans" TO "authenticated";
GRANT ALL ON TABLE "rh"."medical_plans" TO "service_role";



GRANT ALL ON TABLE "rh"."medical_services_usage" TO "anon";
GRANT ALL ON TABLE "rh"."medical_services_usage" TO "authenticated";
GRANT ALL ON TABLE "rh"."medical_services_usage" TO "service_role";



GRANT ALL ON TABLE "rh"."monthly_benefit_processing" TO "anon";
GRANT ALL ON TABLE "rh"."monthly_benefit_processing" TO "authenticated";
GRANT ALL ON TABLE "rh"."monthly_benefit_processing" TO "service_role";



GRANT ALL ON TABLE "rh"."payroll" TO "anon";
GRANT ALL ON TABLE "rh"."payroll" TO "authenticated";
GRANT ALL ON TABLE "rh"."payroll" TO "service_role";



GRANT ALL ON TABLE "rh"."payroll_config" TO "anon";
GRANT ALL ON TABLE "rh"."payroll_config" TO "authenticated";
GRANT ALL ON TABLE "rh"."payroll_config" TO "service_role";



GRANT ALL ON TABLE "rh"."payroll_events" TO "anon";
GRANT ALL ON TABLE "rh"."payroll_events" TO "authenticated";
GRANT ALL ON TABLE "rh"."payroll_events" TO "service_role";



GRANT ALL ON TABLE "rh"."payroll_overtime_events" TO "anon";
GRANT ALL ON TABLE "rh"."payroll_overtime_events" TO "authenticated";
GRANT ALL ON TABLE "rh"."payroll_overtime_events" TO "service_role";



GRANT ALL ON TABLE "rh"."positions" TO "anon";
GRANT ALL ON TABLE "rh"."positions" TO "authenticated";
GRANT ALL ON TABLE "rh"."positions" TO "service_role";



GRANT ALL ON TABLE "rh"."reports" TO "anon";
GRANT ALL ON TABLE "rh"."reports" TO "authenticated";
GRANT ALL ON TABLE "rh"."reports" TO "service_role";



GRANT ALL ON TABLE "rh"."rubricas" TO "anon";
GRANT ALL ON TABLE "rh"."rubricas" TO "authenticated";
GRANT ALL ON TABLE "rh"."rubricas" TO "service_role";



GRANT ALL ON TABLE "rh"."selection_processes" TO "anon";
GRANT ALL ON TABLE "rh"."selection_processes" TO "authenticated";
GRANT ALL ON TABLE "rh"."selection_processes" TO "service_role";



GRANT ALL ON TABLE "rh"."selection_stages" TO "anon";
GRANT ALL ON TABLE "rh"."selection_stages" TO "authenticated";
GRANT ALL ON TABLE "rh"."selection_stages" TO "service_role";



GRANT ALL ON TABLE "rh"."signature_month_control" TO "anon";
GRANT ALL ON TABLE "rh"."signature_month_control" TO "authenticated";
GRANT ALL ON TABLE "rh"."signature_month_control" TO "service_role";



GRANT ALL ON TABLE "rh"."signature_notifications" TO "anon";
GRANT ALL ON TABLE "rh"."signature_notifications" TO "authenticated";
GRANT ALL ON TABLE "rh"."signature_notifications" TO "service_role";



GRANT ALL ON TABLE "rh"."sobreaviso_escalas" TO "anon";
GRANT ALL ON TABLE "rh"."sobreaviso_escalas" TO "authenticated";
GRANT ALL ON TABLE "rh"."sobreaviso_escalas" TO "service_role";



GRANT ALL ON TABLE "rh"."talent_pool" TO "anon";
GRANT ALL ON TABLE "rh"."talent_pool" TO "authenticated";
GRANT ALL ON TABLE "rh"."talent_pool" TO "service_role";



GRANT ALL ON TABLE "rh"."time_bank" TO "anon";
GRANT ALL ON TABLE "rh"."time_bank" TO "authenticated";
GRANT ALL ON TABLE "rh"."time_bank" TO "service_role";



GRANT ALL ON TABLE "rh"."time_record_event_photos" TO "anon";
GRANT ALL ON TABLE "rh"."time_record_event_photos" TO "authenticated";
GRANT ALL ON TABLE "rh"."time_record_event_photos" TO "service_role";



GRANT ALL ON TABLE "rh"."time_record_events" TO "anon";
GRANT ALL ON TABLE "rh"."time_record_events" TO "authenticated";
GRANT ALL ON TABLE "rh"."time_record_events" TO "service_role";



GRANT ALL ON TABLE "rh"."time_record_settings" TO "anon";
GRANT ALL ON TABLE "rh"."time_record_settings" TO "authenticated";
GRANT ALL ON TABLE "rh"."time_record_settings" TO "service_role";



GRANT ALL ON TABLE "rh"."time_record_signatures" TO "anon";
GRANT ALL ON TABLE "rh"."time_record_signatures" TO "authenticated";
GRANT ALL ON TABLE "rh"."time_record_signatures" TO "service_role";



GRANT ALL ON TABLE "rh"."training_application_evaluations" TO "anon";
GRANT ALL ON TABLE "rh"."training_application_evaluations" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_application_evaluations" TO "service_role";



GRANT ALL ON TABLE "rh"."training_assignments" TO "anon";
GRANT ALL ON TABLE "rh"."training_assignments" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_assignments" TO "service_role";



GRANT ALL ON TABLE "rh"."training_attendance" TO "anon";
GRANT ALL ON TABLE "rh"."training_attendance" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_attendance" TO "service_role";



GRANT ALL ON TABLE "rh"."training_certificates" TO "anon";
GRANT ALL ON TABLE "rh"."training_certificates" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_certificates" TO "service_role";



GRANT ALL ON TABLE "rh"."training_content" TO "anon";
GRANT ALL ON TABLE "rh"."training_content" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_content" TO "service_role";



GRANT ALL ON TABLE "rh"."training_enrollments" TO "anon";
GRANT ALL ON TABLE "rh"."training_enrollments" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_enrollments" TO "service_role";



GRANT ALL ON TABLE "rh"."training_evaluations" TO "anon";
GRANT ALL ON TABLE "rh"."training_evaluations" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_evaluations" TO "service_role";



GRANT ALL ON TABLE "rh"."training_exam_alternatives" TO "anon";
GRANT ALL ON TABLE "rh"."training_exam_alternatives" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_exam_alternatives" TO "service_role";



GRANT ALL ON TABLE "rh"."training_exam_answers" TO "anon";
GRANT ALL ON TABLE "rh"."training_exam_answers" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_exam_answers" TO "service_role";



GRANT ALL ON TABLE "rh"."training_exam_attempts" TO "anon";
GRANT ALL ON TABLE "rh"."training_exam_attempts" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_exam_attempts" TO "service_role";



GRANT ALL ON TABLE "rh"."training_exam_questions" TO "anon";
GRANT ALL ON TABLE "rh"."training_exam_questions" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_exam_questions" TO "service_role";



GRANT ALL ON TABLE "rh"."training_exams" TO "anon";
GRANT ALL ON TABLE "rh"."training_exams" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_exams" TO "service_role";



GRANT ALL ON TABLE "rh"."training_notification_history" TO "anon";
GRANT ALL ON TABLE "rh"."training_notification_history" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_notification_history" TO "service_role";



GRANT ALL ON TABLE "rh"."training_notification_queue" TO "anon";
GRANT ALL ON TABLE "rh"."training_notification_queue" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_notification_queue" TO "service_role";



GRANT ALL ON TABLE "rh"."training_notification_rules" TO "anon";
GRANT ALL ON TABLE "rh"."training_notification_rules" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_notification_rules" TO "service_role";



GRANT ALL ON TABLE "rh"."training_notification_types" TO "anon";
GRANT ALL ON TABLE "rh"."training_notification_types" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_notification_types" TO "service_role";



GRANT ALL ON TABLE "rh"."training_progress" TO "anon";
GRANT ALL ON TABLE "rh"."training_progress" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_progress" TO "service_role";



GRANT ALL ON TABLE "rh"."training_reaction_evaluations" TO "anon";
GRANT ALL ON TABLE "rh"."training_reaction_evaluations" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_reaction_evaluations" TO "service_role";



GRANT ALL ON TABLE "rh"."training_settings" TO "authenticated";
GRANT ALL ON TABLE "rh"."training_settings" TO "anon";
GRANT ALL ON TABLE "rh"."training_settings" TO "service_role";



GRANT ALL ON TABLE "rh"."union_contributions" TO "anon";
GRANT ALL ON TABLE "rh"."union_contributions" TO "authenticated";
GRANT ALL ON TABLE "rh"."union_contributions" TO "service_role";



GRANT ALL ON TABLE "rh"."union_negotiations" TO "anon";
GRANT ALL ON TABLE "rh"."union_negotiations" TO "authenticated";
GRANT ALL ON TABLE "rh"."union_negotiations" TO "service_role";



GRANT ALL ON TABLE "rh"."union_representatives" TO "anon";
GRANT ALL ON TABLE "rh"."union_representatives" TO "authenticated";
GRANT ALL ON TABLE "rh"."union_representatives" TO "service_role";



GRANT ALL ON TABLE "rh"."unions" TO "anon";
GRANT ALL ON TABLE "rh"."unions" TO "authenticated";
GRANT ALL ON TABLE "rh"."unions" TO "service_role";



GRANT ALL ON TABLE "rh"."units" TO "anon";
GRANT ALL ON TABLE "rh"."units" TO "authenticated";
GRANT ALL ON TABLE "rh"."units" TO "service_role";



GRANT ALL ON TABLE "rh"."vacation_entitlements" TO "anon";
GRANT ALL ON TABLE "rh"."vacation_entitlements" TO "authenticated";
GRANT ALL ON TABLE "rh"."vacation_entitlements" TO "service_role";



GRANT ALL ON TABLE "rh"."vacation_periods" TO "anon";
GRANT ALL ON TABLE "rh"."vacation_periods" TO "authenticated";
GRANT ALL ON TABLE "rh"."vacation_periods" TO "service_role";



GRANT ALL ON TABLE "rh"."work_schedules" TO "anon";
GRANT ALL ON TABLE "rh"."work_schedules" TO "authenticated";
GRANT ALL ON TABLE "rh"."work_schedules" TO "service_role";



GRANT ALL ON TABLE "rh"."work_shifts" TO "anon";
GRANT ALL ON TABLE "rh"."work_shifts" TO "authenticated";
GRANT ALL ON TABLE "rh"."work_shifts" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "rh" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "rh" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "rh" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "rh" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "rh" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "rh" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "rh" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "rh" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "rh" GRANT ALL ON TABLES TO "service_role";



\unrestrict VAca01KLCNWBE5XjfggvRkaXbKOIHDbz3ZeHF4HFwejC6LtgxhkXhx84GoVeNXJ

RESET ALL;
