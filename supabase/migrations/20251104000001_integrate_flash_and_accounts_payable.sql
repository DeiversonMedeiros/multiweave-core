-- =====================================================
-- INTEGRAÇÃO FLASH E CONTAS A PAGAR
-- =====================================================
-- Data: 2025-11-04
-- Descrição: Funções para integrar pagamentos mensais com Flash API e Contas a Pagar

-- =====================================================
-- FUNÇÃO: Enviar pagamento para Flash
-- =====================================================
-- Nota: Esta é uma função placeholder. Quando a API Flash estiver disponível,
-- substituir a lógica por chamadas reais à API
CREATE OR REPLACE FUNCTION send_equipment_rental_to_flash(
  p_payment_id UUID,
  p_sent_by UUID
) RETURNS JSON AS $$
DECLARE
  v_payment RECORD;
  v_flash_account_number VARCHAR(255);
  v_flash_payment_id VARCHAR(255);
  v_result JSON;
BEGIN
  -- Buscar dados do pagamento
  SELECT 
    erpm.*,
    e.nome as employee_name,
    e.cpf,
    e.email,
    era.tipo_equipamento
  INTO v_payment
  FROM rh.equipment_rental_monthly_payments erpm
  JOIN rh.employees e ON e.id = erpm.employee_id
  JOIN rh.equipment_rental_approvals era ON era.id = erpm.equipment_rental_approval_id
  WHERE erpm.id = p_payment_id
    AND erpm.status = 'aprovado';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado ou não está aprovado';
  END IF;
  
  -- TODO: Integração real com Flash API
  -- Por enquanto, apenas simula o envio
  -- Quando a API Flash estiver disponível, implementar:
  -- 1. Buscar conta Flash do funcionário (ou criar se não existir)
  -- 2. Fazer depósito na conta Flash
  -- 3. Gerar boleto via API Flash
  -- 4. Retornar IDs do pagamento e boleto
  
  -- Simulação: gerar IDs fictícios
  v_flash_account_number := 'FLASH-' || SUBSTRING(v_payment.employee_id::text, 1, 8);
  v_flash_payment_id := 'PAY-' || SUBSTRING(p_payment_id::text, 1, 8) || '-' || EXTRACT(EPOCH FROM NOW())::bigint;
  
  -- Atualizar pagamento
  UPDATE rh.equipment_rental_monthly_payments
  SET 
    status = 'enviado_flash',
    flash_account_number = v_flash_account_number,
    flash_payment_id = v_flash_payment_id,
    enviado_flash_em = NOW(),
    updated_at = NOW()
  WHERE id = p_payment_id;
  
  -- Retornar resultado
  v_result := json_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'flash_account_number', v_flash_account_number,
    'flash_payment_id', v_flash_payment_id,
    'message', 'Pagamento enviado para Flash com sucesso (simulação)'
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

-- =====================================================
-- FUNÇÃO: Gerar boleto Flash
-- =====================================================
CREATE OR REPLACE FUNCTION generate_flash_invoice(
  p_payment_id UUID,
  p_sent_by UUID
) RETURNS JSON AS $$
DECLARE
  v_payment RECORD;
  v_flash_invoice_id VARCHAR(255);
  v_result JSON;
BEGIN
  -- Buscar pagamento
  SELECT * INTO v_payment
  FROM rh.equipment_rental_monthly_payments
  WHERE id = p_payment_id
    AND status = 'enviado_flash';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado ou não foi enviado para Flash';
  END IF;
  
  -- TODO: Integração real com Flash API para gerar boleto
  -- Por enquanto, apenas simula a geração
  
  v_flash_invoice_id := 'INV-' || SUBSTRING(p_payment_id::text, 1, 8) || '-' || EXTRACT(EPOCH FROM NOW())::bigint;
  
  -- Atualizar pagamento
  UPDATE rh.equipment_rental_monthly_payments
  SET 
    status = 'boleto_gerado',
    flash_invoice_id = v_flash_invoice_id,
    updated_at = NOW()
  WHERE id = p_payment_id;
  
  -- Retornar resultado
  v_result := json_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'flash_invoice_id', v_flash_invoice_id,
    'invoice_url', 'https://flash-api.example.com/invoices/' || v_flash_invoice_id,
    'message', 'Boleto gerado com sucesso (simulação)'
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

-- =====================================================
-- FUNÇÃO: Enviar para Contas a Pagar
-- =====================================================
CREATE OR REPLACE FUNCTION send_equipment_rental_to_accounts_payable(
  p_payment_id UUID,
  p_sent_by UUID,
  p_due_date DATE DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_payment RECORD;
  v_employee RECORD;
  v_conta_pagar_id UUID;
  v_numero_titulo VARCHAR(50);
  v_data_vencimento DATE;
  v_result JSON;
BEGIN
  -- Buscar dados do pagamento
  SELECT 
    erpm.*,
    e.nome as employee_name,
    e.cpf,
    e.email,
    era.tipo_equipamento,
    era.valor_mensal
  INTO v_payment
  FROM rh.equipment_rental_monthly_payments erpm
  JOIN rh.employees e ON e.id = erpm.employee_id
  JOIN rh.equipment_rental_approvals era ON era.id = erpm.equipment_rental_approval_id
  WHERE erpm.id = p_payment_id
    AND erpm.status IN ('aprovado', 'boleto_gerado');
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado ou não está aprovado';
  END IF;
  
  -- Verificar se já foi enviado
  IF v_payment.accounts_payable_id IS NOT NULL THEN
    RAISE EXCEPTION 'Pagamento já foi enviado para Contas a Pagar';
  END IF;
  
  -- Calcular data de vencimento (se não fornecida, usar 30 dias após o mês de referência)
  IF p_due_date IS NULL THEN
    v_data_vencimento := (DATE_TRUNC('month', MAKE_DATE(v_payment.year_reference, v_payment.month_reference, 1)) + INTERVAL '1 month + 29 days')::DATE;
  ELSE
    v_data_vencimento := p_due_date;
  END IF;
  
  -- Gerar número do título
  v_numero_titulo := 'ALUGUEL-EQ-' || 
    LPAD(v_payment.month_reference::text, 2, '0') || '/' || 
    v_payment.year_reference::text || '-' || 
    SUBSTRING(v_payment.employee_id::text, 1, 8);
  
  -- Criar conta a pagar
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
    'pendente',
    'Gerado automaticamente a partir do sistema de aluguel de equipamentos. ' ||
    'Pagamento ID: ' || p_payment_id::text,
    p_sent_by,
    true
  ) RETURNING id INTO v_conta_pagar_id;
  
  -- Atualizar pagamento
  UPDATE rh.equipment_rental_monthly_payments
  SET 
    status = 'enviado_contas_pagar',
    accounts_payable_id = v_conta_pagar_id,
    enviado_contas_pagar_em = NOW(),
    updated_at = NOW()
  WHERE id = p_payment_id;
  
  -- Retornar resultado
  v_result := json_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'accounts_payable_id', v_conta_pagar_id,
    'numero_titulo', v_numero_titulo,
    'data_vencimento', v_data_vencimento,
    'message', 'Pagamento enviado para Contas a Pagar com sucesso'
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

-- =====================================================
-- FUNÇÃO: Enviar múltiplos pagamentos para Flash
-- =====================================================
CREATE OR REPLACE FUNCTION send_multiple_payments_to_flash(
  p_payment_ids UUID[],
  p_sent_by UUID
) RETURNS JSON AS $$
DECLARE
  v_payment_id UUID;
  v_results JSON[] := '{}';
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_result JSON;
BEGIN
  FOREACH v_payment_id IN ARRAY p_payment_ids
  LOOP
    BEGIN
      v_result := send_equipment_rental_to_flash(v_payment_id, p_sent_by);
      
      IF (v_result->>'success')::boolean THEN
        v_success_count := v_success_count + 1;
      ELSE
        v_error_count := v_error_count + 1;
      END IF;
      
      v_results := array_append(v_results, v_result);
    EXCEPTION
      WHEN OTHERS THEN
        v_error_count := v_error_count + 1;
        v_results := array_append(v_results, json_build_object(
          'success', false,
          'payment_id', v_payment_id,
          'error', SQLERRM
        ));
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'total', array_length(p_payment_ids, 1),
    'success_count', v_success_count,
    'error_count', v_error_count,
    'results', v_results
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: Enviar múltiplos pagamentos para Contas a Pagar
-- =====================================================
CREATE OR REPLACE FUNCTION send_multiple_payments_to_accounts_payable(
  p_payment_ids UUID[],
  p_sent_by UUID,
  p_due_date DATE DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_payment_id UUID;
  v_results JSON[] := '{}';
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_result JSON;
BEGIN
  FOREACH v_payment_id IN ARRAY p_payment_ids
  LOOP
    BEGIN
      v_result := send_equipment_rental_to_accounts_payable(v_payment_id, p_sent_by, p_due_date);
      
      IF (v_result->>'success')::boolean THEN
        v_success_count := v_success_count + 1;
      ELSE
        v_error_count := v_error_count + 1;
      END IF;
      
      v_results := array_append(v_results, v_result);
    EXCEPTION
      WHEN OTHERS THEN
        v_error_count := v_error_count + 1;
        v_results := array_append(v_results, json_build_object(
          'success', false,
          'payment_id', v_payment_id,
          'error', SQLERRM
        ));
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'total', array_length(p_payment_ids, 1),
    'success_count', v_success_count,
    'error_count', v_error_count,
    'results', v_results
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON FUNCTION send_equipment_rental_to_flash IS 'Envia pagamento mensal de aluguel para Flash API (placeholder até integração real)';
COMMENT ON FUNCTION generate_flash_invoice IS 'Gera boleto Flash para pagamento mensal de aluguel';
COMMENT ON FUNCTION send_equipment_rental_to_accounts_payable IS 'Cria conta a pagar a partir de pagamento mensal de aluguel aprovado';
COMMENT ON FUNCTION send_multiple_payments_to_flash IS 'Envia múltiplos pagamentos para Flash em lote';
COMMENT ON FUNCTION send_multiple_payments_to_accounts_payable IS 'Envia múltiplos pagamentos para Contas a Pagar em lote';

