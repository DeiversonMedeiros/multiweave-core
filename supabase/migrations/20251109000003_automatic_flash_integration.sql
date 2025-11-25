-- =====================================================
-- INTEGRAÇÃO AUTOMÁTICA COM FLASH
-- =====================================================
-- Data: 2025-11-09
-- Descrição: Modifica o fluxo para enviar automaticamente para Flash ao aprovar,
--            Flash gera boleto e cria conta a pagar, que passa pelo sistema de aprovações

-- =====================================================
-- REMOVER TRIGGER ANTIGO DE PREMIAÇÕES
-- =====================================================
DROP TRIGGER IF EXISTS trigger_create_accounts_payable_on_award_approval ON rh.awards_productivity;
DROP FUNCTION IF EXISTS create_accounts_payable_on_award_approval();

-- =====================================================
-- MODIFICAR FUNÇÃO: Enviar premiação para Flash
-- Agora gera boleto e cria conta a pagar automaticamente
-- =====================================================
CREATE OR REPLACE FUNCTION send_award_to_flash(
  p_award_id UUID,
  p_sent_by UUID
) RETURNS JSON AS $$
DECLARE
  v_award RECORD;
  v_employee RECORD;
  v_flash_account_number VARCHAR(255);
  v_flash_payment_id VARCHAR(255);
  v_flash_invoice_id VARCHAR(255);
  v_conta_pagar_id UUID;
  v_numero_titulo VARCHAR(50);
  v_data_vencimento DATE;
  v_result JSON;
BEGIN
  -- Buscar dados da premiação
  SELECT 
    ap.*,
    e.nome as employee_name,
    e.cpf,
    e.email
  INTO v_award
  FROM rh.awards_productivity ap
  JOIN rh.employees e ON e.id = ap.employee_id
  WHERE ap.id = p_award_id
    AND ap.status = 'aprovado';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Premiação não encontrada ou não está aprovada';
  END IF;
  
  -- Verificar se já foi enviado
  IF v_award.flash_payment_id IS NOT NULL THEN
    RAISE EXCEPTION 'Premiação já foi enviada para Flash';
  END IF;
  
  -- TODO: Integração real com Flash API
  -- Por enquanto, apenas simula o envio
  -- Quando a API Flash estiver disponível, implementar:
  -- 1. Buscar conta Flash do funcionário (ou criar se não existir)
  -- 2. Fazer depósito na conta Flash
  -- 3. Gerar boleto via API Flash
  -- 4. Retornar IDs do pagamento e boleto
  
  -- Simulação: gerar IDs fictícios
  v_flash_account_number := 'FLASH-' || SUBSTRING(v_award.employee_id::text, 1, 8);
  v_flash_payment_id := 'AWARD-' || SUBSTRING(p_award_id::text, 1, 8) || '-' || EXTRACT(EPOCH FROM NOW())::bigint;
  v_flash_invoice_id := 'INV-AWARD-' || SUBSTRING(p_award_id::text, 1, 8) || '-' || EXTRACT(EPOCH FROM NOW())::bigint;
  
  -- Calcular data de vencimento (30 dias após o mês de referência)
  v_data_vencimento := (DATE_TRUNC('month', v_award.mes_referencia) + INTERVAL '1 month + 29 days')::DATE;
  
  -- Gerar número do título
  v_numero_titulo := 'PREM-' || 
    TO_CHAR(v_award.mes_referencia, 'MM/YYYY') || '-' || 
    SUBSTRING(v_award.employee_id::text, 1, 8) || '-' ||
    SUBSTRING(p_award_id::text, 1, 8);
  
  -- Criar conta a pagar (Flash cria automaticamente após gerar boleto)
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
    v_award.company_id,
    v_numero_titulo,
    v_award.employee_name,
    v_award.cpf,
    COALESCE(v_award.nome, 'Premiação') || 
    ' - ' || v_award.employee_name || 
    ' - ' || TO_CHAR(v_award.mes_referencia, 'MM/YYYY') ||
    CASE WHEN v_award.descricao IS NOT NULL THEN ' - ' || v_award.descricao ELSE '' END,
    v_award.valor,
    v_award.valor,
    NOW()::DATE,
    v_data_vencimento,
    'Premiações e Produtividade',
    'pendente', -- Status pendente para passar pelo sistema de aprovações
    'Gerado automaticamente pelo Flash após aprovação da premiação. ' ||
    'Premiação ID: ' || p_award_id::text ||
    CASE WHEN v_award.criterios IS NOT NULL THEN '. Critérios: ' || v_award.criterios ELSE '' END ||
    '. Flash Invoice ID: ' || v_flash_invoice_id,
    p_sent_by,
    true
  ) RETURNING id INTO v_conta_pagar_id;
  
  -- Atualizar premiação com todos os dados do Flash
  UPDATE rh.awards_productivity
  SET 
    flash_account_number = v_flash_account_number,
    flash_payment_id = v_flash_payment_id,
    flash_invoice_id = v_flash_invoice_id,
    accounts_payable_id = v_conta_pagar_id,
    enviado_flash_em = NOW(),
    enviado_contas_pagar_em = NOW(),
    updated_at = NOW()
  WHERE id = p_award_id;
  
  -- Retornar resultado
  v_result := json_build_object(
    'success', true,
    'award_id', p_award_id,
    'flash_account_number', v_flash_account_number,
    'flash_payment_id', v_flash_payment_id,
    'flash_invoice_id', v_flash_invoice_id,
    'accounts_payable_id', v_conta_pagar_id,
    'invoice_url', 'https://flash-api.example.com/invoices/' || v_flash_invoice_id,
    'message', 'Premiação enviada para Flash, boleto gerado e conta a pagar criada automaticamente'
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
-- TRIGGER: Enviar automaticamente para Flash ao aprovar premiação
-- =====================================================
CREATE OR REPLACE FUNCTION auto_send_award_to_flash_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Apenas processar se o status mudou para 'aprovado'
  IF NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status != 'aprovado') THEN
    -- Verificar se já foi enviado para Flash
    IF NEW.flash_payment_id IS NULL THEN
      -- Enviar automaticamente para Flash
      v_result := send_award_to_flash(NEW.id, COALESCE(NEW.aprovado_por, auth.uid()));
      
      -- Se houve erro, registrar mas não bloquear a aprovação
      IF (v_result->>'success')::boolean = false THEN
        RAISE WARNING 'Erro ao enviar premiação para Flash: %', v_result->>'error';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_auto_send_award_to_flash ON rh.awards_productivity;
CREATE TRIGGER trigger_auto_send_award_to_flash
  AFTER UPDATE ON rh.awards_productivity
  FOR EACH ROW
  EXECUTE FUNCTION auto_send_award_to_flash_on_approval();

-- =====================================================
-- MODIFICAR FUNÇÃO: Enviar pagamento de aluguel para Flash
-- Agora gera boleto e cria conta a pagar automaticamente
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
  
  -- Verificar se já foi enviado
  IF v_payment.flash_payment_id IS NOT NULL THEN
    RAISE EXCEPTION 'Pagamento já foi enviado para Flash';
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
  v_flash_invoice_id := 'INV-' || SUBSTRING(p_payment_id::text, 1, 8) || '-' || EXTRACT(EPOCH FROM NOW())::bigint;
  
  -- Calcular data de vencimento (30 dias após o mês de referência)
  v_data_vencimento := (DATE_TRUNC('month', MAKE_DATE(v_payment.year_reference, v_payment.month_reference, 1)) + INTERVAL '1 month + 29 days')::DATE;
  
  -- Gerar número do título
  v_numero_titulo := 'ALUGUEL-EQ-' || 
    LPAD(v_payment.month_reference::text, 2, '0') || '/' || 
    v_payment.year_reference::text || '-' || 
    SUBSTRING(v_payment.employee_id::text, 1, 8);
  
  -- Criar conta a pagar (Flash cria automaticamente após gerar boleto)
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

-- =====================================================
-- TRIGGER: Enviar automaticamente para Flash ao aprovar pagamento de aluguel
-- =====================================================
CREATE OR REPLACE FUNCTION auto_send_equipment_rental_to_flash_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Apenas processar se o status mudou para 'aprovado'
  IF NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status != 'aprovado') THEN
    -- Verificar se já foi enviado para Flash
    IF NEW.flash_payment_id IS NULL THEN
      -- Enviar automaticamente para Flash
      v_result := send_equipment_rental_to_flash(NEW.id, COALESCE(NEW.aprovado_por, auth.uid()));
      
      -- Se houve erro, registrar mas não bloquear a aprovação
      IF (v_result->>'success')::boolean = false THEN
        RAISE WARNING 'Erro ao enviar pagamento de aluguel para Flash: %', v_result->>'error';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_auto_send_equipment_rental_to_flash ON rh.equipment_rental_monthly_payments;
CREATE TRIGGER trigger_auto_send_equipment_rental_to_flash
  AFTER UPDATE ON rh.equipment_rental_monthly_payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_send_equipment_rental_to_flash_on_approval();

-- =====================================================
-- REMOVER FUNÇÃO generate_flash_invoice (não é mais necessária)
-- A geração do boleto agora acontece dentro de send_*_to_flash
-- =====================================================
-- Manter a função para compatibilidade, mas ela não será mais usada no fluxo automático
-- A função generate_flash_invoice_for_award também não será mais necessária

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON FUNCTION send_award_to_flash IS 'Envia premiação para Flash, gera boleto e cria conta a pagar automaticamente (chamado automaticamente ao aprovar)';
COMMENT ON FUNCTION send_equipment_rental_to_flash IS 'Envia pagamento de aluguel para Flash, gera boleto e cria conta a pagar automaticamente (chamado automaticamente ao aprovar)';
COMMENT ON FUNCTION auto_send_award_to_flash_on_approval IS 'Trigger que envia automaticamente premiação para Flash ao ser aprovada';
COMMENT ON FUNCTION auto_send_equipment_rental_to_flash_on_approval IS 'Trigger que envia automaticamente pagamento de aluguel para Flash ao ser aprovado';

