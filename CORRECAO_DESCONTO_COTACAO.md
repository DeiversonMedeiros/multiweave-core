# Correção: Desconto não aparece na Cotação

## Problema Identificado

Na cotação COT-000048, o frete apareceu corretamente (R$ 5,00), mas o desconto não apareceu, mostrando "Sem desconto" mesmo quando foi aplicado.

## Análise

### Possíveis Causas

1. **Desconto não está sendo salvo no banco** quando preenchido no modal
2. **Desconto está sendo salvo mas não está sendo carregado** corretamente
3. **Desconto está sendo carregado mas não está sendo exibido** corretamente

### Verificações Necessárias

1. Verificar se o desconto está sendo incluído no array `fornecedoresData` quando enviado para `startQuoteCycle`
2. Verificar se o desconto está sendo salvo corretamente na tabela `cotacao_fornecedores`
3. Verificar se o desconto está sendo carregado corretamente do banco
4. Verificar se a lógica de exibição está correta

## Correções Implementadas

### 1. Adicionado Debug na Exibição

Adicionado log de debug para mostrar os valores brutos quando o desconto deveria existir mas está zero:

```typescript
{desconto === 0 && (fornecedor.desconto_percentual != null || fornecedor.desconto_valor != null) && (
  <div className="text-xs text-orange-600 mt-1">
    Debug: desconto_percentual={String(fornecedor.desconto_percentual)}, desconto_valor={String(fornecedor.desconto_valor)}
  </div>
)}
```

### 2. Melhorada a Exibição

Removida a condição que ocultava os detalhes do desconto, agora sempre mostra os detalhes para transparência.

## Próximos Passos

1. Testar com a cotação COT-000048 e verificar os logs no console
2. Verificar se o desconto está sendo salvo no banco quando preenchido
3. Se o desconto não estiver sendo salvo, corrigir a lógica de salvamento
4. Se o desconto estiver sendo salvo mas não aparecer, corrigir a lógica de exibição

## Como Testar

1. Abrir a cotação COT-000048 no modal de aprovação
2. Verificar o console do navegador para ver os logs de debug
3. Verificar se os valores de desconto aparecem nos logs
4. Verificar se o desconto aparece na interface
