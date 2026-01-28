# Plano de Ação - Correções de Cálculos

**Data:** 2026-01-28  
**Versão:** 1.0

## 🎯 Objetivo

Corrigir funções de cálculo que não consideram datas reais dos eventos quando registros cruzam meia-noite, garantindo que:
- Horas trabalhadas sejam calculadas corretamente
- Horas extras (50% e 100%) sejam calculadas corretamente
- Horas negativas sejam calculadas corretamente
- Adicional noturno seja calculado corretamente
- Banco de horas agregue corretamente

---

## 📅 Cronograma

### Semana 1: Correções Críticas

**Dia 1-2: Análise e Planejamento**
- [ ] Revisar análise completa
- [ ] Validar cenários de teste
- [ ] Criar scripts de teste

**Dia 3-4: Implementação Fase 1**
- [ ] Criar migração `20260128000009_fix_recalculate_use_real_dates.sql`
- [ ] Implementar correção em `recalculate_time_record_hours`
- [ ] Testes unitários

**Dia 5: Validação Fase 1**
- [ ] Testes de integração
- [ ] Validação com dados reais
- [ ] Ajustes se necessário

### Semana 2: Ajustes e Validação

**Dia 6-7: Implementação Fase 2**
- [ ] Melhorar `calculate_night_hours`
- [ ] Verificar funções de banco de horas
- [ ] Testes

**Dia 8-9: Validação Completa**
- [ ] Testes de regressão
- [ ] Validação com usuários
- [ ] Documentação

**Dia 10: Deploy**
- [ ] Deploy em produção
- [ ] Monitoramento
- [ ] Ajustes pós-deploy se necessário

---

## 🔧 Detalhamento Técnico

### Migração 1: `20260128000009_fix_recalculate_use_real_dates.sql`

**Objetivo:** Corrigir `recalculate_time_record_hours` para usar `event_at` completo

**Mudanças:**
1. Buscar `event_at` (TIMESTAMPTZ) diretamente, não apenas TIME
2. Usar `event_at` nos cálculos de horas trabalhadas
3. Fallback para campos `*_date` quando eventos não existirem
4. Fallback final para lógica atual (compatibilidade)

**Testes Necessários:**
- Registro normal (mesmo dia)
- Registro que cruza meia-noite
- Registro com almoço que cruza meia-noite
- Registro sem eventos (fallback)

### Migração 2: `20260128000010_improve_calculate_night_hours.sql`

**Objetivo:** Melhorar `calculate_night_hours` para aceitar datas explícitas

**Mudanças:**
1. Adicionar parâmetros opcionais `p_entrada_date` e `p_saida_date`
2. Usar datas quando fornecidas
3. Manter lógica de detecção como fallback
4. Atualizar chamadas para passar datas quando disponíveis

### Migração 3: `20260128000011_fix_bank_hours_aggregation.sql`

**Objetivo:** Garantir que banco de horas agrega corretamente

**Mudanças:**
1. Verificar filtros por `data_registro`
2. Considerar usar `time_record_events.event_at` para filtro mais preciso
3. Testar com registros que cruzam meia-noite

---

## ✅ Critérios de Aceitação

### Correção 1: `recalculate_time_record_hours`
- [ ] Calcula corretamente horas trabalhadas quando entrada e saída estão em dias diferentes
- [ ] Calcula corretamente almoço quando cruza meia-noite
- [ ] Mantém compatibilidade com registros antigos sem eventos
- [ ] Performance aceitável (< 100ms por registro)

### Correção 2: `calculate_night_hours`
- [ ] Calcula corretamente quando datas explícitas são fornecidas
- [ ] Mantém lógica de detecção como fallback
- [ ] Funciona para todos os cenários de trabalho noturno

### Correção 3: Banco de Horas
- [ ] Agrega corretamente registros que cruzam meia-noite
- [ ] Saldo mensal correto
- [ ] Transações de banco de horas corretas

---

## 🧪 Scripts de Teste

### Teste 1: Registro Normal
```sql
-- Entrada: 27/01 08:00, Saída: 27/01 17:00
-- Esperado: 9 horas trabalhadas (descontando almoço se houver)
```

### Teste 2: Registro que Cruza Meia-Noite
```sql
-- Entrada: 27/01 21:24, Saída: 28/01 01:00
-- Esperado: ~3.6 horas trabalhadas
-- data_registro: 27/01 (agrupado pela janela)
```

### Teste 3: Registro com Almoço que Cruza Meia-Noite
```sql
-- Entrada: 27/01 21:24
-- Entrada Almoço: 27/01 23:09
-- Saída Almoço: 28/01 00:09
-- Saída: 28/01 02:00
-- Esperado: ~4.6 horas trabalhadas (descontando 1h de almoço)
```

### Teste 4: Horas Noturnas
```sql
-- Entrada: 27/01 22:00, Saída: 28/01 02:00
-- Esperado: 4 horas noturnas (22h-02h)
```

---

## 📝 Notas de Implementação

1. **Compatibilidade**: Manter compatibilidade com registros antigos
2. **Performance**: Adicionar índices se necessário
3. **Rollback**: Preparar script de rollback para cada migração
4. **Monitoramento**: Adicionar logs para debug inicial
5. **Validação**: Comparar resultados antes/depois para registros conhecidos

---

**Status:** 📋 Planejado  
**Próxima Ação:** Revisar e aprovar plano
