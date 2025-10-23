import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApprovalService, ApprovalConfig } from '@/services/approvals/approvalService';
import { useCompany } from '@/lib/company-context';
import { toast } from 'sonner';

export function useApprovalConfigs(filters?: {
  processo_tipo?: string;
  ativo?: boolean;
}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['approval-configs', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return ApprovalService.getApprovalConfigs(selectedCompany.id, filters);
    },
    enabled: !!selectedCompany?.id
  });
}

export function useApprovalConfig(id: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['approval-config', id, selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return ApprovalService.getApprovalConfig(id, selectedCompany.id);
    },
    enabled: !!selectedCompany?.id && !!id
  });
}

export function useCreateApprovalConfig() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: Omit<ApprovalConfig, 'id' | 'created_at' | 'updated_at'>) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return ApprovalService.createApprovalConfig(data, selectedCompany.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-configs'] });
      toast.success('Configuração de aprovação criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar configuração de aprovação');
      console.error(error);
    }
  });
}

export function useUpdateApprovalConfig() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ApprovalConfig> }) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return ApprovalService.updateApprovalConfig(id, data, selectedCompany.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-configs'] });
      toast.success('Configuração de aprovação atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar configuração de aprovação');
      console.error(error);
    }
  });
}

export function useDeleteApprovalConfig() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      return ApprovalService.deleteApprovalConfig(id, selectedCompany.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-configs'] });
      toast.success('Configuração de aprovação excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir configuração de aprovação');
      console.error(error);
    }
  });
}
