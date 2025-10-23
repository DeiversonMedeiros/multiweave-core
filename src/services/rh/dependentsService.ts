import { EntityService } from '@/services/generic/entityService';
import { 
  Dependent, 
  DependentCreateData, 
  DependentUpdateData,
  DependentWithEmployee,
  DependentFilters
} from '@/integrations/supabase/rh-types';

// =====================================================
// SERVIÇO DE DEPENDENTES
// =====================================================

export const DependentsService = {
  /**
   * Lista todos os dependentes de uma empresa
   */
  list: async (companyId: string, filters?: DependentFilters) => {
    const result = await EntityService.list<Dependent>({
      schema: 'rh',
      table: 'dependents',
      companyId,
      orderBy: 'nome',
      orderDirection: 'ASC',
      filters
    });

    return result.data;
  },

  /**
   * Lista dependentes com informações do funcionário
   */
  listWithEmployee: async (companyId: string, filters?: DependentFilters) => {
    const result = await EntityService.list<DependentWithEmployee>({
      schema: 'rh',
      table: 'dependents_with_employee',
      companyId,
      orderBy: 'funcionario_nome, nome',
      orderDirection: 'ASC',
      filters
    });

    return result.data;
  },

  /**
   * Busca um dependente por ID
   */
  getById: async (id: string, companyId: string): Promise<Dependent | null> => {
    return await EntityService.getById<Dependent>('rh', 'dependents', id, companyId);
  },

  /**
   * Busca dependentes de um funcionário específico
   */
  getByEmployeeId: async (employeeId: string, companyId: string): Promise<Dependent[]> => {
    const result = await EntityService.list<Dependent>({
      schema: 'rh',
      table: 'dependents',
      companyId,
      filters: { employee_id: employeeId },
      orderBy: 'nome',
      orderDirection: 'ASC'
    });

    return result.data;
  },

  /**
   * Busca dependentes ativos de um funcionário
   */
  getActiveByEmployeeId: async (employeeId: string, companyId: string): Promise<Dependent[]> => {
    const result = await EntityService.list<Dependent>({
      schema: 'rh',
      table: 'dependents',
      companyId,
      filters: { 
        employee_id: employeeId,
        status: 'ativo'
      },
      orderBy: 'nome',
      orderDirection: 'ASC'
    });

    return result.data;
  },

  /**
   * Cria um novo dependente
   */
  create: async (dependent: DependentCreateData, companyId: string): Promise<Dependent> => {
    return await EntityService.create<Dependent>({
      schema: 'rh',
      table: 'dependents',
      companyId,
      data: dependent
    });
  },

  /**
   * Atualiza um dependente
   */
  update: async (id: string, dependent: DependentUpdateData, companyId: string): Promise<Dependent> => {
    return await EntityService.update<Dependent>({
      schema: 'rh',
      table: 'dependents',
      companyId,
      id,
      data: dependent
    });
  },

  /**
   * Remove um dependente (soft delete)
   */
  delete: async (id: string, companyId: string, motivo?: string): Promise<void> => {
    const updateData: DependentUpdateData = {
      id,
      status: 'excluido',
      data_exclusao: new Date().toISOString().split('T')[0],
      motivo_exclusao: motivo || 'Exclusão solicitada'
    };

    await EntityService.update<Dependent>({
      schema: 'rh',
      table: 'dependents',
      companyId,
      id,
      data: updateData
    });
  },

  /**
   * Remove permanentemente um dependente
   */
  permanentDelete: async (id: string, companyId: string): Promise<void> => {
    return await EntityService.delete({
      schema: 'rh',
      table: 'dependents',
      companyId,
      id
    });
  },

  /**
   * Ativa um dependente
   */
  activate: async (id: string, companyId: string): Promise<Dependent> => {
    return await EntityService.update<Dependent>({
      schema: 'rh',
      table: 'dependents',
      companyId,
      id,
      data: {
        status: 'ativo',
        data_exclusao: null,
        motivo_exclusao: null
      }
    });
  },

  /**
   * Suspende um dependente
   */
  suspend: async (id: string, companyId: string, motivo?: string): Promise<Dependent> => {
    return await EntityService.update<Dependent>({
      schema: 'rh',
      table: 'dependents',
      companyId,
      id,
      data: {
        status: 'suspenso',
        observacoes: motivo ? `Suspenso: ${motivo}` : 'Suspenso'
      }
    });
  },

  /**
   * Busca dependentes por CPF
   */
  getByCpf: async (cpf: string, companyId: string): Promise<Dependent | null> => {
    const result = await EntityService.list<Dependent>({
      schema: 'rh',
      table: 'dependents',
      companyId,
      filters: { cpf: cpf }
    });

    return result.data.length > 0 ? result.data[0] : null;
  },

  /**
   * Busca dependentes por parentesco
   */
  getByParentesco: async (parentesco: string, companyId: string): Promise<Dependent[]> => {
    const result = await EntityService.list<Dependent>({
      schema: 'rh',
      table: 'dependents',
      companyId,
      filters: { 
        parentesco: parentesco,
        status: 'ativo'
      },
      orderBy: 'nome',
      orderDirection: 'ASC'
    });

    return result.data;
  },

  /**
   * Busca dependentes com deficiência
   */
  getWithDeficiency: async (companyId: string): Promise<Dependent[]> => {
    const result = await EntityService.list<Dependent>({
      schema: 'rh',
      table: 'dependents',
      companyId,
      filters: { 
        possui_deficiencia: true,
        status: 'ativo'
      },
      orderBy: 'nome',
      orderDirection: 'ASC'
    });

    return result.data;
  },

  /**
   * Busca dependentes que necessitam cuidados especiais
   */
  getWithSpecialCare: async (companyId: string): Promise<Dependent[]> => {
    const result = await EntityService.list<Dependent>({
      schema: 'rh',
      table: 'dependents',
      companyId,
      filters: { 
        necessita_cuidados_especiais: true,
        status: 'ativo'
      },
      orderBy: 'nome',
      orderDirection: 'ASC'
    });

    return result.data;
  },

  /**
   * Busca dependentes por faixa etária
   */
  getByAgeRange: async (minAge: number, maxAge: number, companyId: string): Promise<Dependent[]> => {
    const result = await EntityService.list<Dependent>({
      schema: 'rh',
      table: 'dependents',
      companyId,
      filters: { 
        status: 'ativo'
      },
      orderBy: 'data_nascimento',
      orderDirection: 'DESC'
    });

    // Filtrar por faixa etária no código (já que não temos filtro direto no banco)
    const today = new Date();
    return result.data.filter(dependent => {
      if (!dependent.data_nascimento) return false;
      
      const birthDate = new Date(dependent.data_nascimento);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age >= minAge && age <= maxAge;
    });
  },

  /**
   * Busca dependentes que fazem aniversário em um mês específico
   */
  getByBirthMonth: async (month: number, companyId: string): Promise<Dependent[]> => {
    const result = await EntityService.list<Dependent>({
      schema: 'rh',
      table: 'dependents',
      companyId,
      filters: { 
        status: 'ativo'
      },
      orderBy: 'data_nascimento',
      orderDirection: 'ASC'
    });

    // Filtrar por mês de nascimento
    return result.data.filter(dependent => {
      if (!dependent.data_nascimento) return false;
      
      const birthDate = new Date(dependent.data_nascimento);
      return birthDate.getMonth() + 1 === month; // getMonth() retorna 0-11
    });
  },

  /**
   * Conta dependentes por funcionário
   */
  countByEmployee: async (employeeId: string, companyId: string): Promise<number> => {
    const result = await EntityService.list<Dependent>({
      schema: 'rh',
      table: 'dependents',
      companyId,
      filters: { 
        employee_id: employeeId,
        status: 'ativo'
      }
    });

    return result.data.length;
  },

  /**
   * Conta dependentes por parentesco
   */
  countByParentesco: async (companyId: string): Promise<Record<string, number>> => {
    const result = await EntityService.list<Dependent>({
      schema: 'rh',
      table: 'dependents',
      companyId,
      filters: { 
        status: 'ativo'
      }
    });

    const counts: Record<string, number> = {};
    result.data.forEach(dependent => {
      counts[dependent.parentesco] = (counts[dependent.parentesco] || 0) + 1;
    });

    return counts;
  },

  /**
   * Busca dependentes que vão fazer aniversário nos próximos N dias
   */
  getUpcomingBirthdays: async (days: number, companyId: string): Promise<Dependent[]> => {
    const result = await EntityService.list<Dependent>({
      schema: 'rh',
      table: 'dependents',
      companyId,
      filters: { 
        status: 'ativo'
      },
      orderBy: 'data_nascimento',
      orderDirection: 'ASC'
    });

    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + days);

    return result.data.filter(dependent => {
      if (!dependent.data_nascimento) return false;
      
      const birthDate = new Date(dependent.data_nascimento);
      const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      
      // Se o aniversário já passou este ano, considerar o próximo ano
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(today.getFullYear() + 1);
      }
      
      return thisYearBirthday >= today && thisYearBirthday <= futureDate;
    });
  },

  /**
   * Valida se um CPF já está cadastrado como dependente
   */
  isCpfAlreadyRegistered: async (cpf: string, companyId: string, excludeId?: string): Promise<boolean> => {
    const dependent = await DependentsService.getByCpf(cpf, companyId);
    
    if (!dependent) return false;
    
    // Se está editando, excluir o próprio registro da verificação
    if (excludeId && dependent.id === excludeId) return false;
    
    return true;
  },

  /**
   * Busca estatísticas de dependentes
   */
  getStats: async (companyId: string) => {
    const [total, ativos, porParentesco, comDeficiencia, cuidadosEspeciais] = await Promise.all([
      EntityService.list<Dependent>({
        schema: 'rh',
        table: 'dependents',
        companyId
      }),
      EntityService.list<Dependent>({
        schema: 'rh',
        table: 'dependents',
        companyId,
        filters: { status: 'ativo' }
      }),
      DependentsService.countByParentesco(companyId),
      DependentsService.getWithDeficiencia(companyId),
      DependentsService.getWithSpecialCare(companyId)
    ]);

    return {
      total: total.data.length,
      ativos: ativos.data.length,
      inativos: total.data.length - ativos.data.length,
      porParentesco,
      comDeficiencia: comDeficiencia.length,
      cuidadosEspeciais: cuidadosEspeciais.length
    };
  }
};
