# Análise no banco – erro 22003 ao aprovar correção de ponto

**Data:** 03/02/2026  
**Conexão:** Supabase CLI / psql (db.wmtftyaqucwfsnnjepiy.supabase.co)

---

## 1. Verificações realizadas no banco

### 1.1 Migrações aplicadas
- Tabela `supabase_migrations.schema_migrations`: últimas versões listadas são **20241209*** (apenas 4 linhas). As migrações locais **20260203000001** e **20260203000002** não aparecem nessa tabela (podem ter sido aplicadas manualmente ou em outro fluxo).

### 1.2 Funções no schema `rh`
- **recalculate_time_record_hours**: contém a string `LEAST(99.99` (clamp presente na definição).
- **calculate_overtime_by_scale**: contém a string `LEAST(99.99` (clamp presente na definição).

### 1.3 Reprodução do erro
Chamada executada no banco:

```sql
SET request.jwt.claim.sub = 'a81daf27-f713-4a6c-9c50-d9c3a4664e51';
SELECT approve_attendance_correction(
  '5198c17c-4624-4f11-8651-29b45f02cfc7'::uuid,
  'a81daf27-f713-4a6c-9c50-d9c3a4664e51'::uuid,
  'teste'
);
```

**Erro obtido:**

```
ERROR:  numeric field overflow
DETALHE:  A field with precision 4, scale 2 must round to an absolute value less than 10^2.
CONTEXTO:  PL/pgSQL function rh.recalculate_time_record_hours(uuid) line 149 at assignment
SQL statement "SELECT rh.recalculate_time_record_hours(v_id)"
PL/pgSQL function rh.trg_time_record_events_recalc() line 4 at PERFORM
SQL statement "INSERT INTO rh.time_record_events (..., 'saida', (v_saida_date + v_correction.saida_corrigida)::timestamptz, ...)
      ON CONFLICT DO NOTHING"
PL/pgSQL function approve_attendance_correction(uuid,uuid,text) line 204 at SQL statement
```

### 1.4 Causa raiz identificada
- O overflow ocorre **na atribuição** a uma variável (linha 149 de `recalculate_time_record_hours`), **não** no `UPDATE` da tabela.
- As variáveis de horas (`v_horas_trabalhadas`, `v_horas_faltas`, `v_horas_noturnas`, `v_diferenca_horas`, etc.) estavam declaradas como **numeric(4,2)**.
- Em cenários com eventos parciais ou diferença grande de timestamps, a expressão (ex.: `ROUND(EXTRACT(EPOCH FROM (...)) / 3600, 2)`) pode gerar valor com módulo ≥ 100.
- Em PL/pgSQL, ao atribuir a uma variável `numeric(4,2)`, o valor é convertido para esse tipo; se o valor não couber, ocorre **numeric field overflow** na própria atribuição, antes de qualquer clamp que esteja mais abaixo no código.

Conclusão: o clamp que existia **antes do UPDATE** não evita o erro, porque o estouro já acontece em uma atribuição anterior (linha 149) a uma variável `numeric(4,2)`.

---

## 2. Correção aplicada no código (migração 20260203000001)

Foi alterada a migração **20260203000001_fix_recalculate_numeric_overflow.sql**:

- **Antes:** variáveis de horas declaradas como `numeric(4,2)`.
- **Depois:** variáveis de horas usadas nos cálculos declaradas como **numeric(10,2)**:
  - `v_horas_faltas`
  - `v_horas_trabalhadas`
  - `v_horas_diarias`
  - `v_horas_extra_window`
  - `v_diferenca_horas`
  - `v_horas_noturnas`

Assim:
- Os cálculos intermediários podem gerar valores fora do intervalo ±99,99 sem causar overflow.
- O **clamp** (LEAST/GREATEST) **antes do UPDATE** é mantido, garantindo que apenas valores no intervalo permitido por **numeric(4,2)** sejam gravados em `rh.time_records`.

---

## 3. O que fazer no banco

1. **Reaplicar a migração 20260203000001** (função `rh.recalculate_time_record_hours` com variáveis em `numeric(10,2)` e clamp antes do UPDATE).
2. Opcional: garantir que **20260203000002** (clamp em `calculate_overtime_by_scale`) também esteja aplicada.

Exemplo via psql:

```bash
psql "postgresql://postgres:SENHA@db.wmtftyaqucwfsnnjepiy.supabase.co:5432/postgres" -f supabase/migrations/20260203000001_fix_recalculate_numeric_overflow.sql
```

Depois disso, rodar novamente a aprovação da correção `5198c17c-4624-4f11-8651-29b45f02cfc7` (pela aplicação ou pelo mesmo `SELECT approve_attendance_correction(...)` no banco) para validar.
