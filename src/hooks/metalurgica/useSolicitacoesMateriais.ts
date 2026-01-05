import { useQuery } from '@tanstack/react-query';
import { metalurgicaService } from '@/services/metalurgica/metalurgicaService';
import { useCompany } from '@/lib/company-context';

export function useSolicitacoesMateriais(opId?: string, osId?: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['metalurgica', 'solicitacoes_materiais', selectedCompany?.id, opId, osId],
    queryFn: () => metalurgicaService.listSolicitacoesMateriais(selectedCompany?.id || '', opId, osId),
    enabled: !!selectedCompany?.id && (!!opId || !!osId),
    staleTime: 1 * 60 * 1000,
  });
}

