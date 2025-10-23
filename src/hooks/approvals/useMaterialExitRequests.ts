import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApprovalService, MaterialExitRequest } from '@/services/approvals/approvalService';
import { useCompany } from '@/lib/company-context';
import { toast } from 'sonner';

export function useMaterialExitRequests(filters?: {
  funcionario_solicitante_id?: string;
  almoxarifado_id?: string;
  status?: string;
}) {
  const { selectedCompany } = useCompany();

  const query = useQuery({
    queryKey: ['material-exit-requests', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return ApprovalService.getMaterialExitRequests(selectedCompany.id, filters);
    },
    enabled: !!selectedCompany?.id
  });

  const createRequest = useCreateMaterialExitRequest();
  const updateRequest = useUpdateMaterialExitRequest();
  const deleteRequest = useDeleteMaterialExitRequest();

  return {
    ...query,
    createRequest,
    updateRequest,
    deleteRequest
  };
}

export function useMaterialExitRequest(id: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['material-exit-request', id, selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return ApprovalService.getMaterialExitRequest(id, selectedCompany.id);
    },
    enabled: !!selectedCompany?.id && !!id
  });
}

export function useCreateMaterialExitRequest() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: Omit<MaterialExitRequest, 'id' | 'created_at' | 'updated_at'>) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return ApprovalService.createMaterialExitRequest(data, selectedCompany.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-exit-requests'] });
      toast.success('Solicitação de saída de material criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar solicitação de saída de material');
      console.error(error);
    }
  });
}

export function useUpdateMaterialExitRequest() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MaterialExitRequest> }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return ApprovalService.updateMaterialExitRequest(id, data, selectedCompany.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-exit-requests'] });
      queryClient.invalidateQueries({ queryKey: ['material-exit-request'] });
      toast.success('Solicitação de saída de material atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar solicitação de saída de material');
      console.error(error);
    }
  });
}

export function useDeleteMaterialExitRequest() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return ApprovalService.deleteMaterialExitRequest(id, selectedCompany.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-exit-requests'] });
      toast.success('Solicitação de saída de material excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir solicitação de saída de material');
      console.error(error);
    }
  });
}
