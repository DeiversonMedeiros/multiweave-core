import { useQuery } from '@tanstack/react-query';
import { metalurgicaService } from '@/services/metalurgica/metalurgicaService';
import { useCompany } from '@/lib/company-context';
import type { OEE } from '@/types/metalurgica';

export function useOEE(maquinaId: string, dataInicio: string, dataFim: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['metalurgica', 'oee', selectedCompany?.id, maquinaId, dataInicio, dataFim],
    queryFn: () => metalurgicaService.calcularOEE(selectedCompany?.id || '', maquinaId, dataInicio, dataFim),
    enabled: !!selectedCompany?.id && !!maquinaId && !!dataInicio && !!dataFim,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMTBF(maquinaId: string, dataInicio: string, dataFim: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['metalurgica', 'mtbf', selectedCompany?.id, maquinaId, dataInicio, dataFim],
    queryFn: () => metalurgicaService.calcularMTBF(selectedCompany?.id || '', maquinaId, dataInicio, dataFim),
    enabled: !!selectedCompany?.id && !!maquinaId && !!dataInicio && !!dataFim,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMTTR(maquinaId: string, dataInicio: string, dataFim: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['metalurgica', 'mttr', selectedCompany?.id, maquinaId, dataInicio, dataFim],
    queryFn: () => metalurgicaService.calcularMTTR(selectedCompany?.id || '', maquinaId, dataInicio, dataFim),
    enabled: !!selectedCompany?.id && !!maquinaId && !!dataInicio && !!dataFim,
    staleTime: 5 * 60 * 1000,
  });
}

