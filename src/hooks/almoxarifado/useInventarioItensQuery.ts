import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company-context';
import type { InventarioItem } from './useInventarioQuery';

/**
 * Lista itens de um inventário (contagens).
 * Usa RPC get_entity_data com skipCompanyFilter (tabela não tem company_id; RLS via inventario).
 */
export function useInventarioItens(inventarioId: string | undefined, companyId: string | undefined) {
  const { selectedCompany } = useCompany();
  const cid = companyId || selectedCompany?.id;

  return useQuery({
    queryKey: ['almoxarifado', 'inventario_itens', inventarioId, cid],
    queryFn: async (): Promise<InventarioItem[]> => {
      if (!inventarioId || !cid) return [];
      const result = await EntityService.list<InventarioItem>({
        schema: 'almoxarifado',
        table: 'inventario_itens',
        companyId: cid,
        filters: { inventario_id: inventarioId },
        orderBy: 'created_at',
        orderDirection: 'ASC',
        skipCompanyFilter: true,
      });
      return result.data;
    },
    enabled: !!inventarioId && !!cid,
    staleTime: 60 * 1000,
  });
}

/**
 * Cria ou atualiza a contagem de um item no inventário.
 * Usa Supabase direto pois inventario_itens não tem company_id.
 */
export function useUpsertInventarioItem(inventarioId: string, _companyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      material_equipamento_id: string;
      quantidade_sistema: number;
      quantidade_contada: number | null;
      id?: string;
    }): Promise<InventarioItem> => {
      if (payload.id) {
        const { data, error } = await supabase
          .schema('almoxarifado')
          .from('inventario_itens')
          .update({
            quantidade_contada: payload.quantidade_contada,
            data_contagem: new Date().toISOString(),
          })
          .eq('id', payload.id)
          .select()
          .single();
        if (error) throw error;
        return data as InventarioItem;
      }
      const { data, error } = await supabase
        .schema('almoxarifado')
        .from('inventario_itens')
        .insert({
          inventario_id: inventarioId,
          material_equipamento_id: payload.material_equipamento_id,
          quantidade_sistema: payload.quantidade_sistema,
          quantidade_contada: payload.quantidade_contada,
        })
        .select()
        .single();
      if (error) throw error;
      return data as InventarioItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'inventario_itens'] });
    },
  });
}
