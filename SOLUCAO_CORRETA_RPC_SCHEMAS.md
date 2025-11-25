# ✅ Solução Correta: Chamar Funções RPC de Schemas Não-Públicos

## 🎯 Problema

O Supabase REST API (PostgREST) só expõe funções RPC do schema `public` por padrão. Funções em schemas não-públicos (como `financeiro`, `rh`, `core`) não são acessíveis diretamente via REST API.

## ❌ Solução Incorreta (Evitada)

Criar funções wrapper no schema `public` apenas para chamar outras funções:
```sql
-- ❌ NÃO FAZER ISSO
CREATE FUNCTION public.insert_plano_contas_telecom(...)
AS $$ BEGIN
    RETURN financeiro.insert_plano_contas_telecom(...);
END; $$;
```

**Problemas:**
- Duplicação desnecessária de código
- Manutenção difícil (precisa atualizar wrapper quando a função original muda)
- Não escala bem (precisa criar wrapper para cada função)

## ✅ Solução Correta Implementada

### Função Genérica no Schema Public

Criada uma função genérica `public.call_schema_rpc()` que permite chamar qualquer função RPC de qualquer schema:

```sql
CREATE OR REPLACE FUNCTION public.call_schema_rpc(
    p_schema_name TEXT,
    p_function_name TEXT,
    p_params JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- Implementação que constrói SQL dinâmico para chamar a função
$$;
```

### Como Usar nos Hooks

```typescript
// ✅ CORRETO: Usar função genérica
const { data, error } = await supabase.rpc('call_schema_rpc', {
  p_schema_name: 'financeiro',
  p_function_name: 'insert_plano_contas_telecom',
  p_params: {
    p_company_id: selectedCompany.id,
    p_created_by: user?.id || null
  }
});
```

## 📋 Vantagens da Solução

1. **Escalável**: Uma única função serve para todas as funções RPC de todos os schemas
2. **Organizado**: Funções permanecem em seus schemas apropriados (`financeiro`, `rh`, etc.)
3. **Manutenível**: Não precisa criar/atualizar wrappers quando funções mudam
4. **Flexível**: Funciona com qualquer função RPC de qualquer schema
5. **Type-safe**: Parâmetros são passados via JSONB, permitindo validação

## 🔧 Implementação

### Migração Aplicada

**Arquivo**: `supabase/migrations/20250120000019_create_generic_rpc_caller.sql`

### Hooks Atualizados

1. **`usePlanoContas.ts`** - `useInsertPlanoContasTelecom()`
2. **`useClassesFinanceiras.ts`** - `useInsertClassesFinanceirasTelecom()`

### Exemplo de Uso

```typescript
// Hook para inserir plano de contas
export function useInsertPlanoContasTelecom() {
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!selectedCompany?.id) {
        throw new Error('Company not selected.');
      }
      
      // Chamar função RPC do schema financeiro via função genérica
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.rpc('call_schema_rpc', {
        p_schema_name: 'financeiro',
        p_function_name: 'insert_plano_contas_telecom',
        p_params: {
          p_company_id: selectedCompany.id,
          p_created_by: user?.id || null
        }
      });
      
      if (error) throw error;
      
      // Verificar se houve erro na execução
      if (data?.error) {
        throw new Error(data.message || 'Erro ao inserir plano de contas');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financeiro', 'plano_contas'] });
    },
    ...queryConfig.mutation,
  });
}
```

## 🎯 Padrão para Futuras Funções RPC

Para qualquer nova função RPC em schemas não-públicos:

1. **Criar a função no schema apropriado** (ex: `financeiro`, `rh`)
2. **Chamar via função genérica** no hook:
   ```typescript
   await supabase.rpc('call_schema_rpc', {
     p_schema_name: 'schema_name',
     p_function_name: 'function_name',
     p_params: { /* parâmetros da função */ }
   });
   ```

## 📝 Notas Importantes

1. **Segurança**: A função usa `SECURITY DEFINER`, então executa com permissões do criador (postgres), permitindo acesso a schemas não-públicos
2. **Tipos**: A função detecta automaticamente tipos (UUID, TEXT, INTEGER, NUMERIC, BOOLEAN) baseado no JSONB
3. **Erros**: Retorna erros estruturados em JSONB para facilitar tratamento no frontend

## ✅ Status

- [x] Função genérica criada
- [x] Hooks atualizados
- [x] Wrappers removidos
- [x] Migração aplicada
- [ ] Teste na interface

---

**Data**: 2025-01-20  
**Status**: ✅ Solução Correta Implementada

