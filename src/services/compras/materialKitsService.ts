import { EntityService } from '@/services/generic/entityService';

export interface MaterialKit {
  id: string;
  company_id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface MaterialKitItem {
  id: string;
  kit_id: string;
  material_id: string;
  quantidade_padrao: number;
  created_at: string;
  // Dados do material (enriquecidos na listagem)
  material_nome?: string;
  material_codigo?: string;
  material_unidade_medida?: string;
}

export interface MaterialKitWithItems extends MaterialKit {
  itens?: MaterialKitItem[];
}

export interface CreateMaterialKitInput {
  nome: string;
  descricao?: string;
  ativo?: boolean;
  itens: { material_id: string; quantidade_padrao: number }[];
}

export interface UpdateMaterialKitInput {
  nome?: string;
  descricao?: string;
  ativo?: boolean;
  itens?: { material_id: string; quantidade_padrao: number }[];
}

export const materialKitsService = {
  async list(companyId: string, filters?: { ativo?: boolean }) {
    const result = await EntityService.list<MaterialKit>({
      schema: 'compras',
      table: 'kits_materiais',
      companyId,
      filters: filters ?? {},
      page: 1,
      pageSize: 500,
      orderBy: 'nome',
      orderDirection: 'ASC',
    });
    return result;
  },

  async getById(companyId: string, id: string): Promise<MaterialKit | null> {
    return EntityService.getById<MaterialKit>({
      schema: 'compras',
      table: 'kits_materiais',
      id,
      companyId: companyId,
    });
  },

  async getKitWithItems(companyId: string, kitId: string): Promise<MaterialKitWithItems | null> {
    const kit = await this.getById(companyId, kitId);
    if (!kit) return null;

    const itensResult = await EntityService.list<MaterialKitItem>({
      schema: 'compras',
      table: 'kit_materiais_itens',
      companyId,
      filters: { kit_id: kitId },
      page: 1,
      pageSize: 500,
      skipCompanyFilter: true,
    });

    return {
      ...kit,
      itens: itensResult.data ?? [],
    };
  },

  async create(companyId: string, input: CreateMaterialKitInput): Promise<MaterialKit> {
    const kit = await EntityService.create<MaterialKit>({
      schema: 'compras',
      table: 'kits_materiais',
      companyId,
      data: {
        nome: input.nome,
        descricao: input.descricao ?? null,
        ativo: input.ativo ?? true,
      },
    });

    if (input.itens?.length) {
      for (const item of input.itens) {
        await EntityService.create({
          schema: 'compras',
          table: 'kit_materiais_itens',
          companyId,
          data: {
            kit_id: kit.id,
            material_id: item.material_id,
            quantidade_padrao: item.quantidade_padrao,
          },
          skipCompanyFilter: true,
        });
      }
    }

    return kit;
  },

  async update(companyId: string, kitId: string, input: UpdateMaterialKitInput): Promise<void> {
    const updateData: Record<string, unknown> = {};
    if (input.nome !== undefined) updateData.nome = input.nome;
    if (input.descricao !== undefined) updateData.descricao = input.descricao;
    if (input.ativo !== undefined) updateData.ativo = input.ativo;

    if (Object.keys(updateData).length > 0) {
      await EntityService.update({
        schema: 'compras',
        table: 'kits_materiais',
        companyId,
        id: kitId,
        data: updateData,
      });
    }

    if (input.itens !== undefined) {
      const current = await EntityService.list<{ id: string }>({
        schema: 'compras',
        table: 'kit_materiais_itens',
        companyId,
        filters: { kit_id: kitId },
        page: 1,
        pageSize: 500,
        skipCompanyFilter: true,
      });

      for (const row of current.data ?? []) {
        await EntityService.delete({
          schema: 'compras',
          table: 'kit_materiais_itens',
          companyId,
          id: row.id,
          skipCompanyFilter: true,
        });
      }

      for (const item of input.itens) {
        await EntityService.create({
          schema: 'compras',
          table: 'kit_materiais_itens',
          companyId,
          data: {
            kit_id: kitId,
            material_id: item.material_id,
            quantidade_padrao: item.quantidade_padrao,
          },
          skipCompanyFilter: true,
        });
      }
    }
  },

  async delete(companyId: string, kitId: string): Promise<void> {
    await EntityService.delete({
      schema: 'compras',
      table: 'kits_materiais',
      companyId,
      id: kitId,
    });
  },

  /** Retorna itens do kit com quantidade = quantidade_padrao * multiplicador (ex.: qtd de kits) */
  async getKitItemsForRequisition(
    companyId: string,
    kitId: string,
    quantidadeKits: number
  ): Promise<{ material_id: string; quantidade_padrao: number; quantidade: number }[]> {
    const result = await EntityService.list<MaterialKitItem>({
      schema: 'compras',
      table: 'kit_materiais_itens',
      companyId,
      filters: { kit_id: kitId },
      page: 1,
      pageSize: 500,
      skipCompanyFilter: true,
    });

    const itens = result.data ?? [];
    return itens.map((item) => ({
      material_id: item.material_id,
      quantidade_padrao: Number(item.quantidade_padrao),
      quantidade: Number(item.quantidade_padrao) * quantidadeKits,
    }));
  },
};
