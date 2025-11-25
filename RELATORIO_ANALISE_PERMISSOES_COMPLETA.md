# 📊 RELATÓRIO COMPLETO - ANÁLISE DE PERMISSÕES DO SISTEMA

## 🎯 RESUMO EXECUTIVO

Análise completa do sistema de permissões identificou **múltiplas inconsistências** entre:
- Entidades configuradas no `PermissionManager`
- Entidades usadas nas páginas (`RequireEntity`)
- Permissões verificadas no código (`canCreateEntity`, `canReadEntity`, etc.)
- Rotas protegidas no sistema

**Data da Análise:** 11 de Novembro de 2025  
**Perfil Analisado:** RHU - Gestor de Ponto

---

## ❌ PROBLEMAS IDENTIFICADOS

### 1. **Convênios Médicos - Inconsistência de Nome**

**Problema:** 
- Página `MedicalAgreementNewPage.tsx` usa `RequireEntity entityName="medical_agreement"` (singular)
- `PermissionManager` tem `medical_agreements` (plural)
- Banco de dados: tabela `rh.medical_agreements` (plural)

**Impacto:** Usuário com permissão de `medical_agreements` não consegue criar convênios porque a página verifica `medical_agreement`.

**Solução:** Padronizar para `medical_agreements` (plural) em todas as páginas.

---

### 2. **Premiações e Produtividade - Sem Verificação de Permissão**

**Problema:**
- Página `AwardsProductivityPage.tsx` **NÃO** tem `RequireEntity` ou `RequireModule`
- Botões de ação (criar, editar, deletar) **NÃO** usam `PermissionGuard` ou `PermissionButton`
- Modal de criação não verifica permissão

**Impacto:** Usuário não consegue abrir modal mesmo tendo permissão configurada.

**Solução:** Adicionar `RequireEntity entityName="awards_productivity"` e proteger botões com `PermissionButton`.

---

### 3. **Entidades Faltantes no PermissionManager**

As seguintes entidades são usadas nas páginas mas **NÃO** estão no `PermissionManager`:

#### Entidades de Parâmetros RH:
- ❌ `inss_brackets` - Usado em `InssBracketsPage.tsx`
- ❌ `irrf_brackets` - Usado em `IrrfBracketsPage.tsx` (não encontrado no PermissionManager)
- ❌ `fgts_config` - Usado em `FgtsConfigPage.tsx` (não encontrado no PermissionManager)
- ❌ `delay_reasons` - Usado em `DelayReasonsPage.tsx`
- ❌ `absence_types` - Usado em `AbsenceTypesPage.tsx`
- ❌ `cid_codes` - Usado em `CidCodesPage.tsx`
- ❌ `allowance_types` - Usado em `AllowanceTypesPage.tsx`
- ❌ `deficiency_types` - Usado em `DeficiencyTypesPage.tsx`

#### Entidades de Benefícios e Convênios:
- ❌ `awards_productivity` - Usado em `AwardProductivityNewPage.tsx` como `award_productivity` (singular)
- ❌ `medical_plan` - Usado em `MedicalPlanNewPage.tsx` (singular)
- ❌ `employee_medical_plan` - Usado em `EmployeeMedicalPlanNewPage.tsx`
- ❌ `unions` - Usado em `UnionNewPage.tsx` e `UnionsPage.tsx`
- ❌ `employee_union_membership` - Usado em `EmployeeUnionMembershipNewPage.tsx`

#### Entidades de Processamento:
- ❌ `payroll_calculation` - Usado em `PayrollCalculationPageNew.tsx`
- ❌ `event_consolidation` - Usado em `EventConsolidationPage.tsx`

**Impacto:** Mesmo que o perfil tenha permissão configurada no banco de dados, essas entidades não aparecem na interface de gerenciamento de permissões, tornando impossível configurá-las.

---

### 4. **Inconsistências de Nomenclatura**

#### Singular vs Plural:
- `award_productivity` (singular) vs `awards_productivity` (plural no banco)
- `medical_agreement` (singular) vs `medical_agreements` (plural no banco)
- `medical_plan` (singular) vs `medical_plans` (plural no banco)

**Padrão Recomendado:** Usar **plural** para consistência com o banco de dados.

---

## 📋 ENTIDADES USADAS NAS PÁGINAS

### Entidades que ESTÃO no PermissionManager:
✅ `employees`, `positions`, `units`, `time_records`, `registros_ponto`, `vacations`, `reimbursement_requests`, `periodic_exams`, `disciplinary_actions`, `trainings`, `work_shifts`, `holidays`, `rubricas`, `dependents`, `employment_contracts`, `medical_agreements`, `benefits`, `payroll_config`, `payroll`, `income_statements`, `esocial`

### Entidades que NÃO ESTÃO no PermissionManager:
❌ `inss_brackets`, `irrf_brackets`, `fgts_config`, `delay_reasons`, `absence_types`, `cid_codes`, `allowance_types`, `deficiency_types`, `awards_productivity`, `medical_plan`, `employee_medical_plan`, `unions`, `employee_union_membership`, `payroll_calculation`, `event_consolidation`

---

## 🔧 CORREÇÕES NECESSÁRIAS

### 1. Adicionar Entidades Faltantes no PermissionManager

**Arquivo:** `src/components/PermissionManager.tsx`

Adicionar na lista `entities` (linha 75):

```typescript
// Entidades de Parâmetros RH
'inss_brackets', // Tabela: rh.inss_brackets
'irrf_brackets', // Tabela: rh.irrf_brackets
'fgts_config', // Tabela: rh.fgts_config
'delay_reasons', // Tabela: rh.delay_reasons
'absence_types', // Tabela: rh.absence_types
'cid_codes', // Tabela: rh.cid_codes
'allowance_types', // Tabela: rh.allowance_types
'deficiency_types', // Tabela: rh.deficiency_types

// Entidades de Benefícios e Convênios
'awards_productivity', // Tabela: rh.awards_productivity
'medical_plan', // Tabela: rh.medical_plans
'employee_medical_plan', // Tabela: rh.employee_medical_plans
'unions', // Tabela: rh.unions
'employee_union_membership', // Tabela: rh.employee_union_memberships

// Entidades de Processamento
'payroll_calculation', // Tabela: rh.payroll_calculations
'event_consolidation', // Tabela: rh.event_consolidations
```

Adicionar nomes de exibição em `getEntityDisplayName` (linha 351):

```typescript
// Parâmetros RH
'inss_brackets': 'Faixas INSS (rh.inss_brackets)',
'irrf_brackets': 'Faixas IRRF (rh.irrf_brackets)',
'fgts_config': 'Configurações FGTS (rh.fgts_config)',
'delay_reasons': 'Motivos de Atraso (rh.delay_reasons)',
'absence_types': 'Tipos de Afastamento (rh.absence_types)',
'cid_codes': 'Códigos CID (rh.cid_codes)',
'allowance_types': 'Tipos de Adicionais (rh.allowance_types)',
'deficiency_types': 'Tipos de Deficiência (rh.deficiency_types)',

// Benefícios e Convênios
'awards_productivity': 'Premiações e Produtividade (rh.awards_productivity)',
'medical_plan': 'Planos Médicos (rh.medical_plans)',
'employee_medical_plan': 'Adesões de Planos Médicos (rh.employee_medical_plans)',
'unions': 'Sindicatos (rh.unions)',
'employee_union_membership': 'Vínculos Sindicais (rh.employee_union_memberships)',

// Processamento
'payroll_calculation': 'Cálculo de Folha (rh.payroll_calculations)',
'event_consolidation': 'Consolidação de Eventos (rh.event_consolidations)',
```

---

### 2. Corrigir Inconsistências de Nome nas Páginas

#### MedicalAgreementNewPage.tsx
```typescript
// ANTES:
<RequireEntity entityName="medical_agreement" action="read">

// DEPOIS:
<RequireEntity entityName="medical_agreements" action="read">
```

#### AwardProductivityNewPage.tsx
```typescript
// ANTES:
<RequireEntity entityName="award_productivity" action="read">

// DEPOIS:
<RequireEntity entityName="awards_productivity" action="read">
```

#### MedicalPlanNewPage.tsx
```typescript
// ANTES:
<RequireEntity entityName="medical_plan" action="read">

// DEPOIS:
<RequireEntity entityName="medical_plans" action="read">
```

---

### 3. Adicionar Proteção na Página AwardsProductivityPage

**Arquivo:** `src/pages/rh/AwardsProductivityPage.tsx`

Adicionar no início do componente:

```typescript
import { RequireEntity } from '@/components/RequireAuth';
import { PermissionGuard, PermissionButton } from '@/components/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

const AwardsProductivityPage: React.FC = () => {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();
  // ... resto do código
```

Envolver o return com `RequireEntity`:

```typescript
return (
  <RequireEntity entityName="awards_productivity" action="read">
    <div className="container mx-auto py-8 space-y-6">
      {/* ... conteúdo ... */}
    </div>
  </RequireEntity>
);
```

Proteger botões com `PermissionButton`:

```typescript
<PermissionButton entity="awards_productivity" action="create">
  <Button asChild>
    <Link to="/rh/awards-productivity/new">
      <PlusCircle className="mr-2" size={20} />
      Nova Premiação
    </Link>
  </Button>
</PermissionButton>
```

---

## 📊 MAPEAMENTO COMPLETO DE ENTIDADES

### Entidades RH - Parâmetros e Configurações
| Entidade | Tabela BD | Página | Status PermissionManager |
|----------|-----------|--------|-------------------------|
| `inss_brackets` | `rh.inss_brackets` | `InssBracketsPage.tsx` | ❌ Faltando |
| `irrf_brackets` | `rh.irrf_brackets` | `IrrfBracketsPage.tsx` | ❌ Faltando |
| `fgts_config` | `rh.fgts_config` | `FgtsConfigPage.tsx` | ❌ Faltando |
| `delay_reasons` | `rh.delay_reasons` | `DelayReasonsPage.tsx` | ❌ Faltando |
| `absence_types` | `rh.absence_types` | `AbsenceTypesPage.tsx` | ❌ Faltando |
| `cid_codes` | `rh.cid_codes` | `CidCodesPage.tsx` | ❌ Faltando |
| `allowance_types` | `rh.allowance_types` | `AllowanceTypesPage.tsx` | ❌ Faltando |
| `deficiency_types` | `rh.deficiency_types` | `DeficiencyTypesPage.tsx` | ❌ Faltando |

### Entidades RH - Benefícios e Convênios
| Entidade | Tabela BD | Página | Status PermissionManager |
|----------|-----------|--------|-------------------------|
| `awards_productivity` | `rh.awards_productivity` | `AwardsProductivityPage.tsx` | ❌ Faltando |
| `medical_agreements` | `rh.medical_agreements` | `MedicalAgreementsPage.tsx` | ✅ Existe |
| `medical_plans` | `rh.medical_plans` | `MedicalPlanNewPage.tsx` | ❌ Faltando |
| `employee_medical_plans` | `rh.employee_medical_plans` | `EmployeeMedicalPlanNewPage.tsx` | ❌ Faltando |
| `unions` | `rh.unions` | `UnionsPage.tsx` | ❌ Faltando |
| `employee_union_memberships` | `rh.employee_union_memberships` | `EmployeeUnionMembershipNewPage.tsx` | ❌ Faltando |

### Entidades RH - Processamento
| Entidade | Tabela BD | Página | Status PermissionManager |
|----------|-----------|--------|-------------------------|
| `payroll_calculation` | `rh.payroll_calculations` | `PayrollCalculationPageNew.tsx` | ❌ Faltando |
| `event_consolidation` | `rh.event_consolidations` | `EventConsolidationPage.tsx` | ❌ Faltando |

---

## ✅ CHECKLIST DE CORREÇÕES

- [ ] Adicionar entidades faltantes no `PermissionManager.tsx`
- [ ] Adicionar nomes de exibição para novas entidades
- [ ] Corrigir `MedicalAgreementNewPage.tsx` (medical_agreement → medical_agreements)
- [ ] Corrigir `AwardProductivityNewPage.tsx` (award_productivity → awards_productivity)
- [ ] Corrigir `MedicalPlanNewPage.tsx` (medical_plan → medical_plans)
- [ ] Adicionar `RequireEntity` em `AwardsProductivityPage.tsx`
- [ ] Adicionar `PermissionButton` nos botões de `AwardsProductivityPage.tsx`
- [ ] Verificar todas as páginas que usam nomes singulares e padronizar para plural
- [ ] Testar permissões após correções

---

## 🎯 CONCLUSÃO

O sistema possui **16 entidades faltantes** no `PermissionManager` e **múltiplas inconsistências** de nomenclatura que impedem o funcionamento correto das permissões. As correções propostas resolverão os problemas identificados e permitirão que o perfil "RHU - Gestor de Ponto" tenha acesso adequado a todas as funcionalidades configuradas.

