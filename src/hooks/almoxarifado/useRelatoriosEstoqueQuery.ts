import { useQuery } from '@tanstack/react-query';
import { EntityService } from '@/services/generic/entityService';
import { useCompany } from '@/lib/company-context';

// =====================================================
// INTERFACES
// =====================================================

export interface RelatorioEstoque {
  id: string;
  company_id: string;
  tipo: 'movimentacoes' | 'abc' | 'validade' | 'kpis';
  data_inicio: string;
  data_fim: string;
  filtros: any;
  dados: any;
  created_at: string;
}

export interface KPIsEstoque {
  valor_total_estoque: number;
  total_materiais: number;
  itens_ruptura: number;
  giro_estoque: number;
  alertas_validade: number;
}

// =====================================================
// HOOKS DE CONSULTA
// =====================================================

/**
 * Hook para gerar relatório de movimentações
 */
export function useRelatorioMovimentacoes(filters: {
  data_inicio: string;
  data_fim: string;
  tipo_movimentacao?: string;
  almoxarifado_id?: string;
}) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['almoxarifado', 'relatorio_movimentacoes', selectedCompany?.id, filters],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      
      const result = await EntityService.list<MovimentacaoEstoque>({
        schema: 'almoxarifado',
        table: 'movimentacoes_estoque',
        companyId: selectedCompany.id,
        filters: {
          ...filters,
          status: 'confirmado'
        },
        orderBy: 'data_movimentacao',
        orderDirection: 'DESC'
      });
      
      return result.data;
    },
    enabled: !!selectedCompany?.id && !!filters.data_inicio && !!filters.data_fim,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para gerar relatório ABC
 */
export function useRelatorioABC(almoxarifado_id?: string) {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['almoxarifado', 'relatorio_abc', selectedCompany?.id, almoxarifado_id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      
      const result = await EntityService.list<MaterialEquipamento>({
        schema: 'almoxarifado',
        table: 'materiais_equipamentos',
        companyId: selectedCompany.id,
        filters: {
          status: 'ativo',
          ...(almoxarifado_id && { almoxarifado_id })
        },
        orderBy: 'valor_unitario',
        orderDirection: 'DESC'
      });
      
      return result.data;
    },
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para gerar KPIs de estoque
 */
export function useKPIsEstoque() {
  const { selectedCompany } = useCompany();

  return useQuery({
    queryKey: ['almoxarifado', 'kpis_estoque', selectedCompany?.id],
    queryFn: async (): Promise<KPIsEstoque> => {
      if (!selectedCompany?.id) {
        return {
          valor_total_estoque: 0,
          total_materiais: 0,
          itens_ruptura: 0,
          giro_estoque: 0,
          alertas_validade: 0
        };
      }
      
      // Buscar materiais ativos
      const materiaisResult = await EntityService.list<MaterialEquipamento>({
        schema: 'almoxarifado',
        table: 'materiais_equipamentos',
        companyId: selectedCompany.id,
        filters: { status: 'ativo' }
      });
      
      const materiais = materiaisResult.data;
      const totalMateriais = materiais.length;
      
      // Calcular valor total do estoque
      const valorTotalEstoque = materiais.reduce((total, material) => {
        return total + (material.valor_unitario || 0);
      }, 0);
      
      // Calcular itens em ruptura
      const itensRuptura = materiais.filter(material => 
        (material.estoque_minimo || 0) > 0
      ).length;
      
      // Calcular alertas de validade (simplificado)
      const alertasValidade = materiais.filter(material => 
        material.validade_dias && material.validade_dias > 0
      ).length;
      
      return {
        valor_total_estoque: valorTotalEstoque,
        total_materiais: totalMateriais,
        itens_ruptura: itensRuptura,
        giro_estoque: 0, // TODO: Implementar cálculo de giro
        alertas_validade: alertasValidade
      };
    },
    enabled: !!selectedCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Interfaces auxiliares
interface MaterialEquipamento {
  id: string;
  valor_unitario?: number;
  estoque_minimo?: number;
  validade_dias?: number;
  status: string;
}

interface MovimentacaoEstoque {
  id: string;
  data_movimentacao: string;
  tipo_movimentacao: string;
  status: string;
}

// =====================================================
// HOOK PRINCIPAL
// =====================================================

/**
 * Hook principal que combina todos os hooks de relatórios
 */
export function useRelatoriosEstoque() {
  const { selectedCompany } = useCompany();
  
  // Função para gerar relatório de movimentações
  const gerarRelatorioMovimentacoes = async (filters: {
    data_inicio: string;
    data_fim: string;
    tipo_movimentacao?: string;
    almoxarifado_id?: string;
  }) => {
    if (!selectedCompany?.id) return [];
    
    const result = await EntityService.list<MovimentacaoEstoque>({
      schema: 'almoxarifado',
      table: 'movimentacoes_estoque',
      companyId: selectedCompany.id,
      filters: {
        ...filters,
        data_movimentacao: {
          gte: filters.data_inicio,
          lte: filters.data_fim
        }
      },
      orderBy: 'data_movimentacao',
      orderDirection: 'DESC'
    });
    
    return result.data;
  };

  // Função para gerar relatório ABC
  const gerarRelatorioABC = async (filters: {
    data_inicio: string;
    data_fim: string;
    almoxarifado_id?: string;
  }) => {
    if (!selectedCompany?.id) return [];
    
      const result = await EntityService.list<MaterialEquipamento>({
        schema: 'almoxarifado',
        table: 'materiais_equipamentos',
        companyId: selectedCompany.id,
        filters: {
          almoxarifado_id: filters.almoxarifado_id !== 'todos' ? filters.almoxarifado_id : undefined,
          status: 'ativo'
        },
        orderBy: 'valor_unitario',
        orderDirection: 'DESC'
      });
    
    return result.data;
  };

  // Função para gerar relatório de validade
  const gerarRelatorioValidade = async (filters: {
    dias_antecedencia: number;
    almoxarifado_id?: string;
  }) => {
    if (!selectedCompany?.id) return [];
    
      const result = await EntityService.list<MaterialEquipamento>({
        schema: 'almoxarifado',
        table: 'materiais_equipamentos',
        companyId: selectedCompany.id,
        filters: {
          almoxarifado_id: filters.almoxarifado_id !== 'todos' ? filters.almoxarifado_id : undefined,
          status: 'ativo',
          validade_dias: {
            lte: filters.dias_antecedencia
          }
        },
        orderBy: 'validade_dias',
        orderDirection: 'ASC'
      });
    
    return result.data;
  };

  // Função para gerar KPIs de estoque
  const gerarKPIsEstoque = async () => {
    if (!selectedCompany?.id) return null;
    
    const [materiaisResult, movimentacoesResult] = await Promise.all([
      EntityService.list<MaterialEquipamento>({
        schema: 'almoxarifado',
        table: 'materiais_equipamentos',
        companyId: selectedCompany.id,
        filters: { status: 'ativo' }
      }),
      EntityService.list<MovimentacaoEstoque>({
        schema: 'almoxarifado',
        table: 'movimentacoes_estoque',
        companyId: selectedCompany.id,
        filters: { status: 'confirmado' }
      })
    ]);
    
    const materiais = materiaisResult.data || [];
    const movimentacoes = movimentacoesResult.data || [];
    
    const kpis: KPIsEstoque = {
      valor_total_estoque: materiais.reduce((sum, m) => sum + (m.valor_unitario || 0), 0),
      total_materiais: materiais.length,
      itens_ruptura: materiais.filter(m => (m.estoque_minimo || 0) > 0).length,
      giro_estoque: movimentacoes.length,
      alertas_validade: materiais.filter(m => (m.validade_dias || 0) <= 30).length
    };
    
    return kpis;
  };

  // Função para exportar relatório
  const exportarRelatorio = async (dados: any, tipo: string, nomeArquivo: string) => {
    try {
      const dataStr = JSON.stringify(dados, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${nomeArquivo}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      throw error;
    }
  };

  return {
    gerarRelatorioMovimentacoes,
    gerarRelatorioABC,
    gerarRelatorioValidade,
    gerarKPIsEstoque,
    exportarRelatorio
  };
}