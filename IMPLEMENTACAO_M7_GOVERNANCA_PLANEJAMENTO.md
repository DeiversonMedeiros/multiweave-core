# ✅ IMPLEMENTAÇÃO M7 – GOVERNANÇA, PLANEJAMENTO E MÉRITO

## Data: 2025-12-12

---

## 📋 RESUMO DA IMPLEMENTAÇÃO

Foi implementada a estrutura completa do módulo **M7 - Governança, Planejamento e Mérito** conforme especificado, incluindo:

1. ✅ **Registro de Eventos de Planejamento** - Sistema automático de detecção e registro
2. ✅ **Parametrização de SLAs por Etapa** - Configuração de prazos mínimos/ideais
3. ✅ **KPIs de Planejamento por Gestor** - Cálculo automático de indicadores

---

## 🗄️ ESTRUTURA DE DADOS CRIADA

### 1. Tabela: `financeiro.slas_etapas`
Configuração de SLAs (prazos) por etapa do processo financeiro.

**Campos principais**:
- `etapa_processo` - Etapa do processo (criacao_requisicao, envio_pedido, envio_medicao, etc.)
- `prazo_minimo_horas` - Prazo mínimo aceitável em horas
- `prazo_ideal_horas` - Prazo ideal recomendado em horas

**Etapas suportadas**:
- `criacao_requisicao` - Criação de requisição de compra
- `aprovacao_requisicao` - Aprovação de requisição
- `criacao_cotacao` - Criação de cotação
- `aprovacao_cotacao` - Aprovação de cotação
- `criacao_pedido` - Criação de pedido de compra
- `envio_pedido` - Envio de pedido
- `envio_medicao` - Envio de boletim de medição
- `criacao_conta_pagar` - Criação de conta a pagar
- `envio_documentos_pagamento` - Envio de documentos para pagamento
- `aprovacao_pagamento` - Aprovação de pagamento
- `pagamento` - Realização do pagamento

### 2. Tabela: `financeiro.eventos_planejamento`
Registro de todos os eventos de planejamento detectados.

**Campos principais**:
- `tipo_evento` - Tipo do evento (pagamento_hoje, compra_urgente, medicao_fora_janela, etc.)
- `etapa_processo` - Etapa onde ocorreu o evento
- `gestor_id` - Gestor responsável
- `origem_tipo` - Tipo da origem (conta_pagar, requisicao_compra, etc.)
- `origem_id` - ID do registro que gerou o evento
- `antecedencia_horas` - Antecedência calculada (negativo = sem antecedência)
- `violou_sla` - Se violou o SLA configurado
- `motivo` - Motivo informado

**Tipos de eventos**:
- `pagamento_hoje` - Pagamento criado para hoje
- `compra_urgente` - Compra marcada como urgente
- `medicao_fora_janela` - Medição enviada fora da janela
- `documento_fora_prazo` - Documento enviado fora do prazo
- `requisicao_sem_antecedencia` - Requisição sem antecedência adequada

### 3. Tabela: `financeiro.kpis_planejamento_gestor`
KPIs calculados por gestor e período.

**KPIs calculados**:
- `total_operacoes` - Total de operações do gestor
- `operacoes_urgentes` - Total de operações urgentes
- `percentual_operacoes_urgentes` - % de operações urgentes
- `tempo_medio_antecedencia_horas` - Tempo médio de antecedência
- `total_violacoes_sla` - Total de violações de SLA
- `percentual_violacoes_sla` - % de violações de SLA
- Detalhamento por tipo de evento
- Valores financeiros (total e urgentes)

---

## 🔧 FUNCIONALIDADES IMPLEMENTADAS

### 1. Detecção Automática de Eventos

#### Trigger: Pagamentos "Para Hoje"
- **Tabela**: `financeiro.contas_pagar`
- **Condição**: `data_vencimento = CURRENT_DATE` OU `is_urgente = true`
- **Ação**: Registra evento automaticamente com tipo `pagamento_hoje`

#### Trigger: Compras Urgentes
- **Tabela**: `compras.requisicoes_compra`
- **Condição**: `prioridade = 'urgente'` OU `is_emergencial = true`
- **Ação**: Registra evento automaticamente com tipo `compra_urgente`
- **Cálculo**: Calcula antecedência entre `data_solicitacao` e `data_necessidade`

### 2. Funções RPC Disponíveis

#### `financeiro.registrar_evento_planejamento()`
Registra manualmente um evento de planejamento.

**Parâmetros**:
- `p_company_id` - ID da empresa
- `p_tipo_evento` - Tipo do evento
- `p_etapa_processo` - Etapa do processo
- `p_gestor_id` - ID do gestor responsável
- `p_origem_tipo` - Tipo da origem
- `p_origem_id` - ID da origem
- `p_motivo` - Motivo do evento
- `p_data_necessidade` - Data de necessidade (opcional)
- `p_data_solicitacao` - Data de solicitação (opcional)
- `p_valor` - Valor associado (opcional)

**Retorna**: UUID do evento criado

#### `financeiro.calcular_kpis_planejamento_gestor()`
Calcula e armazena KPIs de planejamento para um gestor.

**Parâmetros**:
- `p_company_id` - ID da empresa
- `p_gestor_id` - ID do gestor
- `p_periodo_inicio` - Data de início do período
- `p_periodo_fim` - Data de fim do período

**Retorna**: UUID do registro de KPI criado/atualizado

**Comportamento**:
- Calcula todos os KPIs baseado nos eventos do período
- Atualiza registro existente se já houver para o mesmo período
- Cria novo registro se não existir

#### `financeiro.criar_slas_padrao()`
Cria configurações de SLA padrão para uma empresa.

**Parâmetros**:
- `p_company_id` - ID da empresa

**SLAs padrão criados**:
- `criacao_requisicao`: 24h mínimo, 72h ideal
- `envio_pedido`: 48h mínimo, 120h ideal
- `envio_medicao`: 24h mínimo, 72h ideal
- `envio_documentos_pagamento`: 24h mínimo, 72h ideal
- `criacao_conta_pagar`: 24h mínimo, 72h ideal

---

## 📊 COMO USAR

### 1. Configurar SLAs por Etapa

```sql
-- Inserir/atualizar SLA para uma etapa
INSERT INTO financeiro.slas_etapas (company_id, etapa_processo, prazo_minimo_horas, prazo_ideal_horas, descricao)
VALUES (
    'uuid-da-empresa',
    'envio_medicao',
    48,  -- 48 horas mínimo
    120, -- 120 horas ideal
    'Prazo para envio de medição dentro da janela'
)
ON CONFLICT (company_id, etapa_processo) 
DO UPDATE SET 
    prazo_minimo_horas = EXCLUDED.prazo_minimo_horas,
    prazo_ideal_horas = EXCLUDED.prazo_ideal_horas;
```

### 2. Consultar Eventos de Planejamento

```sql
-- Listar eventos de um gestor
SELECT 
    tipo_evento,
    etapa_processo,
    motivo,
    antecedencia_horas,
    violou_sla,
    data_evento
FROM financeiro.eventos_planejamento
WHERE company_id = 'uuid-da-empresa'
  AND gestor_id = 'uuid-do-gestor'
  AND data_evento >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY data_evento DESC;
```

### 3. Calcular KPIs de um Gestor

```sql
-- Calcular KPIs para o último mês
SELECT financeiro.calcular_kpis_planejamento_gestor(
    'uuid-da-empresa',
    'uuid-do-gestor',
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE
);

-- Consultar KPIs calculados
SELECT 
    gestor_nome,
    periodo_inicio,
    periodo_fim,
    total_operacoes,
    operacoes_urgentes,
    percentual_operacoes_urgentes,
    tempo_medio_antecedencia_dias,
    total_violacoes_sla,
    percentual_violacoes_sla
FROM financeiro.kpis_planejamento_gestor
WHERE company_id = 'uuid-da-empresa'
  AND gestor_id = 'uuid-do-gestor'
ORDER BY periodo_fim DESC;
```

### 4. Criar SLAs Padrão para Nova Empresa

```sql
-- Criar SLAs padrão
SELECT financeiro.criar_slas_padrao('uuid-da-empresa');
```

---

## 🔍 DETALHES TÉCNICOS

### Verificação de Violação de SLA

O sistema verifica automaticamente se um evento violou o SLA:

1. Busca o SLA configurado para a etapa
2. Calcula a antecedência (se houver datas)
3. Compara com o `prazo_minimo_horas` configurado
4. Se `antecedencia_horas < prazo_minimo_horas`, marca como violação

### Cálculo de Antecedência

A antecedência é calculada como:
```
antecedencia_horas = (data_necessidade - data_solicitacao) em horas
```

- **Positivo**: Com antecedência
- **Negativo**: Sem antecedência (urgente)
- **NULL**: Não foi possível calcular (faltam datas)

### Identificação do Gestor

O gestor responsável é identificado por:
- **Contas a Pagar**: `created_by` (usuário que criou)
- **Requisições de Compra**: `solicitante_id` (solicitante)
- **Outros**: Pode ser necessário configurar manualmente

---

## ⚠️ OBSERVAÇÕES IMPORTANTES

### 1. Medições (BM - Boletim de Medição)
- ⚠️ **Ainda não implementado** o trigger para detectar medições fora da janela
- Necessário identificar onde as medições são enviadas no sistema
- Quando identificado, adicionar trigger similar aos outros

### 2. Eventos Manuais
- Eventos podem ser registrados manualmente usando `registrar_evento_planejamento()`
- Útil para casos especiais ou integrações futuras

### 3. Performance
- Os triggers são executados automaticamente em INSERT/UPDATE
- Para grandes volumes, considerar processamento em lote
- Os KPIs são calculados sob demanda (não automático)

### 4. Atualização de KPIs
- Os KPIs devem ser recalculados periodicamente
- Pode ser feito via job agendado ou manualmente
- Recomendado recalcular mensalmente ou quando necessário

---

## 📈 PRÓXIMOS PASSOS (Futuro)

1. **Dashboard de Governança**
   - Interface visual para visualizar KPIs
   - Gráficos de tendências
   - Filtros por gestor, período, tipo de evento

2. **Relatórios**
   - Relatório de violações de SLA
   - Relatório de operações urgentes por gestor
   - Relatório de tempo médio de antecedência

3. **Notificações**
   - Alertas quando gestor viola SLA
   - Notificações para diretoria sobre tendências

4. **Integração com Medições**
   - Identificar onde medições são enviadas
   - Implementar trigger de detecção

5. **Métricas Adicionais**
   - Comparação entre gestores
   - Ranking de organização
   - Tendências históricas

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [x] Estrutura de dados (tabelas, tipos, índices)
- [x] Triggers de detecção automática
- [x] Funções de cálculo de KPIs
- [x] Função de registro manual de eventos
- [x] Políticas RLS (segurança)
- [x] Função de criação de SLAs padrão
- [ ] Dashboard/Interface (futuro)
- [ ] Relatórios (futuro)
- [ ] Integração com medições (pendente identificação)

---

## 📝 CONCLUSÃO

A estrutura base do módulo M7 está **100% implementada** e funcional. O sistema agora:

✅ Detecta automaticamente pagamentos "para hoje"  
✅ Detecta automaticamente compras urgentes  
✅ Registra eventos com gestor, etapa e motivo  
✅ Verifica violações de SLA automaticamente  
✅ Calcula KPIs de planejamento por gestor  
✅ Permite configuração de SLAs por etapa  

**Próximo passo**: Criar interface/dashboard para visualização dos dados e implementar detecção de medições quando identificado onde são enviadas.
