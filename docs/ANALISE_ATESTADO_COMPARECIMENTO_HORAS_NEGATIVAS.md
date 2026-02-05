# Análise: Atestado de Comparecimento não Reduz Horas Negativas

## Data: 2026-02-05

## Problema Reportado
O funcionário "GLEIDSON SACRAMENTO DOS SANTOS" enviou um atestado médico de comparecimento de 3,35h referente ao dia 04/02/2026, mas na página "rh/time-records" aba "Resumo por Funcionário" esse dia está mostrando -8h00 horas negativas. O esperado seria reduzir as horas negativas pelo valor do atestado: -8:00 + 3:35 = -4:65.

## Análise do Problema

### Dados Encontrados no Banco
- **Funcionário**: GLEIDSON SACRAMENTO DOS SANTOS (ID: `4a543b0d-888d-4ff5-8287-f9401bbe381f`)
- **Atestado**: ID `0a97b7fc-7033-472b-9e80-6c9dbf095027`
  - Data: 04/02/2026
  - Tipo: Atestado de comparecimento (`atestado_comparecimento = true`)
  - Horas: 3,35h (`horas_comparecimento = 3.35`)
  - Status: **PENDENTE** (não aprovado)
- **Registro de Ponto**: Não existe registro de ponto para o dia 04/02/2026

### Causa Raiz Identificada

1. **RPC get_entity_data não suporta filtro com array**: Ao passar `status: ['aprovado', 'em_andamento', 'concluido', 'pendente']` para `EntityService.list`, o backend usa a função `get_entity_data`, que aplica filtros com igualdade (`coluna = valor`). O valor do array é serializado como string (ex.: `'["aprovado","pendente",...]'`), então a condição `status = '["aprovado",...]'` não corresponde a nenhuma linha. **Nenhum atestado era retornado**, e o dia 04/02 nunca era marcado como atestado.

2. **Registros Virtuais de Falta**: Quando não há registro de ponto e nenhum atestado é detectado (por causa do item 1), a função `completeRecordsWithRestDays` cria um registro virtual de "falta" com 8h negativas.

3. **Falta de Informações de Comparecimento**: A interface `DayInfo` não armazenava informações sobre atestados de comparecimento (horas_comparecimento), então não era possível ajustar as horas negativas.

4. **Função do Banco Limitada**: A função `adjust_negative_hours_for_medical_certificate` só funcionava para registros com status `'aprovado'`, não considerando registros `'pendente'`.

## Correções Implementadas

### 1. Busca de atestados sem filtro de status + filtro no frontend (`src/services/rh/timeRecordReportService.ts`)

**Problema:** A RPC `get_entity_data` não suporta filtro com array; ao passar `status: ['aprovado', 'pendente', ...]` nenhum atestado era retornado.

**Solução:**
- Buscar atestados apenas por `employee_id` (sem filtro de status).
- Filtrar no frontend para manter apenas status em `['aprovado', 'em_andamento', 'concluido', 'pendente']`.
- Mesma lógica aplicada às férias (filtrar por status após buscar).

### 2. Armazenamento de Informações de Comparecimento

Adicionados campos à interface `DayInfo`:
```typescript
export interface DayInfo {
  // ... campos existentes
  medicalCertificateHours?: number; // Horas de comparecimento do atestado
  isMedicalCertificateAttendance?: boolean; // Indica se é atestado de comparecimento
}
```

### 3. Ajuste de Horas Negativas em Registros Existentes

Quando já existe um registro de ponto com horas negativas e há atestado de comparecimento:
```typescript
if (dayInfo.isMedicalCertificateAttendance && 
    dayInfo.medicalCertificateHours && 
    existingRecord.horas_negativas && 
    existingRecord.horas_negativas > 0) {
  const horasNegativasAjustadas = Math.max(0, existingRecord.horas_negativas - dayInfo.medicalCertificateHours);
  // Ajustar registro
}
```

### 4. Prevenção de Criação de Falta com Atestado Pendente

Quando não há registro de ponto mas há atestado de comparecimento pendente:
- **Antes**: Criava registro virtual de "falta" com 8h negativas
- **Depois**: Cria registro virtual de "atestado" sem horas negativas (ou com horas reduzidas se houver registro)

### 5. Ajuste na Função do Banco (`supabase/migrations/20260204000001_ensure_medical_certificates_no_bank_hours_impact.sql`)

A função agora considera registros pendentes também:
```sql
-- Antes: AND status = 'aprovado'
-- Depois: AND status IN ('aprovado', 'pendente')
```

## Comportamento Esperado Após Correções

### Cenário 1: Atestado Pendente, Sem Registro de Ponto
- **Antes**: Criava falta virtual com -8h00
- **Depois**: Cria registro virtual de atestado sem horas negativas

### Cenário 2: Atestado Pendente, Com Registro de Ponto com Horas Negativas
- **Antes**: Mostrava -8h00 (não considerava atestado)
- **Depois**: Mostra -4,65h (-8h00 - 3,35h = -4,65h)

### Cenário 3: Atestado Aprovado, Com Registro de Ponto
- A função do banco `adjust_negative_hours_for_medical_certificate` ajusta automaticamente as horas negativas

## Arquivos Modificados

1. `src/services/rh/timeRecordReportService.ts`
   - Interface `DayInfo` expandida
   - Função `getMonthDaysInfo` atualizada para incluir pendentes
   - Função `completeRecordsWithRestDays` ajustada para considerar comparecimento

2. `supabase/migrations/20260204000001_ensure_medical_certificates_no_bank_hours_impact.sql`
   - Função `adjust_negative_hours_for_medical_certificate` atualizada para considerar registros pendentes

## Testes Recomendados

1. ✅ Verificar se atestados pendentes aparecem corretamente na interface
2. ✅ Verificar se horas negativas são reduzidas quando há atestado de comparecimento pendente
3. ✅ Verificar se após aprovar o atestado, as horas negativas são ajustadas corretamente
4. ✅ Verificar se registros virtuais de atestado não têm horas negativas quando não há registro de ponto

## Observações

- A correção funciona tanto para atestados pendentes quanto aprovados
- Quando o atestado for aprovado, a função do banco ajustará automaticamente se houver registro de ponto
- Registros virtuais são apenas para exibição na interface e não afetam cálculos no banco
