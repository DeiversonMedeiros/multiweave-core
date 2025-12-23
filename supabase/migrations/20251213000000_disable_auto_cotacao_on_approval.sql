-- =====================================================
-- MIGRAÇÃO: Desabilitar criação automática de cotação ao aprovar requisição
-- Data....: 2025-12-13
-- Descrição:
--   - Remove a trigger que criava ciclos de cotação automaticamente
--     quando uma requisição de compra era aprovada
--   - Mantém o fluxo de criação de cotação sendo iniciado
--     explicitamente pela aplicação (startQuoteCycle)
-- =====================================================

-- IMPORTANTE:
-- O comportamento desejado é:
--  1) Requisição é aprovada -> continua com status/workflow_state = 'aprovada'
--     e passa a aparecer na aba "Requisições Disponíveis" em /compras/cotacoes
--  2) O comprador seleciona as requisições e aciona "Gerar Cotação"
--     -> a aplicação chama purchaseService.startQuoteCycle
--     -> é criado um registro em compras.cotacao_ciclos e a requisição
--        tem o workflow_state alterado para 'em_cotacao'
--  3) A nova cotação passa a aparecer em "Cotações Realizadas".
--
-- A trigger criada em 20251211221500_create_auto_cotacao_on_approval.sql
-- fazia esse passo 2 automaticamente no banco logo após a aprovação,
-- impedindo o comprador de controlar quando a cotação seria iniciada.

-- 1. REMOVER TRIGGER DE CRIAÇÃO AUTOMÁTICA DE COTAÇÃO
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   pg_trigger t
    JOIN   pg_class c ON c.oid = t.tgrelid
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  n.nspname = 'compras'
    AND    c.relname = 'requisicoes_compra'
    AND    t.tgname = 'trigger_criar_cotacao_automatica'
  ) THEN
    RAISE NOTICE 'Removendo trigger compras.trigger_criar_cotacao_automatica';
    DROP TRIGGER IF EXISTS trigger_criar_cotacao_automatica ON compras.requisicoes_compra;
  ELSE
    RAISE NOTICE 'Trigger compras.trigger_criar_cotacao_automatica já não existe';
  END IF;
END;
$$;

-- 2. OPCIONAL: REMOVER FUNÇÃO DE CRIAÇÃO AUTOMÁTICA
-- =====================================================
-- Mantemos a função gerar_numero_cotacao (pode ser útil no futuro),
-- mas removemos a função que era usada exclusivamente pela trigger.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'compras'
    AND    p.proname = 'criar_cotacao_automatica'
  ) THEN
    RAISE NOTICE 'Removendo função compras.criar_cotacao_automatica()';
    DROP FUNCTION IF EXISTS compras.criar_cotacao_automatica();
  ELSE
    RAISE NOTICE 'Função compras.criar_cotacao_automatica() já não existe';
  END IF;
END;
$$;

