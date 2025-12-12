# Correção do Fluxo de Aprovação de Requisições

## Problemas Identificados

1. **Status não atualiza após aprovação**: Requisições com todas aprovações concluídas não mudavam o status para 'aprovada'
2. **Lógica de verificação incorreta**: A função `process_approval` apenas verificava se não havia pendentes, mas não garantia que todas fossem aprovadas
3. **Status complexo**: Múltiplos status quando apenas dois são necessários: 'pendente_aprovacao' e 'aprovada'

## Correções Implementadas

### 1. Migration: `20250117000002_fix_requisicao_approval_status.sql`

#### Função `process_approval` Corrigida
- **Antes**: Verificava apenas se não havia aprovações pendentes
- **Agora**: Verifica se TODAS as aprovações foram aprovadas (contagem exata)
- **Lógica**: 
  ```sql
  all_approved := (approved_count = total_approvals) AND (approved_count > 0)
  ```

#### Status Simplificado
- **Apenas dois status**:
  - `pendente_aprovacao`: Enquanto aguarda aprovação
  - `aprovada`: Após todas aprovações serem concluídas

#### Após Aprovação
- Status muda para `aprovada`
- `workflow_state` muda para `em_cotacao`
- Requisição fica disponível para criação de cotações

### 2. Trigger de Garantia de Status
- Trigger `trigger_ensure_requisicao_status` garante que requisições com `workflow_state = 'pendente_aprovacao'` tenham `status = 'pendente_aprovacao'`

### 3. Atualização de Requisições Existentes
- Script atualiza requisições que foram aprovadas mas não tiveram status atualizado
- Corrige requisições em 'rascunho' que deveriam estar em 'pendente_aprovacao'

### 4. Frontend Atualizado
- Prioriza campo `status` sobre `workflow_state` para exibição
- Trata 'rascunho' como 'pendente_aprovacao' na exibição

## Como Usar

### Para Diagnosticar Problemas

Execute o script `diagnosticar_e_corrigir_aprovacoes.sql`:

```sql
-- Ver todas requisições com aprovações
SELECT ... FROM compras.requisicoes_compra ...

-- Corrigir requisições que foram aprovadas mas não atualizadas
UPDATE compras.requisicoes_compra ...
```

### Para Testar Manualmente

1. Crie uma requisição de compra
2. Verifique se aprovações foram criadas automaticamente
3. Aprove todas as aprovações no `/portal-gestor/aprovacoes_unificada`
4. Verifique se o status mudou para 'aprovada' e workflow_state para 'em_cotacao'

### Para Corrigir Requisições Existentes

Execute a migration `20250117000002_fix_requisicao_approval_status.sql` que:
- Atualiza requisições em 'rascunho' para 'pendente_aprovacao'
- Atualiza requisições aprovadas para 'aprovada' e workflow_state para 'em_cotacao'

## Fluxo Final

1. **Criação da Requisição**
   - Status: `pendente_aprovacao` (ou `rascunho` que será corrigido pelo trigger)
   - Workflow State: `pendente_aprovacao`
   - Aprovações criadas automaticamente

2. **Durante Aprovação**
   - Status permanece: `pendente_aprovacao`
   - Aprovações individuais são processadas

3. **Após Todas Aprovações**
   - Status muda para: `aprovada`
   - Workflow State muda para: `em_cotacao`
   - Requisição disponível para criação de cotações

4. **Após Criação de Cotações**
   - Cotações são criadas manualmente pelo comprador
   - Após aprovação da cotação, pedido é criado automaticamente

## Arquivos Modificados

1. `supabase/migrations/20250117000002_fix_requisicao_approval_status.sql` - Correção principal
2. `src/pages/Compras/RequisicoesCompra.tsx` - Atualização do frontend
3. `diagnosticar_e_corrigir_aprovacoes.sql` - Script de diagnóstico

## Próximos Passos

1. Execute a migration no banco de dados
2. Execute o script de diagnóstico para verificar requisições existentes
3. Teste o fluxo completo criando uma nova requisição
4. Verifique se requisições aprovadas aparecem corretamente na lista



