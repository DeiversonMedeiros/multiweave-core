-- =====================================================
-- INTEGRAÇÃO PREMIAÇÕES COM CONTAS A PAGAR E FLASH
-- =====================================================
-- Data: 2025-11-09
-- Descrição: Adiciona campos de integração e funções para integrar premiações com Contas a Pagar e Flash API
-- Baseado no fluxo de Equipment Rental Monthly Payments

-- =====================================================
-- ADICIONAR CAMPOS DE INTEGRAÇÃO NA TABELA AWARDS_PRODUCTIVITY
-- =====================================================

-- Adicionar campos para integração Flash
ALTER TABLE rh.awards_productivity 
  ADD COLUMN IF NOT EXISTS flash_payment_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS flash_invoice_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS flash_account_number VARCHAR(255),
  ADD COLUMN IF NOT EXISTS enviado_flash_em TIMESTAMP WITH TIME ZONE;

-- Adicionar campos para integração Contas a Pagar
ALTER TABLE rh.awards_productivity 
  ADD COLUMN IF NOT EXISTS accounts_payable_id UUID REFERENCES financeiro.contas_pagar(id),
  ADD COLUMN IF NOT EXISTS enviado_contas_pagar_em TIMESTAMP WITH TIME ZONE;

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_awards_productivity_accounts_payable_id 
  ON rh.awards_productivity(accounts_payable_id);
CREATE INDEX IF NOT EXISTS idx_awards_productivity_flash_payment_id 
  ON rh.awards_productivity(flash_payment_id);

-- =====================================================
-- FUNÇÃO: Enviar premiação para Contas a Pagar
-- =====================================================
CREATE OR REPLACE FUNCTION send_award_to_accounts_payable(
  p_award_id UUID,
  p_sent_by UUID,
  p_due_date DATE DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_award RECORD;
  v_employee RECORD;
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
  IF v_award.accounts_payable_id IS NOT NULL THEN
    RAISE EXCEPTION 'Premiação já foi enviada para Contas a Pagar';
  END IF;
  
  -- Calcular data de vencimento (se não fornecida, usar 30 dias após o mês de referência)
  IF p_due_date IS NULL THEN
    v_data_vencimento := (DATE_TRUNC('month', v_award.mes_referencia) + INTERVAL '1 month + 29 days')::DATE;
  ELSE
    v_data_vencimento := p_due_date;
  END IF;
  
  -- Gerar número do título
  v_numero_titulo := 'PREM-' || 
    TO_CHAR(v_award.mes_referencia, 'MM/YYYY') || '-' || 
    SUBSTRING(v_award.employee_id::text, 1, 8) || '-' ||
    SUBSTRING(v_award.id::text, 1, 8);
  
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
    'pendente',
    'Gerado automaticamente a partir do sistema de Premiações e Produtividade. ' ||
    'Premiação ID: ' || p_award_id::text ||
    CASE WHEN v_award.criterios IS NOT NULL THEN '. Critérios: ' || v_award.criterios ELSE '' END,
    p_sent_by,
    true
  ) RETURNING id INTO v_conta_pagar_id;
  
  -- Atualizar premiação
  UPDATE rh.awards_productivity
  SET 
    accounts_payable_id = v_conta_pagar_id,
    enviado_contas_pagar_em = NOW(),
    updated_at = NOW()
  WHERE id = p_award_id;
  
  -- Retornar resultado
  v_result := json_build_object(
    'success', true,
    'award_id', p_award_id,
    'accounts_payable_id', v_conta_pagar_id,
    'numero_titulo', v_numero_titulo,
    'data_vencimento', v_data_vencimento,
    'message', 'Premiação enviada para Contas a Pagar com sucesso'
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
-- FUNÇÃO: Enviar premiação para Flash
-- =====================================================
-- Nota: Esta é uma função placeholder. Quando a API Flash estiver disponível,
-- substituir a lógica por chamadas reais à API
CREATE OR REPLACE FUNCTION send_award_to_flash(
  p_award_id UUID,
  p_sent_by UUID
) RETURNS JSON AS $$
DECLARE
  v_award RECORD;
  v_flash_account_number VARCHAR(255);
  v_flash_payment_id VARCHAR(255);
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
  
  -- Atualizar premiação
  UPDATE rh.awards_productivity
  SET 
    flash_account_number = v_flash_account_number,
    flash_payment_id = v_flash_payment_id,
    enviado_flash_em = NOW(),
    updated_at = NOW()
  WHERE id = p_award_id;
  
  -- Retornar resultado
  v_result := json_build_object(
    'success', true,
    'award_id', p_award_id,
    'flash_account_number', v_flash_account_number,
    'flash_payment_id', v_flash_payment_id,
    'message', 'Premiação enviada para Flash com sucesso (simulação)'
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
-- FUNÇÃO: Gerar boleto Flash para premiação
-- =====================================================
CREATE OR REPLACE FUNCTION generate_flash_invoice_for_award(
  p_award_id UUID,
  p_sent_by UUID
) RETURNS JSON AS $$
DECLARE
  v_award RECORD;
  v_flash_invoice_id VARCHAR(255);
  v_result JSON;
BEGIN
  -- Buscar premiação
  SELECT * INTO v_award
  FROM rh.awards_productivity
  WHERE id = p_award_id
    AND flash_payment_id IS NOT NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Premiação não encontrada ou não foi enviada para Flash';
  END IF;
  
  -- TODO: Integração real com Flash API para gerar boleto
  -- Por enquanto, apenas simula a geração
  
  v_flash_invoice_id := 'INV-AWARD-' || SUBSTRING(p_award_id::text, 1, 8) || '-' || EXTRACT(EPOCH FROM NOW())::bigint;
  
  -- Atualizar premiação
  UPDATE rh.awards_productivity
  SET 
    flash_invoice_id = v_flash_invoice_id,
    updated_at = NOW()
  WHERE id = p_award_id;
  
  -- Retornar resultado
  v_result := json_build_object(
    'success', true,
    'award_id', p_award_id,
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
-- FUNÇÃO: Enviar múltiplas premiações para Contas a Pagar
-- =====================================================
CREATE OR REPLACE FUNCTION send_multiple_awards_to_accounts_payable(
  p_award_ids UUID[],
  p_sent_by UUID,
  p_due_date DATE DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_award_id UUID;
  v_results JSON[] := '{}';
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_result JSON;
BEGIN
  FOREACH v_award_id IN ARRAY p_award_ids
  LOOP
    BEGIN
      v_result := send_award_to_accounts_payable(v_award_id, p_sent_by, p_due_date);
      
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
          'award_id', v_award_id,
          'error', SQLERRM
        ));
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'total', array_length(p_award_ids, 1),
    'success_count', v_success_count,
    'error_count', v_error_count,
    'results', v_results
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: Enviar múltiplas premiações para Flash
-- =====================================================
CREATE OR REPLACE FUNCTION send_multiple_awards_to_flash(
  p_award_ids UUID[],
  p_sent_by UUID
) RETURNS JSON AS $$
DECLARE
  v_award_id UUID;
  v_results JSON[] := '{}';
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_result JSON;
BEGIN
  FOREACH v_award_id IN ARRAY p_award_ids
  LOOP
    BEGIN
      v_result := send_award_to_flash(v_award_id, p_sent_by);
      
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
          'award_id', v_award_id,
          'error', SQLERRM
        ));
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'total', array_length(p_award_ids, 1),
    'success_count', v_success_count,
    'error_count', v_error_count,
    'results', v_results
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Criar conta a pagar automaticamente ao aprovar premiação
-- =====================================================
-- Este trigger cria automaticamente uma conta a pagar quando uma premiação é aprovada
CREATE OR REPLACE FUNCTION create_accounts_payable_on_award_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_conta_pagar_id UUID;
  v_numero_titulo VARCHAR(50);
  v_data_vencimento DATE;
  v_employee_name VARCHAR(255);
  v_employee_cpf VARCHAR(20);
BEGIN
  -- Apenas processar se o status mudou para 'aprovado'
  IF NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status != 'aprovado') THEN
    -- Verificar se já existe conta a pagar
    IF NEW.accounts_payable_id IS NULL THEN
      -- Buscar dados do funcionário
      SELECT nome, cpf INTO v_employee_name, v_employee_cpf
      FROM rh.employees
      WHERE id = NEW.employee_id;
      
      -- Calcular data de vencimento (30 dias após o mês de referência)
      v_data_vencimento := (DATE_TRUNC('month', NEW.mes_referencia) + INTERVAL '1 month + 29 days')::DATE;
      
      -- Gerar número do título
      v_numero_titulo := 'PREM-' || 
        TO_CHAR(NEW.mes_referencia, 'MM/YYYY') || '-' || 
        SUBSTRING(NEW.employee_id::text, 1, 8) || '-' ||
        SUBSTRING(NEW.id::text, 1, 8);
      
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
        NEW.company_id,
        v_numero_titulo,
        v_employee_name,
        v_employee_cpf,
        COALESCE(NEW.nome, 'Premiação') || 
        ' - ' || v_employee_name || 
        ' - ' || TO_CHAR(NEW.mes_referencia, 'MM/YYYY') ||
        CASE WHEN NEW.descricao IS NOT NULL THEN ' - ' || NEW.descricao ELSE '' END,
        NEW.valor,
        NEW.valor,
        NOW()::DATE,
        v_data_vencimento,
        'Premiações e Produtividade',
        'pendente',
        'Gerado automaticamente a partir do sistema de Premiações e Produtividade. ' ||
        'Premiação ID: ' || NEW.id::text ||
        CASE WHEN NEW.criterios IS NOT NULL THEN '. Critérios: ' || NEW.criterios ELSE '' END,
        COALESCE(NEW.aprovado_por, auth.uid()),
        true
      ) RETURNING id INTO v_conta_pagar_id;
      
      -- Atualizar premiação com o ID da conta a pagar
      NEW.accounts_payable_id := v_conta_pagar_id;
      NEW.enviado_contas_pagar_em := NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_create_accounts_payable_on_award_approval ON rh.awards_productivity;
CREATE TRIGGER trigger_create_accounts_payable_on_award_approval
  BEFORE UPDATE ON rh.awards_productivity
  FOR EACH ROW
  EXECUTE FUNCTION create_accounts_payable_on_award_approval();

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON FUNCTION send_award_to_accounts_payable IS 'Cria conta a pagar a partir de premiação aprovada';
COMMENT ON FUNCTION send_award_to_flash IS 'Envia premiação para Flash API (placeholder até integração real)';
COMMENT ON FUNCTION generate_flash_invoice_for_award IS 'Gera boleto Flash para premiação';
COMMENT ON FUNCTION send_multiple_awards_to_accounts_payable IS 'Envia múltiplas premiações para Contas a Pagar em lote';
COMMENT ON FUNCTION send_multiple_awards_to_flash IS 'Envia múltiplas premiações para Flash em lote';
COMMENT ON FUNCTION create_accounts_payable_on_award_approval IS 'Trigger que cria conta a pagar automaticamente quando premiação é aprovada';

