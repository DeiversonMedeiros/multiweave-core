# 🔐 Sistema de Permissões Granulares

## 📋 Visão Geral

Este sistema permite implementar permissões granulares que combinam:
1. **Ownership (Propriedade)**: Usuário só vê registros criados por ele mesmo
2. **Centro de Custo**: Usuário só vê registros de centros de custo permitidos
3. **Combinação**: Ambos os filtros aplicados simultaneamente

Isso mantém o **sigilo de informações** entre usuários e centros de custo, atendendo à necessidade de que usuários vejam apenas suas próprias requisições de compra, contas a pagar, saídas e transferências de materiais, e apenas para seus próprios centros de custo e outros escolhidos pelo admin.

---

## 🏗️ Arquitetura

### Tabelas Criadas

#### 1. `user_cost_center_permissions`
Relaciona usuários com centros de custo permitidos. O admin do sistema gerencia essas permissões.

**Campos principais:**
- `user_id`: Usuário que terá acesso
- `company_id`: Empresa
- `cost_center_id`: Centro de custo permitido
- `can_read`, `can_create`, `can_edit`, `can_delete`: Permissões específicas

#### 2. `entity_ownership_config`
Configura quais entidades devem respeitar ownership e/ou centro de custo.

**Campos principais:**
- `entity_name`: Nome da entidade (ex: `requisicoes_compra`)
- `enforce_ownership`: Se `true`, força que usuário só veja o que criou
- `enforce_cost_center`: Se `true`, força que usuário só veja seus centros de custo
- `ownership_field`: Campo que identifica o criador (ex: `created_by`, `solicitante_id`)
- `cost_center_field`: Campo que identifica o centro de custo (ex: `centro_custo_id`)

### Funções Principais

1. **`user_has_cost_center_access(user_id, company_id, cost_center_id)`**
   - Verifica se usuário tem acesso a um centro de custo

2. **`get_user_allowed_cost_centers(user_id, company_id)`**
   - Retorna lista de centros de custo permitidos para o usuário

3. **`check_granular_permission(user_id, company_id, entity_name, record_id, action)`**
   - Verifica se usuário pode acessar um registro específico

4. **`filter_records_by_granular_permissions(user_id, company_id, entity_name)`**
   - Retorna apenas IDs de registros que o usuário pode acessar

### Funções RPC para Frontend

1. **`list_requisicoes_compra_filtered(company_id)`**
2. **`list_contas_pagar_filtered(company_id)`**
3. **`list_solicitacoes_saida_materiais_filtered(company_id)`**
4. **`list_transferencias_filtered(company_id)`**
5. **`can_create_for_cost_center(cost_center_id, company_id)`**

---

## ⚙️ Configuração Inicial

### 1. Configurar Entidades

As entidades já estão configuradas por padrão:
- ✅ `requisicoes_compra` - Ownership + Centro de Custo
- ✅ `contas_pagar` - Ownership + Centro de Custo
- ✅ `solicitacoes_saida_materiais` - Ownership + Centro de Custo (usa `funcionario_solicitante_id`)
- ✅ `transferencias` - Ownership (usa `solicitante_id`)

Para adicionar novas entidades:

```sql
INSERT INTO public.entity_ownership_config (
    entity_name,
    schema_name,
    table_name,
    enforce_ownership,
    enforce_cost_center,
    ownership_field,
    cost_center_field,
    description
) VALUES (
    'nova_entidade',
    'schema_name',
    'table_name',
    true,  -- Forçar ownership
    true,  -- Forçar centro de custo
    'created_by',
    'centro_custo_id',
    'Descrição da entidade'
);
```

### 2. Atribuir Centros de Custo aos Usuários

O admin deve atribuir quais centros de custo cada usuário pode acessar:

```sql
-- Exemplo: Permitir que usuário acesse 3 centros de custo
INSERT INTO public.user_cost_center_permissions (
    user_id,
    company_id,
    cost_center_id,
    can_read,
    can_create,
    can_edit,
    can_delete,
    created_by
) VALUES
    ('user-uuid-1', 'company-uuid', 'cost-center-uuid-1', true, true, true, false, 'admin-uuid'),
    ('user-uuid-1', 'company-uuid', 'cost-center-uuid-2', true, true, true, false, 'admin-uuid'),
    ('user-uuid-1', 'company-uuid', 'cost-center-uuid-3', true, true, true, false, 'admin-uuid');
```

---

## 💻 Uso no Frontend

### Exemplo 1: Listar Requisições de Compra

```typescript
import { supabase } from '@/integrations/supabase/client';

// Listar requisições filtradas automaticamente
const { data: requisicoes, error } = await supabase.rpc(
  'list_requisicoes_compra_filtered',
  {
    p_company_id: companyId // opcional, pega automaticamente do usuário
  }
);

// A função já retorna apenas:
// - Requisições criadas pelo usuário (enforce_ownership = true)
// - Requisições de centros de custo permitidos (enforce_cost_center = true)
```

### Exemplo 2: Listar Contas a Pagar

```typescript
const { data: contasPagar, error } = await supabase.rpc(
  'list_contas_pagar_filtered',
  { p_company_id: companyId }
);
```

### Exemplo 3: Verificar se Pode Criar para Centro de Custo

```typescript
// Antes de mostrar o formulário de criação, verificar se pode criar
const { data: canCreate, error } = await supabase.rpc(
  'can_create_for_cost_center',
  {
    p_cost_center_id: costCenterId,
    p_company_id: companyId
  }
);

if (canCreate) {
  // Mostrar formulário de criação
} else {
  // Mostrar mensagem: "Você não tem permissão para criar registros neste centro de custo"
}
```

### Exemplo 4: Filtrar Centros de Custo no Dropdown

```typescript
// Obter apenas centros de custo permitidos para o usuário
const { data: allowedCostCenters, error } = await supabase.rpc(
  'get_user_allowed_cost_centers',
  {
    p_user_id: userId,
    p_company_id: companyId
  }
);

// Usar allowedCostCenters para popular o dropdown
// O usuário só verá os centros de custo que tem permissão
```

---

## 🔍 Como Funciona

### Fluxo de Verificação

1. **Usuário solicita listagem** → Frontend chama função RPC
2. **Função RPC verifica se é admin** → Se sim, retorna tudo
3. **Se não é admin:**
   - Busca configuração da entidade em `entity_ownership_config`
   - Se `enforce_ownership = true`: Filtra por `created_by = user_id`
   - Se `enforce_cost_center = true`: Filtra por centros de custo permitidos
   - Retorna apenas registros que passam em ambos os filtros

### Exemplo Prático

**Cenário:**
- Usuário João criou 5 requisições de compra
- João tem acesso aos centros de custo: CC-001, CC-002
- Requisições:
  - R1: criada por João, centro de custo CC-001 ✅ (vê)
  - R2: criada por João, centro de custo CC-002 ✅ (vê)
  - R3: criada por João, centro de custo CC-003 ❌ (não vê - CC não permitido)
  - R4: criada por Maria, centro de custo CC-001 ❌ (não vê - não é dono)
  - R5: criada por Maria, centro de custo CC-002 ❌ (não vê - não é dono)

**Resultado:** João vê apenas R1 e R2.

---

## 🛠️ Gerenciamento pelo Admin

### Interface de Gerenciamento (Sugestão)

O admin precisa de uma interface para:

1. **Gerenciar Permissões de Centros de Custo por Usuário**
   - Selecionar usuário
   - Selecionar centros de custo permitidos
   - Definir permissões (read, create, edit, delete)

2. **Visualizar Configurações de Entidades**
   - Ver quais entidades têm restrições ativas
   - Editar configurações se necessário

### Exemplo de Query para Interface Admin

```sql
-- Listar todos os usuários e seus centros de custo permitidos
SELECT 
    u.id as user_id,
    u.nome as user_name,
    u.email,
    cc.id as cost_center_id,
    cc.nome as cost_center_name,
    cc.codigo as cost_center_code,
    uccp.can_read,
    uccp.can_create,
    uccp.can_edit,
    uccp.can_delete
FROM public.users u
LEFT JOIN public.user_cost_center_permissions uccp ON uccp.user_id = u.id
LEFT JOIN public.cost_centers cc ON cc.id = uccp.cost_center_id
WHERE u.ativo = true
ORDER BY u.nome, cc.nome;
```

---

## 📊 Casos de Uso

### Caso 1: Usuário com Acesso a Múltiplos Centros de Custo

**Situação:** João trabalha em 3 departamentos e precisa ver requisições de todos eles.

**Solução:**
```sql
-- Admin atribui 3 centros de custo a João
INSERT INTO public.user_cost_center_permissions (user_id, company_id, cost_center_id, ...)
VALUES 
    (joao_id, company_id, cc_departamento_a, ...),
    (joao_id, company_id, cc_departamento_b, ...),
    (joao_id, company_id, cc_departamento_c, ...);
```

João verá apenas:
- Requisições criadas por ele
- Dos 3 centros de custo permitidos

### Caso 2: Saída de Materiais com Ownership e Centro de Custo

**Situação:** Solicitações de saída de materiais devem ser visíveis apenas para quem solicitou e apenas para seus centros de custo permitidos.

**Solução:**
A configuração já está assim:
```sql
-- enforce_ownership = true
-- enforce_cost_center = true
-- ownership_field = 'funcionario_solicitante_id'
-- cost_center_field = 'centro_custo_id'
```

Usuário vê apenas solicitações onde `funcionario_solicitante_id = user_id` E `centro_custo_id` está nos centros de custo permitidos.

### Caso 3: Restrição Apenas por Centro de Custo

**Situação:** Algumas entidades não têm `created_by`, mas precisam de restrição por CC.

**Solução:**
```sql
UPDATE public.entity_ownership_config
SET 
    enforce_ownership = false,
    enforce_cost_center = true
WHERE entity_name = 'entidade_sem_owner';
```

---

## 🔒 Segurança

### Row Level Security (RLS)

- ✅ `user_cost_center_permissions`: Usuários veem apenas suas próprias permissões
- ✅ `entity_ownership_config`: Todos podem ver (read-only), apenas admins podem modificar

### Funções Security Definier

Todas as funções são `SECURITY DEFINER`, garantindo que:
- Verificações de permissão são feitas no banco
- Frontend não pode burlar as regras
- Admin sempre tem acesso total

---

## 🚀 Próximos Passos

1. **Criar Interface Admin** para gerenciar permissões de centros de custo
2. **Atualizar Frontend** para usar as novas funções RPC
3. **Testar Cenários** com diferentes usuários e centros de custo
4. **Documentar** para a equipe de desenvolvimento

---

## ❓ FAQ

**P: E se um usuário não tiver nenhum centro de custo atribuído?**
R: Ele não verá nenhum registro (exceto se for admin).

**P: Como desabilitar restrições temporariamente?**
R: Atualizar `entity_ownership_config`:
```sql
UPDATE public.entity_ownership_config
SET enforce_ownership = false, enforce_cost_center = false
WHERE entity_name = 'entidade';
```

**P: Posso ter restrição apenas por ownership, sem centro de custo?**
R: Sim, configure `enforce_ownership = true` e `enforce_cost_center = false`.

**P: Como funciona para admins?**
R: Admins sempre veem tudo, independente das restrições.

---

## 📝 Notas Técnicas

- As funções RPC são otimizadas com índices nas tabelas
- Filtros são aplicados no banco de dados (não no frontend)
- Performance: Consultas são rápidas mesmo com muitos registros
- Compatível com o sistema de permissões existente (module_permissions, entity_permissions)

---

**Criado em:** 2025-11-15  
**Versão:** 1.0.0

