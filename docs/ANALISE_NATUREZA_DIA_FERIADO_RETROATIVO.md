# Análise: Natureza do Dia e Feriado Retroativo

## Problema

Na empresa **SMARTVIEW** foi cadastrado feriado em **01/01/2026**. Na página **rh/time-records**, aba **Resumo por Funcionário**, a natureza do dia para a funcionária **LUANA DA CRUZ DA SILVA** não aparecia como **Feriado**.

## Diagnóstico no banco (Supabase)

- **SMARTVIEW**: `company_id` = `f83704f6-3278-4d59-81ca-45925a1ab855`
- **Feriado 01/01/2026** para SMARTVIEW: cadastrado e ativo ("Ano Novo")
- **LUANA**: `employee_id` = `b871e055-a05e-4c4e-a6b2-4226ece04c24`, sem registro em `time_records` e sem override em `time_record_day_nature_override` em 01/01/2026

Conclusão: 01/01/2026 é dia útil (quinta-feira). Sem registro de ponto, o sistema criava um **registro virtual do tipo "falta"**. Esse registro recebia `is_feriado: true` (via `dayInfo.isHoliday`), mas em `getDayNatureFromRecord` o tipo "falta" era retornado **antes** de verificar `is_feriado`, então a interface exibia "Falta" em vez de "Feriado".

## Regras de negócio

1. **Feriado retroativo**: ao cadastrar um feriado, a natureza do dia deve ser **Feriado** mesmo para datas passadas, para todos os colaboradores da empresa naquela data.
2. **Não sobrepor registro de ponto**: dias com **registro de ponto** (entrada/saída) devem **sempre** ser tratados como **Normal** — a natureza não pode ser alterada para Feriado/DSR/etc. nesses dias.

## Prioridade da natureza do dia

Ordem de prioridade (maior → menor) para exibição e cálculos:

1. **Normal** – quando há registro de ponto (prioridade total)
2. **Férias**
3. **Atestado**
4. **Feriado**
5. **Folga**
6. **Folga Débito**
7. **Falta**
8. **Compensação**
9. **DSR**
10. **Outros**

## Alterações realizadas

### 1. `timeRecordReportService.ts`

- **Registro virtual "feriado"**: quando o dia é feriado da empresa (`dayInfo.isHoliday`) e **não há** registro de ponto, é criado um registro virtual do tipo **feriado** (em vez de falta ou DSR). Assim, 01/01/2026 para LUANA passa a ser exibido como "Feriado".
- **Prioridade em `getDayNatureFromRecord`**: ajustada para refletir a ordem acima; **com registro de ponto** retorna sempre `'normal'`; **feriado** passa a vir antes de falta e DSR.
- **Constante `DAY_NATURE_PRIORITY_ORDER`**: criada para documentar e eventual uso futuro da ordem de prioridade.

### 2. `TimeRecordsPageNew.tsx` (Resumo por Funcionário)

- **Dia com ponto = Normal**: ao calcular `natureValue` (override, banco ou detecção), se o registro tem `entrada` ou `saída`, a natureza usada é sempre **normal**, garantindo que feriado/override não sobreponha dia com ponto.
- **Totais (horas negativas, saldo)**: a mesma regra é aplicada nos reduces que calculam totais por funcionário, para que dias com ponto não entrem como débito por natureza equivocada.
- **Virtual feriado**: reconhecido também por `record.id.includes('-feriado')` para exibir corretamente o label "Feriado".

### 3. Script de diagnóstico

- **`scripts/diagnostico_feriado_smartview_luana_01_01_2026.sql`**: script para conferir empresa SMARTVIEW, feriado 01/01/2026, funcionária LUANA, `time_records` e overrides (uso: `psql` com `--db-url` do projeto).

## Como validar

1. Empresa **SMARTVIEW**, mês **Janeiro/2026**, aba **Resumo por Funcionário**.
2. Para **LUANA DA CRUZ DA SILVA**, o dia **01/01/2026** deve aparecer como **Feriado** (fundo rosa, label "Feriado").
3. Se um colaborador tiver **registro de ponto** em um dia que seja feriado, o dia deve continuar como **Normal** (não mudar para Feriado).
