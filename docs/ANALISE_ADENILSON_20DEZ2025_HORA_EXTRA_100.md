# Análise: Hora extra 100% em 20/12/2025 – ADENILSON LIMA DOS SANTOS (AXISENG)

## Pergunta

Na página **rh/time-records**, aba **Resumo por Funcionário**, o funcionário **ADENILSON LIMA DOS SANTOS** (empresa **AXISENG**) na data **20/12/2025** aparece com **+0h25 de hora extra 100%**. Como 20/12/2025 não foi domingo nem feriado, por que contou 100%?

---

## Resposta direta

O sistema contou **100%** porque, **na época em que o registro foi calculado**, o dia 20/12/2025 (sábado) foi tratado como **dia de folga** do funcionário (`is_dia_folga = true`).  
Na escala **6x1**, dia de folga trabalhado gera hora extra 100%.  
Esse “dia de folga” para 20/12 veio de uma **lógica antiga** de `is_rest_day`, que usava só **dias da semana** do turno. O turno “Escala 6x1 Fixa” está com **dias_semana = {1,2,3,4,5}** (segunda a sexta). Na lógica antiga, **qualquer sábado ou domingo** era considerado folga para esse turno, o que está **errado** para 6x1 (onde a folga deve ser 1 dia a cada 7, por ciclo, não “todo sábado/domingo”).  
Com a **lógica atual** (ciclo rotativo), 20/12/2025 é **dia de trabalho** (posição 2 no ciclo de 7 dias). Ou seja: o correto seria **50%** (banco de horas), não 100%.

---

## Dados consultados no banco (Supabase)

### Empresa e funcionário

- **Empresa:** AXISENG – `company_id = dc060329-50cd-4114-922f-624a6ab036d6`
- **Funcionário:** ADENILSON LIMA DOS SANTOS – `employee_id = 0e5e272a-4373-4fa7-a9ec-38e27c00fb55`

### Registro de ponto em 20/12/2025

| Campo               | Valor   |
|---------------------|---------|
| data_registro       | 2025-12-20 |
| horas_trabalhadas   | 7,75    |
| horas_extras_50     | 0,00    |
| horas_extras_100    | 0,42 (~0h25) |
| is_feriado          | false   |
| is_domingo          | false   |
| is_dia_folga        | **true** |
| DOW (PostgreSQL)    | 6 (sábado) |

### Turno do funcionário (work_shift)

- **Turno:** Escala 6x1 Fixa – `work_shift_id = 8d8466e0-77a6-4a29-9a2c-78c6113421a6`
- **tipo_escala:** `flexivel_6x1`
- **horas_diarias:** 7,33
- **dias_trabalho / dias_folga / ciclo_dias:** 6, 1, 7
- **dias_semana:** **{1, 2, 3, 4, 5}** (apenas segunda a sexta)

### Feriados

- Nenhum feriado cadastrado para a empresa AXISENG em 20/12/2025.

### Vínculo (employee_shift) em 20/12/2025

- **data_inicio:** 2025-09-05
- **dias_desde_inicio em 20/12:** 106
- **posição no ciclo (1 a 7):** (106 % 7) + 1 = **2** → dia **de trabalho** no ciclo 6x1.

### Função `is_rest_day` atual

- Para 20/12/2025, com o ciclo acima: **`rh.is_rest_day(...)` retorna false** (não é dia de folga).

Ou seja: **hoje** o sistema considera 20/12 como dia de trabalho; **no registro** está gravado como dia de folga e 100%.

---

## Regras de negócio no código (resumo)

Arquivo: `supabase/migrations/20260128000010_improve_calculate_night_hours.sql` – função `rh.calculate_overtime_by_scale`:

1. **Feriado:** todas as horas trabalhadas → 100%.
2. **Escala 12x36:** excedente acima de 12h → 50% (banco).
3. **Escala flexivel_6x1:**  
   - Se **dia de folga** (`is_dia_folga`) → excedente em **100%**.  
   - Caso contrário → excedente em **50%** (banco).
4. **Escala fixa (5x2) ou outras:**  
   - Se **domingo** (`is_domingo`) → excedente em **100%**.  
   - Caso contrário (incl. sábado) → excedente em **50%**.

O valor de **is_dia_folga** vem de **`rh.is_rest_day(employee_id, company_id, data_registro)`**.

---

## Causa raiz: lógica antiga de `is_rest_day`

### Comportamento antigo (até migração 20260110000001)

- Função `rh.is_rest_day` (criada em `20250120000027_create_clt_bank_hours_system.sql`) usava **apenas** o array **dias_semana** do turno.
- Não havia lógica de **ciclo rotativo** para escala 6x1.
- Cálculo: “folga” = dia da semana **não** está em `dias_semana`.

Para o turno “Escala 6x1 Fixa” com **dias_semana = {1,2,3,4,5}**:

- 20/12/2025 = sábado → `EXTRACT(DOW)` = 6 (mapeado como 6 no código).
- 6 **não** está em {1,2,3,4,5} → **is_rest_day = true** → gravado **is_dia_folga = true** → hora extra em **100%**.

Ou seja: na lógica antiga, **todo sábado e todo domingo** eram considerados “dia de folga” para esse turno, o que não reflete a escala 6x1 (onde a folga é 1 dia a cada 7, definido pelo ciclo).

### Comportamento atual (a partir de 20260110000001)

- Migração `20260110000001_fix_is_rest_day_rotative_scales.sql` passou a tratar **escalas rotativas** (ex.: flexivel_6x1) por **ciclo** (data_inicio, dias_trabalho, dias_folga, ciclo_dias).
- Para 20/12/2025, com **data_inicio = 2025-09-05** e ciclo 7 dias (6 trabalho + 1 folga), a posição no ciclo é **2** → **dia de trabalho** → **is_rest_day = false**.

Por isso, **se o registro for recalculado hoje**, 20/12 passaria a ter:
- **is_dia_folga = false**
- **horas_extras_100 = 0**
- **horas_extras_50 = 0,42** (0h25 no banco de horas).

---

## Conclusão

| Item | Conteúdo |
|------|----------|
| **Por que apareceu 100%?** | Porque o registro foi calculado quando a função `is_rest_day` ainda usava só **dias_semana**. Com o turno tendo dias_semana = {1,2,3,4,5}, todo **sábado** era tratado como dia de folga → 100%. |
| **20/12 é domingo ou feriado?** | Não. É sábado e não há feriado para AXISENG nessa data. |
| **Comportamento correto para 6x1?** | 20/12/2025 é **dia de trabalho** no ciclo (posição 2). O correto é **50%** (banco de horas), não 100%. |
| **Recomendações** | (1) Recalcular este registro (e, se desejado, outros do mesmo período/turno) com a função atual para corrigir is_dia_folga e horas_extras_50/100. (2) Opcional: revisar se o turno “Escala 6x1 Fixa” deve manter dias_semana = {1,2,3,4,5} ou se isso é apenas legado; para 6x1 a folga deve vir do ciclo, não do dia da semana. |

---

## Script de análise no banco

As consultas usadas nesta análise estão em:

- `scripts/analise_adenilson_20dez2025.sql`

Para recalcular apenas este registro (após validar em homologação):

```sql
SELECT rh.calculate_overtime_by_scale(tr.id)
FROM rh.time_records tr
JOIN rh.employees e ON e.id = tr.employee_id
WHERE e.nome ILIKE '%ADENILSON%LIMA%'
  AND tr.company_id = 'dc060329-50cd-4114-922f-624a6ab036d6'
  AND tr.data_registro::date = '2025-12-20';
```

Depois disso, o registro deve passar a exibir **+0h25 em extras 50%** (banco) e **0h em extras 100%**.
