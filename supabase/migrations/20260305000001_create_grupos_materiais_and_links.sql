-- =====================================================
-- MIGRAÇÃO: Grupos de Materiais e vínculo com itens e classes financeiras
-- Data: 2026-03-05
-- Descrição: Cria tabela de grupos de materiais, vínculo N:N com classes
--            financeiras e FK em materiais_equipamentos para definir grupo do item.
-- =====================================================

-- =====================================================
-- 1. TABELA GRUPOS DE MATERIAIS
-- =====================================================
CREATE TABLE IF NOT EXISTS almoxarifado.grupos_materiais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_grupos_materiais_company_id ON almoxarifado.grupos_materiais(company_id);
CREATE INDEX IF NOT EXISTS idx_grupos_materiais_ativo ON almoxarifado.grupos_materiais(ativo) WHERE ativo = true;

COMMENT ON TABLE almoxarifado.grupos_materiais IS 'Grupos de materiais para classificação e pré-definição de classes financeiras';

-- =====================================================
-- 2. TABELA DE VÍNCULO GRUPO <-> CLASSES FINANCEIRAS (N:N)
-- =====================================================
CREATE TABLE IF NOT EXISTS almoxarifado.grupo_material_classe_financeira (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_material_id UUID NOT NULL REFERENCES almoxarifado.grupos_materiais(id) ON DELETE CASCADE,
    classe_financeira_id UUID NOT NULL REFERENCES financeiro.classes_financeiras(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(grupo_material_id, classe_financeira_id)
);

CREATE INDEX IF NOT EXISTS idx_grupo_material_classe_grupo ON almoxarifado.grupo_material_classe_financeira(grupo_material_id);
CREATE INDEX IF NOT EXISTS idx_grupo_material_classe_cf ON almoxarifado.grupo_material_classe_financeira(classe_financeira_id);

COMMENT ON TABLE almoxarifado.grupo_material_classe_financeira IS 'Classes financeiras vinculadas a cada grupo de materiais (pré-definidas no cadastro do material)';

-- =====================================================
-- 3. ADICIONAR grupo_material_id EM materiais_equipamentos
-- =====================================================
ALTER TABLE almoxarifado.materiais_equipamentos
ADD COLUMN IF NOT EXISTS grupo_material_id UUID REFERENCES almoxarifado.grupos_materiais(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_materiais_equipamentos_grupo_material_id
ON almoxarifado.materiais_equipamentos(grupo_material_id);

COMMENT ON COLUMN almoxarifado.materiais_equipamentos.grupo_material_id IS 'Grupo de materiais ao qual o item pertence; classes financeiras do grupo podem ser pré-definidas no formulário';

-- =====================================================
-- 4. TRIGGER updated_at PARA grupos_materiais
-- =====================================================
CREATE OR REPLACE FUNCTION almoxarifado.update_grupos_materiais_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_grupos_materiais_updated_at ON almoxarifado.grupos_materiais;
CREATE TRIGGER trigger_grupos_materiais_updated_at
    BEFORE UPDATE ON almoxarifado.grupos_materiais
    FOR EACH ROW
    EXECUTE FUNCTION almoxarifado.update_grupos_materiais_updated_at();

-- =====================================================
-- 5. RLS
-- =====================================================
ALTER TABLE almoxarifado.grupos_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE almoxarifado.grupo_material_classe_financeira ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grupos_materiais_company_isolation" ON almoxarifado.grupos_materiais
    FOR ALL USING (
        company_id = COALESCE(
            current_setting('app.current_company_id', true)::uuid,
            (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
        )
    );

-- Acesso à tabela de vínculo via grupo (mesma empresa do grupo)
CREATE POLICY "grupo_material_classe_financeira_via_grupo" ON almoxarifado.grupo_material_classe_financeira
    FOR ALL USING (
        grupo_material_id IN (
            SELECT id FROM almoxarifado.grupos_materiais
            WHERE company_id = COALESCE(
                current_setting('app.current_company_id', true)::uuid,
                (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid() LIMIT 1)
            )
        )
    );

-- =====================================================
-- 6. PERMISSÕES DE ENTIDADE (para EntityService)
-- =====================================================
INSERT INTO public.entity_permissions (id, profile_id, entity_name, can_read, can_create, can_edit, can_delete, created_at, updated_at)
SELECT
    gen_random_uuid(),
    p.id,
    'grupos_materiais',
    CASE WHEN p.nome IN ('Super Admin', 'Administrador', 'Gerente', 'Usuário') THEN true ELSE false END,
    CASE WHEN p.nome IN ('Super Admin', 'Administrador', 'Gerente') THEN true ELSE false END,
    CASE WHEN p.nome IN ('Super Admin', 'Administrador', 'Gerente') THEN true ELSE false END,
    CASE WHEN p.nome IN ('Super Admin', 'Administrador', 'Gerente') THEN true ELSE false END,
    NOW(),
    NOW()
FROM public.profiles p
WHERE p.is_active = true
  AND NOT EXISTS (SELECT 1 FROM public.entity_permissions ep WHERE ep.profile_id = p.id AND ep.entity_name = 'grupos_materiais');

-- =====================================================
-- 7. GRANTS
-- =====================================================
GRANT ALL ON TABLE almoxarifado.grupos_materiais TO authenticated;
GRANT ALL ON TABLE almoxarifado.grupo_material_classe_financeira TO authenticated;
