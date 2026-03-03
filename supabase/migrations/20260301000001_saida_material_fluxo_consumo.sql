-- =====================================================
-- Fluxo de solicitação de materiais para consumo (saída)
-- Novos status: separado (almoxarife confirmou), aceito_tecnico (técnico aceitou)
-- Novas colunas: data_prevista_saida, data_separacao, data_aceite_tecnico, funcionario_receptor_id
-- Registro em movimentacoes_estoque quando status = entregue
-- =====================================================

-- 1) public.solicitacoes_saida_materiais (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'solicitacoes_saida_materiais') THEN
    ALTER TABLE public.solicitacoes_saida_materiais ADD COLUMN IF NOT EXISTS funcionario_receptor_id UUID REFERENCES public.users(id);
    ALTER TABLE public.solicitacoes_saida_materiais ADD COLUMN IF NOT EXISTS data_prevista_saida TIMESTAMPTZ;
    ALTER TABLE public.solicitacoes_saida_materiais ADD COLUMN IF NOT EXISTS data_separacao TIMESTAMPTZ;
    ALTER TABLE public.solicitacoes_saida_materiais ADD COLUMN IF NOT EXISTS data_aceite_tecnico TIMESTAMPTZ;
    -- Relaxar check de status (remover antigo e criar novo incluindo separado e aceito_tecnico)
    ALTER TABLE public.solicitacoes_saida_materiais DROP CONSTRAINT IF EXISTS solicitacoes_saida_materiais_status_check;
    ALTER TABLE public.solicitacoes_saida_materiais ADD CONSTRAINT solicitacoes_saida_materiais_status_check
      CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'cancelado', 'entregue', 'separado', 'aceito_tecnico'));
  END IF;
END $$;

-- 2) almoxarifado.solicitacoes_saida_materiais (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'almoxarifado' AND table_name = 'solicitacoes_saida_materiais') THEN
    ALTER TABLE almoxarifado.solicitacoes_saida_materiais ADD COLUMN IF NOT EXISTS funcionario_receptor_id UUID REFERENCES public.users(id);
    ALTER TABLE almoxarifado.solicitacoes_saida_materiais ADD COLUMN IF NOT EXISTS data_prevista_saida TIMESTAMPTZ;
    ALTER TABLE almoxarifado.solicitacoes_saida_materiais ADD COLUMN IF NOT EXISTS data_separacao TIMESTAMPTZ;
    ALTER TABLE almoxarifado.solicitacoes_saida_materiais ADD COLUMN IF NOT EXISTS data_aceite_tecnico TIMESTAMPTZ;
    ALTER TABLE almoxarifado.solicitacoes_saida_materiais DROP CONSTRAINT IF EXISTS solicitacoes_saida_materiais_status_check;
    ALTER TABLE almoxarifado.solicitacoes_saida_materiais ADD CONSTRAINT solicitacoes_saida_materiais_status_check
      CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'cancelado', 'entregue', 'separado', 'aceito_tecnico'));
  END IF;
END $$;

-- 3) Função: ao marcar saída como entregue, registrar em movimentacoes_estoque (almoxarifado)
CREATE OR REPLACE FUNCTION almoxarifado.registrar_saida_material_movimentacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = almoxarifado, public
AS $$
DECLARE
  item RECORD;
  v_almoxarifado_id UUID;
  v_company_id UUID;
  v_responsavel_id UUID;
BEGIN
  IF NEW.status = 'entregue' AND (OLD.status IS NULL OR OLD.status IS DISTINCT FROM 'entregue') THEN
    v_almoxarifado_id := NEW.almoxarifado_id;
    v_company_id := NEW.company_id;
    v_responsavel_id := NEW.funcionario_receptor_id;

    FOR item IN
      SELECT ssi.material_id, ssi.quantidade_solicitada, ssi.quantidade_entregue, ssi.valor_unitario
      FROM almoxarifado.solicitacoes_saida_materiais_itens ssi
      WHERE ssi.solicitacao_id = NEW.id AND ssi.company_id = NEW.company_id
    LOOP
      INSERT INTO almoxarifado.movimentacoes_estoque (
        company_id,
        material_equipamento_id,
        almoxarifado_id,
        tipo_movimentacao,
        quantidade,
        valor_unitario,
        valor_total,
        data_movimentacao,
        responsavel_id,
        origem_documento,
        numero_documento,
        status,
        centro_custo_id,
        projeto_id,
        observacoes
      ) VALUES (
        v_company_id,
        item.material_id,
        v_almoxarifado_id,
        'saida',
        - (COALESCE(item.quantidade_entregue, item.quantidade_solicitada)),
        item.valor_unitario,
        (COALESCE(item.quantidade_entregue, item.quantidade_solicitada) * COALESCE(item.valor_unitario, 0)),
        COALESCE(NEW.data_saida, NOW()),
        v_responsavel_id,
        'solicitacao_saida_material',
        NEW.id::text,
        'confirmado',
        NEW.centro_custo_id,
        NEW.projeto_id,
        'Saída por solicitação #' || LEFT(NEW.id::text, 8)
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger na tabela almoxarifado.solicitacoes_saida_materiais (apenas se a tabela existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'almoxarifado' AND table_name = 'solicitacoes_saida_materiais') THEN
    DROP TRIGGER IF EXISTS trg_registrar_saida_movimentacao ON almoxarifado.solicitacoes_saida_materiais;
    CREATE TRIGGER trg_registrar_saida_movimentacao
      AFTER UPDATE OF status ON almoxarifado.solicitacoes_saida_materiais
      FOR EACH ROW
      EXECUTE PROCEDURE almoxarifado.registrar_saida_material_movimentacao();
  END IF;
END $$;

-- Se a tabela for apenas em public, criar trigger lá também (e função que escreve em almoxarifado.movimentacoes_estoque)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'solicitacoes_saida_materiais')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'almoxarifado' AND table_name = 'solicitacoes_saida_materiais') THEN
    CREATE OR REPLACE FUNCTION public.registrar_saida_material_movimentacao_public()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, almoxarifado
    AS $fn$
    DECLARE
      item RECORD;
      v_almoxarifado_id UUID;
      v_company_id UUID;
      v_responsavel_id UUID;
    BEGIN
      IF NEW.status = 'entregue' AND (OLD.status IS NULL OR OLD.status IS DISTINCT FROM 'entregue') THEN
        v_almoxarifado_id := NEW.almoxarifado_id;
        v_company_id := NEW.company_id;
        v_responsavel_id := NEW.funcionario_receptor_id;
        FOR item IN
          SELECT ssi.material_id, ssi.quantidade_solicitada, ssi.quantidade_entregue, ssi.valor_unitario
          FROM almoxarifado.solicitacoes_saida_materiais_itens ssi
          WHERE ssi.solicitacao_id = NEW.id AND ssi.company_id = NEW.company_id
        LOOP
          INSERT INTO almoxarifado.movimentacoes_estoque (
            company_id, material_equipamento_id, almoxarifado_id, tipo_movimentacao, quantidade,
            valor_unitario, valor_total, data_movimentacao, responsavel_id, origem_documento, numero_documento,
            status, centro_custo_id, projeto_id, observacoes
          ) VALUES (
            v_company_id, item.material_id, v_almoxarifado_id, 'saida',
            - (COALESCE(item.quantidade_entregue, item.quantidade_solicitada)),
            item.valor_unitario,
            (COALESCE(item.quantidade_entregue, item.quantidade_solicitada) * COALESCE(item.valor_unitario, 0)),
            COALESCE(NEW.data_saida, NOW()), v_responsavel_id, 'solicitacao_saida_material', NEW.id::text,
            'confirmado', NEW.centro_custo_id, NEW.projeto_id, 'Saída por solicitação #' || LEFT(NEW.id::text, 8)
          );
        END LOOP;
      END IF;
      RETURN NEW;
    END;
    $fn$;
    DROP TRIGGER IF EXISTS trg_registrar_saida_movimentacao ON public.solicitacoes_saida_materiais;
    CREATE TRIGGER trg_registrar_saida_movimentacao
      AFTER UPDATE OF status ON public.solicitacoes_saida_materiais
      FOR EACH ROW
      EXECUTE PROCEDURE public.registrar_saida_material_movimentacao_public();
  END IF;
END $$;
