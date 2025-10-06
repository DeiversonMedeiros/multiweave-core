-- =====================================================
-- CRIAÇÃO DA TABELA WORK_SHIFTS (TURNOS DE TRABALHO)
-- =====================================================

-- Criar tabela de turnos de trabalho
CREATE TABLE IF NOT EXISTS rh.work_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    codigo VARCHAR(50) UNIQUE,
    descricao TEXT,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    intervalo_inicio TIME,
    intervalo_fim TIME,
    horas_diarias DECIMAL(4,2) NOT NULL DEFAULT 8.0,
    dias_semana INTEGER[] DEFAULT '{1,2,3,4,5}', -- 1=Segunda, 2=Terça, etc.
    tipo_turno VARCHAR(50) DEFAULT 'normal', -- normal, noturno, rotativo
    tolerancia_entrada INTEGER DEFAULT 0, -- minutos de tolerância
    tolerancia_saida INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_work_shifts_company_id ON rh.work_shifts(company_id);
CREATE INDEX IF NOT EXISTS idx_work_shifts_codigo ON rh.work_shifts(codigo);
CREATE INDEX IF NOT EXISTS idx_work_shifts_status ON rh.work_shifts(status);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_work_shifts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_work_shifts_updated_at
    BEFORE UPDATE ON rh.work_shifts
    FOR EACH ROW
    EXECUTE FUNCTION update_work_shifts_updated_at();

-- Habilitar RLS
ALTER TABLE rh.work_shifts ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view work_shifts from their company" ON rh.work_shifts
    FOR SELECT USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'work_shifts', 'read')
    );

CREATE POLICY "Users can insert work_shifts in their company" ON rh.work_shifts
    FOR INSERT WITH CHECK (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'work_shifts', 'create')
    );

CREATE POLICY "Users can update work_shifts from their company" ON rh.work_shifts
    FOR UPDATE USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'work_shifts', 'edit')
    );

CREATE POLICY "Users can delete work_shifts from their company" ON rh.work_shifts
    FOR DELETE USING (
        company_id = ANY(get_user_companies()) AND 
        check_access_permission('rh', 'work_shifts', 'delete')
    );

-- Comentários
COMMENT ON TABLE rh.work_shifts IS 'Tabela de turnos de trabalho';
COMMENT ON COLUMN rh.work_shifts.dias_semana IS 'Array com dias da semana: 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado, 7=Domingo';
COMMENT ON COLUMN rh.work_shifts.tolerancia_entrada IS 'Tolerância em minutos para entrada';
COMMENT ON COLUMN rh.work_shifts.tolerancia_saida IS 'Tolerância em minutos para saída';

