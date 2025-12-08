-- =====================================================
-- MIGRAÇÃO: Adicionar Campos de Tributação, ISSQN e Intermediário na NFSe
-- =====================================================
-- Data: 2025-12-06
-- Descrição: Adiciona campos obrigatórios para emissão de NFS-e:
--            - Regime de apuração dos tributos
--            - Campos detalhados de ISSQN
--            - Campos de intermediário (quando aplicável)
-- Autor: Sistema MultiWeave Core

-- =====================================================
-- 1. ADICIONAR CAMPOS DE REGIME DE TRIBUTAÇÃO
-- =====================================================

ALTER TABLE financeiro.nfse
ADD COLUMN IF NOT EXISTS regime_tributacao VARCHAR(50) CHECK (
    regime_tributacao IS NULL OR 
    regime_tributacao IN (
        'simples_nacional',
        'simples_nacional_issqn_municipal',
        'regime_normal'
    )
);

COMMENT ON COLUMN financeiro.nfse.regime_tributacao IS 
'Regime de apuração dos tributos: simples_nacional (tributos federais e municipais pelo Simples), simples_nacional_issqn_municipal (federais pelo Simples e ISSQN conforme municipal), regime_normal (conforme legislações federal e municipal)';

-- =====================================================
-- 2. ADICIONAR CAMPOS DETALHADOS DE ISSQN
-- =====================================================

ALTER TABLE financeiro.nfse
ADD COLUMN IF NOT EXISTS aliquota_iss DECIMAL(5,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_calculo_iss DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS municipio_incidencia_iss VARCHAR(100),
ADD COLUMN IF NOT EXISTS codigo_municipio_iss VARCHAR(7), -- Código IBGE (7 dígitos)
ADD COLUMN IF NOT EXISTS retencao_iss_na_fonte BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS responsavel_recolhimento_iss VARCHAR(20) CHECK (
    responsavel_recolhimento_iss IS NULL OR 
    responsavel_recolhimento_iss IN ('prestador', 'tomador', 'intermediario')
),
ADD COLUMN IF NOT EXISTS valor_iss_retencao DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS exigibilidade_iss VARCHAR(2) CHECK (
    exigibilidade_iss IS NULL OR 
    exigibilidade_iss IN ('1', '2', '3', '4', '5', '6', '7', '8', '9')
);

COMMENT ON COLUMN financeiro.nfse.aliquota_iss IS 'Alíquota do ISSQN aplicada (ex: 0.0500 = 5%)';
COMMENT ON COLUMN financeiro.nfse.base_calculo_iss IS 'Base de cálculo do ISSQN (valor do serviço - deduções)';
COMMENT ON COLUMN financeiro.nfse.municipio_incidencia_iss IS 'Nome do município de incidência do ISSQN';
COMMENT ON COLUMN financeiro.nfse.codigo_municipio_iss IS 'Código IBGE do município de incidência do ISSQN (7 dígitos)';
COMMENT ON COLUMN financeiro.nfse.retencao_iss_na_fonte IS 'Indica se há retenção do ISSQN na fonte';
COMMENT ON COLUMN financeiro.nfse.responsavel_recolhimento_iss IS 'Responsável pelo recolhimento do ISSQN: prestador, tomador ou intermediario';
COMMENT ON COLUMN financeiro.nfse.valor_iss_retencao IS 'Valor do ISSQN retido na fonte (se houver)';
COMMENT ON COLUMN financeiro.nfse.exigibilidade_iss IS 'Código de exigibilidade do ISSQN: 1=Exigível, 2=Não incidência, 3=Isenção, 4=Exportação, 5=Imunidade, 6=Exigibilidade suspensa por decisão judicial, 7=Exigibilidade suspensa por processo administrativo, 8=Não exigível, 9=Retido na fonte';

-- =====================================================
-- 3. ADICIONAR CAMPOS DE INTERMEDIÁRIO
-- =====================================================

ALTER TABLE financeiro.nfse
ADD COLUMN IF NOT EXISTS intermediario_id UUID REFERENCES public.partners(id),
ADD COLUMN IF NOT EXISTS intermediario_nome VARCHAR(255),
ADD COLUMN IF NOT EXISTS intermediario_cnpj VARCHAR(18),
ADD COLUMN IF NOT EXISTS intermediario_inscricao_municipal VARCHAR(50),
ADD COLUMN IF NOT EXISTS intermediario_endereco TEXT,
ADD COLUMN IF NOT EXISTS intermediario_cidade VARCHAR(100),
ADD COLUMN IF NOT EXISTS intermediario_uf VARCHAR(2),
ADD COLUMN IF NOT EXISTS intermediario_cep VARCHAR(10),
ADD COLUMN IF NOT EXISTS intermediario_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS intermediario_telefone VARCHAR(20);

COMMENT ON COLUMN financeiro.nfse.intermediario_id IS 'ID do parceiro intermediário (se houver)';
COMMENT ON COLUMN financeiro.nfse.intermediario_nome IS 'Nome/Razão Social do intermediário';
COMMENT ON COLUMN financeiro.nfse.intermediario_cnpj IS 'CNPJ/CPF do intermediário';
COMMENT ON COLUMN financeiro.nfse.intermediario_inscricao_municipal IS 'Inscrição Municipal do intermediário';
COMMENT ON COLUMN financeiro.nfse.intermediario_endereco IS 'Endereço completo do intermediário';
COMMENT ON COLUMN financeiro.nfse.intermediario_cidade IS 'Cidade do intermediário';
COMMENT ON COLUMN financeiro.nfse.intermediario_uf IS 'UF do intermediário';
COMMENT ON COLUMN financeiro.nfse.intermediario_cep IS 'CEP do intermediário';
COMMENT ON COLUMN financeiro.nfse.intermediario_email IS 'Email do intermediário';
COMMENT ON COLUMN financeiro.nfse.intermediario_telefone IS 'Telefone do intermediário';

-- =====================================================
-- 4. ADICIONAR CAMPOS ADICIONAIS DE TRIBUTAÇÃO (OPCIONAL)
-- =====================================================

-- Campo para indicar se o serviço está sujeito a retenção de outros impostos
ALTER TABLE financeiro.nfse
ADD COLUMN IF NOT EXISTS retencao_impostos_federais BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS valor_ir_retencao DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_pis_retencao DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_cofins_retencao DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_csll_retencao DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_inss_retencao DECIMAL(15,2) DEFAULT 0;

COMMENT ON COLUMN financeiro.nfse.retencao_impostos_federais IS 'Indica se há retenção de impostos federais na fonte';
COMMENT ON COLUMN financeiro.nfse.valor_ir_retencao IS 'Valor do IR retido na fonte';
COMMENT ON COLUMN financeiro.nfse.valor_pis_retencao IS 'Valor do PIS retido na fonte';
COMMENT ON COLUMN financeiro.nfse.valor_cofins_retencao IS 'Valor do COFINS retido na fonte';
COMMENT ON COLUMN financeiro.nfse.valor_csll_retencao IS 'Valor do CSLL retido na fonte';
COMMENT ON COLUMN financeiro.nfse.valor_inss_retencao IS 'Valor do INSS retido na fonte';

-- =====================================================
-- 5. CRIAR ÍNDICES PARA MELHOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_nfse_regime_tributacao ON financeiro.nfse(regime_tributacao);
CREATE INDEX IF NOT EXISTS idx_nfse_codigo_municipio_iss ON financeiro.nfse(codigo_municipio_iss);
CREATE INDEX IF NOT EXISTS idx_nfse_intermediario_id ON financeiro.nfse(intermediario_id);

