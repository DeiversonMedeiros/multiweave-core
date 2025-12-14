# 📊 ANÁLISE COMPLETA: MÓDULOS M2, M4 e M5

## Data da Análise: 2025-12-12

---

## 📋 SUMÁRIO EXECUTIVO

Esta análise avalia o sistema atual em relação às especificações dos módulos:
- **M2 - Contas a Pagar (Tesouraria Passiva)**
- **M4 - Conciliação Bancária**
- **M5 - Motor Tributário (ISS, ICMS, IPI, PIS/COFINS, INSS)**

**Status Geral**: ⚠️ **PARCIALMENTE IMPLEMENTADO** - O sistema possui base sólida, mas faltam funcionalidades específicas para atender completamente às especificações.

---

## 🔍 M2 – CONTAS A PAGAR (TESOURARIA PASSIVA)

### ✅ O QUE JÁ EXISTE

#### 1. Estrutura de Dados
- ✅ **Tabela `financeiro.contas_pagar`** - Implementada com campos essenciais
- ✅ **Tabela `financeiro.contas_pagar_parcelas`** - Suporte a parcelamento
- ✅ **Integração com fornecedores** (`fornecedor_id`, `fornecedor_nome`, `fornecedor_cnpj`)
- ✅ **Centro de custo e projeto** - Vinculação implementada
- ✅ **Status de aprovação** - Sistema de aprovações unificado funcionando
- ✅ **Valores e datas** - `valor_original`, `valor_atual`, `data_emissao`, `data_vencimento`, `data_pagamento`

#### 2. Funcionalidades Básicas
- ✅ **Cadastro de títulos a pagar** - Interface funcional (`ContasPagarPage.tsx`)
- ✅ **Integração com folha de pagamento** - Geração automática de contas a pagar
- ✅ **Integração com pedidos de compra** - Função `compras.criar_conta_pagar()` existe
- ✅ **Integração com premiações** - Trigger automático quando premiação é aprovada
- ✅ **Integração com aluguel de equipamentos** - Função `send_equipment_rental_to_accounts_payable()`
- ✅ **Sistema de aprovações** - Sistema unificado (`public.aprovacoes_unificada`)
- ✅ **Pagamento em lote básico** - Função `handleConfirmBatchPayment()` existe

#### 3. Workflow de Aprovação
- ✅ **Sistema de aprovações unificado** - Implementado e funcional
- ✅ **Aprovação por níveis de alçada** - Configurável via `configuracoes_aprovacao_unificada`
- ✅ **Aprovação por valor, centro de custo, departamento, classe financeira** - Suportado

### ❌ O QUE FALTA IMPLEMENTAR

#### 1. Caixa de Entrada de Obrigações
- ❌ **Centralização de obrigações** - Não existe interface única que agrupe:
  - Pedidos aprovados (existe função, mas não interface)
  - Notas fiscais de fornecedores (não implementado)
  - Contas recorrentes (energia, telefonia, aluguel) - Parcial (só aluguel de equipamentos)
  - Tributos e encargos (não implementado)

**Necessário**: Criar tabela `financeiro.obrigacoes_entrada` e interface de centralização

#### 2. Desdobramento em Parcelas
- ⚠️ **Parcial** - Existe tabela `contas_pagar_parcelas`, mas:
  - ❌ Interface para criar parcelas automaticamente (30/60/90 dias)
  - ❌ Validação de parcelas
  - ❌ Gestão de parcelas vinculadas

**Necessário**: Interface e lógica de parcelamento automático

#### 3. Retenções na Fonte
- ❌ **Não implementado para contas a pagar**
- ⚠️ **Existe apenas em NFSe** - Campos de retenção existem em `financeiro.nfse`:
  - `retencao_iss_na_fonte`
  - `retencao_impostos_federais`
  - `valor_ir_retencao`, `valor_pis_retencao`, `valor_cofins_retencao`, `valor_csll_retencao`, `valor_inss_retencao`

**Necessário**: 
- Criar tabela `financeiro.retencoes_fonte` vinculada a `contas_pagar`
- Campos: INSS, IRRF, PIS, COFINS, CSLL, ISS-RF, outros
- Interface para registro de retenções por título

#### 4. Montagem de Lotes de Pagamento
- ⚠️ **Básico** - Existe função de pagamento em lote, mas:
  - ❌ Tabela específica para lotes (`financeiro.lotes_pagamento`)
  - ❌ Agrupamento por critérios (data vencimento, fornecedor, conta bancária, tipo despesa)
  - ❌ Geração de lotes para aprovação
  - ❌ Workflow de aprovação de lotes

**Necessário**: 
- Criar tabela `financeiro.lotes_pagamento` e `financeiro.lote_pagamento_itens`
- Interface de montagem de lotes com filtros
- Sistema de aprovação de lotes

#### 5. Workflow de Aprovação e Urgência
- ✅ **Aprovação por níveis** - Implementado
- ❌ **Tratamento de urgência**:
  - ❌ Flag obrigatória "urgente"
  - ❌ Campo obrigatório "motivo da urgência"
  - ❌ Registro para módulo de Governança (M7)

**Necessário**: 
- Adicionar campos `is_urgente` e `motivo_urgencia` em `contas_pagar`
- Validação obrigatória quando `is_urgente = true`
- Integração com M7 (futuro)

#### 6. Execução Bancária
- ⚠️ **Parcial** - Existem estruturas básicas:
  - ✅ Tabela `financeiro.remessas_bancarias` (CNAB)
  - ✅ Tabela `financeiro.retornos_bancarios`
  - ✅ Tabela `financeiro.borderos`
  - ❌ Geração de instruções via API bancária
  - ❌ Geração de arquivo CNAB/OFX
  - ❌ Recepção e registro de retorno (confirmada, rejeitada, pendente)

**Necessário**: 
- Implementar geração de arquivos CNAB/OFX
- Integração com APIs bancárias
- Processamento de retornos bancários

#### 7. Agenda de Vencimentos e Fluxo de Caixa
- ✅ **Fluxo de caixa básico** - Tabela `financeiro.fluxo_caixa` existe
- ⚠️ **Agenda de vencimentos** - Parcial:
  - ❌ Visão consolidada por empresa, banco, tipo de despesa, projeto
  - ❌ Projeções futuras detalhadas

**Necessário**: Interface de agenda de vencimentos com múltiplos filtros

---

## 🔍 M4 – CONCILIAÇÃO BANCÁRIA

### ✅ O QUE JÁ EXISTE

#### 1. Estrutura de Dados
- ✅ **Tabela `financeiro.conciliacoes_bancarias`** - Estrutura básica
- ✅ **Tabela `financeiro.contas_bancarias`** - Cadastro de contas
- ✅ **Campos básicos**: `saldo_banco`, `saldo_sistema`, `diferenca`, `status`

#### 2. Funcionalidades Básicas
- ✅ **Componente `ConciliacaoForm.tsx`** - Interface básica
- ✅ **Hook `useTesouraria()`** - Funções `processarConciliacao()` e `importarExtrato()`

### ❌ O QUE FALTA IMPLEMENTAR

#### 1. Importação de Extratos
- ❌ **Importação via API bancária** - Não implementado
- ❌ **Importação via arquivo OFX** - Não implementado
- ❌ **Importação via arquivo CSV** - Não implementado
- ❌ **Parser de extratos** - Não existe

**Necessário**: 
- Criar tabela `financeiro.movimentacoes_bancarias` para armazenar linhas do extrato
- Implementar parsers para OFX, CSV
- Integração com APIs bancárias

#### 2. Registro de Movimentações Bancárias
- ❌ **Tabela de movimentações** - Não existe
- ❌ **Conversão de extrato em movimentações** - Não implementado
- ❌ **Campos**: data, histórico, valor, tipo (débito/crédito), conta

**Necessário**: 
- Criar tabela `financeiro.movimentacoes_bancarias` com estrutura completa

#### 3. Algoritmo de Baixa Automática
- ❌ **Vinculação automática** - Não implementado:
  - ❌ Créditos bancários → Títulos a receber
  - ❌ Débitos bancários → Títulos a pagar/lotes
- ❌ **Lógica de conciliação**:
  - ❌ Valor exato
  - ❌ Valor de lote (depósitos que quitam múltiplas NFs)
  - ❌ Diferenças atribuíveis a retenções e tarifas

**Necessário**: 
- Algoritmo de matching inteligente
- Tabela `financeiro.conciliacoes_movimentacoes` para vincular movimentações a títulos

#### 4. Tratamento de Diferenças e Pendências
- ❌ **Sinalização de diferenças** - Não implementado:
  - ❌ Recebimentos a menor
  - ❌ Pagamentos incompletos
  - ❌ Tarifas bancárias não previstas
- ❌ **Fila de pendências** - Não existe

**Necessário**: 
- Tabela `financeiro.conciliacoes_pendencias`
- Interface de análise manual de pendências

#### 5. Atualização de Status de Títulos
- ⚠️ **Parcial** - Status existe, mas:
  - ❌ Atualização automática via conciliação
  - ❌ Marcação como liquidados
  - ❌ Marcação como parcialmente pagos
  - ❌ Marcação como vencidos sem pagamento

**Necessário**: 
- Triggers ou funções para atualizar status automaticamente após conciliação

---

## 🔍 M5 – MOTOR TRIBUTÁRIO (ISS, ICMS, IPI, PIS/COFINS, INSS)

### ✅ O QUE JÁ EXISTE

#### 1. Cálculos Básicos de Tributos
- ✅ **INSS** - Implementado em `payrollCalculationService.ts` e `inssBracketsService.ts`
- ✅ **IRRF** - Implementado em `irrfBracketsService.ts`
- ✅ **FGTS** - Implementado em `fgtsConfigService.ts`
- ✅ **ISS** - Campos existem em `financeiro.nfse`:
  - `valor_iss`, `aliquota_iss`, `base_calculo_iss`
  - `retencao_iss_na_fonte`, `valor_iss_retencao`
- ✅ **PIS/COFINS** - Campos existem em `financeiro.nfse` e `financeiro.nfe`
- ✅ **ICMS** - Campos existem em `financeiro.nfe`:
  - `valor_icms`, `base_calculo_icms`, `aliquota_icms`
  - `valor_icms_st`, `base_calculo_icms_st`, `aliquota_icms_st`
- ✅ **IPI** - Campos existem em `financeiro.nfe`

#### 2. Estrutura de Dados
- ✅ **Tabela `rh.inss_brackets`** - Faixas de INSS
- ✅ **Tabela `rh.irrf_brackets`** - Faixas de IRRF
- ✅ **Tabela `rh.fgts_config`** - Configuração de FGTS
- ✅ **Campos tributários em NFSe e NFe** - Estrutura básica

#### 3. Cálculos em Folha de Pagamento
- ✅ **Motor de cálculo** - `FormulaEngine` implementado
- ✅ **Cálculo automático** - INSS, IRRF, FGTS calculados automaticamente na folha

### ❌ O QUE FALTA IMPLEMENTAR

#### 1. Parametrização Geral de Tributos
- ❌ **Tabela de ISS por município** - Não existe:
  - ❌ Base cheia, dedução presumida ou real
  - ❌ Alíquotas por município
- ❌ **Tabela de ICMS por UF** - Não existe:
  - ❌ Regras de crédito de insumos
  - ❌ Alíquotas por UF e tipo de operação
- ❌ **Tabela de IPI por tipo de produto/atividade** - Não existe
- ❌ **Tabela de PIS/COFINS** - Não existe:
  - ❌ Cumulativo / não cumulativo
  - ❌ Definição de créditos permitidos
- ❌ **Tabela de INSS/RAT/FAP** - Parcial (só INSS básico)

**Necessário**: 
- Criar schema `tributario` com tabelas de parametrização
- Interface administrativa para configuração

#### 2. Cálculo Oficial por Nota Fiscal
- ⚠️ **Parcial** - Campos existem, mas:
  - ❌ Motor de cálculo automático para NFs de saída
  - ❌ Motor de cálculo automático para NFs de entrada
  - ❌ Identificação de créditos (ICMS, IPI, PIS/COFINS)
  - ❌ Consideração de retenções na fonte

**Necessário**: 
- Criar serviço `TaxCalculationEngine`
- Integrar com emissão de NFSe e NFe

#### 3. Cálculo Misto (ISS + ICMS + IPI)
- ❌ **Não implementado**:
  - ❌ Separação de parcelas (mercadoria, serviço, industrialização)
  - ❌ Aplicação de ICMS/IPI na parte mercadoria
  - ❌ ISS na parte serviços

**Necessário**: 
- Lógica de cálculo misto
- Interface para definir percentuais de cada parcela

#### 4. Simuladores de Cenário
- ❌ **Não implementado**:
  - ❌ ISS puro x ISS + ICMS + IPI
  - ❌ Dedução presumida x dedução real
  - ❌ Impacto de diferentes classificações fiscais (NCM, CST, CFOP)
  - ❌ Comparação cenário legado x otimizado

**Necessário**: 
- Interface de simulação
- Motor de cálculo de cenários

#### 5. Integração com Módulos Operacionais
- ⚠️ **Parcial**:
  - ✅ M3 (pré-emissão de NF) - Campos existem, mas cálculo não é automático
  - ❌ M2 (validação de retenções) - Não implementado
  - ❌ M4 (conferência entre valores recebidos e tributos retidos) - Não implementado

**Necessário**: 
- Integração completa com M2, M3 e M4

---

## 📊 RESUMO POR MÓDULO

### M2 - Contas a Pagar
| Funcionalidade | Status | Prioridade |
|---------------|--------|------------|
| Caixa de Entrada de Obrigações | ❌ Não implementado | Alta |
| Cadastro de Títulos | ✅ Implementado | - |
| Desdobramento em Parcelas | ⚠️ Parcial | Média |
| Retenções na Fonte | ❌ Não implementado | Alta |
| Montagem de Lotes | ⚠️ Básico | Alta |
| Workflow de Aprovação | ✅ Implementado | - |
| Tratamento de Urgência | ❌ Não implementado | Média |
| Execução Bancária | ⚠️ Parcial | Alta |
| Agenda de Vencimentos | ⚠️ Parcial | Média |

**Cobertura**: ~40%

### M4 - Conciliação Bancária
| Funcionalidade | Status | Prioridade |
|---------------|--------|------------|
| Importação de Extratos | ❌ Não implementado | Alta |
| Registro de Movimentações | ❌ Não implementado | Alta |
| Algoritmo de Baixa Automática | ❌ Não implementado | Alta |
| Tratamento de Diferenças | ❌ Não implementado | Alta |
| Atualização de Status | ⚠️ Parcial | Média |

**Cobertura**: ~10%

### M5 - Motor Tributário
| Funcionalidade | Status | Prioridade |
|---------------|--------|------------|
| Parametrização de Tributos | ❌ Não implementado | Alta |
| Cálculo Oficial por NF | ⚠️ Parcial | Alta |
| Cálculo Misto | ❌ Não implementado | Média |
| Simuladores de Cenário | ❌ Não implementado | Baixa |
| Integração com Módulos | ⚠️ Parcial | Alta |

**Cobertura**: ~25%

---

## 🎯 PRIORIDADES DE IMPLEMENTAÇÃO

### Fase 1 - Crítico (Alta Prioridade)
1. **M2 - Retenções na Fonte**
   - Criar tabela `financeiro.retencoes_fonte`
   - Interface de registro
   - Integração com contas a pagar

2. **M2 - Montagem de Lotes de Pagamento**
   - Criar tabelas `financeiro.lotes_pagamento` e `financeiro.lote_pagamento_itens`
   - Interface de montagem com filtros
   - Sistema de aprovação de lotes

3. **M4 - Importação de Extratos**
   - Criar tabela `financeiro.movimentacoes_bancarias`
   - Parsers OFX e CSV
   - Interface de importação

4. **M4 - Algoritmo de Baixa Automática**
   - Lógica de matching
   - Tabela de conciliações
   - Interface de validação

5. **M5 - Parametrização de Tributos**
   - Criar schema `tributario`
   - Tabelas de configuração
   - Interface administrativa

6. **M5 - Motor de Cálculo Automático**
   - Serviço `TaxCalculationEngine`
   - Integração com NFSe e NFe

### Fase 2 - Importante (Média Prioridade)
1. **M2 - Caixa de Entrada de Obrigações**
2. **M2 - Desdobramento Automático em Parcelas**
3. **M2 - Tratamento de Urgência**
4. **M2 - Execução Bancária Completa (CNAB/OFX)**
5. **M4 - Tratamento de Diferenças e Pendências**
6. **M5 - Cálculo Misto (ISS + ICMS + IPI)**

### Fase 3 - Desejável (Baixa Prioridade)
1. **M2 - Agenda de Vencimentos Avançada**
2. **M5 - Simuladores de Cenário**

---

## 📝 OBSERVAÇÕES TÉCNICAS

### Pontos Fortes
- ✅ Estrutura de banco de dados bem organizada
- ✅ Sistema de aprovações unificado funcionando
- ✅ Integrações básicas entre módulos (compras, RH, financeiro)
- ✅ Cálculos de folha de pagamento robustos (INSS, IRRF, FGTS)

### Pontos de Atenção
- ⚠️ Falta de motor tributário centralizado
- ⚠️ Conciliação bancária muito básica
- ⚠️ Lotes de pagamento não estruturados
- ⚠️ Retenções na fonte não implementadas para contas a pagar

### Recomendações
1. **Criar schema `tributario`** para centralizar todas as regras tributárias
2. **Implementar motor de cálculo unificado** que possa ser usado por todos os módulos
3. **Estruturar melhor a conciliação bancária** com tabelas específicas para movimentações
4. **Criar interface de "Caixa de Entrada"** para centralizar obrigações
5. **Implementar sistema de lotes** com workflow completo

---

## 🔗 ARQUIVOS RELEVANTES

### M2 - Contas a Pagar
- `supabase/migrations/20250115000001_create_financial_schema.sql`
- `src/components/financial/ContasPagarPage.tsx`
- `src/hooks/financial/useContasPagar.ts`
- `compras_integrations.sql` (função `criar_conta_pagar`)

### M4 - Conciliação Bancária
- `supabase/migrations/20250115000001_create_financial_schema.sql` (tabela `conciliacoes_bancarias`)
- `src/components/financial/ConciliacaoForm.tsx`
- `src/hooks/financial/useTesouraria.ts`

### M5 - Motor Tributário
- `src/services/rh/payrollCalculationService.ts`
- `src/services/rh/inssBracketsService.ts`
- `src/services/rh/irrfBracketsService.ts`
- `src/services/rh/fgtsConfigService.ts`
- `src/components/financial/NFSeForm.tsx` (campos tributários)
- `src/components/financial/NFeForm.tsx` (campos tributários)

---

**Documento gerado em**: 2025-12-12
**Versão**: 1.0

