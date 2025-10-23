# 🔐 Guia do Sistema de Permissões

## 📋 Visão Geral

O sistema de permissões do MultiWeave Core permite controle granular de acesso a funcionalidades específicas baseado em:
- **Módulos**: Áreas funcionais do sistema (ex: compras, almoxarifado, RH)
- **Entidades**: Tabelas/recursos específicos (ex: solicitações_compra, cotacoes)
- **Ações**: Operações permitidas (read, create, edit, delete)

## 🎯 Entidades do Processo de Compras

### Entidades Criadas:
- `solicitacoes_compra` - Solicitações de compra
- `cotacoes` - Cotações de preços
- `pedidos_compra` - Pedidos de compra
- `aprovacoes_compra` - Aprovações de compra
- `fornecedores` - Fornecedores
- `contratos_compra` - Contratos de compra
- `historico_compras` - Histórico de compras
- `avaliacao_fornecedores` - Avaliação de fornecedores

## 🛡️ Como Proteger Páginas e Componentes

### 1. Proteção de Página Completa

```tsx
import { RequireAuth } from '@/components/RequireAuth';

export default function MinhaPagina() {
  return (
    <RequireAuth 
      requiredPermission={{ 
        type: 'entity', 
        name: 'solicitacoes_compra', 
        action: 'read' 
      }}
      fallback={
        <div className="text-center p-8">
          <h2>Acesso Negado</h2>
          <p>Você não tem permissão para acessar esta página.</p>
        </div>
      }
    >
      <div>
        {/* Conteúdo da página */}
      </div>
    </RequireAuth>
  );
}
```

### 2. Proteção de Botões e Ações

#### Método 1: Usando PermissionGuard
```tsx
import { PermissionGuard } from '@/components/PermissionGuard';

<PermissionGuard 
  entity="cotacoes" 
  action="create"
  fallback={
    <Button disabled variant="outline">
      Criar Cotação (Sem Permissão)
    </Button>
  }
>
  <Button>
    <Plus className="h-4 w-4 mr-2" />
    Nova Cotação
  </Button>
</PermissionGuard>
```

#### Método 2: Usando Hook usePermissions
```tsx
import { usePermissions } from '@/hooks/usePermissions';

function MeuComponente() {
  const { canCreateEntity, canEditEntity, canDeleteEntity } = usePermissions();

  return (
    <div>
      {canCreateEntity('pedidos_compra') ? (
        <Button>Criar Pedido</Button>
      ) : (
        <Button disabled>Criar Pedido (Sem Permissão)</Button>
      )}
    </div>
  );
}
```

### 3. Proteção de Seções

```tsx
<PermissionGuard 
  entity="fornecedores" 
  action="read"
  fallback={
    <div className="text-center p-4 bg-gray-50 rounded">
      <p>Você não tem permissão para visualizar fornecedores</p>
    </div>
  }
>
  <div>
    {/* Lista de fornecedores */}
  </div>
</PermissionGuard>
```

## 🎛️ Configuração de Perfis

### Acesse o Gerenciador de Permissões

1. **Navegue para**: `/permissoes` (apenas Super Admin)
2. **Selecione o perfil** que deseja configurar
3. **Configure as permissões** para cada entidade:
   - ✅ **Ler**: Visualizar dados
   - ✅ **Criar**: Adicionar novos registros
   - ✅ **Editar**: Modificar registros existentes
   - ✅ **Excluir**: Remover registros

### Exemplo de Configuração para Auxiliar Administrativo

```typescript
// Perfil: Auxiliar Administrativo
{
  'solicitacoes_compra': ['read', 'create', 'edit', 'delete'], // ✅ Pode tudo
  'cotacoes': ['read'], // ❌ Só visualizar
  'pedidos_compra': ['read'], // ❌ Só visualizar
  'fornecedores': ['read'], // ❌ Só visualizar
}
```

### Exemplo de Configuração para Comprador

```typescript
// Perfil: Comprador
{
  'solicitacoes_compra': ['read'], // ✅ Só visualizar
  'cotacoes': ['read', 'create', 'edit', 'delete'], // ✅ Pode tudo
  'pedidos_compra': ['read', 'create', 'edit', 'delete'], // ✅ Pode tudo
  'fornecedores': ['read', 'create', 'edit', 'delete'], // ✅ Pode tudo
}
```

## 🔧 Hooks Disponíveis

### usePermissions()
```tsx
const {
  // Verificações de entidade
  canReadEntity,
  canCreateEntity,
  canEditEntity,
  canDeleteEntity,
  hasEntityPermission,
  
  // Verificações de módulo
  canReadModule,
  canCreateModule,
  canEditModule,
  canDeleteModule,
  hasModuleAccess,
  
  // Estado
  isAdmin,
  isSuperAdmin,
  loading
} = usePermissions();
```

### Exemplo de Uso
```tsx
function MeuComponente() {
  const { canCreateEntity, canEditEntity, isAdmin } = usePermissions();

  if (isAdmin) {
    return <div>Acesso total para administradores</div>;
  }

  return (
    <div>
      {canCreateEntity('solicitacoes_compra') && (
        <Button>Criar Solicitação</Button>
      )}
      {canEditEntity('cotacoes') && (
        <Button>Editar Cotação</Button>
      )}
    </div>
  );
}
```

## 📁 Estrutura de Arquivos

```
src/
├── components/
│   ├── RequireAuth.tsx          # Proteção de páginas
│   ├── PermissionGuard.tsx      # Proteção de componentes
│   └── PermissionManager.tsx    # Interface de configuração
├── hooks/
│   ├── usePermissions.ts        # Hook principal
│   └── useAuthorization.ts      # Hook de autorização
├── lib/
│   └── permissions.ts           # Configuração de permissões
└── pages/
    └── Compras/
        ├── RequisicoesCompra.tsx
        ├── Cotacoes.tsx
        └── PedidosCompra.tsx
```

## 🚀 Próximos Passos

1. **Criar perfis específicos** através da interface de permissões
2. **Configurar permissões** para cada perfil conforme necessário
3. **Aplicar proteções** nas páginas existentes
4. **Testar o sistema** com diferentes usuários

## 📞 Suporte

Para dúvidas sobre o sistema de permissões, consulte:
- Arquivo: `src/components/examples/PermissionExamples.tsx`
- Página: `/test/entity-permissions` (para testes)
- Interface: `/permissoes` (para configuração)
