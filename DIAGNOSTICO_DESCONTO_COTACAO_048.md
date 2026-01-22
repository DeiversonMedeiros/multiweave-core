# Diagnóstico: Desconto não aparece na Cotação COT-000048

## Análise dos Logs do Console

Pelos logs do console, identifiquei que:

### Dados no Banco de Dados

Os fornecedores estão sendo carregados com:
```json
{
  "desconto_valor": 0,
  "desconto_percentual": 0
}
```

Isso significa que **o desconto não está sendo salvo no banco de dados** quando o usuário preenche no modal.

### Fluxo de Salvamento

O desconto pode ser aplicado em 3 lugares:

1. **Desconto Geral** (no ciclo da cotação)
   - Campos: `formData.desconto_percentual` e `formData.desconto_valor`
   - Tabela: `compras.cotacao_ciclos`
   - ✅ Está sendo salvo corretamente

2. **Desconto por Fornecedor**
   - Campos: `fornecedor.desconto_percentual` e `fornecedor.desconto_valor`
   - Tabela: `compras.cotacao_fornecedores`
   - ❌ **NÃO está sendo salvo** (valores zerados no banco)

3. **Desconto por Item**
   - Campos: `mapaFornecedorItens[fornecedorId][itemKey].desconto_percentual` e `desconto_valor`
   - Tabela: `compras.cotacao_item_fornecedor`
   - ⚠️ Precisa verificar

## Correções Implementadas

### 1. Logs de Debug Adicionados

Adicionados logs detalhados em:
- `ModalGerarCotacao.tsx`: Quando o desconto é atualizado no estado (linhas 4343-4350 e 4364-4371)
- `ModalGerarCotacao.tsx`: Quando o desconto é salvo (linhas 1902-1925 e 2413-2443)
- `purchaseService.ts`: Quando o desconto é criado/atualizado (linhas 1160-1183 e 1191-1224)
- `CotacaoDetails.tsx`: Quando o desconto é carregado e exibido (linhas 163-219 e 778-790)

### 2. Melhorias na Exibição

- Adicionado debug visual quando o desconto deveria existir mas está zero
- Melhorada a exibição para sempre mostrar detalhes do desconto

## Próximos Passos para Diagnóstico

1. **Testar preenchendo o desconto no fornecedor:**
   - Abrir o modal "Gerar Cotação" para a cotação COT-000048
   - Preencher o desconto percentual ou valor em um fornecedor
   - Verificar no console se aparece o log: `[ModalGerarCotacao] Atualizando desconto_percentual/desconto_valor`

2. **Testar salvando a cotação:**
   - Clicar em "Salvar Rascunho" ou "Enviar para Aprovação"
   - Verificar no console se aparece o log: `[handleSalvarRascunho]` ou `[handleEnviarAprovacao]` com os valores de desconto
   - Verificar se aparece o log: `[purchaseService.startQuoteCycle]` com os valores de desconto

3. **Verificar se o desconto está sendo salvo:**
   - Após salvar, verificar no banco de dados se os valores de desconto foram salvos
   - Verificar no console se aparece o log: `[CotacaoDetails]` com os valores de desconto carregados

## Possíveis Causas

1. **Desconto não está sendo preenchido no estado:**
   - Verificar se o campo está sendo atualizado corretamente quando o usuário digita

2. **Desconto está sendo zerado antes de salvar:**
   - Verificar se há alguma lógica que zera o desconto antes de salvar

3. **Desconto está sendo salvo mas está sendo sobrescrito:**
   - Verificar se há múltiplas atualizações que estão zerando o desconto

4. **Problema na ordem das operações:**
   - Verificar se o desconto está sendo salvo antes ou depois de outras operações que podem zerá-lo

## Como Testar

1. Abrir a cotação COT-000048 no modal "Gerar Cotação"
2. Preencher o desconto percentual ou valor em um fornecedor
3. Verificar no console se aparece o log de atualização
4. Salvar a cotação
5. Verificar no console se aparece o log de salvamento
6. Abrir o modal de aprovação
7. Verificar se o desconto aparece na tabela "Fornecedores Vencedores"
