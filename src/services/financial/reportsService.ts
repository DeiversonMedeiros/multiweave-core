// =====================================================
// SERVIÇO: RELATÓRIOS AVANÇADOS
// =====================================================
// Data: 2025-01-15
// Descrição: Serviço para geração de relatórios e dashboards personalizados
// Autor: Sistema MultiWeave Core

import { 
  ContaPagar, 
  ContaReceber, 
  MovimentoBancario, 
  LancamentoContabil,
  PlanoContas,
  CentroCusto
} from '@/integrations/supabase/financial-types';

// Tipos para relatórios
interface ReportConfig {
  company_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  filtros?: Record<string, any>;
  agrupamento?: string[];
  ordenacao?: string;
  formato?: 'json' | 'csv' | 'pdf' | 'excel';
}

interface DashboardData {
  kpis: KPIData[];
  graficos: GraficoData[];
  tabelas: TabelaData[];
  alertas: AlertaData[];
}

interface KPIData {
  id: string;
  titulo: string;
  valor: number;
  valor_anterior: number;
  variacao: number;
  variacao_percentual: number;
  tendencia: 'alta' | 'baixa' | 'estavel';
  cor: string;
  icone: string;
  unidade: string;
}

interface GraficoData {
  id: string;
  tipo: 'linha' | 'barra' | 'pizza' | 'area' | 'coluna';
  titulo: string;
  dados: any[];
  eixos: {
    x: string;
    y: string;
  };
  cores?: string[];
  legenda?: boolean;
}

interface TabelaData {
  id: string;
  titulo: string;
  colunas: string[];
  dados: any[][];
  totalizadores?: Record<string, number>;
  paginacao?: {
    pagina_atual: number;
    total_paginas: number;
    itens_por_pagina: number;
  };
}

interface AlertaData {
  id: string;
  tipo: 'info' | 'warning' | 'error' | 'success';
  titulo: string;
  mensagem: string;
  acao?: string;
  prioridade: 'baixa' | 'media' | 'alta';
  data_criacao: string;
}

class ReportsService {
  private baseUrl = process.env.REACT_APP_REPORTS_API_URL || '/api/reports';

  // Gerar dashboard financeiro
  async gerarDashboard(config: ReportConfig): Promise<DashboardData> {
    try {
      const response = await fetch(`${this.baseUrl}/dashboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Erro ao gerar dashboard: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao gerar dashboard:', error);
      return this.getDashboardMock();
    }
  }

  // Relatório de fluxo de caixa
  async gerarFluxoCaixa(config: ReportConfig): Promise<GraficoData> {
    try {
      const response = await fetch(`${this.baseUrl}/fluxo-caixa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Erro ao gerar fluxo de caixa: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao gerar fluxo de caixa:', error);
      return this.getFluxoCaixaMock();
    }
  }

  // Relatório de DRE
  async gerarDRE(config: ReportConfig): Promise<TabelaData> {
    try {
      const response = await fetch(`${this.baseUrl}/dre`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Erro ao gerar DRE: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao gerar DRE:', error);
      return this.getDREMock();
    }
  }

  // Relatório de balanço patrimonial
  async gerarBalanco(config: ReportConfig): Promise<TabelaData> {
    try {
      const response = await fetch(`${this.baseUrl}/balanco`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Erro ao gerar balanço: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao gerar balanço:', error);
      return this.getBalancoMock();
    }
  }

  // Relatório de conciliação bancária
  async gerarConciliacao(config: ReportConfig): Promise<TabelaData> {
    try {
      const response = await fetch(`${this.baseUrl}/conciliacao`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Erro ao gerar conciliação: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao gerar conciliação:', error);
      return this.getConciliacaoMock();
    }
  }

  // Relatório de contas a pagar
  async gerarContasPagar(config: ReportConfig): Promise<TabelaData> {
    try {
      const response = await fetch(`${this.baseUrl}/contas-pagar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Erro ao gerar contas a pagar: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao gerar contas a pagar:', error);
      return this.getContasPagarMock();
    }
  }

  // Relatório de contas a receber
  async gerarContasReceber(config: ReportConfig): Promise<TabelaData> {
    try {
      const response = await fetch(`${this.baseUrl}/contas-receber`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Erro ao gerar contas a receber: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao gerar contas a receber:', error);
      return this.getContasReceberMock();
    }
  }

  // Relatório de centro de custos
  async gerarCentroCustos(config: ReportConfig): Promise<GraficoData> {
    try {
      const response = await fetch(`${this.baseUrl}/centro-custos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Erro ao gerar centro de custos: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao gerar centro de custos:', error);
      return this.getCentroCustosMock();
    }
  }

  // Relatório de aging
  async gerarAging(config: ReportConfig): Promise<TabelaData> {
    try {
      const response = await fetch(`${this.baseUrl}/aging`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Erro ao gerar aging: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erro ao gerar aging:', error);
      return this.getAgingMock();
    }
  }

  // Exportar relatório
  async exportarRelatorio(
    tipo: string, 
    config: ReportConfig, 
    formato: 'pdf' | 'excel' | 'csv'
  ): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/export/${tipo}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...config,
          formato,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro ao exportar relatório: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      throw error;
    }
  }

  // Dados mockados para desenvolvimento
  private getDashboardMock(): DashboardData {
    return {
      kpis: [
        {
          id: '1',
          titulo: 'Receita Total',
          valor: 150000,
          valor_anterior: 120000,
          variacao: 30000,
          variacao_percentual: 25,
          tendencia: 'alta',
          cor: 'green',
          icone: 'trending-up',
          unidade: 'R$',
        },
        {
          id: '2',
          titulo: 'Despesas Totais',
          valor: 80000,
          valor_anterior: 75000,
          variacao: 5000,
          variacao_percentual: 6.67,
          tendencia: 'alta',
          cor: 'red',
          icone: 'trending-down',
          unidade: 'R$',
        },
        {
          id: '3',
          titulo: 'Lucro Líquido',
          valor: 70000,
          valor_anterior: 45000,
          variacao: 25000,
          variacao_percentual: 55.56,
          tendencia: 'alta',
          cor: 'blue',
          icone: 'dollar-sign',
          unidade: 'R$',
        },
        {
          id: '4',
          titulo: 'Margem de Lucro',
          valor: 46.67,
          valor_anterior: 37.5,
          variacao: 9.17,
          variacao_percentual: 24.45,
          tendencia: 'alta',
          cor: 'purple',
          icone: 'percent',
          unidade: '%',
        },
      ],
      graficos: [
        {
          id: '1',
          tipo: 'linha',
          titulo: 'Fluxo de Caixa - Últimos 12 Meses',
          dados: [
            { mes: 'Jan', entrada: 120000, saida: 80000, saldo: 40000 },
            { mes: 'Fev', entrada: 130000, saida: 85000, saldo: 45000 },
            { mes: 'Mar', entrada: 140000, saida: 90000, saldo: 50000 },
            { mes: 'Abr', entrada: 135000, saida: 88000, saldo: 47000 },
            { mes: 'Mai', entrada: 145000, saida: 92000, saldo: 53000 },
            { mes: 'Jun', entrada: 150000, saida: 95000, saldo: 55000 },
          ],
          eixos: { x: 'mes', y: 'valor' },
          cores: ['#10b981', '#ef4444', '#3b82f6'],
          legenda: true,
        },
        {
          id: '2',
          tipo: 'pizza',
          titulo: 'Distribuição de Despesas',
          dados: [
            { categoria: 'Pessoal', valor: 40000, percentual: 50 },
            { categoria: 'Operacional', valor: 20000, percentual: 25 },
            { categoria: 'Administrativo', valor: 15000, percentual: 18.75 },
            { categoria: 'Outros', valor: 5000, percentual: 6.25 },
          ],
          eixos: { x: 'categoria', y: 'valor' },
          cores: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
          legenda: true,
        },
      ],
      tabelas: [
        {
          id: '1',
          titulo: 'Top 10 Fornecedores',
          colunas: ['Fornecedor', 'Valor Total', 'Quantidade', 'Última Compra'],
          dados: [
            ['Fornecedor A', 'R$ 25.000,00', 15, '2025-01-10'],
            ['Fornecedor B', 'R$ 20.000,00', 12, '2025-01-08'],
            ['Fornecedor C', 'R$ 18.000,00', 10, '2025-01-05'],
            ['Fornecedor D', 'R$ 15.000,00', 8, '2025-01-03'],
            ['Fornecedor E', 'R$ 12.000,00', 6, '2025-01-01'],
          ],
          totalizadores: { 'Valor Total': 90000 },
        },
      ],
      alertas: [
        {
          id: '1',
          tipo: 'warning',
          titulo: 'Contas Vencidas',
          mensagem: '3 contas a pagar estão vencidas há mais de 30 dias',
          acao: 'Ver contas vencidas',
          prioridade: 'alta',
          data_criacao: new Date().toISOString(),
        },
        {
          id: '2',
          tipo: 'info',
          titulo: 'Conciliação Pendente',
          mensagem: '5 movimentos bancários aguardam conciliação',
          acao: 'Conciliação bancária',
          prioridade: 'media',
          data_criacao: new Date().toISOString(),
        },
      ],
    };
  }

  private getFluxoCaixaMock(): GraficoData {
    return {
      id: 'fluxo-caixa',
      tipo: 'area',
      titulo: 'Fluxo de Caixa Projetado',
      dados: [
        { periodo: 'D+0', saldo: 50000 },
        { periodo: 'D+7', saldo: 45000 },
        { periodo: 'D+14', saldo: 55000 },
        { periodo: 'D+21', saldo: 60000 },
        { periodo: 'D+30', saldo: 65000 },
        { periodo: 'D+60', saldo: 70000 },
        { periodo: 'D+90', saldo: 75000 },
      ],
      eixos: { x: 'periodo', y: 'saldo' },
      cores: ['#3b82f6'],
      legenda: true,
    };
  }

  private getDREMock(): TabelaData {
    return {
      id: 'dre',
      titulo: 'Demonstração do Resultado do Exercício',
      colunas: ['Conta', 'Valor Atual', 'Valor Anterior', 'Variação %'],
      dados: [
        ['Receita Bruta', 'R$ 150.000,00', 'R$ 120.000,00', '25,00%'],
        ['(-) Impostos', 'R$ (15.000,00)', 'R$ (12.000,00)', '25,00%'],
        ['= Receita Líquida', 'R$ 135.000,00', 'R$ 108.000,00', '25,00%'],
        ['(-) Custo dos Produtos', 'R$ (60.000,00)', 'R$ (48.000,00)', '25,00%'],
        ['= Lucro Bruto', 'R$ 75.000,00', 'R$ 60.000,00', '25,00%'],
        ['(-) Despesas Operacionais', 'R$ (30.000,00)', 'R$ (25.000,00)', '20,00%'],
        ['= Lucro Operacional', 'R$ 45.000,00', 'R$ 35.000,00', '28,57%'],
        ['(-) Despesas Financeiras', 'R$ (5.000,00)', 'R$ (4.000,00)', '25,00%'],
        ['= Lucro Líquido', 'R$ 40.000,00', 'R$ 31.000,00', '29,03%'],
      ],
      totalizadores: { 'Lucro Líquido': 40000 },
    };
  }

  private getBalancoMock(): TabelaData {
    return {
      id: 'balanco',
      titulo: 'Balanço Patrimonial',
      colunas: ['Conta', 'Valor Atual', 'Valor Anterior', 'Variação %'],
      dados: [
        ['ATIVO', '', '', ''],
        ['Circulante', 'R$ 100.000,00', 'R$ 80.000,00', '25,00%'],
        ['Não Circulante', 'R$ 200.000,00', 'R$ 180.000,00', '11,11%'],
        ['TOTAL ATIVO', 'R$ 300.000,00', 'R$ 260.000,00', '15,38%'],
        ['', '', '', ''],
        ['PASSIVO', '', '', ''],
        ['Circulante', 'R$ 50.000,00', 'R$ 45.000,00', '11,11%'],
        ['Não Circulante', 'R$ 100.000,00', 'R$ 95.000,00', '5,26%'],
        ['TOTAL PASSIVO', 'R$ 150.000,00', 'R$ 140.000,00', '7,14%'],
        ['', '', '', ''],
        ['PATRIMÔNIO LÍQUIDO', 'R$ 150.000,00', 'R$ 120.000,00', '25,00%'],
      ],
      totalizadores: { 'TOTAL ATIVO': 300000, 'TOTAL PASSIVO': 150000, 'PATRIMÔNIO LÍQUIDO': 150000 },
    };
  }

  private getConciliacaoMock(): TabelaData {
    return {
      id: 'conciliacao',
      titulo: 'Conciliação Bancária',
      colunas: ['Data', 'Descrição', 'Valor', 'Status', 'Observações'],
      dados: [
        ['2025-01-15', 'Transferência Recebida', 'R$ 5.000,00', 'Conciliado', ''],
        ['2025-01-14', 'Pagamento Fornecedor', 'R$ -2.500,00', 'Conciliado', ''],
        ['2025-01-13', 'Depósito em Dinheiro', 'R$ 1.000,00', 'Conciliado', ''],
        ['2025-01-12', 'Taxa Bancária', 'R$ -15,00', 'Conciliado', ''],
        ['2025-01-11', 'Transferência Enviada', 'R$ -3.000,00', 'Pendente', 'Aguardando confirmação'],
      ],
      totalizadores: { 'Total Conciliado': 5000, 'Total Pendente': -3000 },
    };
  }

  private getContasPagarMock(): TabelaData {
    return {
      id: 'contas-pagar',
      titulo: 'Relatório de Contas a Pagar',
      colunas: ['Fornecedor', 'Vencimento', 'Valor', 'Status', 'Dias Vencido'],
      dados: [
        ['Fornecedor A', '2025-01-20', 'R$ 5.000,00', 'Pendente', '0'],
        ['Fornecedor B', '2025-01-18', 'R$ 3.000,00', 'Pendente', '2'],
        ['Fornecedor C', '2025-01-15', 'R$ 2.500,00', 'Vencida', '5'],
        ['Fornecedor D', '2025-01-10', 'R$ 1.500,00', 'Vencida', '10'],
        ['Fornecedor E', '2025-01-05', 'R$ 800,00', 'Vencida', '15'],
      ],
      totalizadores: { 'Total Pendente': 8000, 'Total Vencido': 4800 },
    };
  }

  private getContasReceberMock(): TabelaData {
    return {
      id: 'contas-receber',
      titulo: 'Relatório de Contas a Receber',
      colunas: ['Cliente', 'Vencimento', 'Valor', 'Status', 'Dias Vencido'],
      dados: [
        ['Cliente A', '2025-01-25', 'R$ 8.000,00', 'Pendente', '0'],
        ['Cliente B', '2025-01-22', 'R$ 5.500,00', 'Pendente', '0'],
        ['Cliente C', '2025-01-20', 'R$ 3.200,00', 'Pendente', '0'],
        ['Cliente D', '2025-01-15', 'R$ 2.800,00', 'Vencida', '5'],
        ['Cliente E', '2025-01-10', 'R$ 1.500,00', 'Vencida', '10'],
      ],
      totalizadores: { 'Total Pendente': 16700, 'Total Vencido': 4300 },
    };
  }

  private getCentroCustosMock(): GraficoData {
    return {
      id: 'centro-custos',
      tipo: 'barra',
      titulo: 'Despesas por Centro de Custo',
      dados: [
        { centro: 'Administrativo', valor: 25000, percentual: 31.25 },
        { centro: 'Comercial', valor: 20000, percentual: 25.00 },
        { centro: 'Produção', valor: 30000, percentual: 37.50 },
        { centro: 'Financeiro', valor: 5000, percentual: 6.25 },
      ],
      eixos: { x: 'centro', y: 'valor' },
      cores: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
      legenda: true,
    };
  }

  private getAgingMock(): TabelaData {
    return {
      id: 'aging',
      titulo: 'Relatório de Aging',
      colunas: ['Cliente', '0-30 dias', '31-60 dias', '61-90 dias', '90+ dias', 'Total'],
      dados: [
        ['Cliente A', 'R$ 5.000,00', 'R$ 2.000,00', 'R$ 1.000,00', 'R$ 500,00', 'R$ 8.500,00'],
        ['Cliente B', 'R$ 3.500,00', 'R$ 1.500,00', 'R$ 800,00', 'R$ 200,00', 'R$ 6.000,00'],
        ['Cliente C', 'R$ 2.800,00', 'R$ 1.200,00', 'R$ 600,00', 'R$ 100,00', 'R$ 4.700,00'],
        ['Cliente D', 'R$ 1.500,00', 'R$ 800,00', 'R$ 400,00', 'R$ 50,00', 'R$ 2.750,00'],
        ['Cliente E', 'R$ 1.000,00', 'R$ 500,00', 'R$ 200,00', 'R$ 0,00', 'R$ 1.700,00'],
      ],
      totalizadores: { 'Total': 23500 },
    };
  }
}

export const reportsService = new ReportsService();
export default reportsService;
