-- =====================================================
-- CRIAÇÃO DA TABELA DE DEPENDENTES (VERSÃO CORRIGIDA)
-- =====================================================

-- Criar tabela de dependentes
CREATE TABLE IF NOT EXISTS rh.dependents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE,
  rg VARCHAR(20),
  data_nascimento DATE,
  parentesco VARCHAR(50) NOT NULL CHECK (parentesco IN (
    'conjuge', 'companheiro', 'filho', 'filha', 'pai', 'mae', 
    'sogro', 'sogra', 'neto', 'neta', 'irmao', 'irma', 
    'tio', 'tia', 'sobrinho', 'sobrinha', 'outros'
  )),
  sexo VARCHAR(10) CHECK (sexo IN ('masculino', 'feminino', 'outro')),
  estado_civil VARCHAR(50),
  nacionalidade VARCHAR(100),
  naturalidade VARCHAR(100),
  nome_mae VARCHAR(255),
  nome_pai VARCHAR(255),
  cpf_mae VARCHAR(14),
  cpf_pai VARCHAR(14),
  telefone VARCHAR(20),
  email VARCHAR(255),
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(10),
  -- Campos específicos para diferentes tipos de parentesco
  data_casamento DATE, -- Para cônjuge/companheiro
  data_uniao_estavel DATE, -- Para companheiro
  data_separacao DATE, -- Para ex-cônjuge
  data_obito DATE, -- Para falecidos
  -- Campos para filhos
  data_nascimento_mae DATE, -- Para verificação de idade da mãe
  escolaridade VARCHAR(50),
  instituicao_ensino VARCHAR(255),
  -- Campos para benefícios
  possui_deficiencia BOOLEAN DEFAULT false,
  tipo_deficiencia VARCHAR(100),
  grau_deficiencia VARCHAR(50),
  necessita_cuidados_especiais BOOLEAN DEFAULT false,
  -- Campos para documentação
  certidao_nascimento VARCHAR(100),
  certidao_casamento VARCHAR(100),
  certidao_uniao_estavel VARCHAR(100),
  comprovante_residencia VARCHAR(100),
  -- Status e controle
  status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso', 'excluido')),
  data_inclusao DATE DEFAULT CURRENT_DATE,
  data_exclusao DATE,
  motivo_exclusao TEXT,
  observacoes TEXT,
  -- Campos de auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID ,
  updated_by UUID 
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_dependents_company_id ON rh.dependents(company_id);
CREATE INDEX IF NOT EXISTS idx_dependents_employee_id ON rh.dependents(employee_id);
CREATE INDEX IF NOT EXISTS idx_dependents_parentesco ON rh.dependents(parentesco);
CREATE INDEX IF NOT EXISTS idx_dependents_status ON rh.dependents(status);
CREATE INDEX IF NOT EXISTS idx_dependents_cpf ON rh.dependents(cpf);
CREATE INDEX IF NOT EXISTS idx_dependents_data_nascimento ON rh.dependents(data_nascimento);

-- Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dependents_updated_at 
  BEFORE UPDATE ON rh.dependents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários na tabela e colunas
COMMENT ON TABLE rh.dependents IS 'Tabela para cadastro de dependentes dos funcionários';
COMMENT ON COLUMN rh.dependents.parentesco IS 'Tipo de parentesco com o funcionário';
COMMENT ON COLUMN rh.dependents.data_casamento IS 'Data do casamento (para cônjuge)';
COMMENT ON COLUMN rh.dependents.data_uniao_estavel IS 'Data da união estável (para companheiro)';
COMMENT ON COLUMN rh.dependents.data_separacao IS 'Data da separação (para ex-cônjuge)';
COMMENT ON COLUMN rh.dependents.data_obito IS 'Data do óbito (para falecidos)';
COMMENT ON COLUMN rh.dependents.escolaridade IS 'Nível de escolaridade do dependente';
COMMENT ON COLUMN rh.dependents.instituicao_ensino IS 'Instituição de ensino onde estuda';
COMMENT ON COLUMN rh.dependents.possui_deficiencia IS 'Indica se o dependente possui deficiência';
COMMENT ON COLUMN rh.dependents.tipo_deficiencia IS 'Tipo de deficiência (física, visual, auditiva, etc.)';
COMMENT ON COLUMN rh.dependents.grau_deficiencia IS 'Grau da deficiência (leve, moderada, severa, profunda)';
COMMENT ON COLUMN rh.dependents.necessita_cuidados_especiais IS 'Indica se necessita de cuidados especiais';
COMMENT ON COLUMN rh.dependents.certidao_nascimento IS 'Número da certidão de nascimento';
COMMENT ON COLUMN rh.dependents.certidao_casamento IS 'Número da certidão de casamento';
COMMENT ON COLUMN rh.dependents.certidao_uniao_estavel IS 'Número da certidão de união estável';
COMMENT ON COLUMN rh.dependents.comprovante_residencia IS 'Número do comprovante de residência';
COMMENT ON COLUMN rh.dependents.data_inclusao IS 'Data de inclusão como dependente';
COMMENT ON COLUMN rh.dependents.data_exclusao IS 'Data de exclusão como dependente';
COMMENT ON COLUMN rh.dependents.motivo_exclusao IS 'Motivo da exclusão como dependente';

-- Criar view para dependentes ativos com informações do funcionário
CREATE VIEW rh.dependents_with_employee AS
SELECT 
  d.*,
  e.nome as funcionario_nome,
  e.matricula as funcionario_matricula,
  e.cpf as funcionario_cpf
FROM rh.dependents d
JOIN rh.employees e ON d.employee_id = e.id
WHERE d.status = 'ativo';

-- Comentário na view
COMMENT ON VIEW rh.dependents_with_employee IS 'View para consultar dependentes ativos com informações do funcionário';
