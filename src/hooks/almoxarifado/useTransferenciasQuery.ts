import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';

// =====================================================
// INTERFACES
// =====================================================

export interface Transferencia {
  id: string;
  company_id: string;
  almoxarifado_origem_id: string;
  almoxarifado_destino_id: string;
  solicitante_id: string;
  aprovador_id?: string;
  data_solicitacao: string;
  data_aprovacao?: string;
  data_transferencia?: string;
  status: 'pendente' | 'aprovada' | 'rejeitada' | 'transferida' | 'cancelada';
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface TransferenciaItem {
  id: string;
  transferencia_id: string;
  material_equipamento_id: string;
  quantidade: number;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar transferências
 */
export function useTransferencias(filters?: any) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['almoxarifado', 'transferencias', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      
      const result = await EntityService.list<Transferencia>({
        schema: 'almoxarifado',
        table: 'transferencias',
        companyId: selectedCompany.id,
        filters: filters || {},
        orderBy: 'data_solicitacao',
        orderDirection: 'DESC'
      });
      
      return result.data;
    },
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// =====================================================
// HOOKS DE MUTAÇÃO
// =====================================================

/**
 * Hook para criar transferência
 */
export function useCreateTransferencia() {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();

  return useMutation({
    mutationFn: async (data: Omit<Transferencia, 'id' | 'created_at' | 'updated_at' | 'company_id'>) => {
      if (!selectedCompany?.id) throw new Error('Empresa não selecionada');
      
      return await EntityService.create<Transferencia>('almoxarifado', 'transferencias', {
        ...data,
        company_id: selectedCompany.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'transferencias'] });
    },
  });
}

/**
 * Hook para atualizar transferência
 */
export function useUpdateTransferencia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Transferencia> }) => {
      return await EntityService.update<Transferencia>('almoxarifado', 'transferencias', id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'transferencias'] });
    },
  });
}

/**
 * Hook para deletar transferência
 */
export function useDeleteTransferencia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await EntityService.delete('almoxarifado', 'transferencias', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['almoxarifado', 'transferencias'] });
    },
  });
}
