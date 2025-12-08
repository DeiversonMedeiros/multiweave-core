-- =====================================================
-- CRIAÇÃO DE TABELA PARA FAIXAS ETÁRIAS DE PLANOS MÉDICOS
-- =====================================================
-- Data: 2025-12-08
-- Descrição: Cria tabela para armazenar valores diferentes por faixa etária
--            para cada plano médico. Permite que cada plano tenha múltiplas
--            faixas etárias com valores específicos para titular e dependente.
-- =====================================================

-- Tabela de faixas etárias dos planos médicos
CREATE TABLE IF NOT EXISTS rh.medical_plan_age_ranges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES rh.medical_plans(id) ON DELETE CASCADE,
    idade_min INTEGER NOT NULL CHECK (idade_min >= 0),
    idade_max INTEGER NOT NULL CHECK (idade_max >= idade_min AND idade_max <= 120),
    valor_titular DECIMAL(10,2) NOT NULL,
    valor_dependente DECIMAL(10,2) NOT NULL,
    ordem INTEGER DEFAULT 0, -- Ordem de prioridade (menor número = maior prioridade)
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Garantir que não haja sobreposição de faixas para o mesmo plano
    CONSTRAINT unique_plan_age_range UNIQUE(plan_id, idade_min, idade_max)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_medical_plan_age_ranges_company_id ON rh.medical_plan_age_ranges(company_id);
CREATE INDEX IF NOT EXISTS idx_medical_plan_age_ranges_plan_id ON rh.medical_plan_age_ranges(plan_id);
CREATE INDEX IF NOT EXISTS idx_medical_plan_age_ranges_ativo ON rh.medical_plan_age_ranges(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_medical_plan_age_ranges_idade ON rh.medical_plan_age_ranges(idade_min, idade_max);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_medical_plan_age_ranges_updated_at 
BEFORE UPDATE ON rh.medical_plan_age_ranges 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE rh.medical_plan_age_ranges IS 'Faixas etárias e valores específicos para cada plano médico. Permite que cada plano tenha valores diferentes por idade.';
COMMENT ON COLUMN rh.medical_plan_age_ranges.idade_min IS 'Idade mínima da faixa (inclusive)';
COMMENT ON COLUMN rh.medical_plan_age_ranges.idade_max IS 'Idade máxima da faixa (inclusive)';
COMMENT ON COLUMN rh.medical_plan_age_ranges.valor_titular IS 'Valor mensal para titular nesta faixa etária';
COMMENT ON COLUMN rh.medical_plan_age_ranges.valor_dependente IS 'Valor mensal para dependente nesta faixa etária';
COMMENT ON COLUMN rh.medical_plan_age_ranges.ordem IS 'Ordem de prioridade quando há sobreposição (menor = maior prioridade)';

-- Função para buscar valor por idade
CREATE OR REPLACE FUNCTION rh.get_plan_value_by_age(
    p_plan_id UUID,
    p_idade INTEGER,
    p_tipo VARCHAR DEFAULT 'titular' -- 'titular' ou 'dependente'
) RETURNS DECIMAL(10,2) AS $$
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
$$ LANGUAGE plpgsql STABLE;

-- Comentário da função
COMMENT ON FUNCTION rh.get_plan_value_by_age(UUID, INTEGER, VARCHAR) IS 
'Retorna o valor mensal do plano para uma idade específica. Primeiro busca em faixas etárias específicas, depois usa valor padrão do plano.';

-- Garantir permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON rh.medical_plan_age_ranges TO authenticated;
GRANT EXECUTE ON FUNCTION rh.get_plan_value_by_age(UUID, INTEGER, VARCHAR) TO authenticated;
