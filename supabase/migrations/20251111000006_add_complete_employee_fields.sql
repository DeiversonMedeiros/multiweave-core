-- =====================================================
-- ADICIONAR CAMPOS COMPLETOS PARA CADASTRO DE FUNCIONÁRIO
-- Data: 2025-11-11
-- Descrição: Adiciona campos detalhados para documentos e informações pessoais do funcionário
-- =====================================================

-- Adicionar campos relacionados ao RG
ALTER TABLE rh.employees 
ADD COLUMN IF NOT EXISTS rg_orgao_emissor VARCHAR(20),
ADD COLUMN IF NOT EXISTS rg_uf_emissao VARCHAR(2),
ADD COLUMN IF NOT EXISTS rg_data_emissao DATE;

-- Adicionar campos relacionados ao Título de Eleitor
ALTER TABLE rh.employees 
ADD COLUMN IF NOT EXISTS titulo_eleitor_zona VARCHAR(10),
ADD COLUMN IF NOT EXISTS titulo_eleitor_secao VARCHAR(10);

-- Adicionar campos relacionados à CTPS
ALTER TABLE rh.employees 
ADD COLUMN IF NOT EXISTS ctps_serie VARCHAR(20),
ADD COLUMN IF NOT EXISTS ctps_uf VARCHAR(2),
ADD COLUMN IF NOT EXISTS ctps_data_emissao DATE;

-- Adicionar campos relacionados à CNH
ALTER TABLE rh.employees 
ADD COLUMN IF NOT EXISTS cnh_numero VARCHAR(20),
ADD COLUMN IF NOT EXISTS cnh_validade DATE,
ADD COLUMN IF NOT EXISTS cnh_categoria VARCHAR(10); -- A, B, C, D, E, AB, AC, AD, AE

-- Adicionar campos de identidade pessoal
ALTER TABLE rh.employees 
ADD COLUMN IF NOT EXISTS sexo VARCHAR(20) CHECK (sexo IN ('masculino', 'feminino', 'outro', 'nao_informar')),
ADD COLUMN IF NOT EXISTS orientacao_sexual VARCHAR(50) CHECK (orientacao_sexual IN ('heterossexual', 'homossexual', 'bissexual', 'pansexual', 'assexual', 'outro', 'nao_informar', 'prefiro_nao_dizer'));

-- Adicionar campos relacionados à deficiência
ALTER TABLE rh.employees 
ADD COLUMN IF NOT EXISTS possui_deficiencia BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deficiencia_tipo_id UUID REFERENCES rh.deficiency_types(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS deficiencia_grau VARCHAR(50) CHECK (deficiencia_grau IN ('leve', 'moderada', 'severa', 'profunda')),
ADD COLUMN IF NOT EXISTS deficiencia_laudo_url TEXT; -- URL do anexo do laudo

-- Adicionar campos relacionados ao RNE (Registro Nacional de Estrangeiro)
ALTER TABLE rh.employees 
ADD COLUMN IF NOT EXISTS rne_numero VARCHAR(50),
ADD COLUMN IF NOT EXISTS rne_orgao VARCHAR(100),
ADD COLUMN IF NOT EXISTS rne_data_expedicao DATE;

-- Adicionar campos relacionados à Certidão de Casamento
ALTER TABLE rh.employees 
ADD COLUMN IF NOT EXISTS certidao_casamento_numero VARCHAR(100),
ADD COLUMN IF NOT EXISTS certidao_casamento_data DATE;

-- Adicionar campos relacionados à Certidão de União Estável
ALTER TABLE rh.employees 
ADD COLUMN IF NOT EXISTS certidao_uniao_estavel_numero VARCHAR(100),
ADD COLUMN IF NOT EXISTS certidao_uniao_estavel_data DATE;

-- Adicionar campos relacionados ao tipo de contrato de trabalho
ALTER TABLE rh.employees 
ADD COLUMN IF NOT EXISTS tipo_contrato_trabalho VARCHAR(50) CHECK (tipo_contrato_trabalho IN ('CLT', 'PJ', 'Estagiario', 'Menor_Aprendiz', 'Terceirizado', 'Autonomo', 'Cooperado', 'Temporario', 'Intermitente', 'Outro'));

-- Adicionar campos relacionados a periculosidade e insalubridade
ALTER TABLE rh.employees 
ADD COLUMN IF NOT EXISTS vinculo_periculosidade BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vinculo_insalubridade BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS grau_insalubridade VARCHAR(20) CHECK (grau_insalubridade IN ('minimo', 'medio', 'maximo'));

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_employees_deficiencia_tipo_id ON rh.employees(deficiencia_tipo_id);
CREATE INDEX IF NOT EXISTS idx_employees_tipo_contrato_trabalho ON rh.employees(tipo_contrato_trabalho);
CREATE INDEX IF NOT EXISTS idx_employees_sexo ON rh.employees(sexo);
CREATE INDEX IF NOT EXISTS idx_employees_possui_deficiencia ON rh.employees(possui_deficiencia);

-- Adicionar comentários para documentação
COMMENT ON COLUMN rh.employees.rg_orgao_emissor IS 'Órgão emissor do RG (SSP, IFP, etc.)';
COMMENT ON COLUMN rh.employees.rg_uf_emissao IS 'UF de emissão do RG';
COMMENT ON COLUMN rh.employees.rg_data_emissao IS 'Data de emissão do RG';
COMMENT ON COLUMN rh.employees.titulo_eleitor_zona IS 'Zona eleitoral do título de eleitor';
COMMENT ON COLUMN rh.employees.titulo_eleitor_secao IS 'Seção eleitoral do título de eleitor';
COMMENT ON COLUMN rh.employees.ctps_serie IS 'Série da CTPS';
COMMENT ON COLUMN rh.employees.ctps_uf IS 'UF de emissão da CTPS';
COMMENT ON COLUMN rh.employees.ctps_data_emissao IS 'Data de emissão da CTPS';
COMMENT ON COLUMN rh.employees.cnh_numero IS 'Número da CNH';
COMMENT ON COLUMN rh.employees.cnh_validade IS 'Data de validade da CNH';
COMMENT ON COLUMN rh.employees.cnh_categoria IS 'Categoria da CNH (A, B, C, D, E, AB, AC, AD, AE)';
COMMENT ON COLUMN rh.employees.sexo IS 'Sexo do funcionário';
COMMENT ON COLUMN rh.employees.orientacao_sexual IS 'Orientação sexual do funcionário';
COMMENT ON COLUMN rh.employees.possui_deficiencia IS 'Indica se o funcionário possui deficiência';
COMMENT ON COLUMN rh.employees.deficiencia_tipo_id IS 'ID do tipo de deficiência (referência a deficiency_types)';
COMMENT ON COLUMN rh.employees.deficiencia_grau IS 'Grau da deficiência (leve, moderada, severa, profunda)';
COMMENT ON COLUMN rh.employees.deficiencia_laudo_url IS 'URL do anexo do laudo médico da deficiência';
COMMENT ON COLUMN rh.employees.rne_numero IS 'Número do Registro Nacional de Estrangeiro';
COMMENT ON COLUMN rh.employees.rne_orgao IS 'Órgão emissor do RNE';
COMMENT ON COLUMN rh.employees.rne_data_expedicao IS 'Data de expedição do RNE';
COMMENT ON COLUMN rh.employees.certidao_casamento_numero IS 'Número da certidão de casamento';
COMMENT ON COLUMN rh.employees.certidao_casamento_data IS 'Data da certidão de casamento';
COMMENT ON COLUMN rh.employees.certidao_uniao_estavel_numero IS 'Número da certidão de união estável';
COMMENT ON COLUMN rh.employees.certidao_uniao_estavel_data IS 'Data da certidão de união estável';
COMMENT ON COLUMN rh.employees.tipo_contrato_trabalho IS 'Tipo de contrato de trabalho (CLT, PJ, Estagiário, etc.)';
COMMENT ON COLUMN rh.employees.vinculo_periculosidade IS 'Indica se o funcionário tem vínculo a periculosidade';
COMMENT ON COLUMN rh.employees.vinculo_insalubridade IS 'Indica se o funcionário tem vínculo a insalubridade';
COMMENT ON COLUMN rh.employees.grau_insalubridade IS 'Grau de insalubridade (mínimo, médio, máximo)';

