import { supabase } from '@/integrations/supabase/client';
import { EmployeeBenefitAssignment, EmployeeBenefitAssignmentCreateData, EmployeeBenefitAssignmentUpdateData } from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE VÍNCULOS FUNCIONÁRIO-BENEFÍCIO
// =====================================================

export interface EmployeeBenefitAssignmentFilters {
  employee_id?: string;
  benefit_config_id?: string;
  is_active?: boolean;
  search?: string;
}

export interface EmployeeBenefitAssignmentResponse {
  data: EmployeeBenefitAssignment[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Buscar vínculos de benefícios com funcionários
 */
export async function getEmployeeBenefitAssignments(
  companyId: string,
  filters: EmployeeBenefitAssignmentFilters = {}
): Promise<EmployeeBenefitAssignmentResponse> {
  try {
    let query = supabase
      .from('employee_benefit_assignments')
      .select(`
        *,
        employee:employees(id, nome, matricula, cpf),
        benefit_config:benefit_configurations(id, name, benefit_type, description)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (filters.employee_id) {
      query = query.eq('employee_id', filters.employee_id);
    }

    if (filters.benefit_config_id) {
      query = query.eq('benefit_config_id', filters.benefit_config_id);
    }

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters.search) {
      query = query.or(`
        employee.nome.ilike.%${filters.search}%,
        benefit_config.name.ilike.%${filters.search}%
      `);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return {
      data: data || [],
      totalCount: count || 0,
      hasMore: false // Implementar paginação se necessário
    };
  } catch (error) {
    console.error('Erro ao buscar vínculos de benefícios:', error);
    throw error;
  }
}

/**
 * Buscar vínculo por ID
 */
export async function getEmployeeBenefitAssignmentById(
  id: string,
  companyId: string
): Promise<EmployeeBenefitAssignment | null> {
  try {
    const { data, error } = await supabase
      .from('employee_benefit_assignments')
      .select(`
        *,
        employee:employees(id, nome, matricula, cpf),
        benefit_config:benefit_configurations(id, name, benefit_type, description)
      `)
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao buscar vínculo por ID:', error);
    return null;
  }
}

/**
 * Criar novo vínculo de benefício
 */
export async function createEmployeeBenefitAssignment(
  data: EmployeeBenefitAssignmentCreateData
): Promise<EmployeeBenefitAssignment> {
  try {
    const { data: result, error } = await supabase
      .from('employee_benefit_assignments')
      .insert([data])
      .select(`
        *,
        employee:employees(id, nome, matricula, cpf),
        benefit_config:benefit_configurations(id, name, benefit_type, description)
      `)
      .single();

    if (error) {
      throw error;
    }

    return result;
  } catch (error) {
    console.error('Erro ao criar vínculo de benefício:', error);
    throw error;
  }
}

/**
 * Atualizar vínculo de benefício
 */
export async function updateEmployeeBenefitAssignment(
  id: string,
  data: EmployeeBenefitAssignmentUpdateData
): Promise<EmployeeBenefitAssignment> {
  try {
    const { data: result, error } = await supabase
      .from('employee_benefit_assignments')
      .update(data)
      .eq('id', id)
      .select(`
        *,
        employee:employees(id, nome, matricula, cpf),
        benefit_config:benefit_configurations(id, name, benefit_type, description)
      `)
      .single();

    if (error) {
      throw error;
    }

    return result;
  } catch (error) {
    console.error('Erro ao atualizar vínculo de benefício:', error);
    throw error;
  }
}

/**
 * Excluir vínculo de benefício
 */
export async function deleteEmployeeBenefitAssignment(
  id: string,
  companyId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('employee_benefit_assignments')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Erro ao excluir vínculo de benefício:', error);
    throw error;
  }
}

/**
 * Validar se funcionário já possui o benefício ativo
 */
export async function validateBenefitAssignment(
  employeeId: string,
  benefitConfigId: string,
  companyId: string,
  excludeId?: string
): Promise<{ valid: boolean; message: string }> {
  try {
    let query = supabase
      .from('employee_benefit_assignments')
      .select('id, is_active, end_date')
      .eq('employee_id', employeeId)
      .eq('benefit_config_id', benefitConfigId)
      .eq('company_id', companyId);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Verificar se já existe vínculo ativo
    const activeAssignment = data?.find(assignment => 
      assignment.is_active && 
      (!assignment.end_date || new Date(assignment.end_date) > new Date())
    );

    if (activeAssignment) {
      return {
        valid: false,
        message: 'Funcionário já possui este benefício ativo'
      };
    }

    return {
      valid: true,
      message: 'Benefício pode ser atribuído'
    };
  } catch (error) {
    console.error('Erro ao validar vínculo de benefício:', error);
    return {
      valid: false,
      message: 'Erro ao validar vínculo'
    };
  }
}

/**
 * Buscar benefícios de um funcionário específico
 */
export async function getEmployeeBenefits(
  employeeId: string,
  companyId: string
): Promise<EmployeeBenefitAssignment[]> {
  try {
    const { data, error } = await supabase
      .from('employee_benefit_assignments')
      .select(`
        *,
        benefit_config:benefit_configurations(id, name, benefit_type, description, base_value, calculation_type)
      `)
      .eq('employee_id', employeeId)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar benefícios do funcionário:', error);
    throw error;
  }
}

/**
 * Buscar funcionários de um benefício específico
 */
export async function getBenefitEmployees(
  benefitConfigId: string,
  companyId: string
): Promise<EmployeeBenefitAssignment[]> {
  try {
    const { data, error } = await supabase
      .from('employee_benefit_assignments')
      .select(`
        *,
        employee:employees(id, nome, matricula, cpf)
      `)
      .eq('benefit_config_id', benefitConfigId)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar funcionários do benefício:', error);
    throw error;
  }
}

/**
 * Calcular valor do benefício para um funcionário
 */
export async function calculateBenefitValue(
  assignment: EmployeeBenefitAssignment,
  employeeSalary?: number,
  startDate?: Date,
  endDate?: Date
): Promise<number> {
  try {
    // Se tem valor personalizado, usar ele
    if (assignment.custom_value && assignment.custom_value > 0) {
      return assignment.custom_value;
    }

    // Buscar configuração do benefício
    const { data: benefitConfig, error } = await supabase
      .from('benefit_configurations')
      .select('base_value, percentage_value, calculation_type')
      .eq('id', assignment.benefit_config_id)
      .single();

    if (error || !benefitConfig) {
      return 0;
    }

    // Calcular baseado no tipo de cálculo
    switch (benefitConfig.calculation_type) {
      case 'fixed_value':
        return benefitConfig.base_value || 0;
      
      case 'percentage':
        if (employeeSalary && benefitConfig.percentage_value) {
          return (employeeSalary * benefitConfig.percentage_value) / 100;
        }
        return benefitConfig.base_value || 0;
      
      case 'daily_value':
        // Se foram fornecidas datas, usar cálculo baseado em dias reais de trabalho
        if (startDate && endDate && assignment.company_id && assignment.employee_id) {
          try {
            const { data: calculatedValue, error: rpcError } = await supabase.rpc('calculate_daily_benefit_value', {
              company_id_param: assignment.company_id,
              employee_id_param: assignment.employee_id,
              benefit_config_id_param: assignment.benefit_config_id,
              start_date_param: startDate.toISOString().split('T')[0],
              end_date_param: endDate.toISOString().split('T')[0]
            });

            if (!rpcError && calculatedValue !== null) {
              return calculatedValue || 0;
            }
          } catch (rpcError) {
            console.warn('Erro ao calcular benefício com dias reais, usando cálculo padrão:', rpcError);
          }
        }
        
        // Fallback: calcular baseado no período do mês atual ou usar base padrão
        if (startDate && endDate) {
          // Calcular dias trabalhados reais usando a função RPC
          try {
            const { data: workingDays, error: daysError } = await supabase.rpc('calculate_working_days_for_benefits', {
              company_id_param: assignment.company_id,
              employee_id_param: assignment.employee_id,
              start_date_param: startDate.toISOString().split('T')[0],
              end_date_param: endDate.toISOString().split('T')[0]
            });

            if (!daysError && workingDays !== null) {
              return (benefitConfig.base_value || 0) * workingDays;
            }
          } catch (daysError) {
            console.warn('Erro ao calcular dias trabalhados, usando 30 dias padrão:', daysError);
          }
        }
        
        // Fallback final: usar 30 dias por mês (comportamento antigo)
        return (benefitConfig.base_value || 0) * 30;
      
      case 'work_days':
        // Para work_days, sempre usar cálculo baseado em dias reais
        if (startDate && endDate && assignment.company_id && assignment.employee_id) {
          try {
            const { data: workingDays, error: daysError } = await supabase.rpc('calculate_working_days_for_benefits', {
              company_id_param: assignment.company_id,
              employee_id_param: assignment.employee_id,
              start_date_param: startDate.toISOString().split('T')[0],
              end_date_param: endDate.toISOString().split('T')[0]
            });

            if (!daysError && workingDays !== null) {
              return (benefitConfig.base_value || 0) * workingDays;
            }
          } catch (daysError) {
            console.warn('Erro ao calcular dias trabalhados:', daysError);
          }
        }
        return benefitConfig.base_value || 0;
      
      default:
        return benefitConfig.base_value || 0;
    }
  } catch (error) {
    console.error('Erro ao calcular valor do benefício:', error);
    return 0;
  }
}
