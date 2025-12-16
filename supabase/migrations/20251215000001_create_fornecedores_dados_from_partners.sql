-- =====================================================
-- CRIAR REGISTROS EM fornecedores_dados PARA PARTNERS DO TIPO FORNECEDOR
-- =====================================================
-- Esta migração cria registros em compras.fornecedores_dados
-- para todos os partners do tipo 'fornecedor' que ainda não possuem
-- um registro correspondente em fornecedores_dados

INSERT INTO compras.fornecedores_dados (
    id,
    partner_id,
    company_id,
    status,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    p.id,
    p.company_id,
    'ativo'::VARCHAR(20),
    p.created_at,
    NOW()
FROM public.partners p
WHERE 
    -- Apenas partners do tipo fornecedor
    'fornecedor' = ANY(p.tipo)
    -- Apenas partners ativos
    AND p.ativo = true
    -- Apenas se não existir registro em fornecedores_dados
    AND NOT EXISTS (
        SELECT 1 
        FROM compras.fornecedores_dados fd 
        WHERE fd.partner_id = p.id 
        AND fd.company_id = p.company_id
    )
ON CONFLICT (partner_id, company_id) DO NOTHING;

-- Log da operação
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM compras.fornecedores_dados;
    
    RAISE NOTICE 'Total de registros em fornecedores_dados após migração: %', v_count;
END $$;
