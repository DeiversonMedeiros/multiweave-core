# 🔍 ANÁLISE DO ERRO: update_page_permission_production

## ❌ **PROBLEMA IDENTIFICADO**

Ao habilitar a visualização de uma página na aba "Páginas" da página "cadastros/perfis", ocorre o seguinte erro:

```
POST https://wmtftyaqucwfsnnjepiy.supabase.co/rest/v1/rpc/update_page_permission_production 404 (Not Found)
Erro: function is_admin_by_permissions_flexible(uuid) does not exist
```

## 🔍 **ANÁLISE REALIZADA**

### **1. Verificação no Banco de Dados**

Conectado ao banco de produção via Supabase CLI, foram verificadas as seguintes funções:

#### ✅ **Funções que EXISTEM no banco:**
- `update_page_permission_production` - ✅ Existe
- `is_admin` - ✅ Existe
- `is_admin_all_production` - ✅ Existe
- `is_admin_simple` - ✅ Existe

#### ❌ **Funções que NÃO EXISTEM no banco:**
- `is_admin_by_permissions_flexible` - ❌ **NÃO EXISTE**

### **2. Análise do Código**

#### **Função Problemática:**
A função `update_page_permission_production` está definida em:
- **Arquivo:** `supabase/migrations/20260122000002_add_update_page_permission_function.sql`
- **Linha 32:** Usa `is_admin_by_permissions_flexible(auth.uid())`

```sql
IF auth.uid() IS NOT NULL AND NOT is_admin_by_permissions_flexible(auth.uid()) THEN
  RAISE EXCEPTION 'Acesso negado: apenas usuários com permissões administrativas podem gerenciar permissões';
END IF;
```

#### **Funções Similares (Corretas):**
As funções similares foram corrigidas na migração `20251107060000_fix_update_module_permission_production_super_admin.sql`:

- `update_module_permission_production` - ✅ Usa `is_admin_simple(auth.uid()) OR is_admin_all_production(auth.uid())`
- `update_entity_permission_production` - ✅ Usa `is_admin_simple(auth.uid()) OR is_admin_all_production(auth.uid())`

### **3. Causa Raiz**

A função `update_page_permission_production` foi criada usando `is_admin_by_permissions_flexible`, mas:

1. **A função `is_admin_by_permissions_flexible` nunca foi criada no banco de produção**
2. **Ela existe apenas em arquivos de funções locais** (`supabase/functions/is-admin-by-permissions-flexible.sql`), mas não foi aplicada como migração
3. **As outras funções similares foram corrigidas** para usar funções que existem no banco

## ✅ **SOLUÇÃO RECOMENDADA**

Atualizar a função `update_page_permission_production` para usar a mesma lógica das outras funções de atualização de permissões:

**Substituir:**
```sql
IF auth.uid() IS NOT NULL AND NOT is_admin_by_permissions_flexible(auth.uid()) THEN
```

**Por:**
```sql
IF auth.uid() IS NOT NULL AND NOT (is_admin_simple(auth.uid()) OR is_admin_all_production(auth.uid())) THEN
```

Isso garantirá:
- ✅ Consistência com as outras funções de atualização de permissões
- ✅ Uso de funções que existem no banco de produção
- ✅ Mesma lógica de verificação de admin (Super Admin OU usuários com todas as permissões de produção)

## 📋 **ARQUIVOS ENVOLVIDOS**

1. **`supabase/migrations/20260122000002_add_update_page_permission_function.sql`**
   - Precisa ser atualizado para usar funções existentes

2. **`src/components/PermissionManager.tsx`** (linha 398)
   - Está chamando corretamente a função RPC
   - Não precisa de alterações

## 🎯 **PRÓXIMOS PASSOS**

1. ✅ Criar migração para corrigir a função `update_page_permission_production`
2. ✅ Aplicar a migração no banco de produção
3. ✅ Testar a funcionalidade na página "cadastros/perfis"

---

**Data da Análise:** 2025-01-22
**Analisado por:** AI Assistant
**Status:** Aguardando correção
