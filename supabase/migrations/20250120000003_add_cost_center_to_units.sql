-- =====================================================
-- MIGRAÇÃO: Adicionar vínculo entre departamentos e centros de custo
-- Data: 2025-01-20
-- Descrição: Adiciona campo cost_center_id na tabela rh.units
-- =====================================================

-- Adicionar campo cost_center_id na tabela rh.units
ALTER TABLE rh.units 
ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES public.cost_centers(id);

-- Adicionar comentário no campo
COMMENT ON COLUMN rh.units.cost_center_id IS 'Centro de custo associado ao departamento';

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_units_cost_center_id ON rh.units(cost_center_id);

-- Atualizar RLS para incluir o novo campo
-- A política já existente deve funcionar, mas vamos garantir que o campo seja acessível
DO $$
BEGIN
    -- Verificar se as políticas RLS existem para a tabela units
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'rh' 
        AND tablename = 'units'
    ) THEN
        RAISE NOTICE 'Políticas RLS já existem para rh.units';
    ELSE
        -- Criar políticas RLS básicas se não existirem
        CREATE POLICY "Users can view units from their companies" ON rh.units
            FOR SELECT USING (
                company_id IN (
                    SELECT company_id FROM user_companies 
                    WHERE user_id = auth.uid() AND ativo = true
                )
            );
            
        CREATE POLICY "Users can insert units for their companies" ON rh.units
            FOR INSERT WITH CHECK (
                company_id IN (
                    SELECT company_id FROM user_companies 
                    WHERE user_id = auth.uid() AND ativo = true
                )
            );
            
        CREATE POLICY "Users can update units from their companies" ON rh.units
            FOR UPDATE USING (
                company_id IN (
                    SELECT company_id FROM user_companies 
                    WHERE user_id = auth.uid() AND ativo = true
                )
            );
            
        CREATE POLICY "Users can delete units from their companies" ON rh.units
            FOR DELETE USING (
                company_id IN (
                    SELECT company_id FROM user_companies 
                    WHERE user_id = auth.uid() AND ativo = true
                )
            );
    END IF;
END $$;

-- Log de confirmacao
DO $$
BEGIN
    RAISE NOTICE 'Campo cost_center_id adicionado a tabela rh.units com sucesso!';
    RAISE NOTICE 'Indice criado para performance';
    RAISE NOTICE 'Politicas RLS verificadas/criadas';
END $$;
