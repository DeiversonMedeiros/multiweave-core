# 📊 ANÁLISE M7 – GOVERNANÇA, PLANEJAMENTO E MÉRITO

## Data da Análise: 2025-12-12

---

## 📋 SUMÁRIO EXECUTIVO

Esta análise avalia o sistema atual em relação às especificações do módulo **M7 - Governança, Planejamento e Mérito** (fase atual: apenas parte de planejamento e KPIs).

**Status Geral**: ⚠️ **NÃO IMPLEMENTADO** - O sistema possui base de dados necessária, mas faltam todas as funcionalidades específicas do M7.

---

## 🎯 OBJETIVO DO MÓDULO M7

Mensurar o nível de organização de cada gestor, identificando faltas de planejamento, solicitações urgentes e violações de SLA em todo o fluxo financeiro.

---

## ✅ O QUE JÁ EXISTE NO SISTEMA

### 1. Estrutura de Dados Base

#### Contas a Pagar (`financeiro.contas_pagar`)
- ✅ Campos de urgência já implementados:
  - `is_urgente` (BOOLEAN)
  - `motivo_urgencia` (TEXT)
- ✅ Campos de data:
  - `data_emissao` (DATE)
  - `data_vencimento` (DATE)
  - `data_pagamento` (DATE)
- ✅ Campos de gestor:
  - `created_by` (UUID) - usuário que criou
  - `centro_custo_id` - pode identificar gestor responsável
  - `projeto_id` - pode identificar gestor responsável

#### Requisições de Compra (`compras.requisicoes_compra`)
- ✅ Campos de urgência:
  - `prioridade` (ENUM: 'baixa', 'normal', 'alta', 'urgente')
  - `is_emergencial` (BOOLEAN) - em alguns casos
- ✅ Campos de data:
  - `data_solicitacao` (DATE)
  - `data_necessidade` (DATE)
- ✅ Campos de gestor:
  - `solicitante_id` (UUID) - gestor responsável
  - `centro_custo_id` - centro de custo
  - `projeto_id` - projeto

### 2. Sistema de Aprovações
- ✅ Sistema unificado de aprovações (`public.aprovacoes_unificada`)
- ✅ Rastreamento de aprovadores e gestores

### 3. Estrutura de Usuários e Gestores
- ✅ Tabela `public.users` com gestores
- ✅ Relacionamento `public.user_companies` para multiempresa
- ✅ Sistema de permissões por gestor

---

## ❌ O QUE PRECISA SER IMPLEMENTADO

### 1. Registro de Eventos de Planejamento

**Requisito**: Toda solicitação de:
- Pagamento "para hoje"
- Compra urgente
- Medição enviada fora da janela

Deve ser registrada com:
- Gestor responsável
- Etapa do processo
- Motivo informado

**Status**: ❌ **NÃO IMPLEMENTADO**

**Necessário**:
- Tabela `financeiro.eventos_planejamento` para registrar eventos
- Triggers automáticos para detectar:
  - Pagamentos com `data_vencimento = CURRENT_DATE` e `is_urgente = true`
  - Requisições com `prioridade = 'urgente'` ou `is_emergencial = true`
  - Medições enviadas fora da janela (precisa identificar onde são enviadas)

### 2. Parametrização de SLAs por Etapa

**Requisito**: Definição de prazos mínimos/ideais (em horas/dias) para:
- Envio de pedido de compra antes da necessidade
- Envio de BM (Boletim de Medição)
- Envio de documentos para pagamento

**Status**: ❌ **NÃO IMPLEMENTADO**

**Necessário**:
- Tabela `financeiro.slas_etapas` para configurar SLAs
- Campos:
  - `etapa_processo` (VARCHAR) - ex: 'pedido_compra', 'envio_bm', 'envio_documentos_pagamento'
  - `prazo_minimo_horas` (INTEGER) - prazo mínimo em horas
  - `prazo_ideal_horas` (INTEGER) - prazo ideal em horas
  - `company_id` (UUID) - por empresa

### 3. KPIs de Planejamento por Gestor

**Requisito**: Indicadores como:
- % de operações urgentes
- Tempo médio de antecedência
- Número de violações de SLA

**Status**: ❌ **NÃO IMPLEMENTADO**

**Necessário**:
- Tabela `financeiro.kpis_planejamento_gestor` para armazenar KPIs calculados
- Funções para calcular:
  - `calcular_percentual_operacoes_urgentes(gestor_id, periodo)`
  - `calcular_tempo_medio_antecedencia(gestor_id, periodo)`
  - `calcular_violacoes_sla(gestor_id, periodo)`
- Dashboard/relatório para visualização

---

## 🔧 PLANO DE IMPLEMENTAÇÃO

### Fase 1: Estrutura de Dados (Prioridade: ALTA)

1. **Criar schema/tabelas**:
   - `financeiro.eventos_planejamento` - registro de eventos
   - `financeiro.slas_etapas` - configuração de SLAs
   - `financeiro.kpis_planejamento_gestor` - KPIs calculados

2. **Campos necessários**:
   - Identificação do gestor responsável
   - Tipo de evento (pagamento_hoje, compra_urgente, medicao_fora_janela)
   - Etapa do processo
   - Motivo
   - Data/hora do evento
   - Violação de SLA (se aplicável)

### Fase 2: Triggers e Detecção Automática (Prioridade: ALTA)

1. **Trigger para Contas a Pagar**:
   - Detectar quando `data_vencimento = CURRENT_DATE` e `is_urgente = true`
   - Registrar evento automaticamente

2. **Trigger para Requisições de Compra**:
   - Detectar quando `prioridade = 'urgente'` ou `is_emergencial = true`
   - Calcular antecedência (diferença entre `data_solicitacao` e `data_necessidade`)
   - Registrar evento se violar SLA

3. **Trigger para Medições** (quando identificado onde são enviadas):
   - Detectar envio fora da janela configurada
   - Registrar evento

### Fase 3: Funções de Cálculo de KPIs (Prioridade: MÉDIA)

1. **Funções RPC**:
   - `calcular_kpis_planejamento_gestor(gestor_id, data_inicio, data_fim)`
   - `listar_eventos_planejamento(company_id, gestor_id, periodo)`
   - `calcular_violacoes_sla(company_id, periodo)`

### Fase 4: Interface e Relatórios (Prioridade: BAIXA)

1. **Dashboard de Governança**:
   - Visualização de KPIs por gestor
   - Gráficos de tendências
   - Lista de eventos de planejamento

2. **Relatórios**:
   - Relatório de violações de SLA
   - Relatório de operações urgentes por gestor
   - Relatório de tempo médio de antecedência

---

## 📝 OBSERVAÇÕES IMPORTANTES

### 1. Medições (BM - Boletim de Medição)
- ⚠️ **NÃO IDENTIFICADO** no sistema atual onde são enviadas
- Necessário investigar se existe módulo de medições ou se é parte de outro processo
- Pode ser necessário criar estrutura para medições se não existir

### 2. Gestor Responsável
- O sistema atual identifica gestores através de:
  - `solicitante_id` em requisições
  - `created_by` em contas a pagar
  - `centro_custo_id` e `projeto_id` (pode ter gestor associado)
- Pode ser necessário criar tabela de relacionamento gestor-centro_custo-projeto

### 3. Janela de Envio
- Para medições, precisa definir o que é "fora da janela"
- Pode ser baseado em:
  - Data de vencimento do contrato
  - Data de fechamento do período
  - SLA configurado

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ Criar análise completa (este documento)
2. ⏳ Criar migration com estrutura de dados
3. ⏳ Implementar triggers de detecção
4. ⏳ Criar funções de cálculo de KPIs
5. ⏳ Implementar políticas RLS
6. ⏳ Criar interface/dashboard (futuro)

---

## 📊 RESUMO

| Funcionalidade | Status | Prioridade |
|---------------|--------|------------|
| Registro de Eventos | ❌ Não implementado | ALTA |
| Parametrização de SLAs | ❌ Não implementado | ALTA |
| KPIs de Planejamento | ❌ Não implementado | MÉDIA |
| Triggers de Detecção | ❌ Não implementado | ALTA |
| Dashboard/Interface | ❌ Não implementado | BAIXA |

**Conclusão**: O sistema possui a base de dados necessária (contas a pagar com urgência, requisições com prioridade), mas precisa de toda a estrutura de governança, registro de eventos, SLAs e KPIs implementada do zero.
