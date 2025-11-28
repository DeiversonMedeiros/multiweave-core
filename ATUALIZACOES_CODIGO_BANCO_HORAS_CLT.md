# Atualizações Necessárias no Código - Banco de Horas CLT

## ✅ Migrações Aplicadas

As seguintes migrações foram aplicadas com sucesso no banco de dados:
- ✅ `20250120000026_fix_bank_hours_missing_time_records.sql`
- ✅ `20250120000027_create_clt_bank_hours_system.sql`

## 📋 Atualizações Necessárias no Código

### 1. Atualizar Tipo `TimeRecord` em `rh-types.ts`

**Arquivo:** `src/integrations/supabase/rh-types.ts`

**Adicionar campos:**
```typescript
export interface TimeRecord {
  // ... campos existentes ...
  horas_extras_50?: number;
  horas_extras_100?: number;
  horas_para_banco?: number;
  horas_para_pagamento?: number;
  is_feriado?: boolean;
  is_domingo?: boolean;
  is_dia_folga?: boolean;
}
```

### 2. Atualizar Páginas que Exibem Horas Extras

**Arquivos a atualizar:**
- `src/pages/rh/TimeRecordsPageNew.tsx`
- `src/pages/rh/TimeRecordsPage.tsx`
- `src/pages/portal-colaborador/HistoricoMarcacoesPage.tsx`
- `src/pages/portal-gestor/AcompanhamentoPonto.tsx`
- `src/pages/portal-gestor/AprovacaoHorasExtras.tsx`

**Mudança necessária:**
- Mostrar `horas_extras_50` e `horas_extras_100` separadamente
- Indicar quais horas vão para banco e quais são pagas
- Mostrar badges diferentes para cada tipo

**Exemplo de atualização:**
```typescript
// ANTES:
{record.horas_extras != null && Number(record.horas_extras) > 0 && (
  <div className="text-sm">
    <span className="text-gray-500">Extras: </span>
    <span className="font-medium text-orange-600">
      +{Number(record.horas_extras).toFixed(1)}h
    </span>
  </div>
)}

// DEPOIS:
{(record.horas_extras_50 || record.horas_extras_100) && (
  <div className="flex items-center gap-2 text-sm">
    {record.horas_extras_50 > 0 && (
      <Badge variant="outline" className="bg-blue-50 text-blue-700">
        +{record.horas_extras_50.toFixed(1)}h (50% - Banco)
      </Badge>
    )}
    {record.horas_extras_100 > 0 && (
      <Badge variant="outline" className="bg-orange-50 text-orange-700">
        +{record.horas_extras_100.toFixed(1)}h (100% - Pagamento)
      </Badge>
    )}
  </div>
)}
```

### 3. Atualizar Formulário de Registro de Ponto

**Arquivo:** `src/components/rh/TimeRecordForm.tsx`

**Mudança:**
- Remover campo `horas_extras` (agora é calculado automaticamente)
- Adicionar campos somente leitura para exibir `horas_extras_50` e `horas_extras_100`
- Mostrar informações sobre banco de horas

### 4. Atualizar Serviço de Cálculo de Folha

**Arquivo:** `src/services/rh/payrollService.ts`

**Mudança:**
- Usar `horas_para_pagamento` em vez de `horas_extras` para cálculo
- Considerar `horas_extras_100` sempre como pagamento direto
- Considerar `horas_extras_50` apenas se não tiver banco de horas

### 5. Atualizar Hook de Aprovação de Horas Extras

**Arquivo:** `src/hooks/rh/useOvertimeApprovals.ts`

**Mudança:**
- Considerar `horas_extras_50` e `horas_extras_100` separadamente
- Mostrar estatísticas separadas

### 6. Atualizar Tipos de Banco de Horas

**Arquivo:** `src/integrations/supabase/bank-hours-types.ts`

**Adicionar:**
```typescript
export interface BankHoursTransaction {
  // ... campos existentes ...
  overtime_percentage?: number; // 50 ou 100
  expires_at?: string;
  is_paid?: boolean;
  closure_id?: string;
}

export interface BankHoursClosure {
  id: string;
  employee_id: string;
  company_id: string;
  closure_date: string;
  period_start: string;
  period_end: string;
  positive_balance_paid: number;
  negative_balance_zeroed: number;
  total_hours_50_paid: number;
  total_hours_100_paid: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface PayrollOvertimeEvent {
  id: string;
  employee_id: string;
  company_id: string;
  closure_id?: string;
  payroll_period: string;
  event_date: string;
  hours_50_amount: number;
  hours_100_amount: number;
  total_value: number;
  status: 'pending' | 'processed' | 'paid' | 'cancelled';
  created_at: string;
  updated_at: string;
}
```

### 7. Criar Componente para Fechamento Semestral

**Novo arquivo:** `src/components/rh/BankHoursClosure.tsx`

**Funcionalidades:**
- Listar fechamentos semestrais
- Executar fechamento manual
- Visualizar detalhes do fechamento
- Ver eventos financeiros gerados

### 8. Atualizar Dashboard de Banco de Horas

**Arquivo:** `src/components/rh/BankHoursDashboard.tsx`

**Adicionar:**
- Seção de fechamentos semestrais
- Visualização de horas 50% vs 100%
- Gráficos de evolução do banco
- Alertas de expiração (6 meses)

### 9. Atualizar Página de Banco de Horas do Colaborador

**Arquivo:** `src/pages/portal-colaborador/BancoHorasPage.tsx`

**Adicionar:**
- Mostrar apenas horas que vão para banco (50%)
- Mostrar horas que são pagas (100%) separadamente
- Informações sobre validade de 6 meses
- Histórico de fechamentos

### 10. Atualizar Serviço de Time Records

**Arquivo:** `src/services/rh/timeRecordsService.ts`

**Mudança:**
- Mapear novos campos ao buscar registros
- Considerar `horas_para_banco` e `horas_para_pagamento`

## 🔄 Processamento Automático

O sistema já processa automaticamente quando:
- ✅ Um registro de ponto é aprovado (trigger `trg_calculate_overtime_on_approval`)
- ✅ As horas extras são calculadas conforme a escala
- ✅ As horas 50% são acumuladas no banco

**Não é necessário chamar manualmente** `calculate_overtime_by_scale` ou `process_daily_bank_hours` - isso acontece automaticamente.

## ⚠️ Compatibilidade

O campo `horas_extras` ainda existe e será mantido para compatibilidade, mas:
- **Novos registros**: Terão `horas_extras_50` e `horas_extras_100` calculados automaticamente
- **Registros antigos**: Continuarão usando apenas `horas_extras`
- **Recomendação**: Migrar registros antigos recalculando horas extras

## 📝 Próximos Passos

1. ✅ Atualizar tipos TypeScript
2. ✅ Atualizar páginas de exibição
3. ✅ Criar componente de fechamento semestral
4. ✅ Atualizar dashboard
5. ✅ Testar com dados reais

