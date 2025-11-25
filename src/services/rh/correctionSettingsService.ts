import { EntityService } from '@/services/generic/entityService';
import { supabase } from '@/integrations/supabase/client';

export interface CorrectionSettings {
  id?: string;
  company_id: string;
  dias_liberacao_correcao: number;
  permitir_correcao_futura: boolean;
  exigir_justificativa: boolean;
  permitir_correcao_apos_aprovacao: boolean;
  dias_limite_correcao: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeePermission {
  id?: string;
  employee_id: string;
  company_id: string;
  mes_ano: string;
  liberado: boolean;
  liberado_por?: string;
  liberado_em?: string;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

export const CorrectionSettingsService = {
  /**
   * Busca configurações de correção da empresa
   */
  getSettings: async (companyId: string): Promise<CorrectionSettings | null> => {
    try {
      const result = await EntityService.list({
        schema: 'rh',
        table: 'correction_settings',
        companyId: companyId,
        filters: { company_id: companyId },
        pageSize: 1
      });

      return result.data?.[0] || null;
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      throw new Error(`Erro ao buscar configurações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  },

  /**
   * Salva configurações de correção
   */
  saveSettings: async (settings: CorrectionSettings): Promise<CorrectionSettings> => {
    try {
      const settingsData = {
        ...settings
      };

      if (settings.id) {
        // Atualizar configurações existentes
        return await EntityService.update({
          schema: 'rh',
          table: 'correction_settings',
          companyId: settings.company_id,
          id: settings.id,
          data: settingsData
        });
      } else {
        // Criar novas configurações
        return await EntityService.create({
          schema: 'rh',
          table: 'correction_settings',
          companyId: settings.company_id,
          data: settingsData
        });
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      throw new Error(`Erro ao salvar configurações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  },

  /**
   * Busca permissões de correção por mês
   */
  getPermissions: async (companyId: string, mesAno: string): Promise<EmployeePermission[]> => {
    try {
      const result = await EntityService.list({
        schema: 'rh',
        table: 'employee_correction_permissions',
        companyId: companyId,
        filters: { 
          company_id: companyId,
          mes_ano: mesAno
        }
      });

      return result.data || [];
    } catch (error) {
      console.error('Erro ao buscar permissões:', error);
      throw new Error(`Erro ao buscar permissões: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  },

  /**
   * Salva permissões de correção
   */
  savePermissions: async (permissions: EmployeePermission[]): Promise<EmployeePermission[]> => {
    try {
      const promises = permissions.map(permission => {
        // Remover campos undefined para evitar erros no banco
        // NÃO incluir liberado_por na atualização para evitar erro de foreign key
        const permissionData: any = {};
        
        if (permission.liberado !== undefined) permissionData.liberado = permission.liberado;
        if (permission.liberado_em) permissionData.liberado_em = permission.liberado_em;
        if (permission.observacoes !== undefined) permissionData.observacoes = permission.observacoes;

        if (permission.id) {
          // Atualizar permissão existente
          return EntityService.update({
            schema: 'rh',
            table: 'employee_correction_permissions',
            companyId: permission.company_id,
            id: permission.id,
            data: permissionData
          });
        } else {
          // Criar nova permissão
          const createData = {
            employee_id: permission.employee_id,
            company_id: permission.company_id,
            mes_ano: permission.mes_ano,
            liberado: permission.liberado,
            liberado_em: permission.liberado_em,
            observacoes: permission.observacoes
          };
          
          // Adicionar liberado_por apenas se estiver definido E for válido
          if (permission.liberado_por) {
            createData.liberado_por = permission.liberado_por;
          }
          
          return EntityService.create({
            schema: 'rh',
            table: 'employee_correction_permissions',
            companyId: permission.company_id,
            data: createData
          });
        }
      });

      return Promise.all(promises);
    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
      throw new Error(`Erro ao salvar permissões: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  },

  /**
   * Libera correção para um funcionário específico
   */
  releasePermission: async (
    employeeId: string, 
    companyId: string, 
    mesAno: string, 
    liberadoPor: string,
    observacoes?: string
  ): Promise<EmployeePermission> => {
    try {
      const permissionData = {
        employee_id: employeeId,
        company_id: companyId,
        mes_ano: mesAno,
        liberado: true,
        liberado_por: liberadoPor,
        liberado_em: new Date().toISOString(),
        observacoes: observacoes
      };

      return await EntityService.create({
        schema: 'rh',
        table: 'employee_correction_permissions',
        companyId: companyId,
        data: permissionData
      });
    } catch (error) {
      console.error('Erro ao liberar permissão:', error);
      throw new Error(`Erro ao liberar permissão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  },

  /**
   * Revoga permissão de correção
   */
  revokePermission: async (permissionId: string, companyId: string): Promise<boolean> => {
    try {
      await EntityService.delete({
        schema: 'rh',
        table: 'employee_correction_permissions',
        companyId: companyId,
        id: permissionId
      });

      return true;
    } catch (error) {
      console.error('Erro ao revogar permissão:', error);
      throw new Error(`Erro ao revogar permissão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  },

  /**
   * Busca estatísticas de permissões
   */
  getStats: async (companyId: string, mesAno?: string): Promise<{
    total_employees: number;
    permissions_granted: number;
    permissions_pending: number;
  }> => {
    try {
      // Buscar total de funcionários ativos
      const employeesResult = await EntityService.list({
        schema: 'rh',
        table: 'employees',
        companyId: companyId,
        filters: { company_id: companyId, status: 'ativo' }
      });

      const totalEmployees = employeesResult.data?.length || 0;

      // Buscar permissões do mês
      const filters: any = { company_id: companyId };
      if (mesAno) {
        filters.mes_ano = mesAno;
      }

      const permissionsResult = await EntityService.list({
        schema: 'rh',
        table: 'employee_correction_permissions',
        companyId: companyId,
        filters: filters
      });

      const permissions = permissionsResult.data || [];
      const permissionsGranted = permissions.filter(p => p.liberado).length;
      const permissionsPending = totalEmployees - permissionsGranted;

      return {
        total_employees: totalEmployees,
        permissions_granted: permissionsGranted,
        permissions_pending: permissionsPending
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw new Error(`Erro ao buscar estatísticas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }
};
