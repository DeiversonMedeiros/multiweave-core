# Atualização: Classe Financeira em Contas a Pagar de Compras

## 📋 Resumo da Alteração

A função `compras.criar_conta_pagar` foi atualizada para incluir automaticamente a **classe financeira** dos materiais do pedido na conta a pagar gerada.

## ✅ Implementação

### 1. Campo Adicionado aos Materiais

**Arquivo**: `supabase/migrations/20260106000001_add_classe_financeira_id_to_materiais_equipamentos.sql`

- ✅ Campo `classe_financeira_id` adicionado à tabela `almoxarifado.materiais_equipamentos`
- ✅ Referência à tabela `financeiro.classes_financeiras`
- ✅ Índice criado para melhorar performance

### 2. Função Atualizada

**Arquivo**: `supabase/migrations/20260106000002_update_criar_conta_pagar_with_classe_financeira.sql`

A função `compras.criar_conta_pagar` agora:

1. **Busca os itens do pedido** (`compras.pedido_itens`)
2. **Para cada item, busca o material** (`almoxarifado.materiais_equipamentos`)
3. **Busca a classe financeira** do material (`financeiro.classes_financeiras`)
4. **Seleciona a classe financeira**:
   - Se todos os materiais tiverem a mesma classe financeira, usa essa classe
   - Se houver classes diferentes, usa a classe do primeiro material encontrado
   - Prioriza materiais com classe financeira definida e ativa
5. **Inclui o nome da classe financeira** no campo `classe_financeira` da conta a pagar

### 3. Lógica de Seleção da Classe Financeira

```sql
-- Busca a primeira classe financeira encontrada nos materiais do pedido
SELECT DISTINCT ON (me.classe_financeira_id)
    cf.nome,
    me.classe_financeira_id
INTO v_classe_financeira_nome, v_classe_financeira_id
FROM compras.pedido_itens pi
JOIN almoxarifado.materiais_equipamentos me ON me.id = pi.material_id
LEFT JOIN financeiro.classes_financeiras cf ON cf.id = me.classe_financeira_id
WHERE pi.pedido_id = p_pedido_id
AND me.classe_financeira_id IS NOT NULL
AND cf.is_active = true
ORDER BY me.classe_financeira_id, pi.id
LIMIT 1;
```

**Comportamento**:
- Se nenhum material tiver classe financeira definida, o campo `classe_financeira` será `NULL`
- Se houver múltiplas classes financeiras, usa a primeira encontrada (ordenada por `classe_financeira_id`)
- Apenas classes financeiras ativas são consideradas

## 🔄 Fluxo Atualizado

### Antes
1. Pedido aprovado → Gera conta a pagar
2. Conta a pagar criada **sem** classe financeira

### Depois
1. Pedido aprovado → Gera conta a pagar
2. Sistema busca classe financeira dos materiais do pedido
3. Conta a pagar criada **com** classe financeira do material

## 📝 Exemplo de Uso

**Cenário**: Pedido de compra com 3 itens:
- Item 1: Material A (Classe Financeira: "Equipamentos")
- Item 2: Material B (Classe Financeira: "Equipamentos")
- Item 3: Material C (Classe Financeira: "Materiais de Consumo")

**Resultado**: Conta a pagar criada com `classe_financeira = "Equipamentos"` (primeira classe encontrada)

## ⚠️ Observações Importantes

1. **Múltiplas Classes Financeiras**: Se um pedido tiver materiais com classes financeiras diferentes, a função usa a primeira encontrada. Para garantir que todas as classes sejam consideradas, seria necessário criar contas a pagar separadas por classe financeira (não implementado).

2. **Materiais sem Classe Financeira**: Se nenhum material do pedido tiver classe financeira definida, a conta a pagar será criada sem classe financeira (`classe_financeira = NULL`).

3. **Classes Financeiras Inativas**: Apenas classes financeiras ativas (`is_active = true`) são consideradas.

## 🚀 Próximos Passos

1. Executar a migração `20260106000002_update_criar_conta_pagar_with_classe_financeira.sql` no banco de dados
2. Testar o fluxo completo:
   - Criar pedido com materiais que tenham classe financeira
   - Aprovar pedido
   - Verificar se a conta a pagar foi criada com a classe financeira correta

## 📁 Arquivos Modificados

1. `compras_integrations.sql` - Função atualizada
2. `supabase/migrations/20260106000002_update_criar_conta_pagar_with_classe_financeira.sql` - Nova migração

