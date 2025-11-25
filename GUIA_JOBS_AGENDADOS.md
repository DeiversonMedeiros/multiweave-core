# 📅 Guia de Jobs Agendados (pg_cron)
## Sistema: MultiWeave Core

---

## ✅ Status

**Jobs configurados e ativos:** ✅

Todos os 4 jobs foram criados com sucesso e estão ativos.

---

## 📋 Jobs Configurados

### 1. **refresh-all-statistics-views-daily**
- **Schedule:** `0 2 * * *` (Todos os dias às 2:00 AM)
- **Função:** Atualiza todas as 5 views materializadas
- **Uso:** Refresh completo diário durante horário de baixo tráfego

### 2. **refresh-dashboard-stats-hourly**
- **Schedule:** `0 * * * *` (A cada hora, no minuto 0)
- **Função:** Atualiza apenas `dashboard_stats_mv`
- **Uso:** Mantém estatísticas gerais sempre atualizadas

### 3. **refresh-module-stats-6hours**
- **Schedule:** `0 */6 * * *` (A cada 6 horas: 0h, 6h, 12h, 18h)
- **Função:** Atualiza views de RH, Frota e Almoxarifado
- **Uso:** Balanceia atualização frequente com performance

### 4. **refresh-financial-stats-daily**
- **Schedule:** `0 3 * * *` (Todos os dias às 3:00 AM)
- **Função:** Atualiza `financial_dashboard_stats_mv`
- **Uso:** Dados financeiros atualizados diariamente após fechamento

---

## 🔧 Comandos Úteis

### Listar todos os jobs

```sql
SELECT * FROM public.list_refresh_jobs();
```

Ou diretamente:

```sql
SELECT 
  jobid,
  jobname,
  schedule,
  active
FROM cron.job 
WHERE jobname LIKE 'refresh-%'
ORDER BY jobname;
```

### Ver histórico de execuções

```sql
SELECT 
  j.jobname,
  jrd.start_time,
  jrd.end_time,
  jrd.status,
  jrd.return_message
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname LIKE 'refresh-%'
ORDER BY jrd.start_time DESC
LIMIT 20;
```

### Pausar todos os jobs

```sql
SELECT public.pause_all_refresh_jobs();
```

### Reativar todos os jobs

```sql
SELECT public.resume_all_refresh_jobs();
```

### Pausar um job específico

```sql
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'refresh-dashboard-stats-hourly'),
  active => false
);
```

### Reativar um job específico

```sql
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'refresh-dashboard-stats-hourly'),
  active => true
);
```

### Remover um job

```sql
SELECT cron.unschedule('refresh-dashboard-stats-hourly');
```

### Alterar o schedule de um job

```sql
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'refresh-dashboard-stats-hourly'),
  schedule => '0 */2 * * *'  -- A cada 2 horas
);
```

### Executar um job manualmente (fora do schedule)

```sql
-- Executar a função diretamente
SELECT public.refresh_all_statistics_views();

-- Ou uma view específica
SELECT public.refresh_statistics_view('dashboard_stats');
```

---

## 📊 Formato de Cron Schedule

**Formato:** `minuto hora dia mês dia-da-semana`

### Exemplos Comuns

| Schedule | Descrição |
|----------|-----------|
| `0 2 * * *` | Todos os dias às 2:00 AM |
| `0 */6 * * *` | A cada 6 horas (0h, 6h, 12h, 18h) |
| `0 * * * *` | A cada hora (minuto 0) |
| `*/15 * * * *` | A cada 15 minutos |
| `0 0 * * 0` | Todo domingo à meia-noite |
| `0 9-17 * * 1-5` | De segunda a sexta, das 9h às 17h (a cada hora) |
| `0 0 1 * *` | Todo dia 1 de cada mês à meia-noite |

### Valores

- **Minuto:** 0-59
- **Hora:** 0-23
- **Dia:** 1-31
- **Mês:** 1-12 (ou * para todos)
- **Dia da semana:** 0-7 (0 e 7 = domingo, 1 = segunda, etc.)

---

## ⚠️ Troubleshooting

### Verificar se pg_cron está habilitado

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

Se não estiver habilitado:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Verificar se os jobs estão rodando

```sql
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  nodename,
  nodeport
FROM cron.job
WHERE jobname LIKE 'refresh-%';
```

### Ver erros recentes

```sql
SELECT 
  j.jobname,
  jrd.start_time,
  jrd.status,
  jrd.return_message,
  jrd.error_message
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname LIKE 'refresh-%'
  AND jrd.status = 'failed'
ORDER BY jrd.start_time DESC
LIMIT 10;
```

### Verificar última execução de cada job

```sql
SELECT 
  j.jobname,
  MAX(jrd.start_time) as last_run,
  MAX(jrd.end_time) as last_end,
  MAX(jrd.status) as last_status
FROM cron.job j
LEFT JOIN cron.job_run_details jrd ON j.jobid = jrd.jobid
WHERE j.jobname LIKE 'refresh-%'
GROUP BY j.jobname
ORDER BY j.jobname;
```

---

## 🎯 Recomendações

1. **Monitorar execuções:** Verifique periodicamente o histórico para garantir que os jobs estão rodando corretamente
2. **Ajustar schedules:** Se necessário, ajuste os schedules baseado no uso do sistema
3. **Pausar durante manutenção:** Pause os jobs durante manutenções programadas
4. **Backup antes de alterar:** Sempre teste alterações em ambiente de desenvolvimento primeiro

---

## 📝 Notas Importantes

- Os jobs usam `REFRESH MATERIALIZED VIEW CONCURRENTLY`, que permite leituras durante o refresh
- O refresh pode levar alguns minutos dependendo do volume de dados
- Jobs falhados não são reexecutados automaticamente - verifique o histórico regularmente
- Alterações em jobs requerem permissões de superusuário ou SECURITY DEFINER

---

## 🔗 Referências

- [Documentação pg_cron](https://github.com/citusdata/pg_cron)
- [Cron Schedule Format](https://crontab.guru/)
- [PostgreSQL Materialized Views](https://www.postgresql.org/docs/current/sql-creatematerializedview.html)

