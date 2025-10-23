-- =====================================================
-- ADIÇÃO DE CAMPOS DE DOCUMENTAÇÃO PARA FUNCIONÁRIOS
-- =====================================================

-- Adicionar campos de documentação pessoal
ALTER TABLE rh.employees 
ADD COLUMN IF NOT EXISTS certidao_nascimento VARCHAR(255),
ADD COLUMN IF NOT EXISTS certidao_casamento VARCHAR(255),
ADD COLUMN IF NOT EXISTS titulo_eleitor VARCHAR(255),
ADD COLUMN IF NOT EXISTS ctps VARCHAR(255),
ADD COLUMN IF NOT EXISTS pis_pasep VARCHAR(255),
ADD COLUMN IF NOT EXISTS certificado_reservista VARCHAR(255),
ADD COLUMN IF NOT EXISTS comprovante_endereco VARCHAR(255),
ADD COLUMN IF NOT EXISTS foto_funcionario TEXT, -- URL da foto
ADD COLUMN IF NOT EXISTS escolaridade VARCHAR(100),
ADD COLUMN IF NOT EXISTS tipo_cnh VARCHAR(10), -- A, B, C, D, E
ADD COLUMN IF NOT EXISTS cartao_sus VARCHAR(255),
ADD COLUMN IF NOT EXISTS registros_profissionais JSONB, -- CREA, CRM, OAB, Coren, etc.
ADD COLUMN IF NOT EXISTS outros_vinculos_empregaticios BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS detalhes_outros_vinculos TEXT;

-- Adicionar campos bancários
ALTER TABLE rh.employees 
ADD COLUMN IF NOT EXISTS banco_nome VARCHAR(255),
ADD COLUMN IF NOT EXISTS banco_agencia VARCHAR(20),
ADD COLUMN IF NOT EXISTS banco_conta VARCHAR(50),
ADD COLUMN IF NOT EXISTS banco_tipo_conta VARCHAR(20), -- corrente, poupanca, salario
ADD COLUMN IF NOT EXISTS banco_pix VARCHAR(255);

-- Criar índices para os novos campos
CREATE INDEX IF NOT EXISTS idx_employees_escolaridade ON rh.employees(escolaridade);
CREATE INDEX IF NOT EXISTS idx_employees_tipo_cnh ON rh.employees(tipo_cnh);
CREATE INDEX IF NOT EXISTS idx_employees_outros_vinculos ON rh.employees(outros_vinculos_empregaticios);

-- Adicionar comentários para documentação
COMMENT ON COLUMN rh.employees.certidao_nascimento IS 'Número da certidão de nascimento';
COMMENT ON COLUMN rh.employees.certidao_casamento IS 'Número da certidão de casamento (se aplicável)';
COMMENT ON COLUMN rh.employees.titulo_eleitor IS 'Número do título de eleitor';
COMMENT ON COLUMN rh.employees.ctps IS 'Número da Carteira de Trabalho (CTPS)';
COMMENT ON COLUMN rh.employees.pis_pasep IS 'Número do PIS/PASEP ou NIS/NIT';
COMMENT ON COLUMN rh.employees.certificado_reservista IS 'Número do certificado de reservista (homens até 45 anos)';
COMMENT ON COLUMN rh.employees.comprovante_endereco IS 'Comprovante de endereço atualizado (últimos 3 meses)';
COMMENT ON COLUMN rh.employees.foto_funcionario IS 'URL da foto do funcionário';
COMMENT ON COLUMN rh.employees.escolaridade IS 'Nível de escolaridade';
COMMENT ON COLUMN rh.employees.tipo_cnh IS 'Tipo da CNH (A, B, C, D, E)';
COMMENT ON COLUMN rh.employees.cartao_sus IS 'Número do cartão do SUS';
COMMENT ON COLUMN rh.employees.registros_profissionais IS 'Registros profissionais (CREA, CRM, OAB, Coren, etc.) em formato JSON';
COMMENT ON COLUMN rh.employees.outros_vinculos_empregaticios IS 'Possui outros vínculos empregatícios';
COMMENT ON COLUMN rh.employees.detalhes_outros_vinculos IS 'Detalhes dos outros vínculos empregatícios';
COMMENT ON COLUMN rh.employees.banco_nome IS 'Nome do banco';
COMMENT ON COLUMN rh.employees.banco_agencia IS 'Número da agência';
COMMENT ON COLUMN rh.employees.banco_conta IS 'Número da conta';
COMMENT ON COLUMN rh.employees.banco_tipo_conta IS 'Tipo da conta (corrente, poupança, salário)';
COMMENT ON COLUMN rh.employees.banco_pix IS 'Chave PIX';

-- Atualizar RLS policies se necessário (as existentes já cobrem os novos campos)
