-- =====================================================
-- ADIÇÃO DE CAMPO PARA CONTROLE DE REGISTRO DE PONTO
-- =====================================================
-- Artigo 62 da CLT: Funcionários que não precisam registrar ponto
-- Este campo permite habilitar/desabilitar o registro de ponto por funcionário
-- =====================================================

-- Adicionar campo requer_registro_ponto na tabela employees
ALTER TABLE rh.employees 
ADD COLUMN IF NOT EXISTS requer_registro_ponto BOOLEAN DEFAULT true;

-- Adicionar comentário para documentação
COMMENT ON COLUMN rh.employees.requer_registro_ponto IS 
'Indica se o funcionário precisa registrar ponto. Baseado no Artigo 62 da CLT. Default: true (requer registro).';

-- Criar índice para melhorar performance em consultas
CREATE INDEX IF NOT EXISTS idx_employees_requer_registro_ponto 
ON rh.employees(requer_registro_ponto) 
WHERE requer_registro_ponto = false;

-- Atualizar funcionários existentes para manter compatibilidade
-- Por padrão, todos os funcionários existentes continuarão requerendo registro de ponto
UPDATE rh.employees 
SET requer_registro_ponto = true 
WHERE requer_registro_ponto IS NULL;

