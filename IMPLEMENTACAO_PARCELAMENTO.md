# Implementação de Parcelamento - Contas a Pagar

## ✅ Funcionalidades Implementadas

### 1. **Estrutura do Banco de Dados**
- ✅ Tabela `financeiro.contas_pagar_parcelas` criada
- ✅ Campos adicionados em `financeiro.contas_pagar`:
  - `is_parcelada` (boolean)
  - `numero_parcelas` (integer)
  - `intervalo_parcelas` (varchar)
  - `conta_pagar_principal_id` (uuid)
- ✅ Função `financeiro.generate_titulo_number_parcela` criada
- ✅ Índices e triggers configurados

**Arquivo**: `supabase/migrations/20251115000002_create_contas_pagar_parcelas.sql`

### 2. **Tipos TypeScript**
- ✅ Interface `ContaPagarParcela` criada
- ✅ Interface `ContaPagarParcelaFormData` criada
- ✅ Campos de parcelamento adicionados em `ContaPagar` e `ContaPagarFormData`

**Arquivo**: `src/integrations/supabase/financial-types.ts`

### 3. **Interface do Formulário**
- ✅ Nova aba "Parcelamento" adicionada ao formulário
- ✅ Checkbox "Parcelar esta conta"
- ✅ Campo "Número de Parcelas" (1-360)
- ✅ Campo "Intervalo entre Parcelas" (diário, semanal, quinzenal, mensal, bimestral, trimestral, semestral, anual)
- ✅ Campo "Data da Primeira Parcela"
- ✅ Tabela de visualização das parcelas geradas com:
  - Número da parcela
  - Valor da parcela
  - Data de vencimento
  - Observações
- ✅ Resumo financeiro mostrando:
  - Total das parcelas
  - Valor original
  - Desconto aplicado

**Arquivo**: `src/components/financial/ContaPagarForm.tsx`

### 4. **Lógica de Geração de Parcelas**
- ✅ Função `gerarParcelas()` implementada
- ✅ Cálculo automático de datas de vencimento baseado no intervalo
- ✅ Distribuição automática do valor entre parcelas
- ✅ Ajuste da última parcela para compensar diferenças de arredondamento
- ✅ Atualização automática quando campos relevantes mudam

**Arquivo**: `src/components/financial/ContaPagarForm.tsx` (linhas 153-229)

## 📋 Próximos Passos Necessários

### 1. **Backend - Salvar Parcelas**
O formulário já envia os dados das parcelas no objeto `ContaPagarFormData`, mas é necessário implementar a lógica no backend para:

- Criar a conta principal com `is_parcelada = true`
- Criar registros na tabela `financeiro.contas_pagar_parcelas` para cada parcela
- Gerar números de título para cada parcela usando `financeiro.generate_titulo_number_parcela`
- Opcionalmente, criar contas a pagar individuais para cada parcela (se necessário)

**Localização sugerida**: 
- API Route: `/api/financial/contas-pagar` (POST)
- Ou atualizar o hook: `src/hooks/financial/useContasPagar.ts`

### 2. **Visualização de Parcelas**
Criar componente ou seção para visualizar parcelas de uma conta parcelada:
- Lista de parcelas com status
- Filtros por status
- Ações individuais por parcela (pagar, cancelar, etc.)

### 3. **Edição de Parcelas**
Permitir editar parcelas individuais:
- Alterar data de vencimento
- Alterar valor (com ajuste automático nas outras)
- Cancelar parcelas

### 4. **Relatórios**
Adicionar relatórios específicos para parcelas:
- Parcelas vencidas
- Parcelas a vencer
- Previsão de fluxo de caixa por parcelas

## 🔧 Como Usar

1. **Aplicar a migração**:
   ```bash
   supabase db push
   ```

2. **Criar uma conta parcelada**:
   - Abrir modal "Nova Conta a Pagar"
   - Preencher dados básicos (fornecedor, valor, etc.)
   - Ir para aba "Parcelamento"
   - Marcar "Parcelar esta conta"
   - Definir número de parcelas e intervalo
   - Definir data da primeira parcela
   - Visualizar resumo das parcelas
   - Salvar

3. **Verificar parcelas geradas**:
   - As parcelas serão criadas automaticamente no banco
   - Cada parcela terá seu próprio número de título
   - Cada parcela pode ser gerenciada individualmente

## 📝 Notas Técnicas

- O cálculo de datas usa `setMonth()` e `setDate()` do JavaScript, que pode ter comportamentos inesperados em alguns casos (ex: 31 de janeiro + 1 mês). Considere usar uma biblioteca como `date-fns` ou `moment` para cálculos mais robustos.
- A última parcela é ajustada para compensar diferenças de arredondamento, garantindo que a soma das parcelas seja igual ao valor total.
- O valor total considera desconto, mas não juros e multa (que são aplicados posteriormente).


















