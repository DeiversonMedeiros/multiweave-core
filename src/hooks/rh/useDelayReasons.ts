import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';

export interface DelayReason {
  id: string;
  company_id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  tipo: 'atraso' | 'falta' | 'saida_antecipada' | 'justificado' | 'injustificado';
  desconta_salario: boolean;
  desconta_horas: boolean;
  requer_justificativa: boolean;
  requer_anexo: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function useDelayReasons(companyId?: string) {
  return useQuery({
    queryKey: ['delay-reasons', companyId],
    queryFn: async (): Promise<DelayReason[]> => {
      if (!companyId) {
        return [];
      }

      try {
        const result = await EntityService.list({
          schema: 'rh',
          table: 'delay_reasons',
          companyId: companyId,
          filters: { ativo: true },
          orderBy: 'nome',
          orderDirection: 'ASC'
        });

        return result.data || [];
      } catch (error) {
        console.error('Erro ao buscar motivos de atraso:', error);
        throw new Error(`Erro ao buscar motivos de atraso: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false
  });
}

// Hook para buscar motivos por tipo
export function useDelayReasonsByType(companyId?: string, tipo?: string) {
  const { data: allReasons, ...rest } = useDelayReasons(companyId);

  const filteredReasons = allReasons?.filter(reason => 
    !tipo || reason.tipo === tipo
  ) || [];

  return {
    data: filteredReasons,
    ...rest
  };
}

// Hook para criar motivo de atraso
export function useCreateDelayReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<DelayReason, 'id' | 'created_at' | 'updated_at'>) => {
      const result = await EntityService.create({
        schema: 'rh',
        table: 'delay_reasons',
        companyId: data.company_id,
        data: {
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delay-reasons'] });
    },
  });
}

// Hook para atualizar motivo de atraso
export function useUpdateDelayReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DelayReason> }) => {
      const result = await EntityService.update({
        schema: 'rh',
        table: 'delay_reasons',
        companyId: data.company_id || '',
        id: id,
        data: {
          ...data,
          updated_at: new Date().toISOString()
        }
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delay-reasons'] });
    },
  });
}

// Hook para deletar motivo de atraso
export function useDeleteDelayReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, companyId }: { id: string; companyId: string }) => {
      await EntityService.delete({
        schema: 'rh',
        table: 'delay_reasons',
        companyId: companyId,
        id: id
      });

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delay-reasons'] });
    },
  });
}