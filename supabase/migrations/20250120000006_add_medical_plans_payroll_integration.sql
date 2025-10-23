-- =====================================================
-- INTEGRAÇÃO CONVÊNIOS MÉDICOS COM FOLHA DE PAGAMENTO
-- =====================================================
-- Data: 2025-01-20
-- Descrição: Adiciona campos e funções para integrar convênios médicos com folha de pagamento

-- Adicionar campo para controlar se convênio médico entra no cálculo da folha
ALTER TABLE rh.medical_plans 
ADD COLUMN IF NOT EXISTS entra_no_calculo_folha BOOLEAN DEFAULT true;

-- Adicionar campo para controlar se adesão do funcionário entra no cálculo da folha
ALTER TABLE rh.employee_medical_plans 
ADD COLUMN IF NOT EXISTS entra_no_calculo_folha BOOLEAN DEFAULT true;

-- Adicionar campo para tipo de desconto (provento ou desconto)
ALTER TABLE rh.medical_plans 
ADD COLUMN IF NOT EXISTS tipo_folha VARCHAR(20) DEFAULT 'desconto' CHECK (tipo_folha IN ('provento', 'desconto'));

-- Adicionar campo para categoria de desconto
ALTER TABLE rh.medical_plans 
ADD COLUMN IF NOT EXISTS categoria_desconto VARCHAR(50) DEFAULT 'convenio_medico' CHECK (categoria_desconto IN ('convenio_medico', 'convenio_odontologico', 'seguro_vida', 'outros'));

-- Comentários das colunas
COMMENT ON COLUMN rh.medical_plans.entra_no_calculo_folha IS 'Se o plano médico deve ser incluído no cálculo da folha de pagamento';
COMMENT ON COLUMN rh.employee_medical_plans.entra_no_calculo_folha IS 'Se a adesão do funcionário ao plano deve ser incluída no cálculo da folha';
COMMENT ON COLUMN rh.medical_plans.tipo_folha IS 'Tipo: provento (benefício) ou desconto (desconto do salário)';
COMMENT ON COLUMN rh.medical_plans.categoria_desconto IS 'Categoria do desconto para agrupamento na folha';

-- Atualizar registros existentes para manter compatibilidade
UPDATE rh.medical_plans 
SET entra_no_calculo_folha = true,
    tipo_folha = 'desconto',
    categoria_desconto = CASE 
        WHEN EXISTS(SELECT 1 FROM rh.medical_agreements ma WHERE ma.id = medical_plans.agreement_id AND ma.tipo = 'medico') THEN 'convenio_medico'
        WHEN EXISTS(SELECT 1 FROM rh.medical_agreements ma WHERE ma.id = medical_plans.agreement_id AND ma.tipo = 'odontologico') THEN 'convenio_odontologico'
        ELSE 'convenio_medico'
    END
WHERE entra_no_calculo_folha IS NULL;

UPDATE rh.employee_medical_plans 
SET entra_no_calculo_folha = true 
WHERE entra_no_calculo_folha IS NULL;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_medical_plans_entra_no_calculo_folha ON rh.medical_plans(entra_no_calculo_folha);
CREATE INDEX IF NOT EXISTS idx_medical_plans_tipo_folha ON rh.medical_plans(tipo_folha);
CREATE INDEX IF NOT EXISTS idx_medical_plans_categoria_desconto ON rh.medical_plans(categoria_desconto);
CREATE INDEX IF NOT EXISTS idx_employee_medical_plans_entra_no_calculo_folha ON rh.employee_medical_plans(entra_no_calculo_folha);
CREATE INDEX IF NOT EXISTS idx_employee_medical_plans_status_ativo ON rh.employee_medical_plans(status) WHERE status = 'ativo';

-- Adicionar constraints para garantir que os campos não sejam nulos
ALTER TABLE rh.medical_plans 
ALTER COLUMN entra_no_calculo_folha SET NOT NULL,
ALTER COLUMN tipo_folha SET NOT NULL,
ALTER COLUMN categoria_desconto SET NOT NULL;

ALTER TABLE rh.employee_medical_plans 
ALTER COLUMN entra_no_calculo_folha SET NOT NULL;
