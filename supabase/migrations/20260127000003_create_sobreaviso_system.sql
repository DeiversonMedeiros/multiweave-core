-- =====================================================
-- SISTEMA DE SOBREAVISO (RH)
-- =====================================================
-- Regime onde o funcionário permanece em casa/acessível
-- aguardando chamado, com remuneração de 1/3 da hora normal
-- (Súmula 428 TST e CLT). Escala máxima: 24 horas.
-- Reflexos: férias, 13º, folha, DSR, FGTS.
-- =====================================================

-- Tabela de escalas de sobreaviso
CREATE TABLE IF NOT EXISTS rh.sobreaviso_escalas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES rh.employees(id) ON DELETE CASCADE,

    -- Período da escala (cada escala não pode exceder 24h)
    data_escala DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    duracao_horas DECIMAL(4,2) NOT NULL
        CONSTRAINT chk_sobreaviso_duracao_max_24 CHECK (duracao_horas > 0 AND duracao_horas <= 24),

    -- Cálculo: 1/3 da hora normal (Súmula 428 TST)
    valor_hora_normal DECIMAL(10,2) NOT NULL,
    valor_pago DECIMAL(10,2) NOT NULL,

    -- Período de referência para folha
    mes_referencia INTEGER NOT NULL CHECK (mes_referencia >= 1 AND mes_referencia <= 12),
    ano_referencia INTEGER NOT NULL CHECK (ano_referencia >= 2000 AND ano_referencia <= 2100),

    -- Integração com folha
    folha_processada BOOLEAN DEFAULT false,
    payroll_event_id UUID REFERENCES rh.payroll_events(id) ON DELETE SET NULL,

    -- Reflexos (CLT: incide em férias, 13º, FGTS, DSR)
    incidencia_ferias BOOLEAN DEFAULT true,
    incidencia_13_salario BOOLEAN DEFAULT true,
    incidencia_fgts BOOLEAN DEFAULT true,
    incidencia_dsr BOOLEAN DEFAULT true,

    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sobreaviso_escalas_company_id ON rh.sobreaviso_escalas(company_id);
CREATE INDEX IF NOT EXISTS idx_sobreaviso_escalas_employee_id ON rh.sobreaviso_escalas(employee_id);
CREATE INDEX IF NOT EXISTS idx_sobreaviso_escalas_data_escala ON rh.sobreaviso_escalas(data_escala);
CREATE INDEX IF NOT EXISTS idx_sobreaviso_escalas_referencia ON rh.sobreaviso_escalas(ano_referencia, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_sobreaviso_escalas_folha_processada ON rh.sobreaviso_escalas(folha_processada) WHERE folha_processada = false;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION rh.update_sobreaviso_escalas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sobreaviso_escalas_updated_at ON rh.sobreaviso_escalas;
CREATE TRIGGER trigger_update_sobreaviso_escalas_updated_at
    BEFORE UPDATE ON rh.sobreaviso_escalas
    FOR EACH ROW
    EXECUTE FUNCTION rh.update_sobreaviso_escalas_updated_at();

-- RLS
ALTER TABLE rh.sobreaviso_escalas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sobreaviso_escalas from their company" ON rh.sobreaviso_escalas
    FOR SELECT USING (public.user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert sobreaviso_escalas in their company" ON rh.sobreaviso_escalas
    FOR INSERT WITH CHECK (public.user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update sobreaviso_escalas from their company" ON rh.sobreaviso_escalas
    FOR UPDATE USING (public.user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can delete sobreaviso_escalas from their company" ON rh.sobreaviso_escalas
    FOR DELETE USING (public.user_has_company_access(auth.uid(), company_id));

COMMENT ON TABLE rh.sobreaviso_escalas IS 'Escalas de sobreaviso: funcionário em regime de espera (1/3 da hora normal, máx. 24h por escala). Súmula 428 TST.';
COMMENT ON COLUMN rh.sobreaviso_escalas.duracao_horas IS 'Duração da escala em horas; máximo 24 horas por escala';
COMMENT ON COLUMN rh.sobreaviso_escalas.valor_pago IS 'Valor remunerado: duracao_horas * valor_hora_normal / 3';
