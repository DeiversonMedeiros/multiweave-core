# Análise: Registro-ponto sem exibir registro (Teste1, janela 15h)

## Dados verificados no banco (Supabase)

### Empresa do Teste1
- **company_id:** `a9784891-9d58-4cc4-8404-18032105c335`
- **Janela de tempo:** **15 horas** (`rh.time_record_settings.janela_tempo_marcacoes = 15`)

### Registros do Teste1 (employee_id: `2d3391a7-ed62-4b5a-a82d-5fb9d4bebe0a`)

| data_registro | entrada   | entrada_almoco | saida_almoco | saida |
|---------------|-----------|----------------|--------------|-------|
| 2026-01-28    | 08:06:38  | (vazio)        | (vazio)      | (vazio) |
| 2026-01-29    | 13:43:48  | (vazio)        | (vazio)      | (vazio) |
| 2026-01-30    | 16:28:28  | (vazio)        | (vazio)      | (vazio) |

**Intervalo entre entradas:** 28/01 08:06 → 29/01 13:43 ≈ 29,6h; 29/01 13:43 → 30/01 16:28 ≈ 26,75h. Ambos **ultrapassam a janela de 15h**.

---

## Comportamento atual da função `get_consolidated_time_record_by_window`

A função **prioriza o dia anterior**: primeiro busca registro do dia anterior; se ele ainda estiver “dentro da janela” em relação ao **início do dia alvo** (00:00), retorna esse registro e **não considera o dia alvo**.

### Teste no banco (30/01 como dia alvo)

```sql
SELECT public.get_consolidated_time_record_by_window(
  '2d3391a7-ed62-4b5a-a82d-5fb9d4bebe0a'::uuid,
  'a9784891-9d58-4cc4-8404-18032105c335'::uuid,
  '2026-01-30'::date,
  'America/Sao_Paulo'
);
```

- **NOTICE:** `Registro do dia anterior ainda dentro da janela. Data: 2026-01-29, Horas decorridas: 10.27, Janela: 15h`
- **Retorno:** registro de **29/01** (entrada 13:43), **não** o de 30/01 (entrada 16:28).

Ou seja: ao abrir a página em **30/01**, a API devolve o registro de **29/01**. O frontend então:

1. Recebe `data_registro = 2026-01-29` (≠ “hoje” 30/01).
2. Calcula `hoursElapsed` da primeira marcação (29/01 13:43) até **agora** (ex.: 30/01 17:00) ≈ 26,3h.
3. Como 26,3h > 15h (janela), define `isWithinWindow = false` e **não exibe** o registro (`displayTodayRecord = null`).
4. Resultado: mensagem **“Nenhum registro encontrado para hoje”**, mesmo existindo registro em 30/01 às 16:28.

---

## Por que a página fica em branco

| Etapa | O que acontece |
|-------|----------------|
| 1. Backend | Para `p_target_date = 30/01`, a função retorna o registro de **29/01** (prioridade ao dia anterior). O registro de **30/01** (16:28) nunca é retornado nessa chamada. |
| 2. Frontend | O registro retornado é de 29/01. Como a janela é 15h e já passou mais de 15h desde 29/01 13:43, o frontend considera “fora da janela” e **esconde** o card. |
| 3. Tela | O usuário vê “Nenhum registro encontrado para hoje” e o botão “Registrar Entrada”. |

O intervalo entre os registros (29/01 13:43 e 30/01 16:28) ser maior que 15h está correto para a regra de janela; o problema é a **escolha do registro**: em 30/01 deveria ser usado o **registro do próprio 30/01**, não o de 29/01.

---

## Migração `20260130000002_prefer_same_day_in_get_consolidated`

Ela altera a ordem de prioridade:

1. **Primeiro:** buscar registro do **dia alvo** (`p_target_date` = “hoje”).
2. **Só se não houver:** buscar registro do dia anterior que ainda esteja dentro da janela (em relação ao início do dia alvo).

Efeito para o Teste1 em **30/01**:

- Para `p_target_date = 2026-01-30` existe registro em 30/01 (entrada 16:28).
- A função passa a retornar esse registro de **30/01**.
- No frontend: `data_registro === todayLocalDate` (30/01), então o trecho “same-day” considera `isWithinWindow = true` e o registro **é exibido** na página registro-ponto.

Para **31/01** (dia seguinte):

- Não há registro em 31/01; a função pode retornar o de 30/01 (se ainda dentro da janela em relação a 31/01 00:00).
- O frontend continua calculando da primeira marcação (30/01 16:28) até “agora”; se já passaram mais de 15h, segue escondendo o card e mostrando “Nenhum registro encontrado para hoje”. Isso é **coerente com a janela de 15h**.

---

## Recomendação

1. **Aplicar a migração** `20260130000002_prefer_same_day_in_get_consolidated.sql`:  
   - Corrige o caso em que o usuário abre a página **no mesmo dia** em que fez a entrada (ex.: 30/01 16:28), fazendo o registro do dia atual aparecer em “Registros de Hoje”.
2. **Opcional (frontend):** quando houver um registro retornado mas **fora da janela** (ex.: registro de ontem já expirado), em vez de só “Nenhum registro encontrado para hoje”, exibir uma linha do tipo “Registro do dia anterior (janela encerrada)” com os horários, para não parecer que “não existe nenhum registro”.

A migração está alinhada com a janela de 15h e com o fato de o intervalo entre os registros ultrapassar essa janela: ela apenas garante que, ao consultar “hoje”, o sistema use o registro de **hoje** quando ele existir.
