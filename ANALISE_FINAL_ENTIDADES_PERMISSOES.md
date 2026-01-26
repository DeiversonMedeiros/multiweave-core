# Análise final: referências a "entidades" no sistema de permissões

## 1. Já removido / convertido para páginas

- **RequireEntity** → substituído por **RequirePage** em todas as páginas
- **entityName=** / **entity=** em PermissionGuard e PermissionButton → **page=** com caminho (ex.: `/rh/employees*`)
- **type: 'entity'** em RequireAuth → **type: 'page'** com **name** = caminho
- **canReadEntity, canCreateEntity, canEditEntity, canDeleteEntity, hasEntityPermission** → **can*Page** / **hasPagePermission**
- **checkEntityPermission** em useAuthorization → removido; hooks usam **usePermissions** e **can*Page**
- **entity_permissions** no useAuthorization → carregamento removido; uso de **page_permissions** via `get_user_page_permissions_simple`
- **sync-permissions**: sync de **entity_permissions** e **PERMISSION_MANAGER_ENTITIES** removidos
- **MultiTenancyGuide**: **entity_permissions** → **page_permissions** na lista de tabelas globais

---

## 2. Ainda presente (relacionado a permissões por entidade)

### 2.1. `src/test/test-permissions.ts`

- Testa a RPC **check_entity_permission** (sistema antigo).
- **Ação:** atualizar para testar **check_page_permission** (ex.: `/cadastros/usuarios*`, `read`).

### 2.2. `src/hooks/usePermissionCheck.ts`

- **ENTITY_TO_PAGE:** mapa entidade → página (compatibilidade).
- **entity** nas options e **useEntityAccess(entityName, action):** ainda permitem passar entidade; internamente convertem para página via **ENTITY_TO_PAGE**.
- **useEntityAccess** já marcado como `@deprecated`.
- **Ação:** manter por compatibilidade ou remover **useEntityAccess** e suporte a **entity** se não houver uso.

### 2.3. `src/lib/permissions.ts`

- **PERMISSION_CONFIG.ENTITIES** e **ENTITY_ACTIONS:** config estática de “entidades” e ações.
- **isEntityAvailable(entityName), getEntityInfo(entityName), getAllEntities():** helpers sobre **ENTITIES**.
- Nenhum outro arquivo importa **isEntityAvailable**, **getEntityInfo** ou **getAllEntities**.
- **sync-permissions** importa **PERMISSION_CONFIG** mas não usa (usa **PERMISSION_MANAGER_MODULES**).
- **Ação:** remover import não usado de **PERMISSION_CONFIG** em sync-permissions. Manter **ENTITIES** / **ENTITY_ACTIONS** e os helpers por enquanto se forem úteis para documentação ou ferramentas; caso contrário, deprecar ou remover em etapa futura.

---

## 3. Não é “entidade de permissão” (manter como está)

### 3.1. EntityService e useEntityData

- **EntityService**, **useCreateEntity**, **useUpdateEntity**, **useDeleteEntity**, **useRHData**, **useFinanceiroData**, etc.
- “Entity” = **entidade de dados** (tabela/modelo). Camada genérica de CRUD.
- **Não** faz parte do sistema de permissões por entidade que foi migrado para páginas.

### 3.2. GranularPermissionsManager e `entity_ownership_config`

- Usa a tabela **entity_ownership_config** (**entity_name**, **schema_name**, **table_name**, etc.).
- “Entity” = **tabela do banco** para configurar ownership / centro de custo.
- **Não** é a antiga **entity_permissions**; é outro recurso (config por tabela).

### 3.3. PermissionExamples e TestEntityPermissions

- **entidades** / **ENTITY_PAGINA**: nomes de variáveis e mapeamento para **páginas**.
- **TestEntityPermissions**: nome da página e `result.entity` (label legado); lógica já usa **can*Page** / **hasPagePermission**.
- Podem ser renomeados depois (ex.: “TestPagePermissions”) por clareza, mas não são parte do modelo de permissões por entidade.

---

## 4. Resumo de ações recomendadas

| Item | Ação |
|------|------|
| **test-permissions.ts** | Trocar teste de `check_entity_permission` por `check_page_permission` |
| **sync-permissions** | Remover import não usado de **PERMISSION_CONFIG** |
| **usePermissionCheck** | Manter **ENTITY_TO_PAGE** e **useEntityAccess** como deprecated ou removê-los se não houver uso |
| **lib/permissions** | Manter **ENTITIES** / **ENTITY_ACTIONS** e helpers por enquanto; remover uso não referenciado |
| **EntityService / useEntityData** | Não alterar (camada de dados) |
| **GranularPermissionsManager** | Não alterar (config de ownership por tabela) |

---

## 5. Conclusão

O sistema de **permissões por entidade** foi efetivamente migrado para **permissões por página**. O que ainda referencia “entidade” no código se divide em:

1. **Poucos resquícios de permissão** (test-permissions, usePermissionCheck, lib/permissions), tratáveis com os ajustes acima.
2. **Uso de “entity” em outros contextos** (dados, ownership por tabela, nomes de variáveis), que não fazem parte do modelo antigo de permissões e devem permanecer.

Com as alterações recomendadas, não restará uso ativo do modelo antigo de permissões por entidade no fluxo principal da aplicação.
