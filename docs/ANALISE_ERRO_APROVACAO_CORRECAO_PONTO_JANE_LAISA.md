# Análise do erro 400 ao aprovar correção de ponto (jane.miranda → laisa.dias)

**Data:** 03/02/2026  
**Página:** portal-gestor/aprovacoes/correcoes-ponto  
**Aprovadora:** jane.miranda (JANE LILIAN SANTOS DE MIRANDA)  
**Correção:** da colaboradora laisa.dias (LAISA MIRANDA DA CRUZ DIAS)  
**Empresa da correção:** TECHSTEEL (ce92d32f-0503-43ca-b3cc-fb09a462b839)

---

## 1. Sintoma

- Ao clicar em aprovar, a RPC `approve_attendance_correction` retorna **HTTP 400**.
- No console: `Failed to load resource: the server responded with a status of 400` em  
  `.../rest/v1/rpc/approve_attendance_correction`.

---

## 2. Verificações realizadas

### 2.1 Permissão e acesso

- **jane.miranda** (`a81daf27-f713-4a6c-9c50-d9c3a4664e51`) tem vínculo em `user_companies` com a empresa **TECHSTEEL** (e também AXISENG, SMARTVIEW, ESTRATEGIC).
- A correção `5198c17c-4624-4f11-8651-29b45f02cfc7` é da empresa TECHSTEEL e está **pendente**.
- Conclusão: **não é problema de permissão** (RLS ou “usuário sem acesso à empresa”).

### 2.2 Parâmetros da RPC

- O front chama `approve_attendance_correction` com `p_correction_id`, `p_approved_by` (user id) e `p_observacoes`.
- A função no banco usa `auth.uid()` e `user_companies`; no ambiente atual a função já usa `uc.user_id` (não `profile_id`) para o aprovador.
- `correction_history.changed_by` referencia `public.users(id)`; o valor gravado é o user id. Conclusão: **não é problema de FK em correction_history**.

### 2.3 Dados da correção

- **data_original:** 2026-01-06  
- **entrada_corrigida:** 07:55  
- **saida_corrigida:** 18:01  
- **entrada_almoco_corrigida:** 13:10  
- **saida_almoco_corrigida:** 14:10  

Horários coerentes para um dia de trabalho.

---

## 3. Causa raiz

A reprodução via `psql` (simulando o usuário jane.miranda) mostrou o erro real:

```text
ERROR:  numeric field overflow
DETALHE:  A field with precision 4, scale 2 must round to an absolute value less than 10^2.
CONTEXTO:  PL/pgSQL function rh.recalculate_time_record_hours(uuid) line 261 at assignment
SQL statement "SELECT rh.recalculate_time_record_hours(v_id)"
PL/pgSQL function rh.trg_time_record_events_recalc() line 4 at PERFORM
SQL statement "INSERT INTO rh.time_record_events (..., 'saida', (v_saida_date + v_correction.saida_corrigida)::timestamptz, ...)
```

Ou seja:

1. **Onde quebra:** dentro de `rh.recalculate_time_record_hours`, em uma atribuição (por volta da “line 261” na versão da função que está no banco).
2. **Por quê:** alguma variável calculada (ex.: `v_horas_trabalhadas`, `v_horas_faltas` ou `v_horas_noturnas`) resulta em valor com **valor absoluto ≥ 100**.
3. **Limite do tipo:** as colunas de horas em `rh.time_records` são `NUMERIC(4,2)` (máximo absoluto **99,99**).
4. **Quando:** a aprovação insere/atualiza eventos em `rh.time_record_events`; o trigger `trg_time_record_events_recalc` chama `recalculate_time_record_hours`. Em um desses passos (no teste, ao inserir o evento de **saída**), o cálculo produz um número que estoura o `NUMERIC(4,2)`.

Cenários típicos que podem gerar valor ≥ 100 (ou ≤ -100):

- Diferença de timestamps em ordem trocada ou com datas erradas (ex.: entrada/saída em dias trocados).
- Trigger rodando com conjunto de eventos ainda incompleto (ex.: só entrada ou só saída) e fallback gerando diferença gigante.
- Timezone/data usada em um passo do cálculo diferente da usada no outro.

Ou seja: **a causa do 400 é um overflow numérico em `recalculate_time_record_hours`**, ao gravar em colunas `NUMERIC(4,2)`, e **não** falta de permissão da jane.miranda para aprovar a correção da laisa.dias.

---

## 4. Solução aplicada

Foi criada a migração **supabase/migrations/20260203000001_fix_recalculate_numeric_overflow.sql**, que:

- Na função `rh.recalculate_time_record_hours`, **limita** os valores de horas ao intervalo suportado por `NUMERIC(4,2)` (**-99,99 a 99,99**) antes do `UPDATE` em `rh.time_records`.
- Assim, mesmo que o cálculo interno produza um valor fora do intervalo (por evento incompleto, ordem de datas, etc.), não ocorre mais “numeric field overflow” e a aprovação não retorna 400.

Recomendações adicionais:

- Revisar cenários em que o cálculo gera > 99,99 ou < -99,99 (ex.: lógica com eventos parciais ou datas incorretas) para corrigir a regra de negócio, além da proteção por clamp.
- Considerar, no médio prazo, ampliar a precisão das colunas de horas (ex.: `NUMERIC(6,2)`) se a regra de negócio puder gerar valores além de 99,99.

---

## 5. Resumo

| Item | Conclusão |
|------|-----------|
| Acesso da jane.miranda à empresa da correção | OK |
| Parâmetros da RPC e FKs (correction_history, etc.) | OK |
| Dados da correção (horários) | Coerentes |
| **Causa do 400** | **Overflow em `recalculate_time_record_hours` (NUMERIC(4,2))** |
| **Correção** | Clamp dos valores de horas antes do UPDATE na migração 20260203000001 |
