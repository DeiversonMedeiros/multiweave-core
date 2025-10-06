# Guia de Multi-tenancy

## Visão Geral

O sistema implementa isolamento multi-tenant completo, garantindo que cada empresa veja apenas seus próprios dados. O isolamento é aplicado automaticamente em todas as consultas e operações.

## Arquitetura

### 1. Estrutura de Dados

Todas as tabelas principais possuem `company_id` para isolamento:

```sql
-- Tabelas com isolamento por empresa
users (company_id)
cost_centers (company_id)
materials (company_id)
partners (company_id)
projects (company_id)

-- Tabelas sem isolamento (globais)
companies
profiles
module_permissions
entity_permissions
user_companies
```

### 2. Row Level Security (RLS)

Políticas RLS garantem isolamento automático:

```sql
-- Exemplo: Usuários só veem usuários da própria empresa
CREATE POLICY "Users can view users of their companies" ON users
  FOR SELECT USING (
    company_id IN (
      SELECT uc.company_id 
      FROM user_companies uc 
      WHERE uc.user_id = auth.uid() 
      AND uc.ativo = true
    ) OR is_admin(auth.uid())
  );
```

## Hooks Disponíveis

### 1. useMultiTenancy

Hook principal para gerenciar contexto multi-tenant:

```typescript
import { useMultiTenancy } from '@/hooks/useMultiTenancy';

const {
  currentCompany,        // Empresa atual selecionada
  userCompanies,         // Empresas acessíveis pelo usuário
  isMultiTenant,         // Se tem acesso a múltiplas empresas
  canSwitchCompany,      // Se pode trocar de empresa
  loading,               // Estado de carregamento
  switchCompany,         // Função para trocar empresa
  hasCompanyAccess,      // Verificar acesso a empresa
  filterByCompany,       // Filtrar query por empresa
  addCompanyFilter,      // Adicionar filtro de empresa
  hasCompanyIsolation,   // Verificar se tabela tem isolamento
  getTenantContext       // Obter contexto completo
} = useMultiTenancy();
```

### 2. useTenantQuery

Hook para consultas com isolamento automático:

```typescript
import { useTenantQuery } from '@/hooks/useTenantQuery';

const { data, loading, error, refetch } = useTenantQuery({
  table: 'users',
  select: '*',
  filters: { ativo: true },
  orderBy: { column: 'nome', ascending: true },
  limit: 10
});
```

### 3. useTenantMutation

Hook para operações CRUD com isolamento:

```typescript
import { useTenantMutation } from '@/hooks/useTenantMutation';

const { insert, update, remove, loading, error } = useTenantMutation();

// Inserir com company_id automático
await insert('users', { nome: 'João', email: 'joao@email.com' });

// Atualizar com verificação de empresa
await update('users', 'user-id', { nome: 'João Silva' });

// Excluir com verificação de empresa
await remove('users', 'user-id');
```

## Componentes

### 1. TenantSelector

Seletor de empresa com interface moderna:

```typescript
import { TenantSelector, TenantSelectorCompact } from '@/components/TenantSelector';

// Seletor completo
<TenantSelector />

// Seletor compacto para header
<TenantSelectorCompact />
```

### 2. CurrentTenantInfo

Exibe informações da empresa atual:

```typescript
import { CurrentTenantInfo } from '@/components/TenantSelector';

<CurrentTenantInfo />
```

### 3. TenantIsolationDemo

Demonstra o funcionamento do isolamento:

```typescript
import { TenantIsolationDemo } from '@/components/TenantIsolationDemo';

<TenantIsolationDemo />
```

## Funcionalidades

### 1. Isolamento Automático

- **Consultas**: Automaticamente filtradas por empresa
- **Inserções**: `company_id` adicionado automaticamente
- **Atualizações**: Verificação de propriedade da empresa
- **Exclusões**: Apenas dados da própria empresa

### 2. Troca de Empresa

- **Seleção**: Interface intuitiva para trocar empresa
- **Recarregamento**: Dados atualizados automaticamente
- **Validação**: Verificação de permissões antes da troca

### 3. Super Admin

- **Acesso Total**: Vê dados de todas as empresas
- **Gerenciamento**: Pode gerenciar qualquer empresa
- **Bypass**: Contorna todas as restrições de isolamento

## Exemplos de Uso

### 1. Página com Isolamento

```typescript
import { useTenantQuery, useTenantMutation } from '@/hooks/useTenantQuery';
import { useMultiTenancy } from '@/hooks/useMultiTenancy';

export default function UsersPage() {
  const { currentCompany } = useMultiTenancy();
  
  // Consulta automaticamente filtrada por empresa
  const { data: users, loading, refetch } = useTenantQuery({
    table: 'users',
    select: '*',
    orderBy: { column: 'nome', ascending: true }
  });

  const { insert, update, remove } = useTenantMutation();

  const handleCreate = async (userData: any) => {
    // company_id adicionado automaticamente
    await insert('users', userData);
    refetch();
  };

  return (
    <div>
      <h1>Usuários</h1>
      {currentCompany && (
        <p>Empresa: {currentCompany.nome_fantasia}</p>
      )}
      {/* Renderizar usuários */}
    </div>
  );
}
```

### 2. Formulário com Isolamento

```typescript
import { useTenantMutation } from '@/hooks/useTenantQuery';

export default function UserForm() {
  const { insert, update } = useTenantMutation();

  const handleSubmit = async (data: any) => {
    try {
      if (editingUser) {
        await update('users', editingUser.id, data);
      } else {
        await insert('users', data);
      }
      toast.success('Usuário salvo com sucesso');
    } catch (error) {
      toast.error('Erro ao salvar usuário');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Campos do formulário */}
    </form>
  );
}
```

### 3. Verificação de Acesso

```typescript
import { useMultiTenancy } from '@/hooks/useMultiTenancy';

export default function ProtectedComponent() {
  const { hasCompanyAccess, currentCompany } = useMultiTenancy();

  const checkAccess = async (companyId: string) => {
    const hasAccess = await hasCompanyAccess(companyId);
    if (!hasAccess) {
      toast.error('Acesso negado a esta empresa');
      return;
    }
    // Continuar com operação
  };

  return (
    <div>
      {currentCompany && (
        <p>Empresa atual: {currentCompany.nome_fantasia}</p>
      )}
    </div>
  );
}
```

## Configuração

### 1. Tabelas com Isolamento

Para adicionar isolamento a uma nova tabela:

```sql
-- Adicionar company_id
ALTER TABLE nova_tabela ADD COLUMN company_id UUID REFERENCES companies(id);

-- Criar índice
CREATE INDEX idx_nova_tabela_company_id ON nova_tabela(company_id);

-- Atualizar função de isolamento
-- Adicionar 'nova_tabela' na lista de tabelas com isolamento
```

### 2. Políticas RLS

Criar políticas para nova tabela:

```sql
-- Política de visualização
CREATE POLICY "Users can view records of their companies" ON nova_tabela
  FOR SELECT USING (
    company_id IN (
      SELECT uc.company_id 
      FROM user_companies uc 
      WHERE uc.user_id = auth.uid() 
      AND uc.ativo = true
    ) OR is_admin(auth.uid())
  );

-- Política de inserção
CREATE POLICY "Users can insert records in their companies" ON nova_tabela
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT uc.company_id 
      FROM user_companies uc 
      WHERE uc.user_id = auth.uid() 
      AND uc.ativo = true
    ) OR is_admin(auth.uid())
  );
```

## Segurança

### 1. Isolamento Garantido

- **RLS**: Row Level Security aplicado em todas as tabelas
- **Validação**: Verificação de acesso em todas as operações
- **Auditoria**: Log de todas as operações por empresa

### 2. Super Admin

- **Acesso Total**: Pode ver e gerenciar todas as empresas
- **Bypass**: Contorna todas as restrições de isolamento
- **Auditoria**: Todas as ações são logadas

### 3. Validação de Dados

- **Integridade**: `company_id` obrigatório em tabelas isoladas
- **Consistência**: Verificação de propriedade antes de operações
- **Sanitização**: Dados filtrados automaticamente

## Performance

### 1. Índices

Índices criados para otimizar consultas:

```sql
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_cost_centers_company_id ON cost_centers(company_id);
-- ... outros índices
```

### 2. Cache

- **Contexto**: Empresa atual mantida em contexto
- **Permissões**: Cache de permissões do usuário
- **Dados**: Cache de dados da empresa atual

### 3. Consultas Otimizadas

- **Filtros**: Aplicados automaticamente pelo RLS
- **Joins**: Otimizados para isolamento
- **Paginação**: Suporte a paginação com isolamento

## Troubleshooting

### Problema: Dados não aparecem
- Verificar se empresa está selecionada
- Verificar se usuário tem acesso à empresa
- Verificar se tabela tem isolamento configurado

### Problema: Erro de permissão
- Verificar se usuário está associado à empresa
- Verificar se `user_companies` está configurado
- Verificar se RLS está habilitado

### Problema: Super admin não vê dados
- Verificar se função `is_admin` está funcionando
- Verificar se perfil "Super Admin" existe
- Verificar se usuário está associado ao perfil correto

## Boas Práticas

1. **Sempre usar hooks multi-tenant** para consultas e operações
2. **Verificar contexto** antes de operações sensíveis
3. **Validar permissões** antes de permitir ações
4. **Testar isolamento** com diferentes usuários e empresas
5. **Monitorar performance** de consultas com RLS
6. **Documentar mudanças** em tabelas com isolamento

