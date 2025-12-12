-- =====================================================
-- MIGRAÇÃO: Adicionar Campos de Tributação, Operação, Pagamento e Transporte na NFe
-- =====================================================
-- Data: 2025-12-06
-- Descrição: Adiciona campos obrigatórios para emissão de NF-e:
--            - Regime de apuração dos tributos
--            - Tipo e finalidade da operação
--            - Natureza da operação
--            - Dados de pagamento
--            - Dados de transporte
--            - Informações detalhadas de ICMS/IPI
-- Autor: Sistema MultiWeave Core

-- =====================================================
-- 1. ADICIONAR CAMPOS DE REGIME DE TRIBUTAÇÃO
-- =====================================================

ALTER TABLE financeiro.nfe
ADD COLUMN IF NOT EXISTS regime_tributacao VARCHAR(50) CHECK (
    regime_tributacao IS NULL OR 
    regime_tributacao IN (
        'simples_nacional',
        'simples_nacional_icms_municipal',
        'regime_normal'
    )
);

COMMENT ON COLUMN financeiro.nfe.regime_tributacao IS 
'Regime de apuração dos tributos: simples_nacional (tributos federais e estaduais pelo Simples), simples_nacional_icms_municipal (federais pelo Simples e ICMS conforme estadual), regime_normal (conforme legislações federal e estadual)';

-- =====================================================
-- 2. ADICIONAR CAMPOS DE TIPO E FINALIDADE DA OPERAÇÃO
-- =====================================================

ALTER TABLE financeiro.nfe
ADD COLUMN IF NOT EXISTS tipo_operacao VARCHAR(20) CHECK (
    tipo_operacao IS NULL OR 
    tipo_operacao IN ('entrada', 'saida')
),
ADD COLUMN IF NOT EXISTS finalidade VARCHAR(20) CHECK (
    finalidade IS NULL OR 
    finalidade IN ('normal', 'complementar', 'ajuste', 'devolucao', 'remessa')
),
ADD COLUMN IF NOT EXISTS natureza_operacao VARCHAR(255);

COMMENT ON COLUMN financeiro.nfe.tipo_operacao IS 'Tipo de operação: entrada ou saida';
COMMENT ON COLUMN financeiro.nfe.finalidade IS 'Finalidade da nota: normal, complementar, ajuste, devolucao, remessa';
COMMENT ON COLUMN financeiro.nfe.natureza_operacao IS 'Natureza da operação (ex: Venda de produção do estabelecimento)';

-- =====================================================
-- 3. ADICIONAR CAMPOS DE PAGAMENTO
-- =====================================================

ALTER TABLE financeiro.nfe
ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(50),
ADD COLUMN IF NOT EXISTS valor_entrada DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantidade_parcelas INTEGER DEFAULT 1;

COMMENT ON COLUMN financeiro.nfe.forma_pagamento IS 'Forma de pagamento (ex: À vista, A prazo, Cartão de crédito, etc.)';
COMMENT ON COLUMN financeiro.nfe.valor_entrada IS 'Valor de entrada (se houver)';
COMMENT ON COLUMN financeiro.nfe.quantidade_parcelas IS 'Quantidade de parcelas do pagamento';

-- Criar tabela de parcelas de pagamento
CREATE TABLE IF NOT EXISTS financeiro.nfe_pagamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nfe_id UUID NOT NULL REFERENCES financeiro.nfe(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    numero_parcela INTEGER NOT NULL,
    forma_pagamento VARCHAR(50),
    valor_parcela DECIMAL(15,2) NOT NULL,
    data_vencimento DATE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT nfe_pagamentos_nfe_numero_unique UNIQUE (nfe_id, numero_parcela)
);

COMMENT ON TABLE financeiro.nfe_pagamentos IS 'Parcelas de pagamento da NF-e';

-- =====================================================
-- 4. ADICIONAR CAMPOS DE TRANSPORTE
-- =====================================================

ALTER TABLE financeiro.nfe
ADD COLUMN IF NOT EXISTS modalidade_frete VARCHAR(20) CHECK (
    modalidade_frete IS NULL OR 
    modalidade_frete IN ('por_conta_emitente', 'por_conta_destinatario', 'por_conta_terceiros', 'sem_frete')
),
ADD COLUMN IF NOT EXISTS transportador_id UUID REFERENCES public.partners(id),
ADD COLUMN IF NOT EXISTS transportador_nome VARCHAR(255),
ADD COLUMN IF NOT EXISTS transportador_cnpj VARCHAR(18),
ADD COLUMN IF NOT EXISTS transportador_ie VARCHAR(20),
ADD COLUMN IF NOT EXISTS transportador_endereco TEXT,
ADD COLUMN IF NOT EXISTS transportador_cidade VARCHAR(100),
ADD COLUMN IF NOT EXISTS transportador_uf VARCHAR(2),
ADD COLUMN IF NOT EXISTS veiculo_placa VARCHAR(8),
ADD COLUMN IF NOT EXISTS veiculo_uf VARCHAR(2),
ADD COLUMN IF NOT EXISTS veiculo_rntc VARCHAR(20),
ADD COLUMN IF NOT EXISTS quantidade_volumes INTEGER,
ADD COLUMN IF NOT EXISTS especie_volumes VARCHAR(50),
ADD COLUMN IF NOT EXISTS marca_volumes VARCHAR(50),
ADD COLUMN IF NOT EXISTS numeracao_volumes VARCHAR(50),
ADD COLUMN IF NOT EXISTS peso_bruto DECIMAL(15,3),
ADD COLUMN IF NOT EXISTS peso_liquido DECIMAL(15,3);

COMMENT ON COLUMN financeiro.nfe.modalidade_frete IS 'Modalidade do frete: por_conta_emitente, por_conta_destinatario, por_conta_terceiros, sem_frete';
COMMENT ON COLUMN financeiro.nfe.transportador_id IS 'ID do parceiro transportador (se houver)';
COMMENT ON COLUMN financeiro.nfe.transportador_nome IS 'Nome/Razão Social do transportador';
COMMENT ON COLUMN financeiro.nfe.transportador_cnpj IS 'CNPJ/CPF do transportador';
COMMENT ON COLUMN financeiro.nfe.transportador_ie IS 'Inscrição Estadual do transportador';
COMMENT ON COLUMN financeiro.nfe.veiculo_placa IS 'Placa do veículo';
COMMENT ON COLUMN financeiro.nfe.veiculo_uf IS 'UF do veículo';
COMMENT ON COLUMN financeiro.nfe.veiculo_rntc IS 'RNTC (Registro Nacional de Transportador de Carga)';
COMMENT ON COLUMN financeiro.nfe.quantidade_volumes IS 'Quantidade de volumes transportados';
COMMENT ON COLUMN financeiro.nfe.especie_volumes IS 'Espécie dos volumes (ex: Caixas, Pallets)';
COMMENT ON COLUMN financeiro.nfe.marca_volumes IS 'Marca dos volumes';
COMMENT ON COLUMN financeiro.nfe.numeracao_volumes IS 'Numeração dos volumes';
COMMENT ON COLUMN financeiro.nfe.peso_bruto IS 'Peso bruto total (kg)';
COMMENT ON COLUMN financeiro.nfe.peso_liquido IS 'Peso líquido total (kg)';

-- =====================================================
-- 5. ADICIONAR CAMPOS DETALHADOS DE ICMS
-- =====================================================

ALTER TABLE financeiro.nfe
ADD COLUMN IF NOT EXISTS modalidade_icms VARCHAR(20),
ADD COLUMN IF NOT EXISTS cst_icms VARCHAR(3),
ADD COLUMN IF NOT EXISTS base_calculo_icms DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS aliquota_icms DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_icms_st DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_calculo_icms_st DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS aliquota_icms_st DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS percentual_reducao_base_icms DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS percentual_mva_icms_st DECIMAL(5,2) DEFAULT 0;

COMMENT ON COLUMN financeiro.nfe.modalidade_icms IS 'Modalidade de determinação da BC do ICMS';
COMMENT ON COLUMN financeiro.nfe.cst_icms IS 'Código de Situação Tributária do ICMS';
COMMENT ON COLUMN financeiro.nfe.base_calculo_icms IS 'Base de cálculo do ICMS';
COMMENT ON COLUMN financeiro.nfe.aliquota_icms IS 'Alíquota do ICMS (%)';
COMMENT ON COLUMN financeiro.nfe.valor_icms_st IS 'Valor do ICMS ST (Substituição Tributária)';
COMMENT ON COLUMN financeiro.nfe.base_calculo_icms_st IS 'Base de cálculo do ICMS ST';
COMMENT ON COLUMN financeiro.nfe.aliquota_icms_st IS 'Alíquota do ICMS ST (%)';
COMMENT ON COLUMN financeiro.nfe.percentual_reducao_base_icms IS 'Percentual de redução da base de cálculo do ICMS';
COMMENT ON COLUMN financeiro.nfe.percentual_mva_icms_st IS 'Percentual de MVA (Margem de Valor Agregado) para ICMS ST';

-- =====================================================
-- 6. ADICIONAR CAMPOS DETALHADOS DE IPI
-- =====================================================

ALTER TABLE financeiro.nfe
ADD COLUMN IF NOT EXISTS enquadramento_ipi VARCHAR(3),
ADD COLUMN IF NOT EXISTS cst_ipi VARCHAR(2),
ADD COLUMN IF NOT EXISTS base_calculo_ipi DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS aliquota_ipi DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_ipi_tributado DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_ipi_isento DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_ipi_outros DECIMAL(15,2) DEFAULT 0;

COMMENT ON COLUMN financeiro.nfe.enquadramento_ipi IS 'Código de enquadramento legal do IPI';
COMMENT ON COLUMN financeiro.nfe.cst_ipi IS 'Código de Situação Tributária do IPI';
COMMENT ON COLUMN financeiro.nfe.base_calculo_ipi IS 'Base de cálculo do IPI';
COMMENT ON COLUMN financeiro.nfe.aliquota_ipi IS 'Alíquota do IPI (%)';
COMMENT ON COLUMN financeiro.nfe.valor_ipi_tributado IS 'Valor do IPI tributado';
COMMENT ON COLUMN financeiro.nfe.valor_ipi_isento IS 'Valor do IPI isento';
COMMENT ON COLUMN financeiro.nfe.valor_ipi_outros IS 'Valor do IPI em outras situações';

-- =====================================================
-- 7. ADICIONAR CAMPOS DE INFORMAÇÕES COMPLEMENTARES
-- =====================================================

ALTER TABLE financeiro.nfe
ADD COLUMN IF NOT EXISTS informacoes_fisco TEXT,
ADD COLUMN IF NOT EXISTS informacoes_complementares TEXT;

COMMENT ON COLUMN financeiro.nfe.informacoes_fisco IS 'Informações adicionais de interesse do fisco';
COMMENT ON COLUMN financeiro.nfe.informacoes_complementares IS 'Informações complementares de interesse do contribuinte';

-- =====================================================
-- 8. CRIAR ÍNDICES PARA MELHOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_nfe_regime_tributacao ON financeiro.nfe(regime_tributacao);
CREATE INDEX IF NOT EXISTS idx_nfe_tipo_operacao ON financeiro.nfe(tipo_operacao);
CREATE INDEX IF NOT EXISTS idx_nfe_finalidade ON financeiro.nfe(finalidade);
CREATE INDEX IF NOT EXISTS idx_nfe_transportador_id ON financeiro.nfe(transportador_id);
CREATE INDEX IF NOT EXISTS idx_nfe_pagamentos_nfe_id ON financeiro.nfe_pagamentos(nfe_id);







