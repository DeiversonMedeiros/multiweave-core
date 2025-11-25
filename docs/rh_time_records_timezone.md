# Timezone e `event_at` no módulo de ponto

- `event_at` é armazenado como `timestamptz` em `rh.time_record_events`.
- Ao recalcular agregados, convertemos `(event_at AT TIME ZONE 'UTC')::time` para reconstruir os horários do dia (`entrada`, `saida`, etc.) sobre `data_registro`.
- Se a empresa tiver fuso local específico, ajustar a função `rh.recalculate_time_record_hours` para aplicar o offset correto antes da extração do `time`.
- Estratégias:
  - Persistir o timezone da empresa e aplicar `AT TIME ZONE '<tz_da_empresa>'` no recálculo.
  - Padronizar captura no cliente em UTC e exibir formatado no fuso do usuário.
- Backfill combina `data_registro + time` para compor `event_at`; em produções com fuso variável, preferir registrar `event_at` real para eventos futuros e manter backfill como melhor esforço para históricos.


