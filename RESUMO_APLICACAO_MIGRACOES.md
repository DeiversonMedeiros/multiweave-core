# Resumo da Aplicação de Migrações - Fluxo de Compras

## ✅ Migrações Aplicadas com Sucesso

### 1. Status 'em_pedido' em cotacao_ciclos
**Status**: ✅ **APLICADO**

- ✅ Constraint `cotacao_ciclos_status_check` atualizado
- ✅ Agora permite os status: `'aberta','completa','em_aprovacao','aprovada','reprovada','em_pedido'`

**Comando aplicado**:
```sql
ALTER TABLE compras.cotacao_ciclos
DROP CONSTRAINT IF EXISTS cotacao_ciclos_status_check;

ALTER TABLE compras.cotacao_ciclos
ADD CONSTRAINT cotacao_ciclos_status_check 
CHECK (status = ANY(ARRAY['aberta','completa','em_aprovacao','aprovada','reprovada','em_pedido']));
```

### 2. Campo classe_financeira_id em materiais_equipamentos
**Status**: ✅ **APLICADO**

- ✅ Campo `classe_financeira_id` adicionado à tabela `almoxarifado.materiais_equipamentos`
- ✅ Referência à tabela `financeiro.classes_financeiras`
- ✅ Índice `idx_materiais_equipamentos_classe_financeira_id` criado

**Comando aplicado**:
```sql
ALTER TABLE almoxarifado.materiais_equipamentos 
ADD COLUMN IF NOT EXISTS classe_financeira_id UUID 
REFERENCES financeiro.classes_financeiras(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_materiais_equipamentos_classe_financeira_id 
ON almoxarifado.materiais_equipamentos(classe_financeira_id);
```

### 3. Função criar_conta_pagar atualizada
**Status**: ✅ **APLICADO**

- ✅ Função `compras.criar_conta_pagar` atualizada
- ✅ Agora busca a classe financeira dos materiais do pedido
- ✅ Inclui o nome da classe financeira no campo `classe_financeira` da conta a pagar

**Lógica implementada**:
- Busca os itens do pedido (`pedido_itens`)
- Para cada item, busca o material e sua `classe_financeira_id`
- Busca o nome da classe financeira em `financeiro.classes_financeiras`
- Seleciona a primeira classe financeira encontrada (se houver múltiplas)
- Inclui o nome da classe financeira na conta a pagar gerada

### 4. Função criar_pedido_apos_aprovacao_cotacao_ciclos atualizada
**Status**: ✅ **APLICADO**

- ✅ Função atualizada para mudar status da cotação para `em_pedido` após criar pedidos
- ✅ Mantém a atualização do status da requisição para `em_pedido`

**Lógica implementada**:
- Após criar todos os pedidos, atualiza o status da cotação:
  ```sql
  UPDATE compras.cotacao_ciclos
  SET 
      status = 'em_pedido',
      workflow_state = 'em_pedido',
      updated_at = NOW()
  WHERE id = NEW.id;
  ```

## 📋 Verificações Realizadas

### ✅ Constraint de Status
- Constraint `cotacao_ciclos_status_check` existe e permite `em_pedido`

### ✅ Campo classe_financeira_id
- Campo `classe_financeira_id` existe na tabela `materiais_equipamentos`
- Índice criado com sucesso

### ✅ Função criar_conta_pagar
- Função existe e foi atualizada com sucesso
- Inclui busca de classe financeira dos materiais

### ✅ Função criar_pedido_apos_aprovacao_cotacao_ciclos
- Função existe e foi atualizada com sucesso
- Atualiza status da cotação para `em_pedido`

## 🎯 Fluxo Completo Atualizado

1. ✅ **Requisição criada** → Status: `rascunho` ou `pendente_aprovacao`
2. ✅ **Requisição aprovada** → Status: `aprovada`, `workflow_state = 'em_cotacao'`
3. ✅ **Requisições disponíveis** → Exibidas com status "A COTAR"
4. ✅ **Cotação criada** → Status: `em_aprovacao`, "Aguardando Aprovação"
5. ✅ **Cotação aprovada** → Status: `aprovada`
6. ✅ **Pedidos gerados** → Um pedido para cada fornecedor aprovado
7. ✅ **Contas a pagar geradas** → Uma conta para cada pedido, **com classe financeira do material**
8. ✅ **Status da cotação** → Muda para `em_pedido`, exibido como "Em Pedido"
9. ✅ **Contas a pagar** → Exibidas com badge "Sem nota" quando `numero_nota_fiscal IS NULL`

## 📝 Arquivos Modificados no Código

1. ✅ `src/components/Compras/CotacoesRealizadas.tsx` - Badge "Em Pedido"
2. ✅ `src/components/financial/ContasPagarPage.tsx` - Badge "Sem nota"
3. ✅ `compras_integrations.sql` - Função atualizada
4. ✅ `supabase/migrations/20251212000008_fix_criar_pedido_cotacao_ciclos.sql` - Trigger atualizado

## 🚀 Próximos Passos

1. ✅ Todas as migrações foram aplicadas
2. ⚠️ **Testar o fluxo completo**:
   - Criar requisição com materiais que tenham classe financeira
   - Aprovar requisição
   - Gerar cotação
   - Aprovar cotação
   - Verificar se pedidos foram criados
   - Verificar se contas a pagar foram criadas com classe financeira
   - Verificar se cotação mudou para "Em Pedido"
   - Verificar se contas a pagar exibem badge "Sem nota"

## ✅ Status Final

**Todas as migrações foram aplicadas com sucesso!**

O sistema está pronto para:
- Exibir status "Em Pedido" nas cotações aprovadas
- Exibir badge "Sem nota" nas contas a pagar sem número de nota fiscal
- Incluir classe financeira do material nas contas a pagar geradas automaticamente

