# Diagnóstico: Assinatura de ponto Axiseng – Janeiro/2026

## Problema
Colaboradores (ex.: gilvani.santos) viam apenas a mensagem **"Essa assinatura expirou e não pode mais ser assinada"** e não o botão para assinar, mesmo com o mês liberado para assinatura.

## Causa raiz (consultas no banco em 20/02/2026)

1. **Empresa:** AXISENG – `company_id = dc060329-50cd-4114-922f-624a6ab036d6`
2. **Controle do mês:** Não existia registro em `rh.signature_month_control` para Axiseng + 2026-01 (ou o mês não estava persistido como liberado).
3. **Assinaturas:** Havia 42 registros em `rh.time_record_signatures` para jan/2026, todos com **`expires_at = 2026-02-08`** (prazo de 7 dias após fim do mês).
4. **Data atual:** 2026-02-20 → `expires_at` já estava no passado, então a interface corretamente considerava “expirado” e ocultava o botão.

Conclusão: ao liberar o mês tardiamente, os registros de assinatura **já existiam** com `expires_at` no passado. O fluxo de “liberar mês” só criava registros **novos** (quem ainda não tinha) e **não atualizava** o `expires_at` dos registros pendentes já expirados.

## Correção aplicada

- **Migração:** `20260220000004_fix_axiseng_jan2026_signature_expires_and_unlock_logic.sql`
  - Garante `signature_month_control` para Axiseng 2026-01 com `is_locked = false`.
  - Atualiza todas as assinaturas **pendentes** de jan/2026 da Axiseng: `expires_at = NOW() + 7 dias`.
  - Ajusta a função `unlock_signatures_for_month` para, ao liberar um mês, **estender** o `expires_at` dos registros pendentes já expirados (evita o problema no futuro).

Após rodar a migração, os colaboradores passam a ver o botão “Assinar Registro” para jan/2026 (desde que o mês continue liberado e dentro do novo prazo).

## Como reproduzir o diagnóstico

Usar o script `scripts/diagnostico_assinatura_axiseng_jan2026.sql` com `psql` apontando para o banco (variável de ambiente `PGPASSWORD` ou connection string).
