# 📘 Guia de Migração: RequireEntity → RequirePage

## 🎯 Objetivo

Este guia mostra como migrar páginas que usam `RequireEntity` para o novo sistema de `RequirePage`.

---

## 📋 Checklist de Migração

### 1. Atualizar Imports

**Antes:**
```typescript
import { RequireEntity } from '@/components/RequireAuth';
```

**Depois:**
```typescript
import { RequirePage } from '@/components/RequireAuth';
```

### 2. Atualizar Componente

**Antes:**
```typescript
<RequireEntity entityName="periodic_exams" action="read">
  {/* Conteúdo */}
</RequireEntity>
```

**Depois:**
```typescript
<RequirePage pagePath="/portal-colaborador/exames*" action="read">
  {/* Conteúdo */}
</RequirePage>
```

### 3. Atualizar Hooks (se necessário)

**Antes:**
```typescript
const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
```

**Depois:**
```typescript
const { canCreatePage, canEditPage, canDeletePage } = usePermissions();
```

### 4. Atualizar PermissionGuard/PermissionButton

**Antes:**
```typescript
<PermissionGuard entity="periodic_exams" action="create">
  <Button>Criar</Button>
</PermissionGuard>
```

**Depois:**
```typescript
<PermissionGuard page="/portal-colaborador/exames*" action="create">
  <Button>Criar</Button>
</PermissionGuard>
```

---

## 🗺️ Mapeamento Entidade → Página

### Portal Colaborador

| Entidade | Página |
|----------|--------|
| `portal_colaborador` | `/portal-colaborador*` |
| `time_records` | `/portal-colaborador/historico-marcacoes*` |
| `periodic_exams` | `/portal-colaborador/exames*` |
| `income_statements` | `/portal-colaborador/comprovantes*` |
| `vacations` | `/portal-colaborador/ferias*` |
| `reimbursement_requests` | `/portal-colaborador/reembolsos*` |
| `medical_certificates` | `/portal-colaborador/atestados*` |

### RH

| Entidade | Página |
|----------|--------|
| `employees` | `/rh/employees*` |
| `time_records` | `/rh/time-records*` |
| `vacations` | `/rh/vacations*` |
| `payroll` | `/rh/payroll*` |
| `treinamentos` | `/rh/treinamentos*` |
| `periodic_exams` | `/rh/periodic-exams*` |

### Portal Gestor

| Entidade | Página |
|----------|--------|
| `approval_center` | `/portal-gestor/aprovacoes*` |
| `vacation_approvals` | `/portal-gestor/aprovacoes/ferias*` |
| `exam_management` | `/portal-gestor/acompanhamento/exames*` |
| `time_tracking_management` | `/portal-gestor/acompanhamento/ponto*` |

### Cadastros

| Entidade | Página |
|----------|--------|
| `users` | `/cadastros/usuarios*` |
| `companies` | `/cadastros/empresas*` |
| `projects` | `/cadastros/projetos*` |
| `partners` | `/cadastros/parceiros*` |

### Financeiro

| Entidade | Página |
|----------|--------|
| `contas_pagar` | `/financeiro/contas-pagar*` |
| `contas_receber` | `/financeiro/contas-receber*` |
| `fluxo_caixa` | `/financeiro/tesouraria*` |

---

## ✅ Exemplos de Migração Realizados

### 1. ExamesPage.tsx

**Antes:**
```typescript
import { RequireEntity } from '@/components/RequireAuth';

<RequireEntity entityName="periodic_exams" action="read">
```

**Depois:**
```typescript
import { RequirePage } from '@/components/RequireAuth';

<RequirePage pagePath="/portal-colaborador/exames*" action="read">
```

### 2. ComprovantesPage.tsx

**Antes:**
```typescript
<RequireEntity entityName="income_statements" action="read">
```

**Depois:**
```typescript
<RequirePage pagePath="/portal-colaborador/comprovantes*" action="read">
```

### 3. TestPortal.tsx

**Antes:**
```typescript
<RequireEntity entityName="portal_colaborador" action="read">
```

**Depois:**
```typescript
<RequirePage pagePath="/portal-colaborador*" action="read">
```

---

## 🔍 Como Encontrar Páginas para Migrar

```bash
# Buscar todas as páginas que usam RequireEntity
grep -r "RequireEntity" src/pages/
```

---

## ⚠️ Notas Importantes

1. **Wildcards:** Use `*` no final do caminho para cobrir todas as rotas relacionadas
   - Ex: `/rh/employees*` cobre `/rh/employees`, `/rh/employees/:id`, `/rh/employees/:id/edit`

2. **Caminho Automático:** Se não especificar `pagePath`, o componente usa o caminho atual automaticamente
   ```typescript
   <RequirePage action="read">  {/* Usa location.pathname */}
   ```

3. **Compatibilidade:** O sistema mantém compatibilidade com `RequireEntity` durante a transição

4. **Prioridade:** Permissões por página têm prioridade sobre entidade/módulo

---

## 📊 Status da Migração

- ✅ **3 páginas migradas** como exemplo:
  - `ExamesPage.tsx`
  - `ComprovantesPage.tsx`
  - `TestPortal.tsx`

- ⏳ **~120 páginas restantes** para migração gradual

---

## 🚀 Próximos Passos

1. Migrar páginas do portal do colaborador (prioridade alta)
2. Migrar páginas do portal do gestor
3. Migrar páginas do RH
4. Migrar páginas restantes
