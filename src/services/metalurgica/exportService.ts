// =====================================================
// SERVIÇO DE EXPORTAÇÃO DE RELATÓRIOS METALÚRGICA
// =====================================================

import type { OrdemProducao, OrdemServico, Lote, Inspecao } from '@/types/metalurgica';

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf';
  includeCharts?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export const metalurgicaExportService = {
  /**
   * Exporta dados para CSV
   */
  exportToCSV<T extends Record<string, any>>(
    data: T[],
    filename: string,
    headers?: string[]
  ): void {
    if (data.length === 0) {
      alert('Nenhum dado para exportar');
      return;
    }

    const csvHeaders = headers || Object.keys(data[0]);
    const csvRows = [
      csvHeaders.join(','),
      ...data.map(row =>
        csvHeaders.map(header => {
          const value = row[header];
          // Escapar vírgulas e aspas
          if (value === null || value === undefined) return '';
          const stringValue = String(value).replace(/"/g, '""');
          return `"${stringValue}"`;
        }).join(',')
      ),
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Exporta Ordens de Produção
   */
  exportOrdensProducao(ops: OrdemProducao[], options: ExportOptions): void {
    const data = ops.map(op => ({
      'Número OP': op.numero_op,
      'Produto ID': op.produto_id,
      'Quantidade Solicitada': op.quantidade_solicitada,
      'Quantidade Produzida': op.quantidade_produzida,
      'Status': op.status,
      'Prioridade': op.prioridade,
      'Data Início Prevista': op.data_prevista_inicio || '',
      'Data Fim Prevista': op.data_prevista_termino || '',
      'Data Início Real': op.data_inicio_producao || '',
      'Data Fim Real': op.data_termino_producao || '',
    }));

    this.exportToCSV(data, `ordens_producao_${new Date().toISOString().split('T')[0]}`);
  },

  /**
   * Exporta Lotes
   */
  exportLotes(lotes: Lote[], options: ExportOptions): void {
    const data = lotes.map(lote => ({
      'Número Lote': lote.numero_lote,
      'Produto ID': lote.produto_id,
      'Quantidade Produzida': lote.quantidade_produzida,
      'Peso Total (kg)': lote.peso_total_kg || '',
      'Status': lote.status,
      'Data Produção': lote.data_producao,
      'OP ID': lote.op_id || '',
      'OS ID': lote.os_id || '',
    }));

    this.exportToCSV(data, `lotes_${new Date().toISOString().split('T')[0]}`);
  },

  /**
   * Exporta Inspeções
   */
  exportInspecoes(inspecoes: Inspecao[], options: ExportOptions): void {
    const data = inspecoes.map(inspecao => ({
      'Lote ID': inspecao.lote_id,
      'Tipo': inspecao.tipo,
      'Status': inspecao.status,
      'Quantidade Inspecionada': inspecao.quantidade_inspecionada || '',
      'Quantidade Aprovada': inspecao.quantidade_aprovada,
      'Quantidade Reprovada': inspecao.quantidade_reprovada,
      'Data Inspeção': inspecao.data_inspecao || '',
    }));

    this.exportToCSV(data, `inspecoes_${new Date().toISOString().split('T')[0]}`);
  },

  /**
   * Gera relatório consolidado
   */
  async generateConsolidatedReport(
    ops: OrdemProducao[],
    os: OrdemServico[],
    lotes: Lote[],
    inspecoes: Inspecao[],
    options: ExportOptions
  ): Promise<void> {
    // Para CSV simples, exportar cada tipo separadamente
    // Em uma implementação completa, poderia gerar um arquivo Excel com múltiplas abas
    this.exportOrdensProducao(ops, options);
    
    // Pequeno delay para permitir download do primeiro arquivo
    setTimeout(() => {
      this.exportLotes(lotes, options);
    }, 500);

    setTimeout(() => {
      this.exportInspecoes(inspecoes, options);
    }, 1000);
  },
};

