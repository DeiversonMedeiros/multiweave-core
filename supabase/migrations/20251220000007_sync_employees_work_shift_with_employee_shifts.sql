-- =====================================================
-- SINCRONIZAÇÃO: employees.work_shift_id com employee_shifts
-- =====================================================
-- Problema: Há duplicidade/divergência entre:
-- 1. employees.work_shift_id (usado no formulário de funcionário)
-- 2. employee_shifts (usado na página de turnos para histórico)
--
-- Quando um funcionário é criado/editado no formulário com work_shift_id,
-- não é criado automaticamente um registro em employee_shifts.
-- Isso causa inconsistências nos cálculos de horas.
--
-- Solução:
-- 1. Sincronizar registros existentes: criar employee_shifts para funcionários
--    que têm work_shift_id mas não têm employee_shifts
-- 2. Criar trigger para manter sincronização automática
-- =====================================================

-- 1. SINCRONIZAR REGISTROS EXISTENTES
-- Criar employee_shifts para funcionários que têm work_shift_id mas não têm employee_shifts
DO $$
DECLARE
  v_record RECORD;
  v_count INTEGER := 0;
  v_data_inicio DATE;
BEGIN
  RAISE NOTICE 'Sincronizando employees.work_shift_id com employee_shifts...';
  
  -- Para cada funcionário que tem work_shift_id mas não tem employee_shifts ativo
  FOR v_record IN
    SELECT DISTINCT
      e.id as employee_id,
      e.company_id,
      e.work_shift_id,
      e.data_admissao,
      COALESCE(
        (SELECT MAX(es.data_fim) 
         FROM rh.employee_shifts es 
         WHERE es.funcionario_id = e.id 
           AND es.company_id = e.company_id),
        e.data_admissao
      ) as ultima_data_fim
    FROM rh.employees e
    WHERE e.work_shift_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 
        FROM rh.employee_shifts es 
        WHERE es.funcionario_id = e.id 
          AND es.company_id = e.company_id
          AND es.ativo = true
          AND es.data_fim IS NULL
      )
  LOOP
    BEGIN
      -- Determinar data_inicio: se há employee_shifts anteriores, começar após a última data_fim
      -- Caso contrário, usar data_admissao
      IF v_record.ultima_data_fim IS NOT NULL AND v_record.ultima_data_fim > v_record.data_admissao THEN
        v_data_inicio := v_record.ultima_data_fim + INTERVAL '1 day';
      ELSE
        v_data_inicio := COALESCE(v_record.data_admissao, CURRENT_DATE);
      END IF;
      
      -- Criar registro em employee_shifts
      INSERT INTO rh.employee_shifts (
        company_id,
        funcionario_id,
        turno_id,
        data_inicio,
        data_fim,
        ativo,
        observacoes
      ) VALUES (
        v_record.company_id,
        v_record.employee_id,
        v_record.work_shift_id,
        v_data_inicio,
        NULL, -- Sem data_fim (ativo)
        true,
        'Sincronizado automaticamente de employees.work_shift_id'
      )
      ON CONFLICT DO NOTHING; -- Evitar duplicatas
      
      v_count := v_count + 1;
      
      IF v_count % 50 = 0 THEN
        RAISE NOTICE 'Sincronizados % funcionários...', v_count;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Erro ao sincronizar funcionário %: %', v_record.employee_id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Total de funcionários sincronizados: %', v_count;
END $$;

-- 2. CRIAR FUNÇÃO PARA SINCRONIZAR QUANDO employees.work_shift_id MUDAR
CREATE OR REPLACE FUNCTION rh.sync_employee_shift_from_work_shift_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_shift_id UUID;
  v_data_inicio DATE;
  v_ultima_data_fim DATE;
BEGIN
  -- Só processar se work_shift_id mudou
  IF (OLD.work_shift_id IS DISTINCT FROM NEW.work_shift_id) THEN
    
    -- Se work_shift_id foi removido (NULL), desativar employee_shifts ativos
    IF NEW.work_shift_id IS NULL THEN
      UPDATE rh.employee_shifts
      SET ativo = false,
          data_fim = CURRENT_DATE,
          updated_at = NOW()
      WHERE funcionario_id = NEW.id
        AND company_id = NEW.company_id
        AND ativo = true
        AND data_fim IS NULL;
      
      RETURN NEW;
    END IF;
    
    -- Verificar se já existe um employee_shifts ativo com o mesmo turno_id
    SELECT es.turno_id, es.data_fim
    INTO v_existing_shift_id, v_ultima_data_fim
    FROM rh.employee_shifts es
    WHERE es.funcionario_id = NEW.id
      AND es.company_id = NEW.company_id
      AND es.ativo = true
      AND es.data_fim IS NULL
    ORDER BY es.data_inicio DESC
    LIMIT 1;
    
    -- Se já existe um employee_shifts ativo com o mesmo turno_id, não fazer nada
    IF v_existing_shift_id = NEW.work_shift_id THEN
      RETURN NEW;
    END IF;
    
    -- Se existe um employee_shifts ativo com turno_id diferente, desativar
    IF v_existing_shift_id IS NOT NULL AND v_existing_shift_id != NEW.work_shift_id THEN
      UPDATE rh.employee_shifts
      SET ativo = false,
          data_fim = CURRENT_DATE - INTERVAL '1 day',
          updated_at = NOW()
      WHERE funcionario_id = NEW.id
        AND company_id = NEW.company_id
        AND ativo = true
        AND data_fim IS NULL;
    END IF;
    
    -- Determinar data_inicio para o novo registro
    IF v_ultima_data_fim IS NOT NULL THEN
      v_data_inicio := v_ultima_data_fim + INTERVAL '1 day';
    ELSE
      v_data_inicio := COALESCE(NEW.data_admissao, CURRENT_DATE);
    END IF;
    
    -- Criar novo registro em employee_shifts
    INSERT INTO rh.employee_shifts (
      company_id,
      funcionario_id,
      turno_id,
      data_inicio,
      data_fim,
      ativo,
      observacoes
    ) VALUES (
      NEW.company_id,
      NEW.id,
      NEW.work_shift_id,
      v_data_inicio,
      NULL, -- Sem data_fim (ativo)
      true,
      'Sincronizado automaticamente de employees.work_shift_id'
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION rh.sync_employee_shift_from_work_shift_id() IS 
'Função trigger que sincroniza employees.work_shift_id com employee_shifts.
Quando work_shift_id é atualizado, cria/atualiza o registro correspondente em employee_shifts.';

-- 3. CRIAR TRIGGER PARA SINCRONIZAÇÃO AUTOMÁTICA
DROP TRIGGER IF EXISTS trigger_sync_employee_shift_from_work_shift_id ON rh.employees;

CREATE TRIGGER trigger_sync_employee_shift_from_work_shift_id
  AFTER INSERT OR UPDATE OF work_shift_id ON rh.employees
  FOR EACH ROW
  WHEN (NEW.work_shift_id IS DISTINCT FROM OLD.work_shift_id OR OLD.work_shift_id IS NULL)
  EXECUTE FUNCTION rh.sync_employee_shift_from_work_shift_id();

-- 4. RECALCULAR REGISTROS AFETADOS
-- Recalcular time_records dos funcionários que foram sincronizados
DO $$
DECLARE
  v_record RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Recalculando registros de ponto após sincronização...';
  
  -- Recalcular registros dos últimos 60 dias para funcionários que foram sincronizados
  FOR v_record IN
    SELECT DISTINCT tr.id
    FROM rh.time_records tr
    INNER JOIN rh.employees e ON e.id = tr.employee_id
    WHERE e.work_shift_id IS NOT NULL
      AND tr.status IN ('aprovado', 'pendente', 'corrigido')
      AND tr.data_registro >= CURRENT_DATE - INTERVAL '60 days'
    ORDER BY tr.data_registro DESC
  LOOP
    BEGIN
      PERFORM rh.recalculate_time_record_hours(v_record.id);
      v_count := v_count + 1;
      
      IF v_count % 50 = 0 THEN
        RAISE NOTICE 'Recalculados % registros...', v_count;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Erro ao recalcular registro %: %', v_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Total de registros recalculados: %', v_count;
END $$;

-- 5. VERIFICAR DIVERGÊNCIAS RESTANTES
DO $$
DECLARE
  v_divergencias INTEGER;
BEGIN
  -- Contar funcionários que têm work_shift_id mas não têm employee_shifts ativo
  SELECT COUNT(*)
  INTO v_divergencias
  FROM rh.employees e
  WHERE e.work_shift_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 
      FROM rh.employee_shifts es 
      WHERE es.funcionario_id = e.id 
        AND es.company_id = e.company_id
        AND es.ativo = true
        AND es.data_fim IS NULL
    );
  
  IF v_divergencias > 0 THEN
    RAISE WARNING 'Ainda existem % funcionários com work_shift_id mas sem employee_shifts ativo', v_divergencias;
  ELSE
    RAISE NOTICE 'Sincronização concluída: todos os funcionários com work_shift_id têm employee_shifts ativo';
  END IF;
END $$;

