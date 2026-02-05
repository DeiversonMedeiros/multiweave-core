# Análise: Falha no registro de ponto – apenas entrada exibida (28/01 a 30/01/2026)

## Resumo do problema

- **Sintoma:** O colaborador "JOAO VITOR GOMES DA SILVA" (e outros) registram na página **portal-colaborador/registro-ponto** entrada, início do almoço e fim do almoço, mas a interface mostra **apenas a entrada** (ex.: 13:29). Os demais campos (Início Almoço, Fim Almoço, Saída) aparecem como `--:--`.
- **Percepção do usuário:** Parece que o sistema está **substituindo a entrada** pelos outros registros (na prática, só um horário aparece).
- **Período:** Desde 28/01/2026 até 30/01/2026; ocorre **apenas para alguns usuários**.

---

## 1. Elementos do banco de dados envolvidos

### 1.1 Tabelas

| Tabela | Papel |
|--------|--------|
| **rh.time_records** | Registro diário consolidado: `data_registro`, `entrada`, `saida`, `entrada_almoco`, `saida_almoco`, `entrada_extra1`, `saida_extra1`, `horas_trabalhadas`, etc. Uma linha por (funcionário, empresa, data). |
| **rh.time_record_events** | Uma linha por marcação (cada clique): `time_record_id`, `event_type` ('entrada', 'entrada_almoco', 'saida_almoco', 'saida', 'extra_inicio', 'extra_fim'), `event_at` (timestamptz). |
| **rh.time_record_settings** | Configuração por empresa; campo relevante: `janela_tempo_marcacoes` (horas). |

### 1.2 Funções críticas

| Função | O que faz |
|--------|-----------|
| **public.register_time_record** | RPC chamada pelo frontend. Recebe `p_event_type`, `p_timestamp_utc`, timezone, etc. Decide o `data_registro` (incluindo janela de tempo), busca/cria linha em `rh.time_records`, insere uma linha em `rh.time_record_events` e atualiza o campo correspondente em `rh.time_records` (entrada, entrada_almoco, saida_almoco, etc.). |
| **rh.recalculate_time_record_hours** | Lê **apenas** de `rh.time_record_events` (primeira ocorrência de cada `event_type`), recalcula horas e faz **UPDATE em rh.time_records** preenchendo todos os campos de horário (entrada, saida, entrada_almoco, saida_almoco, etc.). |
| **public.get_consolidated_time_record_by_window** | Usada pela tela de registro para “hoje”. Encontra o registro do dia (ou dia anterior dentro da janela), monta o JSON a partir de **rh.time_records** (row_to_json) e pode acrescentar marcações do dia seguinte dentro da janela. Ou seja, **o que a UI mostra vem da tabela time_records**. |
| **rh.fix_multiple_entrada_events** | Função de correção (migração 20260129000001): identifica registros com **dois ou mais eventos com event_type = 'entrada'** no mesmo dia e reatribui os tipos na ordem: entrada, entrada_almoco, saida_almoco, saida, extra_inicio, extra_fim. |

### 1.3 Trigger

- **trg_after_change_recalc** em `rh.time_record_events`: **AFTER INSERT OR UPDATE OR DELETE** chama `rh.recalculate_time_record_hours(time_record_id)`.
- Efeito: toda vez que um evento é inserido (ou alterado/removido), os campos de horário do `time_record` são **totalmente recalculados a partir dos eventos**. Ou seja, a “fonte da verdade” para entrada/entrada_almoco/saida_almoco/saida na tabela é o conjunto de linhas em `time_record_events`.

---

## 2. Fluxo de gravação (portal-colaborador/registro-ponto)

1. Usuário clica no botão “Registrar [próximo tipo]” (ex.: “Registrar Início do Almoço”).
2. **handleRegisterClick(nextRecordType)** é chamado com o tipo retornado por **getNextRecordType()** (que usa **displayTodayRecord** = dados do `get_consolidated_time_record_by_window`).
3. Se online: abre **TimeRecordRegistrationModalV2** com `type` = próximo tipo (entrada, entrada_almoco, saida_almoco, etc.).
4. No modal, ao clicar “Registrar”, **registerTimeRecord({ type })** é chamado (`timeRecordRegistrationService.ts`).
5. Serviço mapeia tipo → `event_type` RPC:
   - entrada → `'entrada'`
   - entrada_almoco → `'entrada_almoco'`
   - saida_almoco → `'saida_almoco'`
   - etc.
6. Chama **supabase.rpc('register_time_record', { p_event_type: eventType, ... })**.
7. No banco:
   - `register_time_record` insere em **rh.time_record_events** com o `p_event_type` recebido.
   - Em seguida atualiza **rh.time_records** no campo correspondente (entrada, entrada_almoco, saida_almoco, etc.).
   - O **trigger** dispara e executa **recalculate_time_record_hours**, que lê **todos** os eventos daquele `time_record_id` e reescreve **todos** os campos de horário em **rh.time_records**.

A tela de registro lê o “registro de hoje” via **get_consolidated_time_record_by_window**, que devolve o conteúdo baseado em **rh.time_records**. Portanto, se em `time_records` só estiver preenchido `entrada`, a interface mostrará apenas a entrada.

---

## 3. Causa raiz mais provável: vários eventos como `entrada`

A migração **20260129000001_fix_multiple_entrada_events** descreve exatamente esse cenário:

> “Alguns colaboradores registraram entrada almoço, saída almoço e saída **mas a UI enviou event_type 'entrada' para todos** (ex.: refetch lento).”

Quando **todos** os cliques são gravados com **event_type = 'entrada'**:

1. Em **rh.time_record_events** existem várias linhas com `event_type = 'entrada'` (ex.: 3 linhas para o mesmo dia).
2. **recalculate_time_record_hours** usa apenas a **primeira** ocorrência de cada tipo para preencher `time_records`. Para `entrada_almoco` e `saida_almoco` não há nenhum evento com esse tipo, então esses campos ficam **NULL**.
3. O campo **entrada** em `time_records` é preenchido com o horário da primeira (ou única considerada) “entrada”.
4. **get_consolidated_time_record_by_window** lê `time_records` e devolve só entrada preenchida; o resto aparece como `--:--`.

Ou seja: não é que a “entrada” esteja sendo substituída pelos outros registros; é que **os outros registros foram gravados com o mesmo tipo (entrada)** e, no modelo atual, só um horário por tipo é refletido em `time_records`. Visualmente parece que “só a entrada” aparece.

---

## 4. Por que a UI poderia enviar `entrada` para todos (hipóteses)

### 4.1 Cache/refetch e próximo tipo errado

- **displayTodayRecord** vem da query com chave `['today-time-record-consolidated', employee?.id, selectedCompany?.id, windowHours]`.
- **nextRecordType** é calculado por **getNextRecordType()** a partir de **displayTodayRecord** (e registros offline).
- Se, após o primeiro registro (entrada), o **refetch** demorar ou a **atualização otimista** não aplicar no mesmo `queryKey` que a query usa (ex.: diferença em `employee?.id` vs `currentEmployee?.id` ou `windowHours`), **displayTodayRecord** pode continuar sem `entrada_almoco`/`saida_almoco`.
- Nesse caso, **getNextRecordType()** pode continuar retornando **'entrada'** (por exemplo se considerar que ainda não há entrada), e o usuário, ao clicar de novo, abre o modal ainda com **type = 'entrada'**, registrando outra “entrada” em vez de início/fim de almoço.

### 4.2 Atualização otimista e queryKey

No **onSuccess** do modal, a atualização otimista usa:

```ts
const queryKey = ['today-time-record-consolidated', employeeId, selectedCompany.id, windowHours];
queryClient.setQueryData(queryKey, optimistic);
```

A query usa `employee?.id`. Se em algum momento `employeeId` (currentEmployee/employee) ou `windowHours` divergir do que a query usa, o cache que a tela lê não é o atualizado e **nextRecordType** pode ficar desatualizado (por exemplo, ainda “entrada”).

### 4.3 Outros caminhos de gravação

- Há fluxo de **registro offline** (saveOfflineRecord com payload que inclui `eventType`). O sync chama **register_time_record** com `payload.eventType`. Se o payload tiver sido montado com tipo errado em algum cenário (ex.: tipo padrão “entrada”), a sincronização gravaria vários eventos como entrada.
- Existe também um fluxo de mutação que usa **EntityService** (create/update em `time_records` e criação em `time_record_events`) em outro trecho da página; se esse fluxo for usado em algum caso (ex.: retry, fallback ou tela diferente) e enviar sempre o mesmo `event_type`, reforçaria o problema.

---

## 5. Elementos impactados (resumo)

| Elemento | Impacto |
|----------|--------|
| **rh.time_records** | Campos entrada_almoco, saida_almoco (e outros) ficam NULL quando todos os eventos são 'entrada'. |
| **rh.time_record_events** | Contém múltiplas linhas com event_type = 'entrada' para o mesmo time_record_id. |
| **get_consolidated_time_record_by_window** | Retorna apenas o que está em time_records; usuário vê só entrada. |
| **Trigger trg_after_change_recalc** | Sempre reescreve time_records a partir dos eventos; se só há eventos 'entrada', só entrada é preenchida. |
| **Página RegistroPontoPage** | Depende de nextRecordType correto (baseado em displayTodayRecord) para abrir o modal com o tipo certo; cache/refetch incorreto pode manter tipo = entrada. |
| **TimeRecordRegistrationModalV2** | Envia o `type` que recebeu do pai; se o pai passar sempre 'entrada', todos os registros serão 'entrada'. |
| **timeRecordRegistrationService** | Mapeia type → eventType corretamente; problema não está no mapeamento em si, e sim no tipo recebido. |
| **Sync offline (syncOfflineRecords)** | Usa payload.eventType; se o payload foi salvo com eventType errado, o sync propaga o erro. |

---

## 6. Recomendações

### 6.1 Imediato (dados já gravados)

1. **Rodar novamente a correção em massa** para o período afetado (28/01 a 30/01/2026), usando a mesma lógica de **rh.fix_multiple_entrada_events** (ou uma variante que filtre por `data_registro` nesse intervalo), para reclassificar eventos que estão todos como 'entrada' na ordem: entrada, entrada_almoco, saida_almoco, saida, etc.
2. **Consultar eventos por funcionário e data** para confirmar o padrão (múltiplos `event_type = 'entrada'` no mesmo dia):

```sql
SELECT tr.id, tr.data_registro, tr.employee_id, tr.entrada, tr.entrada_almoco, tr.saida_almoco, tr.saida,
       e.event_type, e.event_at
FROM rh.time_records tr
JOIN rh.time_record_events e ON e.time_record_id = tr.id
WHERE tr.data_registro >= '2026-01-28'
  AND tr.employee_id = (SELECT id FROM rh.employees WHERE matricula = '05018' LIMIT 1)
ORDER BY tr.data_registro, e.event_at;
```

### 6.2 Frontend (evitar repetir)

1. **Garantir que a atualização otimista use exatamente a mesma queryKey** que a query do registro de hoje (mesmos employeeId, selectedCompany.id, windowHours), e que **nextRecordType** seja derivado desse cache.
2. **Refetch explícito** após sucesso do registro (já existe invalidate/refetch; garantir que seja com a mesma chave e que a UI espere o refetch antes de permitir novo registro, ou desabilitar o botão até atualizar).
3. **Logar no console** (em dev) o `type` e o `eventType` enviados em cada chamada a **register_time_record** para facilitar diagnóstico em novos casos.

### 6.3 Backend (opcional)

1. **Validação em register_time_record**: recusar ou alertar quando, para o mesmo time_record_id, já existir um evento 'entrada' e o novo evento for novamente 'entrada' (possível duplicidade de tipo).
2. **Manter rh.fix_multiple_entrada_events** (ou script equivalente) como rotina de correção para casos em que a UI ainda envie múltiplos 'entrada' (ex.: executar diariamente para o dia anterior).

---

## 7. Conclusão

- A falha em que **apenas a entrada aparece** e os demais horários ficam em `--:--` é consistente com **múltiplos eventos do mesmo dia gravados com event_type = 'entrada'**.
- O trigger e **recalculate_time_record_hours** então preenchem em **time_records** só o primeiro horário de “entrada”, e deixam entrada_almoco/saida_almoco/saida em NULL.
- A UI mostra só o que está em **time_records** (via **get_consolidated_time_record_by_window**), portanto só a entrada.
- A causa mais provável no frontend é **cache/refetch** ou **queryKey** fazendo com que **nextRecordType** permaneça 'entrada' após o primeiro registro, fazendo os cliques seguintes enviarem novamente `event_type = 'entrada'`.
- Corrigir os dados com **fix_multiple_entrada_events** (ou variante por período) e alinhar queryKey + atualização otimista + refetch na página de registro resolve o problema e reduz recorrência.
