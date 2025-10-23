-- =====================================================
-- ATUALIZAÇÃO DO SCHEMA DE TURNOS DE TRABALHO
-- Implementação completa conforme documentação
-- =====================================================

-- Adicionar novos campos à tabela work_shifts
ALTER TABLE rh.work_shifts 
ADD COLUMN IF NOT EXISTS tipo_escala VARCHAR(50) DEFAULT 'fixa',
ADD COLUMN IF NOT EXISTS dias_trabalho INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS dias_folga INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS ciclo_dias INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS regras_clt JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS template_escala BOOLEAN DEFAULT false;

-- Criar enum para tipos de escala
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_escala_enum') THEN
        CREATE TYPE tipo_escala_enum AS ENUM (
            'fixa',
            'flexivel_6x1',
            'flexivel_5x2', 
            'flexivel_4x3',
            'escala_12x36',
            'escala_24x48',
            'personalizada'
        );
    END IF;
END $$;

-- Alterar coluna tipo_escala para usar o enum
ALTER TABLE rh.work_shifts 
ALTER COLUMN tipo_escala DROP DEFAULT;

ALTER TABLE rh.work_shifts 
ALTER COLUMN tipo_escala TYPE tipo_escala_enum 
USING tipo_escala::tipo_escala_enum;

ALTER TABLE rh.work_shifts 
ALTER COLUMN tipo_escala SET DEFAULT 'fixa'::tipo_escala_enum;

-- Adicionar constraints de validação CLT
ALTER TABLE rh.work_shifts 
ADD CONSTRAINT check_dias_trabalho_clt 
CHECK (dias_trabalho <= 6 AND dias_trabalho >= 1);

ALTER TABLE rh.work_shifts 
ADD CONSTRAINT check_dias_folga_clt 
CHECK (dias_folga >= 1);

ALTER TABLE rh.work_shifts 
ADD CONSTRAINT check_ciclo_valido 
CHECK (ciclo_dias >= (dias_trabalho + dias_folga));

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_work_shifts_tipo_escala ON rh.work_shifts(tipo_escala);
CREATE INDEX IF NOT EXISTS idx_work_shifts_template ON rh.work_shifts(template_escala);
CREATE INDEX IF NOT EXISTS idx_work_shifts_dias_trabalho ON rh.work_shifts(dias_trabalho);

-- Atualizar dados existentes com configurações padrão
UPDATE rh.work_shifts 
SET 
    tipo_escala = 'fixa',
    dias_trabalho = 5,
    dias_folga = 2,
    ciclo_dias = 7,
    regras_clt = '{"max_dias_consecutivos": 6, "min_dias_folga_semana": 1}',
    template_escala = false
WHERE tipo_escala IS NULL;

-- Comentários para documentação
COMMENT ON COLUMN rh.work_shifts.tipo_escala IS 'Tipo de escala de trabalho conforme CLT';
COMMENT ON COLUMN rh.work_shifts.dias_trabalho IS 'Quantidade de dias de trabalho no ciclo';
COMMENT ON COLUMN rh.work_shifts.dias_folga IS 'Quantidade de dias de folga no ciclo';
COMMENT ON COLUMN rh.work_shifts.ciclo_dias IS 'Ciclo total em dias (dias_trabalho + dias_folga)';
COMMENT ON COLUMN rh.work_shifts.regras_clt IS 'Regras específicas da CLT em formato JSON';
COMMENT ON COLUMN rh.work_shifts.template_escala IS 'Indica se é um template reutilizável';

