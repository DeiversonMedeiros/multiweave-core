# Relatório de Análise - Cotação COT-000048

## Resumo Executivo

Análise completa dos dados de frete e desconto na cotação COT-000048 para identificar por que o desconto não aparece na seção "Fornecedores Vencedores" do modal "Processar Aprovação".

## Dados Encontrados no Banco de Dados

### 1. Dados do Ciclo de Cotação (GERAL)
- **ID:** 04e99773-d797-44a8-861b-a52ffb8d0aff
- **Número:** COT-000048
- **Status:** em_aprovacao
- **Frete Geral:** R$ 0,00 ❌
- **Desconto Percentual Geral:** 0,0000% ❌
- **Desconto Valor Geral:** R$ 0,00 ❌

### 2. Fornecedores Vencedores (POR FORNECEDOR)

#### Fornecedor 1: Teste Parceiro
- **ID:** 69a07686-d27d-46bf-b567-ab8101440d5d
- **Status:** pendente
- **Valor Frete:** R$ 0,00 ❌
- **Valor Imposto:** R$ 0,00
- **Desconto Percentual:** 0,0000% ❌
- **Desconto Valor:** R$ 0,00 ❌

#### Fornecedor 2: teste
- **ID:** 45dd5748-9036-455f-b4b6-9ed318c8f67b
- **Status:** pendente
- **Valor Frete:** R$ 0,00 ❌
- **Valor Imposto:** R$ 0,00
- **Desconto Percentual:** 0,0000% ❌
- **Desconto Valor:** R$ 0,00 ❌

### 3. Itens Vencedores (POR ITEM)

#### Item 1: THINNER 900ML (Fornecedor: Teste Parceiro)
- **ID:** 69d33ba6-3bda-4de5-b153-b6a3aa15120a
- **Frete Item:** R$ 5,00 ✅ **APARECEU CORRETAMENTE**
- **Desconto Percentual:** 0,0000%
- **Desconto Valor:** R$ 0,00

#### Item 2: TALHADEIRA ACO CHATA 12'' (Fornecedor: teste)
- **ID:** 448d9e3a-5c7c-441c-9ad4-6318391f10d9
- **Frete Item:** R$ 0,00
- **Desconto Percentual:** 10,0000% ✅ **ESTÁ SALVO NO BANCO**
- **Desconto Valor:** R$ 0,00

## Problema Identificado

### ✅ O que está funcionando:
1. **Frete dos itens** está sendo salvo e exibido corretamente (R$ 5,00 apareceu)
2. **Desconto dos itens** está sendo salvo no banco (10% no item "TALHADEIRA")

### ❌ O que NÃO está funcionando:
1. **Desconto dos itens** não está sendo **exibido** na tabela "Fornecedores Vencedores"
2. O componente `CotacaoDetails.tsx` estava calculando o desconto apenas do **fornecedor**, ignorando o desconto dos **itens**

## Correção Implementada

### 1. Adicionado suporte para desconto dos itens

**Arquivo:** `src/components/approvals/CotacaoDetails.tsx`

**Mudanças:**
- ✅ Adicionados campos `desconto_percentual` e `desconto_valor` na interface `CotacaoItemFornecedor`
- ✅ Adicionada conversão dos descontos dos itens ao carregar do banco
- ✅ Corrigido cálculo do desconto total para incluir: **desconto do fornecedor + desconto dos itens**
- ✅ Melhorada a exibição para mostrar separadamente: "Fornecedor" e "Itens"

### 2. Cálculo do Desconto Total

**Antes:**
```typescript
const desconto = descontoPercentual + descontoValorFornecedor;
```

**Depois:**
```typescript
// Desconto do fornecedor
const descontoFornecedor = descontoPercentualFornecedor + descontoValorFornecedor;

// Desconto dos itens vencedores
const descontoItensVencedores = itensVencedores.reduce((sum, item) => {
  const valorItem = item.valor_total || 0;
  const descontoPctItem = item.desconto_percentual || 0;
  const descontoValorItem = item.desconto_valor || 0;
  const descontoPctCalculado = valorItem * (descontoPctItem / 100);
  return sum + descontoPctCalculado + descontoValorItem;
}, 0);

// Total = desconto do fornecedor + desconto dos itens
const desconto = descontoFornecedor + descontoItensVencedores;
```

### 3. Exibição Melhorada

Agora mostra:
- **Desconto do Fornecedor:** Se houver desconto percentual ou valor no fornecedor
- **Desconto dos Itens:** Se houver desconto nos itens vencedores
- **Total:** Soma de ambos

## Estrutura dos 3 Níveis de Frete/Desconto

### Nível 1: GERAL (cotacao_ciclos)
- `valor_frete` - Frete aplicado à cotação inteira
- `desconto_percentual` - Desconto % aplicado ao total da cotação
- `desconto_valor` - Desconto em R$ aplicado ao total da cotação

### Nível 2: FORNECEDOR (cotacao_fornecedores)
- `valor_frete` - Frete cobrado pelo fornecedor
- `valor_imposto` - Impostos cobrados pelo fornecedor
- `desconto_percentual` - Desconto % aplicado sobre o total dos itens do fornecedor
- `desconto_valor` - Desconto em R$ aplicado sobre o total dos itens do fornecedor

### Nível 3: ITEM (cotacao_item_fornecedor)
- `valor_frete` - Frete próprio do item
- `desconto_percentual` - Desconto % aplicado sobre o valor do item
- `desconto_valor` - Desconto em R$ aplicado sobre o valor do item

## Resultado Esperado

Após a correção, na tabela "Fornecedores Vencedores" deve aparecer:

**Fornecedor: teste**
- **Desconto:** R$ X,XX (10% do item "TALHADEIRA")
  - Itens: R$ X,XX (10% = R$ X,XX)

**Fornecedor: Teste Parceiro**
- **Desconto:** R$ 0,00
  - Sem desconto

## Próximos Passos

1. Testar a correção abrindo o modal de aprovação da cotação COT-000048
2. Verificar se o desconto de 10% do item "TALHADEIRA" aparece na tabela
3. Verificar se os logs no console mostram os valores de desconto dos itens
