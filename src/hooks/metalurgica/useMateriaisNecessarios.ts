import { useQuery } from '@tanstack/react-query';
import { metalurgicaService } from '@/services/metalurgica/metalurgicaService';

export function useMateriaisNecessarios(produtoId: string, quantidade: number) {
  return useQuery({
    queryKey: ['metalurgica', 'materiais_necessarios', produtoId, quantidade],
    queryFn: () => metalurgicaService.calcularMateriaisNecessarios(produtoId, quantidade),
    enabled: !!produtoId && quantidade > 0,
    staleTime: 10 * 60 * 1000, // 10 minutos (BOM não muda frequentemente)
  });
}

