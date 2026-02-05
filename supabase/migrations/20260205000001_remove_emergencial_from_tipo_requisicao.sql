-- =====================================================
-- MIGRAÇÃO: Remover 'emergencial' do ENUM tipo_requisicao
-- Data....: 2025-02-05
-- Descrição:
--   - Atualiza requisições com tipo_requisicao = 'emergencial' para 'reposicao'
--   - Mantém is_emergencial = true para essas requisições
--   - Remove 'emergencial' do ENUM tipo_requisicao
--   - Atualiza constraint para não exigir is_emergencial baseado em tipo_requisicao
-- =====================================================

-- PASSO 0: Remover constraint temporariamente para permitir correções
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'requisicoes_compra_tipo_chk'
          AND table_schema = 'compras'
          AND table_name = 'requisicoes_compra'
    ) THEN
        ALTER TABLE compras.requisicoes_compra
            DROP CONSTRAINT requisicoes_compra_tipo_chk;
    END IF;
END$$;

-- PASSO 1: Corrigir dados inconsistentes antes de atualizar o ENUM
-- Corrigir requisições de reposição sem almoxarifado (que não estão em rascunho)
UPDATE compras.requisicoes_compra rc
SET destino_almoxarifado_id = (
    SELECT a.id 
    FROM almoxarifado.almoxarifados a
    WHERE a.company_id = rc.company_id
    LIMIT 1
)
WHERE rc.tipo_requisicao = 'reposicao' 
  AND rc.destino_almoxarifado_id IS NULL
  AND rc.status != 'rascunho'
  AND EXISTS (
    SELECT 1 FROM almoxarifado.almoxarifados a
    WHERE a.company_id = rc.company_id
  );

-- Se não houver almoxarifado disponível, mudar para compra_direta com local padrão
UPDATE compras.requisicoes_compra
SET tipo_requisicao = 'compra_direta',
    local_entrega = COALESCE(local_entrega, 'Almoxarifado Central')
WHERE tipo_requisicao = 'reposicao' 
  AND destino_almoxarifado_id IS NULL
  AND status != 'rascunho';

-- Corrigir compras diretas sem local_entrega (que não estão em rascunho)
UPDATE compras.requisicoes_compra
SET local_entrega = 'Almoxarifado Central'
WHERE tipo_requisicao = 'compra_direta' 
  AND local_entrega IS NULL
  AND status != 'rascunho';

-- PASSO 2: Atualizar requisições existentes que têm tipo_requisicao = 'emergencial'
-- Mantém is_emergencial = true e muda tipo_requisicao para 'reposicao'
-- Garantir que tenha destino_almoxarifado_id se necessário
UPDATE compras.requisicoes_compra rc
SET tipo_requisicao = 'reposicao',
    destino_almoxarifado_id = COALESCE(
        destino_almoxarifado_id,
        (SELECT a.id 
         FROM almoxarifado.almoxarifados a
         WHERE a.company_id = rc.company_id 
         LIMIT 1)
    )
WHERE tipo_requisicao = 'emergencial'
  AND status != 'rascunho'
  AND EXISTS (
    SELECT 1 FROM almoxarifado.almoxarifados a
    WHERE a.company_id = rc.company_id
  );

-- Se não houver almoxarifado, mudar para compra_direta
UPDATE compras.requisicoes_compra
SET tipo_requisicao = 'compra_direta',
    local_entrega = COALESCE(local_entrega, 'Almoxarifado Central')
WHERE tipo_requisicao = 'emergencial'
  AND status != 'rascunho';

-- PASSO 3: Remover 'emergencial' do ENUM tipo_requisicao
-- Primeiro, remover o valor padrão se existir
ALTER TABLE compras.requisicoes_compra
    ALTER COLUMN tipo_requisicao DROP DEFAULT;

-- Criar novo tipo sem 'emergencial'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'tipo_requisicao_new'
            AND typnamespace = 'compras'::regnamespace
    ) THEN
        CREATE TYPE compras.tipo_requisicao_new AS ENUM (
            'reposicao',
            'compra_direta'
        );
    END IF;
END$$;

-- Alterar coluna para usar o novo tipo
ALTER TABLE compras.requisicoes_compra
    ALTER COLUMN tipo_requisicao TYPE compras.tipo_requisicao_new
    USING tipo_requisicao::text::compras.tipo_requisicao_new;

-- Remover tipo antigo
DROP TYPE IF EXISTS compras.tipo_requisicao;

-- Renomear novo tipo para o nome original
ALTER TYPE compras.tipo_requisicao_new RENAME TO tipo_requisicao;

-- Recriar o valor padrão com o novo tipo
ALTER TABLE compras.requisicoes_compra
    ALTER COLUMN tipo_requisicao SET DEFAULT 'reposicao'::compras.tipo_requisicao;

-- PASSO 4: Recriar constraint atualizada
DO $$
BEGIN
    -- Criar nova constraint sem verificação de emergencial
    ALTER TABLE compras.requisicoes_compra
        ADD CONSTRAINT requisicoes_compra_tipo_chk
        CHECK (
            status = 'rascunho'
            OR (
                (tipo_requisicao <> 'reposicao' OR destino_almoxarifado_id IS NOT NULL)
                AND (tipo_requisicao <> 'compra_direta' OR local_entrega IS NOT NULL)
            )
        );
EXCEPTION
    WHEN duplicate_object THEN
        -- Constraint já existe, não fazer nada
        NULL;
END$$;

-- PASSO 5: Comentário explicativo
COMMENT ON COLUMN compras.requisicoes_compra.is_emergencial IS 
    'Flag booleana independente que indica se a requisição é emergencial. Não influencia o tipo_requisicao nem o status.';
