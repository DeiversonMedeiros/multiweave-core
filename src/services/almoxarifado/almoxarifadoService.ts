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
  grupo_material_id?: string;
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
  classe_financeira_id?: string;
  created_at: string;
  updated_at: string;
}

export interface GrupoMaterial {
  id: string;
  company_id: string;
  nome: string;
  ativo: boolean;
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
   * Colunas permitidas para update em materiais_equipamentos (evita 400 por campo inexistente)
   */
  MATERIAIS_EQUIPAMENTOS_UPDATE_KEYS: [
    'codigo_interno', 'nome', 'descricao', 'tipo', 'classe', 'grupo_material_id', 'unidade_medida',
    'imagem_url', 'status', 'equipamento_proprio', 'localizacao_id', 'estoque_minimo', 'estoque_maximo',
    'valor_unitario', 'validade_dias', 'ncm', 'cfop', 'cst', 'observacoes', 'classe_financeira_id'
  ] as const,

  /**
   * Atualiza um material/equipamento (payload sanitizado para colunas válidas)
   */
  updateMaterialEquipamento: async (id: string, data: Partial<MaterialEquipamento>, companyId: string) => {
    const allowed = new Set(AlmoxarifadoService.MATERIAIS_EQUIPAMENTOS_UPDATE_KEYS);
    const sanitized: Record<string, unknown> = {};
    for (const key of Object.keys(data)) {
      if (!allowed.has(key as any)) continue;
      const v = (data as any)[key];
      if (v === undefined) continue;
      // Garantir que UUIDs vazios sejam null
      if ((key === 'grupo_material_id' || key === 'classe_financeira_id' || key === 'localizacao_id') && (v === '' || (typeof v === 'string' && v.trim() === ''))) {
        sanitized[key] = null;
      } else if (key === 'unidade_medida' && (v === null || v === '' || (typeof v === 'string' && v.trim() === ''))) {
        // unidade_medida é NOT NULL no banco; evitar enviar null
        sanitized[key] = 'UN';
      } else {
        sanitized[key] = v;
      }
    }
    return await EntityService.update<MaterialEquipamento>({
      schema: 'almoxarifado',
      table: 'materiais_equipamentos',
      companyId,
      id,
      data: sanitized as Partial<MaterialEquipamento>
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
  },

  // ========== Grupos de Materiais ==========
  listGruposMateriais: async (companyId: string) => {
    const result = await EntityService.list<GrupoMaterial>({
      schema: 'almoxarifado',
      table: 'grupos_materiais',
      companyId,
      orderBy: 'nome',
      orderDirection: 'ASC'
    });
    return result.data;
  },

  /** Lista grupos com IDs das classes financeiras vinculadas (para pré-definir no formulário de material) */
  listGruposWithClasses: async (
    companyId: string
  ): Promise<Array<GrupoMaterial & { classe_financeira_ids: string[] }>> => {
    const grupos = await AlmoxarifadoService.listGruposMateriais(companyId);
    if (grupos.length === 0) return [];
    const ids = grupos.map((g) => g.id);
    const { data: links, error } = await supabase
      .from('grupo_material_classe_financeira')
      .select('grupo_material_id, classe_financeira_id')
      .in('grupo_material_id', ids);
    if (error) throw error;
    const map = new Map<string, string[]>();
    for (const g of grupos) map.set(g.id, []);
    for (const row of links || []) {
      const arr = map.get(row.grupo_material_id) || [];
      arr.push(row.classe_financeira_id);
      map.set(row.grupo_material_id, arr);
    }
    return grupos.map((g) => ({
      ...g,
      classe_financeira_ids: map.get(g.id) || []
    }));
  },

  createGrupoMaterial: async (data: Omit<GrupoMaterial, 'id' | 'created_at' | 'updated_at'>) => {
    return await EntityService.create<GrupoMaterial>({
      schema: 'almoxarifado',
      table: 'grupos_materiais',
      companyId: data.company_id,
      data
    });
  },

  updateGrupoMaterial: async (id: string, data: Partial<GrupoMaterial>, companyId: string) => {
    return await EntityService.update<GrupoMaterial>({
      schema: 'almoxarifado',
      table: 'grupos_materiais',
      companyId,
      id,
      data
    });
  },

  deleteGrupoMaterial: async (id: string, companyId: string) => {
    return await EntityService.delete({
      schema: 'almoxarifado',
      table: 'grupos_materiais',
      companyId,
      id
    });
  },

  listClassesFinanceirasByGrupo: async (grupoMaterialId: string) => {
    const { data, error } = await supabase
      .from('grupo_material_classe_financeira')
      .select('classe_financeira_id')
      .eq('grupo_material_id', grupoMaterialId);
    if (error) throw error;
    return (data || []).map((r: { classe_financeira_id: string }) => r.classe_financeira_id);
  },

  setClassesFinanceirasForGrupo: async (grupoMaterialId: string, classeFinanceiraIds: string[]) => {
    await supabase
      .from('grupo_material_classe_financeira')
      .delete()
      .eq('grupo_material_id', grupoMaterialId);
    if (classeFinanceiraIds.length === 0) return;
    const { error } = await supabase
      .from('grupo_material_classe_financeira')
      .insert(classeFinanceiraIds.map((classe_financeira_id) => ({ grupo_material_id: grupoMaterialId, classe_financeira_id })));
    if (error) throw error;
  }
};
