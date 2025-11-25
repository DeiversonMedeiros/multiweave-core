-- =====================================================
-- RPC FUNCTION PARA LISTAR PAGAMENTOS MENSAIS COM RELAÇÕES
-- =====================================================
-- Data: 2025-11-04
-- Descrição: Função RPC para listar pagamentos mensais com relações employee e equipment_rental

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

COMMENT ON FUNCTION public.list_equipment_rental_monthly_payments IS 'Lista pagamentos mensais de aluguéis com relações employee e equipment_rental';

