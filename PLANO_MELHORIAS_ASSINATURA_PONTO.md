# 📋 Plano de Melhorias - Controle de Assinatura de Ponto

## 🎯 Objetivo
Melhorar a página `rh/assinatura-ponto-config` com controle granular de liberação/bloqueio de assinaturas por mês/ano, incluindo visualização de estatísticas e lista de funcionários que assinaram/não assinaram.

---

## 📊 Análise do Sistema Atual

### Estrutura Existente

1. **Tabelas:**
   - `rh.time_record_signature_config` - Configurações gerais
   - `rh.time_record_signatures` - Assinaturas individuais (status: pending, signed, expired, rejected, approved)
   - `rh.signature_notifications` - Histórico de notificações

2. **Funções RPC Existentes:**
   - `create_monthly_signature_records()` - Cria registros de assinatura para um mês
   - `is_month_open_for_signature()` - Verifica se mês está aberto
   - `get_signature_stats()` - Estatísticas de assinaturas
   - `generate_monthly_signatures()` - Gera assinaturas mensais

3. **Página Atual:**
   - `TimeRecordSignatureConfigPage.tsx` - Apenas configurações gerais
   - Não tem controle por mês/ano
   - Não mostra estatísticas detalhadas
   - Não lista quem assinou/não assinou

---

## 🚀 Plano de Implementação

### FASE 1: Estrutura de Banco de Dados

#### 1.1 Criar Tabela de Controle de Liberação por Mês/Ano

**Nova Tabela:** `rh.signature_month_control`

```sql
CREATE TABLE IF NOT EXISTS rh.signature_month_control (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    month_year VARCHAR(7) NOT NULL, -- Formato: YYYY-MM
    is_locked BOOLEAN NOT NULL DEFAULT false, -- true = bloqueado, false = liberado
    locked_by UUID REFERENCES auth.users(id),
    locked_at TIMESTAMP WITH TIME ZONE,
    unlocked_by UUID REFERENCES auth.users(id),
    unlocked_at TIMESTAMP WITH TIME ZONE,
    notes TEXT, -- Observações sobre o bloqueio/liberação
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, month_year)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_signature_month_control_company ON rh.signature_month_control(company_id);
CREATE INDEX IF NOT EXISTS idx_signature_month_control_month_year ON rh.signature_month_control(month_year);
CREATE INDEX IF NOT EXISTS idx_signature_month_control_locked ON rh.signature_month_control(is_locked);

-- RLS Policies
ALTER TABLE rh.signature_month_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view month control for their company" 
    ON rh.signature_month_control FOR SELECT 
    USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage month control for their company" 
    ON rh.signature_month_control FOR ALL 
    USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));
```

#### 1.2 Criar Funções RPC

**Função 1: Liberar Assinaturas para um Mês/Ano**
```sql
CREATE OR REPLACE FUNCTION unlock_signatures_for_month(
    p_company_id UUID,
    p_month_year VARCHAR(7),
    p_unlocked_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    records_created INTEGER := 0;
BEGIN
    -- Criar ou atualizar controle do mês
    INSERT INTO rh.signature_month_control (
        company_id, month_year, is_locked, unlocked_by, unlocked_at, notes
    )
    VALUES (
        p_company_id, p_month_year, false, p_unlocked_by, NOW(), p_notes
    )
    ON CONFLICT (company_id, month_year) 
    DO UPDATE SET 
        is_locked = false,
        unlocked_by = p_unlocked_by,
        unlocked_at = NOW(),
        notes = COALESCE(p_notes, signature_month_control.notes),
        updated_at = NOW();

    -- Criar registros de assinatura se não existirem
    SELECT create_monthly_signature_records(p_company_id, p_month_year) INTO records_created;

    -- Retornar resultado
    SELECT json_build_object(
        'success', true,
        'month_year', p_month_year,
        'is_locked', false,
        'records_created', records_created,
        'message', 'Assinaturas liberadas com sucesso'
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Função 2: Bloquear Assinaturas para um Mês/Ano**
```sql
CREATE OR REPLACE FUNCTION lock_signatures_for_month(
    p_company_id UUID,
    p_month_year VARCHAR(7),
    p_locked_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Criar ou atualizar controle do mês
    INSERT INTO rh.signature_month_control (
        company_id, month_year, is_locked, locked_by, locked_at, notes
    )
    VALUES (
        p_company_id, p_month_year, true, p_locked_by, NOW(), p_notes
    )
    ON CONFLICT (company_id, month_year) 
    DO UPDATE SET 
        is_locked = true,
        locked_by = p_locked_by,
        locked_at = NOW(),
        notes = COALESCE(p_notes, signature_month_control.notes),
        updated_at = NOW();

    -- Retornar resultado
    SELECT json_build_object(
        'success', true,
        'month_year', p_month_year,
        'is_locked', true,
        'message', 'Assinaturas bloqueadas com sucesso'
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Função 3: Buscar Estatísticas Detalhadas por Mês/Ano**
```sql
CREATE OR REPLACE FUNCTION get_signature_month_stats(
    p_company_id UUID,
    p_month_year VARCHAR(7)
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    total_employees INTEGER;
    total_signatures INTEGER;
    signed_count INTEGER;
    pending_count INTEGER;
    expired_count INTEGER;
    approved_count INTEGER;
    rejected_count INTEGER;
    is_locked BOOLEAN;
BEGIN
    -- Buscar total de funcionários ativos no mês
    SELECT COUNT(DISTINCT e.id) INTO total_employees
    FROM rh.employees e
    INNER JOIN rh.time_records tr ON tr.employee_id = e.id
    WHERE e.company_id = p_company_id
    AND e.status = 'ativo'
    AND tr.data_registro >= (p_month_year || '-01')::DATE
    AND tr.data_registro <= ((p_month_year || '-01')::DATE + INTERVAL '1 month' - INTERVAL '1 day');

    -- Buscar estatísticas de assinaturas
    SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'signed' THEN 1 END) as signed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
    INTO 
        total_signatures,
        signed_count,
        pending_count,
        expired_count,
        approved_count,
        rejected_count
    FROM rh.time_record_signatures
    WHERE company_id = p_company_id
    AND month_year = p_month_year;

    -- Verificar se está bloqueado
    SELECT COALESCE(is_locked, false) INTO is_locked
    FROM rh.signature_month_control
    WHERE company_id = p_company_id
    AND month_year = p_month_year;

    -- Construir resultado
    SELECT json_build_object(
        'month_year', p_month_year,
        'is_locked', COALESCE(is_locked, false),
        'total_employees', COALESCE(total_employees, 0),
        'total_signatures', COALESCE(total_signatures, 0),
        'signed_count', COALESCE(signed_count, 0),
        'pending_count', COALESCE(pending_count, 0),
        'expired_count', COALESCE(expired_count, 0),
        'approved_count', COALESCE(approved_count, 0),
        'rejected_count', COALESCE(rejected_count, 0),
        'not_signed_count', COALESCE(total_employees, 0) - COALESCE(signed_count, 0) - COALESCE(approved_count, 0)
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Função 4: Listar Funcionários que Assinaram/Não Assinaram**
```sql
CREATE OR REPLACE FUNCTION get_signature_employee_list(
    p_company_id UUID,
    p_month_year VARCHAR(7)
)
RETURNS TABLE (
    employee_id UUID,
    employee_name VARCHAR,
    employee_matricula VARCHAR,
    signature_id UUID,
    signature_status VARCHAR,
    signature_timestamp TIMESTAMP WITH TIME ZONE,
    has_signed BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id as employee_id,
        e.nome as employee_name,
        e.matricula as employee_matricula,
        trs.id as signature_id,
        trs.status as signature_status,
        trs.signature_timestamp,
        CASE 
            WHEN trs.status IN ('signed', 'approved') THEN true
            ELSE false
        END as has_signed
    FROM rh.employees e
    LEFT JOIN rh.time_record_signatures trs ON trs.employee_id = e.id AND trs.month_year = p_month_year
    WHERE e.company_id = p_company_id
    AND e.status = 'ativo'
    AND EXISTS (
        SELECT 1 
        FROM rh.time_records tr 
        WHERE tr.employee_id = e.id
        AND tr.data_registro >= (p_month_year || '-01')::DATE
        AND tr.data_registro <= ((p_month_year || '-01')::DATE + INTERVAL '1 month' - INTERVAL '1 day')
    )
    ORDER BY e.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### FASE 2: Atualização do Serviço

#### 2.1 Atualizar `timeRecordSignatureService.ts`

Adicionar novos métodos:

```typescript
// Liberar assinaturas para um mês/ano
async unlockSignaturesForMonth(
  companyId: string, 
  monthYear: string, 
  notes?: string
): Promise<any>

// Bloquear assinaturas para um mês/ano
async lockSignaturesForMonth(
  companyId: string, 
  monthYear: string, 
  notes?: string
): Promise<any>

// Buscar estatísticas detalhadas
async getMonthStats(
  companyId: string, 
  monthYear: string
): Promise<any>

// Listar funcionários que assinaram/não assinaram
async getEmployeeSignatureList(
  companyId: string, 
  monthYear: string
): Promise<any[]>
```

---

### FASE 3: Atualização da Interface

#### 3.1 Atualizar `TimeRecordSignatureConfigPage.tsx`

**Novos Componentes na Página:**

1. **Seção de Seleção de Mês/Ano:**
   - Select para mês (1-12)
   - Select para ano (últimos 3 anos + ano atual)
   - Botão "Carregar Dados"

2. **Seção de Controle:**
   - Card mostrando status atual (Liberado/Bloqueado)
   - Botão "Liberar Assinaturas" (verde)
   - Botão "Bloquear Assinaturas" (vermelho)
   - Campo de observações (opcional)

3. **Seção de Estatísticas:**
   - Cards com métricas:
     - Total de funcionários
     - Assinaturas liberadas (total de registros criados)
     - Assinaturas assinadas
     - Assinaturas pendentes
     - Assinaturas expiradas
     - Não assinadas

4. **Seção de Lista de Funcionários:**
   - Tabela com:
     - Nome do funcionário
     - Matrícula
     - Status da assinatura
     - Data/hora da assinatura (se assinado)
     - Badge colorido (Verde = assinado, Amarelo = pendente, Vermelho = não assinado/expirado)
   - Filtros:
     - Todos
     - Assinados
     - Não assinados
     - Pendentes

---

### FASE 4: Validações e Segurança

1. **Validações:**
   - Verificar se mês/ano é válido
   - Verificar se usuário tem permissão
   - Não permitir bloquear mês já fechado (se aplicável)
   - Validar formato de mês/ano (YYYY-MM)

2. **Segurança:**
   - RLS policies nas novas tabelas
   - SECURITY DEFINER nas funções RPC
   - Validação de company_id em todas as operações

---

### FASE 5: Testes

1. **Testes de Funcionalidade:**
   - Liberar assinaturas para um mês
   - Bloquear assinaturas para um mês
   - Verificar estatísticas
   - Listar funcionários

2. **Testes de Integração:**
   - Verificar se criação de assinaturas funciona após liberar
   - Verificar se bloqueio impede novas assinaturas
   - Verificar se estatísticas estão corretas

---

## 📝 Estrutura de Arquivos a Criar/Modificar

### Novos Arquivos:
1. `supabase/migrations/YYYYMMDDHHMMSS_add_signature_month_control.sql` - Migração do banco
2. (Opcional) `src/hooks/rh/useSignatureMonthControl.ts` - Hook para controle de mês

### Arquivos a Modificar:
1. `src/services/rh/timeRecordSignatureService.ts` - Adicionar novos métodos
2. `src/pages/rh/TimeRecordSignatureConfigPage.tsx` - Reestruturar página completa

---

## 🎨 Design da Nova Interface

```
┌─────────────────────────────────────────────────────────┐
│  Configuração de Assinatura de Ponto                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Seleção de Mês/Ano]                                   │
│  ┌──────────┐  ┌──────────┐  [Carregar Dados]         │
│  │ Mês: 12  │  │ Ano: 2024│                            │
│  └──────────┘  └──────────┘                            │
│                                                          │
│  [Status e Controle]                                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Status: ✅ LIBERADO                              │  │
│  │                                                   │  │
│  │ [🔓 Liberar Assinaturas]  [🔒 Bloquear]         │  │
│  │                                                   │  │
│  │ Observações: [________________]                   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  [Estatísticas]                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Total    │ │ Liberadas│ │ Assinadas│ │ Pendentes│ │
│  │   45     │ │   45     │ │   32     │ │   10     │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│  ┌──────────┐ ┌──────────┐                            │
│  │ Expiradas│ │ Não Ass. │                            │
│  │    0     │ │    3     │                            │
│  └──────────┘ └──────────┘                            │
│                                                          │
│  [Lista de Funcionários]                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │ [Todos] [Assinados] [Não Assinados] [Pendentes] │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Nome          │ Matrícula │ Status    │ Data    │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ João Silva    │ 001       │ ✅ Assinado│ 01/12   │  │
│  │ Maria Santos  │ 002       │ ⏳ Pendente│ -       │  │
│  │ Pedro Costa   │ 003       │ ❌ Não Ass.│ -       │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist de Implementação

### Banco de Dados
- [ ] Criar tabela `rh.signature_month_control`
- [ ] Criar função `unlock_signatures_for_month()`
- [ ] Criar função `lock_signatures_for_month()`
- [ ] Criar função `get_signature_month_stats()`
- [ ] Criar função `get_signature_employee_list()`
- [ ] Adicionar RLS policies
- [ ] Criar índices
- [ ] Testar funções no SQL Editor

### Serviços
- [ ] Adicionar método `unlockSignaturesForMonth()`
- [ ] Adicionar método `lockSignaturesForMonth()`
- [ ] Adicionar método `getMonthStats()`
- [ ] Adicionar método `getEmployeeSignatureList()`
- [ ] Testar métodos no console

### Interface
- [ ] Adicionar seletores de mês/ano
- [ ] Adicionar botões de liberar/bloquear
- [ ] Criar seção de estatísticas
- [ ] Criar tabela de funcionários
- [ ] Adicionar filtros na tabela
- [ ] Adicionar loading states
- [ ] Adicionar tratamento de erros
- [ ] Adicionar toasts de sucesso/erro

### Testes
- [ ] Testar liberação de assinaturas
- [ ] Testar bloqueio de assinaturas
- [ ] Verificar estatísticas
- [ ] Verificar lista de funcionários
- [ ] Testar com diferentes meses/anos
- [ ] Testar permissões

---

## 🚨 Pontos de Atenção

1. **Compatibilidade:** Manter compatibilidade com sistema existente
2. **Performance:** Índices adequados para consultas por mês/ano
3. **Auditoria:** Registrar quem liberou/bloqueou e quando
4. **UX:** Feedback claro para o usuário sobre ações realizadas
5. **Validações:** Não permitir ações inválidas (ex: bloquear mês futuro)

---

## 📅 Estimativa de Tempo

- **FASE 1 (Banco de Dados):** 2-3 horas
- **FASE 2 (Serviços):** 1-2 horas
- **FASE 3 (Interface):** 4-6 horas
- **FASE 4 (Validações):** 1-2 horas
- **FASE 5 (Testes):** 2-3 horas

**Total Estimado:** 10-16 horas

---

## 🎯 Próximos Passos

1. Revisar e aprovar o plano
2. Criar branch de desenvolvimento
3. Implementar FASE 1 (Banco de Dados)
4. Implementar FASE 2 (Serviços)
5. Implementar FASE 3 (Interface)
6. Implementar FASE 4 (Validações)
7. Implementar FASE 5 (Testes)
8. Code review
9. Deploy em staging
10. Testes em staging
11. Deploy em produção

