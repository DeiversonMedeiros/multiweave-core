import { EntityService } from '@/services/generic/entityService';
import { 
  BankHoursAssignment, 
  BankHoursAssignmentForm,
  BankHoursAssignmentSummary
} from '@/integrations/supabase/bank-hours-types-v2';

// =====================================================
// SERVIÇO DE VÍNCULOS DE BANCO DE HORAS
// =====================================================

export const BankHoursAssignmentsService = {
  /**
   * Lista todos os vínculos de uma empresa
   */
  list: async (companyId: string) => {
    try {
      const result = await EntityService.list<BankHoursAssignment>({
        schema: 'rh',
        table: 'bank_hours_assignments',
        companyId,
        orderBy: 'assigned_at',
        orderDirection: 'DESC'
      });

      // Buscar dados relacionados para cada vínculo
      const assignmentsWithRelations = await Promise.all(
        result.data.map(async (assignment) => {
          // Buscar dados do funcionário
          const employeeResult = await EntityService.getById('rh', 'employees', assignment.employee_id, companyId);
          
          // Buscar dados do tipo
          const typeResult = await EntityService.getById('rh', 'bank_hours_types', assignment.bank_hours_type_id, companyId);

          return {
            ...assignment,
            employee: employeeResult ? {
              id: employeeResult.id,
              nome: employeeResult.nome,
              matricula: employeeResult.matricula,
              cpf: employeeResult.cpf
            } : null,
            bank_hours_type: typeResult ? {
              id: typeResult.id,
              name: typeResult.name,
              code: typeResult.code,
              description: typeResult.description
            } : null
          };
        })
      );

      return assignmentsWithRelations;
    } catch (error) {
      console.error('❌ Erro ao buscar vínculos de banco de horas:', error);
      return [];
    }
  },

  /**
   * Busca vínculos de um funcionário específico
   */
  getByEmployee: async (employeeId: string, companyId: string): Promise<BankHoursAssignment | null> => {
    try {
      const result = await EntityService.list<BankHoursAssignment>({
        schema: 'rh',
        table: 'bank_hours_assignments',
        companyId,
        filters: { employee_id: employeeId, is_active: true }
      });

      if (result.data.length === 0) return null;

      const assignment = result.data[0];
      
      // Buscar dados relacionados
      const employeeResult = await EntityService.getById('rh', 'employees', assignment.employee_id, companyId);
      const typeResult = await EntityService.getById('rh', 'bank_hours_types', assignment.bank_hours_type_id, companyId);

      return {
        ...assignment,
        employee: employeeResult ? {
          id: employeeResult.id,
          nome: employeeResult.nome,
          matricula: employeeResult.matricula,
          cpf: employeeResult.cpf
        } : null,
        bank_hours_type: typeResult ? {
          id: typeResult.id,
          name: typeResult.name,
          code: typeResult.code,
          description: typeResult.description
        } : null
      };
    } catch (error) {
      console.error('❌ Erro ao buscar vínculo do funcionário:', error);
      return null;
    }
  },

  /**
   * Busca vínculos de um tipo específico
   */
  getByType: async (typeId: string, companyId: string): Promise<BankHoursAssignment[]> => {
    try {
      const result = await EntityService.list<BankHoursAssignment>({
        schema: 'rh',
        table: 'bank_hours_assignments',
        companyId,
        filters: { bank_hours_type_id: typeId, is_active: true },
        orderBy: 'assigned_at',
        orderDirection: 'DESC'
      });

      // Buscar dados relacionados para cada vínculo
      const assignmentsWithRelations = await Promise.all(
        result.data.map(async (assignment) => {
          // Buscar dados do funcionário
          const employeeResult = await EntityService.getById('rh', 'employees', assignment.employee_id, companyId);
          
          // Buscar dados do tipo
          const typeResult = await EntityService.getById('rh', 'bank_hours_types', assignment.bank_hours_type_id, companyId);

          return {
            ...assignment,
            employee: employeeResult ? {
              id: employeeResult.id,
              nome: employeeResult.nome,
              matricula: employeeResult.matricula,
              cpf: employeeResult.cpf
            } : null,
            bank_hours_type: typeResult ? {
              id: typeResult.id,
              name: typeResult.name,
              code: typeResult.code,
              description: typeResult.description
            } : null
          };
        })
      );

      return assignmentsWithRelations;
    } catch (error) {
      console.error('❌ Erro ao buscar vínculos do tipo:', error);
      return [];
    }
  },

  /**
   * Cria um novo vínculo
   */
  create: async (assignment: BankHoursAssignmentForm, companyId: string): Promise<BankHoursAssignment> => {
    // Buscar e desativar vínculo anterior do funcionário se existir
    const existingAssignments = await EntityService.list<BankHoursAssignment>({
      schema: 'rh',
      table: 'bank_hours_assignments',
      companyId,
      filters: { employee_id: assignment.employee_id, is_active: true }
    });

    // Desativar vínculos existentes
    for (const existingAssignment of existingAssignments.data) {
      await EntityService.update({
        schema: 'rh',
        table: 'bank_hours_assignments',
        companyId,
        id: existingAssignment.id,
        data: { is_active: false }
      });
    }

    // Criar novo vínculo
    return await EntityService.create<BankHoursAssignment>({
      schema: 'rh',
      table: 'bank_hours_assignments',
      companyId,
      data: assignment
    });
  },

  /**
   * Atualiza um vínculo
   */
  update: async (id: string, assignment: Partial<BankHoursAssignmentForm>, companyId: string): Promise<BankHoursAssignment> => {
    return await EntityService.update<BankHoursAssignment>({
      schema: 'rh',
      table: 'bank_hours_assignments',
      companyId,
      id,
      data: assignment
    });
  },

  /**
   * Remove um vínculo (desativa)
   */
  delete: async (id: string, companyId: string): Promise<void> => {
    return await EntityService.update({
      schema: 'rh',
      table: 'bank_hours_assignments',
      companyId,
      id,
      data: { is_active: false }
    });
  },

  /**
   * Atribui tipo padrão a funcionários sem vínculo
   */
  assignDefaultType: async (employeeIds: string[], companyId: string): Promise<BankHoursAssignment[]> => {
    try {
      // Buscar tipo padrão da empresa
      const { BankHoursTypesService } = await import('./bankHoursTypesService');
      const defaultType = await BankHoursTypesService.getDefault(companyId);
      
      if (!defaultType) {
        throw new Error('Nenhum tipo padrão encontrado para a empresa');
      }

      const assignments: BankHoursAssignment[] = [];

      for (const employeeId of employeeIds) {
        // Verificar se já tem vínculo ativo
        const existingAssignment = await BankHoursAssignmentsService.getByEmployee(employeeId, companyId);
        
        if (!existingAssignment) {
          const assignment = await BankHoursAssignmentsService.create({
            employee_id: employeeId,
            bank_hours_type_id: defaultType.id
          }, companyId);
          
          assignments.push(assignment);
        }
      }

      return assignments;
    } catch (error) {
      console.error('❌ Erro ao atribuir tipo padrão:', error);
      throw error;
    }
  },

  /**
   * Busca funcionários sem vínculo de banco de horas
   */
  getUnassignedEmployees: async (companyId: string) => {
    try {
      // Esta função precisaria de uma query mais complexa
      // Por enquanto, retornamos uma lista vazia
      // TODO: Implementar query para buscar funcionários sem vínculo
      return [];
    } catch (error) {
      console.error('❌ Erro ao buscar funcionários sem vínculo:', error);
      return [];
    }
  },

  /**
   * Busca resumo dos vínculos
   */
  getSummary: async (companyId: string): Promise<BankHoursAssignmentSummary[]> => {
    try {
      const assignments = await BankHoursAssignmentsService.list(companyId);
      
      // TODO: Implementar busca com relacionamentos para obter dados completos
      return assignments.map(assignment => ({
        id: assignment.id,
        employee_name: assignment.employee?.nome || 'Nome não encontrado',
        employee_matricula: assignment.employee?.matricula,
        type_name: assignment.bank_hours_type?.name || 'Tipo não encontrado',
        type_code: assignment.bank_hours_type?.code || '',
        is_active: assignment.is_active,
        assigned_at: assignment.assigned_at,
        assigned_by: assignment.assigned_by
      }));
    } catch (error) {
      console.error('❌ Erro ao buscar resumo dos vínculos:', error);
      return [];
    }
  }
};
