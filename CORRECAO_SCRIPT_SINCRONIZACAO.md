# Correção do Script de Sincronização

## 🔍 Problema Identificado

O script de verificação de inconsistências estava comparando listas diferentes:

1. **Módulos**: Comparava `PERMISSION_CONFIG.MODULE_TO_MENU` (nomes em inglês: `users`, `companies`) com módulos no banco (nomes em português: `usuarios`, `empresas`)
2. **Entidades**: Comparava `PERMISSION_CONFIG.ENTITY_ACTIONS` (lista limitada) com todas as entidades no banco

Isso causava falsos positivos:
- Módulos no banco apareciam como "não encontrados no código" (ex: `empresas`, `usuarios`)
- Entidades no banco apareciam como "não encontradas no código" (ex: `employees`, `time_records`)
- As 8 entidades dos portais apareciam como "não encontradas no banco" (mas elas existem para o perfil Gestor)

## ✅ Solução Implementada

### 1. Criadas listas de referência corretas

Adicionadas constantes no início do arquivo `sync-permissions.ts`:

- `PERMISSION_MANAGER_MODULES`: Lista de módulos do PermissionManager (nomes em português como no banco)
- `PERMISSION_MANAGER_ENTITIES`: Lista completa de entidades do PermissionManager (incluindo as 8 dos portais)

### 2. Atualizadas funções para usar as listas corretas

- `syncModulePermissions()`: Agora usa `PERMISSION_MANAGER_MODULES`
- `syncEntityPermissions()`: Agora usa `PERMISSION_MANAGER_ENTITIES`
- `checkPermissionInconsistencies()`: Agora usa ambas as listas corretas

### 3. Verificação melhorada

O script agora:
- Compara nomes em português com nomes em português
- Usa a lista completa de entidades (incluindo as 8 dos portais)
- Verifica todos os perfis ativos
- Retorna resultados para exibição na interface

## 📊 Resultado Esperado

Agora, ao clicar em "Verificar Inconsistências":
- ✅ Não deve mais mostrar módulos como `empresas`, `usuarios` como "não encontrados" (eles estão na lista)
- ✅ Não deve mais mostrar entidades como `employees`, `time_records` como "não encontradas" (elas estão na lista)
- ✅ As 8 entidades dos portais não devem mais aparecer como "não encontradas no banco" (elas existem)
- ✅ Apenas entidades realmente faltantes serão reportadas

## 🔧 Arquivos Modificados

1. `src/scripts/sync-permissions.ts`
   - Adicionadas constantes `PERMISSION_MANAGER_MODULES` e `PERMISSION_MANAGER_ENTITIES`
   - Atualizadas funções para usar as listas corretas
   - Removida duplicata de `portal_colaborador` na lista de entidades

## 📝 Nota sobre Migrações

**Não foram aplicadas migrações** porque:
- As 8 entidades já existem no banco para o perfil Gestor (verificado via query SQL)
- O problema era apenas na lógica de comparação do script
- A correção foi apenas no código TypeScript, não requer migração SQL

## ✅ Próximos Passos

1. Testar o botão "Verificar Inconsistências" novamente
2. Verificar se os falsos positivos foram eliminados
3. Se ainda houver inconsistências reais, elas serão reportadas corretamente

