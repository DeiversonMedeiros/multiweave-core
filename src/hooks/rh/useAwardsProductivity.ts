// =====================================================
// HOOKS PARA PREMIAÇÕES E PRODUTIVIDADE
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getAwardsProductivity,
  getAwardProductivityById,
  createAwardProductivity,
  updateAwardProductivity,
  deleteAwardProductivity,
  getAwardCategories,
  getAwardCategoryById,
  createAwardCategory,
  updateAwardCategory,
  deleteAwardCategory,
  importAwardsFromCSV,
  getAwardImports,
  getAwardImportErrors,
  getAwardsByEmployee,
  getAwardsByMonth,
  getAwardStats,
  approveAward,
  markAsPaid,
  validateAwardImportRow,
  sendAwardToAccountsPayable,
  sendAwardToFlash,
  generateFlashInvoiceForAward,
  sendMultipleAwardsToAccountsPayable,
  sendMultipleAwardsToFlash
} from '@/services/rh/awardsProductivityService';
import {
  AwardProductivity,
  AwardProductivityCreateData,
  AwardProductivityUpdateData,
  AwardProductivityFilters,
  AwardCategory,
  AwardCategoryCreateData,
  AwardCategoryUpdateData,
  AwardCategoryFilters,
  AwardImport,
  AwardImportError,
  AwardImportData
} from '@/integrations/supabase/rh-types';
import { useCompany } from '@/lib/company-context';

// =====================================================
// HOOKS PARA PREMIAÇÕES E PRODUTIVIDADE
// =====================================================

const getAwardsQueryKey = (companyId: string, filters?: AwardProductivityFilters) => ['awardsProductivity', companyId, filters];

export function useAwardsProductivity(filters?: AwardProductivityFilters) {
  const { companyId } = useCompany();
  return useQuery<AwardProductivity[], Error>({
    queryKey: getAwardsQueryKey(companyId!, filters),
    queryFn: () => getAwardsProductivity(companyId!, filters).then(res => res.data),
    enabled: !!companyId,
  });
}

export function useAwardProductivity(id: string) {
  const { companyId } = useCompany();
  return useQuery<AwardProductivity, Error>({
    queryKey: ['awardProductivity', companyId, id],
    queryFn: () => getAwardProductivityById(id, companyId!),
    enabled: !!id && !!companyId,
  });
}

export function useCreateAwardProductivity() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<AwardProductivity, Error, AwardProductivityCreateData>({
    mutationFn: (newData) => createAwardProductivity({ ...newData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awardsProductivity'] });
      toast.success('Premiação criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar premiação.', {
        description: error.message,
      });
    },
  });
}

export function useUpdateAwardProductivity() {
  const queryClient = useQueryClient();
  return useMutation<AwardProductivity, Error, AwardProductivityUpdateData>({
    mutationFn: (updatedData) => updateAwardProductivity(updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awardsProductivity'] });
      toast.success('Premiação atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar premiação.', {
        description: error.message,
      });
    },
  });
}

export function useDeleteAwardProductivity() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteAwardProductivity(id, companyId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awardsProductivity'] });
      toast.success('Premiação excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir premiação.', {
        description: error.message,
      });
    },
  });
}

// =====================================================
// HOOKS PARA CATEGORIAS DE PREMIAÇÃO
// =====================================================

const getAwardCategoriesQueryKey = (companyId: string, filters?: AwardCategoryFilters) => ['awardCategories', companyId, filters];

export function useAwardCategories(filters?: AwardCategoryFilters) {
  const { companyId } = useCompany();
  return useQuery<AwardCategory[], Error>({
    queryKey: getAwardCategoriesQueryKey(companyId!, filters),
    queryFn: () => getAwardCategories(companyId!, filters).then(res => res.data),
    enabled: !!companyId,
  });
}

export function useAwardCategory(id: string) {
  const { companyId } = useCompany();
  return useQuery<AwardCategory, Error>({
    queryKey: ['awardCategory', companyId, id],
    queryFn: () => getAwardCategoryById(id, companyId!),
    enabled: !!id && !!companyId,
  });
}

export function useCreateAwardCategory() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<AwardCategory, Error, AwardCategoryCreateData>({
    mutationFn: (newData) => createAwardCategory({ ...newData, company_id: companyId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awardCategories'] });
      toast.success('Categoria criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar categoria.', {
        description: error.message,
      });
    },
  });
}

export function useUpdateAwardCategory() {
  const queryClient = useQueryClient();
  return useMutation<AwardCategory, Error, AwardCategoryUpdateData>({
    mutationFn: (updatedData) => updateAwardCategory(updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awardCategories'] });
      toast.success('Categoria atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar categoria.', {
        description: error.message,
      });
    },
  });
}

export function useDeleteAwardCategory() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteAwardCategory(id, companyId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awardCategories'] });
      toast.success('Categoria excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir categoria.', {
        description: error.message,
      });
    },
  });
}

// =====================================================
// HOOKS PARA IMPORTAÇÃO EM MASSA
// =====================================================

export function useImportAwardsFromCSV() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<
    { success: boolean; importId?: string; errors?: string[] },
    Error,
    { mesReferencia: string; csvData: AwardImportData[]; fileName: string }
  >({
    mutationFn: ({ mesReferencia, csvData, fileName }) => 
      importAwardsFromCSV(companyId!, mesReferencia, csvData, fileName),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['awardsProductivity'] });
      queryClient.invalidateQueries({ queryKey: ['awardImports'] });
      
      if (result.success) {
        toast.success('Importação realizada com sucesso!');
      } else {
        toast.warning('Importação concluída com erros.', {
          description: `${result.errors?.length || 0} linhas com erro`,
        });
      }
    },
    onError: (error) => {
      toast.error('Erro na importação.', {
        description: error.message,
      });
    },
  });
}

export function useAwardImports(mesReferencia?: string) {
  const { companyId } = useCompany();
  return useQuery<AwardImport[], Error>({
    queryKey: ['awardImports', companyId, mesReferencia],
    queryFn: () => getAwardImports(companyId!, mesReferencia).then(res => res.data),
    enabled: !!companyId,
  });
}

export function useAwardImportErrors(importId: string) {
  const { companyId } = useCompany();
  return useQuery<AwardImportError[], Error>({
    queryKey: ['awardImportErrors', companyId, importId],
    queryFn: () => getAwardImportErrors(companyId!, importId),
    enabled: !!importId && !!companyId,
  });
}

export function useValidateAwardImportRow() {
  const { companyId } = useCompany();
  return useMutation({
    mutationFn: (row: AwardImportData) => validateAwardImportRow(row, companyId!),
    onError: (error) => {
      toast.error('Erro na validação.', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    },
  });
}

// =====================================================
// HOOKS ESPECÍFICOS
// =====================================================

export function useAwardsByEmployee(employeeId: string, mesReferencia?: string) {
  const { companyId } = useCompany();
  return useQuery<AwardProductivity[], Error>({
    queryKey: ['awardsByEmployee', companyId, employeeId, mesReferencia],
    queryFn: () => getAwardsByEmployee(employeeId, companyId!, mesReferencia),
    enabled: !!employeeId && !!companyId,
  });
}

export function useAwardsByMonth(mesReferencia: string) {
  const { companyId } = useCompany();
  return useQuery<AwardProductivity[], Error>({
    queryKey: ['awardsByMonth', companyId, mesReferencia],
    queryFn: () => getAwardsByMonth(companyId!, mesReferencia),
    enabled: !!mesReferencia && !!companyId,
  });
}

export function useAwardStats() {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ['awardStats', companyId],
    queryFn: () => getAwardStats(companyId!),
    enabled: !!companyId,
  });
}

export function useApproveAward() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<AwardProductivity, Error, { id: string; approvedBy: string }>({
    mutationFn: ({ id, approvedBy }) => approveAward(id, companyId!, approvedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awardsProductivity'] });
      toast.success('Premiação aprovada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao aprovar premiação.', {
        description: error.message,
      });
    },
  });
}

export function useMarkAsPaid() {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  return useMutation<AwardProductivity, Error, string>({
    mutationFn: (id) => markAsPaid(id, companyId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['awardsProductivity'] });
      toast.success('Premiação marcada como paga!');
    },
    onError: (error) => {
      toast.error('Erro ao marcar como pago.', {
        description: error.message,
      });
    },
  });
}

// =====================================================
// HOOKS DE INTEGRAÇÃO COM CONTAS A PAGAR E FLASH
// =====================================================

export function useSendAwardToAccountsPayable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ awardId, dueDate }: { awardId: string; dueDate?: Date }) =>
      sendAwardToAccountsPayable(awardId, dueDate),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['awardsProductivity'] });
      toast.success(data.message || 'Premiação enviada para Contas a Pagar com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao enviar para Contas a Pagar.', {
        description: error.message || 'Ocorreu um erro desconhecido.',
      });
    },
  });
}

export function useSendAwardToFlash() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (awardId: string) => sendAwardToFlash(awardId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['awardsProductivity'] });
      toast.success(data.message || 'Premiação enviada para Flash com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao enviar para Flash.', {
        description: error.message || 'Ocorreu um erro desconhecido.',
      });
    },
  });
}

export function useGenerateFlashInvoiceForAward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (awardId: string) => generateFlashInvoiceForAward(awardId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['awardsProductivity'] });
      toast.success(data.message || 'Boleto gerado com sucesso!', {
        action: data.invoice_url ? {
          label: 'Abrir',
          onClick: () => window.open(data.invoice_url, '_blank')
        } : undefined
      });
    },
    onError: (error: any) => {
      toast.error('Erro ao gerar boleto Flash.', {
        description: error.message || 'Ocorreu um erro desconhecido.',
      });
    },
  });
}

export function useSendMultipleAwardsToAccountsPayable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ awardIds, dueDate }: { awardIds: string[]; dueDate?: Date }) =>
      sendMultipleAwardsToAccountsPayable(awardIds, dueDate),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['awardsProductivity'] });
      if (data.error_count > 0) {
        toast.warning(`${data.success_count} premiação(ões) enviada(s), ${data.error_count} falharam.`);
      } else {
        toast.success(`${data.success_count} premiação(ões) enviada(s) para Contas a Pagar com sucesso!`);
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao enviar premiações para Contas a Pagar.', {
        description: error.message || 'Ocorreu um erro desconhecido.',
      });
    },
  });
}

export function useSendMultipleAwardsToFlash() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (awardIds: string[]) => sendMultipleAwardsToFlash(awardIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['awardsProductivity'] });
      if (data.error_count > 0) {
        toast.warning(`${data.success_count} premiação(ões) enviada(s), ${data.error_count} falharam.`);
      } else {
        toast.success(`${data.success_count} premiação(ões) enviada(s) para Flash com sucesso!`);
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao enviar premiações para Flash.', {
        description: error.message || 'Ocorreu um erro desconhecido.',
      });
    },
  });
}

// =====================================================
// HOOKS DE UTILITÁRIOS
// =====================================================

export function useAwardTypes() {
  return [
    { value: 'premiacao', label: 'Premiação' },
    { value: 'produtividade', label: 'Produtividade' },
    { value: 'bonus', label: 'Bônus' },
    { value: 'comissao', label: 'Comissão' },
    { value: 'meta', label: 'Meta' },
    { value: 'outros', label: 'Outros' }
  ];
}

export function useCalculationTypes() {
  return [
    { value: 'valor_fixo', label: 'Valor Fixo' },
    { value: 'percentual_meta', label: 'Percentual da Meta' },
    { value: 'tabela_faixas', label: 'Tabela de Faixas' },
    { value: 'comissao_venda', label: 'Comissão por Venda' }
  ];
}

export function useAwardStatuses() {
  return [
    { value: 'pendente', label: 'Pendente' },
    { value: 'aprovado', label: 'Aprovado' },
    { value: 'pago', label: 'Pago' },
    { value: 'cancelado', label: 'Cancelado' }
  ];
}

export function useImportTypes() {
  return [
    { value: 'csv', label: 'CSV' },
    { value: 'excel', label: 'Excel' },
    { value: 'manual', label: 'Manual' }
  ];
}
