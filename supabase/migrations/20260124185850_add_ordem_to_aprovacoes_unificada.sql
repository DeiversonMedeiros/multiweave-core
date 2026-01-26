-- =====================================================
-- FIX: Adicionar coluna 'ordem' à tabela aprovacoes_unificada
-- Data: 2026-01-24
-- Descrição: A função process_approval precisa da coluna 'ordem' para
--            validar a ordem hierárquica de aprovações dentro do mesmo nível.
--            Esta coluna permite que múltiplas aprovações no mesmo nível
--            sejam processadas em sequência correta.
-- =====================================================

DO $$
BEGIN
    -- Verificar se a coluna 'ordem' já existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'aprovacoes_unificada' 
          AND column_name = 'ordem'
    ) THEN
        -- Adicionar coluna 'ordem' com valor padrão 1
        ALTER TABLE public.aprovacoes_unificada
        ADD COLUMN ordem INTEGER NOT NULL DEFAULT 1;
        
        RAISE NOTICE 'Coluna "ordem" adicionada à tabela public.aprovacoes_unificada com valor padrão 1.';
    ELSE
        RAISE NOTICE 'Coluna "ordem" já existe na tabela public.aprovacoes_unificada. Nenhuma alteração necessária.';
    END IF;

    -- Criar índice para melhorar performance das consultas hierárquicas
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
          AND tablename = 'aprovacoes_unificada' 
          AND indexname = 'idx_aprovacoes_unificada_workflow_order'
    ) THEN
        CREATE INDEX idx_aprovacoes_unificada_workflow_order
        ON public.aprovacoes_unificada (processo_id, processo_tipo, nivel_aprovacao, ordem);
        
        RAISE NOTICE 'Índice "idx_aprovacoes_unificada_workflow_order" criado.';
    ELSE
        RAISE NOTICE 'Índice "idx_aprovacoes_unificada_workflow_order" já existe. Nenhuma alteração necessária.';
    END IF;

    -- Adicionar comentário na coluna
    COMMENT ON COLUMN public.aprovacoes_unificada.ordem IS 
        'Ordem da aprovação dentro do mesmo nível para processos hierárquicos. Permite que múltiplas aprovações no mesmo nível sejam processadas em sequência correta.';
END
$$;
