# Análise: Registro de Ponto mostrando apenas Entrada

## Problema

O colaborador **VITOR ALVES DA COSTA NETO** (e eventualmente outros) realizou os quatro registros de ponto (entrada, entrada almoço, saída almoço, saída), mas nas páginas **rh/time-records** e **portal-colaborador/registro-ponto** aparecia apenas a entrada. As fotos do dia (4) indicavam que houve quatro interações com o sistema.

## Causa raiz (banco de dados)

Consulta ao banco (28/01 e 29/01) mostrou:

- **rh.time_records**  
  - Registro de 28/01 (id `1218ad95...`): apenas `entrada` preenchida (22:29:50); `entrada_almoco`, `saida_almoco` e `saida` estavam NULL.
- **rh.time_record_events** (mesmo registro)  
  - Quatro eventos, **todos** com `event_type = 'entrada'`:
    - 28/01 16:54:27 UTC → entrada
    - 28/01 21:11:51 UTC → entrada
    - 28/01 22:03:42 UTC → entrada
    - 29/01 01:29:50 UTC → entrada

Ou seja: as batidas de “entrada almoço”, “saída almoço” e “saída” foram gravadas no backend como **entrada**. A função `register_time_record` atualiza apenas o campo correspondente ao `event_type`; como todos eram `entrada`, só o campo `entrada` era atualizado e as demais colunas ficaram NULL.

## Por que o front enviou sempre “entrada”

O fluxo do portal é:

1. O próximo tipo de batida é calculado por `getNextRecordType()` a partir do registro de “hoje” em cache (query `today-time-record-consolidated`).
2. O usuário clica em “Registrar [próximo tipo]” (ex.: “Registrar Início do Almoço”).
3. Abre o modal de câmera e é chamada a RPC `register_time_record` com o tipo correto (ex.: `entrada_almoco`).
4. No `onSuccess` do modal, a página invalida a query e faz refetch para atualizar o registro.

Se o **refetch demorar ou falhar**, o cache continua com o registro antigo (só com `entrada`). Nesse caso, `getNextRecordType()` continua retornando **entrada_almoco** (ou o próximo passo), mas na prática o usuário pode estar vendo a tela ainda mostrando “Registrar Entrada” ou o botão não atualizando. Se o usuário clicar de novo pensando que está fazendo a próxima batida, e por algum bug de estado o tipo enviado for `entrada`, o backend grava mais um evento `entrada` e sobrescreve de novo só o campo `entrada`. Repetindo isso, ficam vários eventos `entrada` e apenas a coluna `entrada` preenchida.

Conclusão: a causa raiz é **envio repetido de `event_type = 'entrada'`** (por refetch lento/falha + possível confusão de estado na UI), e não bug na lógica de janela de tempo nem na RPC em si.

## Correções implementadas

### 1. Frontend – Atualização otimista (portal-colaborador/registro-ponto)

- **TimeRecordRegistrationModalV2**: o callback `onSuccess` passou a receber um payload opcional `{ type, localDate, localTimestamp }` retornado pela RPC, para que a página possa atualizar o cache imediatamente.
- **RegistroPontoPage**: no `onSuccess` do modal, além de invalidar/refetch, é feita uma **atualização otimista** do cache da query `today-time-record-consolidated`: o registro em cache é mesclado com o tipo e horário recém-registrados. Assim, `getNextRecordType()` já “vê” a nova batida e o botão muda na hora para o próximo passo (ex.: “Registrar Fim do Almoço”), sem depender do refetch. Isso reduz o risco de o usuário clicar várias vezes no mesmo passo e o sistema enviar `entrada` em todas.

### 2. Banco – Migração para corrigir dados já gravados

- **Arquivo**: `supabase/migrations/20260129000001_fix_multiple_entrada_events.sql`
- **Função**: `rh.fix_multiple_entrada_events(p_timezone)`
- **Lógica**:
  - Seleciona `time_records` em que:
    - há pelo menos uma `entrada` preenchida;
    - `entrada_almoco`, `saida_almoco` e `saida` estão NULL;
    - existem **dois ou mais** eventos com `event_type = 'entrada'` para esse registro.
  - Para cada registro, ordena **somente** os eventos com `event_type = 'entrada'` por `event_at` e reatribui na ordem:
    1. entrada  
    2. entrada_almoco  
    3. saida_almoco  
    4. saida  
    5. extra_inicio  
    6. extra_fim  
  - Atualiza `rh.time_record_events.event_type` e as colunas correspondentes em `rh.time_records` (entrada, entrada_almoco, saida_almoco, saida, etc.) com o horário local derivado de `event_at` no timezone informado.
  - Chama `rh.recalculate_time_record_hours(time_record_id)` para recalcular horas trabalhadas, extras, etc.

**Como aplicar a correção dos dados (VITOR e outros casos iguais):**

```bash
# Opção 1: rodar a migração (Supabase CLI)
supabase db push

# Opção 2: executar só a função no banco (psql ou SQL Editor)
SELECT * FROM rh.fix_multiple_entrada_events('America/Sao_Paulo');
```

Depois disso, as páginas **rh/time-records** e **portal-colaborador/registro-ponto** devem exibir corretamente entrada, entrada almoço, saída almoço e saída para os registros corrigidos.

## Resumo

| Item | Conclusão |
|------|-----------|
| Dados do VITOR em 28/01 | 4 eventos com `event_type = 'entrada'`; apenas coluna `entrada` preenchida no `time_record`. |
| Motivo | Front enviou `event_type = 'entrada'` nas quatro batidas (refetch lento/estado da UI). |
| Ajuste no front | Atualização otimista do cache após registro no modal para o próximo tipo aparecer de imediato. |
| Ajuste no banco | Migração + função `rh.fix_multiple_entrada_events` para reatribuir tipos e preencher colunas. |
