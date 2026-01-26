import { EntityService } from '@/services/generic/entityService';
import { supabase } from '@/integrations/supabase/client';

// =====================================================
// SERVIÇO DE ALMOXARIFADO
// =====================================================

export interface Almoxarifado {
  id: string;
  company_id: string;
  nome: string;
  codigo: string;
  endereco?: string;
  responsavel_id?: string;
  cost_center_id?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaterialEquipamento {
  id: string;
  company_id: string;
  material_id?: string;
  codigo_interno: string;
  nome?: string;
  descricao: string;
  tipo: 'produto' | 'servico' | 'equipamento';
  classe?: string;
  unidade_medida: string;
  imagem_url?: string;
  status: 'ativo' | 'inativo';
  equipamento_proprio: boolean;
  localizacao_id?: string;
  estoque_minimo: number;
  estoque_maximo?: number;
  valor_unitario?: number;
  validade_dias?: number;
  ncm?: string;
  cfop?: string;
  cst?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export const AlmoxarifadoService = {
  /**
   * Lista todos os almoxarifados de uma empresa
   */
  listAlmoxarifados: async (companyId: string) => {
    const result = await EntityService.list<Almoxarifado>({
      schema: 'almoxarifado',
      table: 'almoxarifados',
      companyId,
      orderBy: 'nome',
      orderDirection: 'ASC'
    });
    return result.data;
  },

  /**
   * Lista materiais e equipamentos de uma empresa
   */
  listMateriaisEquipamentos: async (companyId: string, filters?: any) => {
    const result = await EntityService.list<MaterialEquipamento>({
      schema: 'almoxarifado',
      table: 'materiais_equipamentos',
      companyId,
      filters: filters || {},
      orderBy: 'descricao',
      orderDirection: 'ASC'
    });
    return result.data;
  },

  /**
   * Busca um almoxarifado por ID
   */
  getAlmoxarifadoById: async (id: string, companyId: string): Promise<Almoxarifado | null> => {
    return await EntityService.getById<Almoxarifado>('almoxarifado', 'almoxarifados', id, companyId);
  },

  /**
   * Cria um novo almoxarifado
   */
  createAlmoxarifado: async (data: Omit<Almoxarifado, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
    return await EntityService.create<Almoxarifado>({
      schema: 'almoxarifado',
      table: 'almoxarifados',
      companyId: data.company_id,
      data: data
    });
  },

  /**
   * Atualiza um almoxarifado
   */
  updateAlmoxarifado: async (id: string, data: Partial<Almoxarifado>, companyId: string) => {
    return await EntityService.update<Almoxarifado>({
      schema: 'almoxarifado',
      table: 'almoxarifados',
      companyId: companyId,
      id: id,
      data: data
    });
  },

  /**
   * Deleta um almoxarifado
   */
  deleteAlmoxarifado: async (id: string, companyId: string) => {
    return await EntityService.delete({
      schema: 'almoxarifado',
      table: 'almoxarifados',
      companyId: companyId,
      id: id
    });
  },

  /**
   * Cria um novo material/equipamento
   */
  createMaterialEquipamento: async (data: Omit<MaterialEquipamento, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
    return await EntityService.create<MaterialEquipamento>({
      schema: 'almoxarifado',
      table: 'materiais_equipamentos',
      companyId: data.company_id,
      data: data
    });
  },

  /**
   * Atualiza um material/equipamento
   */
  updateMaterialEquipamento: async (id: string, data: Partial<MaterialEquipamento>) => {
    return await EntityService.update<MaterialEquipamento>({
      schema: 'almoxarifado',
      table: 'materiais_equipamentos',
      companyId: data.company_id || '',
      id: id,
      data: data
    });
  },

  /**
   * Deleta um material/equipamento
   */
  deleteMaterialEquipamento: async (id: string, companyId: string) => {
    return await EntityService.delete({
      schema: 'almoxarifado',
      table: 'materiais_equipamentos',
      companyId: companyId,
      id: id
    });
  }
};
