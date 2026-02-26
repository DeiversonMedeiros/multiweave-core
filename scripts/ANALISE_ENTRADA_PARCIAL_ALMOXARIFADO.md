# Análise: Entrada parcial por item no almoxarifado

## Cenário

Pré-entrada com 20 itens; 5 chegaram hoje, 7 amanhã, 8 daqui a 5 dias. O usuário precisa confirmar apenas os 5 itens que chegaram, sem ser obrigado a confirmar todos de uma vez.

## Suporte no banco (schema almoxarifado)

Consultando as migrações e o código, o banco **já suporta** confirmação por item:

### Tabela `almoxarifado.entrada_itens`

| Coluna | Uso |
|--------|-----|
| `quantidade_recebida` | Quantidade total do pedido/nota para aquele item. |
| `quantidade_aprovada` | Quantidade aprovada para ir ao estoque (pode ser ≤ recebida). |
| `entrada_estoque_em` | Quando preenchido, o item **já foi** lançado no estoque; o sistema trata o item como “entrada concluída” e o deixa read-only. |
| `em_quarentena` | Item não vai ao estoque até ser liberado. |

- Cada **linha** em `entrada_itens` é um item; o controle é **por item**.
- Itens **sem** `entrada_estoque_em` podem ser confirmados em outra abertura do modal (próxima entrega).
- Itens **com** `entrada_estoque_em` não recebem nova movimentação de entrada (evita duplicar no estoque).

Conclusão: **não é necessária nova migração** para “confirmar só alguns itens”. Basta que a confirmação (e o lançamento em estoque) seja feita apenas para os itens que o usuário escolher.

### Limitação atual na UI

- Existe um único botão **“Confirmar”** que processa **todos** os itens da pré-entrada.
- Não há como marcar “incluir só estes itens nesta confirmação”.
- Na lógica atual, `qtdAprovada` usa `quantidade_aprovada ?? quantidade_recebida`, então tudo é tratado como “aprovado” na primeira confirmação.

## Solução implementada (entrada parcial por item)

1. **Checkbox “Incluir na entrada agora”** por item (apenas para itens que ainda **não** têm `entrada_estoque_em`).
2. Ao abrir o modal para confirmar, todos os itens ainda pendentes vêm **marcados** por padrão (comportamento atual: um clique em “Confirmar” continua confirmando todos).
3. O usuário **desmarca** os itens que **não** chegaram nesta remessa.
4. Ao clicar em **Confirmar**:
   - Itens **marcados**: atualização normal (quantidade aprovada, `entrada_estoque_em`, lançamento em `estoque_atual` e `movimentacoes_estoque`).
   - Itens **desmarcados**: apenas atualização dos dados do item (ex.: `quantidade_aprovada = 0`), **sem** preencher `entrada_estoque_em` e **sem** lançar no estoque. Na próxima abertura do modal, eles continuam disponíveis para uma nova confirmação parcial.

Assim, o sistema passa a permitir entradas parciais (5 hoje, 7 amanhã, 8 depois) usando apenas a tabela atual, sem alteração de banco.

## Evolução futura (quantidade parcial por item)

Se no futuro for necessário **parcial por quantidade** (ex.: mesmo item, 100 pedidos, 30 chegaram hoje, 70 depois), será preciso:

1. Coluna em `entrada_itens`: **`quantidade_ja_lancada`** (INTEGER, default 0) = quantidade já lançada no estoque para aquele item.
2. Na confirmação: lançar no estoque apenas `(quantidade_aprovada - quantidade_ja_lancada)` e atualizar `quantidade_ja_lancada = quantidade_aprovada`.
3. UI: campo editável “Quantidade aprovada nesta etapa” (ou “Quantidade a confirmar agora”), limitado a `quantidade_recebida - quantidade_ja_lancada`.
4. Item considerado “concluído” quando `quantidade_ja_lancada >= quantidade_recebida` (e aí pode ficar read-only).

Isso exigiria uma migração nova e ajuste na regra de negócio; a solução atual cobre o caso “confirmar apenas alguns **itens** (linhas) desta vez”.
