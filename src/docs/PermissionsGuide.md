# Guia de Uso do Sistema de Permissões

## Visão Geral

O sistema de permissões implementado oferece controle granular de acesso baseado em:
- **Módulos**: Funcionalidades do sistema (dashboard, users, companies, etc.)
- **Entidades**: Dados específicos (users, companies, profiles, etc.)
- **Ações**: Operações permitidas (read, create, edit, delete)

## Hooks Disponíveis

### 1. useAuthorization
Hook principal para verificação de permissões.

```typescript
import { useAuthorization } from '@/hooks/useAuthorization';

const {
  permissions,           // Array de permissões do usuário
  loading,              // Estado de carregamento
  isAdmin,              // Se é super admin
  checkModulePermission, // Verificar permissão de módulo (assíncrono)
  checkEntityPermission, // Verificar permissão de entidade (assíncrono)
  checkCompanyAccess,   // Verificar acesso a empresa (assíncrono)
  hasModulePermission,  // Verificar permissão de módulo (síncrono)
  hasAnyModulePermission // Verificar se tem qualquer permissão no módulo
} = useAuthorization();
```

### 2. usePermissions
Hook simplificado para verificações comuns.

```typescript
import { usePermissions } from '@/hooks/usePermissions';

const {
  isAdmin,              // Se é super admin
  canReadModule,        // Pode ler módulo
  canCreateModule,      // Pode criar no módulo
  canEditModule,        // Pode editar no módulo
  canDeleteModule,      // Pode deletar no módulo
  hasModuleAccess,      // Tem acesso ao módulo
  canReadEntity,        // Pode ler entidade
  canCreateEntity,      // Pode criar entidade
  canEditEntity,        // Pode editar entidade
  canDeleteEntity,      // Pode deletar entidade
  checkPermission,      // Verificar permissão específica
  hasCompanyAccess      // Verificar acesso a empresa
} = usePermissions();
```

### 3. usePermissionCheck
Hook para verificações específicas com estado.

```typescript
import { usePermissionCheck } from '@/hooks/usePermissionCheck';

const { hasPermission, loading, isAdmin } = usePermissionCheck({
  module: 'users',
  action: 'read'
});
```

## Componentes de Proteção

### 1. RequireAuth
Protege rotas inteiras baseado em permissões.

```typescript
import { RequireAuth, RequireModule, RequireEntity } from '@/components/RequireAuth';

// Proteger por módulo
<RequireModule moduleName="users" action="read">
  <UsersPage />
</RequireModule>

// Proteger por entidade
<RequireEntity entityName="users" action="create">
  <CreateUserForm />
</RequireEntity>

// Proteger com permissão customizada
<RequireAuth 
  requiredPermission={{ type: 'module', name: 'users', action: 'edit' }}
  fallback={<AccessDenied />}
>
  <EditUserForm />
</RequireAuth>
```

### 2. PermissionGuard
Protege elementos específicos da interface.

```typescript
import { PermissionGuard, PermissionButton, PermissionLink } from '@/components/PermissionGuard';

// Proteger elemento
<PermissionGuard module="users" action="create">
  <CreateUserButton />
</PermissionGuard>

// Botão com permissão
<PermissionButton 
  module="users" 
  action="edit"
  onClick={handleEdit}
  className="btn-primary"
>
  Editar Usuário
</PermissionButton>

// Link com permissão
<PermissionLink 
  to="/users" 
  module="users" 
  action="read"
  className="nav-link"
>
  Usuários
</PermissionLink>
```

## Exemplos de Uso

### 1. Página com Proteção de Módulo

```typescript
import { RequireModule } from '@/components/RequireAuth';
import { usePermissions } from '@/hooks/usePermissions';

export default function UsersPage() {
  const { canCreateModule, canEditModule, canDeleteModule } = usePermissions();

  return (
    <RequireModule moduleName="users" action="read">
      <div>
        <h1>Usuários</h1>
        
        {/* Botão só aparece se tiver permissão */}
        {canCreateModule('users') && (
          <button onClick={handleCreate}>Novo Usuário</button>
        )}
        
        {/* Tabela com ações condicionais */}
        <UsersTable 
          showEdit={canEditModule('users')}
          showDelete={canDeleteModule('users')}
        />
      </div>
    </RequireModule>
  );
}
```

### 2. Formulário com Proteção de Entidade

```typescript
import { PermissionGuard } from '@/components/PermissionGuard';

export default function UserForm() {
  return (
    <form>
      <input name="name" placeholder="Nome" />
      <input name="email" placeholder="Email" />
      
      {/* Campo só aparece se tiver permissão */}
      <PermissionGuard entity="users" action="edit">
        <select name="role">
          <option value="user">Usuário</option>
          <option value="admin">Admin</option>
        </select>
      </PermissionGuard>
      
      <button type="submit">Salvar</button>
    </form>
  );
}
```

### 3. Menu Dinâmico

```typescript
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSION_CONFIG } from '@/lib/permissions';

export default function Sidebar() {
  const { hasModuleAccess } = usePermissions();

  const menuItems = PERMISSION_CONFIG.MODULES.filter(module => 
    hasModuleAccess(module.key)
  );

  return (
    <nav>
      {menuItems.map(module => (
        <a key={module.key} href={module.path}>
          {module.name}
        </a>
      ))}
    </nav>
  );
}
```

## Configuração de Permissões

### 1. Módulos Disponíveis

```typescript
// src/lib/permissions.ts
export const PERMISSION_CONFIG = {
  MODULES: {
    'dashboard': { name: 'Dashboard', path: '/dashboard' },
    'users': { name: 'Usuários', path: '/users' },
    'companies': { name: 'Empresas', path: '/companies' },
    // ... outros módulos
  }
};
```

### 2. Verificação de Permissões

```typescript
// Verificar permissão síncrona
const canRead = hasModulePermission('users', 'read');

// Verificar permissão assíncrona
const canCreate = await checkModulePermission('users', 'create');

// Verificar acesso a empresa
const hasAccess = await checkCompanyAccess(companyId);
```

## Estrutura de Dados

### Permissões do Usuário

```typescript
interface UserPermission {
  module_name: string;
  can_read: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}
```

### Ações Disponíveis

- `read`: Visualizar dados
- `create`: Criar novos registros
- `edit`: Modificar registros existentes
- `delete`: Excluir registros

## Boas Práticas

1. **Sempre verificar permissões** antes de mostrar elementos sensíveis
2. **Usar componentes de proteção** para simplificar o código
3. **Implementar fallbacks** para usuários sem permissão
4. **Testar diferentes perfis** de usuário
5. **Documentar permissões** necessárias para cada funcionalidade

## Troubleshooting

### Problema: Permissões não carregam
- Verificar se o usuário está autenticado
- Verificar se as funções SQL estão funcionando
- Verificar logs do console para erros

### Problema: Usuário não vê elementos
- Verificar se tem permissão para o módulo/entidade
- Verificar se o componente de proteção está correto
- Verificar se o perfil do usuário está ativo

### Problema: Super admin não tem acesso
- Verificar se a função `is_admin` está funcionando
- Verificar se o perfil "Super Admin" existe
- Verificar se o usuário está associado ao perfil correto

