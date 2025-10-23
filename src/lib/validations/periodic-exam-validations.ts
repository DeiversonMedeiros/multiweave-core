import { z } from 'zod';

// =====================================================
// SCHEMA DE VALIDAÇÃO PARA EXAMES PERIÓDICOS
// =====================================================

export const periodicExamSchema = z.object({
  employee_id: z.string().min(1, 'Funcionário é obrigatório'),
  
  tipo_exame: z.enum([
    'admissional', 
    'periodico', 
    'demissional', 
    'retorno_trabalho', 
    'mudanca_funcao', 
    'ambiental'
  ], {
    errorMap: () => ({ message: 'Tipo de exame inválido' })
  }),
  
  data_agendamento: z.string().min(1, 'Data de agendamento é obrigatória')
    .refine((date) => {
      const examDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return examDate >= today;
    }, 'Data de agendamento não pode ser no passado'),
  
  data_realizacao: z.string().optional()
    .refine((date) => {
      if (!date) return true;
      const examDate = new Date(date);
      const today = new Date();
      return examDate <= today;
    }, 'Data de realização não pode ser no futuro'),
  
  data_vencimento: z.string().min(1, 'Data de vencimento é obrigatória')
    .refine((date) => {
      const dueDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate >= today;
    }, 'Data de vencimento não pode ser no passado'),
  
  status: z.enum([
    'agendado', 
    'realizado', 
    'vencido', 
    'cancelado', 
    'reagendado'
  ]).default('agendado'),
  
  medico_responsavel: z.string().optional(),
  
  clinica_local: z.string().optional(),
  
  observacoes: z.string().optional(),
  
  resultado: z.enum([
    'apto', 
    'inapto', 
    'apto_com_restricoes', 
    'pendente'
  ]).optional(),
  
  restricoes: z.string().optional(),
  
  anexos: z.array(z.string().url()).default([]),
  
  custo: z.number().min(0, 'Custo não pode ser negativo').optional(),
  
  pago: z.boolean().default(false),
  
  data_pagamento: z.string().optional()
    .refine((date) => {
      if (!date) return true;
      const paymentDate = new Date(date);
      const today = new Date();
      return paymentDate <= today;
    }, 'Data de pagamento não pode ser no futuro'),
})
.refine((data) => {
  // Médico obrigatório para exames realizados
  if (data.status === 'realizado' && !data.medico_responsavel) {
    return false;
  }
  return true;
}, {
  message: 'Médico responsável é obrigatório para exames realizados',
  path: ['medico_responsavel']
})
.refine((data) => {
  // Data de realização obrigatória para exames realizados
  if (data.status === 'realizado' && !data.data_realizacao) {
    return false;
  }
  return true;
}, {
  message: 'Data de realização é obrigatória para exames realizados',
  path: ['data_realizacao']
})
.refine((data) => {
  // Resultado obrigatório para exames realizados
  if (data.status === 'realizado' && !data.resultado) {
    return false;
  }
  return true;
}, {
  message: 'Resultado é obrigatório para exames realizados',
  path: ['resultado']
})
.refine((data) => {
  // Restrições obrigatórias para resultados com restrições
  if (data.resultado === 'apto_com_restricoes' && !data.restricoes) {
    return false;
  }
  return true;
}, {
  message: 'Restrições são obrigatórias para resultados com restrições',
  path: ['restricoes']
})
.refine((data) => {
  // Data de pagamento obrigatória se pago
  if (data.pago && !data.data_pagamento) {
    return false;
  }
  return true;
}, {
  message: 'Data de pagamento é obrigatória quando o exame é marcado como pago',
  path: ['data_pagamento']
})
.refine((data) => {
  // Data de realização deve ser posterior à data de agendamento
  if (data.data_realizacao && data.data_agendamento) {
    const agendamento = new Date(data.data_agendamento);
    const realizacao = new Date(data.data_realizacao);
    return realizacao >= agendamento;
  }
  return true;
}, {
  message: 'Data de realização deve ser posterior à data de agendamento',
  path: ['data_realizacao']
})
.refine((data) => {
  // Data de vencimento deve ser posterior à data de agendamento
  if (data.data_vencimento && data.data_agendamento) {
    const agendamento = new Date(data.data_agendamento);
    const vencimento = new Date(data.data_vencimento);
    return vencimento >= agendamento;
  }
  return true;
}, {
  message: 'Data de vencimento deve ser posterior à data de agendamento',
  path: ['data_vencimento']
});

// =====================================================
// SCHEMA BASE (SEM REFINEMENTS)
// =====================================================

const basePeriodicExamSchema = z.object({
  employee_id: z.string().min(1, 'Funcionário é obrigatório'),
  
  tipo_exame: z.enum([
    'admissional', 
    'periodico', 
    'demissional', 
    'retorno_trabalho', 
    'mudanca_funcao', 
    'ambiental'
  ], {
    errorMap: () => ({ message: 'Tipo de exame inválido' })
  }),
  
  data_agendamento: z.string().min(1, 'Data de agendamento é obrigatória')
    .refine((date) => {
      const examDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return examDate >= today;
    }, 'Data de agendamento não pode ser no passado'),
  
  data_realizacao: z.string().optional()
    .refine((date) => {
      if (!date) return true;
      const examDate = new Date(date);
      const today = new Date();
      return examDate <= today;
    }, 'Data de realização não pode ser no futuro'),
  
  data_vencimento: z.string().min(1, 'Data de vencimento é obrigatória')
    .refine((date) => {
      const dueDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate >= today;
    }, 'Data de vencimento não pode ser no passado'),
  
  status: z.enum([
    'agendado', 
    'realizado', 
    'vencido', 
    'cancelado', 
    'reagendado'
  ]).default('agendado'),
  
  medico_responsavel: z.string().optional(),
  
  clinica_local: z.string().optional(),
  
  observacoes: z.string().optional(),
  
  resultado: z.enum([
    'apto', 
    'inapto', 
    'apto_com_restricoes', 
    'pendente'
  ]).optional(),
  
  restricoes: z.string().optional(),
  
  anexos: z.array(z.string().url()).default([]),
  
  custo: z.number().min(0, 'Custo não pode ser negativo').optional(),
  
  pago: z.boolean().default(false),
  
  data_pagamento: z.string().optional()
    .refine((date) => {
      if (!date) return true;
      const paymentDate = new Date(date);
      const today = new Date();
      return paymentDate <= today;
    }, 'Data de pagamento não pode ser no futuro'),
});

// =====================================================
// SCHEMA PARA CRIAÇÃO DE EXAMES
// =====================================================

export const createPeriodicExamSchema = basePeriodicExamSchema.omit({
  status: true, // Status será definido automaticamente
});

// =====================================================
// SCHEMA PARA ATUALIZAÇÃO DE EXAMES
// =====================================================

export const updatePeriodicExamSchema = basePeriodicExamSchema.partial().extend({
  id: z.string().min(1, 'ID é obrigatório'),
});

// =====================================================
// SCHEMA PARA AGENDAMENTO AUTOMÁTICO
// =====================================================

export const automaticSchedulingSchema = z.object({
  company_id: z.string().min(1, 'ID da empresa é obrigatório'),
  exam_type: z.enum(['periodico']).default('periodico'),
  days_ahead: z.number().min(1).max(365).default(30),
  cost: z.number().min(0).default(200),
  observations: z.string().optional(),
});

// =====================================================
// SCHEMA PARA FILTROS DE EXAMES
// =====================================================

export const examFiltersSchema = z.object({
  employee_id: z.string().optional(),
  tipo_exame: z.string().optional(),
  status: z.string().optional(),
  resultado: z.string().optional(),
  data_inicio: z.string().optional(),
  data_fim: z.string().optional(),
  medico_responsavel: z.string().optional(),
  clinica_local: z.string().optional(),
});

// =====================================================
// TIPOS TYPESCRIPT
// =====================================================

export type PeriodicExamFormData = z.infer<typeof periodicExamSchema>;
export type CreatePeriodicExamData = z.infer<typeof createPeriodicExamSchema>;
export type UpdatePeriodicExamData = z.infer<typeof updatePeriodicExamSchema>;
export type AutomaticSchedulingData = z.infer<typeof automaticSchedulingSchema>;
export type ExamFiltersData = z.infer<typeof examFiltersSchema>;

// =====================================================
// FUNÇÕES DE VALIDAÇÃO
// =====================================================

export function validatePeriodicExam(data: unknown): PeriodicExamFormData {
  return periodicExamSchema.parse(data);
}

export function validateCreatePeriodicExam(data: unknown): CreatePeriodicExamData {
  return createPeriodicExamSchema.parse(data);
}

export function validateUpdatePeriodicExam(data: unknown): UpdatePeriodicExamData {
  return updatePeriodicExamSchema.parse(data);
}

export function validateAutomaticScheduling(data: unknown): AutomaticSchedulingData {
  return automaticSchedulingSchema.parse(data);
}

export function validateExamFilters(data: unknown): ExamFiltersData {
  return examFiltersSchema.parse(data);
}

// =====================================================
// FUNÇÕES DE VALIDAÇÃO SEGURA
// =====================================================

export function safeValidatePeriodicExam(data: unknown) {
  return periodicExamSchema.safeParse(data);
}

export function safeValidateCreatePeriodicExam(data: unknown) {
  return createPeriodicExamSchema.safeParse(data);
}

export function safeValidateUpdatePeriodicExam(data: unknown) {
  return updatePeriodicExamSchema.safeParse(data);
}

export function safeValidateAutomaticScheduling(data: unknown) {
  return automaticSchedulingSchema.safeParse(data);
}

export function safeValidateExamFilters(data: unknown) {
  return examFiltersSchema.safeParse(data);
}
