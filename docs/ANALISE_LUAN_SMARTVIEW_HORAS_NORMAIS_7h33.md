# Análise: Horas negativas indevidas – LUAN CLAUDIO (SMARTVIEW) – Escala 6x1 Fixa 7,33h

## Problema relatado

Na página **rh/time-records**, aba **Resumo por Funcionário**, o funcionário **LUAN CLAUDIO ALVES E SILVA DE ANDRADE LIMA** (SMARTVIEW, matrícula 05021) tem escala **Escala 6x1 Fixa** com **7,33 horas/dia**, mas o sistema está debitando **40 min** em dias em que ele trabalhou **7h20** (7,33h), principalmente em dias com natureza **Normal**.

## Análise no banco (Supabase CLI)

### 1. Dados do funcionário e do turno

| Campo | Valor |
|-------|--------|
| Empresa | SMARTVIEW (id `f83704f6-3278-4d59-81ca-45925a1ab855`) |
| Funcionário | LUAN CLAUDIO ALVES E SILVA DE ANDRADE LIMA (id `fc762aa3-4cf1-4d6b-a823-4260b2461822`) |
| Turno | Escala 6x1 Fixa (id `3d77e278-8c49-4d75-95dc-9469f277bd3b`) |
| **horas_diarias no turno** | **7,33** |
| **get_work_shift_hours_for_day(dia 3 e 6)** | **7,33** |

Ou seja: no banco, o turno e a função que devolve “horas esperadas por dia” estão corretos (**7,33**).

### 2. Registros com horas negativas em jan/2026

Foram listados **18** registros em janeiro/2026 com `horas_negativas > 0`. Em vários deles **horas_trabalhadas = 7,33** e mesmo assim **horas_negativas = 0,67** (≈ 40 min):

- **28/01/2026**: 7,33 h trabalhadas → **-0,67 h** (deveria ser 0)
- **31/01/2026**: 7,33 h trabalhadas → **-0,67 h** (deveria ser 0)

Ou seja: **7,33 + 0,67 = 8,00** — o cálculo que gerou esses valores usou **8 h** como carga esperada, não 7,33.

### 3. Simulação da lógica atual

Foi simulada no banco a mesma lógica usada em `calculate_overtime_by_scale` / `recalculate_time_record_hours`:

- **Após employee_shifts + work_shifts:** `horas_diarias = 7,33`
- **Após get_work_shift_hours_for_day:** `horas_diarias = 7,33`
- **Resultado final:** `horas_diarias = 7,33` (sem fallback para 8,0)

Conclusão: **hoje a função no banco está correta** e passa a usar **7,33** para esse turno e para esses dias.

### 4. Causa provável

Os registros com **-0,67 h** em dias “Normal” com **7,33 h trabalhadas** foram calculados em um momento em que:

1. **Ou** a versão da função ainda usava **8,0** como padrão quando não encontrava/considerava o turno corretamente (ex.: antes de usar `get_work_shift_hours_for_day` para todos os dias),  
2. **Ou** o turno “Escala 6x1 Fixa” ainda tinha **horas_diarias = 8** e só depois foi alterado para **7,33**.

Em ambos os casos, o que ficou gravado em `horas_negativas` reflete a regra antiga (8 h esperadas). A regra atual já está correta (7,33 h).

## Conclusão

- **Configuração atual no banco:** correta (turno 7,33 h, função retornando 7,33 para os dias verificados).
- **Problema:** valores **já persistidos** em `rh.time_records` (horas_negativas, etc.) que foram calculados com a regra antiga (8 h).
- **Solução:** **recalcular** os registros afetados com a função atual, para que passem a usar 7,33 h e as horas negativas indevidas sejam zeradas onde `horas_trabalhadas >= 7,33`.

## Como corrigir os dados

Recalcular os `time_records` do funcionário para janeiro/2026 (e, se quiser, outros períodos) chamando a função que já existe:

```sql
-- Recalcular todos os registros de jan/2026 do LUAN que têm horas_negativas
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tr.id
    FROM rh.time_records tr
    JOIN rh.employees e ON e.id = tr.employee_id
    WHERE e.id = 'fc762aa3-4cf1-4d6b-a823-4260b2461822'
      AND tr.data_registro >= '2026-01-01'
      AND tr.data_registro < '2026-02-01'
  LOOP
    PERFORM rh.recalculate_time_record_hours(r.id);
  END LOOP;
END $$;
```

Script pronto para uso: `scripts/recalculo_luan_smartview_jan2026.sql`.

Depois de rodar, conferir na aba **Resumo por Funcionário** os dias 28/01 e 31/01: **horas negativas** devem zerar quando **horas trabalhadas = 7h20** (7,33).
