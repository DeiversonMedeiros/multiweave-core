-- =====================================================
-- CORREÇÕES COMPLETAS: FLUXO DE PAGAMENTO DE ALUGUÉIS DE EQUIPAMENTOS
-- =====================================================
-- Data: 2025-12-12
-- Descrição: Implementa todas as correções críticas identificadas na análise:
--            1. Adiciona campos de centro de custo e classe financeira
--            2. Cria trigger para aprovações automáticas
--            3. Modifica funções para buscar e usar centro de custo e classe financeira
--            4. Implementa agrupamento por centro de custo

-- =====================================================
-- 1. ADICIONAR CAMPOS DE CENTRO DE CUSTO E CLASSE FINANCEIRA
-- =====================================================

ALTER TABLE rh.equipment_rental_monthly_payments
ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS classe_financeira_id UUID REFERENCES financeiro.classes_financeiras(id) ON DELETE SET NULL;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_equipment_rental_monthly_payments_cost_center_id 
  ON rh.equipment_rental_monthly_payments(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_equipment_rental_monthly_payments_classe_financeira_id 
  ON rh.equipment_rental_monthly_payments(classe_financeira_id);

-- Comentários
COMMENT ON COLUMN rh.equipment_rental_monthly_payments.cost_center_id IS 'Centro de custo do funcionário para agrupamento de pagamentos';
COMMENT ON COLUMN rh.equipment_rental_monthly_payments.classe_financeira_id IS 'Classe financeira do benefício de aluguel de equipamentos';

-- =====================================================
-- 2. MODIFICAR FUNÇÃO process_monthly_equipment_rentals
--    Para buscar e gravar centro de custo e classe financeira
-- =====================================================

CREATE OR REPLACE FUNCTION process_monthly_equipment_rentals(
  p_company_id UUID,
  p_month_reference INTEGER,
  p_year_reference INTEGER,
  p_processed_by UUID
) RETURNS INTEGER AS $$
DECLARE
  v_equipment_rental RECORD;
  v_calculation RECORD;
  v_payment_id UUID;
  v_count INTEGER := 0;
  v_cost_center_id UUID;
  v_classe_financeira_id UUID;
BEGIN
  -- Buscar classe financeira do benefício de aluguel de equipamentos
  SELECT classe_financeira_id INTO v_classe_financeira_id
  FROM rh.benefit_configurations
  WHERE company_id = p_company_id
    AND benefit_type = 'equipment_rental'
    AND is_active = true
  LIMIT 1;

  -- Iterar sobre aluguéis ativos da empresa
  -- Buscar de duas fontes:
  -- 1. equipment_rental_approvals (aprovações específicas de aluguel)
  -- 2. employee_benefit_assignments (benefícios cadastrados com tipo equipment_rental)
  FOR v_equipment_rental IN
    -- Buscar de equipment_rental_approvals
    SELECT 
      era.id, 
      era.employee_id, 
      era.company_id, 
      era.valor_mensal,
      e.cost_center_id,
      'equipment_rental_approval' as source_type,
      era.id as source_id
    FROM rh.equipment_rental_approvals era
    JOIN rh.employees e ON e.id = era.employee_id
    WHERE era.company_id = p_company_id
      AND era.status IN ('aprovado', 'ativo')
      AND (
        era.data_fim IS NULL 
        OR (era.data_fim >= MAKE_DATE(p_year_reference, p_month_reference, 1))
      )
      AND era.data_inicio <= (DATE_TRUNC('month', MAKE_DATE(p_year_reference, p_month_reference, 1)) + INTERVAL '1 month - 1 day')::DATE
    
    UNION ALL
    
    -- Buscar de employee_benefit_assignments onde benefit_type = 'equipment_rental'
    SELECT 
      eba.id, 
      eba.employee_id, 
      eba.company_id, 
      COALESCE(eba.custom_value, bc.base_value, 0) as valor_mensal,
      e.cost_center_id,
      'employee_benefit_assignment' as source_type,
      eba.id as source_id
    FROM rh.employee_benefit_assignments eba
    JOIN rh.benefit_configurations bc ON bc.id = eba.benefit_config_id
    JOIN rh.employees e ON e.id = eba.employee_id
    WHERE eba.company_id = p_company_id
      AND eba.is_active = true
      AND bc.benefit_type = 'equipment_rental'
      AND bc.is_active = true
      AND (
        eba.end_date IS NULL 
        OR (eba.end_date >= MAKE_DATE(p_year_reference, p_month_reference, 1))
      )
      AND eba.start_date <= (DATE_TRUNC('month', MAKE_DATE(p_year_reference, p_month_reference, 1)) + INTERVAL '1 month - 1 day')::DATE
  LOOP
    -- Verificar se já existe pagamento para este período
    -- Se for de equipment_rental_approvals, verificar por equipment_rental_approval_id
    -- Se for de employee_benefit_assignments, verificar por employee_benefit_assignment_id (se existir)
    IF v_equipment_rental.source_type = 'equipment_rental_approval' THEN
      SELECT id INTO v_payment_id
      FROM rh.equipment_rental_monthly_payments
      WHERE equipment_rental_approval_id = v_equipment_rental.source_id
        AND month_reference = p_month_reference
        AND year_reference = p_year_reference;
    ELSE
      -- Para employee_benefit_assignments, verificar se já existe pagamento para este employee_benefit_assignment e período
      -- Verificar se já existe um pagamento com o mesmo valor e funcionário no mesmo período
      -- (como não temos campo employee_benefit_assignment_id, verificamos por employee_id, valor e período)
      SELECT id INTO v_payment_id
      FROM rh.equipment_rental_monthly_payments
      WHERE employee_id = v_equipment_rental.employee_id
        AND month_reference = p_month_reference
        AND year_reference = p_year_reference
        AND equipment_rental_approval_id IS NULL
        AND ABS(valor_base - v_equipment_rental.valor_mensal) < 0.01  -- Comparar valores (tolerância para decimais)
      LIMIT 1;
    END IF;

    -- Se já existe, pular
    IF v_payment_id IS NOT NULL THEN
      CONTINUE;
    END IF;

    -- Calcular valor mensal
    -- Se for de equipment_rental_approvals, usar a função calculate_equipment_rental_monthly_value
    -- Se for de employee_benefit_assignments, calcular diretamente
    IF v_equipment_rental.source_type = 'equipment_rental_approval' THEN
      SELECT * INTO v_calculation
      FROM calculate_equipment_rental_monthly_value(
        v_equipment_rental.source_id,
        p_month_reference,
        p_year_reference
      );
    ELSE
      -- Para employee_benefit_assignments, usar valor mensal direto
      -- TODO: Implementar cálculo considerando dias trabalhados se necessário
      v_calculation.valor_base := v_equipment_rental.valor_mensal;
      v_calculation.dias_trabalhados := 30; -- Valor padrão, pode ser calculado depois
      v_calculation.dias_ausencia := 0;
      v_calculation.desconto_ausencia := 0;
      v_calculation.valor_calculado := v_equipment_rental.valor_mensal;
    END IF;

    -- Criar registro de pagamento com centro de custo e classe financeira
    INSERT INTO rh.equipment_rental_monthly_payments (
      equipment_rental_approval_id,
      employee_id,
      company_id,
      month_reference,
      year_reference,
      valor_base,
      dias_trabalhados,
      dias_ausencia,
      desconto_ausencia,
      valor_calculado,
      valor_aprovado,
      status,
      cost_center_id,
      classe_financeira_id,
      processado_por,
      processado_em
    ) VALUES (
      CASE WHEN v_equipment_rental.source_type = 'equipment_rental_approval' THEN v_equipment_rental.source_id ELSE NULL END,
      v_equipment_rental.employee_id,
      v_equipment_rental.company_id,
      p_month_reference,
      p_year_reference,
      v_calculation.valor_base,
      v_calculation.dias_trabalhados,
      v_calculation.dias_ausencia,
      v_calculation.desconto_ausencia,
      v_calculation.valor_calculado,
      v_calculation.valor_calculado, -- Inicialmente, valor aprovado = valor calculado
      'pendente_aprovacao',
      v_equipment_rental.cost_center_id,
      v_classe_financeira_id,
      p_processed_by,
      NOW()
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION process_monthly_equipment_rentals IS 'Processa pagamentos mensais de aluguéis, buscando e gravando centro de custo e classe financeira';

-- =====================================================
-- 3. FUNÇÃO PARA CRIAR APROVAÇÕES AUTOMÁTICAS
--    Para pagamentos mensais de aluguéis
-- =====================================================

CREATE OR REPLACE FUNCTION create_approvals_for_equipment_rental_monthly_payment(
  p_payment_id UUID,
  p_company_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_payment RECORD;
  v_gestor_id UUID;
  v_approval_created BOOLEAN := false;
BEGIN
  -- Buscar dados do pagamento
  SELECT 
    erpm.*,
    e.gestor_imediato_id,
    e.nome as employee_name
  INTO v_payment
  FROM rh.equipment_rental_monthly_payments erpm
  JOIN rh.employees e ON e.id = erpm.employee_id
  WHERE erpm.id = p_payment_id
    AND erpm.company_id = p_company_id
    AND erpm.status = 'pendente_aprovacao';

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Se o funcionário tem gestor imediato, criar aprovação para ele
  IF v_payment.gestor_imediato_id IS NOT NULL THEN
    -- Buscar profile_id do gestor usando função auxiliar
    v_gestor_id := public.get_profile_id_for_user(v_payment.gestor_imediato_id, p_company_id);

    IF v_gestor_id IS NOT NULL THEN
      -- Criar aprovação na tabela unificada
      INSERT INTO public.aprovacoes_unificada (
        company_id,
        processo_tipo,
        processo_id,
        nivel_aprovacao,
        aprovador_id,
        aprovador_original_id,
        status
      ) VALUES (
        p_company_id,
        'equipment_rental_monthly_payment',
        p_payment_id,
        1, -- Nível 1 para aprovação do gestor
        v_gestor_id,
        v_gestor_id,
        'pendente'
      )
      ON CONFLICT DO NOTHING; -- Evitar duplicatas

      v_approval_created := true;
    END IF;
  END IF;

  -- Também criar aprovações baseadas em configurações (se houver)
  -- Isso permite configurações mais complexas de aprovação
  PERFORM public.create_approvals_for_process(
    'equipment_rental_monthly_payment',
    p_payment_id,
    p_company_id
  );

  RETURN v_approval_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_approvals_for_equipment_rental_monthly_payment IS 'Cria aprovações automáticas para pagamento mensal de aluguel, identificando gestor do funcionário';

-- =====================================================
-- 4. TRIGGER PARA CRIAR APROVAÇÕES AUTOMÁTICAS
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_create_approvals_equipment_rental_monthly_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas criar aprovações se o status for 'pendente_aprovacao'
  IF NEW.status = 'pendente_aprovacao' THEN
    PERFORM create_approvals_for_equipment_rental_monthly_payment(NEW.id, NEW.company_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trigger_create_approvals_equipment_rental_monthly_payment ON rh.equipment_rental_monthly_payments;

CREATE TRIGGER trigger_create_approvals_equipment_rental_monthly_payment
  AFTER INSERT ON rh.equipment_rental_monthly_payments
  FOR EACH ROW
  WHEN (NEW.status = 'pendente_aprovacao')
  EXECUTE FUNCTION trigger_create_approvals_equipment_rental_monthly_payment();

COMMENT ON TRIGGER trigger_create_approvals_equipment_rental_monthly_payment ON rh.equipment_rental_monthly_payments IS 'Cria aprovações automáticas quando são geradas solicitações de pagamentos mensais de aluguéis';

-- =====================================================
-- 5. MODIFICAR FUNÇÃO send_equipment_rental_to_flash
--    Para preencher centro de custo e classe financeira
-- =====================================================

CREATE OR REPLACE FUNCTION send_equipment_rental_to_flash(
  p_payment_id UUID,
  p_sent_by UUID
) RETURNS JSON AS $$
DECLARE
  v_payment RECORD;
  v_employee RECORD;
  v_flash_account_number VARCHAR(255);
  v_flash_payment_id VARCHAR(255);
  v_flash_invoice_id VARCHAR(255);
  v_conta_pagar_id UUID;
  v_numero_titulo VARCHAR(50);
  v_data_vencimento DATE;
  v_result JSON;
  v_classe_financeira VARCHAR(100);
BEGIN
  -- Buscar dados do pagamento com centro de custo e classe financeira
  SELECT 
    erpm.*,
    e.nome as employee_name,
    e.cpf,
    e.email,
    era.tipo_equipamento,
    cf.codigo as classe_financeira_codigo,
    cf.nome as classe_financeira_nome
  INTO v_payment
  FROM rh.equipment_rental_monthly_payments erpm
  JOIN rh.employees e ON e.id = erpm.employee_id
  JOIN rh.equipment_rental_approvals era ON era.id = erpm.equipment_rental_approval_id
  LEFT JOIN financeiro.classes_financeiras cf ON cf.id = erpm.classe_financeira_id
  WHERE erpm.id = p_payment_id
    AND erpm.status = 'aprovado';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado ou não está aprovado';
  END IF;
  
  -- Verificar se já foi enviado
  IF v_payment.flash_payment_id IS NOT NULL THEN
    RAISE EXCEPTION 'Pagamento já foi enviado para Flash';
  END IF;
  
  -- TODO: Integração real com Flash API
  -- Por enquanto, apenas simula o envio
  
  -- Simulação: gerar IDs fictícios
  v_flash_account_number := 'FLASH-' || SUBSTRING(v_payment.employee_id::text, 1, 8);
  v_flash_payment_id := 'PAY-' || SUBSTRING(p_payment_id::text, 1, 8) || '-' || EXTRACT(EPOCH FROM NOW())::bigint;
  v_flash_invoice_id := 'INV-' || SUBSTRING(p_payment_id::text, 1, 8) || '-' || EXTRACT(EPOCH FROM NOW())::bigint;
  
  -- Calcular data de vencimento (30 dias após o mês de referência)
  v_data_vencimento := (DATE_TRUNC('month', MAKE_DATE(v_payment.year_reference, v_payment.month_reference, 1)) + INTERVAL '1 month + 29 days')::DATE;
  
  -- Gerar número do título
  v_numero_titulo := 'ALUGUEL-EQ-' || 
    LPAD(v_payment.month_reference::text, 2, '0') || '/' || 
    v_payment.year_reference::text || '-' || 
    SUBSTRING(v_payment.employee_id::text, 1, 8);
  
  -- Preparar classe financeira (código ou nome)
  v_classe_financeira := COALESCE(v_payment.classe_financeira_codigo, v_payment.classe_financeira_nome, NULL);
  
  -- Criar conta a pagar com centro de custo e classe financeira
  INSERT INTO financeiro.contas_pagar (
    company_id,
    numero_titulo,
    fornecedor_nome,
    fornecedor_cnpj,
    descricao,
    valor_original,
    valor_atual,
    data_emissao,
    data_vencimento,
    categoria,
    centro_custo_id,
    classe_financeira,
    status,
    observacoes,
    created_by,
    is_active
  ) VALUES (
    v_payment.company_id,
    v_numero_titulo,
    v_payment.employee_name,
    v_payment.cpf,
    'Aluguel de ' || COALESCE(v_payment.tipo_equipamento, 'Equipamento') || 
    ' - ' || v_payment.employee_name || 
    ' - ' || TO_CHAR(MAKE_DATE(v_payment.year_reference, v_payment.month_reference, 1), 'MM/YYYY'),
    COALESCE(v_payment.valor_aprovado, v_payment.valor_calculado),
    COALESCE(v_payment.valor_aprovado, v_payment.valor_calculado),
    NOW()::DATE,
    v_data_vencimento,
    'Aluguel de Equipamentos',
    v_payment.cost_center_id,
    v_classe_financeira,
    'pendente', -- Status pendente para passar pelo sistema de aprovações
    'Gerado automaticamente pelo Flash após aprovação do pagamento mensal de aluguel. ' ||
    'Pagamento ID: ' || p_payment_id::text ||
    '. Flash Invoice ID: ' || v_flash_invoice_id,
    p_sent_by,
    true
  ) RETURNING id INTO v_conta_pagar_id;
  
  -- Atualizar pagamento
  UPDATE rh.equipment_rental_monthly_payments
  SET 
    status = 'boleto_gerado',
    flash_account_number = v_flash_account_number,
    flash_payment_id = v_flash_payment_id,
    flash_invoice_id = v_flash_invoice_id,
    accounts_payable_id = v_conta_pagar_id,
    enviado_flash_em = NOW(),
    enviado_contas_pagar_em = NOW(),
    updated_at = NOW()
  WHERE id = p_payment_id;
  
  -- Retornar resultado
  v_result := json_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'flash_account_number', v_flash_account_number,
    'flash_payment_id', v_flash_payment_id,
    'flash_invoice_id', v_flash_invoice_id,
    'accounts_payable_id', v_conta_pagar_id,
    'invoice_url', 'https://flash-api.example.com/invoices/' || v_flash_invoice_id,
    'message', 'Pagamento enviado para Flash, boleto gerado e conta a pagar criada automaticamente'
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION send_equipment_rental_to_flash IS 'Envia pagamento de aluguel para Flash, gera boleto e cria conta a pagar com centro de custo e classe financeira';

-- =====================================================
-- 6. FUNÇÃO PARA AGRUPAR E ENVIAR POR CENTRO DE CUSTO
-- =====================================================

CREATE OR REPLACE FUNCTION send_multiple_equipment_rentals_to_flash_by_cost_center(
  p_payment_ids UUID[],
  p_sent_by UUID
) RETURNS JSON AS $$
DECLARE
  v_payment RECORD;
  v_cost_center RECORD;
  v_result JSON;
  v_results JSON[] := ARRAY[]::JSON[];
  v_total_sent INTEGER := 0;
  v_total_errors INTEGER := 0;
  v_conta_pagar_id UUID;
  v_numero_titulo VARCHAR(50);
  v_data_vencimento DATE;
  v_descricao TEXT;
  v_observacoes TEXT;
BEGIN
  -- Agrupar pagamentos por centro de custo
  FOR v_cost_center IN
    SELECT DISTINCT
      erpm.cost_center_id,
      erpm.classe_financeira_id,
      erpm.company_id,
      cc.nome as cost_center_nome,
      cc.codigo as cost_center_codigo,
      cf.codigo as classe_financeira_codigo,
      cf.nome as classe_financeira_nome,
      SUM(COALESCE(erpm.valor_aprovado, erpm.valor_calculado)) as valor_total,
      COUNT(*) as quantidade_pagamentos,
      ARRAY_AGG(erpm.id) as payment_ids,
      MAX(MAKE_DATE(erpm.year_reference, erpm.month_reference, 1)) as max_date
    FROM rh.equipment_rental_monthly_payments erpm
    LEFT JOIN public.cost_centers cc ON cc.id = erpm.cost_center_id
    LEFT JOIN financeiro.classes_financeiras cf ON cf.id = erpm.classe_financeira_id
    WHERE erpm.id = ANY(p_payment_ids)
      AND erpm.status = 'aprovado'
      AND erpm.flash_payment_id IS NULL
    GROUP BY erpm.cost_center_id, erpm.classe_financeira_id, erpm.company_id, cc.nome, cc.codigo, cf.codigo, cf.nome
  LOOP
    BEGIN
      -- Para cada centro de custo, criar uma solicitação no Flash
      -- Por enquanto, vamos criar uma conta a pagar agrupada
      -- TODO: Quando a API Flash estiver disponível, criar uma solicitação no Flash por centro de custo
      
      -- Gerar número do título
      v_numero_titulo := 'ALUGUEL-EQ-CC-' || 
        COALESCE(v_cost_center.cost_center_codigo, SUBSTRING(v_cost_center.cost_center_id::text, 1, 8)) || '-' || 
        TO_CHAR(v_cost_center.max_date, 'MM/YYYY');
      
      -- Calcular data de vencimento
      v_data_vencimento := (DATE_TRUNC('month', v_cost_center.max_date) + INTERVAL '1 month + 29 days')::DATE;
      
      -- Descrição
      v_descricao := 'Aluguel de Equipamentos - Centro de Custo: ' || 
        COALESCE(v_cost_center.cost_center_nome, 'Sem Centro de Custo') || 
        ' (' || v_cost_center.quantidade_pagamentos || ' pagamentos)';
      
      -- Observações
      v_observacoes := 'Gerado automaticamente agrupando ' || v_cost_center.quantidade_pagamentos || 
        ' pagamentos de aluguel de equipamentos por centro de custo. ' ||
        'IDs dos pagamentos: ' || ARRAY_TO_STRING(v_cost_center.payment_ids::text[], ', ');
      
      -- Criar conta a pagar agrupada por centro de custo
      INSERT INTO financeiro.contas_pagar (
        company_id,
        numero_titulo,
        fornecedor_nome,
        fornecedor_cnpj,
        descricao,
        valor_original,
        valor_atual,
        data_emissao,
        data_vencimento,
        categoria,
        centro_custo_id,
        classe_financeira,
        status,
        observacoes,
        created_by,
        is_active
      ) VALUES (
        v_cost_center.company_id,
        v_numero_titulo,
        'Múltiplos Funcionários',
        NULL,
        v_descricao,
        v_cost_center.valor_total,
        v_cost_center.valor_total,
        NOW()::DATE,
        v_data_vencimento,
        'Aluguel de Equipamentos',
        v_cost_center.cost_center_id,
        COALESCE(v_cost_center.classe_financeira_codigo, v_cost_center.classe_financeira_nome),
        'pendente',
        v_observacoes,
        p_sent_by,
        true
      ) RETURNING id INTO v_conta_pagar_id;

      -- Atualizar todos os pagamentos deste centro de custo
      UPDATE rh.equipment_rental_monthly_payments
      SET 
        status = 'enviado_contas_pagar',
        accounts_payable_id = v_conta_pagar_id,
        enviado_contas_pagar_em = NOW(),
        updated_at = NOW()
      WHERE id = ANY(v_cost_center.payment_ids);

      v_total_sent := v_total_sent + v_cost_center.quantidade_pagamentos;
      
      v_total_sent := v_total_sent + v_cost_center.quantidade_pagamentos;
      
      v_results := array_append(v_results, json_build_object(
        'cost_center_id', v_cost_center.cost_center_id,
        'cost_center_nome', v_cost_center.cost_center_nome,
        'quantidade_pagamentos', v_cost_center.quantidade_pagamentos,
        'valor_total', v_cost_center.valor_total,
        'conta_pagar_id', v_conta_pagar_id,
        'success', true
      ));
    EXCEPTION
      WHEN OTHERS THEN
        v_total_errors := v_total_errors + 1;
        v_results := array_append(v_results, json_build_object(
          'cost_center_id', v_cost_center.cost_center_id,
          'cost_center_nome', v_cost_center.cost_center_nome,
          'success', false,
          'error', SQLERRM
        ));
    END;
  END LOOP;

  -- Se não encontrou nenhum pagamento, retornar erro
  IF v_total_sent = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Nenhum pagamento válido encontrado para enviar',
      'total_pagamentos', 0,
      'total_erros', 0,
      'results', ARRAY[]::JSON[]
    );
  END IF;

  -- Retornar resultado agregado
  v_result := json_build_object(
    'success', true,
    'total_pagamentos', v_total_sent,
    'total_erros', v_total_errors,
    'results', v_results,
    'message', format('Enviados %s pagamentos agrupados por centro de custo', v_total_sent)
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'total_pagamentos', v_total_sent,
      'total_erros', v_total_errors + 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION send_multiple_equipment_rentals_to_flash_by_cost_center IS 'Agrupa pagamentos por centro de custo e cria uma conta a pagar por centro de custo';

-- =====================================================
-- 7. ATUALIZAR FUNÇÃO RPC list_equipment_rental_monthly_payments
--    Para incluir novos campos
-- =====================================================

-- Remover função existente antes de recriar com novo tipo de retorno
DROP FUNCTION IF EXISTS public.list_equipment_rental_monthly_payments(UUID, INTEGER, INTEGER, VARCHAR, UUID);

CREATE OR REPLACE FUNCTION public.list_equipment_rental_monthly_payments(
  p_company_id UUID,
  p_month_reference INTEGER DEFAULT NULL,
  p_year_reference INTEGER DEFAULT NULL,
  p_status VARCHAR DEFAULT NULL,
  p_employee_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  equipment_rental_approval_id UUID,
  employee_id UUID,
  company_id UUID,
  month_reference INTEGER,
  year_reference INTEGER,
  valor_base DECIMAL(10,2),
  dias_trabalhados INTEGER,
  dias_ausencia INTEGER,
  desconto_ausencia DECIMAL(10,2),
  valor_calculado DECIMAL(10,2),
  valor_aprovado DECIMAL(10,2),
  status VARCHAR,
  aprovado_por UUID,
  aprovado_em TIMESTAMP WITH TIME ZONE,
  observacoes_aprovacao TEXT,
  flash_payment_id VARCHAR(255),
  flash_invoice_id VARCHAR(255),
  flash_account_number VARCHAR(255),
  accounts_payable_id UUID,
  processado_por UUID,
  processado_em TIMESTAMP WITH TIME ZONE,
  enviado_flash_em TIMESTAMP WITH TIME ZONE,
  enviado_contas_pagar_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  cost_center_id UUID,
  classe_financeira_id UUID,
  employee JSONB,
  equipment_rental JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.equipment_rental_approval_id,
    p.employee_id,
    p.company_id,
    p.month_reference,
    p.year_reference,
    p.valor_base,
    p.dias_trabalhados,
    p.dias_ausencia,
    p.desconto_ausencia,
    p.valor_calculado,
    p.valor_aprovado,
    p.status,
    p.aprovado_por,
    p.aprovado_em,
    p.observacoes_aprovacao,
    p.flash_payment_id,
    p.flash_invoice_id,
    p.flash_account_number,
    p.accounts_payable_id,
    p.processado_por,
    p.processado_em,
    p.enviado_flash_em,
    p.enviado_contas_pagar_em,
    p.created_at,
    p.updated_at,
    p.cost_center_id,
    p.classe_financeira_id,
    -- Relação employee
    jsonb_build_object(
      'id', e.id,
      'nome', e.nome,
      'matricula', e.matricula
    ) as employee,
    -- Relação equipment_rental
    jsonb_build_object(
      'id', era.id,
      'tipo_equipamento', era.tipo_equipamento,
      'valor_mensal', era.valor_mensal
    ) as equipment_rental
  FROM rh.equipment_rental_monthly_payments p
  LEFT JOIN rh.employees e ON e.id = p.employee_id
  LEFT JOIN rh.equipment_rental_approvals era ON era.id = p.equipment_rental_approval_id
  WHERE p.company_id = p_company_id
    AND (p_month_reference IS NULL OR p.month_reference = p_month_reference)
    AND (p_year_reference IS NULL OR p.year_reference = p_year_reference)
    AND (p_status IS NULL OR p.status = p_status)
    AND (p_employee_id IS NULL OR p.employee_id = p_employee_id)
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.list_equipment_rental_monthly_payments IS 'Lista pagamentos mensais de aluguéis com relações employee e equipment_rental, incluindo centro de custo e classe financeira';

-- =====================================================
-- 8. ADICIONAR SUPORTE PARA equipment_rental_monthly_payment
--    NO SISTEMA DE APROVAÇÕES UNIFICADO
-- =====================================================

-- Atualizar função get_required_approvers para suportar equipment_rental_monthly_payment
CREATE OR REPLACE FUNCTION public.get_required_approvers(
    p_processo_tipo VARCHAR(50),
    p_processo_id UUID,
    p_company_id UUID
) RETURNS TABLE (
    nivel INTEGER,
    aprovador_id UUID,
    is_primary BOOLEAN,
    ordem INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    processo_valor DECIMAL(15,2) := 0;
    processo_centro_custo_id UUID;
    processo_departamento VARCHAR(100);
    processo_classe_financeira VARCHAR(100);
    processo_usuario_id UUID;
    config_record RECORD;
    aprovador_record RECORD;
BEGIN
    -- Obter dados da solicitação baseado no tipo
    CASE p_processo_tipo
        WHEN 'conta_pagar' THEN
            SELECT valor_original, centro_custo_id, departamento, classe_financeira, usuario_id
            INTO processo_valor, processo_centro_custo_id, processo_departamento, processo_classe_financeira, processo_usuario_id
            FROM financeiro.contas_pagar
            WHERE id = p_processo_id AND company_id = p_company_id;
            
        WHEN 'requisicao_compra' THEN
            SELECT valor_total_estimado, centro_custo_id, solicitante_id
            INTO processo_valor, processo_centro_custo_id, processo_usuario_id
            FROM compras.requisicoes_compra
            WHERE id = p_processo_id AND company_id = p_company_id;
            
        WHEN 'cotacao_compra' THEN
            SELECT valor_total, centro_custo_id
            INTO processo_valor, processo_centro_custo_id
            FROM compras.cotacoes
            WHERE id = p_processo_id AND company_id = p_company_id;
            
        WHEN 'solicitacao_saida_material' THEN
            SELECT valor_total, centro_custo_id, funcionario_solicitante_id
            INTO processo_valor, processo_centro_custo_id, processo_usuario_id
            FROM public.solicitacoes_saida_materiais
            WHERE id = p_processo_id AND company_id = p_company_id;
            
        WHEN 'solicitacao_transferencia_material' THEN
            SELECT valor_total, centro_custo_id
            INTO processo_valor, processo_centro_custo_id
            FROM almoxarifado.transferencias
            WHERE id = p_processo_id AND company_id = p_company_id;
            
        WHEN 'equipment_rental_monthly_payment' THEN
            SELECT 
              COALESCE(erpm.valor_aprovado, erpm.valor_calculado),
              erpm.cost_center_id,
              NULL::VARCHAR as departamento,
              cf.codigo as classe_financeira,
              erpm.employee_id
            INTO processo_valor, processo_centro_custo_id, processo_departamento, processo_classe_financeira, processo_usuario_id
            FROM rh.equipment_rental_monthly_payments erpm
            LEFT JOIN financeiro.classes_financeiras cf ON cf.id = erpm.classe_financeira_id
            WHERE erpm.id = p_processo_id AND erpm.company_id = p_company_id;
    END CASE;

    -- Buscar configurações de aprovação que se aplicam
    FOR config_record IN
        SELECT * FROM public.configuracoes_aprovacao_unificada
        WHERE company_id = p_company_id
        AND processo_tipo = p_processo_tipo
        AND ativo = true
        AND nivel_aprovacao IS NOT NULL  -- Garantir que nivel_aprovacao não seja NULL
        AND (valor_limite IS NULL OR valor_limite >= processo_valor)
        AND (centro_custo_id IS NULL OR centro_custo_id = processo_centro_custo_id)
        AND (departamento IS NULL OR departamento = processo_departamento)
        AND (classe_financeira IS NULL OR classe_financeira = processo_classe_financeira)
        AND (usuario_id IS NULL OR usuario_id = processo_usuario_id)
        ORDER BY nivel_aprovacao, valor_limite DESC
    LOOP
        -- Processar aprovadores do JSONB
        FOR aprovador_record IN
            SELECT 
                (aprovador->>'user_id')::UUID as user_id,
                COALESCE((aprovador->>'is_primary')::BOOLEAN, false) as is_primary,
                COALESCE((aprovador->>'ordem')::INTEGER, 0) as ordem
            FROM jsonb_array_elements(config_record.aprovadores) as aprovador
            WHERE (aprovador->>'user_id')::UUID IS NOT NULL  -- Garantir que user_id não seja NULL
        LOOP
            -- Garantir que nivel_aprovacao não seja NULL antes de retornar
            IF config_record.nivel_aprovacao IS NOT NULL AND aprovador_record.user_id IS NOT NULL THEN
                nivel := config_record.nivel_aprovacao;
                aprovador_id := aprovador_record.user_id;
                is_primary := aprovador_record.is_primary;
                ordem := aprovador_record.ordem;
                RETURN NEXT;
            END IF;
        END LOOP;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION public.get_required_approvers IS 'Retorna aprovadores necessários, incluindo suporte para equipment_rental_monthly_payment';
