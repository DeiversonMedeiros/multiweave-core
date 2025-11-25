# MIGRAÇÃO: SISTEMA DE APROVAÇÕES DO MÓDULO FINANCEIRO

## Data: 2025-11-11

## Objetivo
Migrar completamente o módulo financeiro para usar **APENAS** o sistema de aprovações unificado (`public.configuracoes_aprovacao_unificada` e `public.aprovacoes_unificada`), removendo todas as dependências do sistema antigo (`financeiro.configuracoes_aprovacao` e `financeiro.aprovacoes`).

## Mudanças Realizadas

### 1. Migração SQL (`20251111000011_migrate_financial_to_unified_approvals.sql`)

#### Removido:
- ✅ Trigger `trigger_create_contas_pagar_approvals` (sistema antigo)
- ✅ Função `financeiro.create_approvals_trigger()` (sistema antigo)
- ✅ Função `financeiro.update_approval_status()` (sistema antigo)
- ✅ Função `financeiro.get_required_approval_level()` (sistema antigo)

#### Atualizado:
- ✅ Função RPC `public.list_contas_pagar_with_approval_status()` agora usa **APENAS** `public.aprovacoes_unificada`
- ✅ Garantido que o trigger `trigger_create_approvals_contas_pagar` (sistema unificado) está ativo

#### Deprecado (mas não removido):
- ⚠️ Tabelas `financeiro.configuracoes_aprovacao` e `financeiro.aprovacoes` foram marcadas como DEPRECATED
- ⚠️ Mantidas para compatibilidade com dados históricos, mas não devem ser usadas para novos processos

### 2. Frontend

#### Atualizado:
- ✅ Hook `useContasPagar` agora usa a função RPC que retorna status de aprovação
- ✅ Componente `ContasPagarPage` exibe badge de status de aprovação
- ✅ Tipos TypeScript atualizados com campos de aprovação
- ✅ Comentários atualizados em arquivos de permissões

### 3. Sistema de Aprovações

O módulo financeiro agora usa **EXCLUSIVAMENTE**:
- **Configurações**: `public.configuracoes_aprovacao_unificada` (página `/configuracoes/aprovacoes`)
- **Aprovações**: `public.aprovacoes_unificada`
- **Processo tipo**: `'conta_pagar'`

## Fluxo de Aprovação

1. **Criação de Conta a Pagar**:
   - Trigger `trigger_create_approvals_contas_pagar` detecta nova conta
   - Chama `public.create_approvals_for_process('conta_pagar', conta_id, company_id)`
   - Função busca configurações em `public.configuracoes_aprovacao_unificada`
   - Cria aprovações em `public.aprovacoes_unificada`

2. **Visualização**:
   - Função RPC `public.list_contas_pagar_with_approval_status()` busca contas
   - Agrega status de aprovação de `public.aprovacoes_unificada`
   - Frontend exibe badge com status

3. **Aprovação**:
   - Usuário acessa Portal do Gestor → Central de Aprovações
   - Processa aprovação usando `public.process_approval()`
   - Status atualizado em `public.aprovacoes_unificada`

## Status de Aprovação Retornado

A função RPC retorna os seguintes status:
- `'sem_aprovacao'`: Não há configurações de aprovação para esta conta
- `'em_aprovacao'`: Há aprovações pendentes
- `'aprovado'`: Todas as aprovações foram concluídas
- `'rejeitado'`: Pelo menos uma aprovação foi rejeitada

## Métricas Disponíveis

- `total_aprovacoes`: Total de aprovações necessárias
- `aprovacoes_pendentes`: Quantidade pendente
- `aprovacoes_aprovadas`: Quantidade aprovada
- `aprovacoes_rejeitadas`: Quantidade rejeitada
- `nivel_atual_aprovacao`: Nível atual sendo processado
- `proximo_aprovador_id`: ID do próximo aprovador

## Próximos Passos (Opcional)

Se desejar remover completamente o sistema antigo no futuro:

1. **Migrar dados históricos** (se necessário):
   ```sql
   -- Migrar configurações
   INSERT INTO public.configuracoes_aprovacao_unificada (...)
   SELECT ... FROM financeiro.configuracoes_aprovacao;
   
   -- Migrar aprovações
   INSERT INTO public.aprovacoes_unificada (...)
   SELECT ... FROM financeiro.aprovacoes;
   ```

2. **Remover tabelas antigas** (após migração):
   ```sql
   DROP TABLE IF EXISTS financeiro.aprovacoes;
   DROP TABLE IF EXISTS financeiro.configuracoes_aprovacao;
   ```

## Notas Importantes

- ✅ O sistema antigo **NÃO** é mais usado para novos processos
- ✅ Todas as novas contas a pagar usam o sistema unificado
- ✅ O status de aprovação aparece na lista de contas a pagar
- ⚠️ Dados históricos no sistema antigo permanecem para referência
- ⚠️ Se houver aprovações pendentes no sistema antigo, elas precisarão ser migradas manualmente

