# 📚 Conhecimento Adquirido - Evitar Problemas nas Próximas Fases

## ✅ **Lições Aprendidas das Fases 1 e 2**

### **🔧 Problemas Identificados e Soluções:**

#### **1. Funções RPC Não Expostas**
**Problema:** `404 (Not Found)` ao chamar funções RPC
**Solução:** 
- Sempre verificar se a função existe no banco
- Garantir que `GRANT EXECUTE` foi aplicado
- Usar `SECURITY DEFINER` nas funções

#### **2. Parâmetros Incorretos**
**Problema:** `p_permission` vs `p_action`
**Solução:**
- Padronizar: `p_action` para todas as funções de permissão
- Verificar assinatura das funções antes de chamar
- Usar parâmetros consistentes

#### **3. Funções Inexistentes**
**Problema:** `is_admin` vs `is_admin_simple`
**Solução:**
- Usar sempre `is_admin_simple` (função que existe)
- Verificar se a função está acessível via RPC
- Padronizar parâmetros: `p_user_id`

#### **4. Ambiguidade de Colunas**
**Problema:** `column reference "user_id" is ambiguous`
**Solução:**
- Usar aliases nas queries SQL
- Especificar tabela.coluna quando necessário
- Testar funções antes de usar

---

## 🛠️ **Checklist para Próximas Fases**

### **Antes de Converter uma Página:**

#### **1. Verificar Funções RPC:**
```sql
-- Verificar se as funções existem
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('check_entity_permission', 'is_admin_simple');

-- Verificar se estão acessíveis via RPC
SELECT routine_name, security_type FROM information_schema.routines 
WHERE routine_name = 'check_entity_permission';
```

#### **2. Testar Funções:**
```sql
-- Testar check_entity_permission
SELECT check_entity_permission('00000000-0000-0000-0000-000000000000', 'entidade_teste', 'read');

-- Testar is_admin_simple
SELECT is_admin_simple('00000000-0000-0000-0000-000000000000');
```

#### **3. Verificar Parâmetros:**
- ✅ `check_entity_permission(p_user_id, p_entity_name, p_action)`
- ✅ `check_module_permission(p_user_id, p_module_name, p_action)`
- ✅ `is_admin_simple(p_user_id)`

---

## 🔄 **Padrão de Conversão Seguro**

### **1. Backup da Página:**
```bash
# Sempre criar backup antes de modificar
cp src/pages/cadastros/Pagina.tsx backups/Pagina_original_faseX.tsx
```

### **2. Conversões Padrão:**
```typescript
// ❌ ANTES (Módulo):
import { RequireModule } from '@/components/RequireAuth';
const { canCreateModule } = usePermissions();
<RequireModule moduleName="entidade" action="read">
<PermissionGuard module="entidade" action="create">

// ✅ DEPOIS (Entidade):
import { RequireEntity } from '@/components/RequireAuth';
const { canCreateEntity } = usePermissions();
<RequireEntity entityName="entidade" action="read">
<PermissionGuard entity="entidade" action="create">
```

### **3. Validação Pós-Conversão:**
- ✅ Verificar imports corretos
- ✅ Verificar parâmetros das funções
- ✅ Testar no navegador
- ✅ Verificar console para erros

---

## 🚨 **Sinais de Alerta**

### **Se você ver estes erros:**
```
404 (Not Found) - Função RPC não existe
400 (Bad Request) - Parâmetros incorretos
PGRST202 - Função não encontrada no schema cache
42702 - Referência ambígua de coluna
```

### **Ações Imediatas:**
1. Verificar se a função existe no banco
2. Verificar parâmetros da chamada RPC
3. Testar a função diretamente no banco
4. Corrigir parâmetros se necessário

---

## 📋 **Template para Próximas Fases**

### **Fase X: [Nome da Fase]**

#### **Preparação:**
1. ✅ Backup das páginas
2. ✅ Verificar funções RPC
3. ✅ Testar funções no banco

#### **Conversão:**
1. ✅ RequireModule → RequireEntity
2. ✅ canCreateModule → canCreateEntity
3. ✅ PermissionGuard module → entity
4. ✅ Adicionar showNewButton se necessário

#### **Validação:**
1. ✅ Testar no navegador
2. ✅ Verificar console para erros
3. ✅ Confirmar funcionamento das permissões

---

**Status:** ✅ **CONHECIMENTO DOCUMENTADO** - Pronto para Fase 3
