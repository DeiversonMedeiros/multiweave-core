import { z } from 'zod';
import { parseISO, isValid, isFuture, differenceInDays } from 'date-fns';

// =====================================================
// VALIDAÇÕES DE SOLICITAÇÃO DE COMPENSAÇÃO
// =====================================================

export const compensationRequestValidationSchema = z.object({
  employee_id: z.string().min(1, 'Funcionário é obrigatório'),
  data_inicio: z.string().refine((date) => {
    const parsedDate = parseISO(date);
    if (!isValid(parsedDate)) return false;
    const today = new Date();
    return !isFuture(parsedDate) && differenceInDays(today, parsedDate) <= 30;
  }, 'Data de solicitação deve ser atual ou até 30 dias atrás'),
  data_fim: z.string().refine((date) => {
    const parsedDate = parseISO(date);
    if (!isValid(parsedDate)) return false;
    const today = new Date();
    return differenceInDays(parsedDate, today) >= -7;
  }, 'Data de compensação deve ser futura ou no máximo 7 dias atrás'),
  quantidade_horas: z.number()
    .min(0.5, 'Quantidade deve ser maior que 0.5 horas')
    .max(8, 'Quantidade não pode exceder 8 horas'),
  descricao: z.string()
    .min(20, 'Justificativa deve ter pelo menos 20 caracteres')
    .max(500, 'Justificativa deve ter no máximo 500 caracteres'),
  status: z.enum(['pendente', 'aprovado', 'rejeitado', 'realizado']),
  company_id: z.string().min(1, 'Empresa é obrigatória'),
  tipo: z.enum([
    'horas_extras', 
    'banco_horas', 
    'adicional_noturno', 
    'adicional_periculosidade', 
    'adicional_insalubridade', 
    'dsr', 
    'feriado', 
    'outros'
  ]),
  valor_hora: z.number().optional(),
  valor_total: z.number().optional(),
  motivo_rejeicao: z.string().optional(),
  observacoes: z.string().optional(),
  anexos: z.array(z.string()).optional(),
});

// =====================================================
// REGRAS DE NEGÓCIO
// =====================================================

export const compensationBusinessRules = {
  // Verificar se período de compensação é válido
  isValidCompensationPeriod(requestDate: string, compensationDate: string): boolean {
    const request = parseISO(requestDate);
    const compensation = parseISO(compensationDate);
    
    if (!isValid(request) || !isValid(compensation)) return false;
    
    // Compensação deve ser no máximo 60 dias após a solicitação
    return differenceInDays(compensation, request) <= 60;
  },
  
  // Verificar se funcionário tem saldo suficiente no banco de horas
  hasSufficientBalance(timeBankBalance: number, requestedHours: number): boolean {
    return timeBankBalance >= requestedHours;
  },
  
  // Verificar se não há sobreposição com outras compensações
  hasOverlap(existingRequests: any[], newCompensationDate: string, excludeId?: string): boolean {
    const newDate = parseISO(newCompensationDate);
    
    return existingRequests.some(request => {
      if (excludeId && request.id === excludeId) return false;
      if (request.status !== 'aprovado') return false;
      
      const existingDate = parseISO(request.data_inicio);
      
      // Verifica se é o mesmo dia
      return (
        newDate.getFullYear() === existingDate.getFullYear() &&
        newDate.getMonth() === existingDate.getMonth() &&
        newDate.getDate() === existingDate.getDate()
      );
    });
  },

  // Validação de limites do banco de horas
  validateTimeBankLimits(currentBalance: number, newAmount: number, type: 'credito' | 'debito'): boolean {
    const maxCredit = 120;  // Máximo de 120 horas de crédito
    const maxDebit = 40;    // Máximo de 40 horas de débito
    
    if (type === 'credito') {
      return (currentBalance + newAmount) <= maxCredit;
    } else {
      return (currentBalance - newAmount) >= -maxDebit;
    }
  },

  // Calcular saldo do banco de horas
  calculateTimeBankBalance(timeBankRecords: any[]): number {
    return timeBankRecords.reduce((balance, record) => {
      return record.tipo === 'credito' 
        ? balance + record.quantidade 
        : balance - record.quantidade;
    }, 0);
  }
};

// =====================================================
// TIPOS DE VALIDAÇÃO
// =====================================================

export type CompensationRequestFormData = z.infer<typeof compensationRequestValidationSchema>;

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface CompensationValidationContext {
  employeeId: string;
  companyId: string;
  requestedHours: number;
  compensationDate: string;
  existingRequests?: any[];
  timeBankBalance?: number;
}

// =====================================================
// FUNÇÃO DE VALIDAÇÃO COMPLETA
// =====================================================

export async function validateCompensationRequest(
  data: CompensationRequestFormData,
  context: CompensationValidationContext
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validação básica do schema
  try {
    compensationRequestValidationSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(...error.errors.map(e => e.message));
    }
  }

  // Validação de período
  if (!compensationBusinessRules.isValidCompensationPeriod(data.data_inicio, data.data_fim)) {
    errors.push('Período de compensação inválido');
  }

  // Validação de saldo (se aplicável)
  if (data.tipo === 'banco_horas' && context.timeBankBalance !== undefined) {
    if (!compensationBusinessRules.hasSufficientBalance(context.timeBankBalance, data.quantidade_horas)) {
      errors.push('Saldo insuficiente no banco de horas');
    }
  }

  // Validação de sobreposição
  if (context.existingRequests) {
    if (compensationBusinessRules.hasOverlap(context.existingRequests, data.data_inicio)) {
      warnings.push('Já existe uma compensação aprovada para esta data');
    }
  }

  return {
    isValid: errors.length === 0,
    error: errors.length > 0 ? errors[0] : undefined,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}
