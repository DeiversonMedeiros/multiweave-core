// =====================================================
// SERVIÇO PARA ZONAS DE LOCALIZAÇÃO
// =====================================================
// Descrição: Serviço para gerenciar zonas geográficas onde é permitido registrar ponto
//            Segue o padrão do sistema usando EntityService

import { EntityService } from '@/services/generic/entityService';

export interface LocationZone {
  id: string;
  company_id: string;
  nome: string;
  descricao?: string;
  latitude: number;
  longitude: number;
  raio_metros: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocationZoneCreate {
  company_id: string;
  nome: string;
  descricao?: string;
  latitude: number;
  longitude: number;
  raio_metros: number;
  ativo?: boolean;
}

export interface LocationZoneUpdate {
  nome?: string;
  descricao?: string;
  latitude?: number;
  longitude?: number;
  raio_metros?: number;
  ativo?: boolean;
}

export const LocationZonesService = {
  /**
   * Listar todas as zonas de localização de uma empresa
   */
  async list(companyId: string, filters?: { ativo?: boolean }): Promise<LocationZone[]> {
    const result = await EntityService.list<LocationZone>({
      schema: 'rh',
      table: 'location_zones',
      companyId,
      filters: filters || {},
      orderBy: 'nome',
      orderDirection: 'ASC'
    });
    
    return result.data;
  },

  /**
   * Buscar zona por ID
   */
  async getById(id: string, companyId: string): Promise<LocationZone | null> {
    const result = await EntityService.list<LocationZone>({
      schema: 'rh',
      table: 'location_zones',
      companyId,
      filters: { id }
    });

    return result.data[0] || null;
  },

  /**
   * Criar nova zona de localização
   */
  async create(data: LocationZoneCreate): Promise<LocationZone> {
    const result = await EntityService.create<LocationZone>({
      schema: 'rh',
      table: 'location_zones',
      companyId: data.company_id,
      data
    });

    return result;
  },

  /**
   * Atualizar zona de localização
   */
  async update(
    id: string,
    companyId: string,
    data: LocationZoneUpdate
  ): Promise<LocationZone> {
    const result = await EntityService.update<LocationZone>({
      schema: 'rh',
      table: 'location_zones',
      companyId,
      id,
      data
    });

    return result;
  },

  /**
   * Deletar zona de localização
   */
  async delete(id: string, companyId: string): Promise<void> {
    await EntityService.delete({
      schema: 'rh',
      table: 'location_zones',
      companyId,
      id
    });
  },

  /**
   * Buscar zona ativa para uma empresa
   * Retorna a primeira zona ativa encontrada
   */
  async getActiveZone(companyId: string): Promise<LocationZone | null> {
    const zones = await this.list(companyId, { ativo: true });
    return zones.length > 0 ? zones[0] : null;
  }
};

