-- =====================================================
-- CORREÇÃO: Criar aprovações automáticas para equipment_rental_approvals
-- =====================================================
-- Data: 2025-12-12
-- Descrição: Cria trigger para criar aprovações no portal do gestor quando
--            um novo aluguel de equipamento é cadastrado em equipment_rental_approvals

-- =====================================================
-- 1. FUNÇÃO PARA CRIAR APROVAÇÕES AUTOMÁTICAS
--    Para equipment_rental_approvals (aluguéis iniciais)
-- =====================================================

CREATE OR REPLACE FUNCTION create_approvals_for_equipment_rental_approval(
  p_equipment_rental_id UUID,
  p_company_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_equipment_rental RECORD;
  v_gestor_id UUID;
  v_approval_created BOOLEAN := false;
BEGIN
  -- Buscar dados do aluguel de equipamento
  SELECT 
    era.*,
    e.gestor_imediato_id,
    e.nome as employee_name
  INTO v_equipment_rental
  FROM rh.equipment_rental_approvals era
  JOIN rh.employees e ON e.id = era.employee_id
  WHERE era.id = p_equipment_rental_id
    AND era.company_id = p_company_id
    AND era.status = 'pendente';

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Se o funcionário tem gestor imediato, criar aprovação para ele
  IF v_equipment_rental.gestor_imediato_id IS NOT NULL THEN
    -- Buscar profile_id do gestor usando função auxiliar
    v_gestor_id := public.get_profile_id_for_user(v_equipment_rental.gestor_imediato_id, p_company_id);

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
        'equipment_rental_approval',
        p_equipment_rental_id,
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
    'equipment_rental_approval',
    p_equipment_rental_id,
    p_company_id
  );

  RETURN v_approval_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_approvals_for_equipment_rental_approval IS 'Cria aprovações automáticas para aluguel de equipamento inicial, identificando gestor do funcionário';

-- =====================================================
-- 2. TRIGGER PARA CRIAR APROVAÇÕES AUTOMÁTICAS
--    Quando um novo equipment_rental_approval é inserido
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_create_approvals_equipment_rental_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas criar aprovações se o status for 'pendente'
  IF NEW.status = 'pendente' THEN
    PERFORM create_approvals_for_equipment_rental_approval(NEW.id, NEW.company_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trigger_create_approvals_equipment_rental_approval ON rh.equipment_rental_approvals;

CREATE TRIGGER trigger_create_approvals_equipment_rental_approval
  AFTER INSERT ON rh.equipment_rental_approvals
  FOR EACH ROW
  WHEN (NEW.status = 'pendente')
  EXECUTE FUNCTION trigger_create_approvals_equipment_rental_approval();

COMMENT ON TRIGGER trigger_create_approvals_equipment_rental_approval ON rh.equipment_rental_approvals IS 'Cria aprovações automáticas quando um novo aluguel de equipamento é cadastrado';

-- =====================================================
-- 3. ADICIONAR SUPORTE PARA equipment_rental_approval
--    NO SISTEMA DE APROVAÇÕES UNIFICADO
-- =====================================================

-- Atualizar função get_required_approvers para suportar equipment_rental_approval
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
            
        WHEN 'equipment_rental_approval' THEN
            SELECT 
              era.valor_mensal,
              e.cost_center_id,
              NULL::VARCHAR as departamento,
              NULL::VARCHAR as classe_financeira,
              era.employee_id
            INTO processo_valor, processo_centro_custo_id, processo_departamento, processo_classe_financeira, processo_usuario_id
            FROM rh.equipment_rental_approvals era
            JOIN rh.employees e ON e.id = era.employee_id
            WHERE era.id = p_processo_id AND era.company_id = p_company_id;
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

COMMENT ON FUNCTION public.get_required_approvers IS 'Retorna aprovadores necessários, incluindo suporte para equipment_rental_approval e equipment_rental_monthly_payment';
