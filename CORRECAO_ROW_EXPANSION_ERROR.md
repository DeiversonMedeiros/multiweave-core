# Correção do Erro "row expansion via '*' is not supported here"

## Problema

A função `record_edit_and_reset_approvals()` estava usando a sintaxe `(ROW(OLD.*)).*` que não é suportada pelo PostgreSQL em todos os contextos, causando o erro:

```
ERROR: 0A000: row expansion via "*" is not supported here
QUERY: campos_alterados := ARRAY( SELECT column_name FROM information_schema.columns 
WHERE table_schema = TG_TABLE_SCHEMA AND table_name = TG_TABLE_NAME 
AND column_name NOT IN ('updated_at') 
AND (ROW(OLD.*)).* IS DISTINCT FROM (ROW(NEW.*)).* )
```

## Solução

A migration `20250117000003_fix_record_edit_row_expansion_error.sql` corrige o problema usando uma abordagem diferente:

### Antes (Problemático)
```sql
campos_alterados := ARRAY(
    SELECT column_name
    FROM information_schema.columns
    WHERE ...
    AND (ROW(OLD.*)).* IS DISTINCT FROM (ROW(NEW.*)).*  -- ❌ Não suportado
);
```

### Depois (Corrigido)
```sql
-- Comparar campos individualmente usando EXECUTE format
FOR campo IN 
    SELECT column_name 
    FROM information_schema.columns 
    WHERE ...
LOOP
    EXECUTE format('SELECT ($1).%I::text', campo) INTO valor_anterior USING OLD;
    EXECUTE format('SELECT ($1).%I::text', campo) INTO valor_novo USING NEW;
    
    IF valor_anterior IS DISTINCT FROM valor_novo THEN
        campos_alterados := array_append(campos_alterados, campo);
        -- ...
    END IF;
END LOOP;
```

## Melhorias Implementadas

1. **Evita Row Expansion**: Usa `EXECUTE format` para acessar campos individualmente
2. **Tratamento de Erros**: Bloco `EXCEPTION` para ignorar campos que não podem ser comparados
3. **Suporte a Cotacoes**: Busca `company_id` via `requisicao_id` quando necessário
4. **Conversão Correta**: Converte `campos_alterados` (TEXT[]) para JSONB antes de inserir
5. **Verificação de Status**: Verifica status específico por tipo de processo antes de resetar aprovações
6. **Prevenção de Duplicatas**: Usa `ON CONFLICT DO NOTHING` no INSERT

## Campos Ignorados

A função ignora os seguintes campos ao detectar mudanças:
- `updated_at`
- `created_at`
- `aprovado_por`
- `data_aprovacao`

Isso evita que atualizações automáticas de timestamp ou aprovações triggerem reset desnecessário.

## Como Aplicar

Execute a migration no banco de dados:

```sql
-- A migration será executada automaticamente pelo Supabase
-- ou execute manualmente:
\i supabase/migrations/20250117000003_fix_record_edit_row_expansion_error.sql
```

## Teste

Após aplicar a correção, teste atualizando uma requisição de compra:

```sql
-- Atualizar uma requisição
UPDATE compras.requisicoes_compra
SET observacoes = 'Teste de edição'
WHERE id = 'seu-uuid-aqui';

-- Verificar se o histórico foi registrado
SELECT * FROM public.historico_edicoes_solicitacoes
WHERE processo_tipo = 'requisicao_compra'
ORDER BY data_edicao DESC
LIMIT 1;
```

## Arquivos Relacionados

- `supabase/migrations/20250117000003_fix_record_edit_row_expansion_error.sql` - Correção principal
- `supabase/migrations/20251211142000_fix_record_edit_and_reset_approvals.sql` - Versão anterior (com problema)
- `supabase/migrations/20251211144500_fix_record_edit_and_reset_no_row_expansion.sql` - Tentativa anterior de correção




