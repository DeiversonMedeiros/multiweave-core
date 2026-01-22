# Correção: Frete e Desconto na Cotação

## Problema Identificado

Os valores de frete e desconto dos fornecedores não estavam sendo salvos corretamente no banco de dados quando:
1. Uma cotação era editada (fornecedores já existentes)
2. Uma cotação era salva como rascunho e depois enviada para aprovação

### Causa Raiz

Na função `startQuoteCycle` do `purchaseService.ts`:
- ✅ Fornecedores **novos** eram criados com os valores de frete/desconto corretos
- ❌ Fornecedores **existentes** não eram atualizados com os novos valores

Isso fazia com que quando uma cotação era editada, os valores de frete e desconto permanecessem zerados no banco de dados.

## Correções Implementadas

### 1. Atualização de Fornecedores Existentes (`purchaseService.ts`)

**Arquivo:** `src/services/compras/purchaseService.ts`

**Mudança:** Adicionada lógica para atualizar fornecedores existentes com os valores de frete, imposto e desconto quando uma cotação é editada.

```typescript
// ✅ CORREÇÃO: Atualizar fornecedores existentes com os novos valores de frete/desconto
const fornecedoresParaAtualizar = params.input.fornecedores.filter(
  (f) => fornecedoresExistentesIds.has(f.fornecedor_id)
);

const fornecedoresAtualizados = await Promise.allSettled(
  fornecedoresParaAtualizar.map(async (fornecedor) => {
    // ... atualiza valores de frete, imposto e desconto
  })
);
```

### 2. Melhoria na Exibição (`CotacaoDetails.tsx`)

**Arquivo:** `src/components/approvals/CotacaoDetails.tsx`

**Mudança:** Melhorada a exibição para mostrar quando os valores são zero, indicando claramente "Sem frete" ou "Sem desconto" para transparência.

## Estrutura do Banco de Dados

### Tabela: `compras.cotacao_fornecedores`

Campos relacionados:
- `valor_frete` (NUMERIC(15,2)) - Valor do frete cobrado pelo fornecedor
- `valor_imposto` (NUMERIC(15,2)) - Valor de impostos cobrados pelo fornecedor
- `desconto_percentual` (NUMERIC(7,4)) - Desconto percentual aplicado sobre o total dos itens
- `desconto_valor` (NUMERIC(15,2)) - Desconto em valor absoluto aplicado sobre o total dos itens

### Tabela: `compras.cotacao_ciclos`

Campos relacionados (frete/desconto geral):
- `valor_frete` (NUMERIC(15,2)) - Frete aplicado à cotação inteira (geral)
- `desconto_percentual` (NUMERIC(7,4)) - Desconto percentual aplicado ao total da cotação (geral)
- `desconto_valor` (NUMERIC(15,2)) - Desconto em R$ aplicado ao total da cotação (geral)

## Fluxo de Salvamento

### 1. Criação de Nova Cotação

1. Usuário preenche valores de frete/desconto no modal
2. `handleSalvarRascunho` ou `handleEnviarAprovacao` é chamado
3. Dados são preparados com valores de frete/desconto
4. `startQuoteCycle` é chamado
5. **NOVO:** Fornecedores existentes são atualizados com os valores
6. **NOVO:** Fornecedores novos são criados com os valores
7. Update adicional garante que os valores sejam salvos

### 2. Edição de Cotação Existente

1. Cotação é carregada com valores do banco
2. Usuário edita valores de frete/desconto
3. `handleSalvarRascunho` ou `handleEnviarAprovacao` é chamado
4. `startQuoteCycle` identifica fornecedores existentes
5. **NOVO:** Fornecedores existentes são atualizados com os novos valores
6. Update adicional confirma que os valores foram salvos

## Locais de Exibição

Os valores de frete e desconto são exibidos em:

1. **Modal "Gerar Cotação"** (`ModalGerarCotacao.tsx`)
   - Seção de fornecedores vencedores
   - Totais por fornecedor
   - Rateio por centro de custo

2. **Modal "Processar Aprovação"** (`ApprovalModal.tsx` → `CotacaoDetails.tsx`)
   - Tabela "Fornecedores Vencedores"
   - Colunas: "Custo de Frete" e "Desconto"
   - Detalhes expandidos mostrando frete, imposto e desconto separadamente

3. **Página de Aprovações** (`CentralAprovacoesExpandida.tsx`)
   - Resumo da cotação com valor total

## Testes Recomendados

1. ✅ Criar nova cotação com valores de frete/desconto
2. ✅ Editar cotação existente e alterar valores de frete/desconto
3. ✅ Salvar como rascunho e verificar se valores são preservados
4. ✅ Enviar para aprovação e verificar se valores aparecem no modal de aprovação
5. ✅ Verificar se valores zero são exibidos corretamente (mostrando "Sem frete" / "Sem desconto")

## Próximos Passos

1. Testar com a cotação COT-000047
2. Verificar se os valores são salvos corretamente após a correção
3. Validar que a exibição está funcionando em todos os locais
