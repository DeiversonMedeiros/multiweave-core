# Análise: Natureza do Dia e persistência no banco de dados

## Onde os dados são salvos hoje

Atualmente, as alterações manuais de **Natureza do Dia** na aba "Resumo por Funcionário" (time-records) são guardadas **apenas em estado do React** (`dayNatureOverrides` em `TimeRecordsPageNew.tsx`):

- **Chave:** `{employeeId}-{dataRegistro}` (ex.: `uuid-func-2025-01-15`)
- **Valor:** um dos tipos: `normal`, `dsr`, `folga`, `feriado`, `ferias`, `atestado`, `compensacao`, `falta`, `outros`

**Consequências:**

1. **Não persistem:** ao recarregar a página ou trocar de aba, todas as alterações manuais são perdidas.
2. **Não aparecem no PDF/CSV** a menos que o usuário altere e baixe na mesma sessão (os overrides da sessão são enviados na geração do relatório).
3. **Não há histórico** nem uso em outras telas ou integrações.

Por isso, **persistir no banco é a abordagem correta**.

---

## Análise do banco (Supabase CLI)

### Conexão utilizada

- **Host:** db.wmtftyaqucwfsnnjepiy.supabase.co  
- **Porta:** 5432  
- **Database:** postgres  
- **Schema analisado:** `rh` (dump completo do schema)

### Tabela `rh.time_records` (estrutura atual)

A tabela de registros de ponto já possui campos relacionados ao “tipo de dia”:

| Coluna         | Tipo    | Descrição                          |
|----------------|---------|------------------------------------|
| `is_feriado`   | boolean | Indica se o dia é feriado          |
| `is_domingo`   | boolean | Indica se o dia é domingo          |
| `is_dia_folga` | boolean | Indica se é dia de folga do funcionário |

Ela **não** possui um único campo que represente a “natureza do dia” (Normal, DSR, Folga, Feriado, Férias, Atestado, Compensação, Falta, Outros), que é o que a interface e o relatório precisam.

### Registros “reais” vs “virtuais”

- **Registros reais:** têm linha em `rh.time_records` (uma por `employee_id` + `data_registro`). Podem receber a nova coluna `natureza_dia`.
- **Registros virtuais:** não existem em `time_records`; são montados no frontend/serviço (DSR, Férias, Atestado, Compensação, Falta) a partir de escalas, férias, atestados, etc. Para persistir alterações manuais nesses dias, é necessário uma tabela auxiliar de **override por data**.

---

## Recomendações implementadas

### 1. Coluna `natureza_dia` em `rh.time_records`

- **Tipo:** `VARCHAR(20)` (ou equivalente), opcional (`NULL` permitido).
- **Valores permitidos:** `normal`, `dsr`, `folga`, `feriado`, `ferias`, `atestado`, `compensacao`, `falta`, `outros`.
- **Uso:** para registros **reais**, o valor manual fica nessa coluna; quando `NULL`, o sistema continua usando a detecção automática (como hoje).

### 2. Tabela `rh.time_record_day_nature_override`

- **Propósito:** guardar natureza do dia **manual** para dias que **não** têm registro em `time_records` (dias virtuais: DSR, Férias, Atestado, etc.).
- **Chave natural:** `(employee_id, company_id, data_registro)` — uma natureza por funcionário, empresa e data.
- **Coluna:** `natureza_dia` com os mesmos valores da coluna em `time_records`.

Assim:

- **Registro real:** lê/grava `time_records.natureza_dia`.
- **Registro virtual:** lê/grava `time_record_day_nature_override` para aquela `(employee_id, company_id, data_registro)`.

### 3. Migração

Foi criada a migração:

- `supabase/migrations/20260202000001_add_natureza_dia_to_time_records.sql`

Ela:

1. Adiciona `natureza_dia` em `rh.time_records` com `CHECK` nos valores permitidos.
2. Cria `rh.time_record_day_nature_override` com `UNIQUE(employee_id, company_id, data_registro)`.
3. Configura RLS e grants para a tabela de override.
4. Atualiza a função `public.get_time_records_paginated` para incluir a coluna `natureza_dia` no retorno (aba Resumo e relatórios passam a receber o valor do banco).

**Não foi aplicada migração no ambiente remoto** (conforme orientação: “não faça migrações”); o arquivo fica no projeto para você aplicar quando quiser.

---

## Comandos Supabase CLI utilizados na análise

1. **Dump apenas dados do schema `public`:**
   ```bash
   supabase db dump --db-url "postgresql://postgres:***@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres" --schema public --data-only
   ```

2. **Dump completo do schema `rh` (estrutura + dados) para arquivo:**
   ```bash
   supabase db dump --db-url "postgresql://postgres:***@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres" -s rh -f rh_dump.sql
   ```

O arquivo `rh_dump.sql` foi usado para conferir a estrutura atual de `rh.time_records` e das FKs/índices antes de definir a migração.

---

## Próximos passos (após aplicar a migração)

1. **Aplicar a migração** no ambiente (ex.: `supabase db push` ou executando o SQL da migração manualmente).

2. **Frontend (já ajustado):**  
   - **Registros reais:** usa `record.natureza_dia` do banco; ao alterar no Select, chama update em `rh.time_records` e invalida a query.  
   - **Registros virtuais:** continuam com override apenas em estado local; para persistir, expor API de `time_record_day_nature_override`.

3. **PDF/CSV:**  
   - Usar sempre o valor persistido (quando existir) ao montar a coluna “Natureza do Dia” nos relatórios.

Com isso, a natureza do dia fica persistida no banco para registros reais; dias virtuais seguem com override em memória até integrar a tabela de override.
