-- =====================================================
-- MIGRAÇÃO: Trigger para atualizar conta principal quando todas as parcelas são pagas
-- Data....: 2026-01-04
-- Descrição:
--   - Cria trigger que atualiza automaticamente o status da conta principal
--   - quando todas as parcelas são pagas
--   - Calcula valor_pago total e define data_pagamento
-- =====================================================

-- Função para atualizar conta principal quando todas as parcelas são pagas
CREATE OR REPLACE FUNCTION financeiro.update_conta_principal_when_all_parcelas_paid()
RETURNS TRIGGER AS $$
DECLARE
    v_total_parcelas INTEGER;
    v_parcelas_pagas INTEGER;
    v_valor_pago_total DECIMAL(15,2);
    v_data_pagamento_final DATE;
    v_conta_pagar_id UUID;
BEGIN
    -- Só processa se o status foi alterado para 'pago'
    IF NEW.status = 'pago' AND (OLD.status IS NULL OR OLD.status != 'pago') THEN
        v_conta_pagar_id := NEW.conta_pagar_id;
        
        -- Contar total de parcelas e parcelas pagas
        SELECT 
            COUNT(*)::INTEGER,
            COUNT(*) FILTER (WHERE status = 'pago')::INTEGER,
            COALESCE(SUM(valor_pago) FILTER (WHERE status = 'pago'), 0),
            MAX(data_pagamento) FILTER (WHERE status = 'pago')
        INTO 
            v_total_parcelas,
            v_parcelas_pagas,
            v_valor_pago_total,
            v_data_pagamento_final
        FROM financeiro.contas_pagar_parcelas
        WHERE conta_pagar_id = v_conta_pagar_id;
        
        -- Se todas as parcelas foram pagas, atualizar conta principal
        IF v_total_parcelas > 0 AND v_parcelas_pagas = v_total_parcelas THEN
            UPDATE financeiro.contas_pagar
            SET 
                status = 'pago',
                valor_pago = v_valor_pago_total,
                data_pagamento = v_data_pagamento_final,
                updated_at = NOW()
            WHERE id = v_conta_pagar_id
            AND status != 'pago'; -- Evita atualizações desnecessárias
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_update_conta_principal_when_all_parcelas_paid 
    ON financeiro.contas_pagar_parcelas;

CREATE TRIGGER trigger_update_conta_principal_when_all_parcelas_paid
    AFTER UPDATE OF status, valor_pago, data_pagamento ON financeiro.contas_pagar_parcelas
    FOR EACH ROW
    WHEN (NEW.status = 'pago' AND (OLD.status IS NULL OR OLD.status != 'pago'))
    EXECUTE FUNCTION financeiro.update_conta_principal_when_all_parcelas_paid();

COMMENT ON FUNCTION financeiro.update_conta_principal_when_all_parcelas_paid() IS 
'Atualiza automaticamente o status da conta principal para "pago" quando todas as parcelas são pagas';

-- =====================================================
-- CORREÇÃO: Atualizar contas que já têm todas as parcelas pagas
-- =====================================================

-- Atualizar contas que já têm todas as parcelas pagas mas status não foi atualizado
UPDATE financeiro.contas_pagar cp
SET 
    status = 'pago',
    valor_pago = sub.valor_pago_total,
    data_pagamento = sub.data_pagamento_final,
    updated_at = NOW()
FROM (
    SELECT 
        cp2.id as conta_id,
        COALESCE(SUM(cpp.valor_pago) FILTER (WHERE cpp.status = 'pago'), 0) as valor_pago_total,
        MAX(cpp.data_pagamento) FILTER (WHERE cpp.status = 'pago') as data_pagamento_final
    FROM financeiro.contas_pagar cp2
    INNER JOIN financeiro.contas_pagar_parcelas cpp ON cp2.id = cpp.conta_pagar_id
    WHERE cp2.is_parcelada = true
    AND cp2.status != 'pago'
    AND cp2.status != 'cancelado'
    GROUP BY cp2.id
    HAVING COUNT(cpp.id) > 0 
    AND COUNT(*) FILTER (WHERE cpp.status = 'pago') = COUNT(cpp.id)
) sub
WHERE cp.id = sub.conta_id
AND cp.status != 'pago';

