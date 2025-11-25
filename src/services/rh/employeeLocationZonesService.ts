// =====================================================
// SERVIÇO PARA RELACIONAMENTO EMPLOYEE-LOCATION_ZONES
// =====================================================
// Descrição: Serviço para gerenciar relacionamentos many-to-many entre funcionários e zonas de localização

import { EntityService } from '@/services/generic/entityService';
import { supabase } from '@/integrations/supabase/client';

export interface EmployeeLocationZone {
  id: string;
  employee_id: string;
  location_zone_id: string;
  created_at: string;
}

export interface EmployeeLocationZoneCreate {
  employee_id: string;
  location_zone_id: string;
}

/**
 * Serviço para gerenciar relacionamentos entre funcionários e zonas de localização
 */
export const EmployeeLocationZonesService = {
  /**
   * Lista todas as zonas de localização de um funcionário
   */
  getByEmployeeId: async (employeeId: string, companyId: string): Promise<EmployeeLocationZone[]> => {
    const result = await EntityService.list<EmployeeLocationZone>({
      schema: 'rh',
      table: 'employee_location_zones',
      companyId,
      filters: { employee_id: employeeId },
      orderBy: 'created_at',
      orderDirection: 'ASC',
      skipCompanyFilter: true
    });

    return result.data;
  },

  /**
   * Lista todos os funcionários de uma zona de localização
   */
  getByLocationZoneId: async (locationZoneId: string, companyId: string): Promise<EmployeeLocationZone[]> => {
    const result = await EntityService.list<EmployeeLocationZone>({
      schema: 'rh',
      table: 'employee_location_zones',
      companyId,
      filters: { location_zone_id: locationZoneId },
      orderBy: 'created_at',
      orderDirection: 'ASC',
      skipCompanyFilter: true
    });

    return result.data;
  },

  /**
   * Cria um relacionamento entre funcionário e zona de localização
   */
  create: async (data: EmployeeLocationZoneCreate, companyId: string): Promise<EmployeeLocationZone> => {
    return await EntityService.create<EmployeeLocationZone>({
      schema: 'rh',
      table: 'employee_location_zones',
      companyId,
      data
    });
  },

  /**
   * Remove um relacionamento específico
   */
  delete: async (id: string, companyId: string): Promise<void> => {
    await EntityService.delete({
      schema: 'rh',
      table: 'employee_location_zones',
      companyId,
      id
    });
  },

  /**
   * Remove todos os relacionamentos de um funcionário
   */
  deleteByEmployeeId: async (employeeId: string, companyId: string): Promise<void> => {
    const relationships = await EmployeeLocationZonesService.getByEmployeeId(employeeId, companyId);
    
    // Deletar todos os relacionamentos
    await Promise.all(
      relationships.map(rel => 
        EmployeeLocationZonesService.delete(rel.id, companyId)
      )
    );
  },

  /**
   * Sincroniza os relacionamentos de um funcionário
   * Remove os antigos e cria os novos
   */
  syncEmployeeZones: async (
    employeeId: string, 
    locationZoneIds: string[], 
    companyId: string
  ): Promise<void> => {
    // Remover todos os relacionamentos existentes
    await EmployeeLocationZonesService.deleteByEmployeeId(employeeId, companyId);

    // Criar novos relacionamentos
    await Promise.all(
      locationZoneIds.map(zoneId =>
        EmployeeLocationZonesService.create(
          { employee_id: employeeId, location_zone_id: zoneId },
          companyId
        )
      )
    );
  }
};

