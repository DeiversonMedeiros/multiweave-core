import { useQuery } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';

// =====================================================
// INTERFACES
// =====================================================

export interface EstoqueAtual {
  id: string;
  material_equipamento_id: string;
  almoxarifado_id: string;
  quantidade_atual: number;
  quantidade_reservada: number;
  quantidade_disponivel: number;
  valor_total?: number;
  updated_at: string;
  material?: {
    id: string;
    codigo_interno: string;
    descricao: string;
    tipo: 'material' | 'equipamento';
    unidade_medida: string;
  };
  almoxarifado?: {
    id: string;
    nome: string;
    codigo: string;
  };
}

export interface EstoqueKPI {
  total_materiais: number;
  valor_total_estoque: number;
  itens_ruptura: number;
  itens_sobre_estoque: number;
  giro_estoque: number;
  alertas_validade: number;
}

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para listar estoque atual
 */
export function useEstoqueAtual(filters?: any) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['almoxarifado', 'estoque_atual', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      
      const result = await EntityService.list<EstoqueAtual>({
        schema: 'almoxarifado',
        table: 'estoque_atual',
        companyId: selectedCompany.id,
        filters: filters || {},
        orderBy: 'updated_at',
        orderDirection: 'DESC'
      });
      
      return result.data;
    },
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obter KPIs de estoque
 */
export function useEstoqueKPIs() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['almoxarifado', 'estoque_kpis', selectedCompany?.id],
    queryFn: async (): Promise<EstoqueKPI> => {
      if (!selectedCompany?.id) {
        return {
          total_materiais: 0,
          valor_total_estoque: 0,
          itens_ruptura: 0,
          itens_sobre_estoque: 0,
          giro_estoque: 0,
          alertas_validade: 0
        };
      }
      
      // Buscar estoque atual
      const estoqueResult = await EntityService.list<EstoqueAtual>({
        schema: 'almoxarifado',
        table: 'estoque_atual',
        companyId: selectedCompany.id,
        filters: {}
      });
      
      const estoque = estoqueResult.data;
      const totalMateriais = estoque.length;
      
      // Calcular valor total do estoque
      const valorTotalEstoque = estoque.reduce((total, item) => {
        return total + (item.valor_total || 0);
      }, 0);
      
      // Calcular itens em ruptura (simplificado)
      const itensRuptura = estoque.filter(item => 
        item.quantidade_atual <= 0
      ).length;
      
      // Calcular itens sobre estoque (simplificado)
      const itensSobreEstoque = estoque.filter(item => 
        item.quantidade_atual > 1000 // Valor arbitrário para demonstração
      ).length;
      
      return {
        total_materiais: totalMateriais,
        valor_total_estoque: valorTotalEstoque,
        itens_ruptura: itensRuptura,
        itens_sobre_estoque: itensSobreEstoque,
        giro_estoque: 0, // TODO: Implementar cálculo de giro
        alertas_validade: 0 // TODO: Implementar alertas de validade
      };
    },
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
