# 🔧 Correção: Erro 404 ao Chamar Funções RPC

## ❌ Problema Encontrado

```
POST https://wmtftyaqucwfsnnjepiy.supabase.co/rest/v1/rpc/insert_plano_contas_telecom 404 (Not Found)
```

**Causa Raiz**: O Supabase REST API (PostgREST) só expõe funções RPC do schema `public` por padrão. Funções em schemas não-públicos (como `financeiro`) não são acessíveis diretamente via REST API.

## ✅ Solução Aplicada

Criadas funções **wrapper** no schema `public` que chamam as funções originais do schema `financeiro`.

### Migração Aplicada

**Arquivo**: `supabase/migrations/20250120000018_create_public_rpc_wrappers.sql`

**Funções Criadas**:
1. `public.insert_plano_contas_telecom()` → chama `financeiro.insert_plano_contas_telecom()`
2. `public.insert_classes_financeiras_telecom()` → chama `financeiro.insert_classes_financeiras_telecom()`

### Como Funciona

```sql
-- Função wrapper no schema public
CREATE OR REPLACE FUNCTION public.insert_plano_contas_telecom(
    p_company_id UUID,
    p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Chama a função original do schema financeiro
    RETURN financeiro.insert_plano_contas_telecom(p_company_id, p_created_by);
END;
$$;
```

## 🎯 Resultado

Agora os hooks podem chamar as funções normalmente:

```typescript
// ✅ Funciona agora!
const { data, error } = await supabase.rpc('insert_plano_contas_telecom', {
  p_company_id: selectedCompany?.id,
  p_created_by: user?.id || null
});
```

## 📋 Verificação

### 1. Funções Existem no Banco

```sql
SELECT routine_name, routine_schema 
FROM information_schema.routines 
WHERE routine_name IN ('insert_plano_contas_telecom', 'insert_classes_financeiras_telecom')
ORDER BY routine_schema, routine_name;
```

**Resultado Esperado**:
- `insert_plano_contas_telecom` em `financeiro` ✅
- `insert_plano_contas_telecom` em `public` ✅ (wrapper)
- `insert_classes_financeiras_telecom` em `financeiro` ✅
- `insert_classes_financeiras_telecom` em `public` ✅ (wrapper)

### 2. Permissões Configuradas

```sql
SELECT routine_name, routine_schema, security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('insert_plano_contas_telecom', 'insert_classes_financeiras_telecom');
```

**Resultado Esperado**: `SECURITY DEFINER` ✅

### 3. Grants Aplicados

```sql
SELECT grantee, routine_name
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
AND routine_name IN ('insert_plano_contas_telecom', 'insert_classes_financeiras_telecom');
```

**Resultado Esperado**: `authenticated` tem permissão de EXECUTE ✅

## 🧪 Teste Manual

### Via SQL (Direto no Banco)

```sql
-- Testar função wrapper
SELECT public.insert_plano_contas_telecom(
    'uuid-da-empresa'::UUID,
    NULL
);
```

### Via Supabase REST API

```bash
curl -X POST 'https://wmtftyaqucwfsnnjepiy.supabase.co/rest/v1/rpc/insert_plano_contas_telecom' \
  -H "apikey: YOUR_API_KEY" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "p_company_id": "uuid-da-empresa",
    "p_created_by": null
  }'
```

## 📝 Notas Importantes

1. **Padrão do Sistema**: Este é o padrão já usado no sistema para outras funções RPC (ex: `generate_titulo_number`)

2. **Segurança**: As funções wrapper usam `SECURITY DEFINER`, então executam com as permissões do criador da função (postgres), permitindo acesso ao schema `financeiro`

3. **Manutenção**: Se a função original em `financeiro` for atualizada, a wrapper em `public` continuará funcionando porque apenas repassa os parâmetros

## ✅ Status

- [x] Funções wrapper criadas
- [x] Permissões configuradas
- [x] Grants aplicados
- [x] Migração aplicada no banco
- [ ] Teste na interface (usuário deve testar)

## 🚀 Próximos Passos

1. **Testar na Interface**:
   - Acesse `/financeiro/contabilidade`
   - Clique em "Inserir Padrão Telecom"
   - Deve funcionar sem erro 404

2. **Testar Classes Financeiras**:
   - Acesse `/financeiro/classes-financeiras`
   - Clique em "Inserir Padrão Telecom"
   - Deve funcionar sem erro 404

---

**Data da Correção**: 2025-01-20  
**Status**: ✅ Corrigido

