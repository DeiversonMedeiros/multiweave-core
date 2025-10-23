import { supabase } from '@/integrations/supabase/client';
import { compensationBusinessRules, ValidationResult, CompensationValidationContext } from '@/lib/validations/compensation-validations';

// =====================================================
// SERVIÇO DE VALIDAÇÃO DE COMPENSAÇÃO
// =====================================================

export class CompensationValidationService {
  /**
   * Valida uma solicitação de compensação completa
   */
  static async validateCompensationRequest(
    employeeId: string, 
    companyId: string, 
    requestedHours: number,
    compensationDate: string,
    compensationType: string
  ): Promise<ValidationResult> {
    try {
      // 1. Verificar se funcionário existe e está ativo
      const { data: employee, error: employeeError } = await supabase
        .from('rh.employees')
        .select('id, nome, status')
        .eq('id', employeeId)
        .eq('company_id', companyId)
        .single();

      if (employeeError || !employee) {
        return {
          isValid: false,
          error: 'Funcionário não encontrado ou inativo'
        };
      }

      if (employee.status !== 'ativo') {
        return {
          isValid: false,
          error: 'Funcionário não está ativo'
        };
      }

      // 2. Verificar saldo do banco de horas (se aplicável)
      if (compensationType === 'banco_horas') {
        const balanceResult = await this.getEmployeeBalance(employeeId, companyId);
        if (!balanceResult.isValid) {
          return balanceResult;
        }

        if (balanceResult.balance !== undefined && balanceResult.balance < requestedHours) {
          return {
            isValid: false,
            error: `Saldo insuficiente no banco de horas. Disponível: ${balanceResult.balance}h, Solicitado: ${requestedHours}h`
          };
        }
      }

      // 3. Verificar limites de horas
      if (requestedHours > 8) {
        return {
          isValid: false,
          error: 'Máximo de 8 horas por solicitação'
        };
      }

      if (requestedHours < 0.5) {
        return {
          isValid: false,
          error: 'Mínimo de 0.5 horas por solicitação'
        };
      }

      // 4. Verificar sobreposição de datas
      const overlapResult = await this.checkDateOverlap(employeeId, companyId, compensationDate);
      if (!overlapResult.isValid) {
        return overlapResult;
      }

      // 5. Verificar se funcionário tem banco de horas configurado (se aplicável)
      if (compensationType === 'banco_horas') {
        const configResult = await this.checkBankHoursConfig(employeeId, companyId);
        if (!configResult.isValid) {
          return configResult;
        }
      }

      return { isValid: true };

    } catch (error) {
      console.error('Erro na validação de compensação:', error);
      return {
        isValid: false,
        error: 'Erro interno na validação'
      };
    }
  }

  /**
   * Obtém o saldo atual do banco de horas do funcionário
   */
  static async getEmployeeBalance(employeeId: string, companyId: string): Promise<ValidationResult & { balance?: number }> {
    try {
      const { data, error } = await supabase
        .rpc('get_bank_hours_balance', {
          p_employee_id: employeeId,
          p_company_id: companyId
        });

      if (error) {
        return {
          isValid: false,
          error: 'Erro ao obter saldo do banco de horas'
        };
      }

      const balance = data?.[0]?.current_balance || 0;
      return {
        isValid: true,
        balance
      };

    } catch (error) {
      return {
        isValid: false,
        error: 'Erro ao consultar saldo do banco de horas'
      };
    }
  }

  /**
   * Verifica sobreposição de datas de compensação
   */
  static async checkDateOverlap(
    employeeId: string, 
    companyId: string, 
    compensationDate: string
  ): Promise<ValidationResult> {
    try {
      const { data: existingRequests, error } = await supabase
        .from('rh.compensation_requests')
        .select('id, data_inicio, status')
        .eq('employee_id', employeeId)
        .eq('company_id', companyId)
        .eq('status', 'aprovado')
        .eq('data_inicio', compensationDate);

      if (error) {
        return {
          isValid: false,
          error: 'Erro ao verificar sobreposição de datas'
        };
      }

      if (existingRequests && existingRequests.length > 0) {
        return {
          isValid: false,
          error: 'Já existe uma compensação aprovada para esta data'
        };
      }

      return { isValid: true };

    } catch (error) {
      return {
        isValid: false,
        error: 'Erro ao verificar sobreposição de datas'
      };
    }
  }

  /**
   * Verifica se funcionário tem banco de horas configurado
   */
  static async checkBankHoursConfig(employeeId: string, companyId: string): Promise<ValidationResult> {
    try {
      const { data: config, error } = await supabase
        .from('rh.bank_hours_config')
        .select('has_bank_hours, is_active')
        .eq('employee_id', employeeId)
        .eq('company_id', companyId)
        .single();

      if (error || !config) {
        return {
          isValid: false,
          error: 'Funcionário não possui banco de horas configurado'
        };
      }

      if (!config.has_bank_hours || !config.is_active) {
        return {
          isValid: false,
          error: 'Banco de horas não está ativo para este funcionário'
        };
      }

      return { isValid: true };

    } catch (error) {
      return {
        isValid: false,
        error: 'Erro ao verificar configuração do banco de horas'
      };
    }
  }

  /**
   * Valida se funcionário pode solicitar compensação
   */
  static async canEmployeeRequestCompensation(employeeId: string, companyId: string): Promise<ValidationResult> {
    try {
      // Verificar se funcionário está ativo
      const { data: employee, error: employeeError } = await supabase
        .from('rh.employees')
        .select('id, status')
        .eq('id', employeeId)
        .eq('company_id', companyId)
        .single();

      if (employeeError || !employee) {
        return {
          isValid: false,
          error: 'Funcionário não encontrado'
        };
      }

      if (employee.status !== 'ativo') {
        return {
          isValid: false,
          error: 'Funcionário não está ativo'
        };
      }

      // Verificar se tem solicitações pendentes em excesso
      const { data: pendingRequests, error: pendingError } = await supabase
        .from('rh.compensation_requests')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('company_id', companyId)
        .eq('status', 'pendente');

      if (pendingError) {
        return {
          isValid: false,
          error: 'Erro ao verificar solicitações pendentes'
        };
      }

      if (pendingRequests && pendingRequests.length >= 3) {
        return {
          isValid: false,
          error: 'Máximo de 3 solicitações pendentes por funcionário'
        };
      }

      return { isValid: true };

    } catch (error) {
      return {
        isValid: false,
        error: 'Erro na validação de permissão'
      };
    }
  }

  /**
   * Valida período de compensação
   */
  static validateCompensationPeriod(requestDate: string, compensationDate: string): ValidationResult {
    const request = new Date(requestDate);
    const compensation = new Date(compensationDate);
    const today = new Date();

    // Data de solicitação não pode ser futura
    if (request > today) {
      return {
        isValid: false,
        error: 'Data de solicitação não pode ser futura'
      };
    }

    // Data de solicitação não pode ser muito antiga (30 dias)
    const daysDiff = Math.floor((today.getTime() - request.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 30) {
      return {
        isValid: false,
        error: 'Data de solicitação não pode ser superior a 30 dias'
      };
    }

    // Data de compensação deve ser futura ou no máximo 7 dias atrás
    const compensationDaysDiff = Math.floor((compensation.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (compensationDaysDiff < -7) {
      return {
        isValid: false,
        error: 'Data de compensação não pode ser superior a 7 dias no passado'
      };
    }

    // Período de compensação não pode ser muito longo (60 dias)
    const periodDays = Math.floor((compensation.getTime() - request.getTime()) / (1000 * 60 * 60 * 24));
    if (periodDays > 60) {
      return {
        isValid: false,
        error: 'Período de compensação não pode ser superior a 60 dias'
      };
    }

    return { isValid: true };
  }
}
