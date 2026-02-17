import { useQuery } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';
import { ContaPagarRateio } from '@/integrations/supabase/financial-types';

export function useContasPagarRateio(contaPagarId: string | undefined) {
  const { selectedCompany } = useCompany();

  const { data, isLoading } = useQuery({
    queryKey: ['contas-pagar-rateio', contaPagarId, selectedCompany?.id],
    queryFn: async (): Promise<ContaPagarRateio[]> => {
      if (!selectedCompany?.id || !contaPagarId) return [];
      const result = await EntityService.list<ContaPagarRateio>({
        schema: 'financeiro',
        table: 'contas_pagar_rateio',
        companyId: selectedCompany.id,
        filters: { conta_pagar_id: contaPagarId },
        pageSize: 100,
      });
      return result?.data ?? [];
    },
    enabled: !!selectedCompany?.id && !!contaPagarId,
  });

  return {
    rateio: data ?? [],
    isLoading,
  };
}
