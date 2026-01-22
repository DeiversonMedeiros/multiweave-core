# 📋 Instruções para Análise de Permissões - Perfil "Gestor Qualidade"

## 🔍 Objetivo
Analisar as permissões do perfil "Gestor Qualidade" no banco de dados para identificar inconsistências.

## 📝 Passo a Passo

### 1. Acessar o Supabase Dashboard
1. Acesse: https://supabase.com/dashboard
2. Entre no projeto correspondente
3. Vá em **SQL Editor** (menu lateral)

### 2. Executar o Script de Análise
1. Copie o conteúdo do arquivo `analise_perfil_gestor_qualidade.sql`
2. Cole no SQL Editor do Supabase
3. Clique em **Run** ou pressione `Ctrl+Enter`

### 3. Analisar os Resultados

O script retornará:

#### **Query 1**: Perfil encontrado
- ID do perfil
- Nome completo
- Status (ativo/inativo)

#### **Query 2**: Permissões de Módulos
- Verifica quais módulos o perfil tem acesso
- **CRÍTICO**: Verificar se tem permissão no módulo `rh`

#### **Query 3**: Permissões de Entidades
- Lista TODAS as entidades que o perfil tem acesso
- **CRÍTICO**: Verificar se tem permissão apenas em `treinamentos`

#### **Query 4**: Entidades de Treinamento
- Lista especificamente entidades relacionadas a treinamento
- **CRÍTICO**: Verificar se existe `treinamentos` (português) ou `trainings` (inglês)

#### **Query 5**: Todas as entidades "treinamento" no banco
- Mostra todas as variações do nome no banco
- Identifica inconsistências de nomenclatura

#### **Query 6**: Entidades comuns do RH
- Compara com outras entidades do módulo RH
- Ajuda a identificar se falta alguma entidade

#### **Query 7**: Usuários vinculados
- Lista usuários que usam este perfil
- Permite testar as permissões com usuários reais

#### **Query 8**: Permissão no módulo RH
- Verifica especificamente se tem acesso ao módulo `rh`
- **PROBLEMA**: Se tiver acesso ao módulo RH mas não às entidades específicas, pode ver todas as páginas

#### **Query 9**: Resumo
- Estatísticas gerais das permissões
- Facilita identificar desbalanceamento

## 🚨 Problemas Esperados

### Problema 1: Módulo RH sem restrição de entidade
```
Se o perfil tem:
- ✅ can_read = true no módulo 'rh'
- ❌ Mas NÃO tem permissão nas entidades específicas (employees, positions, etc.)

RESULTADO: O usuário pode ver TODAS as páginas do módulo RH
```

### Problema 2: Nome de entidade inconsistente
```
Se no banco existe:
- 'trainings' (inglês) 
- Mas o código procura por 'treinamentos' (português)

RESULTADO: A verificação de permissão falha
```

### Problema 3: Múltiplas permissões de entidade
```
Se o perfil tem permissão em:
- 'treinamentos'
- 'trainings'  
- 'training'

RESULTADO: Inconsistência na verificação
```

## 🔧 Soluções

### Solução 1: Remover permissão de módulo, manter apenas de entidade
```sql
-- Remover permissão do módulo RH
DELETE FROM module_permissions 
WHERE profile_id = '<PROFILE_ID>' 
  AND module_name = 'rh';

-- Garantir que só tem permissão na entidade treinamentos
UPDATE entity_permissions
SET can_read = true, can_create = false, can_edit = false, can_delete = false
WHERE profile_id = '<PROFILE_ID>' 
  AND entity_name = 'treinamentos';
```

### Solução 2: Padronizar nome da entidade
```sql
-- Renomear todas as ocorrências de 'trainings' para 'treinamentos'
UPDATE entity_permissions
SET entity_name = 'treinamentos'
WHERE entity_name IN ('trainings', 'training')
  AND profile_id = '<PROFILE_ID>';
```

### Solução 3: Verificar RequireEntity nas páginas
Certificar que as páginas do RH usam `RequireEntity` e não apenas `RequireModule`.

## 📊 Checklist de Verificação

- [ ] Perfil "Gestor Qualidade" encontrado no banco
- [ ] Permissão no módulo `rh`: `can_read = true`?
- [ ] Permissão na entidade `treinamentos`: `can_read = true`?
- [ ] Nome da entidade está em português (`treinamentos`)?
- [ ] Não há outras entidades do RH com permissão?
- [ ] Usuários estão vinculados corretamente ao perfil?

## 🎯 Resultado Esperado

Após as correções, o perfil "Gestor Qualidade" deve:
- ✅ Ter acesso apenas à página de treinamentos
- ✅ NÃO ter acesso a outras páginas do módulo RH
- ✅ Usar o nome de entidade `treinamentos` (português)
