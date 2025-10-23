-- =====================================================
-- ADICIONAR TIPOS DE NOTIFICAÇÃO PARA EXAMES PERIÓDICOS
-- =====================================================

-- Remover constraint existente
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Adicionar nova constraint com tipos de exames
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
    'compensation_request', 
    'compensation_approved', 
    'compensation_rejected', 
    'compensation_reminder',
    'vacation_request',
    'vacation_approved',
    'vacation_rejected',
    'medical_certificate',
    'payroll_processed',
    'system_alert',
    'exam_reminder',
    'exam_overdue',
    'exam_scheduled',
    'exam_completed'
));

-- Comentários
COMMENT ON CONSTRAINT notifications_type_check ON public.notifications IS 
'Tipos de notificação incluindo exames periódicos: exam_reminder, exam_overdue, exam_scheduled, exam_completed';
