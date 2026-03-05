-- =====================================================
-- Kits de Materiais (Compras)
-- Tabelas para criar kits com materiais cadastrados e
-- utilizar na solicitação de compra (um kit = vários itens).
-- =====================================================

-- Tabela principal: kits de materiais
CREATE TABLE IF NOT EXISTS compras.kits_materiais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_kit_nome_company UNIQUE (nome, company_id)
);

COMMENT ON TABLE compras.kits_materiais IS 'Kits de materiais para uso em solicitações de compra (ex.: serviço rotineiro com mesmos itens)';

-- Itens do kit: material + quantidade padrão
CREATE TABLE IF NOT EXISTS compras.kit_materiais_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kit_id UUID NOT NULL REFERENCES compras.kits_materiais(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES almoxarifado.materiais_equipamentos(id) ON DELETE CASCADE,
    quantidade_padrao DECIMAL(15,4) NOT NULL DEFAULT 1 CHECK (quantidade_padrao > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_kit_material UNIQUE (kit_id, material_id)
);

COMMENT ON TABLE compras.kit_materiais_itens IS 'Itens que compõem cada kit (material + quantidade padrão por unidade de kit)';

CREATE INDEX IF NOT EXISTS idx_kits_materiais_company ON compras.kits_materiais(company_id);
CREATE INDEX IF NOT EXISTS idx_kits_materiais_ativo ON compras.kits_materiais(ativo);
CREATE INDEX IF NOT EXISTS idx_kit_materiais_itens_kit ON compras.kit_materiais_itens(kit_id);
CREATE INDEX IF NOT EXISTS idx_kit_materiais_itens_material ON compras.kit_materiais_itens(material_id);
