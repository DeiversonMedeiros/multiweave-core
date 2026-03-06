import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlmoxarifadoService,
  GrupoMaterial,
} from '@/services/almoxarifado/almoxarifadoService';
import { useCompany } from '@/lib/company-context';

const QUERY_KEY_GRUPOS = ['almoxarifado', 'grupos_materiais'];

export function useGruposMateriais() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: [...QUERY_KEY_GRUPOS, selectedCompany?.id],
    queryFn: () =>
      AlmoxarifadoService.listGruposMateriais(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export type GrupoMaterialComClasses = GrupoMaterial & {
  classe_financeira_ids: string[];
};

export function useGruposMateriaisComClasses() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: [...QUERY_KEY_GRUPOS, 'com-classes', selectedCompany?.id],
    queryFn: () =>
      AlmoxarifadoService.listGruposWithClasses(selectedCompany?.id || ''),
    enabled: !!selectedCompany?.id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useGrupoClassesFinanceiras(grupoMaterialId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY_GRUPOS, 'classes', grupoMaterialId],
    queryFn: () =>
      AlmoxarifadoService.listClassesFinanceirasByGrupo(grupoMaterialId!),
    enabled: !!grupoMaterialId,
  });
}

export function useCreateGrupoMaterial() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (
      data: Omit<GrupoMaterial, 'id' | 'created_at' | 'updated_at'>
    ) => {
      return await AlmoxarifadoService.createGrupoMaterial({
        ...data,
        company_id: selectedCompany?.id || '',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_GRUPOS });
    },
  });
}

export function useUpdateGrupoMaterial() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<GrupoMaterial>;
    }) => {
      return await AlmoxarifadoService.updateGrupoMaterial(
        id,
        data,
        selectedCompany?.id || ''
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_GRUPOS });
    },
  });
}

export function useDeleteGrupoMaterial() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return await AlmoxarifadoService.deleteGrupoMaterial(
        id,
        selectedCompany.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_GRUPOS });
    },
  });
}

export function useSetClassesFinanceirasGrupo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      grupoMaterialId,
      classeFinanceiraIds,
    }: {
      grupoMaterialId: string;
      classeFinanceiraIds: string[];
    }) => {
      return await AlmoxarifadoService.setClassesFinanceirasForGrupo(
        grupoMaterialId,
        classeFinanceiraIds
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY_GRUPOS });
    },
  });
}
